"""
One-off migration: move campaign-media files in B2 from the singular-"advertisement"
layout (introduced May 2026, commit 6521fd8) to the new pluralized "advertisements/"
layout nested under company name (Phase 3 of the advertiser->company restructure).

Source layout (after May 2026 reorg, before this migration):
    {images|videos}/advertisement/{brand}/{campaign}/{placement}/profile_{advertiser_id}/{filename}

Target layout (after this migration):
    {images|videos|documents|audio}/advertisements/{company}/{brand}/{campaign}/{placement}/{filename}

For each row in campaign_media whose file_name matches the source layout:
  1. Look up the company name via campaign_profile -> brand_profile -> company_profile.
  2. Compute the new B2 key by re-ordering + replacing the segments.
  3. b2.copy(old_key) -> new_key   (server-side copy, no download).
  4. UPDATE campaign_media SET file_name, folder_path, file_url to the new values.
  5. Delete the legacy B2 object.

Idempotent: rows already at the new layout are skipped. Safe to re-run after any
failure (each row is processed in its own logical step; partial state leaves the
file reachable via either the old or new path).

Safety:
  - Defaults to dry run.
  - Refuses to touch keys that don't match the expected source regex.
  - If B2 copy succeeds but DB UPDATE fails: legacy object NOT deleted (still reachable).
  - If DB UPDATE succeeds but legacy delete fails: warning logged, cleanup script
    will catch it later.

Usage:
    cd /var/www/astegni/astegni-backend && source venv/bin/activate
    python migrate_b2_to_advertisements_company_layout.py            # dry run
    python migrate_b2_to_advertisements_company_layout.py --apply    # actually migrate
"""

import argparse
import os
import re
import sys

import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

from backblaze_service import get_backblaze_service  # noqa: E402
from advertiser_b2_paths import slugify, placement_folder  # noqa: E402

# Source = old "singular" layout that the previous migration produced.
#   images/advertisement/{brand}/{campaign}/{placement}/profile_{advertiser_id}/{filename}
OLD_RE = re.compile(
    r"^(images|videos)/advertisement/([^/]+)/([^/]+)/([^/]+)/profile_(\d+)/(.+)$"
)
# Target = new "plural + company-scoped" layout.
NEW_RE = re.compile(
    r"^(images|videos|documents|audio)/advertisements/[^/]+/[^/]+/[^/]+/[^/]+/.+$"
)


