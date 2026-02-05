"""
Check all sessions in the database
"""

import psycopg

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def check_sessions():
    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        # Count total sessions
        cur.execute("SELECT COUNT(*) FROM sessions")
        total_sessions = cur.fetchone()[0]
        print(f"Total sessions in database: {total_sessions}")

        if total_sessions > 0:
            # Show sample sessions
            cur.execute("""
                SELECT s.id, s.session_date, s.session_time, s.enrolled_courses_id
                FROM sessions s
                ORDER BY s.id
                LIMIT 10
            """)
            sessions = cur.fetchall()

            print("\nSample sessions:")
            for session_id, date, time, enrolled_id in sessions:
                print(f"  - Session ID {session_id}: {date} at {time}, Enrollment: {enrolled_id}")

        # Count enrolled courses
        cur.execute("SELECT COUNT(*) FROM enrolled_courses")
        total_enrollments = cur.fetchone()[0]
        print(f"\nTotal enrolled courses: {total_enrollments}")

        # Count student profiles
        cur.execute("SELECT COUNT(*) FROM student_profiles")
        total_students = cur.fetchone()[0]
        print(f"Total student profiles: {total_students}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_sessions()
