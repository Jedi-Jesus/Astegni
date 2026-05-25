"""
View Packages Endpoints

Advertiser pricing now sells fixed view (impression) packages instead of
continuous CPI. Each package has a base price for an untargeted /
international / no-placement campaign. Targeting (audience, location,
placement) multiplies that base price using the existing premium columns
on cpi_settings, which we now interpret as *multiplier deltas* (e.g.
tutor_premium = 0.4 means +40%).

Final price formula:

    price = base_price
            * (1 + audience_delta)
            * (1 + location_delta)
            * (1 + placement_delta)

Where each delta is 0 for the "no targeting" choice. Deltas compose
multiplicatively so a targeted campaign on a premium placement is more
expensive than the sum of either alone.

Endpoints
---------
Public (advertiser-facing):
    GET  /api/view-packages                 List active packages
    POST /api/view-packages/price           Quote a price for package + targeting

Admin:
    GET    /api/admin/view-packages           List all packages (incl. inactive)
    POST   /api/admin/view-packages           Create
    PUT    /api/admin/view-packages/{id}      Update
    DELETE /api/admin/view-packages/{id}      Delete
    POST   /api/admin/view-packages/reorder   Reorder via [id, ...]
"""

from __future__ import annotations

import os
from typing import List, Optional

import psycopg
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    "ADMIN_DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db",
)

router = APIRouter(prefix="/api", tags=["View Packages"])


def get_admin_db():
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)


class ViewPackageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    view_count: int = Field(..., gt=0)
    base_price: float = Field(..., ge=0)
    currency: str = "ETB"
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class ViewPackageUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=120)
    view_count: Optional[int] = Field(None, gt=0)
    base_price: Optional[float] = Field(None, ge=0)
    currency: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class PriceQuoteRequest(BaseModel):
    package_id: int
    audience: Optional[str] = None      # tutor, student, parent, advertiser, user, all
    location: Optional[str] = None      # national, international
    placement: Optional[str] = None     # leaderboard-banner, logo, in-session-skyscrapper-banner


class ReorderRequest(BaseModel):
    order: List[int]  # package ids in desired order


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_multipliers(cur) -> dict:
    """Read the active cpi_settings row and return its premium values as
    multiplier deltas. A missing row yields zeros (no targeting uplift)."""
    cur.execute(
        """
        SELECT tutor_premium, student_premium, parent_premium,
               advertiser_premium, user_premium,
               national_premium,
               leaderboard_banner_premium, logo_premium,
               in_session_skyscrapper_banner_premium
        FROM cpi_settings
        WHERE is_active = TRUE
        ORDER BY id DESC
        LIMIT 1
        """
    )
    row = cur.fetchone()
    if not row:
        return {
            "audience": {"tutor": 0, "student": 0, "parent": 0,
                         "advertiser": 0, "user": 0, "all": 0},
            "location": {"national": 0, "international": 0},
            "placement": {"leaderboard-banner": 0, "logo": 0,
                          "in-session-skyscrapper-banner": 0, "none": 0},
        }

    def f(key):
        v = row.get(key)
        return float(v) if v is not None else 0.0

    return {
        "audience": {
            "tutor": f("tutor_premium"),
            "student": f("student_premium"),
            "parent": f("parent_premium"),
            "advertiser": f("advertiser_premium"),
            "user": f("user_premium"),
            "all": 0.0,
        },
        "location": {
            "national": f("national_premium"),
            "international": 0.0,
        },
        "placement": {
            "leaderboard-banner": f("leaderboard_banner_premium"),
            "logo": f("logo_premium"),
            "in-session-skyscrapper-banner": f("in_session_skyscrapper_banner_premium"),
            "none": 0.0,
        },
    }


def _normalize(value: Optional[str], default: str) -> str:
    if not value:
        return default
    v = value.strip().lower()
    # tolerate legacy synonyms
    aliases = {
        "tutors": "tutor", "students": "student", "parents": "parent",
        "advertisers": "advertiser", "users": "user", "global": "international",
        "nationwide": "national",
    }
    return aliases.get(v, v)


