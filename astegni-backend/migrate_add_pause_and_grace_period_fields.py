"""
Migration: Add pause and grace period fields to campaign_profile

New Fields:
- paused_at: TIMESTAMP - When campaign was paused
- grace_period_hours: INTEGER - Grace period duration (default 24 hours)

These fields support:
1. Pause functionality (no-fee pause option)
2. Grace period tracking (24-hour 0% fee window)
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def run_migration():
    print("=" * 60)
    print("MIGRATION: Add Pause and Grace Period Fields")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check if columns already exist
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_profile'
                    AND column_name IN ('paused_at', 'grace_period_hours')
                """)
                existing_columns = [row[0] for row in cur.fetchall()]

                if 'paused_at' in existing_columns and 'grace_period_hours' in existing_columns:
                    print("[INFO] Pause and grace period fields already exist. Skipping...")
                    return

                print("[1/2] Adding paused_at field...")
                if 'paused_at' not in existing_columns:
                    cur.execute("""
                        ALTER TABLE campaign_profile
                        ADD COLUMN paused_at TIMESTAMP
                    """)
                    print("      Added paused_at")
                else:
                    print("      Skipped paused_at (already exists)")

                print("[2/2] Adding grace_period_hours field...")
                if 'grace_period_hours' not in existing_columns:
                    cur.execute("""
                        ALTER TABLE campaign_profile
                        ADD COLUMN grace_period_hours INTEGER DEFAULT 24
                    """)
                    print("      Added grace_period_hours (default 24 hours)")
                else:
                    print("      Skipped grace_period_hours (already exists)")

                conn.commit()
                print("\n[SUCCESS] Migration completed successfully!")
                print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
