#!/usr/bin/env python3
"""
Migration: Add missing fields to student_profiles table
Adds: gender, profile_picture, cover_image, bio, quote, location, preferred_languages,
      rating, rating_count, gpa, attendance_rate, total_connections
"""

import psycopg
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app.py modules'))
from config import DATABASE_URL

def run_migration():
    """Add missing fields to student_profiles table"""

    # Convert SQLAlchemy URL to psycopg format
    db_url = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')

    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cursor:
                print("🔄 Starting student profile enhancements migration...")
                print("\n📝 Adding fields to student_profiles table...")

                # Add gender
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
                    """)
                    print("✅ Added gender to student_profiles table")
                except Exception as e:
                    print(f"⚠️  gender column might already exist: {e}")

                # Add profile_picture
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
                    """)
                    print("✅ Added profile_picture to student_profiles table")
                except Exception as e:
                    print(f"⚠️  profile_picture column might already exist: {e}")

                # Add cover_image
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS cover_image VARCHAR(500);
                    """)
                    print("✅ Added cover_image to student_profiles table")
                except Exception as e:
                    print(f"⚠️  cover_image column might already exist: {e}")

                # Add bio
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS bio TEXT;
                    """)
                    print("✅ Added bio to student_profiles table")
                except Exception as e:
                    print(f"⚠️  bio column might already exist: {e}")

                # Add quote
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS quote TEXT;
                    """)
                    print("✅ Added quote to student_profiles table")
                except Exception as e:
                    print(f"⚠️  quote column might already exist: {e}")

                # Add location
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS location VARCHAR(200);
                    """)
                    print("✅ Added location to student_profiles table")
                except Exception as e:
                    print(f"⚠️  location column might already exist: {e}")

                # Add preferred_languages as JSON
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS preferred_languages JSON DEFAULT '[]';
                    """)
                    print("✅ Added preferred_languages to student_profiles table")
                except Exception as e:
                    print(f"⚠️  preferred_languages column might already exist: {e}")

                # Add rating
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0.0;
                    """)
                    print("✅ Added rating to student_profiles table")
                except Exception as e:
                    print(f"⚠️  rating column might already exist: {e}")

                # Add rating_count
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
                    """)
                    print("✅ Added rating_count to student_profiles table")
                except Exception as e:
                    print(f"⚠️  rating_count column might already exist: {e}")

                # Add gpa for consistency (keeps current_gpa too)
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS gpa FLOAT;
                    """)
                    # Copy data from current_gpa if it exists
                    cursor.execute("""
                        UPDATE student_profiles
                        SET gpa = current_gpa
                        WHERE gpa IS NULL AND current_gpa IS NOT NULL;
                    """)
                    print("✅ Added gpa to student_profiles table")
                except Exception as e:
                    print(f"⚠️  gpa column might already exist: {e}")

                # Add attendance_rate
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS attendance_rate FLOAT DEFAULT 0.0;
                    """)
                    print("✅ Added attendance_rate to student_profiles table")
                except Exception as e:
                    print(f"⚠️  attendance_rate column might already exist: {e}")

                # Add total_connections
                try:
                    cursor.execute("""
                        ALTER TABLE student_profiles
                        ADD COLUMN IF NOT EXISTS total_connections INTEGER DEFAULT 0;
                    """)
                    print("✅ Added total_connections to student_profiles table")
                except Exception as e:
                    print(f"⚠️  total_connections column might already exist: {e}")

                # Commit all changes
                conn.commit()

                print("\n✅ Migration completed successfully!")
                print("\n📊 Verifying changes...")

                # Verify student_profiles columns
                cursor.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'student_profiles'
                    ORDER BY column_name;
                """)

                student_columns = cursor.fetchall()
                print(f"\n📋 student_profiles table now has {len(student_columns)} columns:")
                for col in student_columns:
                    print(f"   - {col[0]} ({col[1]})")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    print("=" * 60)
    print("STUDENT PROFILE ENHANCEMENTS MIGRATION")
    print("=" * 60)
    run_migration()
    print("\n" + "=" * 60)
    print("MIGRATION COMPLETE - Please restart the backend server")
    print("=" * 60)
