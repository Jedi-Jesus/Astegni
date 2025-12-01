"""
Seed script for tutor_schedules and tutor_sessions tables
Creates sample data for tutor_id 85 (jediael.s.abebe@gmail.com)
"""

import psycopg
import os
import sys
import json
from dotenv import load_dotenv
from datetime import datetime, date, timedelta
import random

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

load_dotenv()
db_url = os.getenv('DATABASE_URL')

# Sample data
subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History']
priority_levels = ['Low Priority', 'Normal', 'Important', 'Very Important', 'Highly Critical']
grade_levels = ['Grade 9-10', 'Grade 11-12', 'University Level']
schedule_types = ['recurring', 'specific']  # Fixed: must be 'recurring' or 'specific'
months_options = [
    ['January', 'February', 'March'],
    ['April', 'May', 'June'],
    ['September', 'October', 'November'],
    ['January', 'December']
]
days_options = [
    ['Monday', 'Wednesday', 'Friday'],
    ['Tuesday', 'Thursday'],
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    ['Saturday', 'Sunday']
]
schedule_statuses = ['active', 'draft']  # Fixed: must be 'active' or 'draft' for schedules
modes = ['online', 'in-person', 'hybrid']
session_statuses = ['scheduled', 'completed', 'cancelled', 'in-progress', 'missed']
payment_statuses = ['pending', 'paid', 'refunded']

def create_schedules(cur, tutor_id=85, count=15):
    """Create sample schedules"""
    schedules = []

    for i in range(count):
        subject = random.choice(subjects)
        schedule_type = random.choice(schedule_types)

        # Generate dates - always provide months and days (NOT NULL columns)
        months = random.choice(months_options)
        days = random.choice(days_options)
        specific_dates = None

        if schedule_type == 'specific':
            base_date = datetime.now() + timedelta(days=random.randint(1, 60))
            specific_dates = [
                (base_date + timedelta(days=j*7)).strftime('%Y-%m-%d')
                for j in range(4)
            ]

        # Random times
        start_hour = random.randint(8, 16)
        start_time = f"{start_hour:02d}:00:00"
        end_time = f"{start_hour + random.randint(1, 3):02d}:00:00"

        priority = random.choice(priority_levels)

        schedule_data = {
            'tutor_id': tutor_id,
            'title': f"{subject} - {priority}",
            'description': f"Comprehensive {subject.lower()} course covering key concepts and problem-solving techniques.",
            'subject': subject,
            'grade_level': priority,  # Now stores priority instead of educational grade
            'year': random.choice([2024, 2025]),
            'schedule_type': schedule_type,
            'months': months,
            'days': days,
            'specific_dates': specific_dates,
            'start_time': start_time,
            'end_time': end_time,
            'notes': f"Session {i+1} for {subject}. Make sure to bring necessary materials.",
            'status': random.choice(schedule_statuses),
            'alarm_enabled': random.choice([True, False]),
            'alarm_before_minutes': random.choice([15, 30, 60]),
            'notification_browser': True,
            'notification_sound': random.choice([True, False])
        }

        cur.execute("""
            INSERT INTO tutor_schedules (
                tutor_id, title, description, subject, grade_level,
                year, schedule_type, months, days, specific_dates, start_time, end_time,
                notes, status, alarm_enabled, alarm_before_minutes,
                notification_browser, notification_sound, created_at, updated_at
            ) VALUES (
                %(tutor_id)s, %(title)s, %(description)s, %(subject)s,
                %(grade_level)s, %(year)s, %(schedule_type)s, %(months)s, %(days)s,
                %(specific_dates)s, %(start_time)s, %(end_time)s, %(notes)s, %(status)s,
                %(alarm_enabled)s, %(alarm_before_minutes)s, %(notification_browser)s,
                %(notification_sound)s, NOW(), NOW()
            ) RETURNING id
        """, schedule_data)

        schedule_id = cur.fetchone()[0]
        schedules.append(schedule_id)
        print(f"✓ Created schedule {schedule_id}: {schedule_data['title']}")

    return schedules

