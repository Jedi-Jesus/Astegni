"""
Fix package names in tutor_session_requests and tutor_students to match actual tutor packages
"""
import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def fix_package_names():
    """Update package names to match tutor's actual packages"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get tutor 85's actual packages
        cur.execute("""
            SELECT id, name FROM tutor_packages WHERE tutor_id = 85 ORDER BY id
        """)
        packages = cur.fetchall()

        if not packages:
            print("⚠️ No packages found for tutor 85")
            return

        print("Available packages for Tutor 85:")
        for pkg in packages:
            print(f"  - ID: {pkg[0]}, Name: {pkg[1]}")

        # Use the first two packages for our students
        package_1_id, package_1_name = packages[0] if len(packages) > 0 else (None, "Package 1")
        package_2_id, package_2_name = packages[1] if len(packages) > 1 else (None, "Package 2")

        print(f"\nUpdating records to use:")
        print(f"  - Student 1: {package_1_name} (Package ID: {package_1_id})")
        print(f"  - Student 2: {package_2_name} (Package ID: {package_2_id})")

        # Update tutor_session_requests
        cur.execute("""
            UPDATE tutor_session_requests
            SET package_id = %s, package_name = %s
            WHERE id = 5 AND tutor_id = 85
        """, (package_1_id, package_1_name))
        print(f"\n✅ Updated tutor_session_requests ID 5 to '{package_1_name}'")

        cur.execute("""
            UPDATE tutor_session_requests
            SET package_id = %s, package_name = %s
            WHERE id = 6 AND tutor_id = 85
        """, (package_2_id, package_2_name))
        print(f"✅ Updated tutor_session_requests ID 6 to '{package_2_name}'")

        # Update tutor_students
        cur.execute("""
            UPDATE tutor_students
            SET package_name = %s
            WHERE id = 1 AND tutor_id = 85
        """, (package_1_name,))
        print(f"✅ Updated tutor_students ID 1 to '{package_1_name}'")

        cur.execute("""
            UPDATE tutor_students
            SET package_name = %s
            WHERE id = 2 AND tutor_id = 85
        """, (package_2_name,))
        print(f"✅ Updated tutor_students ID 2 to '{package_2_name}'")

        # Also update the pending requests to use valid packages
        if len(packages) >= 3:
            package_3_id, package_3_name = packages[2]

            cur.execute("""
                UPDATE tutor_session_requests
                SET package_id = %s, package_name = %s
                WHERE id IN (1, 2) AND tutor_id = 85
            """, (package_1_id, package_1_name))
            print(f"✅ Updated pending requests 1-2 to '{package_1_name}'")

            cur.execute("""
                UPDATE tutor_session_requests
                SET package_id = %s, package_name = %s
                WHERE id IN (3, 4) AND tutor_id = 85
            """, (package_2_id, package_2_name))
            print(f"✅ Updated pending requests 3-4 to '{package_2_name}'")

        conn.commit()

        print("\n✅ All package names updated successfully!")

        # Verify the updates
        cur.execute("""
            SELECT id, student_name, package_name, status
            FROM tutor_session_requests
            WHERE tutor_id = 85
            ORDER BY id
        """)
        print("\nVerification - tutor_session_requests:")
        print("=" * 80)
        for row in cur.fetchall():
            print(f"  ID: {row[0]} | Student: {row[1]:25} | Package: {row[2]:20} | Status: {row[3]}")

        cur.execute("""
            SELECT id, student_name, package_name
            FROM tutor_students
            WHERE tutor_id = 85
            ORDER BY id
        """)
        print("\nVerification - tutor_students:")
        print("=" * 80)
        for row in cur.fetchall():
            print(f"  ID: {row[0]} | Student: {row[1]:25} | Package: {row[2]}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error fixing package names: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_package_names()
