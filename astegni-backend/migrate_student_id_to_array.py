"""
Migration: Change student_id to array in whiteboard_session_recordings

Allows recordings to be associated with multiple students (group sessions)
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
    """Change student_id from INTEGER to INTEGER[] array"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("Step 1: Creating temporary array column...")

        # Add new array column
        cursor.execute("""
            ALTER TABLE whiteboard_session_recordings
            ADD COLUMN IF NOT EXISTS student_ids INTEGER[];
        """)

        print("Step 2: Migrating existing data to array format...")

        # Migrate existing single student_id to array
        cursor.execute("""
            UPDATE whiteboard_session_recordings
            SET student_ids = ARRAY[student_id]
            WHERE student_id IS NOT NULL AND student_ids IS NULL;
        """)

        rows_migrated = cursor.rowcount

        print("Step 3: Dropping old student_id column...")

        # Drop foreign key constraint first
        cursor.execute("""
            ALTER TABLE whiteboard_session_recordings
            DROP CONSTRAINT IF EXISTS fk_recording_student;
        """)

        # Drop old column
        cursor.execute("""
            ALTER TABLE whiteboard_session_recordings
            DROP COLUMN IF EXISTS student_id;
        """)

        print("Step 4: Renaming new column...")

        # Rename new column to student_id
        cursor.execute("""
            ALTER TABLE whiteboard_session_recordings
            RENAME COLUMN student_ids TO student_id;
        """)

        print("Step 5: Updating index...")

        # Drop old index
        cursor.execute("""
            DROP INDEX IF EXISTS idx_whiteboard_session_recordings_student_id;
        """)

        # Create GIN index for array searching (more efficient for arrays)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_whiteboard_session_recordings_student_id
            ON whiteboard_session_recordings USING GIN (student_id);
        """)

        print("Step 6: Adding check constraint...")

        # Ensure all elements in array reference valid users
        cursor.execute("""
            ALTER TABLE whiteboard_session_recordings
            ADD CONSTRAINT check_student_ids_not_empty
            CHECK (student_id IS NULL OR array_length(student_id, 1) > 0);
        """)

        conn.commit()
        print("SUCCESS: Migration completed successfully!")
        print(f"  - Migrated {rows_migrated} recordings to array format")
        print(f"  - Changed student_id from INTEGER to INTEGER[]")
        print(f"  - Updated index for array searching")
        print(f"  - Added validation constraint")
        print("\nNOTE: student_id is now an array. Example: [93, 112, 98]")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Error during migration: {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
