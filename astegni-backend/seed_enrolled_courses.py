"""
Seed data for enrolled_courses table
Creates sample student enrollments in courses
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_enrollments():
    """Create sample enrolled courses data"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Fetching existing students, tutors, and courses...")

                # Get some students
                students_result = conn.execute(text("SELECT id FROM student_profiles LIMIT 10"))
                students = [row.id for row in students_result.fetchall()]

                # Get some tutors
                tutors_result = conn.execute(text("SELECT id FROM tutor_profiles LIMIT 10"))
                tutors = [row.id for row in tutors_result.fetchall()]

                # Get some courses
                courses_result = conn.execute(text("SELECT id FROM courses LIMIT 16"))
                courses = [row.id for row in courses_result.fetchall()]

                if not students:
                    print("⚠ No students found. Please seed student data first.")
                    return

                if not tutors:
                    print("⚠ No tutors found. Please seed tutor data first.")
                    return

                if not courses:
                    print("⚠ No courses found. Please seed course data first.")
                    return

                print(f"Found {len(students)} students, {len(tutors)} tutors, {len(courses)} courses")
                print("\nCreating enrolled courses...")

                enrollments_created = 0
                enrollments_data = []

                # Create 30 random enrollments
                for i in range(30):
                    student_id = random.choice(students)
                    tutor_id = random.choice(tutors)
                    course_id = random.choice(courses)

                    # Random enrollment date within last 90 days
                    days_ago = random.randint(1, 90)
                    enrolled_at = datetime.now() - timedelta(days=days_ago)

                    # Check if this combination already exists
                    check_result = conn.execute(
                        text("""
                            SELECT id FROM enrolled_courses
                            WHERE tutor_id = :tutor_id
                            AND student_id = :student_id
                            AND course_id = :course_id
                        """),
                        {
                            "tutor_id": tutor_id,
                            "student_id": student_id,
                            "course_id": course_id
                        }
                    )

                    if check_result.fetchone():
                        print(f"  ⚠ Skipping duplicate: Student {student_id} + Tutor {tutor_id} + Course {course_id}")
                        continue

                    # Insert enrollment
                    conn.execute(
                        text("""
                            INSERT INTO enrolled_courses
                            (tutor_id, student_id, course_id, package_id, enrolled_at)
                            VALUES (:tutor_id, :student_id, :course_id, :package_id, :enrolled_at)
                        """),
                        {
                            "tutor_id": tutor_id,
                            "student_id": student_id,
                            "course_id": course_id,
                            "package_id": None,  # Can be linked to packages later
                            "enrolled_at": enrolled_at
                        }
                    )

                    enrollments_created += 1
                    enrollments_data.append({
                        "student_id": student_id,
                        "tutor_id": tutor_id,
                        "course_id": course_id,
                        "enrolled_at": enrolled_at.strftime("%Y-%m-%d")
                    })

                    print(f"  ✓ Enrollment {enrollments_created}: Student {student_id} → Tutor {tutor_id} → Course {course_id}")

                # Commit transaction
                trans.commit()

                print(f"\n✅ Successfully created {enrollments_created} course enrollments!")

                # Show summary statistics
                print("\n" + "="*100)
                print("ENROLLMENT SUMMARY")
                print("="*100)

                # Count by student
                result = conn.execute(text("""
                    SELECT student_id, COUNT(*) as enrollment_count
                    FROM enrolled_courses
                    GROUP BY student_id
                    ORDER BY enrollment_count DESC
                    LIMIT 5
                """))

                print("\nTop 5 Students by Enrollments:")
                for row in result.fetchall():
                    print(f"  Student {row.student_id}: {row.enrollment_count} courses")

                # Count by tutor
                result = conn.execute(text("""
                    SELECT tutor_id, COUNT(*) as enrollment_count
                    FROM enrolled_courses
                    GROUP BY tutor_id
                    ORDER BY enrollment_count DESC
                    LIMIT 5
                """))

                print("\nTop 5 Tutors by Enrollments:")
                for row in result.fetchall():
                    print(f"  Tutor {row.tutor_id}: {row.enrollment_count} students")

                # Count by course
                result = conn.execute(text("""
                    SELECT c.title, COUNT(ec.id) as enrollment_count
                    FROM enrolled_courses ec
                    JOIN courses c ON ec.course_id = c.id
                    GROUP BY c.id, c.title
                    ORDER BY enrollment_count DESC
                    LIMIT 5
                """))

                print("\nTop 5 Most Popular Courses:")
                for row in result.fetchall():
                    print(f"  {row.title}: {row.enrollment_count} enrollments")

            except Exception as e:
                trans.rollback()
                print(f"✗ Error during seeding: {e}")
                raise

    except Exception as e:
        print(f"✗ Seeding failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    seed_enrollments()
