"""
Migrate advertiser tables OUT of astegni_user_db INTO astegni_advertiser_db.

This is the data move for the advertiser-DB split. It does NOT design schema -
run create_advertiser_db.py first to create the destination tables.

Two phases, deliberately separated so nothing is destroyed until you've verified:

  PHASE 1  (default):  COPY
      - Copies all rows of the 11 advertiser tables from user_db -> advertiser_db
        in FK-safe order, preserving primary keys.
      - Resets each sequence so new inserts continue after the max id.
      - Verifies row counts match.
      - Leaves the original tables in user_db untouched (reversible).

  PHASE 2  (only with --drop-source, after PHASE 1 verified):  DROP SOURCE
      - Drops the 2 cross-DB foreign keys that can no longer exist:
            advertiser_profiles.user_id -> users.id
            job_posts.advertiser_id     -> advertiser_profiles.id   (reverse)
      - Drops the 11 now-migrated tables from user_db (reverse-dependency order).
      - Requires typing the confirmation phrase.

Usage:
    python migrate_advertiser_db_split.py            # PHASE 1 copy + verify
    python migrate_advertiser_db_split.py --drop-source   # PHASE 2 (asks to confirm)

Idempotency: PHASE 1 truncates each destination table before copying, so it is
safe to re-run the copy.
"""

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "app.py modules"))

import psycopg
from config import DATABASE_URL, ADVERTISER_DATABASE_URL

# Tables in DEPENDENCY order (parents first). Copy in this order; drop in reverse.
TABLES = [
    "advertiser_profiles",     # parent of company_profile, campaign_profile, transactions
    "brand_profile",           # parent of campaign_profile.brand_id
    "company_profile",         # child of advertiser_profiles
    "campaign_profile",        # child of advertiser_profiles + brand_profile
    "campaign_media",          # child of campaign_profile
    "campaign_impressions",    # child of campaign_profile
    "campaign_engagement",     # child of campaign_profile + campaign_impressions (self-ref)
    "campaign_invoices",       # child of campaign_profile
    "advertiser_team_members", # standalone (app-enforced refs)
    "advertiser_transactions", # child of advertiser_profiles
    "advertisement_earnings",  # standalone (app-enforced refs)
]

# Cross-DB foreign keys to drop from user_db in PHASE 2 (table, constraint_name).
CROSS_DB_FKS = [
    ("advertiser_profiles", "advertiser_profiles_user_id_fkey"),
    ("job_posts", "job_posts_advertiser_id_fkey"),
]

CONFIRM_PHRASE = "DROP ADVERTISER TABLES FROM USER DB"


def _libpq(url: str) -> str:
    """SQLAlchemy URL -> plain libpq DSN for psycopg."""
    return url.replace("postgresql+psycopg://", "postgresql://")


def _columns(cur, table: str):
    cur.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,),
    )
    return [r[0] for r in cur.fetchall()]


def copy_table(src_conn, dst_conn, table: str):
    src = src_conn.cursor()
    dst = dst_conn.cursor()

    src_cols = _columns(src, table)
    dst_cols = set(_columns(dst, table))
    # Only copy columns that exist on BOTH sides (defensive against drift).
    cols = [c for c in src_cols if c in dst_cols]
    missing = [c for c in src_cols if c not in dst_cols]
    if missing:
        print(f"    ! columns present in source but not destination (skipped): {missing}")

    col_list = ", ".join(f'"{c}"' for c in cols)

    src.execute(f'SELECT {col_list} FROM "{table}"')
    rows = src.fetchall()

    # Clean destination first so re-runs don't duplicate / collide on PK.
    dst.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE')

    if rows:
        placeholders = ", ".join(["%s"] * len(cols))
        dst.executemany(
            f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})',
            rows,
        )
    dst_conn.commit()
    print(f"    copied {len(rows)} row(s) into {table} ({len(cols)} cols)")
    return len(rows)


def reset_sequence(dst_conn, table: str):
    """Set the id sequence to max(id) so future inserts don't collide."""
    cur = dst_conn.cursor()
    cur.execute(
        """
        SELECT pg_get_serial_sequence(%s, 'id')
        """,
        (table,),
    )
    seq = cur.fetchone()[0]
    if not seq:
        return
    cur.execute(f'SELECT COALESCE(MAX(id), 0) FROM "{table}"')
    max_id = cur.fetchone()[0]
    # setval with is_called=true so nextval returns max_id+1; if table empty, start at 1.
    if max_id and max_id > 0:
        cur.execute("SELECT setval(%s, %s, true)", (seq, max_id))
    else:
        cur.execute("SELECT setval(%s, 1, false)", (seq,))
    dst_conn.commit()


def phase1_copy():
    print("PHASE 1: copy advertiser tables  user_db -> advertiser_db")
    src_conn = psycopg.connect(_libpq(DATABASE_URL))
    dst_conn = psycopg.connect(_libpq(ADVERTISER_DATABASE_URL))
    counts = {}
    try:
        for table in TABLES:
            print(f"  {table}")
            counts[table] = copy_table(src_conn, dst_conn, table)
            reset_sequence(dst_conn, table)

        # Verify
        print("\nVerifying row counts (source vs destination):")
        s = src_conn.cursor()
        d = dst_conn.cursor()
        all_ok = True
        for table in TABLES:
            s.execute(f'SELECT COUNT(*) FROM "{table}"')
            sc = s.fetchone()[0]
            d.execute(f'SELECT COUNT(*) FROM "{table}"')
            dc = d.fetchone()[0]
            ok = sc == dc
            all_ok = all_ok and ok
            print(f"  {'OK ' if ok else 'MISMATCH'} {table:26s} src={sc:<6} dst={dc}")
        print("\n" + ("All counts match. Source tables left intact (reversible)."
                      if all_ok else "!! COUNT MISMATCH - investigate before PHASE 2."))
        return all_ok
    finally:
        src_conn.close()
        dst_conn.close()


def phase2_drop_source():
    print("PHASE 2: DROP advertiser tables + cross-DB FKs from user_db")
    print("This is destructive. Make sure PHASE 1 verified clean and you have a backup.")
    typed = input(f'Type exactly  "{CONFIRM_PHRASE}"  to proceed: ').strip()
    if typed != CONFIRM_PHRASE:
        print("Phrase did not match. Aborting - nothing dropped.")
        return

    conn = psycopg.connect(_libpq(DATABASE_URL))
    try:
        cur = conn.cursor()
        # Drop cross-DB FKs first.
        for table, constraint in CROSS_DB_FKS:
            cur.execute(
                f'ALTER TABLE IF EXISTS "{table}" DROP CONSTRAINT IF EXISTS "{constraint}"'
            )
            print(f"  dropped FK {constraint} on {table} (if existed)")
        # Drop tables in reverse-dependency order. CASCADE mops up any remaining FKs.
        for table in reversed(TABLES):
            cur.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
            print(f"  dropped table {table}")
        conn.commit()
        print("\nSource advertiser tables removed from user_db.")
    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Astegni :: advertiser DB split migration")
    print("=" * 60)
    if "--drop-source" in sys.argv:
        phase2_drop_source()
    else:
        ok = phase1_copy()
        print("\nNext: rewire endpoints (Stage 2), then once verified run:")
        print("    python migrate_advertiser_db_split.py --drop-source")
        sys.exit(0 if ok else 1)
