"""
Campaign Impression Tracking & CPM Billing Endpoints
Real-time impression tracking with automatic CPM billing

Key Features:
- Track impressions, clicks, conversions in real-time
- Automatic CPM billing every 1,000 impressions
- Campaign analytics and reporting
- Fraud detection (unique impressions, viewability)
- Automatic campaign pause on low balance

Author: Astegni Platform
Date: 2026-01-02
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime
import hashlib

# Import balance deduction function
from advertiser_balance_endpoints import deduct_from_balance, check_and_pause_campaign

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

router = APIRouter(prefix="/api/campaign", tags=["Campaign Impressions"])

# Pydantic models
class ImpressionTrack(BaseModel):
    campaign_id: int
    user_id: Optional[int] = None
    profile_id: Optional[int] = None
    profile_type: Optional[str] = None
    placement: str  # "placeholder", "widget", "popup", "insession"
    location: Optional[str] = None
    audience: Optional[str] = None
    region: Optional[str] = None
    device_type: Optional[str] = None


def get_db():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)


# ============================================
# IMPRESSION TRACKING ENDPOINTS
# ============================================

@router.post("/track-impression")
async def track_impression(request: Request, impression: ImpressionTrack):
    """
    Track a campaign impression and handle CPM billing.

    Flow:
    1. Log impression to campaign_impressions table
    2. Increment campaign impressions_delivered counter
    3. Check if billing threshold reached (every 1,000 impressions)
    4. If threshold reached:
       - Calculate charge (1,000 × CPI rate)
       - Deduct from advertiser balance
       - Update impressions_charged counter
       - Check if balance too low, pause campaign if needed
    5. Return success

    Args:
        impression: Impression tracking data

    Returns:
        Success status and billing info
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
                cpi_rate,
                impressions_delivered,
                impressions_charged,
                billing_frequency,
                verification_status,
                advertiser_id,
                brand_id
            FROM campaign_profile
            WHERE id = %s
        """, (impression.campaign_id,))

        campaign = cursor.fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign_id = campaign[0]
        campaign_name = campaign[1]
        cpi_rate = float(campaign[2]) if campaign[2] else 0.10
        impressions_delivered = campaign[3] if campaign[3] else 0
        impressions_charged = campaign[4] if campaign[4] else 0
        billing_frequency = campaign[5] if campaign[5] else 1000
        campaign_status = campaign[6]
        advertiser_id = campaign[7]
        brand_id = campaign[8]

        # Check if campaign is active
        if campaign_status != 'active':
            return {
                "success": False,
                "message": f"Campaign is {campaign_status}, impression not tracked"
            }

        # Check advertiser ID exists
        if not advertiser_id:
            raise HTTPException(status_code=400, detail="Campaign has no advertiser ID assigned")

        # Get client IP and user agent
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")

        # Generate session ID for unique impression tracking
        session_data = f"{impression.user_id}_{client_ip}_{user_agent}"
        session_id = hashlib.md5(session_data.encode()).hexdigest()

        # Check if this is a unique impression (within last 24 hours)
        cursor.execute("""
            SELECT id FROM campaign_impressions
            WHERE campaign_id = %s
              AND session_id = %s
              AND created_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
        """, (campaign_id, session_id))

        existing_impression = cursor.fetchone()
        is_unique = existing_impression is None

        # Log impression
        cursor.execute("""
            INSERT INTO campaign_impressions (
                campaign_id,
                user_id,
                profile_id,
                profile_type,
                placement,
                location,
                audience,
                region,
                device_type,
                ip_address,
                user_agent,
                session_id,
                is_unique_impression,
                cpi_rate
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            campaign_id,
            impression.user_id,
            impression.profile_id,
            impression.profile_type,
            impression.placement,
            impression.location,
            impression.audience,
            impression.region,
            impression.device_type,
            client_ip,
            user_agent,
            session_id,
            is_unique,
            cpi_rate
        ))

        impression_id = cursor.fetchone()[0]

        # Increment impressions_delivered counter
        new_impressions_delivered = impressions_delivered + 1

        cursor.execute("""
            UPDATE campaign_profile
            SET impressions_delivered = %s
            WHERE id = %s
        """, (new_impressions_delivered, campaign_id))

        # Check if billing threshold reached
        impressions_since_last_billing = new_impressions_delivered - impressions_charged
        billing_triggered = False
        transaction_id = None

        if impressions_since_last_billing >= billing_frequency:
            # Calculate charge for billing_frequency impressions
            charge_amount = billing_frequency * cpi_rate

            # Deduct from balance
            transaction_id = deduct_from_balance(
                advertiser_id=advertiser_id,
                campaign_id=campaign_id,
                amount=charge_amount,
                impressions_count=billing_frequency,
                description=f"Charged for {billing_frequency} impressions at {cpi_rate} ETB/impression",
                conn=conn
            )

            if transaction_id:
                # Update impressions_charged and total_charged
                new_impressions_charged = impressions_charged + billing_frequency

                cursor.execute("""
                    SELECT total_charged FROM campaign_profile WHERE id = %s
                """, (campaign_id,))

                total_charged = cursor.fetchone()[0]
                total_charged = float(total_charged) if total_charged else 0.00
                new_total_charged = total_charged + charge_amount

                cursor.execute("""
                    UPDATE campaign_profile
                    SET
                        impressions_charged = %s,
                        total_charged = %s,
                        last_billing_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (new_impressions_charged, new_total_charged, campaign_id))

                # Mark impressions as charged
                cursor.execute("""
                    UPDATE campaign_impressions
                    SET
                        charged = TRUE,
                        charged_at = CURRENT_TIMESTAMP
                    WHERE campaign_id = %s
                      AND charged = FALSE
                    LIMIT %s
                """, (campaign_id, billing_frequency))

                billing_triggered = True

                # Check if campaign should be paused due to low balance
                check_and_pause_campaign(campaign_id, advertiser_id, conn)

            else:
                # Insufficient balance - pause campaign
                cursor.execute("""
                    UPDATE campaign_profile
                    SET
                        verification_status = 'paused',
                        pause_reason = 'insufficient_balance',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (campaign_id,))

        conn.commit()

        return {
            "success": True,
            "impression_id": impression_id,
            "is_unique": is_unique,
            "impressions_delivered": new_impressions_delivered,
            "impressions_charged": impressions_charged + (billing_frequency if billing_triggered else 0),
            "billing_triggered": billing_triggered,
            "charge_amount": billing_frequency * cpi_rate if billing_triggered else 0,
            "transaction_id": transaction_id
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error tracking impression: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/track-click")
async def track_click(campaign_id: int, impression_id: int):
    """
    Track a click on a campaign impression.

    Args:
        campaign_id: Campaign ID
        impression_id: Impression ID from track_impression response

    Returns:
        Success status
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Update impression with click
        cursor.execute("""
            UPDATE campaign_impressions
            SET
                clicked = TRUE,
                clicked_at = CURRENT_TIMESTAMP
            WHERE id = %s AND campaign_id = %s
        """, (impression_id, campaign_id))

        # Increment campaign clicks counter
        cursor.execute("""
            UPDATE campaign_profile
            SET impressions = COALESCE(impressions, 0) + 1
            WHERE id = %s
        """, (campaign_id,))

        conn.commit()

        return {
            "success": True,
            "message": "Click tracked successfully"
        }

    except Exception as e:
        print(f"Error tracking click: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.get("/analytics/{campaign_id}")
async def get_campaign_analytics(campaign_id: int):
    """
    Get comprehensive analytics for a campaign.

    Returns:
        - Impressions delivered vs charged
        - Total cost
        - Click-through rate
        - Unique impressions
        - Breakdown by placement, location, audience
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get campaign summary
        cursor.execute("""
            SELECT
                name,
                impressions_delivered,
                impressions_charged,
                cpi_rate,
                total_charged,
                verification_status,
                launched_at,
                ended_at
            FROM campaign_profile
            WHERE id = %s
        """, (campaign_id,))

        campaign = cursor.fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        # Get impression analytics
        cursor.execute("""
            SELECT
                COUNT(*) as total_impressions,
                COUNT(*) FILTER (WHERE is_unique_impression = TRUE) as unique_impressions,
                COUNT(*) FILTER (WHERE clicked = TRUE) as total_clicks,
                COUNT(*) FILTER (WHERE converted = TRUE) as total_conversions,
                COUNT(*) FILTER (WHERE charged = TRUE) as charged_impressions
            FROM campaign_impressions
            WHERE campaign_id = %s
        """, (campaign_id,))

        analytics = cursor.fetchone()

        # Get breakdown by placement
        cursor.execute("""
            SELECT
                placement,
                COUNT(*) as impressions,
                COUNT(*) FILTER (WHERE clicked = TRUE) as clicks
            FROM campaign_impressions
            WHERE campaign_id = %s
            GROUP BY placement
        """, (campaign_id,))

        placements = cursor.fetchall()

        # Calculate metrics
        total_impressions = analytics[0] or 0
        total_clicks = analytics[2] or 0
        ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

        return {
            "success": True,
            "campaign": {
                "id": campaign_id,
                "name": campaign[0],
                "status": campaign[5],
                "launched_at": campaign[6].isoformat() if campaign[6] else None,
                "ended_at": campaign[7].isoformat() if campaign[7] else None
            },
            "impressions": {
                "delivered": campaign[1] or 0,
                "charged": campaign[2] or 0,
                "uncharged": (campaign[1] or 0) - (campaign[2] or 0),
                "unique": analytics[1] or 0
            },
            "billing": {
                "cpi_rate": float(campaign[3]) if campaign[3] else 0,
                "total_charged": float(campaign[4]) if campaign[4] else 0,
                "pending_charge": ((campaign[1] or 0) - (campaign[2] or 0)) * (float(campaign[3]) if campaign[3] else 0)
            },
            "engagement": {
                "clicks": total_clicks,
                "conversions": analytics[3] or 0,
                "ctr": round(ctr, 2)
            },
            "placements": [
                {
                    "placement": row[0],
                    "impressions": row[1],
                    "clicks": row[2],
                    "ctr": round((row[2] / row[1] * 100) if row[1] > 0 else 0, 2)
                }
                for row in placements
            ]
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()


@router.post("/cancel/{campaign_id}")
async def cancel_campaign(campaign_id: int):
    """
    Cancel a campaign and apply cancellation fee.

    Flow:
    1. Get campaign details and impression counts
    2. Calculate final charge for uncharged impressions
    3. Calculate cancellation fee (5% of remaining balance)
    4. Deduct final charge + cancellation fee
    5. Update campaign status to 'cancelled'
    6. Return refund summary

    Returns:
        - Impressions delivered
        - Final charge for uncharged impressions
        - Cancellation fee
        - Total deducted
        - Remaining balance (refund)
    """
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()

        # Get campaign details
        cursor.execute("""
            SELECT
                name,
                impressions_delivered,
                impressions_charged,
                cpi_rate,
                total_charged,
                advertiser_id,
                cancellation_fee_percent
            FROM campaign_profile
            WHERE id = %s
        """, (campaign_id,))

        campaign = cursor.fetchone()

        if not campaign:
            raise HTTPException(status_code=404, detail="Campaign not found")

        campaign_name = campaign[0]
        impressions_delivered = campaign[1] or 0
        impressions_charged = campaign[2] or 0
        cpi_rate = float(campaign[3]) if campaign[3] else 0.10
        total_charged = float(campaign[4]) if campaign[4] else 0.00
        advertiser_id = campaign[5]
        cancellation_fee_percent = float(campaign[6]) if campaign[6] else 5.00

        # Calculate uncharged impressions
        impressions_uncharged = impressions_delivered - impressions_charged

        # Calculate final charge for uncharged impressions
        final_impression_charge = impressions_uncharged * cpi_rate

        # Get advertiser balance
        cursor.execute("""
            SELECT balance FROM advertiser_profiles WHERE id = %s
        """, (advertiser_id,))

        balance_row = cursor.fetchone()
        if not balance_row:
            raise HTTPException(status_code=404, detail="Advertiser not found")

        current_balance = float(balance_row[0]) if balance_row[0] else 0.00

        # Calculate cancellation fee (5% of remaining balance after final charge)
        remaining_after_impression_charge = current_balance - final_impression_charge
        cancellation_fee = remaining_after_impression_charge * (cancellation_fee_percent / 100)

        # Total deduction
        total_deduction = final_impression_charge + cancellation_fee
        final_balance = current_balance - total_deduction

        # Deduct final impression charge
        if final_impression_charge > 0:
            transaction_id = deduct_from_balance(
                advertiser_id=advertiser_id,
                campaign_id=campaign_id,
                amount=final_impression_charge,
                impressions_count=impressions_uncharged,
                description=f"Final charge for {impressions_uncharged} uncharged impressions at {cpi_rate} ETB/impression",
                conn=conn
            )

        # Deduct cancellation fee
        if cancellation_fee > 0:
            cursor.execute("""
                UPDATE advertiser_profiles
                SET
                    balance = balance - %s,
                    total_spent = total_spent + %s,
                    last_transaction_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (cancellation_fee, cancellation_fee, advertiser_id))

            # Record cancellation fee transaction
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
                'cancellation_fee',
                cancellation_fee,
                current_balance - final_impression_charge,
                final_balance,
                f"Cancellation fee ({cancellation_fee_percent}%) for campaign '{campaign_name}'",
                'completed'
            ))

        # Update campaign status
        cursor.execute("""
            UPDATE campaign_profile
            SET
                verification_status = 'cancelled',
                ended_at = CURRENT_TIMESTAMP,
                pause_reason = 'cancelled_by_advertiser',
                total_charged = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (total_charged + total_deduction, campaign_id))

        conn.commit()

        return {
            "success": True,
            "campaign_name": campaign_name,
            "impressions_delivered": impressions_delivered,
            "impressions_charged": impressions_charged,
            "impressions_uncharged": impressions_uncharged,
            "final_impression_charge": round(final_impression_charge, 2),
            "cancellation_fee_percent": cancellation_fee_percent,
            "cancellation_fee": round(cancellation_fee, 2),
            "total_deducted": round(total_deduction, 2),
            "remaining_balance": round(final_balance, 2),
            "message": f"Campaign cancelled. Total deducted: {round(total_deduction, 2)} ETB. Remaining balance: {round(final_balance, 2)} ETB."
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error cancelling campaign: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            cursor.close()
            conn.close()
