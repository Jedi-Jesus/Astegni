"""
Advertiser Companies endpoints.

One advertiser can own multiple companies. Each company has its own brands,
campaigns, billing wallet, and KYC verification status. This module exposes
the company-level CRUD + verification flow.

See DESIGN_company_profile_restructure.md and migrate_introduce_company_profile.py
for the data model.

Routes (all under prefix /api/advertiser):
    POST   /companies                                Create a company under the current advertiser
    GET    /companies                                List my companies
    GET    /companies/{company_id}                   Get one company (must belong to me)
    PUT    /companies/{company_id}                   Update editable fields
    DELETE /companies/{company_id}                   Delete (only if it has no brands)
    GET    /companies/{company_id}/brands            Brands belonging to this company
    POST   /companies/{company_id}/submit-verification    Submit company for KYC review
    GET    /companies/{company_id}/verification-status    Current verification state + checklist

Ownership: every route looks up the current_user's advertiser_profile and
verifies that company.advertiser_id matches it. Cross-advertiser access
returns 403.
"""

import os
from datetime import datetime, timedelta
from typing import List, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from utils import get_current_user
from advertiser_auth_endpoints import resolve_advertiser

load_dotenv()

router = APIRouter(prefix="/api/advertiser", tags=["Advertiser Companies"])

DATABASE_URL = os.getenv(
    "ADVERTISER_DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_advertiser_db",
)


def get_db():
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


# ============================================================
# Pydantic request/response models (kept local; mirrors models.py)
# ============================================================

class CompanyCreate(BaseModel):
    company_name: str
    industry: Optional[str] = None
    company_size: Optional[str] = None
    business_reg_no: Optional[str] = None       # BIN: business registration number (text)
    tin_number: Optional[str] = None            # TIN: tax identification number (text)
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    company_description: Optional[str] = None
    company_email: Optional[List[str]] = None
    company_phone: Optional[List[str]] = None
    company_logo: Optional[str] = None          # B2 URL (uploaded separately, optional)
    business_license_url: Optional[str] = None  # B2 URL (uploaded separately)


class CompanyUpdate(BaseModel):
    company_name: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    business_reg_no: Optional[str] = None
    tin_number: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    company_description: Optional[str] = None
    company_email: Optional[List[str]] = None
    company_phone: Optional[List[str]] = None
    company_logo: Optional[str] = None
    business_license_url: Optional[str] = None


# ============================================================
# Internal helpers
# ============================================================

def _current_advertiser_profile_id(current_user) -> int:
    """Resolve the current user's advertiser_profile.id, or 403."""
    role_ids = getattr(current_user, "role_ids", None) or {}
    advertiser_profile_id = role_ids.get("advertiser")
    if not advertiser_profile_id:
        raise HTTPException(status_code=403, detail="Not authorized as advertiser")
    return advertiser_profile_id


