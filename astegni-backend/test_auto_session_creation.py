"""
Test script for automatic session creation when accepting requests
"""
import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

def test_auto_session_creation():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("=" * 80)
        print("TEST: Auto-create sessions when accepting request")
        print("=" * 80)
        print()

        # Step 1: Create a test session request with schedule data
        print("Step 1: Creating test session request with schedule...")

        # Get Jediael's tutor ID
        cur.execute("SELECT id FROM tutor_profiles WHERE user_id = 1")
        tutor_id = cur.fetchone()[0]

        # Get a student profile ID (use existing or create test)
        cur.execute("SELECT id FROM student_profiles LIMIT 1")
        student_result = cur.fetchone()
        if not student_result:
            print("  No student profiles found. Creating test student...")
            cur.execute("""
                INSERT INTO student_profiles (user_id, grade_level)
                VALUES (1, 'Grade 10')
                RETURNING id
            """)
            student_id = cur.fetchone()[0]
        else:
            student_id = student_result[0]

        print(f"  Tutor ID: {tutor_id}")
        print(f"  Student ID: {student_id}")

        # Get a package ID
        cur.execute("SELECT id FROM tutor_packages WHERE tutor_id = %s LIMIT 1", (tutor_id,))
        package_result = cur.fetchone()
        if not package_result:
            print("  No packages found for this tutor!")
            return
        package_id = package_result[0]
        print(f"  Package ID: {package_id}")

        # Create specific dates for next 3 days
        specific_dates = []
        for i in range(1, 4):
            date = (datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d')
            specific_dates.append(date)

        print(f"  Specific Dates: {specific_dates}")

        # Insert test request with specific_dates schedule
        import json
        cur.execute("""
            INSERT INTO requested_sessions (
                tutor_id, requester_id, requester_type, package_id,
                message, status, requested_to_id,
                schedule_type, specific_dates, start_time, end_time
            ) VALUES (
                %s, %s, 'student', %s,
                'Test request for auto-session creation', 'pending', %s,
                'specific_dates', %s, '14:00', '16:00'
            ) RETURNING id
        """, (tutor_id, student_id, package_id, student_id, json.dumps(specific_dates)))

        request_id = cur.fetchone()[0]
        print(f"  Created request ID: {request_id}")
        print()

        # Step 2: Count sessions before acceptance
        print("Step 2: Counting existing sessions...")
        cur.execute("""
            SELECT COUNT(*) FROM sessions s
            JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
            WHERE ec.tutor_id = %s
        """, (tutor_id,))
        sessions_before = cur.fetchone()[0]
        print(f"  Sessions before: {sessions_before}")
        print()

        # Step 3: Accept the request (this should auto-create sessions)
        print("Step 3: Accepting request (simulating PATCH endpoint)...")

        # Update request status to accepted
        cur.execute("""
            UPDATE requested_sessions
            SET status = 'accepted', responded_at = CURRENT_TIMESTAMP
            WHERE id = %s
            RETURNING requester_id, requester_type, package_id, requested_to_id
        """, (request_id,))

        result = cur.fetchone()
        requester_id, requester_type, pkg_id, requested_to_id = result

        # Check if enrolled_courses exists
        cur.execute("""
            SELECT id FROM enrolled_courses
            WHERE tutor_id = %s AND package_id = %s
        """, (tutor_id, pkg_id))

        enrolled_course = cur.fetchone()
        if not enrolled_course:
            # Create enrolled_courses entry
            cur.execute("""
                INSERT INTO enrolled_courses (
                    tutor_id, package_id, students_id, status
                ) VALUES (%s, %s, %s, 'active')
                RETURNING id
            """, (tutor_id, pkg_id, [requested_to_id]))
            enrolled_course_id = cur.fetchone()[0]
            print(f"  Created enrolled_course ID: {enrolled_course_id}")
        else:
            enrolled_course_id = enrolled_course[0]
            print(f"  Using existing enrolled_course ID: {enrolled_course_id}")

        # Fetch schedule data and create sessions
        cur.execute("""
            SELECT schedule_type, specific_dates, start_time, end_time, message
            FROM requested_sessions
            WHERE id = %s
        """, (request_id,))

        schedule_data = cur.fetchone()
        schedule_type, spec_dates, start_time, end_time, message = schedule_data

        print(f"  Schedule Type: {schedule_type}")
        print(f"  Specific Dates: {spec_dates}")
        print(f"  Time: {start_time} - {end_time}")

        # Calculate duration
        if start_time and end_time:
            start_dt = datetime.combine(datetime.today(), start_time)
            end_dt = datetime.combine(datetime.today(), end_time)
            duration = int((end_dt - start_dt).total_seconds() / 60)
        else:
            duration = None

        print(f"  Duration: {duration} minutes")

        # Create sessions
        sessions_created = 0
        if schedule_type == 'specific_dates' and spec_dates:
            import json
            topics = [message] if message else []

            for date_str in spec_dates:
                session_date = datetime.strptime(date_str, '%Y-%m-%d').date()

                cur.execute("""
                    INSERT INTO sessions (
                        enrolled_courses_id, session_date, start_time, end_time,
                        duration, topics, session_mode, status, priority_level,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, 'online', 'scheduled', 'medium',
                        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    )
                """, (enrolled_course_id, session_date, start_time, end_time,
                      duration, json.dumps(topics)))
                sessions_created += 1

        print(f"  Sessions created: {sessions_created}")
        print()

        # Step 4: Verify sessions were created
        print("Step 4: Verifying sessions...")
        cur.execute("""
            SELECT s.id, s.session_date, s.start_time, s.end_time, s.duration, s.status
            FROM sessions s
            JOIN enrolled_courses ec ON s.enrolled_courses_id = ec.id
            WHERE ec.tutor_id = %s
            ORDER BY s.session_date
        """, (tutor_id,))

        sessions = cur.fetchall()
        print(f"  Total sessions now: {len(sessions)}")

        if sessions:
            print("\n  Session Details:")
            for session in sessions:
                print(f"    ID: {session[0]}, Date: {session[1]}, Time: {session[2]}-{session[3]}, "
                      f"Duration: {session[4]}min, Status: {session[5]}")

        conn.commit()

        print("\n" + "=" * 80)
        print("[SUCCESS] Test completed!")
        print("=" * 80)
        print(f"\nSummary:")
        print(f"  Request ID: {request_id}")
        print(f"  Enrolled Course ID: {enrolled_course_id}")
        print(f"  Sessions Created: {sessions_created}")
        print(f"  Total Sessions: {len(sessions)}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    test_auto_session_creation()
