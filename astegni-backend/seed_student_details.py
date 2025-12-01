"""
Populate student_details table from existing tutor_students data
"""
import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_student_details():
    """Populate student_details from tutor_students with mock metrics"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 80)
        print("SEEDING student_details TABLE")
        print("=" * 80)

        # Get all students from tutor_students
        cur.execute("""
            SELECT
                ts.tutor_id,
                ts.student_profile_id,
                ts.student_name,
                ts.student_grade,
                ts.profile_picture,
                ts.package_name,
                ts.enrolled_at,
                tp.id as package_id,
                tp.hourly_rate
            FROM tutor_students ts
            LEFT JOIN tutor_packages tp ON ts.package_name = tp.name AND ts.tutor_id = tp.tutor_id
            WHERE ts.tutor_id = 85
        """)

        students = cur.fetchall()

        if not students:
            print("⚠️ No students found in tutor_students table")
            return

        print(f"\nFound {len(students)} students to migrate\n")

        import random

        for student in students:
            tutor_id, student_profile_id, student_name, student_grade, profile_picture, \
            package_name, enrolled_at, package_id, hourly_rate = student

            # Generate realistic mock data
            total_sessions = random.randint(20, 40)
            attended_sessions = int(total_sessions * random.uniform(0.80, 1.0))
            absent_sessions = random.randint(0, 2)
            late_sessions = total_sessions - attended_sessions - absent_sessions

            attendance_rate = int((attended_sessions / total_sessions) * 100)

            total_assignments = random.randint(5, 12)
            completed_assignments = int(total_assignments * random.uniform(0.60, 0.90))
            pending_assignments = random.randint(1, 3)
            overdue_assignments = total_assignments - completed_assignments - pending_assignments

            overall_progress = random.randint(60, 95)
            improvement_rate = random.randint(10, 40)

            # Academic grades
            grade_options = [
                (92.5, 'A'), (88.0, 'A-'), (85.0, 'B+'),
                (82.0, 'B'), (78.0, 'B-'), (75.0, 'C+')
            ]
            average_grade, grade_letter = random.choice(grade_options)

            # Tuition info
            monthly_tuition = hourly_rate * 4 if hourly_rate else 3000.0
            outstanding_balance = random.choice([0, 0, 0, monthly_tuition])  # 75% paid

            # Parent info (mock for now)
            parent_names = [
                ("Ato Kebede Alemu", "+251 911 234 567", "kebede.alemu@email.com", "Father"),
                ("Weyzero Sara Tesfaye", "+251 922 345 678", "sara.tesfaye@email.com", "Mother"),
                ("Ato Girma Bekele", "+251 933 456 789", "girma.bekele@email.com", "Father")
            ]
            parent_name, parent_phone, parent_email, parent_relationship = random.choice(parent_names)

            # Insert into student_details
            cur.execute("""
                INSERT INTO student_details (
                    tutor_id, student_profile_id, student_name, student_grade,
                    profile_picture, package_id, package_name,
                    overall_progress, attendance_rate, improvement_rate,
                    total_assignments, completed_assignments, pending_assignments, overdue_assignments,
                    total_sessions, attended_sessions, absent_sessions, late_sessions,
                    average_grade, grade_letter,
                    monthly_tuition, outstanding_balance,
                    parent_name, parent_phone, parent_email, parent_relationship,
                    enrolled_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s,
                    %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s,
                    %s, %s,
                    %s, %s, %s, %s,
                    %s
                )
                ON CONFLICT (tutor_id, student_profile_id) DO UPDATE SET
                    student_name = EXCLUDED.student_name,
                    student_grade = EXCLUDED.student_grade,
                    profile_picture = EXCLUDED.profile_picture,
                    package_id = EXCLUDED.package_id,
                    package_name = EXCLUDED.package_name,
                    last_updated = CURRENT_TIMESTAMP
            """, (
                tutor_id, student_profile_id, student_name, student_grade,
                profile_picture, package_id, package_name,
                overall_progress, attendance_rate, improvement_rate,
                total_assignments, completed_assignments, pending_assignments, overdue_assignments,
                total_sessions, attended_sessions, absent_sessions, late_sessions,
                average_grade, grade_letter,
                monthly_tuition, outstanding_balance,
                parent_name, parent_phone, parent_email, parent_relationship,
                enrolled_at
            ))

            print(f"✅ Migrated: {student_name}")
            print(f"   Progress: {overall_progress}% | Attendance: {attendance_rate}% | Assignments: {completed_assignments}/{total_assignments}")

        conn.commit()

        print("\n" + "=" * 80)
        print("✅ SEEDING COMPLETE!")
        print("=" * 80)

        # Verification
        cur.execute("SELECT COUNT(*) FROM student_details WHERE tutor_id = 85")
        count = cur.fetchone()[0]
        print(f"\nTotal students in student_details: {count}")

        # Show sample data
        print("\n📋 SAMPLE DATA:")
        print("-" * 80)
        cur.execute("""
            SELECT student_name, student_grade, overall_progress,
                   attendance_rate, completed_assignments, total_assignments
            FROM student_details
            WHERE tutor_id = 85
            ORDER BY student_name
        """)
        for row in cur.fetchall():
            print(f"{row[0]:25} | {row[1]:20} | Progress: {row[2]:3}% | Attendance: {row[3]:3}% | Assignments: {row[4]}/{row[5]}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error seeding student_details: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_student_details()
