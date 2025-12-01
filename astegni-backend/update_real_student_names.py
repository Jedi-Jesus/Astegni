"""
Update student names in tutor_students and tutor_session_requests to use real names from users table
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

def update_real_student_names():
    """Update student names to real names from users table"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Updating student names to real names from users table...\n")

        # Update tutor_students table
        print("=" * 80)
        print("UPDATING tutor_students TABLE")
        print("=" * 80)

        cur.execute("""
            SELECT ts.id, ts.student_profile_id, ts.student_name,
                   CONCAT(u.first_name, ' ', u.father_name) as real_name
            FROM tutor_students ts
            JOIN student_profiles sp ON ts.student_profile_id = sp.id
            JOIN users u ON sp.user_id = u.id
            WHERE ts.tutor_id = 85
        """)

        students = cur.fetchall()

        for student in students:
            record_id, profile_id, current_name, real_name = student

            cur.execute("""
                UPDATE tutor_students
                SET student_name = %s
                WHERE id = %s
            """, (real_name, record_id))

            print(f"✅ ID {record_id}: '{current_name}' → '{real_name}'")

        # Update tutor_session_requests table (for students only)
        print("\n" + "=" * 80)
        print("UPDATING tutor_session_requests TABLE")
        print("=" * 80)

        cur.execute("""
            SELECT sr.id, sr.requester_id, sr.student_name,
                   CONCAT(u.first_name, ' ', u.father_name) as real_name
            FROM tutor_session_requests sr
            JOIN student_profiles sp ON sr.requester_id = sp.id
            JOIN users u ON sp.user_id = u.id
            WHERE sr.tutor_id = 85 AND sr.requester_type = 'student'
        """)

        requests = cur.fetchall()

        for request in requests:
            request_id, requester_id, current_name, real_name = request

            cur.execute("""
                UPDATE tutor_session_requests
                SET student_name = %s
                WHERE id = %s
            """, (real_name, request_id))

            print(f"✅ Request ID {request_id}: '{current_name}' → '{real_name}'")

        # Handle parent requests separately (keep child's name format or update as needed)
        print("\n" + "=" * 80)
        print("UPDATING PARENT REQUESTS")
        print("=" * 80)

        cur.execute("""
            SELECT sr.id, sr.requester_id, sr.student_name,
                   CONCAT(u.first_name, ' ', u.father_name) as parent_name
            FROM tutor_session_requests sr
            JOIN parent_profiles pp ON sr.requester_id = pp.id
            JOIN users u ON pp.user_id = u.id
            WHERE sr.tutor_id = 85 AND sr.requester_type = 'parent'
        """)

        parent_requests = cur.fetchall()

        for request in parent_requests:
            request_id, requester_id, current_name, parent_name = request
            # For parent requests, we can update to show "Child of [Parent Name]"
            child_name = f"Child of {parent_name}"

            cur.execute("""
                UPDATE tutor_session_requests
                SET student_name = %s
                WHERE id = %s
            """, (child_name, request_id))

            print(f"✅ Request ID {request_id}: '{current_name}' → '{child_name}'")

        conn.commit()

        print("\n" + "=" * 80)
        print("✅ ALL NAMES UPDATED SUCCESSFULLY!")
        print("=" * 80)

        # Verification
        print("\n📋 VERIFICATION - tutor_students:")
        print("-" * 80)
        cur.execute("""
            SELECT id, student_name, student_grade, package_name
            FROM tutor_students
            WHERE tutor_id = 85
            ORDER BY id
        """)
        for row in cur.fetchall():
            print(f"  ID: {row[0]} | Name: {row[1]:25} | Grade: {row[2]:20} | Package: {row[3]}")

        print("\n📋 VERIFICATION - tutor_session_requests:")
        print("-" * 80)
        cur.execute("""
            SELECT id, student_name, requester_type, status, package_name
            FROM tutor_session_requests
            WHERE tutor_id = 85
            ORDER BY id
        """)
        for row in cur.fetchall():
            print(f"  ID: {row[0]} | Name: {row[1]:25} | Type: {row[2]:8} | Status: {row[3]:8} | Package: {row[4]}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error updating student names: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    update_real_student_names()
