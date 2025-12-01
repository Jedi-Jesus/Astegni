"""
View enrolled_courses table with proper UTF-8 encoding
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def view_enrolled_courses():
    """View all enrolled courses with student, tutor, and course details"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Get enrolled courses with joined data
            result = conn.execute(text("""
                SELECT
                    ec.id,
                    ec.students_id,
                    ec.tutor_id,
                    ut.first_name || ' ' || ut.father_name as tutor_name,
                    ec.course_id,
                    c.title as course_title,
                    c.icon as course_icon,
                    ec.package_id,
                    ec.enrolled_at,
                    ec.created_at,
                    ec.updated_at
                FROM enrolled_courses ec
                LEFT JOIN tutor_profiles tp ON ec.tutor_id = tp.id
                LEFT JOIN users ut ON tp.user_id = ut.id
                LEFT JOIN courses c ON ec.course_id = c.id
                ORDER BY ec.enrolled_at DESC
            """))

            enrollments = result.fetchall()

            if not enrollments:
                print("No enrollments found in database.")
                return

            print(f"\n{'='*120}")
            print(f"Total Enrollments: {len(enrollments)}")
            print(f"{'='*120}\n")

            for enrollment in enrollments:
                # Get student names for all students in the array
                student_ids = enrollment.students_id
                student_names = []

                for student_id in student_ids:
                    student_result = conn.execute(
                        text("""
                            SELECT u.first_name || ' ' || u.father_name as student_name
                            FROM student_profiles sp
                            JOIN users u ON sp.user_id = u.id
                            WHERE sp.id = :student_id
                        """),
                        {"student_id": student_id}
                    )
                    student_row = student_result.fetchone()
                    if student_row:
                        student_names.append(f"{student_row.student_name} (ID: {student_id})")

                students_display = ", ".join(student_names) if student_names else "No students"

                print(f"Enrollment ID: {enrollment.id}")
                print(f"Students: {students_display}")
                print(f"Student IDs: {student_ids}")
                print(f"Tutor: {enrollment.tutor_name} (ID: {enrollment.tutor_id})")
                print(f"Course: {enrollment.course_icon} {enrollment.course_title} (ID: {enrollment.course_id})")
                print(f"Package ID: {enrollment.package_id if enrollment.package_id else 'None'}")
                print(f"Enrolled At: {enrollment.enrolled_at}")
                print(f"Created At: {enrollment.created_at}")
                print(f"Updated At: {enrollment.updated_at}")
                print("-" * 120)
                print()

            # Show statistics
            print(f"\n{'='*120}")
            print("STATISTICS")
            print(f"{'='*120}\n")

            # Total enrollments by course
            result = conn.execute(text("""
                SELECT c.icon, c.title, COUNT(ec.id) as count
                FROM enrolled_courses ec
                JOIN courses c ON ec.course_id = c.id
                GROUP BY c.id, c.icon, c.title
                ORDER BY count DESC
            """))

            print("Enrollments by Course:")
            for row in result.fetchall():
                print(f"  {row.icon} {row.title}: {row.count} enrollments")

    except Exception as e:
        print(f"Error: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    view_enrolled_courses()
