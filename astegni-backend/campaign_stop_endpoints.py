"""
Campaign Stop & Settlement Endpoints

Allows advertisers to stop campaigns anytime and settle based on actual impressions delivered.

Flow:
1. Advertiser stops campaign
2. Calculate: actual_cost = impressions_delivered × CPI
3. Calculate: settlement = actual_cost - deposit_paid
4. If settlement > 0: Generate invoice
5. If settlement < 0: Credit advertiser (overpaid deposit)
6. If settlement = 0: Campaign complete, no action needed

Author: Astegni Platform
Date: 2026-01-15
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from utils import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/advertiser/campaigns", tags=["Campaign Stop & Settlement"])

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

class CampaignStopRequest(BaseModel):
    reason: Optional[str] = None


# ============================================================
# STOP CAMPAIGN & SETTLEMENT
# ============================================================

@router.post("/{campaign_id}/stop")
async def stop_campaign_with_settlement(
    campaign_id: int,
    stop_request: CampaignStopRequest,
    current_user = Depends(get_current_user)
):
    """
    Stop campaign and calculate final settlement

    Settlement Logic:
    1. actual_cost = impressions_delivered × CPI_rate
    2. settlement_amount = actual_cost - deposit_paid
    3. If settlement > 0: Advertiser owes money → Generate invoice
    4. If settlement < 0: Advertiser overpaid → Credit to account
    5. If settlement = 0: Perfect match → Mark complete

    Returns:
        - Settlement summary
        - Invoice (if owed money)
        - Credit (if overpaid)
    """
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign details
                cur.execute("""
                    SELECT * FROM campaign_profile WHERE id = %s
                """, (campaign_id,))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")

                # Verify ownership
                if campaign['advertiser_id'] != advertiser_profile_id:
                    raise HTTPException(status_code=403, detail="You don't own this campaign")

                # Check if already stopped
                if campaign['verification_status'] in ['stopped', 'completed', 'completed_pending_payment']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Campaign already {campaign['verification_status']}"
                    )

                # Get campaign financial data
                payment_model = campaign.get('payment_model')
                impressions_delivered = campaign.get('impressions_delivered', 0)
                cpi_rate = float(campaign.get('cpi_rate', 0))
                deposit_amount = float(campaign.get('deposit_amount', 0))
                brand_id = campaign.get('brand_id')

                # Calculate actual cost
                actual_cost = impressions_delivered * cpi_rate

                # Calculate settlement (what advertiser owes beyond deposit)
                settlement_amount = actual_cost - deposit_amount

                # Calculate unspent planned budget for cancellation fee
                planned_budget = float(campaign.get('campaign_budget', 0) or campaign.get('planned_budget', 0))
                unspent_budget = planned_budget - actual_cost
                cancellation_fee = 0

                # Apply 2% cancellation fee on unspent budget when stopping early
                if unspent_budget > 0:
                    cancellation_fee = unspent_budget * 0.02  # 2% of unspent budget

                invoice_id = None
                settlement_type = None

                # CASE 1: Advertiser owes money (settlement > 0 OR deposit doesn't cover actual cost + fee)
                if settlement_amount > -0.01:  # Owe money or roughly break even
                    settlement_type = 'invoice_generated'

                    # Total amount due = remaining cost + cancellation fee
                    total_amount_due = max(settlement_amount, 0) + cancellation_fee

                    # Generate invoice
                    invoice_number = f"INV-{campaign_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

                    # Only generate invoice if there's an amount due
                    if total_amount_due > 0.01:
                        invoice_notes = f"Early stop settlement for campaign '{campaign['name']}' - "
                        invoice_notes += f"{impressions_delivered:,} impressions delivered - "
                        invoice_notes += f"Actual cost: {actual_cost:.2f} ETB - "
                        invoice_notes += f"Deposit paid: {deposit_amount:.2f} ETB - "
                        if cancellation_fee > 0:
                            invoice_notes += f"2% cancellation fee: {cancellation_fee:.2f} ETB - "
                        invoice_notes += f"Total due: {total_amount_due:.2f} ETB"

                        cur.execute("""
                            INSERT INTO campaign_invoices (
                                campaign_id, advertiser_id, brand_id,
                                invoice_number, invoice_type,
                                amount, impressions_delivered, cpi_rate,
                                deposit_amount, outstanding_amount,
                                status, issued_at, due_date,
                                notes,
                                created_at, updated_at
                            ) VALUES (
                                %s, %s, %s,
                                %s, 'early_stop_settlement',
                                %s, %s, %s,
                                %s, %s,
                                'pending', NOW(), NOW() + INTERVAL '30 days',
                                %s,
                                NOW(), NOW()
                            )
                            RETURNING id
                        """, (
                            campaign_id,
                            advertiser_profile_id,
                            brand_id,
                            invoice_number,
                            actual_cost + cancellation_fee,  # Total amount including fee
                            impressions_delivered,
                            cpi_rate,
                            deposit_amount,
                            total_amount_due,
                            invoice_notes
                        ))
                        invoice_id = cur.fetchone()['id']

                        # Update campaign
                        cur.execute("""
                            UPDATE campaign_profile
                            SET
                                verification_status = 'stopped_pending_payment',
                                invoice_id = %s,
                                invoice_status = 'pending',
                                final_settlement_amount = %s,
                                ended_at = NOW(),
                                pause_reason = %s,
                                updated_at = NOW()
                            WHERE id = %s
                        """, (invoice_id, total_amount_due, stop_request.reason or 'stopped_by_advertiser', campaign_id))
                    else:
                        # Deposit covers everything (no invoice needed)
                        invoice_id = None
                        cur.execute("""
                            UPDATE campaign_profile
                            SET
                                verification_status = 'completed',
                                invoice_status = 'fully_paid',
                                final_settlement_amount = 0.00,
                                ended_at = NOW(),
                                pause_reason = %s,
                                updated_at = NOW()
                            WHERE id = %s
                        """, (stop_request.reason or 'stopped_by_advertiser', campaign_id))

                # CASE 2: Deposit already paid (no additional settlement needed)
                else:
                    # Deposit was non-refundable, so advertiser got impressions
                    # No refund, no credit - campaign complete
                    settlement_type = 'deposit_covered'

                    cur.execute("""
                        UPDATE campaign_profile
                        SET
                            verification_status = 'completed',
                            invoice_status = 'fully_paid',
                            final_settlement_amount = 0.00,
                            ended_at = NOW(),
                            pause_reason = %s,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (stop_request.reason or 'stopped_by_advertiser', campaign_id))

                conn.commit()

                # Prepare response
                response = {
                    "success": True,
                    "message": "Campaign stopped successfully",
                    "campaign": {
                        'id': campaign_id,
                        'name': campaign['name'],
                        'status': 'stopped',
                        'impressions_delivered': impressions_delivered,
                        'cpi_rate': float(cpi_rate)
                    },
                    "financial_summary": {
                        'deposit_paid': float(deposit_amount),
                        'actual_cost': float(actual_cost),
                        'unspent_budget': float(unspent_budget),
                        'cancellation_fee': float(cancellation_fee),
                        'settlement_amount': float(settlement_amount),
                        'total_amount_due': float(total_amount_due) if settlement_type == 'invoice_generated' else 0.0,
                        'settlement_type': settlement_type
                    }
                }

                if settlement_type == 'invoice_generated' and total_amount_due > 0.01:
                    # Generate payment link for invoice
                    chapa_payment_url = f"https://api.chapa.co/v1/transaction/initialize"  # Placeholder

                    response['invoice'] = {
                        'id': invoice_id,
                        'amount_due': float(total_amount_due),
                        'breakdown': {
                            'remaining_cost': float(max(settlement_amount, 0)),
                            'cancellation_fee': float(cancellation_fee),
                            'total': float(total_amount_due)
                        },
                        'due_date': str(datetime.now() + timedelta(days=30)),
                        'status': 'pending_payment',
                        'payment_url': chapa_payment_url,
                        'message': f'Total due: {total_amount_due:.2f} ETB (including {cancellation_fee:.2f} ETB cancellation fee). Pay via payment gateway.'
                    }
                else:  # deposit_covered
                    response['message'] = 'Campaign stopped. Your 20% deposit covered the cost. No additional payment needed.'
                    response['note'] = 'Deposit is non-refundable - you received impressions for the deposit amount.'

                return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{campaign_id}/pause")
