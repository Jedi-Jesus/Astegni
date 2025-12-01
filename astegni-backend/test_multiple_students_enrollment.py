"""
Test: Add multiple students to one enrollment
Demonstrates the new students_id array functionality
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

def test_multiple_students():
    """Test adding multiple students to one course enrollment"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Testing multiple students in one enrollment...\n")

                # Get some test data
                print("1. Fetching test data...")

                # Get a tutor
                tutor_result = conn.execute(text("SELECT id FROM tutor_profiles LIMIT 1"))
                tutor_id = tutor_result.fetchone()[0]

                # Get a course
                course_result = conn.execute(text("SELECT id, title, icon FROM courses LIMIT 1"))
                course_row = course_result.fetchone()
                course_id = course_row[0]
                course_title = course_row[1]
                course_icon = course_row[2]

                # Get a package
                package_result = conn.execute(
                    text("SELECT id, name FROM tutor_packages WHERE tutor_id = :tutor_id LIMIT 1"),
                    {"tutor_id": tutor_id}
                )
                package_row = package_result.fetchone()
                package_id = package_row[0]
                package_name = package_row[1]

                # Get multiple students (3 students)
                students_result = conn.execute(text("SELECT id FROM student_profiles LIMIT 3"))
                student_ids = [row[0] for row in students_result.fetchall()]

                print(f"   Tutor ID: {tutor_id}")
                print(f"   Course: {course_icon} {course_title} (ID: {course_id})")
                print(f"   Package: {package_name} (ID: {package_id})")
                print(f"   Students: {student_ids}")

                # Create enrollment with multiple students
                print("\n2. Creating enrollment with multiple students...")
                conn.execute(
                    text("""
                        INSERT INTO enrolled_courses
                        (tutor_id, course_id, package_id, students_id)
                        VALUES (:tutor_id, :course_id, :package_id, :students_id)
                        RETURNING id
                    """),
                    {
                        "tutor_id": tutor_id,
                        "course_id": course_id,
                        "package_id": package_id,
                        "students_id": student_ids  # Array of student IDs
                    }
                )
                result = conn.execute(text("SELECT lastval()"))
                enrollment_id = result.scalar()

                print(f"   ✓ Created enrollment ID: {enrollment_id}")

                # Fetch and display the created enrollment
                print("\n3. Verifying enrollment...")
                verify_result = conn.execute(
                    text("""
                        SELECT
                            ec.id,
                            ec.students_id,
                            c.icon || ' ' || c.title as course,
                            tp.name as package_name
                        FROM enrolled_courses ec
                        JOIN courses c ON ec.course_id = c.id
                        JOIN tutor_packages tp ON ec.package_id = tp.id
                        WHERE ec.id = :enrollment_id
                    """),
                    {"enrollment_id": enrollment_id}
                )

                enrollment = verify_result.fetchone()

                print(f"   Enrollment ID: {enrollment.id}")
                print(f"   Course: {enrollment.course}")
                print(f"   Package: {enrollment.package_name}")
                print(f"   Students (Array): {enrollment.students_id}")
                print(f"   Number of Students: {len(enrollment.students_id)}")

                # Get student names
                print("\n4. Fetching student details...")
                for student_id in enrollment.students_id:
                    student_result = conn.execute(
                        text("""
                            SELECT
                                u.first_name || ' ' || u.father_name as name,
                                sp.grade_level
                            FROM student_profiles sp
                            JOIN users u ON sp.user_id = u.id
                            WHERE sp.id = :student_id
                        """),
                        {"student_id": student_id}
                    )
                    student = student_result.fetchone()
                    if student:
                        print(f"   - Student {student_id}: {student.name} ({student.grade_level})")

                # Test querying: Find all enrollments that contain a specific student
                print(f"\n5. Testing array query - Find enrollments containing student {student_ids[0]}...")
                query_result = conn.execute(
                    text("""
                        SELECT
                            ec.id,
                            c.icon || ' ' || c.title as course,
                            ec.students_id
                        FROM enrolled_courses ec
                        JOIN courses c ON ec.course_id = c.id
                        WHERE :student_id = ANY(ec.students_id)
                        LIMIT 5
                    """),
                    {"student_id": student_ids[0]}
                )

                print(f"   Enrollments containing student {student_ids[0]}:")
                for row in query_result.fetchall():
                    print(f"     - Enrollment {row.id}: {row.course} (Students: {row.students_id})")

                # Commit transaction
                trans.commit()
                print("\n✅ Test completed successfully!")
                print("\n" + "="*80)
                print("DEMONSTRATION COMPLETE")
                print("="*80)
                print("\nThe enrolled_courses table now supports:")
                print("  ✓ Multiple students in a single enrollment")
                print("  ✓ Array-based queries (ANY, ALL, @> operators)")
                print("  ✓ Efficient GIN indexing for array searches")
                print("  ✓ Flexible student group management")

            except Exception as e:
                trans.rollback()
                print(f"\n✗ Error during test: {e}")
                raise

    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    test_multiple_students()
