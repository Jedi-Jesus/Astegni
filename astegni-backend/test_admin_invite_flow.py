"""
Test script to verify admin invitation flow with employee_id and joined_in
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def get_connection():
    """Get database connection"""
    return psycopg.connect(DATABASE_URL)

def test_admin_invite_data():
    """
    Test that when an admin is invited:
    1. Admin profile is created with correct data
    2. Department profile is created with employee_id and joined_in
    """
    conn = get_connection()
    cursor = conn.cursor()

    try:
        # Get the most recently created admin
        cursor.execute("""
            SELECT id, first_name, father_name, email, departments, created_at
            FROM admin_profile
            ORDER BY created_at DESC
            LIMIT 1
        """)

        admin = cursor.fetchone()
        if not admin:
            print("[ERROR] No admin found in database")
            return

        admin_id, first_name, father_name, email, departments, created_at = admin

        print("=" * 60)
        print("ADMIN PROFILE DATA:")
        print("=" * 60)
        print(f"[OK] Admin ID: {admin_id}")
        print(f"[OK] Name: {first_name} {father_name}")
        print(f"[OK] Email: {email}")
        print(f"[OK] Departments: {departments}")
        print(f"[OK] Created At: {created_at}")
        print()

        # Check each department profile
        if departments:
            for dept in departments:
                dept_table = dept.replace('-', '_') + '_profile'
                print("=" * 60)
                print(f"DEPARTMENT PROFILE: {dept}")
                print("=" * 60)

                try:
                    cursor.execute(f"""
                        SELECT admin_id, employee_id, position, joined_in, created_at
                        FROM {dept_table}
                        WHERE admin_id = %s
                    """, (admin_id,))

                    dept_data = cursor.fetchone()
                    if dept_data:
                        dept_admin_id, employee_id, position, joined_in, dept_created = dept_data
                        print(f"[OK] Admin ID: {dept_admin_id}")
                        print(f"[OK] Employee ID: {employee_id or 'NOT SET'}")
                        print(f"[OK] Position: {position}")
                        print(f"[OK] Joined In: {joined_in or 'NOT SET'}")
                        print(f"[OK] Created At: {dept_created}")

                        # Verify data
                        if not employee_id:
                            print("[WARNING] employee_id is empty")
                        if not joined_in:
                            print("[WARNING] joined_in is empty")
                    else:
                        print(f"[ERROR] No profile found in {dept_table}")
                except Exception as e:
                    print(f"[ERROR] Error checking {dept_table}: {e}")
                print()
        else:
            print("[ERROR] No departments assigned to admin")

        print("=" * 60)
        print("TEST COMPLETE")
        print("=" * 60)

    except Exception as e:
        print(f"[ERROR] Error: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    test_admin_invite_data()
