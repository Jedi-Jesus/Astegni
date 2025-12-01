"""
Seed tutor_students table from accepted tutor_session_requests
This populates the tutor_students table with students who have already been accepted
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

def seed_tutor_students():
    """Populate tutor_students from accepted session requests"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get all accepted session requests
        cur.execute("""
            SELECT
                sr.id, sr.tutor_id, sr.requester_id, sr.requester_type,
                sr.student_name, sr.student_grade, sr.package_name,
                sr.contact_phone, sr.contact_email, sr.responded_at
            FROM tutor_session_requests sr
            WHERE sr.status = 'accepted'
            ORDER BY sr.id
        """)

        accepted_requests = cur.fetchall()

        if not accepted_requests:
            print("⚠️ No accepted session requests found")
            return

        print(f"Found {len(accepted_requests)} accepted session requests")

        inserted_count = 0
        skipped_count = 0

        for request in accepted_requests:
            request_id, tutor_id, requester_id, requester_type, student_name, student_grade, package_name, contact_phone, contact_email, responded_at = request

            # Get profile picture based on requester type
            if requester_type == 'student':
                cur.execute("""
                    SELECT u.profile_picture
                    FROM student_profiles sp
                    JOIN users u ON sp.user_id = u.id
                    WHERE sp.id = %s
                """, (requester_id,))
            else:  # parent
                cur.execute("""
                    SELECT u.profile_picture
                    FROM parent_profiles pp
                    JOIN users u ON pp.user_id = u.id
                    WHERE pp.id = %s
                """, (requester_id,))

            profile_picture_row = cur.fetchone()
            profile_picture = profile_picture_row[0] if profile_picture_row else None

            # Insert into tutor_students (with duplicate check)
            cur.execute("""
                INSERT INTO tutor_students (
                    tutor_id, student_profile_id, requester_type, student_name,
                    student_grade, package_name, contact_phone, contact_email,
                    profile_picture, session_request_id, enrolled_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
                ON CONFLICT (tutor_id, student_profile_id) DO NOTHING
                RETURNING id
            """, (
                tutor_id,
                requester_id,
                requester_type,
                student_name,
                student_grade,
                package_name,
                contact_phone,
                contact_email,
                profile_picture,
                request_id,
                responded_at  # Use the original acceptance date
            ))

            result = cur.fetchone()
            if result:
                inserted_count += 1
                print(f"  ✅ Added student '{student_name}' (ID: {requester_id}) to tutor {tutor_id}")
            else:
                skipped_count += 1
                print(f"  ⏭️  Skipped duplicate: Student '{student_name}' (ID: {requester_id}) already enrolled with tutor {tutor_id}")

        conn.commit()

        print(f"\n✅ Seeding completed!")
        print(f"   Inserted: {inserted_count}")
        print(f"   Skipped (duplicates): {skipped_count}")

        # Show final count
        cur.execute("SELECT COUNT(*) FROM tutor_students")
        total_count = cur.fetchone()[0]
        print(f"   Total students in tutor_students: {total_count}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error seeding tutor_students: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_tutor_students()
