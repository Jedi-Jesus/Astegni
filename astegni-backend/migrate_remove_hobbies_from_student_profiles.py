"""
Migration: Remove deprecated hobbies column from student_profiles table

This migration removes the hobbies column from student_profiles table since
hobbies are now stored in the users table (centralized profile fields).

IMPORTANT: This is a destructive migration. Make sure data has been migrated
to users.hobbies before running this.
"""

import sys
import io

# Set UTF-8 encoding for console output on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Remove hobbies column from student_profiles table"""
    try:
        print("\n" + "="*80)
        print("🔄 MIGRATION: Remove hobbies from student_profiles table")
        print("="*80 + "\n")

        with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
            with conn.cursor() as cur:
                # Check if column exists first
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'student_profiles'
                    AND column_name = 'hobbies'
                """)

                column_exists = cur.fetchone()

                if not column_exists:
                    print("✅ Column 'hobbies' does not exist in student_profiles table.")
                    print("   Migration already applied or not needed.")
                    return

                # Check if any data exists in student_profiles.hobbies
                cur.execute("""
                    SELECT COUNT(*) as count
                    FROM student_profiles
                    WHERE hobbies IS NOT NULL AND hobbies != '{}'
                """)

                result = cur.fetchone()
                count = result['count'] if result else 0

                if count > 0:
                    print(f"⚠️  WARNING: Found {count} student profiles with hobbies data")
                    print("   This data will be lost if not migrated to users.hobbies first!")
                    response = input("   Continue anyway? (yes/no): ")
                    if response.lower() != 'yes':
                        print("❌ Migration cancelled.")
                        return

                # Remove the column
                print("\n🔧 Dropping hobbies column from student_profiles...")
                cur.execute("""
                    ALTER TABLE student_profiles
                    DROP COLUMN IF EXISTS hobbies
                """)

                conn.commit()

                print("✅ Successfully removed hobbies column from student_profiles table")
                print("\n📊 Verification:")

                # Verify column is gone
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'student_profiles'
                    ORDER BY ordinal_position
                """)

                columns = cur.fetchall()
                print(f"   student_profiles table now has {len(columns)} columns:")
                for col in columns:
                    print(f"   - {col['column_name']}")

                # Verify users table still has hobbies
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                    AND column_name = 'hobbies'
                """)

                users_hobbies = cur.fetchone()
                if users_hobbies:
                    print("\n✅ users.hobbies column still exists (correct)")
                else:
                    print("\n⚠️  WARNING: users.hobbies column not found!")

                print("\n" + "="*80)
                print("✅ MIGRATION COMPLETED SUCCESSFULLY")
                print("="*80 + "\n")

    except Exception as e:
        print(f"\n❌ Migration failed: {str(e)}")
        raise

if __name__ == "__main__":
    migrate()
