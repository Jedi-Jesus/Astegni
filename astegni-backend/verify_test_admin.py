"""
Verify test admin account for OTP email change testing
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
    """Mark test1@example.com as verified"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Update test admin to be verified
        cursor.execute("""
            UPDATE admin_profile
            SET is_otp_verified = TRUE
            WHERE email = 'test1@example.com'
        """)

        conn.commit()

        # Check result
        cursor.execute("""
            SELECT id, email, first_name, is_otp_verified, departments
            FROM admin_profile
            WHERE email = 'test1@example.com'
        """)

        result = cursor.fetchone()
        if result:
            admin_id, email, first_name, is_verified, departments = result
            print(f"✓ Admin verified:")
            print(f"  ID: {admin_id}")
            print(f"  Email: {email}")
            print(f"  Name: {first_name}")
            print(f"  Verified: {is_verified}")
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
