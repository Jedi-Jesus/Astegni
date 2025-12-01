"""
Seed student_tutors table from existing tutor_students data
This populates the student_tutors table (student perspective) from tutor_students table (tutor perspective)
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

def seed_student_tutors():
    """Populate student_tutors from existing tutor_students data"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 70)
        print("Seeding student_tutors table from tutor_students")
        print("=" * 70)

        # Get all relationships from tutor_students
        print("\n1. Fetching all tutor-student relationships...")
        cur.execute("""
            SELECT
                id, tutor_id, student_profile_id, enrolled_at
            FROM tutor_students
            ORDER BY id
        """)

        relationships = cur.fetchall()

        if not relationships:
            print("⚠️  No relationships found in tutor_students table")
            return

        print(f"✅ Found {len(relationships)} relationships")

        inserted_count = 0
        skipped_count = 0

        print("\n2. Creating mirror records in student_tutors...")
        for rel in relationships:
            rel_id, tutor_id, student_profile_id, enrolled_at = rel

            # Get the actual user_id from student_profiles
            cur.execute("""
                SELECT user_id FROM student_profiles WHERE id = %s
            """, (student_profile_id,))

            student_result = cur.fetchone()
            if not student_result:
                print(f"   ⚠️  Skipped: Student profile {student_profile_id} not found")
                continue

            student_user_id = student_result[0]

            # Get tutor user_id from tutor_profiles
            cur.execute("""
                SELECT user_id FROM tutor_profiles WHERE id = %s
            """, (tutor_id,))

            tutor_result = cur.fetchone()
            if not tutor_result:
                print(f"   ⚠️  Skipped: Tutor profile {tutor_id} not found")
                continue

            tutor_user_id = tutor_result[0]

            # Check if relationship already exists
            cur.execute("""
                SELECT id FROM student_tutors
                WHERE student_id = %s AND tutor_id = %s
            """, (student_user_id, tutor_user_id))

            existing = cur.fetchone()

            if existing:
                skipped_count += 1
                print(f"   ⏭️  Skipped: Student {student_user_id} - Tutor {tutor_user_id} (already exists)")
                continue

            # Insert into student_tutors with default values
            cur.execute("""
                INSERT INTO student_tutors (
                    student_id, tutor_id, tutor_type, courses,
                    enrollment_date, total_sessions, status
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s
                )
                RETURNING id
            """, (
                student_user_id,
                tutor_user_id,
                'current',  # Default to current
                None,  # courses
                enrolled_at,
                0,  # total_sessions
                'active'  # status
            ))

            result = cur.fetchone()
            if result:
                inserted_count += 1
                print(f"   ✅ Added: Student {student_user_id} - Tutor {tutor_user_id} (current)")

        conn.commit()

        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Total relationships processed: {len(relationships)}")
        print(f"Inserted: {inserted_count}")
        print(f"Skipped (duplicates): {skipped_count}")

        # Show final count
        cur.execute("SELECT COUNT(*) FROM student_tutors")
        total_count = cur.fetchone()[0]
        print(f"Total records in student_tutors: {total_count}")

        # Show breakdown by type
        cur.execute("""
            SELECT tutor_type, COUNT(*)
            FROM student_tutors
            GROUP BY tutor_type
        """)
        breakdown = cur.fetchall()
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
    seed_student_tutors()