def _load_owned_company(cur, advertiser_profile_id: int, company_id: int) -> dict:
    """Fetch a company row, verifying it belongs to this advertiser. 404 if not found, 403 if not owned."""
    cur.execute("SELECT * FROM company_profile WHERE id = %s", (company_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Company not found")
    if row["advertiser_id"] != advertiser_profile_id:
        raise HTTPException(status_code=403, detail="You do not own this company")
    return row


def _serialize(row: dict) -> dict:
    """Cast Decimal balance/etc. to float so JSON serialization works."""
    out = dict(row)
    for k in ("balance", "total_deposits", "total_spent", "default_cancellation_fee_percent"):
        if out.get(k) is not None:
            out[k] = float(out[k])
    for k in ("created_at", "updated_at", "verified_at", "rejected_at",
              "verification_submitted_at", "verification_reviewed_at",
              "verification_escalated_at", "last_transaction_at"):
        if isinstance(out.get(k), datetime):
            out[k] = out[k].isoformat()
    return out


def _verification_state(tin_number, business_license_url) -> Optional[str]:
    """Decide the verification_status a company should have based on submitted data.

    Rule (until government auto-verification exists):
      - TIN number AND an uploaded business license  -> 'pending' (admin must review)
      - otherwise                                     -> None / 'unverified'
        (advertiser hasn't supplied enough to be reviewed; not shown to admins)

    Logo is optional and does not affect verification.
    """
    has_tin = bool((tin_number or "").strip())
    has_license = bool((business_license_url or "").strip())
    if has_tin and has_license:
        return "pending"
    return None


def _business_days_since(dt: Optional[datetime], now: datetime) -> int:
    """Whole business days (Mon-Fri, weekends excluded) elapsed between dt and now.

    Counts only fully-elapsed 24h spans, then subtracts any Saturdays/Sundays
    that fall within the elapsed window. No public-holiday calendar.
    """
    if not dt:
        return 0
    # Normalize naive/aware mismatch by comparing on naive UTC.
    if dt.tzinfo is not None:
        dt = dt.replace(tzinfo=None)
    if now.tzinfo is not None:
        now = now.replace(tzinfo=None)
    if now <= dt:
        return 0
    days = 0
    cursor = dt
    while cursor + timedelta(days=1) <= now:
        cursor += timedelta(days=1)
        if cursor.weekday() < 5:  # Mon=0 .. Fri=4 count; Sat/Sun skipped
            days += 1
    return days


# ============================================================
# CRUD
# ============================================================

@router.post("/companies", status_code=201)
async def create_company(payload: CompanyCreate, current_user=Depends(resolve_advertiser)):
    """Create a new company under the current advertiser."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)

    # Person-KYC gate: the account owner must be identity-verified before creating
    # any company. This stops an unvetted person from spinning up a business entity.
    with get_db() as _c:
        with _c.cursor() as _cur:
            _cur.execute("SELECT person_verified FROM advertiser_profiles WHERE id = %s", (advertiser_profile_id,))
            _pv = _cur.fetchone()
    if not (_pv and _pv["person_verified"]):
        raise HTTPException(
            status_code=403,
            detail="Verify your identity (KYC) before creating a company.",
        )

    name = (payload.company_name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="company_name is required")

    # A company with TIN + business license is auto-submitted for admin review
    # (verification_status='pending'); otherwise it stays unverified.
    new_status = _verification_state(payload.tin_number, payload.business_license_url)
    submitted_at = datetime.utcnow() if new_status == "pending" else None

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO company_profile (
                        advertiser_id,
                        company_name, industry, company_size, business_reg_no, tin_number,
                        website, address, city, company_description,
                        company_email, company_phone,
                        company_logo, business_license_url,
                        verification_status, verification_submitted_at
                    ) VALUES (
                        %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s
                    )
                    RETURNING *
                    """,
                    (
                        advertiser_profile_id,
                        name, payload.industry, payload.company_size,
                        payload.business_reg_no, payload.tin_number,
                        payload.website, payload.address, payload.city, payload.company_description,
                        Jsonb(payload.company_email or []), Jsonb(payload.company_phone or []),
                        payload.company_logo, payload.business_license_url,
                        new_status, submitted_at,
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return {"message": "Company created", "company": _serialize(row)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create company: {e}")


@router.get("/companies")
async def list_companies(current_user=Depends(resolve_advertiser)):
    """List companies owned by the current advertiser."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT * FROM company_profile WHERE advertiser_id = %s ORDER BY id",
                    (advertiser_profile_id,),
                )
                rows = cur.fetchall()
                return {"companies": [_serialize(r) for r in rows], "total": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{company_id}")
async def get_company(company_id: int, current_user=Depends(resolve_advertiser)):
    """Get one company. Must belong to the current advertiser."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                row = _load_owned_company(cur, advertiser_profile_id, company_id)
                return {"company": _serialize(row)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/companies/{company_id}")
async def update_company(company_id: int, payload: CompanyUpdate, current_user=Depends(resolve_advertiser)):
    """Update editable identity fields. Wallet / verification fields are not editable here.

    If company_name changes, B2 files under the company's subtree are re-migrated
    to the new path (advertisements/{new_name}/...). Best-effort: if the B2 step
    fails for any file, the DB update is committed first so the rename succeeds;
    failed B2 moves leave the file at its old path (still reachable via DB).
    """
    advertiser_profile_id = _current_advertiser_profile_id(current_user)

    updates = payload.dict(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Normalize JSON-array fields if present
    if "company_email" in updates and updates["company_email"] is not None:
        updates["company_email"] = Jsonb(updates["company_email"])
    if "company_phone" in updates and updates["company_phone"] is not None:
        updates["company_phone"] = Jsonb(updates["company_phone"])

    # Identity fields whose change invalidates a prior verification.
    IDENTITY_FIELDS = {
        "company_name", "industry", "company_size", "business_reg_no", "tin_number",
        "website", "address", "city", "company_description",
        "company_email", "company_phone", "company_logo", "business_license_url",
    }

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership and capture pre-update name (for B2 re-migration detection)
                old = _load_owned_company(cur, advertiser_profile_id, company_id)
                old_company_name = old.get("company_name") if hasattr(old, "get") else old["company_name"]

                # ---- Recompute verification status from the post-update values ----
                eff_tin = updates.get("tin_number", old.get("tin_number"))
                eff_license = updates.get("business_license_url", old.get("business_license_url"))
                qualifies = _verification_state(eff_tin, eff_license)  # 'pending' or None
                old_status = old.get("verification_status")
                was_verified = bool(old.get("is_verified"))

                # Did any identity-relevant field actually change value?
                identity_changed = any(
                    k in updates and updates[k] != old.get(k)
                    for k in IDENTITY_FIELDS
                )

                if qualifies == "pending":
                    if was_verified and identity_changed:
                        # Verified company's info changed -> needs re-verification.
                        updates["is_verified"] = False
                        updates["verification_status"] = "pending"
                        updates["verification_submitted_at"] = datetime.utcnow()
                        updates["verified_at"] = None
                        updates["verification_notes"] = None
                        updates["verification_escalated"] = False
                        updates["verification_escalated_at"] = None
                    elif old_status in (None, "rejected") or (old_status == "suspended" and not was_verified):
                        # Newly has enough data, or fixing a rejection -> (re)submit for review.
                        updates["verification_status"] = "pending"
                        updates["verification_submitted_at"] = datetime.utcnow()
                        updates["rejected_at"] = None
                        updates["verification_notes"] = None
                        updates["verification_escalated"] = False
                        updates["verification_escalated_at"] = None
                else:
                    # No longer qualifies (e.g. license/TIN removed). Only demote if not
                    # currently verified/suspended (don't silently strip an admin decision).
                    if not was_verified and old_status in ("pending", "rejected"):
                        updates["verification_status"] = None
                        updates["verification_submitted_at"] = None
                        updates["verification_escalated"] = False
                        updates["verification_escalated_at"] = None

                set_clauses = [f"{col} = %s" for col in updates.keys()]
                set_clauses.append("updated_at = NOW()")
                values = list(updates.values())
                values.append(company_id)

                cur.execute(
                    f"UPDATE company_profile SET {', '.join(set_clauses)} WHERE id = %s RETURNING *",
                    values,
                )
                row = cur.fetchone()

                # Re-migrate B2 files if company_name changed.
                # Done inside the same transaction so DB + B2 move are visible together.
                new_company_name = updates.get("company_name", old_company_name)
                if new_company_name and new_company_name != old_company_name:
                    from advertiser_b2_paths import slugify, remigrate_rename
                    from backblaze_service import get_backblaze_service
                    old_slug = slugify(old_company_name)
                    new_slug = slugify(new_company_name)
                    if old_slug != new_slug:
                        b2 = get_backblaze_service()
                        if getattr(b2, "configured", False):
                            summary = remigrate_rename(
                                cursor=cur,
                                b2_service=b2,
                                segment="company",
                                old_slug=old_slug,
                                new_slug=new_slug,
                                company_id=company_id,
                            )
                            print(f"[update_company] B2 re-migration: {summary}")
                        else:
                            print("[update_company] B2 not configured; skipping re-migration")

                conn.commit()
                return {"message": "Company updated", "company": _serialize(row)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/companies/{company_id}")
async def delete_company(company_id: int, current_user=Depends(resolve_advertiser)):
    """Delete a company. Refuses if any brands still exist under it (delete the brands first)."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                _load_owned_company(cur, advertiser_profile_id, company_id)
                cur.execute(
                    "SELECT COUNT(*) AS n FROM brand_profile WHERE company_id = %s",
                    (company_id,),
                )
                n_brands = cur.fetchone()["n"]
                if n_brands > 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot delete a company that still owns {n_brands} brand(s). Delete the brands first.",
                    )
                cur.execute("DELETE FROM company_profile WHERE id = %s", (company_id,))
                conn.commit()
                return {"message": "Company deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Brand listing scoped to one company
# ============================================================

@router.get("/companies/{company_id}/brands")
async def list_brands_for_company(company_id: int, current_user=Depends(resolve_advertiser)):
    """List brands belonging to a single company."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                _load_owned_company(cur, advertiser_profile_id, company_id)
                cur.execute(
                    """
                    SELECT bp.*,
                           (SELECT COUNT(*) FROM campaign_profile cp WHERE cp.id = ANY(bp.campaign_ids)) AS campaigns_count
                    FROM brand_profile bp
                    WHERE bp.company_id = %s
                    ORDER BY bp.id
                    """,
                    (company_id,),
                )
                rows = cur.fetchall()
                # Normalize datetime fields
                out = []
                for r in rows:
                    d = dict(r)
                    for k in ("created_at", "updated_at"):
                        if isinstance(d.get(k), datetime):
                            d[k] = d[k].isoformat()
                    out.append(d)
                return {"brands": out, "total": len(out)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Verification flow (per-company KYC)
# ============================================================

# Verification can take up to this many business days before the advertiser
# may escalate ("Notify admins") from the verification-in-progress modal.
VERIFICATION_SLA_BUSINESS_DAYS = 2


@router.post("/companies/{company_id}/submit-verification")
async def submit_company_verification(company_id: int, current_user=Depends(resolve_advertiser)):
    """Submit a company for KYC review.

    Requirements (logo is optional):
      - TIN number
      - business_license_url (uploaded)

    Note: create/update auto-submit when these are present, so this endpoint is
    mainly a manual fallback. Sets verification_status='pending'.
    """
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                row = _load_owned_company(cur, advertiser_profile_id, company_id)

                missing = []
                if not (row.get("tin_number") or "").strip():
                    missing.append("tin_number")
                if not row.get("business_license_url"):
                    missing.append("business_license_url")
                if missing:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cannot submit for verification. Missing required fields: {', '.join(missing)}",
                    )

                if row.get("is_verified"):
                    raise HTTPException(status_code=400, detail="Company is already verified")
                if row.get("verification_status") == "pending":
                    raise HTTPException(status_code=400, detail="Verification already pending review")

                cur.execute(
                    """
                    UPDATE company_profile
                    SET verification_status = 'pending',
                        verification_submitted_at = NOW(),
                        rejected_at = NULL,
                        verification_notes = NULL,
                        verification_escalated = FALSE,
                        verification_escalated_at = NULL,
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (company_id,),
                )
                updated = cur.fetchone()
                conn.commit()
                return {
                    "message": "Company submitted for verification",
                    "company": _serialize(updated),
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/companies/{company_id}/verification-status")
async def get_company_verification_status(company_id: int, current_user=Depends(resolve_advertiser)):
    """Return verification state + reason + escalation eligibility for the company."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                row = _load_owned_company(cur, advertiser_profile_id, company_id)
                docs = {
                    "company_logo":     {"uploaded": bool(row.get("company_logo")),         "url": row.get("company_logo")},
                    "business_license": {"uploaded": bool(row.get("business_license_url")), "url": row.get("business_license_url")},
                }
                status = row.get("verification_status")
                submitted_at = row.get("verification_submitted_at")
                biz_days = _business_days_since(submitted_at, datetime.utcnow()) if status == "pending" else 0
                can_escalate = (
                    status == "pending"
                    and not row.get("verification_escalated")
                    and biz_days >= VERIFICATION_SLA_BUSINESS_DAYS
                )
                has_tin = bool((row.get("tin_number") or "").strip())
                has_license = bool(row.get("business_license_url"))
                return {
                    "company_id": row["id"],
                    "company_name": row["company_name"],
                    "is_verified": bool(row.get("is_verified")),
                    "verification_status": status,
                    "verification_method": row.get("verification_method"),
                    "verified_at": row["verified_at"].isoformat() if isinstance(row.get("verified_at"), datetime) else None,
                    "rejected_at": row["rejected_at"].isoformat() if isinstance(row.get("rejected_at"), datetime) else None,
                    "verification_submitted_at": submitted_at.isoformat() if isinstance(submitted_at, datetime) else None,
                    "verification_reviewed_at": row["verification_reviewed_at"].isoformat() if isinstance(row.get("verification_reviewed_at"), datetime) else None,
                    # Current reason for a rejected/suspended company (admin-written).
                    "verification_notes": row.get("verification_notes"),
                    "verification_escalated": bool(row.get("verification_escalated")),
                    "business_days_pending": biz_days,
                    "sla_business_days": VERIFICATION_SLA_BUSINESS_DAYS,
                    "can_escalate": can_escalate,
                    "documents": docs,
                    "has_tin": has_tin,
                    "has_business_license": has_license,
                    "can_submit_for_verification": has_tin and has_license
                                                   and not row.get("is_verified")
                                                   and status != "pending",
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/notify-admins")
async def notify_admins_verification(company_id: int, current_user=Depends(resolve_advertiser)):
    """Advertiser escalates a long-pending verification (>2 business days).

    Flags the company as escalated so it surfaces in manage-companies. Idempotent:
    a second call while already escalated is a no-op success.
    """
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                row = _load_owned_company(cur, advertiser_profile_id, company_id)
                if row.get("verification_status") != "pending":
                    raise HTTPException(status_code=400, detail="Company is not awaiting verification")
                if row.get("verification_escalated"):
                    return {"message": "Admins already notified", "company": _serialize(row)}

                biz_days = _business_days_since(row.get("verification_submitted_at"), datetime.utcnow())
                if biz_days < VERIFICATION_SLA_BUSINESS_DAYS:
                    raise HTTPException(
                        status_code=400,
                        detail=f"You can notify admins after {VERIFICATION_SLA_BUSINESS_DAYS} business days. "
                               f"Only {biz_days} business day(s) have passed.",
                    )

                cur.execute(
                    """
                    UPDATE company_profile
                    SET verification_escalated = TRUE,
                        verification_escalated_at = NOW(),
                        updated_at = NOW()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (company_id,),
                )
                updated = cur.fetchone()
                conn.commit()
                return {"message": "Admins notified. Your verification has been escalated.",
                        "company": _serialize(updated)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/companies/{company_id}/upload-document")
async def upload_company_document(
    company_id: int,
    doc_type: str = Form(...),                # 'logo' | 'business_license'
    file: UploadFile = File(...),
    current_user=Depends(resolve_advertiser),
):
    """Upload a company logo or business license to B2 and store its URL.

    Files land under {type}/advertisements/{company_slug}/ per advertiser_b2_paths.
    Returns the stored URL. The verification status is NOT changed here; the
    subsequent company create/update (which carries tin_number) decides that.
    """
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    if doc_type not in ("logo", "business_license"):
        raise HTTPException(status_code=400, detail="doc_type must be 'logo' or 'business_license'")

    column = "company_logo" if doc_type == "logo" else "business_license_url"

    try:
        from advertiser_b2_paths import company_folder
        from backblaze_service import get_backblaze_service

        with get_db() as conn:
            with conn.cursor() as cur:
                company = _load_owned_company(cur, advertiser_profile_id, company_id)

                contents = await file.read()
                if not contents:
                    raise HTTPException(status_code=400, detail="Empty file")

                media_type = "documents" if doc_type == "business_license" else "images"
                prefix = "business_license_" if doc_type == "business_license" else "company_logo_"
                safe_name = f"{prefix}{(file.filename or 'file').replace('/', '_')}"
                folder = company_folder(media_type, company["company_name"])

                b2 = get_backblaze_service()
                result = b2.upload_file_to_folder(
                    file_data=contents,
                    file_name=safe_name,
                    folder_path=folder,
                    content_type=file.content_type,
                )
                if not result or not result.get("url"):
                    raise HTTPException(status_code=502, detail="File upload failed (storage not available)")

                url = result["url"]
                cur.execute(
                    f"UPDATE company_profile SET {column} = %s, updated_at = NOW() WHERE id = %s RETURNING *",
                    (url, company_id),
                )
                updated = cur.fetchone()
                conn.commit()
                return {"message": "File uploaded", "doc_type": doc_type, "url": url,
                        "company": _serialize(updated)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
