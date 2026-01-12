"""
Admin Advertisers Endpoints
Manages brands and campaigns from astegni_user_db for admin dashboard

Database Sources:
- astegni_user_db: advertiser_profiles, brand_profile, campaign_profile
- astegni_admin_db: brand_packages (pricing packages)

Table Relationships:
- advertiser_profiles: id, user_id, username, company_name, bio, logo, brand_ids[] (array of brand IDs)
- brand_profile: id, name, bio, quote, thumbnail, social_links, hero_title, hero_subtitle, badge,
                 status, status_by, status_reason, status_at, is_verified, is_active,
                 created_at, updated_at, phone, email, location, campaign_ids[] (array of campaign IDs),
                 package_id (references brand_packages.id in admin db)
- campaign_profile: id, name, description, thumbnail_url, file_url, objective, is_verified,
                    verification_status, status_by, status_reason, status_at, campaign_package_id
                    (references brand_packages.id in admin db),
                    start_date, target_audience, target_location, impressions, clicks, etc.
- brand_packages (in admin db): id, name, price, etc.

Relationships (IMPORTANT: parent holds child IDs in arrays):
- advertiser_profiles.brand_ids[] contains brand IDs -> join: bp.id = ANY(ap.brand_ids)
- brand_profile.campaign_ids[] contains campaign IDs -> join: cp.id = ANY(bp.campaign_ids)
- brand_profile.package_id -> brand_packages.id (cross-database lookup)
- campaign_profile.campaign_package_id -> brand_packages.id (cross-database lookup)
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(prefix="/api/admin-advertisers", tags=["Admin Advertisers"])

# User Database URL - uses DATABASE_URL from .env which points to astegni_user_db
USER_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

# Admin Database URL - brand_packages table is in astegni_admin_db
ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def get_user_db():
    """Get user database connection"""
    return psycopg.connect(USER_DATABASE_URL, row_factory=dict_row)

def get_admin_db():
    """Get admin database connection"""
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)


# ============================================================
# BRAND ENDPOINTS
# ============================================================

@router.get("/brands")
async def get_brands(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100)
):
    """Get all brands with optional filtering.
    Joins with advertiser_profiles via brand_ids array: bp.id = ANY(ap.brand_ids)
    Fetches brand_packages from astegni_admin_db"""
    try:
        # First, fetch all brand_packages from admin database
        packages_map = {}
        try:
            with get_admin_db() as admin_conn:
                with admin_conn.cursor() as admin_cur:
                    admin_cur.execute("SELECT id, name, price FROM brand_packages")
                    for pkg in admin_cur.fetchall():
                        packages_map[pkg['id']] = {'name': pkg['name'], 'price': pkg['price']}
        except Exception as pkg_error:
            print(f"[Warning] Could not fetch brand_packages from admin db: {pkg_error}")
            # Continue without packages - they'll show as "No Package"

        with get_user_db() as conn:
            with conn.cursor() as cur:
                # Build query - join with advertiser_profiles only (packages come from admin db)
                # advertiser_profiles.brand_ids[] contains brand IDs
                query = """
                    SELECT bp.*, ap.company_name as advertiser_name, ap.logo as advertiser_logo
                    FROM brand_profile bp
                    LEFT JOIN advertiser_profiles ap ON bp.id = ANY(ap.brand_ids)
                    WHERE 1=1
                """
                params = []

                if status:
                    if status == 'verified':
                        query += " AND bp.status = 'verified'"
                    elif status == 'pending' or status == 'requested':
                        query += " AND (bp.status = 'pending' OR bp.status IS NULL)"
                    elif status == 'rejected':
                        query += " AND bp.status = 'rejected'"
                    elif status == 'suspended':
                        query += " AND bp.status = 'suspended'"

                if search:
                    query += " AND (bp.name ILIKE %s OR ap.company_name ILIKE %s)"
                    params.extend([f"%{search}%", f"%{search}%"])

                # Count total
                count_query = query.replace("SELECT bp.*, ap.company_name as advertiser_name, ap.logo as advertiser_logo", "SELECT COUNT(*)")
                cur.execute(count_query, params)
                total = cur.fetchone()['count']

                # Add pagination
                offset = (page - 1) * limit
                query += " ORDER BY bp.created_at DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])

                cur.execute(query, params)
                brands = cur.fetchall()

                # Transform to match frontend expectations
                result = []
                for b in brands:
                    # Look up package from admin db packages_map
                    package_id = b.get('package_id')
                    package_info = packages_map.get(package_id, {}) if package_id else {}

                    result.append({
                        'id': b['id'],
                        'brand_name': b['name'],
                        'brand_logo': b['thumbnail'],
                        'description': b['bio'],
                        'industry': None,  # Not in current schema
                        'location': b['location'],
                        'email': b['email'],
                        'verification_status': b['status'] or 'pending',
                        'is_verified': b['is_verified'],
                        'is_active': b['is_active'],
                        'created_at': str(b['created_at']) if b['created_at'] else None,
                        'status_at': str(b['status_at']) if b.get('status_at') else None,
                        'advertiser_name': b['advertiser_name'],
                        'advertiser_logo': b['advertiser_logo'],
                        'package_id': package_id,
                        'package_name': package_info.get('name'),
                        'package_price': float(package_info['price']) if package_info.get('price') else None
                    })

                return {
                    "brands": result,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "pages": (total + limit - 1) // limit if total > 0 else 0
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/counts")
async def get_brand_counts():
    """Get brand counts by status"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE status = 'verified') as verified,
                        COUNT(*) FILTER (WHERE status = 'pending' OR status IS NULL) as pending,
                        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
                        COUNT(*) FILTER (WHERE status = 'suspended') as suspended
                    FROM brand_profile
                """)
                counts = cur.fetchone()
                return dict(counts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/{brand_id}")
async def get_brand(brand_id: int):
    """Get specific brand by ID.
    Joins with advertiser_profiles via brand_ids array: bp.id = ANY(ap.brand_ids)"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT bp.*, ap.company_name as advertiser_name, ap.logo as advertiser_logo, ap.id as advertiser_id
                    FROM brand_profile bp
                    LEFT JOIN advertiser_profiles ap ON bp.id = ANY(ap.brand_ids)
                    WHERE bp.id = %s
                """, (brand_id,))
                brand = cur.fetchone()
                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")

                return {
                    'id': brand['id'],
                    'brand_name': brand['name'],
                    'brand_logo': brand['thumbnail'],
                    'description': brand['bio'],
                    'quote': brand['quote'],
                    'location': brand['location'],
                    'email': brand['email'],
                    'phone': brand['phone'],
                    'social_links': brand['social_links'],
                    'hero_title': brand['hero_title'],
                    'hero_subtitle': brand['hero_subtitle'],
                    'badge': brand['badge'],
                    'verification_status': brand['status'] or 'pending',
                    'is_verified': brand['is_verified'],
                    'is_active': brand['is_active'],
                    'status_reason': brand['status_reason'],
                    'status_at': str(brand['status_at']) if brand['status_at'] else None,
                    'created_at': str(brand['created_at']) if brand['created_at'] else None,
                    'advertiser_id': brand['advertiser_id'],
                    'advertiser_name': brand['advertiser_name'],
                    'advertiser_logo': brand['advertiser_logo']
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/verify")
async def verify_brand(brand_id: int, admin_id: Optional[int] = None):
    """Verify a brand"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE brand_profile
                    SET status = 'verified',
                        is_verified = TRUE,
                        status_by = %s,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (admin_id, brand_id))
                brand = cur.fetchone()
                conn.commit()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")
                return {"message": "Brand verified successfully", "brand": dict(brand)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/reject")
async def reject_brand(brand_id: int, data: dict):
    """Reject a brand"""
    try:
        reason = data.get('reason', 'No reason provided')
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE brand_profile
                    SET status = 'rejected',
                        is_verified = FALSE,
                        status_reason = %s,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reason, brand_id))
                brand = cur.fetchone()
                conn.commit()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")
                return {"message": "Brand rejected", "brand": dict(brand)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/suspend")
async def suspend_brand(brand_id: int, data: dict):
    """Suspend a brand"""
    try:
        reason = data.get('reason', 'No reason provided')
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE brand_profile
                    SET status = 'suspended',
                        is_active = FALSE,
                        status_reason = %s,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reason, brand_id))
                brand = cur.fetchone()
                conn.commit()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")
                return {"message": "Brand suspended", "brand": dict(brand)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/restore")
async def restore_brand(brand_id: int):
    """Restore a suspended/rejected brand to pending"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE brand_profile
                    SET status = 'pending',
                        is_active = TRUE,
                        status_reason = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (brand_id,))
                brand = cur.fetchone()
                conn.commit()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")
                return {"message": "Brand restored to pending", "brand": dict(brand)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/reinstate")
async def reinstate_brand(brand_id: int):
    """Reinstate a suspended brand to verified status"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE brand_profile
                    SET status = 'verified',
                        is_verified = TRUE,
                        is_active = TRUE,
                        status_reason = NULL,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (brand_id,))
                brand = cur.fetchone()
                conn.commit()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")
                return {"message": "Brand reinstated to verified", "brand": dict(brand)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# CAMPAIGN ENDPOINTS
# ============================================================

@router.get("/campaigns")
async def get_campaigns(
    status: Optional[str] = None,
    brand_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100)
):
    """Get all campaigns with optional filtering.
    Joins with brand_profile via campaign_ids array: cp.id = ANY(bp.campaign_ids)
    Fetches brand_packages from astegni_admin_db"""
    try:
        # First, fetch all brand_packages from admin database
        packages_map = {}
        try:
            with get_admin_db() as admin_conn:
                with admin_conn.cursor() as admin_cur:
                    admin_cur.execute("SELECT id, name, price FROM brand_packages")
                    for pkg in admin_cur.fetchall():
                        packages_map[pkg['id']] = {'name': pkg['name'], 'price': pkg['price']}
        except Exception as pkg_error:
            print(f"[Warning] Could not fetch brand_packages from admin db: {pkg_error}")
            # Continue without packages - they'll show as "No Package"

        with get_user_db() as conn:
            with conn.cursor() as cur:
                # Build query - join with brand_profile only (packages come from admin db)
                # brand_profile.campaign_ids[] contains campaign IDs
                base_query = """
                    FROM campaign_profile cp
                    LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
                    WHERE 1=1
                """
                params = []
                where_clauses = []

                if status:
                    if status == 'verified':
                        where_clauses.append("cp.verification_status = 'verified'")
                    elif status == 'pending' or status == 'requested':
                        where_clauses.append("(cp.verification_status = 'pending' OR cp.verification_status IS NULL)")
                    elif status == 'rejected':
                        where_clauses.append("cp.verification_status = 'rejected'")
                    elif status == 'suspended':
                        where_clauses.append("cp.verification_status = 'suspended'")

                if brand_id:
                    where_clauses.append("bp.id = %s")
                    params.append(brand_id)

                if search:
                    where_clauses.append("(cp.name ILIKE %s OR bp.name ILIKE %s)")
                    params.extend([f"%{search}%", f"%{search}%"])

                # Build WHERE clause
                where_sql = ""
                if where_clauses:
                    where_sql = " AND " + " AND ".join(where_clauses)

                # Count total
                count_query = f"SELECT COUNT(*) {base_query}{where_sql}"
                cur.execute(count_query, params)
                total = cur.fetchone()['count']

                # Add pagination
                offset = (page - 1) * limit
                select_query = f"""
                    SELECT cp.*, bp.name as brand_name, bp.thumbnail as brand_logo, bp.id as brand_id
                    {base_query}{where_sql}
                    ORDER BY cp.created_at DESC LIMIT %s OFFSET %s
                """
                params.extend([limit, offset])

                cur.execute(select_query, params)
                campaigns = cur.fetchall()

                # Transform to match frontend expectations
                result = []
                for c in campaigns:
                    # Look up package from admin db packages_map
                    package_id = c.get('campaign_package_id')
                    package_info = packages_map.get(package_id, {}) if package_id else {}

                    result.append({
                        'id': c['id'],
                        'campaign_name': c['name'],
                        'campaign_image': c['thumbnail_url'],
                        'description': c['description'],
                        'objective': c['objective'],
                        'verification_status': c['verification_status'] or 'pending',
                        'is_verified': c['is_verified'],
                        'impressions': c['impressions'] or 0,
                        'clicks': c.get('click_through_rate', 0) or c.get('clicks', 0) or 0,
                        'conversions': c['conversions'] or 0,
                        'likes': c['likes'] or 0,
                        'shares': c['shares'] or 0,
                        'comments': c['comments'] or 0,
                        'campaign_budget': float(c['campaign_budget']) if c['campaign_budget'] else 0,
                        'budget': float(c.get('budget', 0) or c.get('campaign_budget', 0) or 0),
                        'start_date': str(c['start_date']) if c['start_date'] else None,
                        'end_date': str(c.get('end_date')) if c.get('end_date') else None,
                        'created_at': str(c['created_at']) if c['created_at'] else None,
                        'status_at': str(c['status_at']) if c.get('status_at') else None,
                        'target_audience': c.get('target_audience'),
                        'ad_type': c.get('ad_type'),
                        'brand_name': c.get('brand_name'),
                        'brand_logo': c.get('brand_logo'),
                        'brand_id': c.get('brand_id'),
                        'package_id': package_id,
                        'package_name': package_info.get('name'),
                        'package_price': float(package_info['price']) if package_info.get('price') else None
                    })

                return {
                    "campaigns": result,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "pages": (total + limit - 1) // limit if total > 0 else 0
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/counts")
async def get_campaign_counts():
    """Get campaign counts by status"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
                        COUNT(*) FILTER (WHERE verification_status = 'pending' OR verification_status IS NULL) as pending,
                        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
                        COUNT(*) FILTER (WHERE verification_status = 'suspended') as suspended
                    FROM campaign_profile
                """)
                counts = cur.fetchone()
                return dict(counts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: int):
    """Get specific campaign by ID"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM campaign_profile WHERE id = %s", (campaign_id,))
                campaign = cur.fetchone()
                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")
                return dict(campaign)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/verify")
async def verify_campaign(campaign_id: int, admin_id: Optional[int] = None):
    """Verify a campaign"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'verified',
                        is_verified = TRUE,
                        status_by = %s,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (admin_id, campaign_id))
                campaign = cur.fetchone()
                conn.commit()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")
                return {"message": "Campaign verified successfully", "campaign": dict(campaign)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/reject")
async def reject_campaign(campaign_id: int, data: dict):
    """Reject a campaign"""
    try:
        reason = data.get('reason', 'No reason provided')
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'rejected',
                        is_verified = FALSE,
                        status_reason = %s,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reason, campaign_id))
                campaign = cur.fetchone()
                conn.commit()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")
                return {"message": "Campaign rejected", "campaign": dict(campaign)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/suspend")
async def suspend_campaign(campaign_id: int, data: dict):
    """Suspend a campaign"""
    try:
        reason = data.get('reason', 'No reason provided')
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'suspended',
                        status_reason = %s,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reason, campaign_id))
                campaign = cur.fetchone()
                conn.commit()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")
                return {"message": "Campaign suspended", "campaign": dict(campaign)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/restore")
async def restore_campaign(campaign_id: int):
    """Restore a suspended/rejected campaign to pending"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'pending',
                        status_reason = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (campaign_id,))
                campaign = cur.fetchone()
                conn.commit()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")
                return {"message": "Campaign restored to pending", "campaign": dict(campaign)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/reinstate")
async def reinstate_campaign(campaign_id: int):
    """Reinstate a suspended campaign to verified status"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'verified',
                        is_verified = TRUE,
                        status_reason = NULL,
                        status_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (campaign_id,))
                campaign = cur.fetchone()
                conn.commit()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")
                return {"message": "Campaign reinstated to verified", "campaign": dict(campaign)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# RECENT ACTIVITY ENDPOINTS
# ============================================================

@router.get("/recent/brands")
async def get_recent_brands(limit: int = Query(default=5, le=20)):
    """Get most recent brand submissions.
    Joins with advertiser_profiles via brand_ids array: bp.id = ANY(ap.brand_ids)"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT bp.id, bp.name, bp.thumbnail, bp.status, bp.created_at,
                           ap.company_name as advertiser_name
                    FROM brand_profile bp
                    LEFT JOIN advertiser_profiles ap ON bp.id = ANY(ap.brand_ids)
                    ORDER BY bp.created_at DESC
                    LIMIT %s
                """, (limit,))
                brands = cur.fetchall()

                result = []
                for b in brands:
                    result.append({
                        'id': b['id'],
                        'brand_name': b['name'],
                        'brand_logo': b['thumbnail'],
                        'verification_status': b['status'] or 'pending',
                        'created_at': str(b['created_at']) if b['created_at'] else None,
                        'advertiser_name': b['advertiser_name']
                    })
                return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent/campaigns")
