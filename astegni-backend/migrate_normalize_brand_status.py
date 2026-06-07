"""
Migration: Normalize brand_profile.status to operational values only.

Brand verification was removed. A brand can only exist under an already-verified
company, so brands have no verification lifecycle. `status` now carries only
operational values: 'active' | 'paused' | 'inactive'.

This backfills any brand still sitting in a legacy verification state
(pending / verified / rejected / suspended / NULL):
  - 'suspended'  -> 'inactive'  (was deactivated; keep it not-active)
  - everything else verification-ish (pending/verified/rejected/NULL) -> 'active'
Also sets is_verified = TRUE for all brands (a brand existing implies a verified
company). Brands already 'active'/'paused'/'inactive' are left untouched except
for is_verified.
"""

import psycopg2

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"


def run_migration():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        print("Starting migration: normalize brand_profile.status...")

        # Show the pre-state for the log.
        cur.execute("SELECT status, COUNT(*) FROM brand_profile GROUP BY status ORDER BY status")
        print("Before:")
        for row in cur.fetchall():
            print(f"  {row[0]!r}: {row[1]}")

        # Legacy 'suspended' brands were deactivated -> map to operational 'inactive'.
        cur.execute("""
            UPDATE brand_profile
            SET status = 'inactive', updated_at = NOW()
            WHERE status = 'suspended'
        """)
        suspended_fixed = cur.rowcount

        # Any remaining verification states (or NULL) -> 'active'.
        cur.execute("""
            UPDATE brand_profile
            SET status = 'active', updated_at = NOW()
            WHERE status IS NULL OR status IN ('pending', 'verified', 'rejected', 'requested')
        """)
        active_fixed = cur.rowcount

        # A brand only exists under a verified company -> is_verified is always TRUE.
        cur.execute("UPDATE brand_profile SET is_verified = TRUE WHERE is_verified IS DISTINCT FROM TRUE")
        verified_fixed = cur.rowcount

        conn.commit()

        cur.execute("SELECT status, COUNT(*) FROM brand_profile GROUP BY status ORDER BY status")
        print("After:")
        for row in cur.fetchall():
            print(f"  {row[0]!r}: {row[1]}")

        print(f"\n[OK] suspended->inactive: {suspended_fixed}, "
              f"other->active: {active_fixed}, is_verified set: {verified_fixed}")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
