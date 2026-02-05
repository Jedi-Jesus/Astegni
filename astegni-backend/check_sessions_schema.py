"""
Check sessions table schema and data
"""

import psycopg

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def check_sessions():
    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        # Get table schema
        print("SESSIONS TABLE SCHEMA:")
        print("=" * 60)
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'sessions'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        for col_name, data_type, nullable in columns:
            print(f"  {col_name}: {data_type} (nullable: {nullable})")

        # Count total sessions
        cur.execute("SELECT COUNT(*) FROM sessions")
        total_sessions = cur.fetchone()[0]
        print(f"\nTotal sessions in database: {total_sessions}")

        if total_sessions > 0:
            # Show all sessions with basic info
            cur.execute("""
                SELECT id, enrolled_courses_id, session_date, session_mode
                FROM sessions
                ORDER BY id
            """)
            sessions = cur.fetchall()

            print("\nAll sessions:")
            for session_id, enrolled_id, date, mode in sessions:
                print(f"  - Session {session_id}: Enrollment {enrolled_id}, Date: {date}, Mode: {mode}")

            # Check enrolled_courses
            print("\nENROLLED COURSES:")
            cur.execute("""
                SELECT ec.id, ec.tutor_id, array_length(ec.students_id, 1) as student_count, ec.students_id
                FROM enrolled_courses ec
                WHERE ec.id IN (SELECT DISTINCT enrolled_courses_id FROM sessions)
                ORDER BY ec.id
            """)
            enrollments = cur.fetchall()
            for enroll_id, tutor_id, student_count, student_ids in enrollments:
                print(f"  - Enrollment {enroll_id}: Tutor {tutor_id}, {student_count} students, IDs: {student_ids}")

            # Check students
            print("\nSTUDENT PROFILES (for these enrollments):")
            cur.execute("""
                SELECT sp.id, sp.user_id, sp.parent_id, u.email, u.first_name
                FROM student_profiles sp
                LEFT JOIN users u ON sp.user_id = u.id
                WHERE sp.id IN (
                    SELECT unnest(students_id) FROM enrolled_courses
                    WHERE id IN (SELECT DISTINCT enrolled_courses_id FROM sessions)
                )
                ORDER BY sp.id
            """)
            students = cur.fetchall()
            for sp_id, user_id, parent_id, email, name in students:
                parent_status = f"Parent: {parent_id}" if parent_id else "No parent"
                print(f"  - Student {sp_id}: User {user_id} ({email}), {name}, {parent_status}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_sessions()
