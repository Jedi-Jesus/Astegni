"""
Test view tutor endpoint to verify enrolled_students stats
"""

import requests
import psycopg
import os
import sys
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
API_BASE_URL = "http://localhost:8000"

def test_enrolled_students_stats():
    """Test that view tutor endpoint correctly fetches active and total students"""

    print("\n" + "=" * 80)
    print("TEST: View Tutor Endpoint - Enrolled Students Stats")
    print("=" * 80)

    # 1. First, get a tutor ID from the database
    conn = psycopg.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # Get a tutor with enrolled students
            cur.execute("""
                SELECT
                    tp.id as tutor_profile_id,
                    tp.user_id,
                    tp.username,
                    COUNT(DISTINCT es.id) as total_enrollments,
                    COUNT(DISTINCT CASE WHEN es.status = 'active' THEN es.student_id END) as active_students,
                    COUNT(DISTINCT es.student_id) as total_students_taught
                FROM tutor_profiles tp
                LEFT JOIN enrolled_students es ON tp.id = es.tutor_id
                GROUP BY tp.id, tp.user_id, tp.username
                HAVING COUNT(DISTINCT es.id) > 0
                ORDER BY COUNT(DISTINCT es.id) DESC
                LIMIT 1
            """)

            result = cur.fetchone()

            if not result:
                print("\n[ERROR] No tutors with enrolled students found in database")
                print("Please run some test data migrations first.")
                return

            tutor_profile_id, user_id, username, total_enrollments, active_students, total_students = result

            print(f"\n✅ Found tutor with enrolled students:")
            print(f"   Tutor Profile ID: {tutor_profile_id}")
            print(f"   User ID: {user_id}")
            print(f"   Username: {username}")
            print(f"   Total Enrollments: {total_enrollments}")
            print(f"   Active Students: {active_students}")
            print(f"   Total Students Taught: {total_students}")

            # Show breakdown by status
            cur.execute("""
                SELECT
                    status,
                    COUNT(DISTINCT student_id) as student_count,
                    COUNT(*) as enrollment_count
                FROM enrolled_students
                WHERE tutor_id = %s
                GROUP BY status
                ORDER BY status
            """, (tutor_profile_id,))

            print(f"\n📊 Enrollment Breakdown by Status:")
            for status, student_count, enrollment_count in cur.fetchall():
                print(f"   {status or 'NULL':15} → {student_count} students, {enrollment_count} enrollments")

    finally:
        conn.close()

    # 2. Test the API endpoint
    print(f"\n" + "-" * 80)
    print("Testing API Endpoint")
    print("-" * 80)

    try:
        response = requests.get(f"{API_BASE_URL}/api/view-tutor/{tutor_profile_id}")

        if response.status_code == 200:
            data = response.json()

            print(f"\n✅ API Response Status: {response.status_code}")

            # Check stats
            stats = data.get("stats", {})
            profile = data.get("profile", {})

            print(f"\n📈 Stats from API:")
            print(f"   Active Students: {stats.get('active_students')}")
            print(f"   Students Taught: {stats.get('students_taught')}")
            print(f"   Total Sessions: {stats.get('total_sessions_count')}")
            print(f"   Completion Rate: {stats.get('completion_rate')}%")
            print(f"   Response Time: {stats.get('response_time')}")
            print(f"   Session Format: {stats.get('session_format')}")

            # Verify the stats match database
            print(f"\n🔍 Verification:")
            if stats.get('active_students') == active_students:
                print(f"   ✅ Active Students: Match! ({active_students})")
            else:
                print(f"   ❌ Active Students: Mismatch! API={stats.get('active_students')}, DB={active_students}")

            if stats.get('students_taught') == total_students:
                print(f"   ✅ Students Taught: Match! ({total_students})")
            else:
                print(f"   ❌ Students Taught: Mismatch! API={stats.get('students_taught')}, DB={total_students}")

        else:
            print(f"\n❌ API Error: {response.status_code}")
            print(f"   Response: {response.text}")

    except Exception as e:
        print(f"\n❌ Error calling API: {e}")

    print("\n" + "=" * 80)
    print("Test Complete")
    print("=" * 80)

if __name__ == "__main__":
    test_enrolled_students_stats()
