"""
Migration: Create session_requests table for tutor session bookings
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

def create_session_requests_table():
    """Create session_requests table"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Drop existing table if it exists
        cur.execute("DROP TABLE IF EXISTS session_requests CASCADE;")
        print("Dropped existing session_requests table if it existed")

        # Create session_requests table
        cur.execute("""
            CREATE TABLE session_requests (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                requester_type VARCHAR(20) NOT NULL CHECK (requester_type IN ('student', 'parent')),
                package_id INTEGER REFERENCES tutor_packages(id) ON DELETE SET NULL,
                package_name VARCHAR(255),
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
                message TEXT,
                student_name VARCHAR(255),
                student_grade VARCHAR(50),
                preferred_schedule TEXT,
                contact_phone VARCHAR(20),
                contact_email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                responded_at TIMESTAMP
            );
        """)

        # Create index for faster queries
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_session_requests_tutor
            ON session_requests(tutor_id, status);
        """)

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_session_requests_requester
            ON session_requests(requester_id);
        """)

        conn.commit()
        print("✅ session_requests table created successfully!")

        # Show table structure
        cur.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'session_requests'
            ORDER BY ordinal_position;
        """)

        print("\n📋 Table structure:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]}" + (f"({row[2]})" if row[2] else ""))

    except Exception as e:
        conn.rollback()
        print(f"❌ Error creating session_requests table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_session_requests_table()
