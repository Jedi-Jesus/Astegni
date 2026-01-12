"""
Migration: Convert parent_invitations from profile_id to user_id system

CRITICAL CHANGES:
1. Add new columns: inviter_user_id, inviter_type, invitee_user_id
2. Migrate existing data from profile_id to user_id
3. Keep old columns for backward compatibility (will be deprecated later)
4. Add inviter_type to distinguish which profile sent the invitation

WHY THIS MIGRATION:
- Invitations should be visible across ALL profiles (student, tutor, parent)
- Avoid collision between user_id and profile_id (e.g., user_id=115 vs parent_profile_id=115)
- Simplify invitation logic by using user_id instead of profile_id + profile_type
"""

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

print("="*80)
print("MIGRATION: Convert Parent Invitations to User-ID System")
print("="*80)

with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
    with conn.cursor() as cur:

        # Step 1: Add new columns
        print("\n[STEP 1] Adding new columns to parent_invitations table...")
        print("-"*80)

        try:
            # Add inviter_user_id (who sent the invitation)
            cur.execute("""
                ALTER TABLE parent_invitations
                ADD COLUMN IF NOT EXISTS inviter_user_id INTEGER;
            """)
            print("[OK] Added column: inviter_user_id")

            # Add inviter_type (which profile type sent the invitation)
            cur.execute("""
                ALTER TABLE parent_invitations
                ADD COLUMN IF NOT EXISTS inviter_type VARCHAR(50);
            """)
            print("[OK] Added column: inviter_type")

            # Add invitee_user_id (who is being invited)
            cur.execute("""
                ALTER TABLE parent_invitations
                ADD COLUMN IF NOT EXISTS invitee_user_id INTEGER;
            """)
            print("[OK] Added column: invitee_user_id")

            conn.commit()
            print("[OK] All new columns added successfully!")

        except Exception as e:
            print(f"[ERROR] Failed to add columns: {e}")
            conn.rollback()
            raise

        # Step 2: Migrate existing data
        print("\n[STEP 2] Migrating existing invitation data from profile_id to user_id...")
        print("-"*80)

        try:
            # Get all existing invitations
            cur.execute("SELECT * FROM parent_invitations ORDER BY id")
            invitations = cur.fetchall()

            print(f"Found {len(invitations)} invitations to migrate")

            migrated_count = 0
            failed_count = 0

            for inv in invitations:
                invitation_id = inv['id']
                inviter_id = inv['inviter_id']  # This is currently a profile_id
                inviter_profile_type = inv['inviter_profile_type']
                invites_id = inv['invites_id']  # This is currently a profile_id
                invites_profile_type = inv['invites_profile_type']

                print(f"\n  Migrating invitation ID={invitation_id}...")
                print(f"    Old: inviter_id={inviter_id} ({inviter_profile_type}), invites_id={invites_id} ({invites_profile_type})")

                # Find inviter's user_id from profile_id
                inviter_user_id = None
                if inviter_profile_type == 'student':
                    cur.execute("SELECT user_id FROM student_profiles WHERE id = %s", (inviter_id,))
                    result = cur.fetchone()
                    inviter_user_id = result['user_id'] if result else None
                elif inviter_profile_type == 'tutor':
                    cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (inviter_id,))
                    result = cur.fetchone()
                    inviter_user_id = result['user_id'] if result else None
                elif inviter_profile_type == 'parent':
                    cur.execute("SELECT user_id FROM parent_profiles WHERE id = %s", (inviter_id,))
                    result = cur.fetchone()
                    inviter_user_id = result['user_id'] if result else None

                # Find invitee's user_id from profile_id
                invitee_user_id = None
                if invites_profile_type == 'student':
                    cur.execute("SELECT user_id FROM student_profiles WHERE id = %s", (invites_id,))
                    result = cur.fetchone()
                    invitee_user_id = result['user_id'] if result else None
                elif invites_profile_type == 'tutor':
                    cur.execute("SELECT user_id FROM tutor_profiles WHERE id = %s", (invites_id,))
                    result = cur.fetchone()
                    invitee_user_id = result['user_id'] if result else None
                elif invites_profile_type == 'parent':
                    cur.execute("SELECT user_id FROM parent_profiles WHERE id = %s", (invites_id,))
                    result = cur.fetchone()
                    invitee_user_id = result['user_id'] if result else None

                if inviter_user_id and invitee_user_id:
                    # Update the invitation with new user_id columns
                    cur.execute("""
                        UPDATE parent_invitations
                        SET inviter_user_id = %s,
                            inviter_type = %s,
                            invitee_user_id = %s
                        WHERE id = %s
                    """, (inviter_user_id, inviter_profile_type, invitee_user_id, invitation_id))

                    print(f"    New: inviter_user_id={inviter_user_id} ({inviter_profile_type}), invitee_user_id={invitee_user_id}")
                    print(f"    [OK] Migrated successfully!")
                    migrated_count += 1
                else:
                    print(f"    [WARN] Could not find user_id for profile_id!")
                    print(f"          inviter_user_id={inviter_user_id}, invitee_user_id={invitee_user_id}")
                    failed_count += 1

            conn.commit()
            print(f"\n[OK] Migration complete!")
            print(f"     Successfully migrated: {migrated_count}")
            print(f"     Failed to migrate: {failed_count}")

        except Exception as e:
            print(f"[ERROR] Migration failed: {e}")
            conn.rollback()
            raise

        # Step 3: Verify migration
        print("\n[STEP 3] Verifying migration...")
        print("-"*80)

        try:
            # Check how many invitations have new columns populated
            cur.execute("""
                SELECT
                    COUNT(*) as total,
                    COUNT(inviter_user_id) as with_inviter_user_id,
                    COUNT(inviter_type) as with_inviter_type,
                    COUNT(invitee_user_id) as with_invitee_user_id
                FROM parent_invitations
            """)
            stats = cur.fetchone()

            print(f"Total invitations: {stats['total']}")
            print(f"  - With inviter_user_id: {stats['with_inviter_user_id']}")
            print(f"  - With inviter_type: {stats['with_inviter_type']}")
            print(f"  - With invitee_user_id: {stats['with_invitee_user_id']}")

            if stats['total'] == stats['with_inviter_user_id'] == stats['with_inviter_type'] == stats['with_invitee_user_id']:
                print("\n[OK] All invitations successfully migrated!")
            else:
                print("\n[WARN] Some invitations may not have been migrated completely!")

            # Show sample migrated data
            print("\n[STEP 4] Sample migrated invitations:")
            print("-"*80)
            cur.execute("""
                SELECT
                    id,
                    inviter_id as old_inviter_profile_id,
                    inviter_profile_type,
                    inviter_user_id as new_inviter_user_id,
                    inviter_type as new_inviter_type,
                    invites_id as old_invitee_profile_id,
                    invites_profile_type,
                    invitee_user_id as new_invitee_user_id,
                    status
                FROM parent_invitations
                LIMIT 5
            """)
            samples = cur.fetchall()

            for inv in samples:
                print(f"\nInvitation ID={inv['id']}:")
                print(f"  OLD: inviter profile_id={inv['old_inviter_profile_id']} ({inv['inviter_profile_type']})")
                print(f"  NEW: inviter user_id={inv['new_inviter_user_id']} ({inv['new_inviter_type']})")
                print(f"  OLD: invitee profile_id={inv['old_invitee_profile_id']} ({inv['invites_profile_type']})")
                print(f"  NEW: invitee user_id={inv['new_invitee_user_id']}")
                print(f"  Status: {inv['status']}")

        except Exception as e:
            print(f"[ERROR] Verification failed: {e}")
            raise

print("\n" + "="*80)
print("MIGRATION COMPLETE!")
print("="*80)
print("\nNEXT STEPS:")
print("1. Update parent_invitation_endpoints.py to use user_id columns")
print("2. Update frontend invitation creation to send user_id instead of profile_id")
print("3. Test invitation creation and retrieval across all profile types")
print("4. After testing, consider adding NOT NULL constraints to new columns")
print("5. Eventually deprecate old columns (inviter_id, invites_id, inviter_profile_type, invites_profile_type)")
print("="*80)
