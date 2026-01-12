"""
Migration: Revert column names back to inviter_user_id

Changes:
- invited_by_user_id → inviter_user_id
- invited_to_user_id → invitee_user_id
- inviter_type stays the same
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("="*80)
print("MIGRATION: Revert to inviter_user_id / invitee_user_id")
print("="*80)

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:

        print("\n[STEP 1] Renaming columns back...")
        print("-"*80)

        try:
            # Rename invited_by_user_id back to inviter_user_id
            print("Renaming invited_by_user_id to inviter_user_id...")
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN invited_by_user_id TO inviter_user_id;
            """)
            print("[OK] Renamed invited_by_user_id to inviter_user_id")

            # Rename invited_to_user_id back to invitee_user_id
            print("Renaming invited_to_user_id to invitee_user_id...")
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN invited_to_user_id TO invitee_user_id;
            """)
            print("[OK] Renamed invited_to_user_id to invitee_user_id")

            conn.commit()
            print("\n[OK] All columns renamed successfully!")

        except Exception as e:
            print(f"[ERROR] Migration failed: {e}")
            conn.rollback()
            raise

        # Verify the new column names
        print("\n[STEP 2] Verifying column names...")
        print("-"*80)

        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'parent_invitations'
            AND column_name IN (
                'inviter_user_id', 'inviter_type', 'invitee_user_id'
            )
            ORDER BY column_name;
        """)
        columns = cur.fetchall()

        print("Current invitation columns:")
        for col in columns:
            print(f"  - {col['column_name']} ({col['data_type']})")

        print("\n[STEP 3] Final column names:")
        print("-"*80)
        print("USER-BASED SYSTEM:")
        print("  - inviter_user_id (user_id of who sent invitation)")
        print("  - inviter_type (profile type: 'student', 'parent', 'tutor')")
        print("  - invitee_user_id (user_id of who is receiving invitation)")

print("\n" + "="*80)
print("MIGRATION COMPLETE!")
print("="*80)
print("\nNEXT STEPS:")
print("1. Update backend code references back to inviter_user_id and invitee_user_id")
print("2. Test invitation creation and retrieval")
print("="*80)
