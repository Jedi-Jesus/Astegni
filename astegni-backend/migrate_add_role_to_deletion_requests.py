"""
Migration: Add role tracking to account deletion requests
Purpose: Support role-based deletion (delete profile, not user, unless it's the only role)

Changes:
1. Add 'role' column to track which role is being deleted
2. Add 'profile_id' column to track the specific profile being deleted
3. Add 'delete_user' column to track if user should be deleted (when it's the only role)
"""

import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)

def run_migration():
    """Add role-based deletion columns to account_deletion_requests"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Add role column (which role is being deleted)
        cursor.execute("""
            ALTER TABLE account_deletion_requests
            ADD COLUMN IF NOT EXISTS role VARCHAR(20);
        """)
        print("Added 'role' column")

        # Add profile_id column (the specific profile being deleted)
        cursor.execute("""
            ALTER TABLE account_deletion_requests
            ADD COLUMN IF NOT EXISTS profile_id INTEGER;
        """)
        print("Added 'profile_id' column")

        # Add delete_user flag (true if this is the user's only role)
        cursor.execute("""
            ALTER TABLE account_deletion_requests
            ADD COLUMN IF NOT EXISTS delete_user BOOLEAN DEFAULT FALSE;
        """)
        print("Added 'delete_user' column")

        # Add index on role for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_deletion_requests_role
            ON account_deletion_requests(role);
        """)
        print("Created index on role")

        conn.commit()
        print("\nMigration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def verify_migration():
    """Verify the migration was successful"""
    conn = get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'account_deletion_requests'
            AND column_name IN ('role', 'profile_id', 'delete_user')
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()

        print("\n=== New columns in account_deletion_requests ===")
        for col in columns:
            print(f"  {col[0]}: {col[1]} (default: {col[2]})")

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Running role-based deletion migration...")
    print("=" * 50)
    run_migration()
    print("\n" + "=" * 50)
    print("Verifying migration...")
    verify_migration()