def create_sessions(cur, tutor_id=85, count=25):
    """Create sample sessions"""
    sessions = []

    # Get existing student IDs from database
    cur.execute('SELECT id FROM student_profiles ORDER BY id')
    student_ids = [row[0] for row in cur.fetchall()]
    if not student_ids:
        print("⚠ Warning: No student profiles found. Sessions will not be created.")
        return []

    print(f"  Using student IDs: {student_ids}")

    for i in range(count):
        # Generate date within last 30 days or next 30 days
        days_offset = random.randint(-30, 30)
        session_date = date.today() + timedelta(days=days_offset)

        # Random times
        start_hour = random.randint(8, 18)
        start_time = f"{start_hour:02d}:00:00"
        duration = random.choice([60, 90, 120])  # minutes
        end_hour = start_hour + (duration // 60)
        end_time = f"{end_hour:02d}:{(duration % 60):02d}:00"

        subject = random.choice(subjects)
        mode = random.choice(modes)
        status = random.choice(session_statuses)

        # Set attendance based on status
        if status == 'completed':
            student_attended = True
            tutor_attended = True
            student_rating = round(random.uniform(3.5, 5.0), 1)
        elif status == 'missed':
            student_attended = False
            tutor_attended = random.choice([True, False])
            student_rating = None
        else:
            student_attended = None
            tutor_attended = None
            student_rating = None

        session_data = {
            'tutor_id': tutor_id,
            'student_id': random.choice(student_ids),
            'enrollment_id': None,  # Can be NULL
            'subject': subject,
            'topic': f"{subject} - Chapter {random.randint(1, 12)}",
            'session_date': session_date,
            'start_time': start_time,
            'end_time': end_time,
            'duration': duration,
            'mode': mode,
            'location': 'Addis Ababa' if mode in ['in-person', 'hybrid'] else None,
            'meeting_link': f"https://meet.astegni.com/{random.randint(100000, 999999)}" if mode in ['online', 'hybrid'] else None,
            'objectives': f"Cover key concepts in {subject.lower()}, practice problem-solving",
            'topics_covered': json.dumps({'topics': ['Topic 1', 'Topic 2', 'Topic 3']}),
            'materials_used': json.dumps({'materials': ['Textbook', 'Whiteboard', 'Practice Problems']}),
            'homework_assigned': f"Complete exercises 1-{random.randint(10, 30)}" if status == 'completed' else None,
            'status': status,
            'student_attended': student_attended,
            'tutor_attended': tutor_attended,
            'tutor_notes': f"Session went well. Student showed {random.choice(['excellent', 'good', 'moderate'])} progress." if status == 'completed' else None,
            'student_feedback': f"Great session! {random.choice(['Very helpful', 'Clear explanations', 'Enjoyed the class'])}" if status == 'completed' else None,
            'student_rating': student_rating,
            'amount': round(random.uniform(200, 500), 2),
            'payment_status': random.choice(payment_statuses),
            'session_frequency': random.choice(['One-time', 'Weekly', 'Bi-weekly', 'Monthly']),
            'is_recurring': random.choice([True, False]),
            'recurring_pattern': json.dumps({'frequency': 'weekly', 'count': 10}) if random.choice([True, False]) else None,
            'package_duration': random.choice([None, 30, 60, 90]),
            'grade_level': random.choice(grade_levels)
        }

        cur.execute("""
            INSERT INTO tutor_sessions (
                tutor_id, student_id, enrollment_id, subject, topic, session_date,
                start_time, end_time, duration, mode, location, meeting_link,
                objectives, topics_covered, materials_used, homework_assigned,
                status, student_attended, tutor_attended, tutor_notes, student_feedback,
                student_rating, amount, payment_status, session_frequency, is_recurring,
                recurring_pattern, package_duration, grade_level, created_at, updated_at
            ) VALUES (
                %(tutor_id)s, %(student_id)s, %(enrollment_id)s, %(subject)s, %(topic)s,
                %(session_date)s, %(start_time)s, %(end_time)s, %(duration)s, %(mode)s,
                %(location)s, %(meeting_link)s, %(objectives)s, %(topics_covered)s,
                %(materials_used)s, %(homework_assigned)s, %(status)s, %(student_attended)s,
                %(tutor_attended)s, %(tutor_notes)s, %(student_feedback)s, %(student_rating)s,
                %(amount)s, %(payment_status)s, %(session_frequency)s, %(is_recurring)s,
                %(recurring_pattern)s, %(package_duration)s, %(grade_level)s, NOW(), NOW()
            ) RETURNING id
        """, session_data)

        session_id = cur.fetchone()[0]
        sessions.append(session_id)
        print(f"✓ Created session {session_id}: {session_data['subject']} on {session_data['session_date']}")

    return sessions

def main():
    print("=" * 70)
    print("SEEDING TUTOR SCHEDULES AND SESSIONS FOR TUTOR_ID 85")
    print("=" * 70)

    conn = psycopg.connect(db_url)
    cur = conn.cursor()

    try:
        # Check if tutor exists
        cur.execute("SELECT id FROM tutor_profiles WHERE id = 85")
        tutor = cur.fetchone()
        if not tutor:
            print("❌ Error: Tutor with ID 85 not found!")
            return

        print(f"\n✓ Found tutor with ID: 85")

        # Delete existing data for clean seed
        cur.execute("DELETE FROM tutor_sessions WHERE tutor_id = 85")
        deleted_sessions = cur.rowcount
        cur.execute("DELETE FROM tutor_schedules WHERE tutor_id = 85")
        deleted_schedules = cur.rowcount
        print(f"✓ Deleted {deleted_schedules} existing schedules and {deleted_sessions} existing sessions")

        # Create schedules
        print("\n" + "-" * 70)
        print("Creating Schedules...")
        print("-" * 70)
        schedules = create_schedules(cur, tutor_id=85, count=15)

        # Create sessions
        print("\n" + "-" * 70)
        print("Creating Sessions...")
        print("-" * 70)
        sessions = create_sessions(cur, tutor_id=85, count=25)

        # Commit changes
        conn.commit()

        # Show summary
        print("\n" + "=" * 70)
        print("SEEDING COMPLETE!")
        print("=" * 70)
        print(f"✓ Created {len(schedules)} schedules")
        print(f"✓ Created {len(sessions)} sessions")
        print("\nSchedule breakdown:")
        cur.execute("SELECT status, COUNT(*) FROM tutor_schedules WHERE tutor_id = 85 GROUP BY status")
        for status, count in cur.fetchall():
            print(f"  - {status}: {count}")

        print("\nSession breakdown:")
        cur.execute("SELECT status, COUNT(*) FROM tutor_sessions WHERE tutor_id = 85 GROUP BY status")
        for status, count in cur.fetchall():
            print(f"  - {status}: {count}")

        print("\n✓ You can now test the schedule panel in tutor-profile.html")
        print("  URL: http://localhost:8080/profile-pages/tutor-profile.html")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()
