"""
Campaign Deposit Payment System Endpoints

New Payment Model:
1. Advertiser sets planned campaign budget (e.g., 10,000 ETB)
2. Pay 20% non-refundable deposit upfront (e.g., 2,000 ETB)
3. Campaign runs and delivers impressions
4. After ALL impressions delivered, invoice for actual cost
5. Advertiser can stop campaign anytime
6. Final settlement = (impressions_delivered × CPI) - deposit

Author: Astegni Platform
Date: 2026-01-15
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from utils import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/advertiser", tags=["Campaign Deposit System"])

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

class CampaignCreateWithDeposit(BaseModel):
    brand_id: int
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_url: Optional[str] = None
    objective: Optional[str] = None
    planned_budget: float  # Total planned budget
    cpi_rate: float  # Cost per impression rate
    target_audiences: Optional[List[str]] = None
    target_regions: Optional[List[str]] = None
    target_placements: Optional[List[str]] = None
    target_audience: Optional[str] = None  # Legacy field
    target_location: Optional[str] = None  # Legacy field
    start_date: Optional[str] = None
    call_to_action: Optional[str] = None


# ============================================================
# CAMPAIGN CREATION WITH DEPOSIT
# ============================================================

@router.post("/campaigns/create-with-deposit")
async def create_campaign_with_deposit(campaign: CampaignCreateWithDeposit, current_user = Depends(get_current_user)):
    """
    Create campaign with 20% deposit payment model

    Flow:
    1. Validate planned budget and calculate 20% deposit
    2. Check user has sufficient balance for deposit
    3. Deduct deposit from user account (non-refundable)
    4. Create campaign with deposit tracking
    5. Campaign runs and delivers impressions
    6. After completion, generate invoice for remaining 80%

    Returns:
        - Campaign details
        - Deposit amount paid
        - Planned impressions
        - Outstanding balance (80%)
    """
    try:
        # Get advertiser profile ID
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify brand ownership
                cur.execute("""
                    SELECT id, brand_ids, user_id FROM advertiser_profiles WHERE id = %s
                """, (advertiser_profile_id,))
                advertiser = cur.fetchone()

                if not advertiser or campaign.brand_id not in (advertiser.get('brand_ids') or []):
                    raise HTTPException(status_code=403, detail="You don't own this brand")

                # Validate planned budget
                if not campaign.planned_budget or campaign.planned_budget <= 0:
                    raise HTTPException(status_code=400, detail="Planned budget must be greater than 0")

                if not campaign.cpi_rate or campaign.cpi_rate <= 0:
                    raise HTTPException(status_code=400, detail="CPI rate must be greater than 0")

                planned_budget = float(campaign.planned_budget)
                cpi_rate = float(campaign.cpi_rate)

                # Validate budget doesn't exceed database limits
                # deposit_amount, outstanding_balance have precision(10,2) = max 99,999,999.99
                if planned_budget > 99999999.99:
                    raise HTTPException(status_code=400, detail="Planned budget cannot exceed 99,999,999.99")

                # Validate CPI rate is reasonable (not too small to cause overflow)
                if cpi_rate < 0.0001:
                    raise HTTPException(status_code=400, detail="CPI rate must be at least 0.0001")

                # Calculate 20% deposit
                deposit_percent = 20.00
                deposit_amount = planned_budget * (deposit_percent / 100)
                outstanding_balance = planned_budget - deposit_amount

                # Calculate total planned impressions
                total_impressions_planned = int(planned_budget / cpi_rate)

                # Validate total impressions doesn't overflow bigint (max: 9,223,372,036,854,775,807)
                if total_impressions_planned > 9223372036854775807:
                    raise HTTPException(status_code=400, detail="Total impressions planned exceeds maximum. Please increase CPI rate or reduce budget.")

                # Debug logging to help identify overflow
                print(f"DEBUG Campaign Creation:")
                print(f"  planned_budget: {planned_budget}")
                print(f"  cpi_rate: {cpi_rate}")
                print(f"  deposit_amount: {deposit_amount}")
                print(f"  outstanding_balance: {outstanding_balance}")
                print(f"  total_impressions_planned: {total_impressions_planned}")

                # Set default targeting arrays
                target_audiences = campaign.target_audiences or ['tutor', 'student', 'parent', 'advertiser', 'user']
                target_regions = campaign.target_regions or []
                target_placements = campaign.target_placements or ['placeholder', 'widget', 'popup', 'insession']

                # Create the campaign (without removed/deprecated fields)
                # Removed fields: thumbnail_url, file_url (→ campaign_media table)
                # Removed fields: target_audience (singular) (→ use target_audiences array instead)
                # Removed fields: impressions, impressions_delivered, impressions_charged, conversions, likes, shares, comments (→ calculated from other tables)
                # Removed fields: payment_status, paid_at, payment_model, deposit_paid, invoice_status (→ campaign_invoices table)
                cur.execute("""
                    INSERT INTO campaign_profile (
                        name, description, objective,
                        start_date, call_to_action, target_location,
                        verification_status, is_verified,
                        target_audiences, target_regions, target_placements,
                        cpi_rate, total_charged, billing_frequency,
                        campaign_budget, amount_used, remaining_balance,
                        advertiser_id, brand_id,
                        deposit_percent, deposit_amount,
                        outstanding_balance, total_impressions_planned,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s,
                        'pending', FALSE,
                        %s, %s, %s,
                        %s, 0.00, 1000,
                        %s, 0.00, 0.00,
                        %s, %s,
                        %s, %s,
                        %s, %s,
                        NOW(), NOW()
                    )
                    RETURNING *
                """, (
                    campaign.name,
                    campaign.description,
                    campaign.objective,
                    campaign.start_date,
                    campaign.call_to_action,
                    campaign.target_location,
                    target_audiences,
                    target_regions,
                    target_placements,
                    cpi_rate,
                    planned_budget,
                    advertiser_profile_id,
                    campaign.brand_id,
                    deposit_percent,
                    deposit_amount,
                    outstanding_balance,
                    total_impressions_planned
                ))
                new_campaign = cur.fetchone()

                # Insert media files into campaign_media table if provided
                if campaign.thumbnail_url:
                    cur.execute("""
                        INSERT INTO campaign_media (
                            campaign_id, brand_id, advertiser_id,
                            media_type, file_url, file_name, placement
                        ) VALUES (
                            %s, %s, %s, 'image', %s, %s, 'widget'
                        )
                    """, (
                        new_campaign['id'],
                        campaign.brand_id,
                        advertiser_profile_id,
                        campaign.thumbnail_url,
                        campaign.thumbnail_url.split('/')[-1]  # Extract filename from URL
                    ))

                if campaign.file_url:
                    # Determine media type from file extension
                    file_ext = campaign.file_url.split('.')[-1].lower()
                    media_type = 'video' if file_ext in ['mp4', 'mov', 'avi', 'webm'] else 'image'

                    cur.execute("""
                        INSERT INTO campaign_media (
                            campaign_id, brand_id, advertiser_id,
                            media_type, file_url, file_name, placement
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, 'placeholder'
                        )
                    """, (
                        new_campaign['id'],
                        campaign.brand_id,
                        advertiser_profile_id,
                        media_type,
                        campaign.file_url,
                        campaign.file_url.split('/')[-1]  # Extract filename from URL
                    ))

                # NOTE: Payment handled by external gateway (Chapa)
                # Campaign will be marked as deposit_paid via webhook after successful payment

                # Add campaign ID to brand's campaign_ids array
                cur.execute("""
                    SELECT campaign_ids FROM brand_profile WHERE id = %s
                """, (campaign.brand_id,))
                brand = cur.fetchone()
                current_campaign_ids = brand.get('campaign_ids') or []
                new_campaign_ids = current_campaign_ids + [new_campaign['id']]

                cur.execute("""
                    UPDATE brand_profile
                    SET campaign_ids = %s, updated_at = NOW()
                    WHERE id = %s
                """, (new_campaign_ids, campaign.brand_id))

                conn.commit()

                # Generate Chapa payment link for 20% deposit
                # TODO: Integrate with actual Chapa API
                chapa_payment_url = f"https://api.chapa.co/v1/transaction/initialize"  # Placeholder

                return {
                    "success": True,
                    "message": f"Campaign created. Please complete 20% deposit payment to activate.",
                    "campaign": {
                        'id': new_campaign['id'],
                        'name': new_campaign['name'],
                        'description': new_campaign['description'],
                        'status': 'pending_deposit_payment',  # Will be 'active' after payment
                        'payment_model': 'deposit',
                        'planned_budget': float(planned_budget),
                        'deposit_percent': float(deposit_percent),
                        'deposit_amount': float(deposit_amount),
                        'outstanding_balance': float(outstanding_balance),
                        'cpi_rate': float(cpi_rate),
                        'total_impressions_planned': int(total_impressions_planned),
                        'impressions_delivered': 0,
                        'total_charged': 0.00,
                        'invoice_status': 'pending',
                        'created_at': str(new_campaign['created_at'])
                    },
                    "payment": {
                        'deposit_amount': float(deposit_amount),
                        'payment_method': 'external_gateway',
                        'payment_url': chapa_payment_url,  # Frontend should redirect to this
                        'currency': 'ETB'
                    },
                    "next_steps": {
                        'message': f"Complete payment of {deposit_amount:.2f} ETB to activate campaign.",
                        'action': 'redirect_to_payment',
                        'payment_description': f"20% deposit for campaign '{campaign.name}' - Covers first {int(total_impressions_planned * 0.2):,} impressions",
                        'after_payment': "Campaign will activate automatically after successful payment. You'll be invoiced for remaining impressions after campaign completes.",
                        'cancellation_policy': "If you stop campaign early, a 2% cancellation fee applies to unspent budget."
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# CAMPAIGN COMPLETION & INVOICE GENERATION
# ============================================================

@router.post("/campaigns/{campaign_id}/complete-and-invoice")
async def complete_campaign_and_generate_invoice(campaign_id: int, current_user = Depends(get_current_user)):
    """
    Complete campaign and generate invoice for remaining payment

    Called when:
    - All planned impressions delivered
    - Advertiser manually stops campaign

    Flow:
    1. Calculate actual cost = impressions_delivered × CPI
    2. Calculate outstanding = actual_cost - deposit_paid
    3. Generate invoice for outstanding amount
    4. Set campaign status to 'completed_pending_payment'
    5. Return invoice details
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

                # Check payment model
                if campaign.get('payment_model') != 'deposit':
                    raise HTTPException(status_code=400, detail="Campaign is not using deposit payment model")

                # Calculate actual cost
                impressions_delivered = campaign.get('impressions_delivered', 0)
                cpi_rate = float(campaign.get('cpi_rate', 0))
                deposit_amount = float(campaign.get('deposit_amount', 0))

                actual_cost = impressions_delivered * cpi_rate
                outstanding_amount = actual_cost - deposit_amount

                # Ensure outstanding is not negative (deposit covers more than delivered)
                if outstanding_amount < 0:
                    outstanding_amount = 0

                # Generate invoice number
                invoice_number = f"INV-{campaign_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"

                # Create invoice
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
                        %s, 'final_settlement',
                        %s, %s, %s,
                        %s, %s,
                        'pending', NOW(), NOW() + INTERVAL '30 days',
                        %s,
                        NOW(), NOW()
                    )
                    RETURNING *
                """, (
                    campaign_id,
                    advertiser_profile_id,
                    campaign['brand_id'],
                    invoice_number,
                    actual_cost,
                    impressions_delivered,
                    cpi_rate,
                    deposit_amount,
                    outstanding_amount,
                    f"Final settlement for campaign '{campaign['name']}' - {impressions_delivered:,} impressions delivered at {cpi_rate:.4f} ETB per impression"
                ))
                invoice = cur.fetchone()

                # Update campaign
                cur.execute("""
                    UPDATE campaign_profile
                    SET
                        verification_status = 'completed_pending_payment',
                        invoice_id = %s,
                        invoice_status = 'pending',
                        final_settlement_amount = %s,
                        ended_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                """, (invoice['id'], outstanding_amount, campaign_id))

                conn.commit()

                return {
                    "success": True,
                    "message": "Campaign completed and invoice generated",
                    "campaign": {
                        'id': campaign_id,
                        'name': campaign['name'],
                        'status': 'completed_pending_payment',
                        'impressions_delivered': impressions_delivered,
                        'actual_cost': float(actual_cost),
                        'deposit_paid': float(deposit_amount),
                        'outstanding_amount': float(outstanding_amount)
                    },
                    "invoice": {
                        'id': invoice['id'],
                        'invoice_number': invoice_number,
                        'amount': float(actual_cost),
                        'outstanding': float(outstanding_amount),
                        'due_date': str(invoice['due_date']),
                        'status': 'pending'
                    }
                }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/invoices")
async def get_advertiser_invoices(current_user = Depends(get_current_user)):
    """Get all invoices for current advertiser"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT
                        ci.*,
                        cp.name as campaign_name,
                        bp.name as brand_name
                    FROM campaign_invoices ci
                    LEFT JOIN campaign_profile cp ON ci.campaign_id = cp.id
                    LEFT JOIN brand_profile bp ON ci.brand_id = bp.id
                    WHERE ci.advertiser_id = %s
                    ORDER BY ci.created_at DESC
                """, (advertiser_profile_id,))

                invoices = cur.fetchall()

                return {
                    "success": True,
                    "invoices": [dict(inv) for inv in invoices],
                    "total": len(invoices)
                }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/{invoice_id}/pay")
async def pay_invoice(invoice_id: int, current_user = Depends(get_current_user)):
    """Pay an outstanding invoice"""
    try:
        advertiser_profile_id = current_user.role_ids.get('advertiser') if current_user.role_ids else None

        if not advertiser_profile_id:
            raise HTTPException(status_code=403, detail="Not authorized as advertiser")

        with get_db() as conn:
            with conn.cursor() as cur:
                # Get invoice
                cur.execute("""
                    SELECT * FROM campaign_invoices WHERE id = %s
                """, (invoice_id,))
                invoice = cur.fetchone()

                if not invoice:
                    raise HTTPException(status_code=404, detail="Invoice not found")

                # Verify ownership
                if invoice['advertiser_id'] != advertiser_profile_id:
                    raise HTTPException(status_code=403, detail="You don't own this invoice")

                # Check if already paid
                if invoice['status'] == 'paid':
                    raise HTTPException(status_code=400, detail="Invoice already paid")

                outstanding_amount = float(invoice['outstanding_amount'])

                # Generate Chapa payment link for invoice
                # TODO: Integrate with actual Chapa API
                chapa_payment_url = f"https://api.chapa.co/v1/transaction/initialize"  # Placeholder

                conn.commit()

                return {
                    "success": True,
                    "message": "Payment link generated. Please complete payment.",
                    "invoice": {
                        'invoice_id': invoice_id,
                        'invoice_number': invoice['invoice_number'],
                        'amount_due': float(outstanding_amount),
                        'currency': 'ETB',
                        'status': 'pending_payment'
                    },
                    "payment": {
                        'amount': float(outstanding_amount),
                        'payment_method': 'external_gateway',
                        'payment_url': chapa_payment_url,  # Frontend should redirect to this
                        'description': f"Invoice payment for {invoice['invoice_number']}",
                        'currency': 'ETB'
                    },
                    "next_steps": {
                        'message': f"Complete payment of {outstanding_amount:.2f} ETB via payment gateway.",
                        'action': 'redirect_to_payment',
                        'after_payment': "Invoice will be marked as paid automatically via webhook. Campaign will be marked as completed."
                    }
                }

                # NOTE: Actual payment processing happens via webhook
                # Webhook will:
                # 1. Mark invoice as 'paid'
                # 2. Update campaign status to 'completed'
                # 3. Record transaction in advertiser_transactions

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
