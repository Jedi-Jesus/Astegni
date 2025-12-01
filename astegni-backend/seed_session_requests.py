"""
Seed sample session requests for testing
"""
import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_session_requests():
    """Add sample session requests"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Get sample tutor IDs (tutors)
        cur.execute("SELECT id FROM users WHERE roles::jsonb ? 'tutor' LIMIT 3")
        tutor_ids = [row[0] for row in cur.fetchall()]

        # Get sample student IDs
        cur.execute("SELECT id FROM users WHERE roles::jsonb ? 'student' LIMIT 5")
        student_ids = [row[0] for row in cur.fetchall()]

        # Get sample parent IDs
        cur.execute("SELECT id FROM users WHERE roles::jsonb ? 'parent' LIMIT 3")
        parent_ids = [row[0] for row in cur.fetchall()]

        if not tutor_ids:
            print("⚠️  No tutors found. Please seed tutor data first.")
            return

        if not student_ids and not parent_ids:
            print("⚠️  No students or parents found. Please seed user data first.")
            return

        # Sample session requests
        sample_requests = []

        # Pending requests from students
        if tutor_ids and student_ids:
            for i in range(min(3, len(student_ids))):
                sample_requests.append({
                    'tutor_id': tutor_ids[0],
                    'requester_id': student_ids[i],
                    'requester_type': 'student',
                    'package_name': ['Basic Math Package', 'Physics Fundamentals', 'Chemistry Basics'][i],
                    'status': 'pending',
                    'message': f'Hello, I would like to request tutoring sessions. I am interested in improving my understanding of the subject.',
                    'student_name': f'Student {i+1}',
                    'student_grade': ['Grade 10', 'Grade 11', 'Grade 9'][i],
                    'preferred_schedule': ['Weekday afternoons', 'Weekend mornings', 'Tuesday/Thursday evenings'][i],
                    'contact_phone': f'+251911{str(i+1).zfill(6)}',
                    'contact_email': f'student{i+1}@example.com',
                    'responded_at': None
                })

        # Pending requests from parents
        if tutor_ids and parent_ids:
            for i in range(min(2, len(parent_ids))):
                sample_requests.append({
                    'tutor_id': tutor_ids[0],
                    'requester_id': parent_ids[i],
                    'requester_type': 'parent',
                    'package_name': ['English Language Package', 'Biology Essentials'][i],
                    'status': 'pending',
                    'message': f'I am looking for a qualified tutor for my child. They need help with their studies.',
                    'student_name': f'Child of Parent {i+1}',
                    'student_grade': ['Grade 8', 'Grade 7'][i],
                    'preferred_schedule': ['Monday/Wednesday 4-6 PM', 'Saturday mornings'][i],
                    'contact_phone': f'+251922{str(i+1).zfill(6)}',
                    'contact_email': f'parent{i+1}@example.com',
                    'responded_at': None
                })

        # Accepted requests (already in My Students)
        if tutor_ids and student_ids and len(student_ids) > 3:
            for i in range(min(2, len(student_ids) - 3)):
                sample_requests.append({
                    'tutor_id': tutor_ids[0],
                    'requester_id': student_ids[i + 3],
                    'requester_type': 'student',
                    'package_name': ['Advanced Mathematics', 'Computer Science'][i],
                    'status': 'accepted',
                    'message': f'Looking forward to learning with you!',
                    'student_name': f'Accepted Student {i+1}',
                    'student_grade': ['Grade 12', 'University Level'][i],
                    'preferred_schedule': ['Friday evenings', 'Sunday afternoons'][i],
                    'contact_phone': f'+251933{str(i+1).zfill(6)}',
                    'contact_email': f'accepted.student{i+1}@example.com',
                    'responded_at': (datetime.now() - timedelta(days=i+1)).isoformat()
                })

        # Rejected requests
        if tutor_ids and len(student_ids) > 5:
            sample_requests.append({
                'tutor_id': tutor_ids[0],
                'requester_id': student_ids[5] if len(student_ids) > 5 else student_ids[0],
                'requester_type': 'student',
                'package_name': 'History Package',
                'status': 'rejected',
                'message': 'Interested in history tutoring.',
                'student_name': 'Rejected Student 1',
                'student_grade': 'Grade 9',
                'preferred_schedule': 'Weekends',
                'contact_phone': '+251944000001',
                'contact_email': 'rejected.student@example.com',
                'responded_at': (datetime.now() - timedelta(days=3)).isoformat()
            })

        # Insert all requests
        for req in sample_requests:
            cur.execute("""
                INSERT INTO session_requests (
                    tutor_id, requester_id, requester_type, package_name,
                    status, message, student_name, student_grade,
                    preferred_schedule, contact_phone, contact_email, responded_at
                ) VALUES (
                    %(tutor_id)s, %(requester_id)s, %(requester_type)s, %(package_name)s,
                    %(status)s, %(message)s, %(student_name)s, %(student_grade)s,
                    %(preferred_schedule)s, %(contact_phone)s, %(contact_email)s, %(responded_at)s
                )
            """, req)

        conn.commit()
        print(f"✅ Successfully seeded {len(sample_requests)} session requests!")

        # Show summary
        cur.execute("""
            SELECT status, COUNT(*) FROM session_requests GROUP BY status
        """)
        print("\n📊 Session Requests Summary:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error seeding session requests: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_session_requests()
