"""
Migration: Move username from users table to role-specific profile tables

Username should be role-specific because a user can have different usernames
for different roles (e.g., different username as student vs tutor).
"""

import sys
sys.path.insert(0, 'app.py modules')
from config import DATABASE_URL
import psycopg

def migrate():
    db_url = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')

    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            print("Starting migration: Adding username to profile tables...")

            # Add username column to student_profiles
            print("\n1. Adding username to student_profiles...")
            try:
                cur.execute('''
                    ALTER TABLE student_profiles
                    ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE
                ''')
                print("   [OK] username column added to student_profiles")
            except Exception as e:
                print(f"   [ERROR] {e}")

            # Add username column to tutor_profiles
            print("\n2. Adding username to tutor_profiles...")
            try:
                cur.execute('''
                    ALTER TABLE tutor_profiles
                    ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE
                ''')
                print("   [OK] username column added to tutor_profiles")
            except Exception as e:
                print(f"   [ERROR] {e}")

            # Migrate existing usernames from users to student_profiles
            print("\n3. Migrating usernames from users to student_profiles...")
            try:
                cur.execute('''
                    UPDATE student_profiles sp
                    SET username = u.username
                    FROM users u
                    WHERE sp.user_id = u.id AND u.username IS NOT NULL
                ''')
                rows_updated = cur.rowcount
                print(f"   [OK] Migrated {rows_updated} student usernames")
            except Exception as e:
                print(f"   [ERROR] {e}")

            # Migrate existing usernames from users to tutor_profiles
            print("\n4. Migrating usernames from users to tutor_profiles...")
            try:
                cur.execute('''
                    UPDATE tutor_profiles tp
                    SET username = u.username
                    FROM users u
                    WHERE tp.user_id = u.id AND u.username IS NOT NULL
                ''')
                rows_updated = cur.rowcount
                print(f"   [OK] Migrated {rows_updated} tutor usernames")
            except Exception as e:
                print(f"   [ERROR] {e}")

            conn.commit()
            print("\n[SUCCESS] Migration completed!")

            # Verify
            print("\nVerification:")
            cur.execute('''
                SELECT sp.id, sp.username, u.username as user_username
                FROM student_profiles sp
                JOIN users u ON sp.user_id = u.id
                WHERE sp.username IS NOT NULL
                LIMIT 3
            ''')
            students = cur.fetchall()
            print(f"Sample student profiles with usernames:")
            for s in students:
                print(f"  Profile ID {s[0]}: username={s[1]} (user.username={s[2]})")

if __name__ == "__main__":
    migrate()
