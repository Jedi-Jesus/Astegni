"""
B2 path construction for the advertiser -> company -> brand -> campaign hierarchy.

Path layout (since the May 2026 reorg; see DESIGN_company_profile_restructure.md
and migrate_introduce_company_profile.py):

    {images|videos|documents|audio}/advertisements/
        {company_name_slug}/                          <- company-level files live here directly
            company_logo_<filename>
            business_license_<filename>
            tin_certificate_<filename>
            ...
            {brand_name_slug}/                        <- brand-level files
                brand_logo_<filename>
                {campaign_name_slug}/                 <- campaign creatives nested deeper
                    {placement_slug}/
                        <filename>

Concrete examples:

    images/advertisements/Jediael_Seyoum_Abebe/company_logo_20260525_204800.jpg
    documents/advertisements/Jediael_Seyoum_Abebe/business_license_20260525_204900.pdf
    images/advertisements/Jediael_Seyoum_Abebe/Astegni/brand_logo_20260525_205000.jpg
    images/advertisements/Jediael_Seyoum_Abebe/Astegni/Advertise/leaderboard-banner/img_20260525_205100.jpg

Why names (not IDs):
  - Browsing the B2 console is human-navigable.
  - DB `campaign_media.file_name` remains the authoritative B2 key — code
    should read paths from there, not reconstruct them.

Renames:
  - Currently renaming a company/brand/campaign does NOT re-migrate B2 files
    (Phase 4 of the restructure, deferred). The DB `file_name` keeps pointing
    at the original path, so files stay reachable. The B2 layout can drift
    from current names; treat it as an organizational convenience, not a
    source of truth.
"""

import re
from typing import Optional

# Slug pattern matches the existing campaign-media sanitizer in routes.py
# (strips everything except word chars, whitespace, hyphens).
_SLUG_STRIP_RE = re.compile(r"[^\w\s-]")


class CompanyResolutionError(Exception):
    """Raised when a company_id can't be resolved for an upload."""


def slugify(name: str) -> str:
    """Sanitize a name segment for use in a B2 path.

    Rules (mirror the legacy campaign-media upload handler):
      - drop everything except word chars, whitespace, hyphens
      - trim leading/trailing whitespace
      - collapse internal spaces to underscores
    """
    if name is None:
        return ""
    cleaned = _SLUG_STRIP_RE.sub("", str(name))
    cleaned = cleaned.strip().replace(" ", "_")
    return cleaned


def resolve_company_for_upload(cursor, advertiser_profile_id: int, company_id: Optional[int] = None):
    """Resolve which company a new upload should be filed under.

    Returns a (company_id, company_name) tuple. Raises CompanyResolutionError
    (callers should convert to HTTPException 400/404) when:

      - company_id is given but doesn't exist or isn't owned by this advertiser
      - company_id is not given and the advertiser owns 0 companies
      - company_id is not given and the advertiser owns 2+ companies (ambiguous;
        caller must specify which company the upload is for)

    Single-company users (current production state) work without specifying
    company_id; the resolver picks the only company automatically.
    """
    if company_id is not None:
        cursor.execute(
            "SELECT id, company_name FROM company_profile WHERE id = %s AND advertiser_id = %s",
            (company_id, advertiser_profile_id),
        )
        row = cursor.fetchone()
        if not row:
            raise CompanyResolutionError(
                f"Company {company_id} not found or not owned by current advertiser."
            )
        return _row_id(row), _row_name(row)

    cursor.execute(
        "SELECT id, company_name FROM company_profile WHERE advertiser_id = %s ORDER BY id",
        (advertiser_profile_id,),
    )
    rows = cursor.fetchall()
    if not rows:
        raise CompanyResolutionError(
            "You must create a company before uploading advertisement files."
        )
    if len(rows) > 1:
        raise CompanyResolutionError(
            "You own multiple companies. Specify company_id so the upload "
            "is filed under the correct company."
        )
    return _row_id(rows[0]), _row_name(rows[0])


# ----------------------------------------------------------------------
# Folder builders. Each returns a path ending in "/".
# ----------------------------------------------------------------------

