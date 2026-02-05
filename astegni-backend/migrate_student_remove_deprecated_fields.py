"""
Migration: Remove deprecated fields from student_profiles table
- Remove profile_picture from student_profiles (now in users table)
- Remove location from student_profiles (now in users table)
- Remove languages from student_profiles (now in users table)

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

        # Step 1: Migrate existing data from student_profiles to users
        print("\n1. Migrating profile_picture, location, and languages from student_profiles to users...")
        try:
            # Update users table with data from student_profiles where users data is NULL
            # Note: student_profiles.languages is ARRAY, users.languages is JSON, need to convert
            conn.execute(text("""
                UPDATE users u
                SET
                    profile_picture = COALESCE(u.profile_picture, sp.profile_picture),
                    location = COALESCE(u.location, sp.location),
                    languages = CASE
                        WHEN u.languages IS NULL AND sp.languages IS NOT NULL
                        THEN to_jsonb(sp.languages)::json
                        ELSE u.languages
                    END
                FROM student_profiles sp
                WHERE u.id = sp.user_id
                AND (u.profile_picture IS NULL OR u.location IS NULL OR u.languages IS NULL)
            """))
            conn.commit()
            print("[OK] Migrated data to users table")
        except Exception as e:
            print(f"[ERROR] Error migrating data: {e}")
            conn.rollback()
            raise

        # Step 2: Remove deprecated columns from student_profiles
        print("\n2. Removing deprecated columns from student_profiles...")

        try:
            conn.execute(text("""
                ALTER TABLE student_profiles
                DROP COLUMN IF EXISTS profile_picture
            """))
            conn.commit()
            print("[OK] Removed profile_picture column from student_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing profile_picture: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE student_profiles
                DROP COLUMN IF EXISTS location
            """))
            conn.commit()
            print("[OK] Removed location column from student_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing location: {e}")
            conn.rollback()
            raise

        try:
            conn.execute(text("""
                ALTER TABLE student_profiles
                DROP COLUMN IF EXISTS languages
            """))
            conn.commit()
            print("[OK] Removed languages column from student_profiles")
        except Exception as e:
            print(f"[ERROR] Error removing languages: {e}")
            conn.rollback()
            raise

        print("\n[SUCCESS] Migration completed successfully!")
        print("\nSummary:")
        print("- Migrated profile_picture from student_profiles to users")
        print("- Migrated location from student_profiles to users")
        print("- Migrated languages from student_profiles to users")
        print("- Removed profile_picture column from student_profiles")
        print("- Removed location column from student_profiles")
        print("- Removed languages column from student_profiles")

if __name__ == "__main__":
    print("=" * 60)
    print("Migration: Remove deprecated student fields")
    print("=" * 60)

    response = input("\nThis will modify the database schema. Continue? (yes/no): ")
    if response.lower() == 'yes':
        run_migration()
    else:
        print("Migration cancelled.")
