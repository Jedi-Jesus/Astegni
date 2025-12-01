"""
Test admin invitation with new department/position structure
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")

    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "")

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_full = host_db.split("/")

    if "?" in db_full:
        db_name = db_full.split("?")[0]
    else:
        db_name = db_full

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

def test_admin_table_structure():
    """Test the admin_profile table structure"""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        print("Testing admin_profile table structure...")
        print("-" * 60)

        # Check if required columns exist
        required_columns = [
            'first_name',
            'father_name',
            'grandfather_name',
            'email',
            'phone_number',
            'department',
            'position',
            'password_hash'
        ]

        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'admin_profile'
            AND column_name = ANY(%s)
        """, (required_columns,))

        existing = [row[0] for row in cursor.fetchall()]

        print("\n[OK] Checking required columns:")
        for col in required_columns:
            status = "[OK]" if col in existing else "[MISSING]"
            print(f"  {status} {col}")

        if len(existing) == len(required_columns):
            print("\n[OK] All required columns exist!")
        else:
            missing = set(required_columns) - set(existing)
            print(f"\n[ERROR] Missing columns: {missing}")
            return False

        # Try a test insert (rollback after)
        print("\n[OK] Testing INSERT operation...")
        cursor.execute("""
            INSERT INTO admin_profile (
                first_name, father_name, grandfather_name, email, phone_number,
                department, position, password_hash, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (
            'Test',
            'Admin',
            'Account',
            'test_admin_invite@test.com',
            '+251911000000',
            'manage-tutors',
            'Test Manager',
            'test_hash_12345'
        ))

        test_id = cursor.fetchone()[0]
        print(f"  [OK] Test admin created with ID: {test_id}")

        # Clean up test data
        cursor.execute("DELETE FROM admin_profile WHERE id = %s", (test_id,))
        conn.commit()
        print("  [OK] Test data cleaned up")

        print("\n" + "=" * 60)
        print("[SUCCESS] All tests passed! The structure is ready.")
        print("=" * 60)
        return True

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"\n[ERROR] Test failed: {e}")
        return False
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    success = test_admin_table_structure()
    exit(0 if success else 1)
