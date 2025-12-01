"""
Seed script to create a tutor-student relationship
Adds student_id 28 as a student of tutor_id 86 in tutor_students table
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

def seed_tutor_student_relationship():
    """Add student_id 28 as a student of tutor_id 86"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 70)
        print("Seeding tutor-student relationship")
        print("=" * 70)

        # First, verify that both tutor and student exist
        print("\n1. Verifying tutor_id 86 exists...")
        cur.execute("""
            SELECT id, user_id, username
            FROM tutor_profiles
            WHERE id = 86
        """)
        tutor = cur.fetchone()

        if not tutor:
            print("❌ ERROR: Tutor with ID 86 not found!")
            return

        tutor_id, tutor_user_id, tutor_username = tutor
        print(f"✅ Found tutor: {tutor_username}")
        print(f"   - Tutor Profile ID: {tutor_id}")
        print(f"   - Tutor User ID: {tutor_user_id}")

        print("\n2. Verifying student_id 28 exists...")
        cur.execute("""
            SELECT id, user_id, username, grade_level, profile_picture
            FROM student_profiles
            WHERE id = 28
        """)
        student = cur.fetchone()

        if not student:
            print("❌ ERROR: Student with ID 28 not found!")
            return

        student_id, student_user_id, student_username, student_grade, student_profile_pic = student
        student_full_name = student_username  # Use username as name
        print(f"✅ Found student: {student_username}")
        print(f"   - Student Profile ID: {student_id}")
        print(f"   - Student User ID: {student_user_id}")
        print(f"   - Grade Level: {student_grade or 'Not specified'}")

        # Check if relationship already exists
        print("\n3. Checking if relationship already exists...")
        cur.execute("""
            SELECT id, enrolled_at
            FROM tutor_students
            WHERE tutor_id = %s AND student_profile_id = %s
        """, (tutor_id, student_id))
        existing = cur.fetchone()

        if existing:
            print(f"⚠️  Relationship already exists (ID: {existing[0]}, enrolled: {existing[1]})")
            print("   Skipping insert...")
            return

        # Get user's email and phone from users table
        print("\n4. Fetching student contact information...")
        cur.execute("""
            SELECT email, phone
            FROM users
            WHERE id = %s
        """, (student_user_id,))
        contact_info = cur.fetchone()
        student_email = contact_info[0] if contact_info and contact_info[0] else None
        student_phone = contact_info[1] if contact_info and contact_info[1] else None

        print(f"   - Email: {student_email or 'Not provided'}")
        print(f"   - Phone: {student_phone or 'Not provided'}")
        print(f"   - Profile Picture: {'Yes' if student_profile_pic else 'No'}")

        # Insert the relationship
        print("\n5. Creating tutor-student relationship...")
        cur.execute("""
            INSERT INTO tutor_students (
                tutor_id,
                student_profile_id,
                requester_type,
                student_name,
                student_grade,
                contact_phone,
                contact_email,
                profile_picture
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, enrolled_at
        """, (
            tutor_id,
            student_id,
            'student',  # requester_type
            student_full_name,
            student_grade,
            student_phone,
            student_email,
            student_profile_pic
        ))

        result = cur.fetchone()
        relationship_id = result[0]
        enrolled_at = result[1]

        conn.commit()

        print(f"✅ Successfully created relationship!")
        print(f"   - Relationship ID: {relationship_id}")
        print(f"   - Enrolled At: {enrolled_at}")

        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)
        print(f"Tutor: {tutor_username} (ID: {tutor_id})")
        print(f"Student: {student_username} (ID: {student_id})")
        print(f"Relationship ID: {relationship_id}")
        print(f"Status: ✅ Active")
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
    seed_tutor_student_relationship()
