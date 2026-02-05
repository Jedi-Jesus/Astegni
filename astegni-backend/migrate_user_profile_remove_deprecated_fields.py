"""
Migration: Remove deprecated fields from user_profiles table
- Remove profile_picture from user_profiles (now in users table)
- Remove location from user_profiles (now in users table)
- Remove languages from user_profiles (now in users table as JSON)
- Remove social_links from user_profiles (now in users table)

Note: users.languages and users.social_links were already added in previous migrations
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

        # Step 1: Migrate existing data from user_profiles to users
        print("\n1. Migrating profile_picture, location, languages, and social_links from user_profiles to users...")
        try:
            # Update users table with data from user_profiles where users data is NULL
            # Note: user_profiles.languages is ARRAY, users.languages is JSON
            # Note: user_profiles.social_links is JSONB, users.social_links is JSON
            conn.execute(text("""
                UPDATE users u
                SET
                    profile_picture = COALESCE(u.profile_picture, up.profile_picture),
                    location = COALESCE(u.location, up.location),
                    languages = CASE
                        WHEN u.languages IS NULL AND up.languages IS NOT NULL
                        THEN to_jsonb(up.languages)::json
                        ELSE u.languages
                    END,
                    social_links = CASE
                        WHEN u.social_links IS NULL AND up.social_links IS NOT NULL
                        THEN up.social_links::json
                        ELSE u.social_links
                    END
                FROM user_profiles up
                WHERE u.id = up.user_id
                AND (u.profile_picture IS NULL OR u.location IS NULL OR u.languages IS NULL OR u.social_links IS NULL)
            """))
            conn.commit()
            print("[OK] Migrated data to users table")
        except Exception as e:
            print(f"[ERROR] Error migrating data: {e}")
            conn.rollback()
            raise

        # Step 2: Remove deprecated columns from user_profiles
        print("\n2. Removing deprecated columns from user_profiles...")

        try:
            conn.execute(text("""
                ALTER TABLE user_profiles
                DROP COLUMN IF EXISTS profile_picture
            """))
            conn.commit()
            print("[OK] Removed profile_picture column from user_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing profile_picture: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE user_profiles
                DROP COLUMN IF EXISTS location
            """))
            conn.commit()
            print("[OK] Removed location column from user_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing location: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE user_profiles
                DROP COLUMN IF EXISTS languages
            """))
            conn.commit()
            print("[OK] Removed languages column from user_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing languages: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE user_profiles
                DROP COLUMN IF EXISTS social_links
            """))
            conn.commit()
            print("[OK] Removed social_links column from user_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing social_links: {e}")
            conn.rollback()
            raise

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nSummary:")
        print("- Migrated profile_picture from user_profiles to users")
        print("- Migrated location from user_profiles to users")
        print("- Migrated languages from user_profiles to users (ARRAY -> JSON)")
        print("- Migrated social_links from user_profiles to users (JSONB -> JSON)")
        print("- Removed profile_picture column from user_profiles")
        print("- Removed location column from user_profiles")
        print("- Removed languages column from user_profiles")
        print("- Removed social_links column from user_profiles")

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Remove deprecated user profile fields")
    print("=" * 60)

    response = input("\nThis will modify the database schema. Continue? (yes/no): ")
    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
