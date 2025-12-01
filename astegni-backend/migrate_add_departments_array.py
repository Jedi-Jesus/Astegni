"""
Add departments array column to admin_profile table
This keeps track of which departments an admin has access to
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
        print("Adding 'departments' array column to admin_profile")
        print("=" * 80)

        # Step 1: Add departments column
        print("\n[1/2] Adding departments column (TEXT array)...")
        cursor.execute("""
            ALTER TABLE admin_profile
            ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT ARRAY[]::TEXT[]
        """)
        print("[OK] Added departments column")

        # Step 2: Populate departments array based on existing department tables
        print("\n[2/2] Populating departments array from department tables...")

        cursor.execute("SELECT id, email FROM admin_profile")
        admins = cursor.fetchall()

        for admin_id, email in admins:
            departments = []

            # Check each department table
            dept_tables = [
                ('manage_campaigns_profile', 'manage-campaigns'),
                ('manage_courses_profile', 'manage-courses'),
                ('manage_schools_profile', 'manage-schools'),
                ('manage_tutors_profile', 'manage-tutors'),
                ('manage_customers_profile', 'manage-customers'),
                ('manage_contents_profile', 'manage-contents'),
                ('manage_system_settings_profile', 'manage-system-settings')
            ]

            for table_name, dept_name in dept_tables:
                cursor.execute(f"""
                    SELECT 1 FROM {table_name} WHERE admin_id = %s
                """, (admin_id,))

                if cursor.fetchone():
                    departments.append(dept_name)

            # Update admin_profile with departments array
            cursor.execute("""
                UPDATE admin_profile
                SET departments = %s
                WHERE id = %s
            """, (departments, admin_id))

            print(f"[OK] {email}: departments = {departments}")

        conn.commit()

        print("\n" + "=" * 80)
        print("[SUCCESS] Migration completed!")
        print("=" * 80)
        print("\nNow admin_profile has 'departments' array column:")
        print("- Quick access to which departments an admin belongs to")
        print("- Array is kept in sync with department profile tables")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
