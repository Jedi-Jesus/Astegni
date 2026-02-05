"""
Migration: Remove deprecated fields from tutor_profiles table
- Remove profile_picture from tutor_profiles (now in users table)
- Remove location from tutor_profiles (now in users table)
- Remove social_links from tutor_profiles (now in users table)
- Remove languages from tutor_profiles (now in users table)

Note: users.languages was already added in the parent migration
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

        # Step 1: Migrate existing data from tutor_profiles to users
        print("\n1. Migrating profile_picture, location, social_links, and languages from tutor_profiles to users...")
        try:
            # Update users table with data from tutor_profiles where users data is NULL
            conn.execute(text("""
                UPDATE users u
                SET
                    profile_picture = COALESCE(u.profile_picture, tp.profile_picture),
                    location = COALESCE(u.location, tp.location),
                    social_links = COALESCE(u.social_links, tp.social_links),
                    languages = COALESCE(u.languages, tp.languages)
                FROM tutor_profiles tp
                WHERE u.id = tp.user_id
                AND (u.profile_picture IS NULL OR u.location IS NULL OR u.social_links IS NULL OR u.languages IS NULL)
            """))
            conn.commit()
            print("[OK] Migrated data to users table")
        except Exception as e:
            print(f"[ERROR] Error migrating data: {e}")
            conn.rollback()
            raise

        # Step 2: Remove deprecated columns from tutor_profiles
        print("\n2. Removing deprecated columns from tutor_profiles...")

        try:
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                DROP COLUMN IF EXISTS profile_picture
            """))
            conn.commit()
            print("[OK] Removed profile_picture column from tutor_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing profile_picture: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                DROP COLUMN IF EXISTS location
            """))
            conn.commit()
            print("[OK] Removed location column from tutor_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing location: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                DROP COLUMN IF EXISTS social_links
            """))
            conn.commit()
            print("[OK] Removed social_links column from tutor_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing social_links: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                DROP COLUMN IF EXISTS languages
            """))
            conn.commit()
            print("[OK] Removed languages column from tutor_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing languages: {e}")
            conn.rollback()
            raise

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nSummary:")
        print("- Migrated profile_picture from tutor_profiles to users")
        print("- Migrated location from tutor_profiles to users")
        print("- Migrated social_links from tutor_profiles to users")
        print("- Migrated languages from tutor_profiles to users")
        print("- Removed profile_picture column from tutor_profiles")
        print("- Removed location column from tutor_profiles")
        print("- Removed social_links column from tutor_profiles")
        print("- Removed languages column from tutor_profiles")

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Remove deprecated tutor fields")
    print("=" * 60)

    response = input("\nThis will modify the database schema. Continue? (yes/no): ")
    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
