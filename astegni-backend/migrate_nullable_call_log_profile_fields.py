"""
Migration: Make caller_profile_id and caller_profile_type nullable in call_logs

These are legacy profile-based fields superseded by caller_user_id (user-based).
The frontend no longer sends them, causing NOT NULL constraint violations (500 error).

Changes:
- DROP CONSTRAINT check_caller_profile_type (requires non-null specific values)
- ALTER TABLE call_logs ALTER COLUMN caller_profile_id DROP NOT NULL
- ALTER TABLE call_logs ALTER COLUMN caller_profile_type DROP NOT NULL
- Re-add CHECK constraint as nullable-safe
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
    print("MIGRATION: Make call_logs profile fields nullable")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:

                # Check if already nullable
                cur.execute("""
                    SELECT is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'call_logs'
                    AND column_name = 'caller_profile_id'
                """)
                result = cur.fetchone()
                if result and result[0] == 'YES':
                    print("[INFO] caller_profile_id already nullable. Skipping...")
                    return

                # Step 1: Drop the old CHECK constraint (it rejects NULL values)
                print("[1/4] Dropping check_caller_profile_type constraint (if exists)...")
                cur.execute("""
                    ALTER TABLE call_logs
                    DROP CONSTRAINT IF EXISTS check_caller_profile_type
                """)
                print("      Done")

                # Step 2: Make caller_profile_id nullable
                print("[2/4] Making caller_profile_id nullable...")
                cur.execute("""
                    ALTER TABLE call_logs
                    ALTER COLUMN caller_profile_id DROP NOT NULL
                """)
                print("      Done")

                # Step 3: Make caller_profile_type nullable
                print("[3/4] Making caller_profile_type nullable...")
                cur.execute("""
                    ALTER TABLE call_logs
                    ALTER COLUMN caller_profile_type DROP NOT NULL
                """)
                print("      Done")

                # Step 4: Re-add constraint allowing NULL
                print("[4/4] Re-adding nullable-safe CHECK constraint...")
                cur.execute("""
                    ALTER TABLE call_logs
                    ADD CONSTRAINT check_caller_profile_type CHECK (
                        caller_profile_type IS NULL OR
                        caller_profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                    )
                """)
                print("      Done")

                conn.commit()
                print("\n[SUCCESS] Migration completed successfully!")
                print("=" * 60)

                # Verify
                cur.execute("""
                    SELECT column_name, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'call_logs'
                    AND column_name IN ('caller_profile_id', 'caller_profile_type')
                    ORDER BY column_name
                """)
                rows = cur.fetchall()
                print("\nVerification:")
                for row in rows:
                    print(f"  {row[0]}: nullable={row[1]}")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise


if __name__ == "__main__":
    run_migration()
