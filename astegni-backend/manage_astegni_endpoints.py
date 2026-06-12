"""
Manage-Astegni endpoints — back the admin "Manage Astegni" page (manage-astegni.html).

Resources, each with public reads (consumed by index.html) and admin-only
writes (consumed by the admin page):

  - Partners              -> index.html "Trusted Partners"
  - Partner applications  -> partner_requests submitted via index.html; admin verify/reject
  - Featured videos       -> index.html "Featured Content" carousel (admin uploads to B2)
  - Professional reviews  -> index.html "Expert Reviews & Recognition" (admin-authored)
  - User testimonials     -> index.html "Success Stories" (real user astegni_reviews the
                             admin features). astegni_reviews lives in the ADMIN db; the
                             reviewer's name/picture live in the USER db, so those are
                             fetched separately and merged (no cross-DB JOIN is possible).

Admin writes are guarded by get_current_admin (JWT, type=="admin"). Public reads
take no auth. Tables created by migrate_create_manage_astegni_tables.py.
"""

import os
from typing import Optional
from datetime import datetime

import psycopg
from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from dotenv import load_dotenv

from admin_auth_endpoints import get_current_admin
from backblaze_service import BackblazeService

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ADMIN_DATABASE_URL = os.getenv(
    "ADMIN_DATABASE_URL",
    "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db",
)

router = APIRouter()
b2_service = BackblazeService()


def _conn():
    """Open a user-db connection with dict rows."""
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)


def _admin_conn():
    """Open an admin-db connection with dict rows (astegni_reviews lives here)."""
    return psycopg.connect(ADMIN_DATABASE_URL, row_factory=dict_row)


def _fetch_user_profiles(user_ids):
    """Map {user_id: {name, profile_picture, role}} from the USER db.

    astegni_reviews only stores reviewer_id; names/avatars live in users (a
    different database), so we look them up here and merge in Python.
    """
    ids = [i for i in {*user_ids} if i is not None]
    if not ids:
        return {}
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id,
                   TRIM(CONCAT_WS(' ', first_name, father_name)) AS name,
                   profile_picture,
                   active_role
            FROM users
            WHERE id = ANY(%s)
            """,
            (ids,),
        )
        rows = cur.fetchall()
    return {
        r["id"]: {
            "name": r["name"] or "Astegni User",
            "profile_picture": r["profile_picture"],
            "role": r["active_role"],
        }
        for r in rows
    }


# ============================================================
# PARTNERS
# ============================================================

@router.get("/api/partners")
async def list_partners(include_inactive: bool = Query(False)):
    """Public: partner orgs for index.html. Active-only unless include_inactive."""
    where = "" if include_inactive else "WHERE is_active = TRUE"
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id, name, logo_url, website, description, is_active, sort_order
            FROM partners
            {where}
            ORDER BY sort_order ASC, id ASC
            """
        )
        rows = cur.fetchall()

    partners = [
        {
            "id": r["id"],
            "name": r["name"],
            # Keep the legacy key "logo" the frontend already reads.
            "logo": r["logo_url"],
            "website": r["website"],
            "description": r["description"],
            "is_active": r["is_active"],
            "sort_order": r["sort_order"],
        }
        for r in rows
    ]
    return {"partners": partners, "total": len(partners)}


