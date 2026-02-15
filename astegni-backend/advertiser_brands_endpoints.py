"""
Advertiser Brands & Campaigns Endpoints
User-facing endpoints for advertisers to manage their brands and campaigns.

Database Schema:
- advertiser_profiles: id, user_id, brand_ids[] (array of brand IDs)
- brand_profile: id, name, bio, thumbnail, campaign_ids[] (array of campaign IDs), etc.
- campaign_profile: id, name, description, impressions, clicks, etc.

Relationships:
- advertiser_profiles.brand_ids[] → brand_profile.id
- brand_profile.campaign_ids[] → campaign_profile.id
"""

from fastapi import APIRouter, HTTPException, Query, Depends, File, UploadFile
from pydantic import BaseModel
from typing import Optional, List
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from dotenv import load_dotenv
import os
from utils import get_current_user
from backblaze_service import get_backblaze_service

load_dotenv()

router = APIRouter(prefix="/api/advertiser", tags=["Advertiser Brands"])

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def get_db():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


# ============================================================
# PYDANTIC MODELS
# ============================================================

class BrandCreate(BaseModel):
    name: str
    bio: Optional[str] = None
    quote: Optional[str] = None
    thumbnail: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    social_links: Optional[dict] = None
    phone: Optional[List[str]] = None
    email: Optional[List[str]] = None
    location: Optional[List[str]] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    brand_color: Optional[str] = None
    status: Optional[str] = None

class BrandUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    quote: Optional[str] = None
    thumbnail: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    social_links: Optional[dict] = None
    phone: Optional[List[str]] = None
    email: Optional[List[str]] = None
    location: Optional[List[str]] = None
    industry: Optional[str] = None
    website: Optional[str] = None
    brand_color: Optional[str] = None
    status: Optional[str] = None

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_url: Optional[str] = None
    objective: Optional[str] = None
    target_audience: Optional[str] = None  # Legacy field (singular)
    target_location: Optional[str] = None  # global, national, regional
    campaign_budget: Optional[float] = None
    start_date: Optional[str] = None
    call_to_action: Optional[str] = None
    # New array fields for targeting
    target_audiences: Optional[List[str]] = None  # ['tutor', 'student', 'parent', 'advertiser', 'user']
    target_regions: Optional[List[str]] = None    # ['addis-ababa', 'oromia', etc.]
    target_placements: Optional[List[str]] = None # ['leaderboard-banner', 'logo', 'in-session-skyscrapper-banner']
    # Location-specific fields
    national_location: Optional[str] = None       # User's location for national targeting (e.g., "Addis Ababa, Ethiopia")
    national_country_code: Optional[str] = None   # ISO country code for national targeting (e.g., "ET")
    regional_country_code: Optional[str] = None   # Country code for regional targeting (e.g., "ET")

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_url: Optional[str] = None
    objective: Optional[str] = None
    target_audience: Optional[str] = None  # Legacy field (singular)
    target_location: Optional[str] = None  # global, national, regional
    campaign_budget: Optional[float] = None
    start_date: Optional[str] = None
    call_to_action: Optional[str] = None
    # New array fields for targeting
    target_audiences: Optional[List[str]] = None  # ['tutor', 'student', 'parent', 'advertiser', 'user']
    target_regions: Optional[List[str]] = None    # ['addis-ababa', 'oromia', etc.]
    target_placements: Optional[List[str]] = None # ['leaderboard-banner', 'logo', 'in-session-skyscrapper-banner']
    # Location-specific fields
    national_location: Optional[str] = None       # User's location for national targeting (e.g., "Addis Ababa, Ethiopia")
    national_country_code: Optional[str] = None   # ISO country code for national targeting (e.g., "ET")
    regional_country_code: Optional[str] = None   # Country code for regional targeting (e.g., "ET")


# ============================================================
# BRAND ENDPOINTS
# ============================================================

