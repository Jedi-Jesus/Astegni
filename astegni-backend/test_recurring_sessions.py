"""
Test recurring session creation
"""
import psycopg
import os
import json
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

def test_recurring_sessions():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("=" * 80)
        print("TEST: Recurring session creation")
        print("=" * 80)
        print()

        # Get Jediael's tutor ID
        cur.execute("SELECT id FROM tutor_profiles WHERE user_id = 1")
        tutor_id = cur.fetchone()[0]

        # Get student
        cur.execute("SELECT id FROM student_profiles LIMIT 1")
        student_id = cur.fetchone()[0]

        # Get package
        cur.execute("SELECT id FROM tutor_packages WHERE tutor_id = %s LIMIT 1", (tutor_id,))
        package_id = cur.fetchone()[0]

        print(f"Tutor ID: {tutor_id}")
        print(f"Student ID: {student_id}")
        print(f"Package ID: {package_id}")
        print()

        # Create recurring request (Monday, Wednesday, Friday)
        days = ['Monday', 'Wednesday', 'Friday']

        print(f"Creating recurring request for: {days}")
        print("Time: 10:00 - 12:00")
        print("Duration: 8 weeks")
        print()

        cur.execute("""
            INSERT INTO requested_sessions (
                tutor_id, requester_id, requester_type, package_id,
                message, status, requested_to_id,
                schedule_type, days, start_time, end_time
            ) VALUES (
                %s, %s, 'student', %s,
                'Recurring sessions test', 'pending', %s,
                'recurring', %s, '10:00', '12:00'
            ) RETURNING id
        """, (tutor_id, student_id, package_id, student_id, json.dumps(days)))

        request_id = cur.fetchone()[0]
        print(f"Created request ID: {request_id}")
        print()

        # Accept request
        print("Accepting request...")
        cur.execute("""
            UPDATE requested_sessions
            SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (request_id,))

        # Create enrolled_courses
        cur.execute("""
            INSERT INTO enrolled_courses (
                tutor_id, package_id, students_id, status
            ) VALUES (%s, %s, %s, 'active')
            RETURNING id
        """, (tutor_id, package_id, [student_id]))
        enrolled_course_id = cur.fetchone()[0]

        print(f"Created enrolled_course ID: {enrolled_course_id}")
        print()

        # Fetch schedule and create sessions (same logic as endpoint)
        cur.execute("""
            SELECT schedule_type, days, start_time, end_time, message
            FROM requested_sessions
            WHERE id = %s
        """, (request_id,))

        schedule_type, days_json, start_time, end_time, message = cur.fetchone()

        # Calculate duration
        start_dt = datetime.combine(datetime.today(), start_time)
        end_dt = datetime.combine(datetime.today(), end_time)
        duration = int((end_dt - start_dt).total_seconds() / 60)

        topics = [message] if message else []

        print(f"Creating recurring sessions...")
        print(f"Schedule Type: {schedule_type}")
        print(f"Days: {days_json}")
        print(f"Duration: {duration} minutes")
        print()

        # Create sessions
        from datetime import timedelta

        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        selected_day_indices = []

        for day in days_json:
            if day in day_names:
                selected_day_indices.append(day_names.index(day))

        print(f"Selected day indices: {selected_day_indices}")

        current_date = datetime.today().date()
        end_date = current_date + timedelta(weeks=8)
        sessions_created = 0

        while current_date <= end_date:
            if current_date.weekday() in selected_day_indices:
                cur.execute("""
                    INSERT INTO sessions (
                        enrolled_courses_id, session_date, start_time, end_time,
                        duration, topics, session_mode, status, priority_level,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, 'online', 'scheduled', 'medium',
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """, (enrolled_course_id, current_date, start_time, end_time,
                      duration, json.dumps(topics)))
                sessions_created += 1

            current_date += timedelta(days=1)

        print(f"Sessions created: {sessions_created}")
        print()

        # Verify
        cur.execute("""
            SELECT s.id, s.session_date, s.start_time, s.end_time
            FROM sessions s
            WHERE s.enrolled_courses_id = %s
            ORDER BY s.session_date
            LIMIT 10
        """, (enrolled_course_id,))

        sessions = cur.fetchall()
        print(f"First 10 sessions:")
        for session in sessions:
            day_name = datetime.strptime(str(session[1]), '%Y-%m-%d').strftime('%A')
            print(f"  {session[1]} ({day_name}) {session[2]}-{session[3]}")

        conn.commit()

        print("\n" + "=" * 80)
        print("[SUCCESS] Recurring sessions test completed!")
        print("=" * 80)
        print(f"Total sessions created: {sessions_created}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    test_recurring_sessions()
