"""
One-off migration: move campaign-media files in Backblaze B2 from the legacy
layout to the new advertisement-scoped layout.

Legacy layout:
    {images|videos}/profile_{advertiser_id}/{brand}/{campaign}/{placement}/{filename}

New layout:
    {images|videos}/advertisement/{brand}/{campaign}/{placement}/profile_{advertiser_id}/{filename}

For each row in campaign_media whose file_name matches the legacy layout:
  1. Compute the new B2 key by re-ordering the path segments.
  2. b2.copy_file(old_key) -> new_key  (server-side copy, no download)
  3. UPDATE campaign_media SET file_name, folder_path, file_url to the new values
  4. Delete the legacy B2 object

Idempotent: rows already at the new layout are skipped.

Safety:
  - Defaults to dry run.
  - Each file is processed in its own transaction: if any step fails for one
    row, the script aborts and that file ends up in a half-migrated state
    (B2 has both copies, DB still points at the old). The next run will skip
    completed migrations and retry only the failures.
  - If B2 copy succeeds but DB update fails, the script aborts WITHOUT deleting
    the legacy B2 object — so the file is still reachable via the DB row.
  - Refuses to touch any DB row whose file_name doesn't match the legacy
    regex (defense-in-depth).

Usage:
    # Dry run (default) — prints the proposed mapping, touches nothing
    python migrate_b2_campaign_media_to_advertisement_layout.py

    # Actually migrate
    python migrate_b2_campaign_media_to_advertisement_layout.py --apply

Run from astegni-backend:
    cd /var/www/astegni/astegni-backend && source venv/bin/activate
    python migrate_b2_campaign_media_to_advertisement_layout.py
"""

import argparse
import os
import re
import sys

import psycopg
from dotenv import load_dotenv

load_dotenv()

from backblaze_service import get_backblaze_service  # noqa: E402

# Capture the legacy-layout segments. Groups:
#   1: type folder (images|videos)
#   2: advertiser_id
#   3: brand
#   4: campaign
#   5: placement
#   6: filename
LEGACY_RE = re.compile(
    r"^(images|videos)/profile_(\d+)/([^/]+)/([^/]+)/([^/]+)/(.+)$"
)
NEW_RE = re.compile(
    r"^(images|videos|documents|audio)/advertisement/[^/]+/[^/]+/[^/]+/profile_\d+/.+$"
)


def compute_new_key(old_key: str) -> str | None:
    """Return the new B2 key for a legacy old_key, or None if old_key isn't legacy."""
    m = LEGACY_RE.match(old_key)
    if not m:
        return None
    type_folder, advertiser_id, brand, campaign, placement, filename = m.groups()
    return f"{type_folder}/advertisement/{brand}/{campaign}/{placement}/profile_{advertiser_id}/{filename}"


def fetch_rows(advertiser_id: int | None) -> list[tuple[int, str, str | None]]:
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("ERROR: DATABASE_URL not set in environment")

    sql = "SELECT id, file_name, folder_path FROM campaign_media WHERE file_name IS NOT NULL"
    params: tuple = ()
    if advertiser_id is not None:
        sql += " AND advertiser_id = %s"
        params = (advertiser_id,)
    sql += " ORDER BY id"

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [(row[0], row[1], row[2]) for row in cur.fetchall()]


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--apply", action="store_true", help="Actually migrate (default: dry run)")
    parser.add_argument("--advertiser-id", type=int, default=None, help="Restrict to one advertiser profile id")
    args = parser.parse_args()

    print("=" * 70)
    print("B2 campaign-media layout migration (legacy -> advertisement-scoped)")
    print(f"  mode          : {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"  advertiser_id : {args.advertiser_id if args.advertiser_id is not None else 'ALL'}")
    print("=" * 70)

    print("\n1) Fetching campaign_media rows from DB...")
    rows = fetch_rows(args.advertiser_id)
    print(f"   {len(rows)} rows total")

    legacy_rows: list[tuple[int, str, str | None, str]] = []
    already_new = 0
    unknown_layout = 0
    for media_id, file_name, folder_path in rows:
        if NEW_RE.match(file_name):
            already_new += 1
            continue
        new_key = compute_new_key(file_name)
        if new_key is None:
            unknown_layout += 1
            print(f"   [SKIP id={media_id}] file_name doesn't match legacy layout: {file_name}")
            continue
        legacy_rows.append((media_id, file_name, folder_path, new_key))

    print(f"\n2) Classified rows:")
    print(f"   already at new layout : {already_new}")
    print(f"   to migrate            : {len(legacy_rows)}")
    print(f"   unknown layout (skipped): {unknown_layout}")

    if not legacy_rows:
        print("\nNothing to migrate. Done.")
        return

    print(f"\n3) Proposed migrations (first 20):")
    for media_id, old_key, _, new_key in legacy_rows[:20]:
        print(f"   [{media_id}]")
        print(f"     old: {old_key}")
        print(f"     new: {new_key}")
    if len(legacy_rows) > 20:
        print(f"   ... and {len(legacy_rows) - 20} more")

    if not args.apply:
        print("\nDry run — nothing migrated. Re-run with --apply to migrate.")
        return

    print(f"\n4) Migrating {len(legacy_rows)} file(s)...")
    b2 = get_backblaze_service()
    if not getattr(b2, "configured", False):
        sys.exit("ERROR: Backblaze B2 not configured (check BACKBLAZE_* env vars)")

    db_url = os.getenv("DATABASE_URL")
    migrated = 0
    failed = 0

    for media_id, old_key, old_folder, new_key in legacy_rows:
        # Re-derive the new folder + new file_url from the new key.
        # Convention here mirrors how upload_file_to_folder builds these.
        new_folder = new_key.rsplit("/", 1)[0] + "/"

        try:
            # Step A: server-side copy old -> new in B2.
            try:
                old_info = b2.bucket.get_file_info_by_name(old_key)
            except Exception as e:
                # Object may already be gone from a prior partial run; check if
                # the DB row is still pointing at the old path and the new path
                # already exists in B2 — then it's a finish-up case.
                try:
                    b2.bucket.get_file_info_by_name(new_key)
                    print(f"   [{media_id}] B2 copy already done (old missing, new present) — updating DB only")
                    old_info = None
                except Exception:
                    raise RuntimeError(f"old object {old_key} not found and new not present either: {e}")

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
    print(f"Done. migrated={migrated} failed={failed} total_candidates={len(legacy_rows)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