def company_folder(media_type: str, company_name: str) -> str:
    """{type}/advertisements/{company}/"""
    return f"{_type_folder(media_type)}/advertisements/{slugify(company_name)}/"


def brand_folder(media_type: str, company_name: str, brand_name: str) -> str:
    """{type}/advertisements/{company}/{brand}/"""
    return f"{company_folder(media_type, company_name)}{slugify(brand_name)}/"


def campaign_folder(
    media_type: str, company_name: str, brand_name: str, campaign_name: str
) -> str:
    """{type}/advertisements/{company}/{brand}/{campaign}/"""
    return f"{brand_folder(media_type, company_name, brand_name)}{slugify(campaign_name)}/"


def placement_folder(
    media_type: str,
    company_name: str,
    brand_name: str,
    campaign_name: str,
    placement: str,
) -> str:
    """{type}/advertisements/{company}/{brand}/{campaign}/{placement}/"""
    return f"{campaign_folder(media_type, company_name, brand_name, campaign_name)}{slugify(placement)}/"


# ----------------------------------------------------------------------
# Internals
# ----------------------------------------------------------------------

_TYPE_TO_FOLDER = {
    "image": "images",
    "images": "images",
    "video": "videos",
    "videos": "videos",
    "document": "documents",
    "documents": "documents",
    "audio": "audio",
}


def _type_folder(media_type: str) -> str:
    folder = _TYPE_TO_FOLDER.get(media_type)
    if folder is None:
        raise ValueError(f"Unknown media_type: {media_type!r}")
    return folder


def _row_id(row) -> int:
    if hasattr(row, "get"):
        return row.get("id") or row["id"]
    # tuple-like (positional access)
    return row[0]


def _row_name(row) -> str:
    if hasattr(row, "get"):
        return row.get("company_name") or row["company_name"]
    return row[1]


# ----------------------------------------------------------------------
# Re-migrate B2 files when a company / brand / campaign is renamed.
# ----------------------------------------------------------------------

# Layout: {type}/advertisements/{company}/{brand}/{campaign}/{placement}/{file}
# Segment indices (after splitting on /):
#   0: type folder (images|videos|documents|audio)
#   1: "advertisements"
#   2: company_slug
#   3: brand_slug
#   4: campaign_slug
#   5: placement_slug
#   6+: filename (may include / if filename has slashes — unlikely)
_SEGMENT_INDEX = {
    "company": 2,
    "brand": 3,
    "campaign": 4,
    "placement": 5,
}


