"""
Migration: Rename old profile_id columns for clarity

Changes:
- inviter_id → invited_by (OLD profile_id column)
- invites_id → invited_to (OLD profile_id column)

This makes it clear that these are the OLD columns (profile-based)
while the NEW columns are:
- inviter_user_id (NEW user_id column)
- invitee_user_id (NEW user_id column)
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("="*80)
print("MIGRATION: Rename Old Invitation Columns")
print("="*80)

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:

        print("\n[STEP 1] Renaming columns...")
        print("-"*80)

        try:
            # Rename inviter_id to invited_by
            print("Renaming inviter_id to invited_by...")
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN inviter_id TO invited_by;
            """)
            print("[OK] Renamed inviter_id to invited_by")

            # Rename invites_id to invited_to
            print("Renaming invites_id to invited_to...")
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN invites_id TO invited_to;
            """)
            print("[OK] Renamed invites_id to invited_to")

            # Rename inviter_profile_type to invited_by_type (for consistency)
            print("Renaming inviter_profile_type to invited_by_type...")
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN inviter_profile_type TO invited_by_type;
            """)
            print("[OK] Renamed inviter_profile_type to invited_by_type")

            # Rename invites_profile_type to invited_to_type (for consistency)
            print("Renaming invites_profile_type to invited_to_type...")
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN invites_profile_type TO invited_to_type;
            """)
            print("[OK] Renamed invites_profile_type to invited_to_type")

            conn.commit()
            print("\n[OK] All columns renamed successfully!")

        except Exception as e:
            print(f"[ERROR] Migration failed: {e}")
            conn.rollback()
            raise

        # Verify the new column names
        print("\n[STEP 2] Verifying new column names...")
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

        print("Current invitation columns:")
        for col in columns:
            print(f"  - {col['column_name']} ({col['data_type']})")

        print("\n[STEP 3] Column naming summary:")
        print("-"*80)
        print("OLD SYSTEM (Profile-based - DEPRECATED):")
        print("  - invited_by (profile_id)")
        print("  - invited_by_type ('student', 'parent', 'tutor')")
        print("  - invited_to (profile_id)")
        print("  - invited_to_type ('student', 'parent', 'tutor')")
        print("\nNEW SYSTEM (User-based - PRIMARY):")
        print("  - inviter_user_id (user_id)")
        print("  - inviter_type ('student', 'parent', 'tutor')")
        print("  - invitee_user_id (user_id)")

print("\n" + "="*80)
print("MIGRATION COMPLETE!")
print("="*80)
print("\nNEXT STEPS:")
print("1. Update any backend code that references old column names")
print("2. Test invitation creation and retrieval")
print("3. Verify no breaking changes")
print("="*80)
