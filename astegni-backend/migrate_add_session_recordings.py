"""
Migration: Add Whiteboard Session Recording System

Creates table for storing whiteboard session recordings with board snapshot data
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
    """Add whiteboard_session_recordings table"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("Creating whiteboard_session_recordings table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS whiteboard_session_recordings (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES whiteboard_sessions(id) ON DELETE CASCADE,
                student_id INTEGER[], -- Array of student IDs for group sessions
                recording_title VARCHAR(255) NOT NULL,
                recording_type VARCHAR(50) DEFAULT 'video', -- 'video', 'screen', 'board'
                file_url TEXT,
                file_size_bytes BIGINT,
                duration_seconds INTEGER,
                thumbnail_url TEXT,
                board_snapshot JSONB, -- Stores canvas data at time of recording
                recording_metadata JSONB, -- Additional metadata (resolution, codec, etc.)
                recording_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_processing BOOLEAN DEFAULT false,
                is_available BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Add indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_whiteboard_session_recordings_session_id
            ON whiteboard_session_recordings(session_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_whiteboard_session_recordings_student_id
            ON whiteboard_session_recordings USING GIN (student_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_whiteboard_session_recordings_date
            ON whiteboard_session_recordings(recording_date DESC);
        """)

        # Add column to whiteboard_sessions for recording status
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            ADD COLUMN IF NOT EXISTS is_recording BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS recording_started_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS has_recordings BOOLEAN DEFAULT false;
        """)

        conn.commit()
        print("SUCCESS: Whiteboard session recordings table created successfully!")
        print("SUCCESS: Added recording status columns to whiteboard_sessions")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Error during migration: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
