"""
Migration: Remove hobbies column from user_profiles
Description: Removes hobbies field since interested_in already covers user interests
Date: 2025-01-18
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def run_migration():
    """Remove hobbies column from user_profiles table"""

    print("=" * 60)
    print("Removing hobbies column from user_profiles...")
    print("=" * 60)

    drop_column_sql = text("""
    ALTER TABLE user_profiles DROP COLUMN IF EXISTS hobbies;
    """)

    try:
        with engine.connect() as conn:
            # Drop hobbies column
            conn.execute(drop_column_sql)
            print("[OK] hobbies column removed successfully")

            conn.commit()

            # Verify column removal
            result = conn.execute(text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'user_profiles'
                ORDER BY ordinal_position;
            """))

            print("\n" + "=" * 60)
            print("Updated table structure:")
            print("=" * 60)
            for row in result:
                print(f"  {row.column_name:<35} {row.data_type}")

            print("\n" + "=" * 60)
            print("[SUCCESS] Migration completed successfully!")
            print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Error removing hobbies column: {e}")
        raise

if __name__ == "__main__":
    run_migration()
