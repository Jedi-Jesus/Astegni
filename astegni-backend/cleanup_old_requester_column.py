"""
Cleanup: Remove old_requester_profile_id backup column after verification

This script removes the old_requester_profile_id column that was kept
as a backup during the migration to user-based requester_id.

Run this ONLY after verifying the migration worked correctly.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def cleanup():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 80)
        print("CLEANUP: Remove old_requester_profile_id backup column")
        print("=" * 80)

        # Check if column exists
        print("\n1. Checking if old_requester_profile_id column exists...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            AND column_name = 'old_requester_profile_id'
        """)

        if not cur.fetchone():
            print("   Column already removed or doesn't exist")
            return True

        print("   Column found - proceeding with removal")

        # Show current data one last time
        print("\n2. Current data (for verification):")
        cur.execute("""
            SELECT
                COUNT(*) as total,
                COUNT(DISTINCT requester_id) as unique_users,
                COUNT(DISTINCT old_requester_profile_id) as unique_old_profiles
            FROM requested_sessions
        """)
        stats = cur.fetchone()
        print(f"   Total requests: {stats[0]}")
        print(f"   Unique users (new): {stats[1]}")
        print(f"   Unique profiles (old): {stats[2]}")

        # Drop the column
        print("\n3. Dropping old_requester_profile_id column...")
        cur.execute("""
            ALTER TABLE requested_sessions
            DROP COLUMN old_requester_profile_id
        """)
        conn.commit()
        print("   [OK] Column dropped successfully")

        # Verify
        print("\n4. Verifying column was removed...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            AND column_name = 'old_requester_profile_id'
        """)

        if cur.fetchone():
            print("   [ERROR] Column still exists!")
            return False
        else:
            print("   [OK] Column successfully removed")

        # Show final schema
        print("\n5. Final requested_sessions schema:")
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            AND column_name IN ('id', 'requester_id', 'requester_type', 'requested_to_id', 'tutor_id')
            ORDER BY ordinal_position
        """)
        for row in cur.fetchall():
            print(f"   {row[0]:20} {row[1]}")

        print("\n" + "=" * 80)
        print("[OK] CLEANUP COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nThe backup column has been removed.")
        print("Migration is now complete and irreversible.")

        return True

    except Exception as e:
        print(f"\n[ERROR] Cleanup failed: {e}")
        conn.rollback()
        return False
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    import sys

    print("\nWARNING: This will permanently remove the old_requester_profile_id backup column.")
    print("Make sure you have verified the migration is working correctly!\n")

    if len(sys.argv) > 1 and sys.argv[1] == "--confirm":
        cleanup()
    else:
        print("To proceed, run: python cleanup_old_requester_column.py --confirm")
