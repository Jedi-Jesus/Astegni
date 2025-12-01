"""
Migration script to create student_tutors table.
This table mirrors tutor_students but from the student's perspective,
allowing students to view their tutors after connection requests are accepted.

Run this script once to create the table.
"""

import os
import psycopg
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL from environment
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

def create_table():
    """Create the student_tutors table using raw SQL"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("Creating student_tutors table...")
        print("=" * 60)

        # Create table with raw SQL
        cur.execute("""
            CREATE TABLE IF NOT EXISTS student_tutors (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                tutor_type VARCHAR(20) NOT NULL DEFAULT 'current',
                courses JSONB,
                enrollment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                completion_date TIMESTAMP WITH TIME ZONE,
                total_sessions INTEGER NOT NULL DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
            );
        """)

        # Create indexes
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_tutors_student_id ON student_tutors(student_id);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_tutors_tutor_id ON student_tutors(tutor_id);
        """)

        # Add unique constraint to prevent duplicates
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_student_tutors_unique
            ON student_tutors(student_id, tutor_id);
        """)

        conn.commit()

        print("\n" + "=" * 60)
        print("Successfully created table:")
        print("   student_tutors - Track student's tutors (current/past)")
        print("=" * 60)
        print("\nThis table allows students to:")
        print("   • View their current tutors")
        print("   • Track past tutors")
        print("   • See courses taken with each tutor")
        print("   • Monitor session count and enrollment history")
        print("=" * 60)

        cur.close()
        conn.close()

    except Exception as e:
        print(f"Error creating table: {e}")
        raise

if __name__ == "__main__":
    create_table()
