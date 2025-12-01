"""
Add Profile IDs to Connections Table

This migration adds requester_profile_id and recipient_profile_id columns to the connections table.
These store the actual profile IDs (tutor_profiles.id, student_profiles.id, etc.) for direct navigation
without needing backend conversions.

Changes:
- Add requester_profile_id column (nullable for now, will backfill)
- Add recipient_profile_id column (nullable for now, will backfill)
- Keep existing requested_by and recipient_id columns (user.id) for backward compatibility

Usage:
    python migrate_add_profile_ids_to_connections.py
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def run_migration():
    """Add profile ID columns to connections table"""
    conn = psycopg.connect(DATABASE_URL)

    try:
        with conn.cursor() as cur:
            print("\n" + "="*80)
            print("MIGRATION: Add Profile IDs to Connections Table")
            print("="*80 + "\n")

            # Step 1: Add requester_profile_id column
            print("Step 1: Adding requester_profile_id column...")
            cur.execute("""
                ALTER TABLE connections
                ADD COLUMN IF NOT EXISTS requester_profile_id INTEGER;
            """)
            print("[OK] Added requester_profile_id column")

            # Step 2: Add recipient_profile_id column
            print("\nStep 2: Adding recipient_profile_id column...")
            cur.execute("""
                ALTER TABLE connections
                ADD COLUMN IF NOT EXISTS recipient_profile_id INTEGER;
            """)
            print("[OK] Added recipient_profile_id column")

            # Step 3: Backfill requester_profile_id for existing connections
            print("\nStep 3: Backfilling requester_profile_id for existing connections...")

            # Backfill for tutors
            cur.execute("""
                UPDATE connections
                SET requester_profile_id = tp.id
                FROM tutor_profiles tp
                WHERE connections.requested_by = tp.user_id
                  AND connections.requester_type = 'tutor'
                  AND connections.requester_profile_id IS NULL;
            """)
            tutor_count = cur.rowcount
            print(f"  [OK] Updated {tutor_count} tutor connections")

            # Backfill for students
            cur.execute("""
                UPDATE connections
                SET requester_profile_id = sp.id
                FROM student_profiles sp
                WHERE connections.requested_by = sp.user_id
                  AND connections.requester_type = 'student'
                  AND connections.requester_profile_id IS NULL;
            """)
            student_count = cur.rowcount
            print(f"  [OK] Updated {student_count} student connections")

            # Backfill for parents
            cur.execute("""
                UPDATE connections
                SET requester_profile_id = pp.id
                FROM parent_profiles pp
                WHERE connections.requested_by = pp.user_id
                  AND connections.requester_type = 'parent'
                  AND connections.requester_profile_id IS NULL;
            """)
            parent_count = cur.rowcount
            print(f"  [OK] Updated {parent_count} parent connections")

            # Backfill for advertisers
            cur.execute("""
                UPDATE connections
                SET requester_profile_id = ap.id
                FROM advertiser_profiles ap
                WHERE connections.requested_by = ap.user_id
                  AND connections.requester_type = 'advertiser'
                  AND connections.requester_profile_id IS NULL;
            """)
            advertiser_count = cur.rowcount
            print(f"  [OK] Updated {advertiser_count} advertiser connections")

            # Step 4: Backfill recipient_profile_id for existing connections
            print("\nStep 4: Backfilling recipient_profile_id for existing connections...")

            # Backfill for tutors
            cur.execute("""
                UPDATE connections
                SET recipient_profile_id = tp.id
                FROM tutor_profiles tp
                WHERE connections.recipient_id = tp.user_id
                  AND connections.recipient_type = 'tutor'
                  AND connections.recipient_profile_id IS NULL;
            """)
            tutor_count = cur.rowcount
            print(f"  [OK] Updated {tutor_count} tutor connections")

            # Backfill for students
            cur.execute("""
                UPDATE connections
                SET recipient_profile_id = sp.id
                FROM student_profiles sp
                WHERE connections.recipient_id = sp.user_id
                  AND connections.recipient_type = 'student'
                  AND connections.recipient_profile_id IS NULL;
            """)
            student_count = cur.rowcount
            print(f"  [OK] Updated {student_count} student connections")

            # Backfill for parents
            cur.execute("""
                UPDATE connections
                SET recipient_profile_id = pp.id
                FROM parent_profiles pp
                WHERE connections.recipient_id = pp.user_id
                  AND connections.recipient_type = 'parent'
                  AND connections.recipient_profile_id IS NULL;
            """)
            parent_count = cur.rowcount
            print(f"  [OK] Updated {parent_count} parent connections")

            # Backfill for advertisers
            cur.execute("""
                UPDATE connections
                SET recipient_profile_id = ap.id
                FROM advertiser_profiles ap
                WHERE connections.recipient_id = ap.user_id
                  AND connections.recipient_type = 'advertiser'
                  AND connections.recipient_profile_id IS NULL;
            """)
            advertiser_count = cur.rowcount
            print(f"  [OK] Updated {advertiser_count} advertiser connections")

            # Step 5: Verify the migration
            print("\nStep 5: Verifying migration...")
            cur.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT(requester_profile_id) as with_requester_profile,
                    COUNT(recipient_profile_id) as with_recipient_profile
                FROM connections;
            """)

            row = cur.fetchone()
            total, with_requester, with_recipient = row

            print(f"  Total connections: {total}")
            print(f"  With requester_profile_id: {with_requester}")
            print(f"  With recipient_profile_id: {with_recipient}")

            if with_requester == total and with_recipient == total:
                print("\n[OK] All connections successfully backfilled!")
            else:
                print(f"\n[WARNING]  Warning: {total - with_requester} connections missing requester_profile_id")
                print(f"[WARNING]  Warning: {total - with_recipient} connections missing recipient_profile_id")

            # Commit the transaction
            conn.commit()

            print("\n" + "="*80)
            print("MIGRATION COMPLETED SUCCESSFULLY!")
            print("="*80 + "\n")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