def remigrate_rename(
    *,
    cursor,
    b2_service,
    segment: str,
    old_slug: str,
    new_slug: str,
    company_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    campaign_id: Optional[int] = None,
) -> dict:
    """Re-migrate all B2 files affected by a rename.

    Args:
        cursor: psycopg cursor (dict_row recommended; tuple-row also works).
            Caller is responsible for commit/rollback. This function performs
            the UPDATEs but does NOT commit — that's the caller's call.
        b2_service: result of get_backblaze_service(). Used for copy + delete.
        segment: one of 'company' | 'brand' | 'campaign'.
        old_slug: the previous slugified name (segment we're replacing).
        new_slug: the new slugified name.
        company_id: when segment != 'company', narrows scope. Required for 'brand' and 'campaign' too.
        brand_id: required when segment == 'brand' or 'campaign'.
        campaign_id: required when segment == 'campaign'.

    Returns a summary dict: {migrated, failed, skipped, total}.

    Behavior per row:
      1. Compute new key by swapping segment[index].
      2. Skip if old key == new key (no change).
      3. b2.bucket.copy(old_info.id_, new_key) — server-side, no download.
      4. UPDATE campaign_media SET file_name, folder_path, file_url.
      5. b2.bucket.delete_file_version(old_info.id_, old_key).

    If copy succeeds but UPDATE fails, the legacy object is NOT deleted (file
    stays reachable via DB pointer). If UPDATE succeeds but delete fails, log
    a warning — cleanup_b2_orphaned_campaign_media.py will catch it.
    """
    if segment not in _SEGMENT_INDEX:
        raise ValueError(f"Unknown segment: {segment!r}")
    if old_slug == new_slug:
        return {"migrated": 0, "failed": 0, "skipped": 0, "total": 0}

    # Build scope filter for the SELECT
    where = "file_name IS NOT NULL"
    params: list = []
    # Narrow to advertisements/ keys to avoid touching anything else
    where += " AND file_name LIKE %s"
    params.append("%/advertisements/%")
    if segment == "company":
        # Company rename affects every file under any of the company's brands/campaigns.
        # We could filter by joining brand_profile -> company_id, but the easier and
        # safer filter is "rows owned by this company" via campaign->brand->company:
        if company_id is None:
            raise ValueError("company_id required when segment='company'")
        where += " AND brand_id IN (SELECT id FROM brand_profile WHERE company_id = %s)"
        params.append(company_id)
    elif segment == "brand":
        if brand_id is None:
            raise ValueError("brand_id required when segment='brand'")
        where += " AND brand_id = %s"
        params.append(brand_id)
    elif segment == "campaign":
        if campaign_id is None:
            raise ValueError("campaign_id required when segment='campaign'")
        where += " AND campaign_id = %s"
        params.append(campaign_id)

    cursor.execute(f"SELECT id, file_name FROM campaign_media WHERE {where} ORDER BY id", params)
    rows = cursor.fetchall()

    seg_idx = _SEGMENT_INDEX[segment]
    migrated = 0
    failed = 0
    skipped = 0

    for row in rows:
        media_id = row["id"] if hasattr(row, "get") else row[0]
        old_key = row["file_name"] if hasattr(row, "get") else row[1]

        # Split + replace
        parts = old_key.split("/")
        if len(parts) <= seg_idx:
            skipped += 1
            print(f"[remigrate {segment}] [{media_id}] SKIP (not enough segments): {old_key}")
            continue
        if parts[seg_idx] != old_slug:
            # The DB row didn't have the old slug we expected — likely already
            # migrated, or stale row, or segment naming drifted. Skip safely.
            skipped += 1
            print(f"[remigrate {segment}] [{media_id}] SKIP (segment mismatch: got {parts[seg_idx]!r}, expected {old_slug!r}): {old_key}")
            continue

        new_parts = parts.copy()
        new_parts[seg_idx] = new_slug
        new_key = "/".join(new_parts)
        new_folder = "/".join(new_parts[:-1]) + "/"

        try:
            # B2 server-side copy
            try:
                old_info = b2_service.bucket.get_file_info_by_name(old_key)
            except Exception:
                # If old doesn't exist but new does, treat as already-done.
                try:
                    b2_service.bucket.get_file_info_by_name(new_key)
                    print(f"[remigrate {segment}] [{media_id}] B2 already moved; updating DB only")
                    old_info = None
                except Exception as e:
                    raise RuntimeError(f"old {old_key} not in B2 and new not present either: {e}")

            if old_info is not None:
                b2_service.bucket.copy(old_info.id_, new_key)

            new_url = b2_service.bucket.get_download_url(new_key)

            # DB UPDATE
            cursor.execute(
                """
                UPDATE campaign_media
                SET file_name = %s,
                    folder_path = %s,
                    file_url = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (new_key, new_folder, new_url, media_id),
            )
            if cursor.rowcount != 1:
                raise RuntimeError(f"expected 1 row updated, got {cursor.rowcount}")

            # Legacy B2 delete (only after DB succeeds)
            if old_info is not None:
                try:
                    b2_service.bucket.delete_file_version(old_info.id_, old_key)
                except Exception as e:
                    print(f"[remigrate {segment}] [{media_id}] WARN: copied+DB updated, legacy delete failed for {old_key}: {e}")

            migrated += 1
            print(f"[remigrate {segment}] [{media_id}] OK -> {new_key}")
        except Exception as e:
            failed += 1
            print(f"[remigrate {segment}] [{media_id}] FAIL: {e}")

    return {"migrated": migrated, "failed": failed, "skipped": skipped, "total": len(rows)}
