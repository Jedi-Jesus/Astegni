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
from datetime import datetime
from typing import List, Optional

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from utils import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/advertiser", tags=["Advertiser Companies"])

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db",
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
    business_reg_no: Optional[str] = None
    tin_number: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    company_description: Optional[str] = None
    company_email: Optional[List[str]] = None
    company_phone: Optional[List[str]] = None


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
              "last_transaction_at"):
        if isinstance(out.get(k), datetime):
            out[k] = out[k].isoformat()
    return out


# ============================================================
# CRUD
# ============================================================

@router.post("/companies", status_code=201)
async def create_company(payload: CompanyCreate, current_user=Depends(get_current_user)):
    """Create a new company under the current advertiser."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)

    name = (payload.company_name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="company_name is required")

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO company_profile (
                        advertiser_id,
                        company_name, industry, company_size, business_reg_no, tin_number,
                        website, address, city, company_description,
                        company_email, company_phone
                    ) VALUES (
                        %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
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
async def list_companies(current_user=Depends(get_current_user)):
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
async def get_company(company_id: int, current_user=Depends(get_current_user)):
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
async def update_company(company_id: int, payload: CompanyUpdate, current_user=Depends(get_current_user)):
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

    set_clauses = [f"{col} = %s" for col in updates.keys()]
    set_clauses.append("updated_at = NOW()")
    values = list(updates.values())
    values.append(company_id)

    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                # Verify ownership and capture pre-update name (for B2 re-migration detection)
                old = _load_owned_company(cur, advertiser_profile_id, company_id)
                old_company_name = old.get("company_name") if hasattr(old, "get") else old["company_name"]

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
async def delete_company(company_id: int, current_user=Depends(get_current_user)):
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
async def list_brands_for_company(company_id: int, current_user=Depends(get_current_user)):
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

@router.post("/companies/{company_id}/submit-verification")
async def submit_company_verification(company_id: int, current_user=Depends(get_current_user)):
    """Submit a company for KYC review.

    Required documents (all stored on company_profile):
      - company_logo
      - business_license_url
      - tin_certificate_url
      - company_name + at least one of (industry, business_reg_no)

    Sets verification_status='pending' and verification_submitted_at=now().
    Admin reviews via admin_advertisers_endpoints.py.
    """
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                row = _load_owned_company(cur, advertiser_profile_id, company_id)

                # Required-doc checklist
                missing = []
                if not row.get("company_name"):
                    missing.append("company_name")
                if not row.get("company_logo"):
                    missing.append("company_logo")
                if not row.get("business_license_url"):
                    missing.append("business_license_url")
                if not row.get("tin_certificate_url"):
                    missing.append("tin_certificate_url")
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
async def get_company_verification_status(company_id: int, current_user=Depends(get_current_user)):
    """Return verification state + required-doc checklist for the company."""
    advertiser_profile_id = _current_advertiser_profile_id(current_user)
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                row = _load_owned_company(cur, advertiser_profile_id, company_id)
                docs = {
                    "company_logo":         {"uploaded": bool(row.get("company_logo")),         "url": row.get("company_logo")},
                    "business_license":     {"uploaded": bool(row.get("business_license_url")), "url": row.get("business_license_url")},
                    "tin_certificate":      {"uploaded": bool(row.get("tin_certificate_url")),  "url": row.get("tin_certificate_url")},
                }
                all_uploaded = all(d["uploaded"] for d in docs.values())
                return {
                    "company_id": row["id"],
                    "company_name": row["company_name"],
                    "is_verified": bool(row.get("is_verified")),
                    "verification_status": row.get("verification_status"),
                    "verification_method": row.get("verification_method"),
                    "verified_at": row["verified_at"].isoformat() if isinstance(row.get("verified_at"), datetime) else None,
                    "rejected_at": row["rejected_at"].isoformat() if isinstance(row.get("rejected_at"), datetime) else None,
                    "verification_submitted_at": row["verification_submitted_at"].isoformat() if isinstance(row.get("verification_submitted_at"), datetime) else None,
                    "verification_reviewed_at": row["verification_reviewed_at"].isoformat() if isinstance(row.get("verification_reviewed_at"), datetime) else None,
                    "verification_notes": row.get("verification_notes"),
                    "documents": docs,
                    "all_documents_uploaded": all_uploaded,
                    "can_submit_for_verification": all_uploaded
                                                   and not row.get("is_verified")
                                                   and row.get("verification_status") != "pending",
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
