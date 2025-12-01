"""
Seed student_tutors table specifically for student_id 28
Creates relationships with tutors from accepted connections
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

def seed_student_28_tutors():
    """Populate student_tutors for student 28 from accepted connections"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 70)
        print("Seeding student_tutors for Student ID 28")
        print("=" * 70)

        # First, get student 28's user_id
        print("\n1. Getting student 28's user_id...")
        cur.execute("""
            SELECT user_id, username, grade_level
            FROM student_profiles
            WHERE id = 28
        """)

        student = cur.fetchone()
        if not student:
            print("❌ ERROR: Student profile 28 not found!")
            return

        student_user_id, username, grade_level = student
        print(f"✅ Found student: {username}")
        print(f"   User ID: {student_user_id}")
        print(f"   Grade Level: {grade_level or 'Not specified'}")

        # Get all tutors that student 28 has accepted connections with
        print("\n2. Finding accepted tutor connections...")
        cur.execute("""
            SELECT DISTINCT tp.user_id, tp.username, u.first_name, u.father_name
            FROM tutor_students ts
            JOIN tutor_profiles tp ON ts.tutor_id = tp.id
            JOIN users u ON tp.user_id = u.id
            WHERE ts.student_profile_id = 28
            ORDER BY tp.user_id
        """)

        tutors = cur.fetchall()

        if not tutors:
            print("⚠️  No accepted connections found for student 28")
            print("   Looking for any available tutors to create sample data...")

            # Get some sample tutors
            cur.execute("""
                SELECT user_id, username, u.first_name, u.father_name
                FROM tutor_profiles tp
                JOIN users u ON tp.user_id = u.id
                WHERE tp.id IN (SELECT MIN(id) FROM tutor_profiles GROUP BY user_id)
                LIMIT 5
            """)
            tutors = cur.fetchall()

        print(f"✅ Found {len(tutors)} tutors")

        inserted_count = 0
        skipped_count = 0

        print("\n3. Creating student-tutor relationships...")
        for tutor in tutors:
            tutor_user_id, tutor_username, first_name, father_name = tutor

            # Check if relationship already exists
            cur.execute("""
                SELECT id FROM student_tutors
                WHERE student_id = %s AND tutor_id = %s
            """, (student_user_id, tutor_user_id))

            existing = cur.fetchone()

            if existing:
                skipped_count += 1
                print(f"   ⏭️  Skipped: {first_name} {father_name} ({tutor_username}) - already exists")
                continue

            # Insert into student_tutors
            cur.execute("""
                INSERT INTO student_tutors (
                    student_id, tutor_id, tutor_type, courses,
                    enrollment_date, total_sessions, status
                ) VALUES (
                    %s, %s, %s, %s, NOW(), %s, %s
                )
                RETURNING id
            """, (
                student_user_id,
                tutor_user_id,
                'current',  # Default to current
                None,  # courses - can be updated later
                0,  # total_sessions
                'active'  # status
            ))

            result = cur.fetchone()
            if result:
                inserted_count += 1
                print(f"   ✅ Added: {first_name} {father_name} ({tutor_username})")

        conn.commit()

        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Student: {username} (User ID: {student_user_id})")
        print(f"Tutors processed: {len(tutors)}")
        print(f"Inserted: {inserted_count}")
        print(f"Skipped (duplicates): {skipped_count}")

        # Show final count for this student
        cur.execute("""
            SELECT COUNT(*) FROM student_tutors WHERE student_id = %s
        """, (student_user_id,))
        total_count = cur.fetchone()[0]
        print(f"Total tutors for student 28: {total_count}")

        # Show breakdown by type
        cur.execute("""
            SELECT tutor_type, COUNT(*)
            FROM student_tutors
            WHERE student_id = %s
            GROUP BY tutor_type
        """, (student_user_id,))
        breakdown = cur.fetchall()

        if breakdown:
            print("\nBreakdown by tutor type:")
            for tutor_type, count in breakdown:
                print(f"   {tutor_type}: {count}")

        print("=" * 70)

    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_student_28_tutors()
