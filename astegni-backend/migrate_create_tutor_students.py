"""
Migration: Create tutor_students table for enrolled students
This table tracks students who have been accepted by tutors
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

def create_tutor_students_table():
    """Create tutor_students table"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Drop existing table if it exists
        cur.execute("DROP TABLE IF EXISTS tutor_students CASCADE;")
        print("Dropped existing tutor_students table if it existed")

        # Create tutor_students table
        cur.execute("""
            CREATE TABLE tutor_students (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
                student_profile_id INTEGER NOT NULL,
                requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('student', 'parent')),
                student_name VARCHAR(255) NOT NULL,
                student_grade VARCHAR(50),
                package_name VARCHAR(255),
                contact_phone VARCHAR(20),
                contact_email VARCHAR(255),
                profile_picture TEXT,
                session_request_id INTEGER,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tutor_id, student_profile_id)
            );
        """)

        # Create indexes for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_tutor_students_tutor
            ON tutor_students(tutor_id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_tutor_students_student
            ON tutor_students(student_profile_id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_tutor_students_session_request
            ON tutor_students(session_request_id);
        """)

        conn.commit()
        print("✅ tutor_students table created successfully!")

        # Show table structure
        cur.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tutor_students'
            ORDER BY ordinal_position;
        """)

        print("\n📋 Table structure:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]}" + (f"({row[2]})" if row[2] else ""))

    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating tutor_students table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_tutor_students_table()
