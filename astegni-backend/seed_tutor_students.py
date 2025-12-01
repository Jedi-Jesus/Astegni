"""
Seed script for enrolled_students table
Adds sample enrolled students for tutors to test the my-students panel
"""
import psycopg
from datetime import datetime, timedelta
import random
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

# Sample package names
PACKAGES = [
    "Mathematics Mastery",
    "Physics Fundamentals",
    "Chemistry Essentials",
    "Biology Deep Dive",
    "English Literature",
    "Computer Science Basics",
    "Advanced Calculus",
    "Data Science 101",
    "Web Development",
    "Mobile App Development"
]

def seed_enrolled_students():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("🌱 Starting enrolled_students seeding process...")

        # Step 1: Get all tutors
        cur.execute("""
            SELECT tp.id, tp.user_id
            FROM tutor_profiles tp
            LIMIT 10;
        """)
        tutors = cur.fetchall()

        if not tutors:
            print("⚠️  No tutors found in database. Please seed tutors first.")
            return

        print(f"✅ Found {len(tutors)} tutors")

        # Step 2: Get all students
        cur.execute("""
            SELECT sp.id, sp.user_id
            FROM student_profiles sp
            LIMIT 20;
        """)
        students = cur.fetchall()

        if not students:
            print("⚠️  No students found in database. Please seed students first.")
            return

        print(f"✅ Found {len(students)} students")

        # Step 3: Clear existing enrolled_students data
        cur.execute("DELETE FROM enrolled_students;")
        conn.commit()
        print("🗑️  Cleared existing enrolled_students data")

        # Step 4: Create enrollments
        enrollments_created = 0

        for tutor_profile_id, tutor_user_id in tutors:
            # Each tutor gets 2-5 students
            num_students = random.randint(2, 5)
            selected_students = random.sample(students, min(num_students, len(students)))

            for student_profile_id, student_user_id in selected_students:
                # Random enrollment date within last 90 days
                days_ago = random.randint(1, 90)
                enrolled_at = datetime.now() - timedelta(days=days_ago)

                # Random package
                package_name = random.choice(PACKAGES)

                cur.execute("""
                    INSERT INTO enrolled_students (
                        tutor_id,
                        student_id,
                        package_name,
                        session_request_id,
                        enrolled_at,
                        created_at,
                        updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    tutor_profile_id,    # tutor_profiles.id
                    student_profile_id,  # student_profiles.id
                    package_name,
                    None,  # session_request_id (can be null)
                    enrolled_at,
                    enrolled_at,
                    enrolled_at
                ))

                enrollments_created += 1

        conn.commit()
        print(f"✅ Created {enrollments_created} tutor-student enrollments")

        # Step 5: Show summary
        cur.execute("""
            SELECT
                COUNT(*) as total_enrollments,
                COUNT(DISTINCT tutor_id) as tutors_with_students,
                COUNT(DISTINCT student_id) as enrolled_students
            FROM enrolled_students;
        """)
        summary = cur.fetchone()

        print("\n📊 Seeding Summary:")
        print(f"   Total Enrollments: {summary[0]}")
        print(f"   Tutors with Students: {summary[1]}")
        print(f"   Enrolled Students: {summary[2]}")

        # Show sample data
        print("\n🔍 Sample Enrollments:")
        cur.execute("""
            SELECT
                es.id,
                CONCAT(u_tutor.first_name, ' ', u_tutor.father_name) as tutor_name,
                CONCAT(u_student.first_name, ' ', u_student.father_name) as student_name,
                es.package_name,
                es.enrolled_at
            FROM enrolled_students es
            INNER JOIN tutor_profiles tp ON es.tutor_id = tp.id
            INNER JOIN users u_tutor ON tp.user_id = u_tutor.id
            INNER JOIN student_profiles sp ON es.student_id = sp.id
            INNER JOIN users u_student ON sp.user_id = u_student.id
            ORDER BY es.enrolled_at DESC
            LIMIT 5;
        """)

        for row in cur.fetchall():
            print(f"   • Tutor: {row[1]} | Student: {row[2]} | Package: {row[3]} | Enrolled: {row[4].strftime('%Y-%m-%d')}")

        print("\n✨ Enrolled students seeding completed successfully!")
        print("\n💡 Next Steps:")
        print("   1. Start backend: cd astegni-backend && python app.py")
        print("   2. Start frontend: python -m http.server 8080")
        print("   3. Login as tutor and visit My Students panel")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Seeding failed: {str(e)}")
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_enrolled_students()