@router.get("/brands")
async def get_my_brands(current_user = Depends(get_current_user)):
    """Get all brands owned by the current advertiser"""
    try:
        # Get advertiser profile ID from role_ids (more efficient than querying by user_id)
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            return {"brands": [], "total": 0, "message": "No advertiser profile found"}

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get advertiser profile by profile_id directly
                cur.execute("""
                    SELECT id, brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser:
                    return {"brands": [], "total": 0}

                brand_ids = advertiser.get('brand_ids') or []

                if not brand_ids:
                    return {"brands": [], "total": 0}

                # Get all brands for this advertiser
                cur.execute("""
                    SELECT bp.*,
                           COALESCE(array_length(bp.campaign_ids, 1), 0) as campaigns_count,
                           (SELECT COALESCE(COUNT(*), 0) FROM campaign_impressions ci
                            WHERE bp.campaign_ids IS NOT NULL AND array_length(bp.campaign_ids, 1) > 0
                            AND ci.campaign_id = ANY(bp.campaign_ids)) as total_impressions,
                           (SELECT COALESCE(SUM(campaign_budget), 0) FROM campaign_profile cp
                            WHERE bp.campaign_ids IS NOT NULL AND array_length(bp.campaign_ids, 1) > 0
                            AND cp.id = ANY(bp.campaign_ids)) as total_budget
                    FROM brand_profile bp
                    WHERE bp.id = ANY(%s)
                    ORDER BY bp.created_at DESC
                """, (brand_ids,))
                brands = cur.fetchall()

                result = []
                for b in brands:
                    result.append({
                        'id': b['id'],
                        'name': b['name'],
                        'bio': b['bio'],
                        'description': b['bio'],  # Alias for frontend compatibility
                        'quote': b['quote'],
                        'thumbnail': b['thumbnail'],
                        'logo': b['thumbnail'],  # Alias for frontend compatibility
                        'hero_title': b['hero_title'],
                        'hero_subtitle': b['hero_subtitle'],
                        'social_links': b['social_links'],
                        'phone': b['phone'],
                        'email': b['email'],
                        'location': b['location'],
                        'industry': b.get('industry') or 'General',
                        'website': b.get('website'),
                        'brand_color': b.get('brand_color') or '#8B5CF6',
                        'status': b['status'] or 'active',
                        'is_verified': b['is_verified'],
                        'is_active': b['is_active'],
                        'campaigns_count': b['campaigns_count'] or 0,
                        'impressions': b['total_impressions'] or 0,
                        'revenue': b['total_impressions'] or 0,  # Using impressions as proxy for revenue
                        'budget': float(b['total_budget'] or 0),
                        'created_at': str(b['created_at']) if b['created_at'] else None
                    })

                return {"brands": result, "total": len(result)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands")
async def create_brand(brand: BrandCreate, current_user = Depends(get_current_user)):
    """Create a new brand for the current advertiser"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=404, detail="Advertiser profile not found")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get advertiser profile by profile_id directly
                cur.execute("""
                    SELECT id, brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser:
                    raise HTTPException(status_code=404, detail="Advertiser profile not found")

                advertiser_id = advertiser['id']
                current_brand_ids = advertiser.get('brand_ids') or []

                # Create the brand
                cur.execute("""
                    INSERT INTO brand_profile (
                        name, bio, quote, thumbnail, hero_title, hero_subtitle,
                        social_links, phone, email, location,
                        industry, website, brand_color,
                        status, is_verified, is_active, campaign_ids,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, FALSE, TRUE, '{}',
                        NOW(), NOW()
                    )
                    RETURNING *
                """, (
                    brand.name,
                    brand.bio,
                    brand.quote,
                    brand.thumbnail,
                    brand.hero_title,
                    brand.hero_subtitle,
                    Jsonb(brand.social_links or {}),
                    brand.phone or [],
                    brand.email or [],
                    brand.location or [],
                    brand.industry,
                    brand.website,
                    brand.brand_color or '#8B5CF6',
                    brand.status or 'active'
                ))
                new_brand = cur.fetchone()

                # Add brand ID to advertiser's brand_ids array
                new_brand_ids = current_brand_ids + [new_brand['id']]
                cur.execute("""
                    UPDATE advertiser_profiles
                    SET brand_ids = %s
                    WHERE id = %s
                """, (new_brand_ids, advertiser_id))

                conn.commit()

                return {
                    "message": "Brand created successfully",
                    "brand_id": new_brand['id'],
                    "brand": {
                        'id': new_brand['id'],
                        'name': new_brand['name'],
                        'bio': new_brand['bio'],
                        'thumbnail': new_brand['thumbnail'],
                        'industry': new_brand['industry'],
                        'website': new_brand['website'],
                        'brand_color': new_brand['brand_color'],
                        'status': new_brand['status'],
                        'is_verified': new_brand['is_verified'],
                        'is_active': new_brand['is_active'],
                        'created_at': str(new_brand['created_at'])
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/brands/{brand_id}")
async def get_brand(brand_id: int, current_user = Depends(get_current_user)):
    """Get a specific brand with its campaigns"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser or brand_id not in (advertiser.get('brand_ids') or []):
                    raise HTTPException(status_code=403, detail="You don't own this brand")

                # Get brand details
                cur.execute("""
                    SELECT * FROM brand_profile WHERE id = %s
                """, (brand_id,))
                brand = cur.fetchone()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")

                return dict(brand)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/brands/{brand_id}")
async def update_brand(brand_id: int, brand: BrandUpdate, current_user = Depends(get_current_user)):
    """Update a brand"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser or brand_id not in (advertiser.get('brand_ids') or []):
                    raise HTTPException(status_code=403, detail="You don't own this brand")

                # Build update query
                updates = []
                values = []

                if brand.name is not None:
                    updates.append("name = %s")
                    values.append(brand.name)
                if brand.bio is not None:
                    updates.append("bio = %s")
                    values.append(brand.bio)
                if brand.quote is not None:
                    updates.append("quote = %s")
                    values.append(brand.quote)
                if brand.thumbnail is not None:
                    updates.append("thumbnail = %s")
                    values.append(brand.thumbnail)
                if brand.hero_title is not None:
                    updates.append("hero_title = %s")
                    values.append(brand.hero_title)
                if brand.hero_subtitle is not None:
                    updates.append("hero_subtitle = %s")
                    values.append(brand.hero_subtitle)
                if brand.social_links is not None:
                    updates.append("social_links = %s")
                    values.append(Jsonb(brand.social_links))
                if brand.phone is not None:
                    updates.append("phone = %s")
                    values.append(brand.phone)
                if brand.email is not None:
                    updates.append("email = %s")
                    values.append(brand.email)
                if brand.location is not None:
                    updates.append("location = %s")
                    values.append(brand.location)
                if brand.industry is not None:
                    updates.append("industry = %s")
                    values.append(brand.industry)
                if brand.website is not None:
                    updates.append("website = %s")
                    values.append(brand.website)
                if brand.brand_color is not None:
                    updates.append("brand_color = %s")
                    values.append(brand.brand_color)
                if brand.status is not None:
                    updates.append("status = %s")
                    values.append(brand.status)

                if not updates:
                    raise HTTPException(status_code=400, detail="No fields to update")

                updates.append("updated_at = NOW()")
                values.append(brand_id)

                cur.execute(f"""
                    UPDATE brand_profile
                    SET {', '.join(updates)}
                    WHERE id = %s
                    RETURNING *
                """, values)
                updated_brand = cur.fetchone()
                conn.commit()

                return {"message": "Brand updated successfully", "brand": dict(updated_brand)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: int, current_user = Depends(get_current_user)):
    """Delete a brand (soft delete - set is_active to false)"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership using profile_id
                cur.execute("""
                    SELECT id, brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser or brand_id not in (advertiser.get('brand_ids') or []):
                    raise HTTPException(status_code=403, detail="You don't own this brand")

                # Soft delete
                cur.execute("""
                    UPDATE brand_profile
                    SET is_active = FALSE, updated_at = NOW()
                    WHERE id = %s
                """, (brand_id,))

                # Remove from advertiser's brand_ids
                new_brand_ids = [bid for bid in advertiser['brand_ids'] if bid != brand_id]
                cur.execute("""
                    UPDATE advertiser_profiles
                    SET brand_ids = %s
                    WHERE id = %s
                """, (new_brand_ids, advertiser['id']))

                conn.commit()

                return {"message": "Brand deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/logo")
async def upload_brand_logo(
    brand_id: int,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """Upload brand logo (updates thumbnail field)"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser or brand_id not in (advertiser.get('brand_ids') or []):
                    raise HTTPException(status_code=403, detail="You don't own this brand")

                # Read file contents
                contents = await file.read()

                # Get Backblaze service and upload
                b2_service = get_backblaze_service()
                result = b2_service.upload_file(
                    file_data=contents,
                    file_name=file.filename,
                    file_type='brand_logo',
                    user_id=f"brand_{brand_id}"
                )

                if not result:
                    raise HTTPException(status_code=500, detail="Upload failed")

                file_url = result['url']

                # Update brand thumbnail
                cur.execute("""
                    UPDATE brand_profile
                    SET thumbnail = %s, updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                """, (file_url, brand_id))
                updated_brand = cur.fetchone()

                conn.commit()

                return {
                    "message": "Brand logo uploaded successfully",
                    "logo_url": file_url,
                    "brand": {
                        'id': updated_brand['id'],
                        'name': updated_brand['name'],
                        'thumbnail': updated_brand['thumbnail'],
                        'logo': updated_brand['thumbnail']
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# CAMPAIGN ENDPOINTS
# ============================================================

@router.get("/brands/{brand_id}/campaigns")
async def get_brand_campaigns(brand_id: int, current_user = Depends(get_current_user)):
    """Get all campaigns for a specific brand"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser or brand_id not in (advertiser.get('brand_ids') or []):
                    raise HTTPException(status_code=403, detail="You don't own this brand")

                # Get brand with campaign IDs
                cur.execute("""
                    SELECT campaign_ids FROM brand_profile WHERE id = %s
                """, (brand_id,))
                brand = cur.fetchone()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")

                campaign_ids = brand.get('campaign_ids') or []

                if not campaign_ids:
                    return {"campaigns": [], "total": 0}

                # Get campaigns with aggregated metrics and media
                cur.execute("""
                    SELECT
                        cp.*,
                        COALESCE(COUNT(DISTINCT ci.id), 0) as impressions,
                        COALESCE(COUNT(DISTINCT ci.id) FILTER (WHERE ci.clicked = true), 0) as clicks,
                        COALESCE(COUNT(DISTINCT ci.id) FILTER (WHERE ci.converted = true), 0) as conversions,
                        COALESCE(COUNT(DISTINCT ce.id) FILTER (WHERE ce.engagement_type = 'like'), 0) as likes,
                        COALESCE(COUNT(DISTINCT ce.id) FILTER (WHERE ce.engagement_type = 'share'), 0) as shares,
                        COALESCE(COUNT(DISTINCT ce.id) FILTER (WHERE ce.engagement_type = 'comment'), 0) as comments,
                        (SELECT file_url FROM campaign_media WHERE campaign_id = cp.id AND media_type = 'image' LIMIT 1) as thumbnail_url,
                        (SELECT file_url FROM campaign_media WHERE campaign_id = cp.id LIMIT 1) as file_url
                    FROM campaign_profile cp
                    LEFT JOIN campaign_impressions ci ON cp.id = ci.campaign_id
                    LEFT JOIN campaign_engagement ce ON cp.id = ce.campaign_id
                    WHERE cp.id = ANY(%s)
                    GROUP BY cp.id
                    ORDER BY cp.created_at DESC
                """, (campaign_ids,))
                campaigns = cur.fetchall()

                result = []
                for c in campaigns:
                    result.append({
                        'id': c['id'],
                        'name': c['name'],
                        'description': c['description'],
                        'thumbnail_url': c['thumbnail_url'],
                        'file_url': c['file_url'],
                        'objective': c['objective'],
                        'status': c['verification_status'] or 'pending',
                        'is_verified': c['is_verified'],
                        'submit_for_verification': c.get('submit_for_verification', False),
                        'impressions': c['impressions'] or 0,
                        'clicks': c['clicks'] or 0,
                        'conversions': c['conversions'] or 0,
                        'likes': c['likes'] or 0,
                        'shares': c['shares'] or 0,
                        'comments': c['comments'] or 0,
                        'campaign_budget': float(c['campaign_budget']) if c['campaign_budget'] else 0,
                        'amount_used': float(c['amount_used']) if c['amount_used'] else 0,
                        'remaining_balance': float(c['remaining_balance']) if c['remaining_balance'] else 0,
                        'target_audience': None,  # Legacy field, use target_audiences instead
                        'target_location': c['target_location'] or 'global',
                        # New array targeting fields
                        'target_audiences': c.get('target_audiences') or ['tutor', 'student', 'parent', 'advertiser', 'user'],
                        'target_regions': c.get('target_regions') or [],
                        'target_placements': c.get('target_placements') or ['leaderboard-banner', 'logo', 'in-session-skyscrapper-banner'],
                        'start_date': str(c['start_date']) if c['start_date'] else None,
                        'created_at': str(c['created_at']) if c['created_at'] else None
                    })

                return {"campaigns": result, "total": len(result)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/brands/{brand_id}/campaigns")
async def create_campaign(brand_id: int, campaign: CampaignCreate, current_user = Depends(get_current_user)):
    """
    Create a new campaign for a brand with upfront payment

    Payment Flow:
    1. Advertiser deposits campaign_budget upfront
    2. Money is transferred from advertiser balance to Astegni
    3. Campaign starts with campaign_budget = remaining_balance
    4. As impressions are delivered, money moves from remaining_balance to amount_used
    5. On cancellation, 5% fee charged on remaining_balance only
    """
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership
                cur.execute("""
                    SELECT id, brand_ids, user_id FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser or brand_id not in (advertiser.get('brand_ids') or []):
                    raise HTTPException(status_code=403, detail="You don't own this brand")

                # Validate campaign budget
                if not campaign.campaign_budget or campaign.campaign_budget <= 0:
                    raise HTTPException(status_code=400, detail="Campaign budget must be greater than 0")

                campaign_budget_amount = float(campaign.campaign_budget)

                # Get user's account balance (not advertiser balance)
                cur.execute("""
                    SELECT account_balance FROM users WHERE id = %s
                """, (advertiser['user_id'],))
                user = cur.fetchone()

                if not user:
                    raise HTTPException(status_code=404, detail="User not found")

                user_balance = float(user.get('account_balance', 0))

                # Check if user has sufficient balance
                if user_balance < campaign_budget_amount:
                    raise HTTPException(
                        status_code=402,
                        detail=f"Insufficient balance. Need {campaign_budget_amount:.2f} ETB, have {user_balance:.2f} ETB. Please deposit funds to your account."
                    )

                # Get brand info
                cur.execute("""
                    SELECT campaign_ids FROM brand_profile WHERE id = %s
                """, (brand_id,))
                brand = cur.fetchone()

                if not brand:
                    raise HTTPException(status_code=404, detail="Brand not found")

                current_campaign_ids = brand.get('campaign_ids') or []

                # Set default targeting arrays
                target_audiences = campaign.target_audiences or ['tutor', 'student', 'parent', 'advertiser', 'user']
                target_regions = campaign.target_regions or []
                target_placements = campaign.target_placements or ['leaderboard-banner', 'logo', 'in-session-skyscrapper-banner']

                # Create the campaign with finance fields
                # Note: verification_status must be 'pending', 'verified', 'rejected', or 'suspended'
                # Media files (thumbnail_url, file_url) are now stored in campaign_media table
                # Engagement metrics (impressions, conversions, etc) are in campaign_engagement table
                # Payment info (payment_status, paid_at) is in campaign_invoices table
                cur.execute("""
                    INSERT INTO campaign_profile (
                        name, description, objective,
                        target_location, start_date,
                        call_to_action, verification_status, is_verified,
                        target_audiences, target_regions, target_placements,
                        national_location, national_country_code, regional_country_code,
                        campaign_budget, amount_used, remaining_balance,
                        advertiser_id, brand_id,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        'pending', FALSE,
                        %s, %s, %s,
                        %s, %s, %s,
                        %s, 0.00, %s,
                        %s, %s,
                        NOW(), NOW()
                    )
                    RETURNING *
                """, (
                    campaign.name,
                    campaign.description,
                    campaign.objective,
                    campaign.target_location,
                    campaign.start_date,
                    campaign.call_to_action,
                    target_audiences,
                    target_regions,
                    target_placements,
                    campaign.national_location,
                    campaign.national_country_code,
                    campaign.regional_country_code,
                    campaign_budget_amount,
                    campaign_budget_amount,
                    advertiser_profile_id,
                    brand_id
                ))
                new_campaign = cur.fetchone()

                # Deduct from user's account balance and transfer to Astegni
                new_user_balance = user_balance - campaign_budget_amount
                cur.execute("""
                    UPDATE users
                    SET account_balance = %s
                    WHERE id = %s
                """, (new_user_balance, advertiser['user_id']))

                # Update advertiser total_spent tracking (but don't deduct from advertiser balance)
                cur.execute("""
                    UPDATE advertiser_profiles
                    SET total_spent = COALESCE(total_spent, 0) + %s,
                        last_transaction_at = NOW()
                    WHERE id = %s
                """, (campaign_budget_amount, advertiser_profile_id))

                # Record transaction (user account → Astegni transfer)
                cur.execute("""
                    INSERT INTO advertiser_transactions (
                        advertiser_id, campaign_id, brand_id, transaction_type,
                        amount, balance_before, balance_after, currency,
                        description, status, created_at
                    ) VALUES (
                        %s, %s, %s, 'campaign_payment',
                        %s, %s, %s, 'ETB',
                        %s, 'completed', NOW()
                    )
                    RETURNING id
                """, (
                    advertiser_profile_id,
                    new_campaign['id'],
                    brand_id,
                    campaign_budget_amount,
                    user_balance,
                    new_user_balance,
                    f"Campaign '{campaign.name}' created - Paid from user account - Budget: {campaign_budget_amount:.2f} ETB transferred to Astegni"
                ))
                transaction = cur.fetchone()

                # Update campaign with transaction ID
                cur.execute("""
                    UPDATE campaign_profile
                    SET payment_transaction_id = %s
                    WHERE id = %s
                """, (transaction['id'], new_campaign['id']))

                # Add campaign ID to brand's campaign_ids array
                new_campaign_ids = current_campaign_ids + [new_campaign['id']]
                cur.execute("""
                    UPDATE brand_profile
                    SET campaign_ids = %s, updated_at = NOW()
                    WHERE id = %s
                """, (new_campaign_ids, brand_id))

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign created and paid successfully",
                    "campaign": {
                        'id': new_campaign['id'],
                        'name': new_campaign['name'],
                        'description': new_campaign['description'],
                        'status': new_campaign['verification_status'],
                        'is_verified': new_campaign['is_verified'],
                        'campaign_budget': float(new_campaign['campaign_budget']),
                        'amount_used': float(new_campaign['amount_used']),
                        'remaining_balance': float(new_campaign['remaining_balance']),
                        'payment_status': new_campaign['payment_status'],
                        'created_at': str(new_campaign['created_at'])
                    },
                    "payment": {
                        'transaction_id': transaction['id'],
                        'amount_charged': campaign_budget_amount,
                        'user_balance_before': user_balance,
                        'user_balance_after': new_user_balance,
                        'payment_source': 'user_account',
                        'transferred_to': 'astegni'
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}")
async def get_campaign(campaign_id: int, current_user = Depends(get_current_user)):
    """Get a specific campaign"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get advertiser's brands using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser:
                    raise HTTPException(status_code=403, detail="Not authorized")

                brand_ids = advertiser.get('brand_ids') or []

                # Check if campaign belongs to one of the advertiser's brands
                cur.execute("""
                    SELECT bp.id FROM brand_profile bp
                    WHERE bp.id = ANY(%s) AND %s = ANY(bp.campaign_ids)
                """, (brand_ids, campaign_id))

                if not cur.fetchone():
                    raise HTTPException(status_code=403, detail="You don't own this campaign")

                # Get campaign
                cur.execute("""
                    SELECT * FROM campaign_profile WHERE id = %s
                """, (campaign_id,))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")

                return dict(campaign)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/campaigns/{campaign_id}")
async def update_campaign(campaign_id: int, campaign: CampaignUpdate, current_user = Depends(get_current_user)):
    """Update a campaign"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get advertiser's brands using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser:
                    raise HTTPException(status_code=403, detail="Not authorized")

                brand_ids = advertiser.get('brand_ids') or []

                # Check ownership
                cur.execute("""
                    SELECT bp.id FROM brand_profile bp
                    WHERE bp.id = ANY(%s) AND %s = ANY(bp.campaign_ids)
                """, (brand_ids, campaign_id))

                if not cur.fetchone():
                    raise HTTPException(status_code=403, detail="You don't own this campaign")

                # Build update query
                updates = []
                values = []

                if campaign.name is not None:
                    updates.append("name = %s")
                    values.append(campaign.name)
                if campaign.description is not None:
                    updates.append("description = %s")
                    values.append(campaign.description)
                if campaign.thumbnail_url is not None:
                    updates.append("thumbnail_url = %s")
                    values.append(campaign.thumbnail_url)
                if campaign.file_url is not None:
                    updates.append("file_url = %s")
                    values.append(campaign.file_url)
                if campaign.objective is not None:
                    updates.append("objective = %s")
                    values.append(campaign.objective)
                if campaign.target_audience is not None:
                    updates.append("target_audience = %s")
                    values.append(campaign.target_audience)
                if campaign.target_location is not None:
                    updates.append("target_location = %s")
                    values.append(campaign.target_location)
                if campaign.campaign_budget is not None:
                    updates.append("campaign_budget = %s")
                    values.append(campaign.campaign_budget)
                if campaign.start_date is not None:
                    updates.append("start_date = %s")
                    values.append(campaign.start_date)
                if campaign.call_to_action is not None:
                    updates.append("call_to_action = %s")
                    values.append(campaign.call_to_action)
                # New array targeting fields
                if campaign.target_audiences is not None:
                    updates.append("target_audiences = %s")
                    values.append(campaign.target_audiences)
                if campaign.target_regions is not None:
                    updates.append("target_regions = %s")
                    values.append(campaign.target_regions)
                if campaign.target_placements is not None:
                    updates.append("target_placements = %s")
                    values.append(campaign.target_placements)
                # Location-specific fields
                if campaign.national_location is not None:
                    updates.append("national_location = %s")
                    values.append(campaign.national_location)
                if campaign.national_country_code is not None:
                    updates.append("national_country_code = %s")
                    values.append(campaign.national_country_code)
                if campaign.regional_country_code is not None:
                    updates.append("regional_country_code = %s")
                    values.append(campaign.regional_country_code)

                if not updates:
                    raise HTTPException(status_code=400, detail="No fields to update")

                # Reset submit_for_verification to false on any edit
                updates.append("submit_for_verification = false")
                updates.append("updated_at = NOW()")
                values.append(campaign_id)

                cur.execute(f"""
                    UPDATE campaign_profile
                    SET {', '.join(updates)}
                    WHERE id = %s
                    RETURNING *
                """, values)
                updated_campaign = cur.fetchone()
                conn.commit()

                return {"message": "Campaign updated successfully", "campaign": dict(updated_campaign)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: int, current_user = Depends(get_current_user)):
    """Delete a campaign"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get advertiser's brands using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser:
                    raise HTTPException(status_code=403, detail="Not authorized")

                brand_ids = advertiser.get('brand_ids') or []

                # Find which brand owns this campaign
                cur.execute("""
                    SELECT bp.id, bp.campaign_ids FROM brand_profile bp
                    WHERE bp.id = ANY(%s) AND %s = ANY(bp.campaign_ids)
                """, (brand_ids, campaign_id))
                brand = cur.fetchone()

                if not brand:
                    raise HTTPException(status_code=403, detail="You don't own this campaign")

                # Remove campaign ID from brand's campaign_ids
                new_campaign_ids = [cid for cid in brand['campaign_ids'] if cid != campaign_id]
                cur.execute("""
                    UPDATE brand_profile
                    SET campaign_ids = %s, updated_at = NOW()
                    WHERE id = %s
                """, (new_campaign_ids, brand['id']))

                # Delete the campaign
                cur.execute("DELETE FROM campaign_profile WHERE id = %s", (campaign_id,))

                conn.commit()

                return {"message": "Campaign deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# STATS ENDPOINT
# ============================================================

@router.get("/stats")
async def get_advertiser_stats(current_user = Depends(get_current_user)):
    """Get stats for the current advertiser"""
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            return {
                "total_brands": 0,
                "total_campaigns": 0,
                "total_impressions": 0,
                "total_budget": 0,
                "active_campaigns": 0
            }

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get advertiser's brands using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser:
                    return {
                        "total_brands": 0,
                        "total_campaigns": 0,
                        "total_impressions": 0,
                        "total_budget": 0,
                        "active_campaigns": 0
                    }

                brand_ids = advertiser.get('brand_ids') or []

                if not brand_ids:
                    return {
                        "total_brands": 0,
                        "total_campaigns": 0,
                        "total_impressions": 0,
                        "total_budget": 0,
                        "active_campaigns": 0
                    }

                # Get brand stats
                cur.execute("""
                    SELECT
                        COUNT(*) as total_brands,
                        COALESCE(SUM(COALESCE(array_length(campaign_ids, 1), 0)), 0) as total_campaigns
                    FROM brand_profile
                    WHERE id = ANY(%s)
                """, (brand_ids,))
                brand_stats = cur.fetchone()

                # Get campaign stats
                cur.execute("""
                    SELECT
                        COALESCE(SUM(impressions), 0) as total_impressions,
                        COALESCE(SUM(campaign_budget), 0) as total_budget,
                        COUNT(*) FILTER (WHERE verification_status = 'verified') as active_campaigns
                    FROM campaign_profile
                    WHERE id IN (
                        SELECT unnest(campaign_ids) FROM brand_profile WHERE id = ANY(%s)
                    )
                """, (brand_ids,))
                campaign_stats = cur.fetchone()

                return {
                    "total_brands": brand_stats['total_brands'] if brand_stats else 0,
                    "total_campaigns": brand_stats['total_campaigns'] if brand_stats else 0,
                    "total_impressions": campaign_stats['total_impressions'] if campaign_stats else 0,
                    "total_budget": float(campaign_stats['total_budget']) if campaign_stats else 0,
                    "active_campaigns": campaign_stats['active_campaigns'] if campaign_stats else 0
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# CAMPAIGN VERIFICATION ENDPOINT
# ============================================================

@router.post("/campaigns/{campaign_id}/submit-for-verification")
async def submit_campaign_for_verification(campaign_id: int, current_user = Depends(get_current_user)):
    """
    Submit a campaign for admin verification.
    This marks the campaign as ready for review in the admin dashboard.
    """
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get advertiser's brands using profile_id
                cur.execute("""
                    SELECT brand_ids FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser:
                    raise HTTPException(status_code=403, detail="Not authorized")

                brand_ids = advertiser.get('brand_ids') or []

                # Check if campaign belongs to one of the advertiser's brands
                cur.execute("""
                    SELECT bp.id FROM brand_profile bp
                    WHERE bp.id = ANY(%s) AND %s = ANY(bp.campaign_ids)
                """, (brand_ids, campaign_id))

                if not cur.fetchone():
                    raise HTTPException(status_code=403, detail="You don't own this campaign")

                # Check if campaign is already verified
                cur.execute("""
                    SELECT is_verified, verification_status, submit_for_verification
                    FROM campaign_profile
                    WHERE id = %s
                """, (campaign_id,))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")

                # If already verified, don't allow resubmission
                if campaign['is_verified']:
                    raise HTTPException(
                        status_code=400,
                        detail="Campaign is already verified"
                    )

                # If already submitted for verification
                if campaign['submit_for_verification']:
                    raise HTTPException(
                        status_code=400,
                        detail="Campaign is already submitted for verification"
                    )

                # Mark campaign as submitted for verification
                cur.execute("""
                    UPDATE campaign_profile
                    SET submit_for_verification = true,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING id, name, submit_for_verification, verification_status
                """, (campaign_id,))
                updated_campaign = cur.fetchone()

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign submitted for verification successfully",
                    "campaign": {
                        "id": updated_campaign['id'],
                        "name": updated_campaign['name'],
                        "submit_for_verification": updated_campaign['submit_for_verification'],
                        "verification_status": updated_campaign['verification_status']
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