@router.post("/api/admin/partners")
async def create_partner(
    name: str = Form(...),
    website: str = Form(""),
    description: str = Form(""),
    sort_order: int = Form(0),
    logo: Optional[UploadFile] = File(None),
    logo_url: str = Form(""),
    admin=Depends(get_current_admin),
):
    """Admin: add a partner. Logo via file upload (B2) or a pasted logo_url."""
    final_logo_url = logo_url.strip() or None
    if logo is not None:
        content = await logo.read()
        if content:
            result = b2_service.upload_file(
                file_data=content,
                file_name=logo.filename,
                file_type="brand_logo",
                content_type=logo.content_type,
                user_id=f"admin_{admin['id']}",
            )
            if not result or not result.get("url"):
                raise HTTPException(status_code=502, detail="Logo upload failed")
            final_logo_url = result["url"]

    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO partners (name, logo_url, website, description, sort_order, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (name, final_logo_url, website.strip() or None, description.strip() or None,
             sort_order, admin["id"]),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
    return {"success": True, "id": new_id}


@router.put("/api/admin/partners/{partner_id}")
async def update_partner(
    partner_id: int,
    name: str = Form(...),
    website: str = Form(""),
    description: str = Form(""),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    logo: Optional[UploadFile] = File(None),
    logo_url: str = Form(""),
    admin=Depends(get_current_admin),
):
    """Admin: edit a partner. Uploading a new logo replaces it; otherwise logo_url wins."""
    new_logo_url = logo_url.strip() or None
    if logo is not None:
        content = await logo.read()
        if content:
            result = b2_service.upload_file(
                file_data=content,
                file_name=logo.filename,
                file_type="brand_logo",
                content_type=logo.content_type,
                user_id=f"admin_{admin['id']}",
            )
            if not result or not result.get("url"):
                raise HTTPException(status_code=502, detail="Logo upload failed")
            new_logo_url = result["url"]

    with _conn() as conn, conn.cursor() as cur:
        # Only overwrite logo_url when we actually have a new value, so an edit
        # that doesn't touch the logo keeps the existing one.
        if new_logo_url is not None:
            cur.execute(
                """
                UPDATE partners
                SET name=%s, logo_url=%s, website=%s, description=%s,
                    sort_order=%s, is_active=%s, updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (name, new_logo_url, website.strip() or None, description.strip() or None,
                 sort_order, is_active, partner_id),
            )
        else:
            cur.execute(
                """
                UPDATE partners
                SET name=%s, website=%s, description=%s,
                    sort_order=%s, is_active=%s, updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (name, website.strip() or None, description.strip() or None,
                 sort_order, is_active, partner_id),
            )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Partner not found")
        conn.commit()
    return {"success": True}


@router.delete("/api/admin/partners/{partner_id}")
async def delete_partner(partner_id: int, admin=Depends(get_current_admin)):
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM partners WHERE id=%s", (partner_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Partner not found")
        conn.commit()
    return {"success": True}


# ============================================================
# FEATURED VIDEOS
# ============================================================

@router.get("/api/featured-videos")
async def list_featured_videos(include_inactive: bool = Query(False)):
    """Public: featured videos for index.html "Featured Content" carousel."""
    where = "" if include_inactive else "WHERE is_active = TRUE"
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id, title, description, category, video_url, thumbnail_url,
                   duration, is_active, sort_order, views
            FROM featured_videos
            {where}
            ORDER BY sort_order ASC, id DESC
            """
        )
        rows = cur.fetchall()
    return {"videos": rows, "total": len(rows)}


@router.post("/api/admin/featured-videos")
async def create_featured_video(
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("all"),
    duration: str = Form(""),
    sort_order: int = Form(0),
    video: UploadFile = File(...),
    thumbnail: Optional[UploadFile] = File(None),
    admin=Depends(get_current_admin),
):
    """Admin: upload a new featured video file (and optional thumbnail) to B2."""
    video_bytes = await video.read()
    if not video_bytes:
        raise HTTPException(status_code=400, detail="Empty video file")

    video_result = b2_service.upload_file(
        file_data=video_bytes,
        file_name=video.filename,
        file_type="video",
        content_type=video.content_type,
        user_id=f"admin_{admin['id']}",
    )
    if not video_result or not video_result.get("url"):
        raise HTTPException(status_code=502, detail="Video upload failed")
    video_url = video_result["url"]

    thumbnail_url = None
    if thumbnail is not None:
        thumb_bytes = await thumbnail.read()
        if thumb_bytes:
            thumb_result = b2_service.upload_file(
                file_data=thumb_bytes,
                file_name=thumbnail.filename,
                file_type="thumbnail",
                content_type=thumbnail.content_type,
                user_id=f"admin_{admin['id']}",
            )
            thumbnail_url = thumb_result.get("url") if thumb_result else None

    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO featured_videos
                (title, description, category, video_url, thumbnail_url, duration, sort_order, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (title, description.strip() or None, category or "all", video_url,
             thumbnail_url, duration.strip() or None, sort_order, admin["id"]),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
    return {"success": True, "id": new_id, "video_url": video_url}


@router.put("/api/admin/featured-videos/{video_id}")
async def update_featured_video(
    video_id: int,
    title: str = Form(...),
    description: str = Form(""),
    category: str = Form("all"),
    duration: str = Form(""),
    sort_order: int = Form(0),
    is_active: bool = Form(True),
    admin=Depends(get_current_admin),
):
    """Admin: edit a featured video's metadata (the file itself is immutable here)."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE featured_videos
            SET title=%s, description=%s, category=%s, duration=%s,
                sort_order=%s, is_active=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (title, description.strip() or None, category or "all", duration.strip() or None,
             sort_order, is_active, video_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Video not found")
        conn.commit()
    return {"success": True}


@router.delete("/api/admin/featured-videos/{video_id}")
async def delete_featured_video(video_id: int, admin=Depends(get_current_admin)):
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM featured_videos WHERE id=%s", (video_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Video not found")
        conn.commit()
    return {"success": True}


