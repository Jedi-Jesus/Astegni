"""
Remove all test session data created by create_test_sessions_data.py
This will delete:
- All sessions created for the test students
- All enrolled_courses for the test students
- All test student profiles
- All test user accounts
"""

import psycopg
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def remove_test_data():
    """Remove all test session data"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Starting test data removal...")
        print("=" * 60)

        # Step 1: Find all test users (created by the test script)
        print("\n[1] Finding test users...")
        cur.execute("""
            SELECT id, email, first_name
            FROM users
            WHERE email LIKE 'test_student_%@example.com' OR email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
            ORDER BY id
        """)
        test_users = cur.fetchall()

        if not test_users:
            print("   [INFO]  No test users found")
            conn.close()
            return

        print(f"   Found {len(test_users)} test users:")
        for user_id, email, name in test_users:
            print(f"   - User ID {user_id}: {email} ({name})")

        # Step 2: Find and delete sessions
        print("\n[2]  Finding and deleting sessions...")
        cur.execute("""
            SELECT s.id, s.session_date, s.session_time, s.duration
            FROM sessions s
            INNER JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
            INNER JOIN student_profiles sp ON sp.id = ANY(ec.students_id)
            INNER JOIN users u ON sp.user_id = u.id
            WHERE u.email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
        """)
        sessions = cur.fetchall()

        if sessions:
            print(f"   Found {len(sessions)} sessions to delete:")
            for session_id, date, time, duration in sessions[:5]:  # Show first 5
                print(f"   - Session ID {session_id}: {date} at {time} ({duration} min)")
            if len(sessions) > 5:
                print(f"   ... and {len(sessions) - 5} more")

            cur.execute("""
                DELETE FROM sessions
                WHERE enrolled_courses_id IN (
                    SELECT ec.id
                    FROM enrolled_courses ec
                    INNER JOIN student_profiles sp ON sp.id = ANY(ec.students_id)
                    INNER JOIN users u ON sp.user_id = u.id
                    WHERE u.email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
                )
            """)
            deleted_sessions = cur.rowcount
            print(f"   [OK] Deleted {deleted_sessions} sessions")
        else:
            print("   [INFO]  No sessions found")

        # Step 3: Find and delete enrolled_courses
        print("\n[3]  Finding and deleting enrolled courses...")
        cur.execute("""
            SELECT ec.id, ec.tutor_id, array_length(ec.students_id, 1) as student_count
            FROM enrolled_courses ec
            INNER JOIN student_profiles sp ON sp.id = ANY(ec.students_id)
            INNER JOIN users u ON sp.user_id = u.id
            WHERE u.email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
        """)
        enrollments = cur.fetchall()

        if enrollments:
            print(f"   Found {len(enrollments)} enrollments to delete:")
            for enroll_id, tutor_id, student_count in enrollments:
                print(f"   - Enrollment ID {enroll_id}: Tutor {tutor_id}, {student_count} students")

            cur.execute("""
                DELETE FROM enrolled_courses
                WHERE id IN (
                    SELECT ec.id
                    FROM enrolled_courses ec
                    INNER JOIN student_profiles sp ON sp.id = ANY(ec.students_id)
                    INNER JOIN users u ON sp.user_id = u.id
                    WHERE u.email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
                )
            """)
            deleted_enrollments = cur.rowcount
            print(f"   [OK] Deleted {deleted_enrollments} enrollments")
        else:
            print("   [INFO]  No enrollments found")

        # Step 4: Find and delete student profiles
        print("\n[4]  Finding and deleting student profiles...")
        cur.execute("""
            SELECT sp.id, sp.user_id, sp.parent_id
            FROM student_profiles sp
            INNER JOIN users u ON sp.user_id = u.id
            WHERE u.email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
        """)
        student_profiles = cur.fetchall()

        if student_profiles:
            print(f"   Found {len(student_profiles)} student profiles to delete:")
            for profile_id, user_id, parent_id in student_profiles:
                parent_status = "with parent" if parent_id else "no parent"
                print(f"   - Student Profile ID {profile_id}: User {user_id} ({parent_status})")

            cur.execute("""
                DELETE FROM student_profiles
                WHERE user_id IN (
                    SELECT id FROM users
                    WHERE email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
                )
            """)
            deleted_profiles = cur.rowcount
            print(f"   [OK] Deleted {deleted_profiles} student profiles")
        else:
            print("   [INFO]  No student profiles found")

        # Step 5: Delete test users
        print("\n[5]  Deleting test user accounts...")
        cur.execute("""
            DELETE FROM users
            WHERE email LIKE 'test_student_%@example.com' OR u.email LIKE 'test_student_%@test.com'
        """)
        deleted_users = cur.rowcount
        print(f"   [OK] Deleted {deleted_users} users")

        # Commit all deletions
        conn.commit()

        print("\n" + "=" * 60)
        print("[OK] Test data removal completed successfully!")
        print("\nSummary:")
        if sessions:
            print(f"   - Sessions deleted: {deleted_sessions}")
        if enrollments:
            print(f"   - Enrollments deleted: {deleted_enrollments}")
        if student_profiles:
            print(f"   - Student profiles deleted: {deleted_profiles}")
        print(f"   - User accounts deleted: {deleted_users}")
        print("=" * 60)

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        raise

if __name__ == "__main__":
    print("  TEST DATA REMOVAL SCRIPT")
    print("=" * 60)
    print("This will remove all test session data including:")
    print("- Sessions for test students")
    print("- Enrolled courses for test students")
    print("- Student profiles")
    print("- Test user accounts")
    print("=" * 60)

    response = input("\n[WARNING]  Are you sure you want to proceed? (yes/no): ")

    if response.lower() == 'yes':
        remove_test_data()
    else:
        print("[ERROR] Operation cancelled")
