"""
Migration: Add student_id to whiteboard_session_recordings

Adds student_id column to directly link recordings to students
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        database_url = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"
    return psycopg.connect(database_url)

def migrate():
    """Add student_id column to whiteboard_session_recordings"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("Adding student_id column to whiteboard_session_recordings...")

        # Add student_id column
        cursor.execute("""
            ALTER TABLE whiteboard_session_recordings
            ADD COLUMN IF NOT EXISTS student_id INTEGER;
        """)

        print("Adding foreign key constraint...")

        # Add foreign key constraint to users table
        cursor.execute("""
            ALTER TABLE whiteboard_session_recordings
            ADD CONSTRAINT fk_recording_student
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL;
        """)

        print("Creating index for student_id...")

        # Add index for better query performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_whiteboard_session_recordings_student_id
            ON whiteboard_session_recordings(student_id);
        """)

        print("Populating student_id from whiteboard_sessions...")

        # Populate student_id from existing sessions
        cursor.execute("""
            UPDATE whiteboard_session_recordings r
            SET student_id = s.student_id
            FROM whiteboard_sessions s
            WHERE r.session_id = s.id
            AND r.student_id IS NULL;
        """)

        rows_updated = cursor.rowcount

        conn.commit()
        print("SUCCESS: Migration completed successfully!")
        print(f"  - Added student_id column")
        print(f"  - Added foreign key constraint")
        print(f"  - Added index")
        print(f"  - Populated {rows_updated} existing recordings with student_id")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Error during migration: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
