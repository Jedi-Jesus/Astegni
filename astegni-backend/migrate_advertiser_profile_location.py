"""
Add advertiser owner profile-display columns to advertiser_profiles.

The edit-profile modal and person-KYC need these (location is the KYC
precondition: the manager blocks step 1 until country_code/location is set). They
were never added when advertiser_profiles became standalone, so saving them was a
silent no-op. Additive + idempotent.

PROD: advertiser_profiles is owned by postgres — run DDL as:
    python migrate_advertiser_profile_location.py --print-ddl | sudo -u postgres psql -d astegni_advertiser_db
(no new tables/sequences, so no extra GRANT needed — column adds inherit table grants)
"""

import sys, os, argparse
sys.path.append(os.path.join(os.path.dirname(__file__), "app.py modules"))
import psycopg
from config import ADVERTISER_DATABASE_URL


def _libpq(url): return url.replace("postgresql+psycopg://", "postgresql://")


DDL = """
ALTER TABLE advertiser_profiles
    ADD COLUMN IF NOT EXISTS location          JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS country_code      TEXT,
    ADD COLUMN IF NOT EXISTS display_location  BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS social_links      JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS languages         JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS profile_picture   TEXT;
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--print-ddl", action="store_true")
    ap.add_argument("--verify-only", action="store_true",
                    help="Skip DDL (already applied as postgres on prod); just verify columns")
    args = ap.parse_args()
    if args.print_ddl:
        print(DDL); return
    conn = psycopg.connect(_libpq(ADVERTISER_DATABASE_URL))
    try:
        if not args.verify_only:
            with conn.cursor() as cur:
                cur.execute(DDL)
            conn.commit()
        with conn.cursor() as cur:
            cur.execute("""SELECT column_name FROM information_schema.columns
                           WHERE table_name='advertiser_profiles'
                             AND column_name IN ('location','country_code','display_location',
                                                 'social_links','languages','profile_picture')
                           ORDER BY column_name""")
            print("columns present:", ", ".join(r[0] for r in cur.fetchall()))
        print("done.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
