"""
Migration: Update parent_invitations table for deferred account creation

Changes:
- Make parent_user_id nullable (for new users who don't have account yet)
- Add pending_email, pending_phone for new user invitations
- Add pending_first_name, pending_father_name, pending_grandfather_name
- Add pending_gender
- Add invitation_token for secure acceptance links
- Add is_new_user flag to distinguish existing vs new user invitations
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def run_migration():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Updating parent_invitations table...")

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'parent_invitations'
            )
        """)
        exists = cursor.fetchone()[0]

        if not exists:
            print("Table 'parent_invitations' does not exist. Please run migrate_create_parent_invitations.py first.")
            return

        # Check if columns already exist
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'parent_invitations'
        """)
        existing_columns = [row[0] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")

        # 1. Make parent_user_id nullable (drop and recreate constraint)
        if 'parent_user_id' in existing_columns:
            # Check if it's currently NOT NULL
            cursor.execute("""
                SELECT is_nullable FROM information_schema.columns
                WHERE table_name = 'parent_invitations' AND column_name = 'parent_user_id'
            """)
            is_nullable = cursor.fetchone()[0]
            if is_nullable == 'NO':
                print("Making parent_user_id nullable...")
                cursor.execute("ALTER TABLE parent_invitations ALTER COLUMN parent_user_id DROP NOT NULL")
                print("✓ parent_user_id is now nullable")

        # 2. Add is_new_user flag
        if 'is_new_user' not in existing_columns:
            print("Adding is_new_user column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN is_new_user BOOLEAN DEFAULT FALSE")
            print("✓ Added is_new_user column")

        # 3. Add pending user info columns
        if 'pending_email' not in existing_columns:
            print("Adding pending_email column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN pending_email VARCHAR(255)")
            print("✓ Added pending_email column")

        if 'pending_phone' not in existing_columns:
            print("Adding pending_phone column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN pending_phone VARCHAR(20)")
            print("✓ Added pending_phone column")

        if 'pending_first_name' not in existing_columns:
            print("Adding pending_first_name column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN pending_first_name VARCHAR(100)")
            print("✓ Added pending_first_name column")

        if 'pending_father_name' not in existing_columns:
            print("Adding pending_father_name column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN pending_father_name VARCHAR(100)")
            print("✓ Added pending_father_name column")

        if 'pending_grandfather_name' not in existing_columns:
            print("Adding pending_grandfather_name column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN pending_grandfather_name VARCHAR(100)")
            print("✓ Added pending_grandfather_name column")

        if 'pending_gender' not in existing_columns:
            print("Adding pending_gender column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN pending_gender VARCHAR(10)")
            print("✓ Added pending_gender column")

        # 4. Add invitation_token for secure links
        if 'invitation_token' not in existing_columns:
            print("Adding invitation_token column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN invitation_token VARCHAR(64) UNIQUE")
            print("✓ Added invitation_token column")

        # 5. Add token_expires_at for token expiration
        if 'token_expires_at' not in existing_columns:
            print("Adding token_expires_at column...")
            cursor.execute("ALTER TABLE parent_invitations ADD COLUMN token_expires_at TIMESTAMP")
            print("✓ Added token_expires_at column")

        # 6. Create index on invitation_token
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM pg_indexes
                WHERE indexname = 'idx_parent_invitations_token'
            )
        """)
        index_exists = cursor.fetchone()[0]
        if not index_exists:
            print("Creating index on invitation_token...")
            cursor.execute("CREATE INDEX idx_parent_invitations_token ON parent_invitations(invitation_token)")
            print("✓ Created index idx_parent_invitations_token")

        # 7. Create index on pending_email
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM pg_indexes
                WHERE indexname = 'idx_parent_invitations_pending_email'
            )
        """)
        index_exists = cursor.fetchone()[0]
        if not index_exists:
            print("Creating index on pending_email...")
            cursor.execute("CREATE INDEX idx_parent_invitations_pending_email ON parent_invitations(pending_email)")
            print("✓ Created index idx_parent_invitations_pending_email")

        conn.commit()
        print("\n✅ Successfully updated 'parent_invitations' table!")
        print("\nNew table structure supports:")
        print("  - Existing user invitations (parent_user_id set)")
        print("  - New user invitations (pending_* fields set, is_new_user=true)")
        print("  - Secure invitation tokens for email links")

    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
