"""
Migration: drop is_verified and is_active from astegni_testimonials.

Professional reviews are now gated by is_featured ONLY (the "Verify" and "Active"
concepts were removed). These columns are no longer read or written. Run once:

    python migrate_drop_testimonial_verified_active.py
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

DDL = """
ALTER TABLE astegni_testimonials DROP COLUMN IF EXISTS is_verified;
ALTER TABLE astegni_testimonials DROP COLUMN IF EXISTS is_active;
"""


def main():
    if not DATABASE_URL:
        raise SystemExit("DATABASE_URL is not set in .env")
    print("Connecting to user database...")
    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)
        conn.commit()
    print("Dropped is_verified and is_active from astegni_testimonials.")


if __name__ == "__main__":
    main()
