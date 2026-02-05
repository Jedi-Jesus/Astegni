"""
Migration: Add hobbies column to users table
Centralizes hobbies from student_profiles to users table for all user roles
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Fix encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Add hobbies column to users table"""
    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("="*80)
                print("MIGRATION: Add hobbies column to users table")
                print("="*80)

                # Check if hobbies column already exists in users table
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'hobbies'
                """)

                if cur.fetchone():
                    print("✓ hobbies column already exists in users table")
                else:
                    # Add hobbies column as JSON array (consistent with other array fields in users table)
                    print("Adding hobbies column to users table...")
                    cur.execute("""
                        ALTER TABLE users
                        ADD COLUMN hobbies JSON DEFAULT '[]'
                    """)
                    print("✓ hobbies column added to users table (JSON type)")

                # Copy existing hobbies data from student_profiles to users
                print("\nCopying hobbies data from student_profiles to users...")
                cur.execute("""
                    UPDATE users u
                    SET hobbies = (
                        SELECT to_json(sp.hobbies)
                        FROM student_profiles sp
                        WHERE sp.user_id = u.id
                        AND sp.hobbies IS NOT NULL
                        AND sp.hobbies != '{}'
                    )
                    WHERE EXISTS (
                        SELECT 1 FROM student_profiles sp
                        WHERE sp.user_id = u.id
                        AND sp.hobbies IS NOT NULL
                        AND sp.hobbies != '{}'
                    )
                """)

                rows_updated = cur.rowcount
                print(f"✓ Copied hobbies data for {rows_updated} users")

                # Verify the migration
                print("\nVerifying migration...")
                cur.execute("""
                    SELECT
                        COUNT(*) as total_users_with_hobbies,
                        COUNT(DISTINCT u.id) as users_count
                    FROM users u
                    WHERE u.hobbies IS NOT NULL
                    AND u.hobbies::text != '[]'
                """)
                result = cur.fetchone()
                print(f"✓ {result[0]} users now have hobbies in users table")

                # Show sample data
                print("\nSample hobbies data in users table:")
                cur.execute("""
                    SELECT id, first_name, hobbies
                    FROM users
                    WHERE hobbies IS NOT NULL AND hobbies::text != '[]'
                    LIMIT 5
                """)
                rows = cur.fetchall()
                for row in rows:
                    print(f"  User {row[0]} ({row[1]}): {row[2]}")

                conn.commit()
                print("\n" + "="*80)
                print("✅ MIGRATION COMPLETED SUCCESSFULLY")
                print("="*80)
                print("\nNEXT STEPS:")
                print("1. Update User model in models.py to include hobbies field")
                print("2. Update user_profile_endpoints.py to handle hobbies")
                print("3. Update student_profile_endpoints.py to read hobbies from users")
                print("4. Update frontend to fetch hobbies from user data")
                print("5. OPTIONAL: Run cleanup migration to remove hobbies from student_profiles")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
