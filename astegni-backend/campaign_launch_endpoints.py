"""
Campaign Launch & Ad Serving Endpoints

Handles:
- Campaign launch (activate campaigns)
- Campaign pause/resume
- Ad serving by placement type
- Campaign status management

Author: Astegni Platform
Date: 2026-02-13
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

router = APIRouter(prefix="/api/campaigns", tags=["Campaign Launch"])


class PauseRequest(BaseModel):
    reason: Optional[str] = None


def get_db():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)


# ============================================================================
# CAMPAIGN LAUNCH & STATUS MANAGEMENT
# ============================================================================

@router.post("/{campaign_id}/launch")
async def launch_campaign(campaign_id: int):
    """
    Launch a campaign (set status to 'active')

    Requirements:
    - Campaign must be in 'approved' status
    - Campaign must have media uploaded for at least one placement
    - Advertiser must have sufficient balance

    Returns:
        - success: bool
        - campaign_id: int
        - status: str (now 'active')
        - launched_at: datetime
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get campaign details
        cursor.execute("""
            SELECT
                id,
                name,
                verification_status,
                advertiser_id,
                brand_id,
                cpi_rate,
                campaign_budget,
                deposit_percent,
                deposit_amount
            FROM campaign_profile
            WHERE id = %s
        """, (campaign_id,))

        campaign = cursor.fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign_id = campaign[0]
        campaign_name = campaign[1]
        verification_status = campaign[2]
        advertiser_id = campaign[3]
        brand_id = campaign[4]
        cpi_rate = float(campaign[5]) if campaign[5] else 0.10
        campaign_budget = float(campaign[6]) if campaign[6] else 0
        deposit_percent = float(campaign[7]) if campaign[7] else 20.0
        deposit_amount = float(campaign[8]) if campaign[8] else 0

        # Get advertiser's currency from their profile
        cursor.execute("""
            SELECT currency FROM advertiser_profiles
            WHERE id = %s
        """, (advertiser_id,))

        advertiser_data = cursor.fetchone()
        currency = advertiser_data[0] if advertiser_data and advertiser_data[0] else 'ETB'

        # Check campaign operational status
        cursor.execute("""
            SELECT campaign_status FROM campaign_profile
            WHERE id = %s
        """, (campaign_id,))

        status_row = cursor.fetchone()
        campaign_status = status_row[0] if status_row and status_row[0] else 'draft'

        if campaign_status == 'active':
            return {
                "success": False,
                "message": "Campaign is already active"
            }

        # Validate verification status (must be approved by admin)
        if verification_status not in ['verified', 'approved']:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot launch campaign. Admin verification status is '{verification_status}'. Must be 'verified' or 'approved' first."
            )

        # Check if campaign has media uploaded
        cursor.execute("""
            SELECT COUNT(*) FROM campaign_media
            WHERE campaign_id = %s
        """, (campaign_id,))

        media_count = cursor.fetchone()[0]

        if media_count == 0:
            raise HTTPException(
                status_code=400,
                detail="Campaign must have at least one media file uploaded before launching"
            )

        # Check advertiser balance and process advance payment if deposit is configured
        advance_payment = 0
        if deposit_amount > 0 or deposit_percent > 0:
            cursor.execute("""
                SELECT balance FROM advertiser_profiles
                WHERE id = %s
            """, (advertiser_id,))

            balance_row = cursor.fetchone()
            if not balance_row:
                raise HTTPException(status_code=404, detail="Advertiser not found")

            advertiser_balance = float(balance_row[0]) if balance_row[0] else 0

            # Calculate advance payment (use deposit_amount if set, otherwise calculate from percent)
            if deposit_amount > 0:
                advance_payment = deposit_amount
            else:
                advance_payment = campaign_budget * (deposit_percent / 100)

            if advertiser_balance < advance_payment:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient balance. Need {advance_payment:.2f} {currency} for {deposit_percent:.0f}% advance payment. Current balance: {advertiser_balance:.2f} {currency}"
                )

            # Deduct advance payment
            cursor.execute("""
                UPDATE advertiser_profiles
                SET
                    balance = balance - %s,
                    total_spent = total_spent + %s,
                    last_transaction_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (advance_payment, advance_payment, advertiser_id))

            # Record transaction
            cursor.execute("""
                INSERT INTO advertiser_transactions (
                    advertiser_id,
                    campaign_id,
                    transaction_type,
                    amount,
                    balance_before,
                    balance_after,
                    description,
                    status
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                advertiser_id,
                campaign_id,
                'campaign_launch',
                advance_payment,
                advertiser_balance,
                advertiser_balance - advance_payment,
                f"{deposit_percent:.0f}% advance payment for campaign '{campaign_name}' launch",
                'completed'
            ))

        # Update campaign to active
        cursor.execute("""
            UPDATE campaign_profile
            SET
                campaign_status = 'active',
                launched_at = CASE WHEN launched_at IS NULL THEN CURRENT_TIMESTAMP ELSE launched_at END,
                pause_reason = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING launched_at
        """, (campaign_id,))

        launched_at = cursor.fetchone()[0]

        conn.commit()

        return {
            "success": True,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "status": "active",
            "launched_at": launched_at.isoformat() if launched_at else None,
            "advance_payment": advance_payment,
            "currency": currency,
            "message": f"Campaign '{campaign_name}' launched successfully!" + (f" Advance payment of {advance_payment:.2f} {currency} charged." if advance_payment > 0 else "")
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error launching campaign: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/{campaign_id}/pause")
async def pause_campaign(campaign_id: int, request: PauseRequest = Body(default=PauseRequest())):
    """
    Pause an active campaign

    Args:
        campaign_id: Campaign ID
        request: Request body with optional reason

    Returns:
        Success status and updated campaign info
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Update campaign to paused
        cursor.execute("""
            UPDATE campaign_profile
            SET
                campaign_status = 'paused',
                pause_reason = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND campaign_status = 'active'
            RETURNING name
        """, (request.reason or 'paused_by_advertiser', campaign_id))

        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Campaign not found or not active"
            )

        campaign_name = result[0]

        conn.commit()

        return {
            "success": True,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "status": "paused",
            "message": f"Campaign '{campaign_name}' paused successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error pausing campaign: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/{campaign_id}/resume")
async def resume_campaign(campaign_id: int):
    """
    Resume a paused campaign

    Args:
        campaign_id: Campaign ID

    Returns:
        Success status and updated campaign info
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Update campaign to active
        cursor.execute("""
            UPDATE campaign_profile
            SET
                campaign_status = 'active',
                pause_reason = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND campaign_status = 'paused'
            RETURNING name
        """, (campaign_id,))

        result = cursor.fetchone()

        if not result:
            raise HTTPException(
                status_code=404,
                detail="Campaign not found or not paused"
            )

        campaign_name = result[0]

        conn.commit()

        return {
            "success": True,
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "status": "active",
            "message": f"Campaign '{campaign_name}' resumed successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error resuming campaign: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


# ============================================================================
# AD SERVING ENDPOINTS
# ============================================================================

@router.get("/ads/placement/{placement_type}")
async def get_ads_by_placement(
    placement_type: str,
    limit: int = 5,
    profile_type: Optional[str] = None,
    page_location: Optional[str] = None,  # Page name (home, tutor_profile, etc.)
    audience: Optional[str] = None,
    user_country: Optional[str] = None     # User's country code for geographic targeting
):
    """
    Get active campaign ads for a specific placement type

    Placement types:
    - leaderboard_banner: Top banner on pages
    - logo: Profile page logos
    - in_session_skyscraper: Whiteboard skyscraper

    Parameters:
    - placement_type: Where to show the ad (leaderboard_banner, logo, etc.)
    - page_location: Which page is requesting (home, tutor_profile, find_tutors, etc.)
    - user_country: User's country code for geographic targeting (ET, US, etc.)
    - profile_type: User's profile type (tutor, student, parent, etc.)
    - audience: Target audience filter

    Returns:
        List of active campaign media for the placement
    """
    # NORMALIZE PLACEMENT: Replace dashes with underscores for consistency
    # This handles both 'leaderboard-banner' and 'leaderboard_banner' formats
    normalized_placement = placement_type.replace('-', '_')

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Build query based on placement type
        query = """
            SELECT
                cp.id as campaign_id,
                cp.name as campaign_name,
                cp.advertiser_id,
                cp.brand_id,
                cm.id as media_id,
                cm.file_url,
                cm.content_type as file_type,
                cm.media_type,
                0 as duration,
                cp.target_location,
                cp.target_audiences,
                cp.target_regions,
                cp.cpi_rate
            FROM campaign_profile cp
            INNER JOIN campaign_media cm ON cp.id = cm.campaign_id
            WHERE cp.campaign_status = 'active'
              AND cp.verification_status IN ('verified', 'approved')
              AND cm.placement = %s
        """

        params = [normalized_placement]  # Use normalized placement

        # GEOGRAPHIC FILTERING (based on campaign's target_location)
        # target_location values: 'global', 'national', 'regional'
        if user_country:
            # Show ads that match user's geography
            query += """ AND (
                cp.target_location = 'global'  -- Global campaigns show everywhere
                OR cp.target_location IS NULL  -- NULL = show everywhere (legacy)
                OR (cp.target_location = 'national' AND cp.national_country_code = %s)
                OR (cp.target_location = 'regional' AND %s = ANY(cp.target_regions))
            )"""
            params.extend([user_country, user_country])
        else:
            # If user country unknown, only show global campaigns
            query += " AND (cp.target_location = 'global' OR cp.target_location IS NULL)"

        # PAGE FILTERING (based on campaign's target_pages array)
        # target_pages: Array of page names ['home', 'tutor_profile', etc.]
        # If NULL or empty array, show on all pages
        if page_location:
            query += """ AND (
                cp.target_pages IS NULL           -- NULL = show on all pages
                OR array_length(cp.target_pages, 1) IS NULL  -- Empty array = show on all pages
                OR %s = ANY(cp.target_pages)      -- Page is in target list
            )"""
            params.append(page_location)

        query += " ORDER BY RANDOM() LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)

        rows = cursor.fetchall()

        ads = []
        for row in rows:
            ads.append({
                "campaign_id": row[0],
                "campaign_name": row[1],
                "advertiser_id": row[2],
                "brand_id": row[3],
                "media_id": row[4],
                "file_url": row[5],
                "file_type": row[6],
                "media_type": row[7],
                "duration": row[8],
                "target_location": row[9],
                "target_audiences": row[10],
                "target_regions": row[11],
                "cpi_rate": float(row[12]) if row[12] else 0.10,
                "placement_type": placement_type
            })

        return {
            "success": True,
            "placement_type": placement_type,
            "count": len(ads),
            "ads": ads
        }

    except Exception as e:
        print(f"Error fetching ads: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()
