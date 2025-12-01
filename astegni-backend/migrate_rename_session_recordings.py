"""
Migration: Rename session_recordings to whiteboard_session_recordings

Renames the table and all related indexes and constraints
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
    """Rename session_recordings table to whiteboard_session_recordings"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if old table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'session_recordings'
            )
        """)

        old_table_exists = cursor.fetchone()[0]

        if not old_table_exists:
            print("INFO: Table 'session_recordings' does not exist. Nothing to rename.")
            print("INFO: If you're setting up a new database, just run migrate_add_session_recordings.py")
            return

        # Check if new table already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'whiteboard_session_recordings'
            )
        """)

        new_table_exists = cursor.fetchone()[0]

        if new_table_exists:
            print("WARNING: Table 'whiteboard_session_recordings' already exists!")
            print("WARNING: Skipping rename to avoid data loss.")
            return

        print("Renaming table session_recordings to whiteboard_session_recordings...")

        # Rename the table
        cursor.execute("""
            ALTER TABLE session_recordings
            RENAME TO whiteboard_session_recordings;
        """)

        print("Renaming indexes...")

        # Rename indexes
        cursor.execute("""
            ALTER INDEX IF EXISTS idx_session_recordings_session_id
            RENAME TO idx_whiteboard_session_recordings_session_id;
        """)

        cursor.execute("""
            ALTER INDEX IF EXISTS idx_session_recordings_date
            RENAME TO idx_whiteboard_session_recordings_date;
        """)

        # Rename sequence (auto-increment primary key)
        cursor.execute("""
            ALTER SEQUENCE IF EXISTS session_recordings_id_seq
            RENAME TO whiteboard_session_recordings_id_seq;
        """)

        conn.commit()
        print("SUCCESS: Table renamed successfully!")
        print("Old name: session_recordings")
        print("New name: whiteboard_session_recordings")
        print("All indexes and sequences renamed")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Error during migration: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