# ============================================================
# TESTIMONIALS (professional reviews)
# ============================================================

def _testimonial_public(r):
    """Shape a row the way index.html's professional-review.js expects."""
    return {
        "id": r["id"],
        "reviewer": {
            "name": r["reviewer_name"],
            "title": r["title"],
            "organization": r["organization"],
            "avatar": r["avatar_url"] or "https://ui-avatars.com/api/?name="
                      + (r["reviewer_name"] or "Astegni").replace(" ", "+"),
        },
        "review": r["review"],
        "rating": r["rating"],
        "type": "professional",
        "expertise": r["expertise"],
        "verified": r["is_verified"],
    }


@router.get("/api/reviews")
async def list_reviews(
    type: str = Query("professional"),
    featured: Optional[bool] = Query(None),
    limit: int = Query(6, ge=1, le=50),
):
    """Public: professional testimonials for index.html "Success Stories".

    Mirrors the contract professional-review.js calls:
    /api/reviews?type=professional&featured=true&limit=6

    This table only holds professional testimonials, so a request for any other
    `type` (student/parent/tutor) returns an empty list rather than erroring.
    """
    if type not in ("all", "professional"):
        return {"reviews": [], "total": 0, "stats": []}

    clauses = ["is_active = TRUE"]
    if featured:
        clauses.append("is_featured = TRUE")
    where = "WHERE " + " AND ".join(clauses)

    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id, reviewer_name, title, organization, expertise, review,
                   rating, avatar_url, is_verified
            FROM astegni_testimonials
            {where}
            ORDER BY sort_order ASC, id DESC
            LIMIT %s
            """,
            [limit],
        )
        rows = cur.fetchall()

    return {"reviews": [_testimonial_public(r) for r in rows], "total": len(rows)}


@router.get("/api/admin/testimonials")
async def admin_list_testimonials(admin=Depends(get_current_admin)):
    """Admin: full list including inactive, raw columns for editing."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, reviewer_name, title, organization, expertise, review,
                   rating, avatar_url, is_verified, is_active, is_featured, sort_order
            FROM astegni_testimonials
            ORDER BY sort_order ASC, id DESC
            """
        )
        rows = cur.fetchall()
    return {"testimonials": rows, "total": len(rows)}


@router.post("/api/admin/testimonials")
async def create_testimonial(
    reviewer_name: str = Form(...),
    title: str = Form(""),
    organization: str = Form(""),
    expertise: str = Form(""),
    review: str = Form(...),
    rating: int = Form(5),
    is_verified: bool = Form(True),
    is_featured: bool = Form(True),
    sort_order: int = Form(0),
    avatar: Optional[UploadFile] = File(None),
    avatar_url: str = Form(""),
    admin=Depends(get_current_admin),
):
    """Admin: add a professional testimonial. Avatar via upload (B2) or pasted URL."""
    final_avatar = avatar_url.strip() or None
    if avatar is not None:
        content = await avatar.read()
        if content:
            result = b2_service.upload_file(
                file_data=content,
                file_name=avatar.filename,
                file_type="profile",
                content_type=avatar.content_type,
                user_id=f"admin_{admin['id']}",
            )
            if not result or not result.get("url"):
                raise HTTPException(status_code=502, detail="Avatar upload failed")
            final_avatar = result["url"]

    rating = max(1, min(5, rating))
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO astegni_testimonials
                (reviewer_name, title, organization, expertise, review, rating,
                 avatar_url, is_verified, is_featured, sort_order, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (reviewer_name, title.strip() or None, organization.strip() or None,
             expertise.strip() or None, review, rating, final_avatar,
             is_verified, is_featured, sort_order, admin["id"]),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
    return {"success": True, "id": new_id}


@router.put("/api/admin/testimonials/{testimonial_id}")
async def update_testimonial(
    testimonial_id: int,
    reviewer_name: str = Form(...),
    title: str = Form(""),
    organization: str = Form(""),
    expertise: str = Form(""),
    review: str = Form(...),
    rating: int = Form(5),
    is_verified: bool = Form(True),
    is_featured: bool = Form(True),
    is_active: bool = Form(True),
    sort_order: int = Form(0),
    avatar: Optional[UploadFile] = File(None),
    avatar_url: str = Form(""),
    admin=Depends(get_current_admin),
):
    """Admin: edit a testimonial. New avatar upload replaces; else avatar_url wins; else unchanged."""
    new_avatar = avatar_url.strip() or None
    if avatar is not None:
        content = await avatar.read()
        if content:
            result = b2_service.upload_file(
                file_data=content,
                file_name=avatar.filename,
                file_type="profile",
                content_type=avatar.content_type,
                user_id=f"admin_{admin['id']}",
            )
            if not result or not result.get("url"):
                raise HTTPException(status_code=502, detail="Avatar upload failed")
            new_avatar = result["url"]

    rating = max(1, min(5, rating))
    with _conn() as conn, conn.cursor() as cur:
        if new_avatar is not None:
            cur.execute(
                """
                UPDATE astegni_testimonials
                SET reviewer_name=%s, title=%s, organization=%s, expertise=%s,
                    review=%s, rating=%s, avatar_url=%s, is_verified=%s,
                    is_featured=%s, is_active=%s, sort_order=%s, updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (reviewer_name, title.strip() or None, organization.strip() or None,
                 expertise.strip() or None, review, rating, new_avatar, is_verified,
                 is_featured, is_active, sort_order, testimonial_id),
            )
        else:
            cur.execute(
                """
                UPDATE astegni_testimonials
                SET reviewer_name=%s, title=%s, organization=%s, expertise=%s,
                    review=%s, rating=%s, is_verified=%s,
                    is_featured=%s, is_active=%s, sort_order=%s, updated_at=CURRENT_TIMESTAMP
                WHERE id=%s
                """,
                (reviewer_name, title.strip() or None, organization.strip() or None,
                 expertise.strip() or None, review, rating, is_verified,
                 is_featured, is_active, sort_order, testimonial_id),
            )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Testimonial not found")
        conn.commit()
    return {"success": True}