def _row_to_dict(row: dict) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "view_count": row["view_count"],
        "base_price": float(row["base_price"]),
        "currency": row["currency"],
        "description": row["description"],
        "display_order": row["display_order"],
        "is_active": row["is_active"],
        "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        "updated_at": row["updated_at"].isoformat() if row.get("updated_at") else None,
    }


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------

@router.get("/view-packages")
async def list_active_view_packages():
    """List active packages for the advertiser-facing checkout."""
    try:
        with get_admin_db() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT * FROM view_packages
                WHERE is_active = TRUE
                ORDER BY display_order ASC, view_count ASC
                """
            )
            packages = [_row_to_dict(r) for r in cur.fetchall()]
            return {"success": True, "packages": packages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/view-packages/price")
async def quote_view_package_price(req: PriceQuoteRequest):
    """Quote a final price for a package combined with targeting.

    Returns base price, each multiplier, and the composed final price.
    """
    audience = _normalize(req.audience, "all")
    location = _normalize(req.location, "international")
    placement = _normalize(req.placement, "none")

    try:
        with get_admin_db() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM view_packages WHERE id = %s AND is_active = TRUE",
                (req.package_id,),
            )
            pkg = cur.fetchone()
            if not pkg:
                raise HTTPException(status_code=404, detail="Package not found")

            mults = _load_multipliers(cur)
            a_delta = mults["audience"].get(audience, 0.0)
            l_delta = mults["location"].get(location, 0.0)
            p_delta = mults["placement"].get(placement, 0.0)

            base = float(pkg["base_price"])
            final = base * (1 + a_delta) * (1 + l_delta) * (1 + p_delta)

            return {
                "success": True,
                "package": _row_to_dict(pkg),
                "targeting": {
                    "audience": audience,
                    "location": location,
                    "placement": placement,
                },
                "multipliers": {
                    "audience": a_delta,
                    "location": l_delta,
                    "placement": p_delta,
                },
                "base_price": base,
                "final_price": round(final, 2),
                "currency": pkg["currency"],
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.get("/admin/view-packages")
async def admin_list_view_packages():
    try:
        with get_admin_db() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM view_packages ORDER BY display_order ASC, id ASC"
            )
            return {
                "success": True,
                "packages": [_row_to_dict(r) for r in cur.fetchall()],
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/view-packages")
async def admin_create_view_package(payload: ViewPackageCreate):
    try:
        with get_admin_db() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO view_packages
                    (name, view_count, base_price, currency, description,
                     display_order, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    payload.name,
                    payload.view_count,
                    payload.base_price,
                    payload.currency,
                    payload.description,
                    payload.display_order,
                    payload.is_active,
                ),
            )
            row = cur.fetchone()
            conn.commit()
            return {"success": True, "package": _row_to_dict(row)}
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="A package with that name already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/admin/view-packages/{package_id}")
async def admin_update_view_package(package_id: int, payload: ViewPackageUpdate):
    fields = payload.dict(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clauses = ", ".join(f"{k} = %s" for k in fields.keys())
    values = list(fields.values()) + [package_id]

    try:
        with get_admin_db() as conn, conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE view_packages
                SET {set_clauses}, updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
                """,
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Package not found")
            conn.commit()
            return {"success": True, "package": _row_to_dict(row)}
    except HTTPException:
        raise
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status_code=409, detail="A package with that name already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/admin/view-packages/{package_id}")
async def admin_delete_view_package(package_id: int):
    try:
        with get_admin_db() as conn, conn.cursor() as cur:
            cur.execute(
                "DELETE FROM view_packages WHERE id = %s RETURNING id",
                (package_id,),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Package not found")
            conn.commit()
            return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/admin/view-packages/reorder")
async def admin_reorder_view_packages(req: ReorderRequest):
    if not req.order:
        raise HTTPException(status_code=400, detail="order must be non-empty")

    try:
        with get_admin_db() as conn, conn.cursor() as cur:
            for index, pkg_id in enumerate(req.order):
                cur.execute(
                    "UPDATE view_packages SET display_order = %s, "
                    "updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                    (index, pkg_id),
                )
            conn.commit()
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
