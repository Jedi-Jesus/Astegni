"""
Manage Payments Endpoints

Admin surface for verifying advertiser advance-payment receipts — the FIRST of
the two campaign verifications (payment), separate from ad-content verification
(which lives in manage-campaigns). Access is restricted to the 'manage-payments'
department (and 'manage-system-settings' as super-admin).

Data: advance invoices live in campaign_invoices (astegni_advertiser_db) with
invoice_type='advance'. The uploaded receipt is at invoice_pdf_url; status is
pending | verified | rejected.
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv
import os

load_dotenv()

router = APIRouter(prefix="/api/manage-payments", tags=["Manage Payments"])

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)
ADVERTISER_DATABASE_URL = os.getenv(
    'ADVERTISER_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_advertiser_db'
)
USER_DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

ALLOWED_DEPARTMENTS = ["manage-payments", "manage-system-settings"]


def get_admin_db():
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)


def get_advertiser_db():
    return psycopg.connect(ADVERTISER_DATABASE_URL, row_factory=dict_row)


def get_user_db():
    return psycopg.connect(USER_DATABASE_URL, row_factory=dict_row)


def verify_payments_access(admin_id: Optional[int]):
    """Restrict to manage-payments / manage-system-settings. No-op if admin_id absent."""
    if not admin_id:
        return
    with get_admin_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT departments FROM admin_profile WHERE id = %s", (admin_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Admin not found")
            depts = row['departments'] or []
            if not any(d in ALLOWED_DEPARTMENTS for d in depts):
                raise HTTPException(
                    status_code=403,
                    detail=f"Access denied. Restricted to: {', '.join(ALLOWED_DEPARTMENTS)}.",
                )


class PaymentStatusUpdate(BaseModel):
    new_status: str           # 'verified' | 'rejected' | 'pending'
    reason: Optional[str] = None
    admin_id: Optional[int] = None


def _extract_paid_to(notes) -> Optional[str]:
    """Pull the 'Paid to: <bank> (A/C <num>).' fragment the receipt-upload writes
    into the invoice notes, so the admin sees which account the advertiser paid."""
    if not notes:
        return None
    import re
    # Capture everything after "Paid to:" up to the terminating period (or end),
    # so it works whether the fragment is at the end of the note or followed by
    # more text (e.g. after a verification status was appended).
    m = re.search(r'Paid to:\s*(.+?)(?:\.\s|\.$|$)', notes)
    return m.group(1).strip() if m else None


def _create_settlement_invoice(cur, campaign_id: int) -> Optional[dict]:
    """Create the remaining-balance 'final_settlement' invoice for a campaign,
    using an already-open cursor (caller owns the transaction). Idempotent:
    returns the existing settlement invoice if one is already present, or None
    if there's no verified advance to settle against. Amount = campaign_budget
    minus the advance deposit."""
    cur.execute("""
        SELECT id, status, advertiser_id, brand_id FROM campaign_invoices
        WHERE campaign_id = %s AND invoice_type = 'advance'
        ORDER BY id DESC LIMIT 1
    """, (campaign_id,))
    adv = cur.fetchone()
    if not adv or adv['status'] != 'verified':
        return None

    cur.execute("""
        SELECT id, invoice_number, amount, status FROM campaign_invoices
        WHERE campaign_id = %s AND invoice_type = 'final_settlement'
        ORDER BY id DESC LIMIT 1
    """, (campaign_id,))
    existing = cur.fetchone()
    if existing:
        return {
            "invoice_id": existing['id'],
            "invoice_number": existing['invoice_number'],
            "amount": float(existing['amount']) if existing['amount'] is not None else None,
            "status": existing['status'],
            "already_issued": True,
        }

    cur.execute("""
        SELECT name, campaign_budget, deposit_amount, cpi_rate
        FROM campaign_profile WHERE id = %s
    """, (campaign_id,))
    cp = cur.fetchone()
    if not cp:
        return None
    budget = float(cp['campaign_budget']) if cp['campaign_budget'] is not None else 0.0
    deposit = float(cp['deposit_amount']) if cp['deposit_amount'] is not None else 0.0
    outstanding = max(0.0, budget - deposit)

    from datetime import datetime
    invoice_number = f"INV-{campaign_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    cur.execute("""
        INSERT INTO campaign_invoices (
            campaign_id, advertiser_id, brand_id,
            invoice_number, invoice_type,
            amount, cpi_rate, deposit_amount, outstanding_amount,
            status, issued_at, due_date, notes,
            created_at, updated_at
        ) VALUES (
            %s, %s, %s, %s, 'final_settlement',
            %s, %s, %s, %s,
            'pending', NOW(), NOW() + INTERVAL '30 days', %s,
            NOW(), NOW()
        ) RETURNING id
    """, (
        campaign_id, adv['advertiser_id'], adv['brand_id'],
        invoice_number,
        outstanding, cp['cpi_rate'], deposit, outstanding,
        f"Remaining-balance settlement for '{cp['name']}' (budget {budget:.2f} - advance {deposit:.2f}).",
    ))
    new_id = cur.fetchone()['id']
    return {
        "invoice_id": new_id,
        "invoice_number": invoice_number,
        "amount": outstanding,
        "status": "pending",
        "already_issued": False,
    }


def _resolve_advertiser_names(rows: List[dict]) -> dict:
    """Map advertiser_id -> display name/email, read directly from advertiser_profiles.

    Advertiser identity (email, first_name, father_name) now lives on
    advertiser_profiles itself (self-contained auth), so there is no cross-DB
    users lookup anymore."""
    adv_ids = [r['advertiser_id'] for r in rows if r.get('advertiser_id')]
    if not adv_ids:
        return {}
    with get_advertiser_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT id, company_name, first_name, father_name, email
                   FROM advertiser_profiles WHERE id = ANY(%s)""",
                (adv_ids,),
            )
            adv = {r['id']: r for r in cur.fetchall()}
    out = {}
    for adv_id, a in adv.items():
        person = " ".join(p for p in [a.get('first_name'), a.get('father_name')] if p).strip()
        name = a.get('company_name') or person or None
        out[adv_id] = {"name": name or "Unknown", "email": a.get('email')}
    return out


