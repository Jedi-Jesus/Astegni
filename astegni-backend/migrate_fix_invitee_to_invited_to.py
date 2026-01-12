"""
Migration: Rename invitee_user_id to invited_to_user_id

Final schema:
- inviter_user_id (who sent the invitation)
- inviter_type (profile type of sender)
- invited_to_user_id (who is receiving the invitation)
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("="*80)
print("MIGRATION: Rename invitee_user_id to invited_to_user_id")
print("="*80)

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:

        print("\n[STEP 1] Renaming column...")
        print("-"*80)

        try:
            # Rename invitee_user_id to invited_to_user_id
            print("Renaming invitee_user_id to invited_to_user_id...")
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN invitee_user_id TO invited_to_user_id;
            """)
            print("[OK] Renamed invitee_user_id to invited_to_user_id")

            conn.commit()
            print("\n[OK] Column renamed successfully!")

        except Exception as e:
            print(f"[ERROR] Migration failed: {e}")
            conn.rollback()
            raise

        # Verify the column names
        print("\n[STEP 2] Verifying column names...")
        print("-"*80)

        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'parent_invitations'
            AND column_name IN (
                'inviter_user_id', 'inviter_type', 'invited_to_user_id'
            )
            ORDER BY column_name;
        """)
        columns = cur.fetchall()

        print("Current invitation columns:")
        for col in columns:
            print(f"  - {col['column_name']} ({col['data_type']})")

        print("\n[STEP 3] Final schema:")
        print("-"*80)
        print("USER-BASED SYSTEM:")
        print("  - inviter_user_id (user_id of who sent invitation)")
        print("  - inviter_type (profile type: 'student', 'parent', 'tutor')")
        print("  - invited_to_user_id (user_id of who is receiving invitation)")

print("\n" + "="*80)
print("MIGRATION COMPLETE!")
print("="*80)
print("\nNEXT STEPS:")
print("1. Update backend code: invitee_user_id to invited_to_user_id")
print("2. Test invitation creation and retrieval")
print("="*80)
