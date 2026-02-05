"""
Debug script to investigate parent sessions issue for kushstudios16@gmail.com
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    return psycopg.connect(database_url)

def debug_parent_sessions():
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            # 1. Get user info
            print("=" * 80)
            print("1. USER INFORMATION")
            print("=" * 80)
            cur.execute("""
                SELECT id, first_name, father_name, email, roles, active_role
                FROM users
                WHERE email = 'kushstudios16@gmail.com'
            """)
            user = cur.fetchone()

            if not user:
                print("❌ User not found!")
                return

            user_id, first_name, father_name, email, roles, active_role = user
            print(f"User ID: {user_id}")
            print(f"Name: {first_name} {father_name}")
            print(f"Email: {email}")
            print(f"Roles: {roles}")
            print(f"Active Role: {active_role}")

            # 2. Check parent profile
            print("\n" + "=" * 80)
            print("2. PARENT PROFILE")
            print("=" * 80)
            cur.execute("""
                SELECT id, user_id, username, children_ids
                FROM parent_profiles
                WHERE user_id = %s
            """, (user_id,))
            parent_profile = cur.fetchone()

            if parent_profile:
                parent_id, parent_user_id, username, children_ids = parent_profile
                print(f"Parent Profile ID: {parent_id}")
                print(f"Username: {username}")
                print(f"Children IDs: {children_ids}")
                print(f"Number of children: {len(children_ids) if children_ids else 0}")

                # Get children info
                if children_ids and len(children_ids) > 0:
                    print("\n" + "-" * 80)
                    print("CHILDREN DETAILS:")
                    print("-" * 80)
                    cur.execute("""
                        SELECT sp.id, sp.username, u.first_name, u.father_name, u.email
                        FROM student_profiles sp
                        JOIN users u ON sp.user_id = u.id
                        WHERE sp.id = ANY(%s)
                    """, (children_ids,))

                    children = cur.fetchall()
                    for idx, child in enumerate(children, 1):
                        child_id, child_username, child_first, child_father, child_email = child
                        print(f"\nChild {idx}:")
                        print(f"  Student Profile ID: {child_id}")
                        print(f"  Username: {child_username}")
                        print(f"  Name: {child_first} {child_father}")
                        print(f"  Email: {child_email}")
            else:
                print("❌ No parent profile found!")
                return

            # 3. Check what sessions are being returned
            print("\n" + "=" * 80)
            print("3. SESSIONS RETURNED BY PARENT ENDPOINT")
            print("=" * 80)

            if not children_ids or len(children_ids) == 0:
                print("⚠️  No children, so endpoint should return empty array []")
                return

            # This is the EXACT query from parent_endpoints.py
            cur.execute("""
                SELECT
                    s.id,
                    s.enrolled_courses_id,
                    s.session_date,
                    s.start_time,
                    s.end_time,
                    s.status,
                    ec.tutor_id,
                    ec.students_id,
                    u_tutor.first_name as tutor_first_name,
                    u_tutor.father_name as tutor_father_name,
                    c.course_name as course_name
                FROM sessions s
                LEFT JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
                LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                LEFT JOIN users u_tutor ON tp.user_id = u_tutor.id
                LEFT JOIN courses c ON c.id = ANY(ec.course_id)
                WHERE ec.students_id && CAST(%s AS integer[])
                ORDER BY s.session_date DESC, s.start_time DESC
                LIMIT 20
            """, (children_ids,))

            sessions = cur.fetchall()
            print(f"\nTotal sessions found: {len(sessions)}")

            if len(sessions) == 0:
                print("✅ No sessions found (expected if children have no sessions)")
            else:
                print("\n" + "-" * 80)
                print("SESSION DETAILS:")
                print("-" * 80)
                for idx, session in enumerate(sessions, 1):
                    (session_id, enrolled_courses_id, session_date, start_time,
                     end_time, status, tutor_id, students_id, tutor_first,
                     tutor_father, course_name) = session

                    print(f"\nSession {idx}:")
                    print(f"  ID: {session_id}")
                    print(f"  Enrolled Courses ID: {enrolled_courses_id}")
                    print(f"  Date: {session_date} {start_time} - {end_time}")
                    print(f"  Status: {status}")
                    print(f"  Course: {course_name}")
                    print(f"  Tutor: {tutor_first} {tutor_father}")
                    print(f"  Tutor Profile ID: {tutor_id}")
                    print(f"  Students in this session: {students_id}")

                    # Check which of user's children are in this session
                    matching_children = [sid for sid in students_id if sid in children_ids]
                    print(f"  ⚠️  User's children in this session: {matching_children}")

            # 4. Check student profile (to see if user is also a student)
            print("\n" + "=" * 80)
            print("4. STUDENT PROFILE CHECK")
            print("=" * 80)
            cur.execute("""
                SELECT id, username
                FROM student_profiles
                WHERE user_id = %s
            """, (user_id,))
            student_profile = cur.fetchone()

            if student_profile:
                student_id, student_username = student_profile
                print(f"✅ User HAS a student profile!")
                print(f"  Student Profile ID: {student_id}")
                print(f"  Username: {student_username}")

                # Check if their student profile is in their own children_ids list
                if children_ids and student_id in children_ids:
                    print(f"\n🔴 BUG FOUND!")
                    print(f"  User's own student profile ({student_id}) is in their children_ids list!")
                    print(f"  This means they're seeing their OWN sessions as if they were their child!")
                else:
                    print(f"\n✅ User's student profile is NOT in children_ids (correct)")
            else:
                print("❌ User does NOT have a student profile")

            # 5. Check tutor profile
            print("\n" + "=" * 80)
            print("5. TUTOR PROFILE CHECK")
            print("=" * 80)
            cur.execute("""
                SELECT id, username
                FROM tutor_profiles
                WHERE user_id = %s
            """, (user_id,))
            tutor_profile = cur.fetchone()

            if tutor_profile:
                tutor_id, tutor_username = tutor_profile
                print(f"✅ User HAS a tutor profile!")
                print(f"  Tutor Profile ID: {tutor_id}")
                print(f"  Username: {tutor_username}")
            else:
                print("❌ User does NOT have a tutor profile")

            # 6. Summary
            print("\n" + "=" * 80)
            print("6. SUMMARY & DIAGNOSIS")
            print("=" * 80)

            if parent_profile and children_ids and len(children_ids) > 0:
                if student_profile and student_id in children_ids:
                    print("🔴 ROOT CAUSE IDENTIFIED:")
                    print(f"   The user's own student_profile_id ({student_id}) is in their parent.children_ids array")
                    print(f"   This makes the backend think they are their own child!")
                    print(f"   They're seeing their OWN student sessions in the parent view.")
                    print(f"\n   SOLUTION: Remove {student_id} from parent_profiles.children_ids for user {user_id}")
                    print(f"\n   SQL FIX:")
                    print(f"   UPDATE parent_profiles")
                    print(f"   SET children_ids = array_remove(children_ids, {student_id})")
                    print(f"   WHERE user_id = {user_id};")
                else:
                    print("✅ Children IDs look correct")
                    print(f"   The {len(sessions)} sessions are legitimate sessions of the user's children")
            elif not parent_profile:
                print("⚠️  User doesn't have a parent profile")
            elif not children_ids or len(children_ids) == 0:
                print("✅ User has no children (children_ids is empty)")
                print("   Backend should return empty array []")

    finally:
        conn.close()

if __name__ == "__main__":
    debug_parent_sessions()
