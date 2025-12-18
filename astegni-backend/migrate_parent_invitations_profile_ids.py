"""
Migration: Update parent_invitations table to use profile IDs instead of user IDs
- Rename invitee_id to invites_id
- Change inviter_id to store profile ID (student_profiles.id, tutor_profiles.id, etc.)
- Change invites_id to store profile ID (parent_profiles.id, tutor_profiles.id, etc.)
- Add inviter_profile_type and invites_profile_type columns to track which profile table
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def migrate():
    conn = get_connection()
    cur = conn.cursor()

    try:
        print("Starting migration: parent_invitations to use profile IDs...")

        # Step 1: Add new columns for profile type tracking
        print("\n1. Adding profile type columns...")
        cur.execute("""
            ALTER TABLE parent_invitations
            ADD COLUMN IF NOT EXISTS inviter_profile_type VARCHAR(50),
            ADD COLUMN IF NOT EXISTS invites_profile_type VARCHAR(50)
        """)
        conn.commit()
        print("   [OK] Added inviter_profile_type and invites_profile_type columns")

        # Step 2: Rename invitee_id to invites_id
        print("\n2. Renaming invitee_id to invites_id...")

        # Check if invitee_id exists and invites_id doesn't
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'parent_invitations' AND column_name IN ('invitee_id', 'invites_id')
        """)
        existing_columns = [row['column_name'] for row in cur.fetchall()]

        if 'invitee_id' in existing_columns and 'invites_id' not in existing_columns:
            # Drop the foreign key constraint first
            cur.execute("""
                ALTER TABLE parent_invitations
                DROP CONSTRAINT IF EXISTS parent_invitations_parent_user_id_fkey
            """)

            # Drop the unique constraint
            cur.execute("""
                ALTER TABLE parent_invitations
                DROP CONSTRAINT IF EXISTS parent_invitations_student_user_id_parent_user_id_key
            """)

            # Rename the column
            cur.execute("""
                ALTER TABLE parent_invitations
                RENAME COLUMN invitee_id TO invites_id
            """)
            conn.commit()
            print("   [OK] Renamed invitee_id to invites_id")
        elif 'invites_id' in existing_columns:
            print("   [OK] Column already named invites_id")
        else:
            print("   [ERROR] invitee_id column not found!")
            return

        # Step 3: Drop old foreign key constraint on inviter_id
        print("\n3. Dropping old foreign key constraints...")
        cur.execute("""
            ALTER TABLE parent_invitations
            DROP CONSTRAINT IF EXISTS parent_invitations_student_user_id_fkey
        """)
        conn.commit()
        print("   [OK] Dropped old foreign key constraints")

        # Step 4: Update existing data - convert user_ids to profile_ids
        print("\n4. Converting existing user IDs to profile IDs...")

        # Get all existing invitations
        cur.execute("SELECT id, inviter_id, invites_id FROM parent_invitations")
        invitations = cur.fetchall()

        for inv in invitations:
            inv_id = inv['id']
            old_inviter_id = inv['inviter_id']
            old_invites_id = inv['invites_id']

            # Find the inviter's profile (could be student, tutor, parent, etc.)
            new_inviter_id = None
            inviter_profile_type = None

            if old_inviter_id:
                # Check student_profiles first (most common for parent invitations)
                cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (old_inviter_id,))
                result = cur.fetchone()
                if result:
                    new_inviter_id = result['id']
                    inviter_profile_type = 'student'
                else:
                    # Check tutor_profiles
                    cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (old_inviter_id,))
                    result = cur.fetchone()
                    if result:
                        new_inviter_id = result['id']
                        inviter_profile_type = 'tutor'
                    else:
                        # Check parent_profiles
                        cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (old_inviter_id,))
                        result = cur.fetchone()
                        if result:
                            new_inviter_id = result['id']
                            inviter_profile_type = 'parent'

            # Find the invitee's profile (usually parent)
            new_invites_id = None
            invites_profile_type = None

            if old_invites_id:
                # Check parent_profiles first (most common for invitee)
                cur.execute("SELECT id FROM parent_profiles WHERE user_id = %s", (old_invites_id,))
                result = cur.fetchone()
                if result:
                    new_invites_id = result['id']
                    invites_profile_type = 'parent'
                else:
                    # Check tutor_profiles
                    cur.execute("SELECT id FROM tutor_profiles WHERE user_id = %s", (old_invites_id,))
                    result = cur.fetchone()
                    if result:
                        new_invites_id = result['id']
                        invites_profile_type = 'tutor'
                    else:
                        # Check student_profiles
                        cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (old_invites_id,))
                        result = cur.fetchone()
                        if result:
                            new_invites_id = result['id']
                            invites_profile_type = 'student'

            # Update the record
            cur.execute("""
                UPDATE parent_invitations
                SET inviter_id = %s,
                    inviter_profile_type = %s,
                    invites_id = %s,
                    invites_profile_type = %s
                WHERE id = %s
            """, (new_inviter_id or old_inviter_id, inviter_profile_type,
                  new_invites_id, invites_profile_type, inv_id))

            print(f"   Updated invitation {inv_id}: inviter {old_inviter_id} -> {new_inviter_id} ({inviter_profile_type}), invites {old_invites_id} -> {new_invites_id} ({invites_profile_type})")

        conn.commit()
        print(f"   [OK] Updated {len(invitations)} invitations")

        # Step 5: Update indexes
        print("\n5. Updating indexes...")
        cur.execute("DROP INDEX IF EXISTS idx_parent_invitations_parent")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_parent_invitations_invites ON parent_invitations(invites_id)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_parent_invitations_inviter_type ON parent_invitations(inviter_profile_type)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_parent_invitations_invites_type ON parent_invitations(invites_profile_type)")
        conn.commit()
        print("   [OK] Updated indexes")

        # Step 6: Add new unique constraint
        print("\n6. Adding new unique constraint...")
        cur.execute("""
            ALTER TABLE parent_invitations
            DROP CONSTRAINT IF EXISTS parent_invitations_inviter_invites_unique
        """)
        cur.execute("""
            ALTER TABLE parent_invitations
            ADD CONSTRAINT parent_invitations_inviter_invites_unique
            UNIQUE (inviter_id, inviter_profile_type, invites_id, invites_profile_type)
        """)
        conn.commit()
        print("   [OK] Added unique constraint")

        print("\n[SUCCESS] Migration completed successfully!")

        # Show the updated table structure
        print("\nUpdated table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'parent_invitations'
            ORDER BY ordinal_position
        """)
        for row in cur.fetchall():
            print(f"   {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']})")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
