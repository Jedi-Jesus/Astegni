"""
Migration: Drop old redundant profile-based columns

The system now uses user_id columns (inviter_user_id, inviter_type, invitee_user_id).
The old profile-based columns (invited_by, invited_to, invited_by_type, invited_to_type)
are no longer needed and can be safely dropped.

IMPORTANT: This is a destructive migration. Make sure the new user-based system
is working correctly before running this.
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("="*80)
print("MIGRATION: Drop Old Profile-Based Invitation Columns")
print("="*80)
print("\nWARNING: This will permanently remove the old profile-based columns!")
print("The system now uses inviter_user_id, inviter_type, invitee_user_id exclusively.")
print("\nColumns to be dropped:")
print("  - invited_by (old profile_id)")
print("  - invited_by_type (old profile type)")
print("  - invited_to (old profile_id)")
print("  - invited_to_type (old profile type)")
print("\nColumns to be kept (NEW SYSTEM):")
print("  - inviter_user_id (user_id)")
print("  - inviter_type (profile type)")
print("  - invitee_user_id (user_id)")
print("="*80)

# Ask for confirmation
response = input("\nAre you sure you want to proceed? (yes/no): ")
if response.lower() != 'yes':
    print("\n[CANCELLED] Migration aborted by user")
    exit(0)

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:

        print("\n[STEP 1] Checking data integrity...")
        print("-"*80)

        # Verify all invitations have the new columns populated
        cur.execute("""
            SELECT COUNT(*) as total,
                   COUNT(inviter_user_id) as has_inviter_user_id,
                   COUNT(inviter_type) as has_inviter_type,
                   COUNT(invitee_user_id) as has_invitee_user_id_or_is_new
            FROM parent_invitations
        """)
        stats = cur.fetchone()

        print(f"Total invitations: {stats['total']}")
        print(f"  - With inviter_user_id: {stats['has_inviter_user_id']}")
        print(f"  - With inviter_type: {stats['has_inviter_type']}")

        # Check for invitations that might have issues
        cur.execute("""
            SELECT COUNT(*) as problematic
            FROM parent_invitations
            WHERE inviter_user_id IS NULL
               OR inviter_type IS NULL
               OR (invitee_user_id IS NULL AND is_new_user = FALSE)
        """)
        problematic = cur.fetchone()['problematic']

        if problematic > 0:
            print(f"\n[ERROR] Found {problematic} invitations with missing user_id data!")
            print("Please fix these before dropping old columns:")
            cur.execute("""
                SELECT id, inviter_user_id, inviter_type, invitee_user_id, is_new_user, status
                FROM parent_invitations
                WHERE inviter_user_id IS NULL
                   OR inviter_type IS NULL
                   OR (invitee_user_id IS NULL AND is_new_user = FALSE)
            """)
            for inv in cur.fetchall():
                print(f"  Invitation ID={inv['id']}: inviter_user_id={inv['inviter_user_id']}, inviter_type={inv['inviter_type']}, invitee_user_id={inv['invitee_user_id']}, is_new_user={inv['is_new_user']}")
            print("\n[CANCELLED] Migration aborted - fix data integrity issues first")
            exit(1)

        print("[OK] All invitations have valid user_id data")

        print("\n[STEP 2] Dropping old columns...")
        print("-"*80)

        try:
            # Drop invited_by
            print("Dropping column: invited_by...")
            cur.execute("""
                ALTER TABLE parent_invitations
                DROP COLUMN invited_by;
            """)
            print("[OK] Dropped invited_by")

            # Drop invited_to
            print("Dropping column: invited_to...")
            cur.execute("""
                ALTER TABLE parent_invitations
                DROP COLUMN invited_to;
            """)
            print("[OK] Dropped invited_to")

            # Drop invited_by_type
            print("Dropping column: invited_by_type...")
            cur.execute("""
                ALTER TABLE parent_invitations
                DROP COLUMN invited_by_type;
            """)
            print("[OK] Dropped invited_by_type")

            # Drop invited_to_type
            print("Dropping column: invited_to_type...")
            cur.execute("""
                ALTER TABLE parent_invitations
                DROP COLUMN invited_to_type;
            """)
            print("[OK] Dropped invited_to_type")

            conn.commit()
            print("\n[OK] All old columns dropped successfully!")

        except Exception as e:
            print(f"[ERROR] Migration failed: {e}")
            conn.rollback()
            raise

        # Verify the columns are gone
        print("\n[STEP 3] Verifying column removal...")
        print("-"*80)

        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'parent_invitations'
            AND column_name IN (
                'invited_by', 'invited_by_type',
                'invited_to', 'invited_to_type',
                'inviter_user_id', 'inviter_type',
                'invitee_user_id'
            )
            ORDER BY column_name;
        """)
        columns = cur.fetchall()

        print("Remaining invitation columns:")
        for col in columns:
            print(f"  - {col['column_name']} ({col['data_type']})")

        # Final summary
        print("\n[STEP 4] Migration summary:")
        print("-"*80)
        print("DROPPED (Old profile-based system):")
        print("  - invited_by")
        print("  - invited_by_type")
        print("  - invited_to")
        print("  - invited_to_type")
        print("\nKEPT (New user-based system):")
        print("  - inviter_user_id")
        print("  - inviter_type")
        print("  - invitee_user_id")

print("\n" + "="*80)
print("MIGRATION COMPLETE!")
print("="*80)
print("\nNEXT STEPS:")
print("1. Test invitation creation and retrieval")
print("2. Verify all invitation functionality works")
print("3. Remove any remaining references to old columns in comments/docs")
print("="*80)
