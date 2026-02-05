"""
Delete all test session data completely
"""

import psycopg

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def delete_all_test_data():
    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Starting deletion of ALL test session data...")
        print("=" * 60)

        # Step 1: Delete all sessions for enrollments 4, 5, 6, 7
        print("\n[1] Deleting sessions...")
        cur.execute("""
            DELETE FROM sessions
            WHERE enrolled_courses_id IN (4, 5, 6, 7)
        """)
        deleted_sessions = cur.rowcount
        print(f"   [OK] Deleted {deleted_sessions} sessions")

        # Step 2: Delete enrolled courses 4, 5, 6, 7
        print("\n[2] Deleting enrolled courses...")
        cur.execute("""
            DELETE FROM enrolled_courses
            WHERE id IN (4, 5, 6, 7)
        """)
        deleted_enrollments = cur.rowcount
        print(f"   [OK] Deleted {deleted_enrollments} enrollments")

        # Step 3: Delete student profiles 15, 16, 17, 18
        print("\n[3] Deleting student profiles...")
        cur.execute("""
            DELETE FROM student_profiles
            WHERE id IN (15, 16, 17, 18)
        """)
        deleted_students = cur.rowcount
        print(f"   [OK] Deleted {deleted_students} student profiles")

        # Step 4: Delete user accounts 17, 18, 19, 21
        print("\n[4] Deleting user accounts...")
        cur.execute("""
            DELETE FROM users
            WHERE id IN (17, 18, 19, 21)
        """)
        deleted_users = cur.rowcount
        print(f"   [OK] Deleted {deleted_users} users")

        # Step 5: Also delete any parent profiles if they exist
        print("\n[5] Checking for parent profiles...")
        cur.execute("""
            DELETE FROM parent_profiles
            WHERE id IN (8, 9)
        """)
        deleted_parents = cur.rowcount
        if deleted_parents > 0:
            print(f"   [OK] Deleted {deleted_parents} parent profiles")
        else:
            print("   [INFO] No parent profiles to delete")

        # Step 6: Delete parent user accounts if they exist
        cur.execute("""
            SELECT COUNT(*) FROM users WHERE id IN (
                SELECT user_id FROM parent_profiles WHERE id IN (8, 9)
            )
        """)
        # Since we already deleted parents, just try to find orphaned users
        cur.execute("""
            DELETE FROM users
            WHERE email LIKE 'test_parent_%@example.com'
        """)
        deleted_parent_users = cur.rowcount
        if deleted_parent_users > 0:
            print(f"   [OK] Deleted {deleted_parent_users} parent user accounts")

        # Commit
        conn.commit()

        print("\n" + "=" * 60)
        print("[OK] ALL test data deleted successfully!")
        print("\nSummary:")
        print(f"   - Sessions: {deleted_sessions}")
        print(f"   - Enrollments: {deleted_enrollments}")
        print(f"   - Student profiles: {deleted_students}")
        print(f"   - Student users: {deleted_users}")
        if deleted_parents > 0:
            print(f"   - Parent profiles: {deleted_parents}")
        if deleted_parent_users > 0:
            print(f"   - Parent users: {deleted_parent_users}")
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
    print("TEST DATA DELETION SCRIPT")
    print("=" * 60)
    print("This will permanently delete:")
    print("- 12 sessions (IDs 1-12)")
    print("- 4 enrollments (IDs 4-7)")
    print("- 4 student profiles (IDs 15-18)")
    print("- 4 user accounts (IDs 17-21)")
    print("- Parent profiles if they exist")
    print("=" * 60)

    response = input("\n[WARNING] Are you sure? (yes/no): ")

    if response.lower() == 'yes':
        delete_all_test_data()
    else:
        print("[ERROR] Operation cancelled")