@router.post("/api/admin/testimonials/{testimonial_id}/feature")
async def set_testimonial_featured(
    testimonial_id: int,
    is_featured: bool = Form(...),
    admin=Depends(get_current_admin),
):
    """Admin: quick-toggle whether a professional review shows on the home page."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE astegni_testimonials SET is_featured=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s",
            (is_featured, testimonial_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Testimonial not found")
        conn.commit()
    return {"success": True, "is_featured": is_featured}


@router.delete("/api/admin/testimonials/{testimonial_id}")
async def delete_testimonial(testimonial_id: int, admin=Depends(get_current_admin)):
    with _conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM astegni_testimonials WHERE id=%s", (testimonial_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Testimonial not found")
        conn.commit()
    return {"success": True}


# ============================================================
# PARTNER APPLICATIONS (partner_requests submitted via index.html)
# ============================================================

@router.get("/api/admin/partner-applications")
async def list_partner_applications(
    status: Optional[str] = Query(None),
    admin=Depends(get_current_admin),
):
    """Admin: list partnership applications (partner_requests), newest first."""
    clauses, params = [], []
    if status and status != "all":
        clauses.append("status = %s")
        params.append(status)
    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id, company_name, contact_person, emails, phones,
                   partnership_type, partnership_type_category, description,
                   proposal_file_path, status, created_at, reviewed_at, admin_notes
            FROM partner_requests
            {where}
            ORDER BY created_at DESC
            """,
            params,
        )
        rows = cur.fetchall()
    # emails/phones are stored as JSON; psycopg returns them already parsed for
    # jsonb, but tolerate text too.
    import json as _json
    for r in rows:
        for k in ("emails", "phones"):
            if isinstance(r.get(k), str):
                try:
                    r[k] = _json.loads(r[k])
                except Exception:
                    r[k] = [r[k]]
    return {"applications": rows, "total": len(rows)}


