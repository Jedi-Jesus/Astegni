"""
Migration: Add languages to users table and remove deprecated fields from parent_profiles
- Add languages (JSON) to users table
- Remove profile_picture from parent_profiles (now in users table)
- Remove location from parent_profiles (now in users table)
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    # Get database URL
    db_url = os.getenv('DATABASE_URL')

    # Fix for psycopg3
    if db_url.startswith('postgresql://'):
        db_url = db_url.replace('postgresql://', 'postgresql+psycopg://')

    engine = create_engine(db_url)

    with engine.connect() as conn:
        print("Starting migration...")

        # Step 1: Add languages column to users table
        print("\n1. Adding languages column to users table...")
        try:
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS languages JSON DEFAULT '[]'::json
            """))
            conn.commit()
            print("[OK] Added languages column to users table")
        except Exception as e:
            print(f"[ERROR] Error adding languages column: {e}")
            conn.rollback()
            raise

        # Step 2: Migrate existing data from parent_profiles to users
        print("\n2. Migrating profile_picture and location from parent_profiles to users...")
        try:
            # Update users table with data from parent_profiles where users data is NULL
            conn.execute(text("""
                UPDATE users u
                SET
                    profile_picture = COALESCE(u.profile_picture, pp.profile_picture),
                    location = COALESCE(u.location, pp.location)
                FROM parent_profiles pp
                WHERE u.id = pp.user_id
                AND (u.profile_picture IS NULL OR u.location IS NULL)
            """))
            conn.commit()
            print("[OK] Migrated profile_picture and location data to users table")
        except Exception as e:
            print(f"[ERROR] Error migrating data: {e}")
            conn.rollback()
            raise

        # Step 3: Remove deprecated columns from parent_profiles
        print("\n3. Removing deprecated columns from parent_profiles...")
        try:
            conn.execute(text("""
                ALTER TABLE parent_profiles
                DROP COLUMN IF EXISTS profile_picture
            """))
            conn.commit()
            print("[OK] Removed profile_picture column from parent_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing profile_picture: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE parent_profiles
                DROP COLUMN IF EXISTS location
            """))
            conn.commit()
            print("[OK] Removed location column from parent_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing location: {e}")
            conn.rollback()
            raise

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nSummary:")
        print("- Added languages (JSON) column to users table")
        print("- Migrated profile_picture from parent_profiles to users")
        print("- Migrated location from parent_profiles to users")
        print("- Removed profile_picture column from parent_profiles")
        print("- Removed location column from parent_profiles")

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Add languages and remove deprecated parent fields")
    print("=" * 60)

    response = input("\nThis will modify the database schema. Continue? (yes/no): ")
    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
