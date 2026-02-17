"""
Migration: Add 'cancelled' and 'no_answer' to check_call_status constraint

The frontend sends these statuses but they were missing from the original
CHECK constraint, causing 500 errors on PUT /api/call-logs/{id}.

Changes:
- DROP CONSTRAINT check_call_status
- Re-add with full set: initiated, ringing, answered, missed, declined,
  cancelled, no_answer, ended, failed
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
    print("MIGRATION: Add 'cancelled' and 'no_answer' to check_call_status")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:

                # Check current constraint
                cur.execute("""
                    SELECT pg_get_constraintdef(oid)
                    FROM pg_constraint
                    WHERE conname = 'check_call_status'
                """)
                result = cur.fetchone()
                if result:
                    print(f"[INFO] Current constraint: {result[0]}")
                    if 'cancelled' in result[0]:
                        print("[INFO] 'cancelled' already in constraint. Skipping.")
                        return

                print("[1/2] Dropping old check_call_status constraint...")
                cur.execute("""
                    ALTER TABLE call_logs
                    DROP CONSTRAINT IF EXISTS check_call_status
                """)
                print("      Done")

                print("[2/2] Re-adding constraint with full status set...")
                cur.execute("""
                    ALTER TABLE call_logs
                    ADD CONSTRAINT check_call_status CHECK (
                        status IN (
                            'initiated', 'ringing', 'answered',
                            'missed', 'declined', 'cancelled',
                            'no_answer', 'ended', 'failed'
                        )
                    )
                """)
                print("      Done")

                conn.commit()
                print("\n[SUCCESS] Migration completed successfully!")
                print("=" * 60)

                # Verify
                cur.execute("""
                    SELECT pg_get_constraintdef(oid)
                    FROM pg_constraint
                    WHERE conname = 'check_call_status'
                """)
                row = cur.fetchone()
                if row:
                    print(f"\nVerification: {row[0]}")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise


if __name__ == "__main__":
    run_migration()
