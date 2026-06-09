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

from fastapi import APIRouter, HTTPException
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


def _resolve_advertiser_names(rows: List[dict]) -> dict:
    """Map advertiser_id -> display name via advertiser_profiles.user_id -> users (cross-DB)."""
    adv_ids = [r['advertiser_id'] for r in rows if r.get('advertiser_id')]
    if not adv_ids:
        return {}
    # advertiser_id -> user_id (advertiser DB)
    with get_advertiser_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, user_id, company_name FROM advertiser_profiles WHERE id = ANY(%s)",
                (adv_ids,),
            )
            adv = {r['id']: r for r in cur.fetchall()}
    user_ids = [a['user_id'] for a in adv.values() if a.get('user_id')]
    users = {}
    if user_ids:
        with get_user_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT id, first_name, father_name, email FROM users WHERE id = ANY(%s)",
                    (user_ids,),
                )
                users = {r['id']: r for r in cur.fetchall()}
    out = {}
    for adv_id, a in adv.items():
        u = users.get(a.get('user_id'))
        name = a.get('company_name') or (
            f"{u['first_name']} {u['father_name']}".strip() if u else None
        )
        out[adv_id] = {"name": name or "Unknown", "email": u['email'] if u else None}
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
                   ci.invoice_pdf_url, ci.notes, ci.issued_at, ci.updated_at,
                   cp.name AS campaign_name, cp.company_id,
                   bp.name AS brand_name, comp.company_name
            FROM campaign_invoices ci
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
                "notes": r['notes'],
                "issued_at": str(r['issued_at']) if r['issued_at'] else None,
                "updated_at": str(r['updated_at']) if r['updated_at'] else None,
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

        note = (body.reason or '').strip() or (
            'Payment verified by admin' if body.new_status == 'verified' else None
        )
        cur.execute("""
            UPDATE campaign_invoices
            SET status = %s,
                paid_at = CASE WHEN %s = 'verified' THEN NOW() ELSE paid_at END,
                notes = COALESCE(%s, notes),
                updated_at = NOW()
            WHERE id = %s
        """, (body.new_status, body.new_status, note, inv['id']))
        conn.commit()
        return {
            "success": True,
            "campaign_id": campaign_id,
            "invoice_id": inv['id'],
            "payment_status": body.new_status,
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
