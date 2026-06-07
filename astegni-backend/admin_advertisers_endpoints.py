"""
Admin Advertisers Endpoints
Manages brands and campaigns for admin dashboard

Database Sources:
- astegni_advertiser_db: advertiser_profiles, company_profile, brand_profile, campaign_profile,
                         campaign_impressions, campaign_engagement, campaign_media
- astegni_user_db: users (resolved separately; Postgres cannot join across databases)
- astegni_admin_db: brand_packages (pricing packages)

Table Relationships:
- advertiser_profiles: id, user_id, username, company_name, bio, logo, brand_ids[] (array of brand IDs)
- brand_profile: id, name, bio, quote, thumbnail, social_links, hero_title, hero_subtitle, badge,
                 status, status_by, status_reason, status_at, is_verified, is_active,
                 created_at, updated_at, phone, email, location, campaign_ids[] (array of campaign IDs),
                 package_id (references brand_packages.id in admin db)
- campaign_profile: id, name, description, brand_id (FK to brand_profile.id), objective, is_verified,
                    verification_status, status_by, status_reason, status_at, campaign_package_id
                    (references brand_packages.id in admin db),
                    start_date, target_audience, target_location, impressions, clicks, etc.
- brand_packages (in admin db): id, name, price, etc.

Relationships:
- advertiser_profiles.brand_ids[] contains brand IDs -> join: bp.id = ANY(ap.brand_ids)
- campaign_profile.brand_id -> brand_profile.id (proper FK) -> join: cp.brand_id = bp.id
- brand_profile.campaign_ids[] (deprecated, kept for backward compatibility)
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

# Advertiser Database URL - advertiser_profiles, company_profile, brand_profile,
# campaign_profile, campaign_impressions, campaign_engagement, campaign_media all
# live in astegni_advertiser_db after the May/June 2026 DB split.
ADVERTISER_DATABASE_URL = os.getenv(
    'ADVERTISER_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_advertiser_db'
)

def get_user_db():
    """Get user database connection (users table only)"""
    return psycopg.connect(USER_DATABASE_URL, row_factory=dict_row)

def get_admin_db():
    """Get admin database connection (brand_packages)"""
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)

def get_adv_db():
    """Get advertiser database connection (all advertiser tables)"""
    return psycopg.connect(ADVERTISER_DATABASE_URL, row_factory=dict_row)


def _fetch_users_by_ids(user_ids):
    """Resolve a set of user_ids to user records from astegni_user_db.

    Postgres cannot join across databases, so advertiser-table queries select
    ap.user_id and we merge user fields in Python. Returns {id: {...}}.
    """
    ids = [uid for uid in {u for u in user_ids} if uid is not None]
    if not ids:
        return {}
    users_map = {}
    with get_user_db() as uconn:
        with uconn.cursor() as ucur:
            ucur.execute(
                "SELECT id, email, first_name, father_name, grandfather_name, "
                "last_name, profile_picture FROM users WHERE id = ANY(%s)",
                (ids,),
            )
            for u in ucur.fetchall():
                users_map[u['id']] = u
    return users_map


def _full_name(u):
    """Build a CONCAT_WS(' ', ...) equivalent name from a user dict (or None)."""
    if not u:
        return None
    parts = [u.get('first_name'), u.get('father_name'),
             u.get('grandfather_name'), u.get('last_name')]
    name = ' '.join(p for p in parts if p)
    return name or None


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
                    admin_cur.execute("SELECT id, package_title, package_price FROM brand_packages")
                    for pkg in admin_cur.fetchall():
                        packages_map[pkg['id']] = {'name': pkg['package_title'], 'price': pkg['package_price']}
        except Exception as pkg_error:
            print(f"[Warning] Could not fetch brand_packages from admin db: {pkg_error}")
            # Continue without packages - they'll show as "No Package"

        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # Post-restructure JOIN chain (all in astegni_advertiser_db):
                #   brand_profile.company_id -> company_profile.id
                #   company_profile.advertiser_id -> advertiser_profiles.id
                #   advertiser_profiles.user_id -> users.id (in astegni_user_db,
                #     resolved separately below; Postgres can't join across DBs).
                # The legacy ap.brand_ids[] join is now empty for new brands.
                query = """
                    SELECT bp.*,
                           cp.company_name AS company_name,
                           cp.company_logo AS company_logo,
                           cp.id AS company_id_out,
                           ap.user_id AS advertiser_user_id
                    FROM brand_profile bp
                    LEFT JOIN company_profile cp ON bp.company_id = cp.id
                    LEFT JOIN advertiser_profiles ap ON cp.advertiser_id = ap.id
                    WHERE 1=1
                """
                params = []

                # Brands have no verification concept. `status` carries only
                # operational values (active/paused/inactive).
                if status in ('active', 'paused', 'inactive'):
                    query += " AND bp.status = %s"
                    params.append(status)

                if search:
                    query += " AND (bp.name ILIKE %s OR cp.company_name ILIKE %s)"
                    params.extend([f"%{search}%", f"%{search}%"])

                # Count total via regex (SELECT clause spans multiple lines)
                import re as _re
                count_query = _re.sub(
                    r'SELECT\s+bp\.\*.*?(?=FROM\s)',
                    'SELECT COUNT(*) ',
                    query, count=1, flags=_re.DOTALL,
                )
                cur.execute(count_query, params)
                total = cur.fetchone()['count']

                # Add pagination
                offset = (page - 1) * limit
                query += " ORDER BY bp.created_at DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])

                cur.execute(query, params)
                brands = cur.fetchall()

        # Resolve advertiser users from astegni_user_db (cross-DB; merged in Python)
        users_map = _fetch_users_by_ids([b.get('advertiser_user_id') for b in brands])

        # Transform to match frontend expectations
        result = []
        for b in brands:
            package_id = b.get('package_id')
            package_info = packages_map.get(package_id, {}) if package_id else {}
            u = users_map.get(b.get('advertiser_user_id'))

            result.append({
                'id': b['id'],
                'brand_name': b['name'],
                'brand_logo': b['thumbnail'],
                'description': b['bio'],
                'industry': b.get('industry'),
                'location': b['location'],
                'email': b['email'],
                'status': b['status'] or 'active',  # operational: active/paused/inactive
                'is_active': b['is_active'],
                'created_at': str(b['created_at']) if b['created_at'] else None,
                'company_id': b.get('company_id_out'),
                'company_name': b.get('company_name'),
                'company_logo': b.get('company_logo'),
                'advertiser_name': _full_name(u),
                'advertiser_email': u['email'] if u else None,
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


@router.get("/brands/{brand_id}")
async def get_brand(brand_id: int):
    """Get specific brand by ID.
    Post-restructure JOIN chain:
      brand_profile.company_id -> company_profile.id
      company_profile.advertiser_id -> advertiser_profiles.id
      advertiser_profiles.user_id -> users.id"""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT bp.*,
                           cp.id AS company_id_out,
                           cp.company_name AS company_name,
                           cp.company_logo AS company_logo,
                           cp.is_verified AS company_is_verified,
                           ap.id AS advertiser_id,
                           ap.user_id AS advertiser_user_id
                    FROM brand_profile bp
                    LEFT JOIN company_profile cp ON bp.company_id = cp.id
                    LEFT JOIN advertiser_profiles ap ON cp.advertiser_id = ap.id
                    WHERE bp.id = %s
                """, (brand_id,))
                brand = cur.fetchone()
                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")

        # Resolve advertiser user from astegni_user_db (cross-DB; merged in Python)
        u = _fetch_users_by_ids([brand.get('advertiser_user_id')]).get(brand.get('advertiser_user_id'))

        return {
                    'id': brand['id'],
                    'brand_name': brand['name'],
                    'brand_logo': brand['thumbnail'],
                    'description': brand['bio'],
                    'quote': brand['quote'],
                    'industry': brand.get('industry'),
                    'website': brand.get('website'),
                    'location': brand['location'],
                    'email': brand['email'],
                    'phone': brand['phone'],
                    'social_links': brand['social_links'],
                    'hero_title': brand['hero_title'],
                    'hero_subtitle': brand['hero_subtitle'],
                    'badge': brand['badge'],
                    'status': brand['status'] or 'active',  # operational: active/paused/inactive
                    'is_active': brand['is_active'],
                    'created_at': str(brand['created_at']) if brand['created_at'] else None,
                    'company_id': brand.get('company_id_out'),
                    'company_name': brand.get('company_name'),
                    'company_logo': brand.get('company_logo'),
                    'company_is_verified': brand.get('company_is_verified'),
                    'advertiser_id': brand.get('advertiser_id'),
                    'advertiser_name': _full_name(u),
                    'advertiser_email': u['email'] if u else None,
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# NOTE: Brand verification was removed. A brand can only exist under an
# already-verified company, so brands have no verify/reject/suspend/restore/
# reinstate lifecycle. `brand_profile.status` carries only operational values
# (active/paused/inactive). Campaign-level moderation remains below.


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
    Joins with brand_profile using brand_id (proper foreign key relationship)
    Fetches brand_packages from astegni_admin_db"""
    try:
        # First, fetch all brand_packages from admin database
        packages_map = {}
        try:
            with get_admin_db() as admin_conn:
                with admin_conn.cursor() as admin_cur:
                    admin_cur.execute("SELECT id, package_title, package_price FROM brand_packages")
                    for pkg in admin_cur.fetchall():
                        packages_map[pkg['id']] = {'name': pkg['package_title'], 'price': pkg['package_price']}
        except Exception as pkg_error:
            print(f"[Warning] Could not fetch brand_packages from admin db: {pkg_error}")
            # Continue without packages - they'll show as "No Package"

        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # Build query - join with brand_profile using brand_id (proper foreign key relationship)
                # campaign_profile.brand_id references brand_profile.id
                base_query = """
                    FROM campaign_profile cp
                    LEFT JOIN brand_profile bp ON cp.brand_id = bp.id
                    WHERE 1=1
                """
                params = []
                where_clauses = []

                if status:
                    if status == 'verified':
                        where_clauses.append("cp.verification_status = 'verified'")
                    elif status == 'pending' or status == 'requested':
                        # Only show campaigns that have been submitted for verification
                        where_clauses.append("((cp.verification_status = 'pending' OR cp.verification_status IS NULL) AND cp.submit_for_verification = true)")
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

                # Get campaign IDs for aggregation queries
                campaign_ids = [c['id'] for c in campaigns]

                # Aggregate impressions and clicks from campaign_impressions table
                impressions_map = {}
                clicks_map = {}
                conversions_map = {}
                if campaign_ids:
                    cur.execute("""
                        SELECT
                            campaign_id,
                            COUNT(*) as total_impressions,
                            COUNT(*) FILTER (WHERE clicked = true) as total_clicks,
                            COUNT(*) FILTER (WHERE converted = true) as total_conversions
                        FROM campaign_impressions
                        WHERE campaign_id = ANY(%s)
                        GROUP BY campaign_id
                    """, (campaign_ids,))
                    for row in cur.fetchall():
                        impressions_map[row['campaign_id']] = row['total_impressions']
                        clicks_map[row['campaign_id']] = row['total_clicks']
                        conversions_map[row['campaign_id']] = row['total_conversions']

                # Aggregate engagements (likes, shares, comments) from campaign_engagement table
                likes_map = {}
                shares_map = {}
                comments_map = {}
                if campaign_ids:
                    cur.execute("""
                        SELECT
                            campaign_id,
                            COUNT(*) FILTER (WHERE engagement_type = 'like') as total_likes,
                            COUNT(*) FILTER (WHERE engagement_type = 'share') as total_shares,
                            COUNT(*) FILTER (WHERE engagement_type = 'comment') as total_comments
                        FROM campaign_engagement
                        WHERE campaign_id = ANY(%s)
                        GROUP BY campaign_id
                    """, (campaign_ids,))
                    for row in cur.fetchall():
                        likes_map[row['campaign_id']] = row['total_likes']
                        shares_map[row['campaign_id']] = row['total_shares']
                        comments_map[row['campaign_id']] = row['total_comments']

                # Get thumbnail from campaign_media (first image for each campaign)
                thumbnail_map = {}
                if campaign_ids:
                    cur.execute("""
                        SELECT DISTINCT ON (campaign_id) campaign_id, file_url
                        FROM campaign_media
                        WHERE campaign_id = ANY(%s) AND media_type = 'image'
                        ORDER BY campaign_id, created_at ASC
                    """, (campaign_ids,))
                    for row in cur.fetchall():
                        thumbnail_map[row['campaign_id']] = row['file_url']

                # Transform to match frontend expectations
                result = []
                for c in campaigns:
                    campaign_id = c['id']

                    result.append({
                        'id': campaign_id,
                        'campaign_name': c['name'],
                        'campaign_image': thumbnail_map.get(campaign_id),
                        'description': c.get('description'),
                        'objective': c.get('objective'),
                        'verification_status': c.get('verification_status') or 'pending',
                        'is_verified': c.get('is_verified', False),
                        'submit_for_verification': c.get('submit_for_verification', False),
                        'impressions': impressions_map.get(campaign_id, 0),
                        'clicks': clicks_map.get(campaign_id, 0),
                        'conversions': conversions_map.get(campaign_id, 0),
                        'likes': likes_map.get(campaign_id, 0),
                        'shares': shares_map.get(campaign_id, 0),
                        'comments': comments_map.get(campaign_id, 0),
                        'campaign_budget': float(c['campaign_budget']) if c.get('campaign_budget') else 0,
                        'start_date': str(c['start_date']) if c.get('start_date') else None,
                        'end_date': str(c.get('ended_at')) if c.get('ended_at') else None,
                        'created_at': str(c['created_at']) if c.get('created_at') else None,
                        'status_at': str(c['status_at']) if c.get('status_at') else None,
                        'target_audience': c.get('target_audiences', []),
                        'brand_name': c.get('brand_name'),
                        'brand_logo': c.get('brand_logo'),
                        'brand_id': c.get('brand_id'),
                        'package_name': 'Custom',
                        'package_price': None
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
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        COUNT(*) as total,
                        COUNT(*) FILTER (WHERE verification_status = 'verified') as verified,
                        COUNT(*) FILTER (WHERE (verification_status = 'pending' OR verification_status IS NULL) AND submit_for_verification = true) as pending,
                        COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
                        COUNT(*) FILTER (WHERE verification_status = 'suspended') as suspended,
                        COUNT(*) FILTER (WHERE submit_for_verification = true) as submitted_for_verification
                    FROM campaign_profile
                """)
                counts = cur.fetchone()
                return dict(counts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Removed: Replaced by detailed get_campaign_details endpoint below (line ~1155)
# The detailed endpoint fetches brand info and engagement metrics from DB


@router.post("/campaigns/{campaign_id}/verify")
async def verify_campaign(campaign_id: int, admin_id: Optional[int] = None):
    """Verify a campaign"""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'verified',
                        is_verified = TRUE,
                        submit_for_verification = FALSE,
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
        with get_adv_db() as conn:
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
        with get_adv_db() as conn:
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
        with get_adv_db() as conn:
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
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'verified',
                        is_verified = TRUE,
                        submit_for_verification = FALSE,
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
    Post-restructure JOIN via brand_profile.company_id -> company_profile."""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT bp.id, bp.name, bp.thumbnail, bp.status, bp.created_at,
                           cp.company_name AS company_name
                    FROM brand_profile bp
                    LEFT JOIN company_profile cp ON bp.company_id = cp.id
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
                        'company_name': b.get('company_name'),
                        'advertiser_name': b.get('company_name'),  # alias for legacy callers
                    })
                return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/recent/campaigns")
async def get_recent_campaigns(limit: int = Query(default=5, le=20)):
    """Get most recent campaign submissions with brand names.
    Joins with brand_profile using brand_id (proper foreign key relationship)"""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT cp.id, cp.name, cp.verification_status, cp.created_at,
                           bp.name as brand_name, bp.thumbnail as brand_logo
                    FROM campaign_profile cp
                    LEFT JOIN brand_profile bp ON cp.brand_id = bp.id
                    ORDER BY cp.created_at DESC
                    LIMIT %s
                """, (limit,))
                campaigns = cur.fetchall()

                # Get campaign IDs
                campaign_ids = [c['id'] for c in campaigns]

                # Get thumbnails from campaign_media
                thumbnail_map = {}
                if campaign_ids:
                    cur.execute("""
                        SELECT DISTINCT ON (campaign_id) campaign_id, file_url
                        FROM campaign_media
                        WHERE campaign_id = ANY(%s) AND media_type = 'image'
                        ORDER BY campaign_id, created_at ASC
                    """, (campaign_ids,))
                    for row in cur.fetchall():
                        thumbnail_map[row['campaign_id']] = row['file_url']

                result = []
                for c in campaigns:
                    result.append({
                        'id': c['id'],
                        'campaign_name': c['name'],
                        'campaign_image': thumbnail_map.get(c['id']),
                        'verification_status': c.get('verification_status') or 'pending',
                        'created_at': str(c['created_at']) if c.get('created_at') else None,
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
        with get_adv_db() as conn:
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


# ============================================================
# CAMPAIGN DETAIL ENDPOINTS (for view-campaign-modal)
# ============================================================

@router.get("/campaigns/{campaign_id}")
async def get_campaign_details(campaign_id: int):
    """
    Get detailed campaign information for admin view modal
    Fetches from campaign_profile and brand_profile tables
    """
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # Get campaign details with brand information directly from DB
                cur.execute("""
                    SELECT
                        cp.id,
                        cp.name,
                        cp.description,
                        cp.objective,
                        cp.start_date,
                        cp.ended_at,
                        cp.campaign_budget,
                        cp.amount_used,
                        cp.remaining_balance,
                        cp.target_audiences,
                        cp.target_placements,
                        cp.target_location,
                        cp.target_regions,
                        cp.verification_status,
                        cp.is_verified,
                        cp.status_by,
                        cp.status_reason,
                        cp.status_at,
                        cp.submit_for_verification,
                        cp.cpi_rate,
                        cp.created_at,
                        cp.updated_at,
                        bp.name as brand_name,
                        bp.bio as brand_description,
                        bp.thumbnail as brand_logo,
                        bp.location as brand_location,
                        bp.industry as brand_category,
                        bp.website as brand_website,
                        bp.id as brand_id
                    FROM campaign_profile cp
                    LEFT JOIN brand_profile bp ON cp.brand_id = bp.id
                    WHERE cp.id = %s
                """, (campaign_id,))

                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")

                # Get campaign impression metrics from campaign_impressions table
                cur.execute("""
                    SELECT
                        COUNT(*) as total_impressions,
                        COUNT(*) FILTER (WHERE clicked = true) as total_clicks,
                        COUNT(*) FILTER (WHERE converted = true) as total_conversions
                    FROM campaign_impressions
                    WHERE campaign_id = %s
                """, (campaign_id,))
                engagement = cur.fetchone()

                # Get social engagement metrics from campaign_engagement table
                cur.execute("""
                    SELECT
                        COUNT(*) FILTER (WHERE engagement_type = 'like') as total_likes,
                        COUNT(*) FILTER (WHERE engagement_type = 'share') as total_shares,
                        COUNT(*) FILTER (WHERE engagement_type = 'comment') as total_comments
                    FROM campaign_engagement
                    WHERE campaign_id = %s
                """, (campaign_id,))
                social_engagement = cur.fetchone()

                # Calculate CTR
                impressions = engagement['total_impressions'] if engagement else 0
                clicks = engagement['total_clicks'] if engagement else 0
                ctr = (clicks / impressions * 100) if impressions > 0 else 0

                # Handle brand location (JSONB field)
                brand_location_str = None
                if campaign['brand_location']:
                    if isinstance(campaign['brand_location'], dict):
                        # Extract city/country from JSONB
                        location_parts = []
                        if campaign['brand_location'].get('city'):
                            location_parts.append(campaign['brand_location']['city'])
                        if campaign['brand_location'].get('country'):
                            location_parts.append(campaign['brand_location']['country'])
                        brand_location_str = ', '.join(location_parts) if location_parts else None
                    else:
                        brand_location_str = str(campaign['brand_location'])

                # Build response matching frontend expectations - directly from DB tables
                return {
                    "campaign": {
                        "id": campaign['id'],
                        "campaign_name": campaign['name'] or 'Unnamed Campaign',
                        "description": campaign['description'] or 'No description provided',
                        "objective": campaign['objective'] or 'Not specified',
                        "start_date": str(campaign['start_date']) if campaign['start_date'] else None,
                        "end_date": str(campaign['ended_at']) if campaign['ended_at'] else None,
                        "budget": float(campaign['campaign_budget']) if campaign['campaign_budget'] else 0,
                        "campaign_type": "Standard",  # Can be enhanced based on actual campaign type
                        "ad_type": "Campaign",
                        "target_audience": campaign['target_audiences'] if campaign['target_audiences'] else [],
                        "target_placements": campaign['target_placements'] if campaign['target_placements'] else [],
                        "target_location": campaign['target_location'],
                        "target_regions": campaign['target_regions'] if campaign['target_regions'] else [],
                        "verification_status": campaign['verification_status'] or 'pending',
                        "is_verified": campaign['is_verified'],
                        "rejection_reason": campaign['status_reason'] if campaign['verification_status'] == 'rejected' else None,
                        "suspension_reason": campaign['status_reason'] if campaign['verification_status'] == 'suspended' else None,
                        "submit_for_verification": campaign['submit_for_verification'],
                        "cpi_rate": float(campaign['cpi_rate']) if campaign['cpi_rate'] else 0,
                        "created_at": str(campaign['created_at']) if campaign['created_at'] else None,
                        "updated_at": str(campaign['updated_at']) if campaign['updated_at'] else None,

                        # Brand information (from brand_profile table)
                        "brand_name": campaign['brand_name'] or 'Unknown Brand',
                        "brand_description": campaign['brand_description'] or 'No description available',
                        "brand_logo": campaign['brand_logo'] or None,
                        "brand_location": brand_location_str,
                        "brand_category": campaign['brand_category'] or 'Uncategorized',
                        "brand_website": campaign['brand_website'] or None,
                        "brand_id": campaign['brand_id'],

                        # Performance metrics (from campaign_engagement table)
                        "impressions": impressions,
                        "clicks": clicks,
                        "conversions": engagement['total_conversions'] if engagement else 0,
                        "ctr": round(ctr, 2),
                        "spent": float(campaign['amount_used']) if campaign['amount_used'] else 0,

                        # Social engagement
                        "likes": social_engagement['total_likes'] if social_engagement else 0,
                        "shares": social_engagement['total_shares'] if social_engagement else 0,
                        "comments": social_engagement['total_comments'] if social_engagement else 0,
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}/media")
async def get_campaign_media(campaign_id: int):
    """
    Get all media (images and videos) for a campaign
    Fetches from campaign_media table
    """
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # Verify campaign exists
                cur.execute("""
                    SELECT id FROM campaign_profile WHERE id = %s
                """, (campaign_id,))

                if not cur.fetchone():
                    raise HTTPException(status_code=404, detail="Campaign not found")

                # Get all media for this campaign
                cur.execute("""
                    SELECT
                        id,
                        campaign_id,
                        brand_id,
                        advertiser_id,
                        media_type,
                        file_url,
                        file_name,
                        file_size,
                        placement,
                        content_type,
                        folder_path,
                        created_at,
                        updated_at
                    FROM campaign_media
                    WHERE campaign_id = %s
                    ORDER BY created_at ASC
                """, (campaign_id,))

                media_items = cur.fetchall()

                # Format response
                media = []
                for item in media_items:
                    media.append({
                        "id": item['id'],
                        "campaign_id": item['campaign_id'],
                        "brand_id": item['brand_id'],
                        "advertiser_id": item['advertiser_id'],
                        "media_type": item['media_type'],  # 'image' or 'video'
                        "file_url": item['file_url'],
                        "file_name": item['file_name'],
                        "file_size": item['file_size'],
                        "placement": item['placement'],  # 'leaderboard-banner', 'logo', etc.
                        "content_type": item['content_type'],
                        "folder_path": item['folder_path'],
                        "created_at": str(item['created_at']) if item['created_at'] else None,
                        "updated_at": str(item['updated_at']) if item['updated_at'] else None,
                    })

                return {
                    "media": media,
                    "total": len(media),
                    "images": len([m for m in media if m['media_type'] == 'image']),
                    "videos": len([m for m in media if m['media_type'] == 'video'])
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# COMPANY ENDPOINTS (added May 2026 after company_profile restructure)
# ============================================================
# A user with the advertiser role can own multiple companies. Each company
# has its own KYC (business license + TIN + logo), verification status,
# wallet, and brands. Admin actions mirror brand actions: verify, reject,
# suspend, restore, reinstate.

@router.get("/companies")
async def admin_get_companies(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, le=100),
):
    """List companies with optional status filter + search."""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # users live in astegni_user_db (cross-DB); select ap.user_id here
                # and resolve advertiser email/name/avatar in Python after the query.
                query = """
                    SELECT cp.*,
                           ap.user_id AS advertiser_user_id
                    FROM company_profile cp
                    JOIN advertiser_profiles ap ON ap.id = cp.advertiser_id
                    WHERE 1=1
                """
                params: list = []

                # Admins only deal with companies that have entered the review
                # lifecycle. "Unverified" companies (no TIN/license submitted yet)
                # are advertiser-driven and never shown here.
                query += " AND (cp.is_verified = TRUE OR cp.verification_status IN ('pending','rejected','suspended'))"

                if status:
                    if status == 'verified':
                        query += " AND cp.is_verified = TRUE"
                    elif status in ('pending', 'requested'):
                        query += " AND cp.verification_status = 'pending'"
                    elif status == 'rejected':
                        query += " AND cp.verification_status = 'rejected'"
                    elif status == 'suspended':
                        query += " AND cp.verification_status = 'suspended'"

                if search:
                    query += " AND cp.company_name ILIKE %s"
                    params.append(f"%{search}%")

                # Build count query by stripping the SELECT clause via regex
                # (whitespace-tolerant; the SELECT spans multiple lines in source).
                import re as _re
                count_query = _re.sub(
                    r'SELECT\s+cp\.\*.*?(?=FROM\s)',
                    'SELECT COUNT(*) ',
                    query,
                    count=1,
                    flags=_re.DOTALL,
                )
                cur.execute(count_query, params)
                total = cur.fetchone()['count']

                offset = (page - 1) * limit
                query += " ORDER BY cp.created_at DESC LIMIT %s OFFSET %s"
                params.extend([limit, offset])

                cur.execute(query, params)
                rows = cur.fetchall()

        # Resolve advertiser users from astegni_user_db (cross-DB; merged in Python)
        users_map = _fetch_users_by_ids([c.get('advertiser_user_id') for c in rows])

        result = []
        for c in rows:
                    u = users_map.get(c.get('advertiser_user_id'))
                    result.append({
                        'id': c['id'],
                        'advertiser_id': c['advertiser_id'],
                        'company_name': c['company_name'],
                        'company_logo': c.get('company_logo'),
                        'industry': c.get('industry'),
                        'company_size': c.get('company_size'),
                        'business_reg_no': c.get('business_reg_no'),
                        'tin_number': c.get('tin_number'),
                        'website': c.get('website'),
                        'company_description': c.get('company_description'),
                        'is_verified': c.get('is_verified'),
                        'verification_status': c.get('verification_status') or ('verified' if c.get('is_verified') else 'unverified'),
                        'verification_method': c.get('verification_method'),
                        'verification_submitted_at': str(c['verification_submitted_at']) if c.get('verification_submitted_at') else None,
                        'verification_reviewed_at': str(c['verification_reviewed_at']) if c.get('verification_reviewed_at') else None,
                        'verification_notes': c.get('verification_notes'),
                        'verification_escalated': bool(c.get('verification_escalated')),
                        'verification_escalated_at': str(c['verification_escalated_at']) if c.get('verification_escalated_at') else None,
                        'business_license_url': c.get('business_license_url'),
                        'tin_certificate_url': c.get('tin_certificate_url'),
                        'additional_docs_urls': c.get('additional_docs_urls') or [],
                        'balance': float(c['balance']) if c.get('balance') is not None else 0.0,
                        'currency': c.get('currency') or 'ETB',
                        'created_at': str(c['created_at']) if c.get('created_at') else None,
                        'advertiser_email': u['email'] if u else None,
                        'advertiser_name': _full_name(u),
                        'advertiser_avatar': u.get('profile_picture') if u else None,
                    })

        return {
                    "companies": result,
                    "total": total,
                    "page": page,
                    "limit": limit,
                    "pages": (total + limit - 1) // limit if total > 0 else 0,
                }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/counts")
async def admin_get_company_counts():
    """Count companies by verification status (for admin dashboard tiles)."""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # "total" excludes unverified companies (advertiser-driven, never
                # shown to admins). escalated = advertiser pressed "Notify admins".
                cur.execute("""
                    SELECT
                        COUNT(*) FILTER (
                            WHERE is_verified = TRUE
                               OR verification_status IN ('pending','rejected','suspended')
                        ) AS total,
                        COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified,
                        COUNT(*) FILTER (WHERE verification_status = 'pending') AS pending,
                        COUNT(*) FILTER (WHERE verification_status = 'rejected') AS rejected,
                        COUNT(*) FILTER (WHERE verification_status = 'suspended') AS suspended,
                        COUNT(*) FILTER (WHERE verification_status = 'pending' AND verification_escalated = TRUE) AS escalated
                    FROM company_profile
                """)
                return dict(cur.fetchone())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{company_id}")
async def admin_get_company(company_id: int):
    """Get full details for one company, including its brand + campaign counts."""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                # users live in astegni_user_db (cross-DB); select ap.user_id here
                # and resolve advertiser email/name/avatar in Python after the query.
                cur.execute("""
                    SELECT cp.*,
                           ap.user_id AS advertiser_user_id,
                           (SELECT COUNT(*) FROM brand_profile bp WHERE bp.company_id = cp.id) AS brand_count,
                           (SELECT COUNT(*) FROM campaign_profile camp WHERE camp.company_id = cp.id) AS campaign_count
                    FROM company_profile cp
                    JOIN advertiser_profiles ap ON ap.id = cp.advertiser_id
                    WHERE cp.id = %s
                """, (company_id,))
                c = cur.fetchone()
                if not c:
                    raise HTTPException(status_code=404, detail="Company not found")

        # Resolve advertiser user from astegni_user_db (cross-DB; merged in Python)
        u = _fetch_users_by_ids([c.get('advertiser_user_id')]).get(c.get('advertiser_user_id'))

        return {
                    'id': c['id'],
                    'advertiser_id': c['advertiser_id'],
                    'company_name': c['company_name'],
                    'company_logo': c.get('company_logo'),
                    'industry': c.get('industry'),
                    'company_size': c.get('company_size'),
                    'business_reg_no': c.get('business_reg_no'),
                    'tin_number': c.get('tin_number'),
                    'website': c.get('website'),
                    'address': c.get('address'),
                    'city': c.get('city'),
                    'company_description': c.get('company_description'),
                    'company_email': c.get('company_email') or [],
                    'company_phone': c.get('company_phone') or [],
                    'is_verified': c.get('is_verified'),
                    'verification_status': c.get('verification_status') or ('verified' if c.get('is_verified') else 'unverified'),
                    'verification_method': c.get('verification_method'),
                    'verification_submitted_at': str(c['verification_submitted_at']) if c.get('verification_submitted_at') else None,
                    'verification_reviewed_at': str(c['verification_reviewed_at']) if c.get('verification_reviewed_at') else None,
                    'verification_notes': c.get('verification_notes'),
                    'verification_escalated': bool(c.get('verification_escalated')),
                    'verification_escalated_at': str(c['verification_escalated_at']) if c.get('verification_escalated_at') else None,
                    'verified_at': str(c['verified_at']) if c.get('verified_at') else None,
                    'rejected_at': str(c['rejected_at']) if c.get('rejected_at') else None,
                    'business_license_url': c.get('business_license_url'),
                    'tin_certificate_url': c.get('tin_certificate_url'),
                    'additional_docs_urls': c.get('additional_docs_urls') or [],
                    'balance': float(c['balance']) if c.get('balance') is not None else 0.0,
                    'currency': c.get('currency') or 'ETB',
                    'total_deposits': float(c['total_deposits']) if c.get('total_deposits') is not None else 0.0,
                    'total_spent': float(c['total_spent']) if c.get('total_spent') is not None else 0.0,
                    'created_at': str(c['created_at']) if c.get('created_at') else None,
                    'updated_at': str(c['updated_at']) if c.get('updated_at') else None,
                    'advertiser_email': u['email'] if u else None,
                    'advertiser_name': _full_name(u),
                    'advertiser_avatar': u.get('profile_picture') if u else None,
                    'brand_count': c.get('brand_count') or 0,
                    'campaign_count': c.get('campaign_count') or 0,
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/verify")
async def admin_verify_company(company_id: int, admin_id: Optional[int] = None):
    """Approve a company's KYC submission."""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE company_profile
                    SET is_verified = TRUE,
                        verification_status = 'verified',
                        verification_method = COALESCE(verification_method, 'admin'),
                        verified_at = NOW(),
                        verification_reviewed_at = NOW(),
                        rejected_at = NULL,
                        verification_notes = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (company_id,))
                row = cur.fetchone()
                conn.commit()
                if not row:
                    raise HTTPException(status_code=404, detail="Company not found")
                return {"message": "Company verified", "company": {"id": row['id'], "is_verified": row['is_verified'], "verification_status": row['verification_status']}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/reject")
async def admin_reject_company(company_id: int, data: dict):
    """Reject a company's KYC submission with a reason."""
    try:
        reason = data.get('reason', 'No reason provided')
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE company_profile
                    SET is_verified = FALSE,
                        verification_status = 'rejected',
                        rejected_at = NOW(),
                        verification_reviewed_at = NOW(),
                        verification_notes = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reason, company_id))
                row = cur.fetchone()
                conn.commit()
                if not row:
                    raise HTTPException(status_code=404, detail="Company not found")
                return {"message": "Company rejected", "company": {"id": row['id'], "verification_status": row['verification_status'], "verification_notes": row['verification_notes']}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/suspend")
async def admin_suspend_company(company_id: int, data: dict):
    """Suspend a previously-verified company (e.g. policy violation)."""
    try:
        reason = data.get('reason', 'No reason provided')
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE company_profile
                    SET is_verified = FALSE,
                        verification_status = 'suspended',
                        verification_reviewed_at = NOW(),
                        verification_notes = %s,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (reason, company_id))
                row = cur.fetchone()
                conn.commit()
                if not row:
                    raise HTTPException(status_code=404, detail="Company not found")
                return {"message": "Company suspended", "company": {"id": row['id'], "verification_status": row['verification_status'], "verification_notes": row['verification_notes']}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/restore")
async def admin_restore_company(company_id: int):
    """Restore a suspended/rejected company to pending so it can be re-reviewed."""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE company_profile
                    SET verification_status = 'pending',
                        verification_notes = NULL,
                        rejected_at = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (company_id,))
                row = cur.fetchone()
                conn.commit()
                if not row:
                    raise HTTPException(status_code=404, detail="Company not found")
                return {"message": "Company restored to pending", "company": {"id": row['id'], "verification_status": row['verification_status']}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/reinstate")
async def admin_reinstate_company(company_id: int):
    """Reinstate a suspended company back to verified (e.g. after appeal)."""
    try:
        with get_adv_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE company_profile
                    SET is_verified = TRUE,
                        verification_status = 'verified',
                        verification_notes = NULL,
                        verified_at = COALESCE(verified_at, NOW()),
                        verification_reviewed_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (company_id,))
                row = cur.fetchone()
                conn.commit()
                if not row:
                    raise HTTPException(status_code=404, detail="Company not found")
                return {"message": "Company reinstated to verified", "company": {"id": row['id'], "verification_status": row['verification_status'], "is_verified": row['is_verified']}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