@router.get("/counts")
async def payment_counts(admin_id: Optional[int] = None):
    """Counts of advance payments by status (for the dashboard/sidebar)."""
    verify_payments_access(admin_id)
    conn = get_advertiser_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT status, COUNT(*) AS n
            FROM campaign_invoices
            WHERE invoice_type = 'advance'
            GROUP BY status
        """)
        counts = {"pending": 0, "verified": 0, "rejected": 0}
        for r in cur.fetchall():
            if r['status'] in counts:
                counts[r['status']] = r['n']
        counts['total'] = sum(counts.values())
        return {"success": True, "counts": counts}
    finally:
        cur.close()
        conn.close()


@router.get("/payments")
async def list_payments(status: Optional[str] = None, limit: int = 50, admin_id: Optional[int] = None):
    """List advance-payment receipts, optionally filtered by status."""
    verify_payments_access(admin_id)
    conn = get_advertiser_db()
    try:
        cur = conn.cursor()
        params: list = []
        where = "WHERE ci.invoice_type = 'advance'"
        if status in ('pending', 'verified', 'rejected'):
            where += " AND ci.status = %s"
            params.append(status)
        cur.execute(f"""
            SELECT ci.id, ci.campaign_id, ci.advertiser_id, ci.brand_id,
                   ci.invoice_number, ci.amount, ci.status, ci.payment_method,
                   ci.invoice_pdf_url, ci.admin_invoice_url, ci.notes, ci.issued_at, ci.updated_at,
                   cp.name AS campaign_name, cp.company_id,
                   cp.description, cp.objective, cp.target_location, cp.start_date,
                   cp.call_to_action, cp.cpi_rate, cp.campaign_budget,
                   cp.total_impressions_planned, cp.deposit_percent,
                   bp.name AS brand_name, comp.company_name,
                   st.id AS settlement_id, st.invoice_number AS settlement_number,
                   st.amount AS settlement_amount, st.status AS settlement_status
            FROM campaign_invoices ci
            LEFT JOIN LATERAL (
                SELECT id, invoice_number, amount, status
                FROM campaign_invoices s
                WHERE s.campaign_id = ci.campaign_id AND s.invoice_type = 'final_settlement'
                ORDER BY s.id DESC LIMIT 1
            ) st ON TRUE
            LEFT JOIN campaign_profile cp ON ci.campaign_id = cp.id
            LEFT JOIN brand_profile bp ON ci.brand_id = bp.id
            LEFT JOIN company_profile comp ON cp.company_id = comp.id
            {where}
            ORDER BY ci.updated_at DESC
            LIMIT %s
        """, params + [limit])
        rows = cur.fetchall()

        names = _resolve_advertiser_names(rows)
        payments = []
        for r in rows:
            adv = names.get(r['advertiser_id'], {})
            payments.append({
                "invoice_id": r['id'],
                "invoice_number": r['invoice_number'],
                "campaign_id": r['campaign_id'],
                "campaign_name": r['campaign_name'],
                "company_name": r['company_name'],
                "brand_name": r['brand_name'],
                "advertiser_name": adv.get('name'),
                "advertiser_email": adv.get('email'),
                "amount": float(r['amount']) if r['amount'] is not None else None,
                "status": r['status'],
                "payment_method": r['payment_method'],
                "receipt_url": r['invoice_pdf_url'],
                "admin_invoice_url": r.get('admin_invoice_url'),
                "notes": r['notes'],
                "issued_at": str(r['issued_at']) if r['issued_at'] else None,
                "updated_at": str(r['updated_at']) if r['updated_at'] else None,
                # Campaign detail (for the full-description modal)
                "description": r.get('description'),
                "objective": r.get('objective'),
                "target_location": r.get('target_location'),
                "start_date": str(r['start_date']) if r.get('start_date') else None,
                "call_to_action": r.get('call_to_action'),
                "cpi_rate": float(r['cpi_rate']) if r.get('cpi_rate') is not None else None,
                "campaign_budget": float(r['campaign_budget']) if r.get('campaign_budget') is not None else None,
                "planned_views": int(r['total_impressions_planned']) if r.get('total_impressions_planned') is not None else None,
                "deposit_percent": float(r['deposit_percent']) if r.get('deposit_percent') is not None else None,
                # The bank the advertiser said they paid to is recorded in the notes.
                "paid_to_bank": _extract_paid_to(r['notes']),
                # Settlement (remaining-balance) invoice — the second payment.
                "settlement_invoice_id": r.get('settlement_id'),
                "settlement_invoice_number": r.get('settlement_number'),
                "settlement_amount": float(r['settlement_amount']) if r.get('settlement_amount') is not None else None,
                "settlement_status": r.get('settlement_status'),
            })
        return {"success": True, "count": len(payments), "payments": payments}
    finally:
        cur.close()
        conn.close()


@router.put("/payments/{campaign_id}/status")
async def update_payment_status(campaign_id: int, body: PaymentStatusUpdate):
    """Verify/reject an advance-payment receipt (payment verification)."""
    valid = ['verified', 'rejected', 'pending']
    if body.new_status not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid)}")
    if body.new_status == 'rejected' and not (body.reason and body.reason.strip()):
        raise HTTPException(status_code=400, detail="A reason is required when rejecting a payment.")
    verify_payments_access(body.admin_id)

    conn = get_advertiser_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id FROM campaign_invoices
            WHERE campaign_id = %s AND invoice_type = 'advance'
            ORDER BY id DESC LIMIT 1
        """, (campaign_id,))
        inv = cur.fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="No advance-payment receipt found for this campaign")

        # Build the status note, but PRESERVE the "Paid to: <bank> (A/C ...)."
        # fragment the receipt upload wrote into notes — otherwise verifying
        # overwrites it and the admin loses which account was paid.
        cur.execute("SELECT notes FROM campaign_invoices WHERE id = %s", (inv['id'],))
        existing_notes = (cur.fetchone() or {}).get('notes') or ''
        paid_to = _extract_paid_to(existing_notes)
        status_note = (body.reason or '').strip() or (
            'Payment verified by admin' if body.new_status == 'verified' else None
        )
        if status_note and paid_to:
            note = f"{status_note} Paid to: {paid_to}."
        else:
            note = status_note  # None when rejecting without a reason → keeps existing notes
        cur.execute("""
            UPDATE campaign_invoices
            SET status = %s,
                paid_at = CASE WHEN %s = 'verified' THEN NOW() ELSE paid_at END,
                notes = COALESCE(%s, notes),
                updated_at = NOW()
            WHERE id = %s
        """, (body.new_status, body.new_status, note, inv['id']))

        # On verify, AUTO-ISSUE the remaining-balance settlement invoice (the
        # second payment). Idempotent — re-verifying won't create duplicates.
        settlement = None
        if body.new_status == 'verified':
            settlement = _create_settlement_invoice(cur, campaign_id)

        conn.commit()
        return {
            "success": True,
            "campaign_id": campaign_id,
            "invoice_id": inv['id'],
            "payment_status": body.new_status,
            "settlement_invoice": settlement,
            "message": f"Payment {body.new_status}.",
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update payment status: {str(e)}")
    finally:
        cur.close()
        conn.close()


@router.post("/payments/{campaign_id}/invoice")
async def upload_advertiser_invoice(
    campaign_id: int,
    file: UploadFile = File(...),
    admin_id: Optional[int] = Form(None),
):
    """Admin uploads the advertiser invoice (image or PDF) for a VERIFIED advance
    payment. Stored in B2; its URL is recorded on the advance invoice's
    admin_invoice_url. Only allowed once the payment has been verified."""
    verify_payments_access(admin_id)

    content_type = (file.content_type or '').lower()
    if not (content_type.startswith('image/') or content_type == 'application/pdf'):
        raise HTTPException(status_code=400, detail="Invoice must be an image or PDF")
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    conn = get_advertiser_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT id, advertiser_id, status FROM campaign_invoices
            WHERE campaign_id = %s AND invoice_type = 'advance'
            ORDER BY id DESC LIMIT 1
        """, (campaign_id,))
        inv = cur.fetchone()
        if not inv:
            raise HTTPException(status_code=404, detail="No advance-payment receipt found for this campaign")
        if inv['status'] != 'verified':
            raise HTTPException(status_code=400, detail="Verify the payment before uploading an invoice.")

        from backblaze_service import get_backblaze_service
        b2_service = get_backblaze_service()
        result = b2_service.upload_file(
            file_data=contents,
            file_name=file.filename or f"invoice_campaign_{campaign_id}",
            file_type='document',
            user_id=f"advertiser_{inv['advertiser_id']}",
            content_type=file.content_type,
        )
        if not result or not result.get('url'):
            raise HTTPException(status_code=500, detail="Invoice upload failed")
        invoice_url = result['url']

        cur.execute("""
            UPDATE campaign_invoices
            SET admin_invoice_url = %s, updated_at = NOW()
            WHERE id = %s
        """, (invoice_url, inv['id']))
        conn.commit()
        return {
            "success": True,
            "campaign_id": campaign_id,
            "invoice_id": inv['id'],
            "admin_invoice_url": invoice_url,
            "message": "Advertiser invoice uploaded.",
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to upload invoice: {str(e)}")
    finally:
        cur.close()
        conn.close()


class SettlementInvoiceRequest(BaseModel):
    admin_id: Optional[int] = None


@router.post("/payments/{campaign_id}/settlement-invoice")
async def issue_settlement_invoice(campaign_id: int, body: SettlementInvoiceRequest):
    """Issue the remaining-balance settlement invoice for a campaign (the second
    payment, after the verified advance). Creates a 'final_settlement' row on
    campaign_invoices for (campaign_budget - advance), so every payment has its
    own invoice. Idempotent: returns the existing settlement invoice if one was
    already issued. Requires the advance payment to be verified first."""
    verify_payments_access(body.admin_id)

    conn = get_advertiser_db()
    try:
        cur = conn.cursor()
        # Disambiguate the "can't settle yet" case for a clear admin message.
        cur.execute("""
            SELECT status FROM campaign_invoices
            WHERE campaign_id = %s AND invoice_type = 'advance'
            ORDER BY id DESC LIMIT 1
        """, (campaign_id,))
        adv = cur.fetchone()
        if not adv:
            raise HTTPException(status_code=404, detail="No advance-payment receipt found for this campaign")
        if adv['status'] != 'verified':
            raise HTTPException(status_code=400, detail="Verify the advance payment before issuing the settlement invoice.")

        result = _create_settlement_invoice(cur, campaign_id)
        if not result:
            raise HTTPException(status_code=404, detail="Campaign not found")
        conn.commit()
        return {
            "success": True,
            "campaign_id": campaign_id,
            **result,
            "message": "Settlement invoice already issued." if result["already_issued"] else "Settlement invoice issued.",
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to issue settlement invoice: {str(e)}")
    finally:
        cur.close()
        conn.close()
