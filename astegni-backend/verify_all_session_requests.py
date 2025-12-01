"""
Verify all tutor_session_requests reference valid student/parent profiles
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

def verify_session_requests():
    """Verify all session requests have valid requester profiles"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get all session requests with profile validation
        cur.execute("""
            SELECT
                sr.id,
                sr.requester_id,
                sr.requester_type,
                sr.student_name,
                sr.student_grade,
                sr.status,
                CASE
                    WHEN sr.requester_type = 'student' THEN
                        (SELECT COUNT(*) FROM student_profiles WHERE id = sr.requester_id)
                    WHEN sr.requester_type = 'parent' THEN
                        (SELECT COUNT(*) FROM parent_profiles WHERE id = sr.requester_id)
                END as profile_exists
            FROM tutor_session_requests sr
            ORDER BY sr.id
        """)

        rows = cur.fetchall()

        print("Verification of all tutor_session_requests:")
        print("=" * 120)
        print(f"{'ID':<4} {'Req ID':<7} {'Type':<10} {'Name':<30} {'Grade':<25} {'Status':<10} {'Valid'}")
        print("=" * 120)

        valid_count = 0
        invalid_count = 0
        invalid_requests = []

        for row in rows:
            req_id, requester_id, requester_type, student_name, student_grade, status, profile_exists = row

            if profile_exists == 1:
                valid_status = "✅ EXISTS"
                valid_count += 1
            else:
                valid_status = "❌ MISSING"
                invalid_count += 1
                invalid_requests.append({
                    'id': req_id,
                    'requester_id': requester_id,
                    'requester_type': requester_type,
                    'student_name': student_name
                })

            print(f"{req_id:<4} {requester_id:<7} {requester_type:<10} {student_name:<30} {student_grade:<25} {status:<10} {valid_status}")

        print("=" * 120)
        print(f"Summary: Valid: {valid_count}, Invalid: {invalid_count}, Total: {len(rows)}")

        if invalid_requests:
            print("\n⚠️  INVALID REQUESTS FOUND:")
            print("=" * 80)
            for req in invalid_requests:
                print(f"  Request ID: {req['id']}")
                print(f"    Requester ID: {req['requester_id']} (Type: {req['requester_type']})")
                print(f"    Student Name: {req['student_name']}")
                print(f"    Profile does NOT exist in {req['requester_type']}_profiles table!")
                print()

            print("🔧 Recommendation: Delete or update these invalid requests")
        else:
            print("\n✅ All session requests reference valid profiles!")

    except Exception as e:
        print(f"❌ Error verifying session requests: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    verify_session_requests()
