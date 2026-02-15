"""
Enhanced Campaign Cancellation Endpoints
Features:
1. Tiered cancellation fees (reduces over time based on campaign count)
2. Pause option (no fee, money stays locked)
3. Transparent cancellation calculator
4. Grace period (24 hours = 0% fee)

Cancellation Fee Tiers:
- First campaign: 5% fee
- After 5 campaigns: 3% fee
- After 20 campaigns: 1% fee
- Premium advertisers (100K+ ETB spent): 0% fee

Grace Period:
- Cancel within 24 hours of creation: 0% fee
- Cancel after 24 hours: Apply tiered fee
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
from utils import get_current_user
from datetime import datetime, timedelta

load_dotenv()

router = APIRouter(prefix="/api/campaign", tags=["Campaign Cancellation Enhanced"])

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def get_db():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


class CampaignCancellationRequest(BaseModel):
    reason: Optional[str] = None


class CampaignPauseRequest(BaseModel):
    reason: Optional[str] = None


def calculate_cancellation_fee_tier(advertiser_id: int, cur) -> float:
    """
    Calculate cancellation fee percentage based on advertiser's campaign history

    Tiers:
    - First campaign: 5%
    - After 5 campaigns: 3%
    - After 20 campaigns: 1%
    - Premium (100K+ ETB spent): 0%
    """
    # Get advertiser's total campaigns and total spent
    cur.execute("""
        SELECT
            COUNT(c.id) as total_campaigns,
            COALESCE(a.total_spent, 0) as total_spent
        FROM advertiser_profiles a
        LEFT JOIN campaign_profile c ON c.advertiser_id = a.id
        WHERE a.id = %s
        GROUP BY a.id, a.total_spent
    """, (advertiser_id,))

    result = cur.fetchone()

    if not result:
        return 5.0  # Default for new advertisers

    total_campaigns = result['total_campaigns'] or 0
    total_spent = float(result['total_spent'] or 0)

    # Premium tier: 100K+ ETB spent = 0% fee
    if total_spent >= 100000:
        return 0.0

    # After 20 campaigns: 1% fee
    if total_campaigns >= 20:
        return 1.0

    # After 5 campaigns: 3% fee
    if total_campaigns >= 5:
        return 3.0

    # First campaigns: 5% fee
    return 5.0


def is_within_grace_period(campaign_created_at) -> bool:
    """
    Check if campaign is within 24-hour grace period
    Returns True if within 24 hours of creation
    """
    if not campaign_created_at:
        return False

    # Convert to datetime if it's a string
    if isinstance(campaign_created_at, str):
        campaign_created_at = datetime.fromisoformat(campaign_created_at.replace('Z', '+00:00'))

    grace_period_end = campaign_created_at + timedelta(hours=24)
    return datetime.utcnow() < grace_period_end


@router.get("/cancellation-calculator/{campaign_id}")
async def get_cancellation_calculator(campaign_id: int, current_user = Depends(get_current_user)):
    """
    Transparent cancellation calculator
    Shows exactly what advertiser will get if they cancel now

    Returns:
    - Current campaign finances
    - Tiered cancellation fee (based on history)
    - Grace period status
    - Refund breakdown
    """
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign details
                cur.execute("""
                    SELECT
                        id, name, campaign_budget, amount_used, remaining_balance,
                        verification_status, created_at, advertiser_id, campaign_status
                    FROM campaign_profile
                    WHERE id = %s AND advertiser_id = %s
                """, (campaign_id, advertiser_profile_id))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found or you don't own it")

                if campaign['campaign_status'] == 'cancelled':
                    raise HTTPException(status_code=400, detail="Campaign already cancelled")

                # Calculate values
                campaign_budget = float(campaign['campaign_budget'] or 0)
                amount_used = float(campaign['amount_used'] or 0)
                remaining_balance = float(campaign['remaining_balance'] or 0)

                # Check grace period
                within_grace_period = is_within_grace_period(campaign['created_at'])

                # Calculate tiered cancellation fee
                base_fee_percent = calculate_cancellation_fee_tier(advertiser_profile_id, cur)

                # Apply grace period (0% fee if within 24 hours)
                final_fee_percent = 0.0 if within_grace_period else base_fee_percent

                cancellation_fee = remaining_balance * (final_fee_percent / 100)
                refund_amount = remaining_balance - cancellation_fee

                # Calculate hours remaining in grace period
                hours_since_creation = 0
                grace_period_remaining = 0
                if campaign['created_at']:
                    created_at = campaign['created_at']
                    if isinstance(created_at, str):
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    time_diff = datetime.utcnow() - created_at
                    hours_since_creation = time_diff.total_seconds() / 3600
                    grace_period_remaining = max(0, 24 - hours_since_creation)

                return {
                    "success": True,
                    "campaign": {
                        "id": campaign['id'],
                        "name": campaign['name'],
                        "status": campaign['verification_status'],
                        "created_at": str(campaign['created_at'])
                    },
                    "finances": {
                        "campaign_budget": campaign_budget,
                        "amount_used": amount_used,
                        "amount_used_percent": (amount_used / campaign_budget * 100) if campaign_budget > 0 else 0,
                        "remaining_balance": remaining_balance,
                        "remaining_balance_percent": (remaining_balance / campaign_budget * 100) if campaign_budget > 0 else 0
                    },
                    "cancellation": {
                        "within_grace_period": within_grace_period,
                        "grace_period_remaining_hours": round(grace_period_remaining, 1),
                        "base_fee_percent": base_fee_percent,
                        "final_fee_percent": final_fee_percent,
                        "fee_amount": cancellation_fee,
                        "refund_amount": refund_amount,
                        "fee_tier_reason": _get_fee_tier_reason(base_fee_percent),
                        "grace_period_note": "Cancel within 24 hours for 0% fee!" if within_grace_period else None
                    },
                    "breakdown": {
                        "total_budget": campaign_budget,
                        "non_refundable_used": amount_used,
                        "remaining": remaining_balance,
                        "cancellation_fee": cancellation_fee,
                        "you_will_receive": refund_amount
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _get_fee_tier_reason(fee_percent: float) -> str:
    """Get human-readable reason for fee tier"""
    if fee_percent == 0.0:
        return "Premium advertiser (100K+ ETB spent) - 0% fee"
    elif fee_percent == 1.0:
        return "Experienced advertiser (20+ campaigns) - 1% fee"
    elif fee_percent == 3.0:
        return "Regular advertiser (5+ campaigns) - 3% fee"
    else:
        return "New advertiser - 5% fee"


@router.post("/pause/{campaign_id}")
async def pause_campaign(campaign_id: int, request: CampaignPauseRequest, current_user = Depends(get_current_user)):
    """
    Pause a campaign with NO FEE

    Pause vs Cancel:
    - Pause: No fee, money stays locked, can resume anytime
    - Cancel: Fee applies (tiered), money refunded minus fee

    When paused:
    - Impressions stop delivering
    - Budget remains locked in campaign
    - Can resume campaign later
    - No refund until full cancellation
    """
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign details
                cur.execute("""
                    SELECT
                        c.*,
                        a.balance as advertiser_balance
                    FROM campaign_profile c
                    JOIN advertiser_profiles a ON c.advertiser_id = a.id
                    WHERE c.id = %s AND c.advertiser_id = %s
                """, (campaign_id, advertiser_profile_id))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found or you don't own it")

                # Check if already paused or cancelled
                if campaign['verification_status'] == 'paused':
                    raise HTTPException(status_code=400, detail="Campaign already paused")

                if campaign['campaign_status'] == 'cancelled':
                    raise HTTPException(status_code=400, detail="Campaign already cancelled")

                # Pause campaign (no financial transactions)
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'paused',
                        pause_reason = %s,
                        paused_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    request.reason or 'Paused by advertiser',
                    campaign_id
                ))

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign paused successfully (no fee charged)",
                    "campaign": {
                        "id": campaign_id,
                        "name": campaign['name'],
                        "status": "paused",
                        "paused_at": datetime.utcnow().isoformat()
                    },
                    "finances": {
                        "campaign_budget": float(campaign['campaign_budget'] or 0),
                        "amount_used": float(campaign['amount_used'] or 0),
                        "remaining_balance": float(campaign['remaining_balance'] or 0),
                        "note": "Money remains locked in campaign. Resume anytime or cancel to get refund (minus fee)."
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/resume/{campaign_id}")
async def resume_campaign(campaign_id: int, current_user = Depends(get_current_user)):
    """
    Resume a paused campaign

    Requirements:
    - Campaign must be in 'paused' status
    - Advertiser must own the campaign

    Effect:
    - Campaign status → 'active'
    - Impressions start delivering again
    """
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign details
                cur.execute("""
                    SELECT * FROM campaign_profile
                    WHERE id = %s AND advertiser_id = %s
                """, (campaign_id, advertiser_profile_id))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found or you don't own it")

                if campaign['verification_status'] != 'paused':
                    raise HTTPException(status_code=400, detail="Campaign is not paused")

                # Resume campaign
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'active',
                        pause_reason = NULL,
                        paused_at = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                """, (campaign_id,))

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign resumed successfully",
                    "campaign": {
                        "id": campaign_id,
                        "name": campaign['name'],
                        "status": "active",
                        "resumed_at": datetime.utcnow().isoformat()
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel-enhanced/{campaign_id}")
async def cancel_campaign_enhanced(campaign_id: int, request: CampaignCancellationRequest, current_user = Depends(get_current_user)):
    """
    Enhanced campaign cancellation with:
    1. Tiered fees (5% → 3% → 1% → 0%)
    2. Grace period (24 hours = 0% fee)
    3. Transparent calculation

    Fee Tiers:
    - First campaign: 5%
    - After 5 campaigns: 3%
    - After 20 campaigns: 1%
    - Premium (100K+ ETB spent): 0%

    Grace Period:
    - Cancel within 24 hours: 0% fee
    - Cancel after 24 hours: Apply tiered fee
    """
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign details
                cur.execute("""
                    SELECT
                        c.*,
                        a.balance as advertiser_balance,
                        a.user_id
                    FROM campaign_profile c
                    JOIN advertiser_profiles a ON c.advertiser_id = a.id
                    WHERE c.id = %s AND c.advertiser_id = %s
                """, (campaign_id, advertiser_profile_id))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found or you don't own it")

                if campaign['campaign_status'] == 'cancelled':
                    raise HTTPException(status_code=400, detail="Campaign already cancelled")

                # Get campaign finance details
                campaign_budget = float(campaign['campaign_budget'] or 0)
                amount_used = float(campaign['amount_used'] or 0)
                remaining_balance = float(campaign['remaining_balance'] or 0)

                # Check grace period
                within_grace_period = is_within_grace_period(campaign['created_at'])

                # Calculate tiered cancellation fee
                base_fee_percent = calculate_cancellation_fee_tier(advertiser_profile_id, cur)

                # Apply grace period (0% fee if within 24 hours)
                final_fee_percent = 0.0 if within_grace_period else base_fee_percent

                cancellation_fee = remaining_balance * (final_fee_percent / 100)
                refund_amount = remaining_balance - cancellation_fee

                # Get advertiser current balance
                advertiser_balance = float(campaign['advertiser_balance'] or 0)
                new_advertiser_balance = advertiser_balance + refund_amount

                # Update campaign status
                cur.execute("""
                    UPDATE campaign_profile
                    SET campaign_status = 'cancelled',
                        cancellation_fee_percent = %s,
                        cancellation_fee_amount = %s,
                        cancelled_by_user_id = %s,
                        cancellation_reason = %s,
                        ended_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                """, (
                    final_fee_percent,
                    cancellation_fee,
                    current_user.id,
                    request.reason or 'Cancelled by advertiser',
                    campaign_id
                ))

                # Refund remaining balance minus fee
                if refund_amount > 0:
                    cur.execute("""
                        UPDATE advertiser_profiles
                        SET balance = %s,
                            last_transaction_at = NOW()
                        WHERE id = %s
                    """, (new_advertiser_balance, advertiser_profile_id))

                    # Record refund transaction
                    cur.execute("""
                        INSERT INTO advertiser_transactions (
                            advertiser_id, campaign_id, brand_id, transaction_type,
                            amount, balance_before, balance_after, currency,
                            description, status, created_at
                        ) VALUES (
                            %s, %s, %s, 'refund',
                            %s, %s, %s, 'ETB',
                            %s, 'completed', NOW()
                        )
                    """, (
                        advertiser_profile_id,
                        campaign_id,
                        campaign['brand_id'],
                        refund_amount,
                        advertiser_balance,
                        new_advertiser_balance,
                        f"Campaign '{campaign['name']}' cancelled - Refund: {refund_amount:.2f} ETB (after {final_fee_percent:.1f}% fee)"
                    ))

                # Record cancellation fee transaction (if any)
                if cancellation_fee > 0:
                    cur.execute("""
                        INSERT INTO advertiser_transactions (
                            advertiser_id, campaign_id, brand_id, transaction_type,
                            amount, balance_before, balance_after, currency,
                            description, status, created_at
                        ) VALUES (
                            %s, %s, %s, 'cancellation_fee',
                            %s, %s, %s, 'ETB',
                            %s, 'completed', NOW()
                        )
                    """, (
                        advertiser_profile_id,
                        campaign_id,
                        campaign['brand_id'],
                        cancellation_fee,
                        advertiser_balance,
                        advertiser_balance,
                        f"Campaign '{campaign['name']}' - {final_fee_percent:.1f}% cancellation fee"
                    ))

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign cancelled successfully",
                    "cancellation_summary": {
                        "campaign_id": campaign_id,
                        "campaign_name": campaign['name'],
                        "campaign_budget": campaign_budget,
                        "amount_used": amount_used,
                        "remaining_balance": remaining_balance,
                        "within_grace_period": within_grace_period,
                        "base_fee_percent": base_fee_percent,
                        "final_fee_percent": final_fee_percent,
                        "cancellation_fee_amount": cancellation_fee,
                        "refund_amount": refund_amount,
                        "fee_tier_reason": _get_fee_tier_reason(base_fee_percent),
                        "cancelled_at": datetime.utcnow().isoformat()
                    },
                    "advertiser_balance": {
                        "balance_before": advertiser_balance,
                        "balance_after": new_advertiser_balance,
                        "balance_change": refund_amount
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