def fetch_rows(advertiser_id_filter: int | None) -> list[dict]:
    """Return a list of {id, file_name, folder_path, campaign_id, brand_id, company_name, brand_name, campaign_name, placement} dicts."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("ERROR: DATABASE_URL not set")

    where = "cm.file_name IS NOT NULL"
    params: tuple = ()
    if advertiser_id_filter is not None:
        where += " AND cm.advertiser_id = %s"
        params = (advertiser_id_filter,)

    sql = f"""
        SELECT
            cm.id,
            cm.file_name,
            cm.folder_path,
            cm.campaign_id,
            cm.brand_id,
            cm.placement,
            cp.name AS campaign_name,
            bp.name AS brand_name,
            co.company_name
        FROM campaign_media cm
        LEFT JOIN campaign_profile cp ON cp.id = cm.campaign_id
        LEFT JOIN brand_profile bp ON bp.id = cm.brand_id
        LEFT JOIN company_profile co ON co.id = bp.company_id
        WHERE {where}
        ORDER BY cm.id
    """
    with psycopg.connect(db_url, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return cur.fetchall()


def compute_new_key(row: dict) -> tuple[str, str] | None:
    """Return (new_key, new_folder_path) for an old-layout row, or None if not migratable.

    Uses the live company/brand/campaign/placement names from the joined DB, NOT the
    names embedded in the legacy path — those may have stale sanitization. Falls back
    to the legacy path segments only if the DB names are missing.
    """
    m = OLD_RE.match(row["file_name"])
    if not m:
        return None
    type_folder, legacy_brand, legacy_campaign, legacy_placement, legacy_adv_id, filename = m.groups()

    company = row.get("company_name") or ""
    brand = row.get("brand_name") or legacy_brand
    campaign = row.get("campaign_name") or legacy_campaign
    placement = row.get("placement") or legacy_placement

    if not company.strip():
        # Without a company name we can't build the new path. Caller will treat as skipped.
        return None

    media_type = "image" if type_folder == "images" else "video"
    new_folder = placement_folder(media_type, company, brand, campaign, placement)
    new_key = f"{new_folder}{filename}"
    return new_key, new_folder


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--apply", action="store_true", help="Actually migrate (default: dry run)")
    parser.add_argument("--advertiser-id", type=int, default=None, help="Restrict to one advertiser_profile.id")
    args = parser.parse_args()

    print("=" * 70)
    print("B2 campaign-media migration: advertisement/ -> advertisements/{company}/")
    print(f"  mode         : {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"  advertiser id: {args.advertiser_id if args.advertiser_id is not None else 'ALL'}")
    print("=" * 70)

    print("\n1) Fetching campaign_media rows + joined company/brand/campaign...")
    rows = fetch_rows(args.advertiser_id)
    print(f"   {len(rows)} row(s) total")

    already_new = 0
    no_company = 0
    unknown_layout = 0
    plan: list[tuple[int, str, str, str]] = []  # (media_id, old_key, new_key, new_folder)

    for row in rows:
        old_key = row["file_name"]
        if NEW_RE.match(old_key):
            already_new += 1
            continue
        result = compute_new_key(row)
        if result is None:
            if OLD_RE.match(old_key):
                no_company += 1
                print(f"   [SKIP id={row['id']}] no company name resolvable; file: {old_key}")
            else:
                unknown_layout += 1
                print(f"   [SKIP id={row['id']}] unknown layout: {old_key}")
            continue
        new_key, new_folder = result
        plan.append((row["id"], old_key, new_key, new_folder))

    print(f"\n2) Classified:")
    print(f"   already at new layout       : {already_new}")
    print(f"   to migrate                   : {len(plan)}")
    print(f"   no company name (skipped)    : {no_company}")
    print(f"   unknown layout (skipped)     : {unknown_layout}")

    if not plan:
        print("\nNothing to migrate. Done.")
        return

    print(f"\n3) Proposed migrations (first 20):")
    for media_id, old_key, new_key, _ in plan[:20]:
        print(f"   [{media_id}]")
        print(f"     old: {old_key}")
        print(f"     new: {new_key}")
    if len(plan) > 20:
        print(f"   ... and {len(plan) - 20} more")

    if not args.apply:
        print("\nDry run — nothing migrated. Re-run with --apply to migrate.")
        return

    print(f"\n4) Migrating {len(plan)} file(s)...")
    b2 = get_backblaze_service()
    if not getattr(b2, "configured", False):
        sys.exit("ERROR: Backblaze B2 not configured")

    db_url = os.getenv("DATABASE_URL")
    migrated = 0
    failed = 0

    for media_id, old_key, new_key, new_folder in plan:
        try:
            # Step A: server-side copy old -> new (or detect already-done state).
            try:
                old_info = b2.bucket.get_file_info_by_name(old_key)
            except Exception:
                try:
                    b2.bucket.get_file_info_by_name(new_key)
                    print(f"   [{media_id}] old object missing but new exists — finishing DB update only")
                    old_info = None
                except Exception as e:
                    raise RuntimeError(f"old {old_key} not found and new not present either: {e}")

            if old_info is not None:
                b2.bucket.copy(old_info.id_, new_key)

            # Step B: update DB row.
            new_url = b2.bucket.get_download_url(new_key)
            with psycopg.connect(db_url) as conn:
                with conn.cursor() as cur:
                    cur.execute(
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
                    if cur.rowcount != 1:
                        raise RuntimeError(f"expected 1 row updated, got {cur.rowcount}")
                conn.commit()

            # Step C: delete the legacy B2 object (only after DB success).
            if old_info is not None:
                try:
                    b2.bucket.delete_file_version(old_info.id_, old_key)
                except Exception as e:
                    print(f"   [{media_id}] WARN: copied + DB updated, but failed to delete legacy {old_key}: {e}")
                    print(f"             cleanup_b2_orphaned_campaign_media.py will catch it.")

            migrated += 1
            print(f"   [{media_id}] OK -> {new_key}")
        except Exception as e:
            failed += 1
            print(f"   [{media_id}] FAIL: {e}")

    print("\n" + "=" * 70)
    print(f"Done. migrated={migrated} failed={failed} total={len(plan)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
