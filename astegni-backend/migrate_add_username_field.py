"""
Migration: Add username field to admin_profile and all manage-* tables
This replaces the Ethiopian naming convention (first_name, father_name, grandfather_name)
with a simple username field for display purposes.
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("MIGRATION: Add username field to all admin tables")
        print("=" * 80)

        # ============================================
        # STEP 1: Add username to admin_profile
        # ============================================
        print("\n[1/2] Adding username field to admin_profile...")
        cursor.execute("""
            ALTER TABLE admin_profile
            ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE
        """)
        print("[OK] Added username column to admin_profile")

        # Generate usernames from existing data if needed
        cursor.execute("""
            UPDATE admin_profile
            SET username = LOWER(CONCAT(
                REPLACE(COALESCE(first_name, 'admin'), ' ', '_'),
                '_',
                SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1)
            ))
            WHERE username IS NULL
        """)
        print("[OK] Generated default usernames from existing data")

        # ============================================
        # STEP 2: Add username to all manage-* tables
        # ============================================
        print("\n[2/2] Adding username field to all department tables...")

        department_tables = [
            'manage_campaigns_profile',
            'manage_courses_profile',
            'manage_schools_profile',
            'manage_tutors_profile',
            'manage_customers_profile',
            'manage_contents_profile',
            'manage_system_settings_profile'
        ]

        for table in department_tables:
            # Add username column
            cursor.execute(f"""
                ALTER TABLE {table}
                ADD COLUMN IF NOT EXISTS username VARCHAR(100)
            """)

            # Populate username from admin_profile
            cursor.execute(f"""
                UPDATE {table} dt
                SET username = ap.username
                FROM admin_profile ap
                WHERE dt.admin_id = ap.id AND dt.username IS NULL
            """)

            print(f"[OK] Added and populated username in {table}")

        conn.commit()

        print("\n" + "=" * 80)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 80)
        print("\nSUMMARY:")
        print("- Added username field to admin_profile (UNIQUE)")
        print("- Generated default usernames from first_name + email")
        print("- Added username field to all 7 department tables")
        print("- Populated department usernames from admin_profile")
        print("\nNEXT STEPS:")
        print("1. Update backend endpoints to use username")
        print("2. Update frontend to display username instead of full name")
        print("3. Update edit forms to edit username")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        print("Rolling back changes...")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
