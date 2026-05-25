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
