"""
One-off script: find and optionally delete orphaned campaign-media files in Backblaze B2.

An "orphaned" file is anything under the B2 prefixes
    images/profile_*/...
    videos/profile_*/...
whose full path (folder_path + file_name) has no matching row in the
campaign_media table.

Why orphans exist:
  Before the delete_campaign B2-cleanup patch, deleting a campaign only
  removed DB rows (campaign_profile + cascaded campaign_media) and left the
  B2 objects behind. Those files are still billed for storage but no longer
  reachable from the app.

Usage:
    # Dry run (default) — lists orphans, deletes nothing
    python cleanup_b2_orphaned_campaign_media.py

    # Actually delete (after reviewing the dry-run output)
    python cleanup_b2_orphaned_campaign_media.py --apply

    # Restrict to one advertiser profile (useful for testing)
    python cleanup_b2_orphaned_campaign_media.py --advertiser-id 42

Safety:
  - Defaults to dry-run.
  - Only scans the two campaign-media prefixes; will NOT touch profile
    pictures, chat files, videos in user reels, etc.
  - Validates that each candidate path begins with images/profile_ or
    videos/profile_ before issuing any delete (defense-in-depth).
  - Prints a summary at the end. Logs every deletion.

Run from the astegni-backend directory so .env / model imports resolve:
    cd /var/www/astegni/astegni-backend && source venv/bin/activate
    python cleanup_b2_orphaned_campaign_media.py
"""

import argparse
import os
import re
import sys
from typing import Set, Tuple

import psycopg
from dotenv import load_dotenv

load_dotenv()

from backblaze_service import get_backblaze_service  # noqa: E402

CAMPAIGN_MEDIA_PREFIXES = ("images/profile_", "videos/profile_")
SAFE_PATH_RE = re.compile(r"^(images|videos)/profile_\d+/.+")


def fetch_known_paths(advertiser_id: int | None) -> Set[str]:
    """Return the set of full B2 paths (folder_path + file_name) known to the DB."""
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        sys.exit("ERROR: DATABASE_URL not set in environment")

    sql = """
        SELECT folder_path, file_name
        FROM campaign_media
        WHERE folder_path IS NOT NULL AND file_name IS NOT NULL
    """
    params: tuple = ()
    if advertiser_id is not None:
        sql += " AND advertiser_id = %s"
        params = (advertiser_id,)

    known: Set[str] = set()
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            for folder_path, file_name in cur.fetchall():
                known.add(f"{folder_path}{file_name}")
    return known


def list_b2_paths(advertiser_id: int | None) -> list[Tuple[str, str]]:
    """
    Return [(file_path, file_id), ...] for every object under the campaign-media
    prefixes. If advertiser_id is given, narrow the scan to that one profile.
    """
    b2 = get_backblaze_service()
    if not getattr(b2, "configured", False):
        sys.exit("ERROR: Backblaze B2 not configured (check BACKBLAZE_* env vars)")

    if advertiser_id is not None:
        prefixes = [
            f"images/profile_{advertiser_id}/",
            f"videos/profile_{advertiser_id}/",
        ]
    else:
        prefixes = list(CAMPAIGN_MEDIA_PREFIXES)

    out: list[Tuple[str, str]] = []
    for prefix in prefixes:
        try:
            for file_info, _ in b2.bucket.ls(
                folder_to_list=prefix,
                recursive=True,
                fetch_count=10000,
            ):
                out.append((file_info.file_name, file_info.id_))
        except Exception as e:
            print(f"[WARN] ls failed for prefix {prefix!r}: {e}")
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="Actually delete orphans (default: dry run)")
    parser.add_argument("--advertiser-id", type=int, default=None, help="Restrict scan to one advertiser profile id")
    args = parser.parse_args()

    print("=" * 70)
    print("B2 orphaned campaign-media cleanup")
    print(f"  mode          : {'APPLY' if args.apply else 'DRY RUN'}")
    print(f"  advertiser_id : {args.advertiser_id if args.advertiser_id is not None else 'ALL'}")
    print("=" * 70)

    print("\n1) Fetching known paths from campaign_media DB table...")
    known_paths = fetch_known_paths(args.advertiser_id)
    print(f"   {len(known_paths)} known media file paths in DB")

    print("\n2) Listing campaign-media objects in B2...")
    b2_objects = list_b2_paths(args.advertiser_id)
    print(f"   {len(b2_objects)} objects found in B2 under campaign-media prefixes")

    print("\n3) Computing orphans (in B2 but not in DB)...")
    orphans = [(path, fid) for path, fid in b2_objects if path not in known_paths]
    print(f"   {len(orphans)} orphan(s) detected")

    if not orphans:
        print("\nNothing to clean up. Done.")
        return

    # Defense-in-depth: refuse to touch anything outside the expected layout.
    suspicious = [(p, fid) for p, fid in orphans if not SAFE_PATH_RE.match(p)]
    if suspicious:
        print("\nERROR: refusing to proceed — found candidate orphans outside the")
        print("       images/profile_*/ or videos/profile_*/ layout:")
        for p, _ in suspicious[:20]:
            print(f"         {p}")
        sys.exit(1)

    print("\nFirst 20 orphans (full list will be processed if --apply is set):")
    for p, _ in orphans[:20]:
        print(f"   {p}")
    if len(orphans) > 20:
        print(f"   ... and {len(orphans) - 20} more")

    if not args.apply:
        print("\nDry run — nothing deleted. Re-run with --apply to delete.")
        return

    print(f"\n4) Deleting {len(orphans)} orphan(s) from B2...")
    b2 = get_backblaze_service()
    deleted = 0
    failed = 0
    for path, file_id in orphans:
        try:
            if b2.delete_file(path, file_id):
                deleted += 1
            else:
                failed += 1
                print(f"   [FAIL] {path}")
        except Exception as e:
            failed += 1
            print(f"   [FAIL] {path}: {e}")

    print("\n" + "=" * 70)
    print(f"Done. deleted={deleted} failed={failed} total_candidates={len(orphans)}")
    print("=" * 70)


if __name__ == "__main__":
    main()
