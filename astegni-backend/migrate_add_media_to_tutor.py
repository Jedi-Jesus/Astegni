#!/usr/bin/env python3
"""
Migration: Add profile_picture and cover_image to tutor_profiles table
"""

import psycopg
from config import DATABASE_URL

def run_migration():
    """Add profile_picture and cover_image to tutor_profiles table"""

    # Convert SQLAlchemy URL to psycopg format
    db_url = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')

    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cursor:
                print("🔄 Adding media fields to tutor_profiles table...")

                # Add profile_picture
                try:
                    cursor.execute("""
                        ALTER TABLE tutor_profiles
                        ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
                    """)
                    print("✅ Added profile_picture to tutor_profiles table")
                except Exception as e:
                    print(f"⚠️  profile_picture column might already exist: {e}")

                # Add cover_image
                try:
                    cursor.execute("""
                        ALTER TABLE tutor_profiles
                        ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500);
                    """)
                    print("✅ Added cover_image to tutor_profiles table")
                except Exception as e:
                    print(f"⚠️  cover_image column might already exist: {e}")

                # Commit changes
                conn.commit()

                print("\n✅ Migration completed successfully!")
                print("\n📊 Verifying changes...")

                # Verify tutor_profiles columns
                cursor.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'tutor_profiles'
                    AND column_name IN ('profile_picture', 'cover_image')
                    ORDER BY column_name;
                """)

                tutor_columns = cursor.fetchall()
                print(f"\n📋 tutor_profiles table media columns:")
                for col in tutor_columns:
                    print(f"   - {col[0]} ({col[1]})")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("TUTOR PROFILE MEDIA FIELDS MIGRATION")
    print("=" * 60)
    run_migration()
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE - Server should work now")
    print("=" * 60)
