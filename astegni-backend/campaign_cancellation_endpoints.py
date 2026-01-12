"""
Campaign Cancellation Endpoints
Handles campaign cancellation with 5% fee on remaining balance

Cancellation Logic:
1. Calculate final charge for undelivered impressions (amount_used)
2. Calculate 5% cancellation fee on remaining_balance
3. Refund remaining_balance minus 5% fee
4. Update campaign status to 'cancelled'
5. Record all transactions
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
from utils import get_current_user
from datetime import datetime

load_dotenv()

router = APIRouter(prefix="/api/campaign", tags=["Campaign Cancellation"])

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def get_db():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


class CampaignCancellationRequest(BaseModel):
    reason: Optional[str] = None


@router.post("/cancel/{campaign_id}")
async def cancel_campaign(campaign_id: int, request: CampaignCancellationRequest, current_user = Depends(get_current_user)):
    """
    Cancel a campaign with 5% fee on remaining balance

    Process:
    1. Verify ownership
    2. Calculate remaining balance
    3. Apply 5% cancellation fee
    4. Refund advertiser (remaining_balance - 5% fee)
    5. Update campaign status
    6. Record transactions
    """
    try:
        # Get advertiser profile ID from role_ids
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

                # Check if campaign can be cancelled
                if campaign['verification_status'] == 'cancelled':
                    raise HTTPException(status_code=400, detail="Campaign already cancelled")

                # Get campaign finance details
                campaign_budget = float(campaign['campaign_budget'] or 0)
                amount_used = float(campaign['amount_used'] or 0)
                remaining_balance = float(campaign['remaining_balance'] or 0)
                cancellation_fee_percent = float(campaign.get('cancellation_fee_percent') or 5.0)

                # Calculate cancellation fee (5% of remaining balance)
                cancellation_fee = remaining_balance * (cancellation_fee_percent / 100)

                # Calculate refund amount
                refund_amount = remaining_balance - cancellation_fee

                # Get advertiser current balance
                advertiser_balance = float(campaign['advertiser_balance'] or 0)
                new_advertiser_balance = advertiser_balance + refund_amount

                # Update campaign status
                cur.execute("""
                    UPDATE campaign_profile
                    SET verification_status = 'cancelled',
                        is_verified = FALSE,
                        cancellation_fee_amount = %s,
                        cancelled_by_user_id = %s,
                        cancellation_reason = %s,
                        ended_at = NOW(),
                        pause_reason = 'cancelled_by_advertiser',
                        updated_at = NOW()
                    WHERE id = %s
                """, (
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
                        RETURNING id
                    """, (
                        advertiser_profile_id,
                        campaign_id,
                        campaign['brand_id'],
                        refund_amount,
                        advertiser_balance,
                        new_advertiser_balance,
                        f"Campaign '{campaign['name']}' cancelled - Refund: {refund_amount:.2f} ETB (after 5% cancellation fee)"
                    ))

                # Record cancellation fee transaction
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
                        advertiser_balance,  # Fee doesn't change balance (deducted from refund)
                        f"Campaign '{campaign['name']}' - 5% cancellation fee"
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
                        "cancellation_fee_percent": cancellation_fee_percent,
                        "cancellation_fee_amount": cancellation_fee,
                        "refund_amount": refund_amount,
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


@router.get("/cancellation-preview/{campaign_id}")
async def get_cancellation_preview(campaign_id: int, current_user = Depends(get_current_user)):
    """
    Preview cancellation costs before actually cancelling

    Returns:
    - Remaining balance
    - 5% cancellation fee
    - Refund amount
    """
    try:
        # Get advertiser profile ID from role_ids
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign details
                cur.execute("""
                    SELECT
                        id, name, campaign_budget, amount_used, remaining_balance,
                        cancellation_fee_percent, impressions, verification_status
                    FROM campaign_profile
                    WHERE id = %s AND advertiser_id = %s
                """, (campaign_id, advertiser_profile_id))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found or you don't own it")

                if campaign['verification_status'] == 'cancelled':
                    raise HTTPException(status_code=400, detail="Campaign already cancelled")

                # Calculate cancellation preview
                campaign_budget = float(campaign['campaign_budget'] or 0)
                amount_used = float(campaign['amount_used'] or 0)
                remaining_balance = float(campaign['remaining_balance'] or 0)
                cancellation_fee_percent = float(campaign.get('cancellation_fee_percent') or 5.0)
                cancellation_fee = remaining_balance * (cancellation_fee_percent / 100)
                refund_amount = remaining_balance - cancellation_fee

                return {
                    "success": True,
                    "campaign": {
                        "id": campaign['id'],
                        "name": campaign['name'],
                        "status": campaign['verification_status'],
                        "impressions_delivered": campaign['impressions'] or 0
                    },
                    "finances": {
                        "campaign_budget": campaign_budget,
                        "amount_used": amount_used,
                        "amount_used_percent": (amount_used / campaign_budget * 100) if campaign_budget > 0 else 0,
                        "remaining_balance": remaining_balance,
                        "remaining_balance_percent": (remaining_balance / campaign_budget * 100) if campaign_budget > 0 else 0
                    },
                    "cancellation": {
                        "fee_percent": cancellation_fee_percent,
                        "fee_amount": cancellation_fee,
                        "refund_amount": refund_amount,
                        "note": "The used amount is non-refundable as impressions were delivered"
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