async def pause_campaign(campaign_id: int, current_user = Depends(get_current_user)):
    """
    Pause campaign temporarily (no settlement, can resume later)

    Difference from stop:
    - Stop: Permanent, triggers settlement
    - Pause: Temporary, no settlement, can resume
    """
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign
                cur.execute("""
                    SELECT id, name, verification_status, advertiser_id
                    FROM campaign_profile WHERE id = %s
                """, (campaign_id,))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")

                # Verify ownership
                if campaign['advertiser_id'] != advertiser_profile_id:
                    raise HTTPException(status_code=403, detail="You don't own this campaign")

                # Check if can pause
                if campaign['verification_status'] not in ['active', 'verified']:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot pause campaign in {campaign['verification_status']} status"
                    )

                # Pause campaign
                cur.execute("""
                    UPDATE campaign_profile
                    SET
                        verification_status = 'paused',
                        pause_reason = 'paused_by_advertiser',
                        paused_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                """, (campaign_id,))

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign paused successfully",
                    "campaign_id": campaign_id,
                    "campaign_name": campaign['name'],
                    "status": "paused",
                    "note": "Resume anytime from your campaign dashboard. No fees for pausing."
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{campaign_id}/resume")
async def resume_campaign(campaign_id: int, current_user = Depends(get_current_user)):
    """Resume a paused campaign"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get campaign
                cur.execute("""
                    SELECT id, name, verification_status, advertiser_id
                    FROM campaign_profile WHERE id = %s
                """, (campaign_id,))
                campaign = cur.fetchone()

                if not campaign:
                    raise HTTPException(status_code=404, detail="Campaign not found")

                # Verify ownership
                if campaign['advertiser_id'] != advertiser_profile_id:
                    raise HTTPException(status_code=403, detail="You don't own this campaign")

                # Check if paused
                if campaign['verification_status'] != 'paused':
                    raise HTTPException(
                        status_code=400,
                        detail=f"Campaign is not paused (current status: {campaign['verification_status']})"
                    )

                # Resume campaign
                cur.execute("""
                    UPDATE campaign_profile
                    SET
                        verification_status = 'active',
                        pause_reason = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                """, (campaign_id,))

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign resumed successfully",
                    "campaign_id": campaign_id,
                    "campaign_name": campaign['name'],
                    "status": "active"
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