@router.post("/api/admin/partner-applications/{request_id}/reject")
async def reject_partner_application(
    request_id: int,
    admin_notes: str = Form(""),
    admin=Depends(get_current_admin),
):
    """Admin: reject a partnership application."""
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE partner_requests
            SET status='rejected', reviewed_by=%s, reviewed_at=CURRENT_TIMESTAMP,
                admin_notes=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (admin["id"], admin_notes.strip() or None, request_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Application not found")
        conn.commit()
    return {"success": True}


@router.post("/api/admin/partner-applications/{request_id}/approve")
async def approve_partner_application(
    request_id: int,
    logo_url: str = Form(""),
    website: str = Form(""),
    admin_notes: str = Form(""),
    admin=Depends(get_current_admin),
):
    """Admin: approve an application AND create the corresponding live partner.

    Verifying an application promotes it into the public `partners` list shown
    on index.html.
    """
    with _conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT company_name, description, status FROM partner_requests WHERE id=%s",
            (request_id,),
        )
        app = cur.fetchone()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")

        cur.execute(
            """
            UPDATE partner_requests
            SET status='approved', reviewed_by=%s, reviewed_at=CURRENT_TIMESTAMP,
                admin_notes=%s, updated_at=CURRENT_TIMESTAMP
            WHERE id=%s
            """,
            (admin["id"], admin_notes.strip() or None, request_id),
        )

        # Create the public partner from the application (idempotent-ish: a
        # re-approve just inserts again, which admins can clean up in the
        # partners panel — kept simple intentionally).
        cur.execute(
            """
            INSERT INTO partners (name, logo_url, website, description, created_by)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (app["company_name"] or "Partner", logo_url.strip() or None,
             website.strip() or None, app["description"], admin["id"]),
        )
        partner_id = cur.fetchone()["id"]
        conn.commit()
    return {"success": True, "partner_id": partner_id}


# ============================================================
# USER TESTIMONIALS (real user reviews of Astegni — astegni_reviews in admin db)
# Admins browse them, view full detail, and toggle is_featured to surface the
# review in index.html "Success Stories".
# ============================================================

def _shape_user_review(r, profiles):
    prof = profiles.get(r["reviewer_id"], {})
    name = prof.get("name") or "Astegni User"
    avatar = prof.get("profile_picture") or (
        "https://ui-avatars.com/api/?name=" + name.replace(" ", "+")
    )
    return {
        "id": r["id"],
        "reviewer_id": r["reviewer_id"],
        "name": name,
        "profile_picture": avatar,
        "role": prof.get("role"),
        "rating": float(r["rating"]) if r.get("rating") is not None else None,
        "ease_of_use": r.get("ease_of_use"),
        "features_quality": r.get("features_quality"),
        "support_quality": r.get("support_quality"),
        "pricing": r.get("pricing"),
        "review_text": r.get("review_text"),
        "would_recommend": r.get("would_recommend"),
        "is_featured": r.get("is_featured", False),
        "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
    }


@router.get("/api/admin/user-reviews")
async def admin_list_user_reviews(
    featured_only: bool = Query(False),
    admin=Depends(get_current_admin),
):
    """Admin: list user-submitted Astegni reviews with reviewer profile data."""
    where = "WHERE is_featured = TRUE" if featured_only else ""
    with _admin_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id, reviewer_id, rating, ease_of_use,
                   features_quality, support_quality, pricing, review_text,
                   would_recommend, is_featured, created_at
            FROM astegni_reviews
            {where}
            ORDER BY is_featured DESC, created_at DESC
            """
        )
        rows = cur.fetchall()
    profiles = _fetch_user_profiles([r["reviewer_id"] for r in rows])
    return {"reviews": [_shape_user_review(r, profiles) for r in rows], "total": len(rows)}


@router.post("/api/admin/user-reviews/{review_id}/feature")
async def set_user_review_featured(
    review_id: int,
    is_featured: bool = Form(...),
    admin=Depends(get_current_admin),
):
    """Admin: toggle whether a user review is featured on the home page."""
    with _admin_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE astegni_reviews SET is_featured=%s, updated_at=CURRENT_TIMESTAMP WHERE id=%s",
            (is_featured, review_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Review not found")
        conn.commit()
    return {"success": True, "is_featured": is_featured}


@router.get("/api/featured-reviews")
async def list_featured_user_reviews(limit: int = Query(12, ge=1, le=50)):
    """Public: featured user reviews for index.html "Success Stories".

    Only reviews with written text are surfaced (a star-only review makes a poor
    testimonial card).
    """
    with _admin_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, reviewer_id, rating, review_text, created_at
            FROM astegni_reviews
            WHERE is_featured = TRUE
              AND review_text IS NOT NULL
              AND TRIM(review_text) <> ''
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = cur.fetchall()
    profiles = _fetch_user_profiles([r["reviewer_id"] for r in rows])
    reviews = []
    for r in rows:
        prof = profiles.get(r["reviewer_id"], {})
        name = prof.get("name") or "Astegni User"
        reviews.append({
            "id": r["id"],
            "name": name,
            "profile_picture": prof.get("profile_picture")
                or ("https://ui-avatars.com/api/?name=" + name.replace(" ", "+")),
            "role": prof.get("role"),
            "rating": round(float(r["rating"])) if r.get("rating") is not None else 5,
            "review_text": r["review_text"],
        })
    return {"reviews": reviews, "total": len(reviews)}