async def get_recent_campaigns(limit: int = Query(default=5, le=20)):
    """Get most recent campaign submissions with brand names.
    Joins with brand_profile via campaign_ids array: cp.id = ANY(bp.campaign_ids)"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT cp.id, cp.name, cp.thumbnail_url, cp.verification_status, cp.created_at,
                           bp.name as brand_name, bp.thumbnail as brand_logo
                    FROM campaign_profile cp
                    LEFT JOIN brand_profile bp ON cp.id = ANY(bp.campaign_ids)
                    ORDER BY cp.created_at DESC
                    LIMIT %s
                """, (limit,))
                campaigns = cur.fetchall()

                result = []
                for c in campaigns:
                    result.append({
                        'id': c['id'],
                        'campaign_name': c['name'],
                        'campaign_image': c['thumbnail_url'],
                        'verification_status': c['verification_status'] or 'pending',
                        'created_at': str(c['created_at']) if c['created_at'] else None,
                        'brand_name': c.get('brand_name'),
                        'brand_logo': c.get('brand_logo')
                    })
                return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# STATS ENDPOINT
# ============================================================

@router.get("/stats")
async def get_advertiser_stats():
    """Get combined stats for brands and campaigns"""
    try:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                # Get brand counts
                cur.execute("""
                    SELECT
                        COUNT(*) as total_brands,
                        COUNT(*) FILTER (WHERE status = 'verified') as verified_brands,
                        COUNT(*) FILTER (WHERE status = 'pending' OR status IS NULL) as pending_brands,
                        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_brands,
                        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_brands
                    FROM brand_profile
                """)
                brand_stats = cur.fetchone()

                # Get campaign counts
                cur.execute("""
                    SELECT
                        COUNT(*) as total_campaigns,
                        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified_campaigns,
                        COUNT(*) FILTER (WHERE verification_status = 'pending' OR verification_status IS NULL) as pending_campaigns,
                        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected_campaigns,
                        COUNT(*) FILTER (WHERE verification_status = 'suspended') as suspended_campaigns,
                        COALESCE(SUM(impressions), 0) as total_impressions,
                        COALESCE(SUM(likes), 0) as total_likes
                    FROM campaign_profile
                """)
                campaign_stats = cur.fetchone()

                return {
                    "brands": dict(brand_stats) if brand_stats else {},
                    "campaigns": dict(campaign_stats) if campaign_stats else {}
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ADMIN PROFILE ENDPOINTS (manage_advertisers_profile)
# ============================================================

@router.get("/profile/{admin_id}")
async def get_advertisers_profile(admin_id: int):
    """
    Get admin profile with advertisers profile data from astegni_admin_db

    - admin_profile: name, email, phone, departments
    - manage_advertisers_profile: username, bio, quote, location, images, badges, position, employee_id
    - admin_reviews: rating and total_reviews calculated live
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cursor:
                # Get admin_profile data
                cursor.execute("""
                    SELECT id, email, first_name, father_name, grandfather_name,
                           phone_number, departments, created_at
                    FROM admin_profile
                    WHERE id = %s
                """, (admin_id,))

                admin_row = cursor.fetchone()
                if not admin_row:
                    raise HTTPException(status_code=404, detail="Admin profile not found")

                # Get manage_advertisers_profile data
                cursor.execute("""
                    SELECT id, username, bio, quote, location, cover_image, profile_image,
                           languages, hero_title, hero_subtitle, badges, created_at, updated_at,
                           allow_location, display_location, position, employee_id
                    FROM manage_advertisers_profile
                    WHERE admin_id = %s
                """, (admin_id,))

                advertisers_profile_row = cursor.fetchone()

                # Get live rating stats from admin_reviews table
                cursor.execute("""
                    SELECT COUNT(*) as total_reviews,
                           COALESCE(AVG(rating), 0) as average_rating
                    FROM admin_reviews
                    WHERE admin_id = %s
                """, (admin_id,))
                reviews_stats = cursor.fetchone()

                # Build response
                response = {
                    # From admin_profile
                    "id": admin_row['id'],
                    "email": admin_row['email'] if admin_row['email'] else [],
                    "first_name": admin_row['first_name'],
                    "father_name": admin_row['father_name'],
                    "grandfather_name": admin_row['grandfather_name'],
                    "phone_number": admin_row['phone_number'] if admin_row['phone_number'] else [],
                    "departments": admin_row['departments'] if admin_row['departments'] else [],
                    "joined_date": str(admin_row['created_at']) if admin_row['created_at'] else None,
                    # Live rating stats
                    "rating": round(float(reviews_stats['average_rating']), 1) if reviews_stats else 0,
                    "total_reviews": reviews_stats['total_reviews'] if reviews_stats else 0,
                }

                # Add manage_advertisers_profile data if exists
                if advertisers_profile_row:
                    response.update({
                        "profile_id": advertisers_profile_row['id'],
                        "username": advertisers_profile_row['username'],
                        "bio": advertisers_profile_row['bio'],
                        "quote": advertisers_profile_row['quote'],
                        "location": advertisers_profile_row['location'] if advertisers_profile_row['location'] else [],
                        "cover_image": advertisers_profile_row['cover_image'],
                        "profile_image": advertisers_profile_row['profile_image'],
                        "languages": advertisers_profile_row['languages'] if advertisers_profile_row['languages'] else [],
                        "hero_title": advertisers_profile_row['hero_title'] if advertisers_profile_row['hero_title'] else [],
                        "hero_subtitle": advertisers_profile_row['hero_subtitle'],
                        "badges": advertisers_profile_row['badges'] if advertisers_profile_row['badges'] else [],
                        "allow_location": advertisers_profile_row['allow_location'],
                        "display_location": advertisers_profile_row['display_location'],
                        "position": advertisers_profile_row['position'],
                        "employee_id": advertisers_profile_row['employee_id'],
                    })
                else:
                    # Default values if no profile row exists
                    response.update({
                        "profile_id": None,
                        "username": None,
                        "bio": None,
                        "quote": None,
                        "location": [],
                        "cover_image": None,
                        "profile_image": None,
                        "languages": [],
                        "hero_title": [],
                        "hero_subtitle": None,
                        "badges": [],
                        "allow_location": False,
                        "display_location": True,
                        "position": None,
                        "employee_id": None,
                    })

                return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/profile/by-email/{email}")
async def get_advertisers_profile_by_email(email: str):
    """Get admin profile by email address"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cursor:
                # Find admin by email (email is stored as array)
                cursor.execute("""
                    SELECT id FROM admin_profile
                    WHERE %s = ANY(email)
                """, (email,))

                admin_row = cursor.fetchone()
                if not admin_row:
                    raise HTTPException(status_code=404, detail="Admin not found")

                # Reuse the main profile endpoint
                return await get_advertisers_profile(admin_row['id'])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile/{admin_id}")
async def update_advertisers_profile(admin_id: int, data: dict):
    """
    Update admin profile (both admin_profile and manage_advertisers_profile)
    """
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cursor:
                # Check if admin exists
                cursor.execute("SELECT id FROM admin_profile WHERE id = %s", (admin_id,))
                if not cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Admin not found")

                # Update admin_profile fields if provided
                admin_fields = ['first_name', 'father_name', 'grandfather_name', 'phone_number']
                admin_updates = []
                admin_values = []

                for field in admin_fields:
                    if field in data and data[field] is not None:
                        admin_updates.append(f"{field} = %s")
                        admin_values.append(data[field])

                if admin_updates:
                    admin_updates.append("updated_at = NOW()")
                    admin_values.append(admin_id)
                    cursor.execute(f"""
                        UPDATE admin_profile
                        SET {', '.join(admin_updates)}
                        WHERE id = %s
                    """, admin_values)

                # Check if manage_advertisers_profile exists
                cursor.execute("""
                    SELECT id FROM manage_advertisers_profile WHERE admin_id = %s
                """, (admin_id,))
                profile_exists = cursor.fetchone()

                # Profile fields to update
                profile_fields = {
                    'username': 'username',
                    'bio': 'bio',
                    'quote': 'quote',
                    'location': 'location',
                    'hero_title': 'hero_title',
                    'hero_subtitle': 'hero_subtitle',
                    'languages': 'languages',
                    'cover_image': 'cover_image',
                    'profile_image': 'profile_image',
                    'allow_location': 'allow_location',
                    'display_location': 'display_location',
                    'position': 'position',
                    'employee_id': 'employee_id',
                }

                if profile_exists:
                    # Update existing profile
                    profile_updates = []
                    profile_values = []

                    for key, column in profile_fields.items():
                        if key in data:
                            profile_updates.append(f"{column} = %s")
                            profile_values.append(data[key])

                    if profile_updates:
                        profile_updates.append("updated_at = NOW()")
                        profile_values.append(admin_id)
                        cursor.execute(f"""
                            UPDATE manage_advertisers_profile
                            SET {', '.join(profile_updates)}
                            WHERE admin_id = %s
                        """, profile_values)
                else:
                    # Create new profile
                    cursor.execute("""
                        INSERT INTO manage_advertisers_profile (
                            admin_id, username, bio, quote, location, hero_title, hero_subtitle,
                            languages, allow_location, display_location, position, employee_id, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    """, (
                        admin_id,
                        data.get('username'),
                        data.get('bio'),
                        data.get('quote'),
                        data.get('location', []),
                        data.get('hero_title', []),
                        data.get('hero_subtitle'),
                        data.get('languages', []),
                        data.get('allow_location', False),
                        data.get('display_location', True),
                        data.get('position'),
                        data.get('employee_id'),
                    ))

                conn.commit()

                return {"success": True, "message": "Profile updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reviews/by-email/{email}")
async def get_advertisers_reviews_by_email(email: str):
    """Get admin reviews by email address"""
    try:
        with get_admin_db() as conn:
            with conn.cursor() as cursor:
                # Find admin by email
                cursor.execute("""
                    SELECT id FROM admin_profile
                    WHERE %s = ANY(email)
                """, (email,))

                admin_row = cursor.fetchone()
                if not admin_row:
                    raise HTTPException(status_code=404, detail="Admin not found")

                admin_id = admin_row['id']

                # Get reviews
                cursor.execute("""
                    SELECT id, admin_id, reviewer_name, reviewer_email, rating,
                           comment, created_at
                    FROM admin_reviews
                    WHERE admin_id = %s
                    ORDER BY created_at DESC
                """, (admin_id,))

                reviews = cursor.fetchall()

                # Get stats
                cursor.execute("""
                    SELECT COUNT(*) as total_reviews,
                           COALESCE(AVG(rating), 0) as average_rating
                    FROM admin_reviews
                    WHERE admin_id = %s
                """, (admin_id,))
                stats = cursor.fetchone()

                return {
                    "reviews": [dict(r) for r in reviews],
                    "total_reviews": stats['total_reviews'] if stats else 0,
                    "average_rating": round(float(stats['average_rating']), 1) if stats else 0
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
