"""
Verify test admin account for OTP email change testing
Note: is_otp_verified was removed from admin_profile - verification is now
determined by whether password_hash is set
"""

import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def verify_test_admin():
    """Check if test1@example.com is verified (has password set)"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Check result - verification is now based on password_hash being set
        cursor.execute("""
            SELECT id, email, first_name, password_hash IS NOT NULL as is_verified, departments
            FROM admin_profile
            WHERE email = 'test1@example.com'
        """)

        result = cursor.fetchone()
        if result:
            admin_id, email, first_name, is_verified, departments = result
            print(f"✓ Admin status:")
            print(f"  ID: {admin_id}")
            print(f"  Email: {email}")
            print(f"  Name: {first_name}")
            print(f"  Verified (has password): {is_verified}")
            print(f"  Departments: {departments}")
        else:
            print("✗ Admin not found")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    verify_test_admin()
