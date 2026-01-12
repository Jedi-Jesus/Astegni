"""
Add Title Column and Make student_id/course_name Nullable in Courseworks Table
- Adds a title field to allow tutors to name their courseworks
- Makes student_id nullable to support saving drafts without a student
- Makes course_name nullable to support saving drafts without a course
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate_courseworks_table():
    """Add title column and make student_id/course_name nullable"""
    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Migrating courseworks table...")

        # 1. Check if title column already exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'courseworks' AND column_name = 'title'
            )
        """)
        title_exists = cursor.fetchone()[0]

        if not title_exists:
            # Add title column
            cursor.execute("""
                ALTER TABLE courseworks
                ADD COLUMN title VARCHAR(255);
            """)
            print("Added 'title' column to courseworks table")

            # Update existing records to use course_name as title if title is null
            cursor.execute("""
                UPDATE courseworks
                SET title = course_name
                WHERE title IS NULL;
            """)
            updated_count = cursor.rowcount
            print(f"Updated {updated_count} existing records with title from course_name")
        else:
            print("Column 'title' already exists. Skipping.")

        # 2. Make student_id nullable (for drafts)
        cursor.execute("""
            ALTER TABLE courseworks
            ALTER COLUMN student_id DROP NOT NULL;
        """)
        print("Made 'student_id' column nullable (for draft support)")

        # 3. Make course_name nullable (for drafts)
        cursor.execute("""
            ALTER TABLE courseworks
            ALTER COLUMN course_name DROP NOT NULL;
        """)
        print("Made 'course_name' column nullable (for draft support)")

        # Commit changes
        conn.commit()

        print("\nMigration completed successfully!")
        print("Changes made:")
        print("  1. Added 'title' column (VARCHAR 255)")
        print("  2. Made 'student_id' nullable (drafts can be saved without a student)")
        print("  3. Made 'course_name' nullable (drafts can be saved without a course)")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\nError during migration: {e}")
        raise

if __name__ == "__main__":
    migrate_courseworks_table()
