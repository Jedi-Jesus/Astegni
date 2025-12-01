"""
Migration: Remove username column from users table

This migration removes the username column from the users table since
username is now stored in role-specific profile tables:
- tutor_profiles.username
- student_profiles.username
- parent_profiles.username
- advertiser_profiles.username

Author: System
Date: 2025-01-19
"""

import psycopg
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Remove username column from users table"""

    print("🔄 Starting migration: Remove username from users table")

    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("✅ Connected to database")

        # Step 1: Check if username column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'username';
        """)

        column_exists = cursor.fetchone() is not None

        if not column_exists:
            print("ℹ️  Username column does not exist in users table (already removed or never existed)")
            cursor.close()
            conn.close()
            return

        print("📋 Username column found in users table")

        # Step 2: Drop the unique constraint and index first
        print("🗑️  Dropping username unique constraint and index...")
        try:
            cursor.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;")
            print("   ✅ Dropped unique constraint (if existed)")
        except Exception as e:
            print(f"   ⚠️  Could not drop unique constraint: {e}")

        try:
            cursor.execute("DROP INDEX IF EXISTS ix_users_username;")
            print("   ✅ Dropped username index (if existed)")
        except Exception as e:
            print(f"   ⚠️  Could not drop index: {e}")

        # Step 3: Remove the username column
        print("🗑️  Dropping username column from users table...")
        cursor.execute("ALTER TABLE users DROP COLUMN IF EXISTS username;")
        print("   ✅ Dropped username column")

        # Commit the changes
        conn.commit()
        print("✅ Migration completed successfully!")
        print("📝 Summary:")
        print("   - Removed username column from users table")
        print("   - Username is now only stored in role-specific profile tables")
        print("   - tutor_profiles.username, student_profiles.username, etc.")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
