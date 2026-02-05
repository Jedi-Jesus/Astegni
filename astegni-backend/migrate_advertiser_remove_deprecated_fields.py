"""
Migration: Remove deprecated fields from advertiser_profiles table
- Remove profile_picture from advertiser_profiles (now in users table)
- Remove location from advertiser_profiles (now in users table as VARCHAR)
- Remove socials from advertiser_profiles (maps to users.social_links)

Note: users.languages and users.social_links were already added in the parent migration
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

        # Step 1: Migrate existing data from advertiser_profiles to users
        print("\n1. Migrating profile_picture, location, and socials from advertiser_profiles to users...")
        try:
            # Update users table with data from advertiser_profiles where users data is NULL
            # Note: advertiser_profiles.location is ARRAY, users.location is VARCHAR
            # Note: advertiser_profiles.socials is JSONB, users.social_links is JSON
            conn.execute(text("""
                UPDATE users u
                SET
                    profile_picture = COALESCE(u.profile_picture, ap.profile_picture),
                    location = CASE
                        WHEN u.location IS NULL AND ap.location IS NOT NULL AND array_length(ap.location, 1) > 0
                        THEN ap.location[1]
                        ELSE u.location
                    END,
                    social_links = CASE
                        WHEN u.social_links IS NULL AND ap.socials IS NOT NULL
                        THEN ap.socials::json
                        ELSE u.social_links
                    END
                FROM advertiser_profiles ap
                WHERE u.id = ap.user_id
                AND (u.profile_picture IS NULL OR u.location IS NULL OR u.social_links IS NULL)
            """))
            conn.commit()
            print("[OK] Migrated data to users table")
        except Exception as e:
            print(f"[ERROR] Error migrating data: {e}")
            conn.rollback()
            raise

        # Step 2: Remove deprecated columns from advertiser_profiles
        print("\n2. Removing deprecated columns from advertiser_profiles...")

        try:
            conn.execute(text("""
                ALTER TABLE advertiser_profiles
                DROP COLUMN IF EXISTS profile_picture
            """))
            conn.commit()
            print("[OK] Removed profile_picture column from advertiser_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing profile_picture: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE advertiser_profiles
                DROP COLUMN IF EXISTS location
            """))
            conn.commit()
            print("[OK] Removed location column from advertiser_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing location: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE advertiser_profiles
                DROP COLUMN IF EXISTS socials
            """))
            conn.commit()
            print("[OK] Removed socials column from advertiser_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing socials: {e}")
            conn.rollback()
            raise

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nSummary:")
        print("- Migrated profile_picture from advertiser_profiles to users")
        print("- Migrated location from advertiser_profiles to users (ARRAY[1] -> VARCHAR)")
        print("- Migrated socials from advertiser_profiles to users.social_links (JSONB -> JSON)")
        print("- Removed profile_picture column from advertiser_profiles")
        print("- Removed location column from advertiser_profiles")
        print("- Removed socials column from advertiser_profiles")

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Remove deprecated advertiser fields")
    print("=" * 60)

    response = input("\nThis will modify the database schema. Continue? (yes/no): ")
    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
