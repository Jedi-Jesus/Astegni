"""
Migration: Change student_id to array in whiteboard_sessions

Allows sessions to support multiple students (group sessions)
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
    """Change student_id from INTEGER to INTEGER[] array in whiteboard_sessions"""

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("Step 1: Creating temporary array column for whiteboard_sessions...")

        # Add new array column
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            ADD COLUMN IF NOT EXISTS student_ids INTEGER[];
        """)

        print("Step 2: Migrating existing data to array format...")

        # Migrate existing single student_id to array
        cursor.execute("""
            UPDATE whiteboard_sessions
            SET student_ids = ARRAY[student_id]
            WHERE student_id IS NOT NULL AND student_ids IS NULL;
        """)

        rows_migrated = cursor.rowcount

        print("Step 3: Dropping old student_id column...")

        # Drop old column (no FK constraints to worry about)
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            DROP COLUMN IF EXISTS student_id;
        """)

        print("Step 4: Renaming new column...")

        # Rename new column to student_id
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            RENAME COLUMN student_ids TO student_id;
        """)

        print("Step 5: Creating GIN index for array searching...")

        # Create GIN index for efficient array searching
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_whiteboard_sessions_student_id
            ON whiteboard_sessions USING GIN (student_id);
        """)

        print("Step 6: Adding validation constraint...")

        # Ensure all elements in array reference valid users
        cursor.execute("""
            ALTER TABLE whiteboard_sessions
            ADD CONSTRAINT check_student_ids_not_empty
            CHECK (student_id IS NULL OR array_length(student_id, 1) > 0);
        """)

        print("Step 7: Updating whiteboard_session_recordings with all students from sessions...")

        # Update recordings to include all students from their sessions
        cursor.execute("""
            UPDATE whiteboard_session_recordings r
            SET student_id = s.student_id
            FROM whiteboard_sessions s
            WHERE r.session_id = s.id;
        """)

        recordings_updated = cursor.rowcount

        conn.commit()
        print("SUCCESS: Migration completed successfully!")
        print(f"  - Migrated {rows_migrated} sessions to array format")
        print(f"  - Changed student_id from INTEGER to INTEGER[]")
        print(f"  - Created GIN index for array searching")
        print(f"  - Updated {recordings_updated} recordings with session student arrays")
        print(f"  - Added validation constraint")
        print("\nNOTE: student_id in whiteboard_sessions is now an array. Example: [93, 112, 98]")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
