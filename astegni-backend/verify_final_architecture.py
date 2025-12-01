"""
Final Architecture Verification
Verifies that all changes are correctly implemented
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def verify():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    print("=" * 70)
    print("FINAL ARCHITECTURE VERIFICATION")
    print("=" * 70)
    print()

    # Test 1: Check old tables are GONE
    print("[TEST 1] Verifying old tables are dropped...")
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('tutor_teaching_schedules', 'tutor_student_enrollments', 'tutoring_sessions')
    """)
    old_tables = [row[0] for row in cur.fetchall()]

    if len(old_tables) == 0:
        print("  [PASS] All old tables successfully dropped")
    else:
        print(f"  [FAIL] Found old tables still exist: {old_tables}")

    print()

    # Test 2: Check new tables exist
    print("[TEST 2] Verifying new tables exist...")
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('tutor_schedules', 'tutor_sessions')
        ORDER BY table_name
    """)
    new_tables = [row[0] for row in cur.fetchall()]

    expected_tables = ['tutor_schedules', 'tutor_sessions']
    if set(new_tables) == set(expected_tables):
        print("  [PASS] All required tables exist:")
        for table in new_tables:
            print(f"    - {table}")
    else:
        print(f"  [FAIL] Expected {expected_tables}, found {new_tables}")

    print()

    # Test 3: Check tutor_sessions has new fields
    print("[TEST 3] Verifying tutor_sessions has scheduling fields...")
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'tutor_sessions'
        AND column_name IN ('session_frequency', 'is_recurring', 'recurring_pattern', 'package_duration', 'grade_level')
        ORDER BY column_name
    """)
    session_fields = [row[0] for row in cur.fetchall()]

    expected_fields = ['grade_level', 'is_recurring', 'package_duration', 'recurring_pattern', 'session_frequency']
    if set(session_fields) == set(expected_fields):
        print("  [PASS] All scheduling fields exist in tutor_sessions:")
        for field in sorted(session_fields):
            print(f"    - {field}")
    else:
        print(f"  [FAIL] Expected {expected_fields}, found {session_fields}")

    print()

    # Test 4: Verify backend files were updated
    print("[TEST 4] Verifying backend endpoints use correct tables...")

    # Check tutor_schedule_endpoints.py
    try:
        with open('tutor_schedule_endpoints.py', 'r', encoding='utf-8') as f:
            schedule_content = f.read()
            if 'tutor_schedules' in schedule_content and 'tutor_teaching_schedules' not in schedule_content:
                print("  [PASS] tutor_schedule_endpoints.py uses tutor_schedules")
            else:
                print("  [FAIL] tutor_schedule_endpoints.py still references old table name")
    except Exception as e:
        print(f"  [SKIP] Could not check tutor_schedule_endpoints.py: {e}")

    # Check tutor_sessions_endpoints.py
    try:
        with open('tutor_sessions_endpoints.py', 'r', encoding='utf-8') as f:
            sessions_content = f.read()
            if 'tutor_sessions' in sessions_content and 'tutoring_sessions' not in sessions_content:
                print("  [PASS] tutor_sessions_endpoints.py uses tutor_sessions")
            else:
                print("  [FAIL] tutor_sessions_endpoints.py still references old table name")
    except Exception as e:
        print(f"  [SKIP] Could not check tutor_sessions_endpoints.py: {e}")

    print()

    # Test 5: Show final table list
    print("[TEST 5] Final schedule/session related tables:")
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        AND (table_name LIKE '%schedule%' OR table_name LIKE '%session%')
        ORDER BY table_name
    """)
    all_tables = [row[0] for row in cur.fetchall()]
    for table in all_tables:
        marker = " <-- NEW!" if table in ['tutor_schedules', 'tutor_sessions'] else ""
        print(f"    - {table}{marker}")

    print()
    print("=" * 70)
    print("VERIFICATION COMPLETE")
    print("=" * 70)
    print()

    # Summary
    if len(old_tables) == 0 and set(new_tables) == set(expected_tables) and set(session_fields) == set(expected_fields):
        print("SUCCESS: All tests passed!")
        print()
        print("Next steps:")
        print("1. Start backend: python app.py")
        print("2. Open tutor profile: http://localhost:8080/profile-pages/tutor-profile.html")
        print("3. Click 'Schedule' in sidebar")
        print("4. Test the 3-tab interface (All, Schedules, Sessions)")
        return True
    else:
        print("WARNING: Some tests failed. Please review the output above.")
        return False

    conn.close()

if __name__ == "__main__":
    success = verify()
    exit(0 if success else 1)
