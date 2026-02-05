"""
Migration: Add display_location column to users table
Purpose: Allow users to toggle whether their location is visible on their public profile
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    """Add display_location column to users table"""
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print("Starting migration: Add display_location to users table")

        # Check if column already exists
        check_query = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name = 'display_location';
        """)

        result = conn.execute(check_query)
        exists = result.fetchone() is not None

        if exists:
            print("⚠️  Column 'display_location' already exists in users table")
            return

        # Add display_location column (default FALSE - hide location by default for privacy)
        add_column_query = text("""
            ALTER TABLE users
            ADD COLUMN display_location BOOLEAN DEFAULT FALSE;
        """)

        conn.execute(add_column_query)
        conn.commit()

        print("✅ Successfully added display_location column to users table")
        print("   - Type: BOOLEAN")
        print("   - Default: FALSE (location hidden by default for privacy)")

        # Verify the column was added
        verify_query = text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name = 'display_location';
        """)

        result = conn.execute(verify_query)
        row = result.fetchone()

        if row:
            print(f"\n✅ Verification successful:")
            print(f"   Column: {row[0]}")
            print(f"   Type: {row[1]}")
            print(f"   Default: {row[2]}")
        else:
            print("\n❌ Verification failed - column not found")

if __name__ == "__main__":
    try:
        run_migration()
        print("\n✅ Migration completed successfully!")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise
