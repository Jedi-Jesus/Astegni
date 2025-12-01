"""
Migrate Quiz Tables to Coursework Tables
Renames all quiz-related tables to coursework and adds coursework_type field
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

def migrate_quiz_to_coursework():
    """Rename quiz tables to coursework and add coursework_type column"""
    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Migrating quiz tables to coursework tables...")
        print("=" * 60)

        # Step 1: Rename tables
        print("\n1. Renaming tables...")

        cursor.execute("""
            ALTER TABLE IF EXISTS quiz_submissions RENAME TO coursework_submissions;
        """)
        print("✓ Renamed quiz_submissions → coursework_submissions")

        cursor.execute("""
            ALTER TABLE IF EXISTS quiz_answers RENAME TO coursework_answers;
        """)
        print("✓ Renamed quiz_answers → coursework_answers")

        cursor.execute("""
            ALTER TABLE IF EXISTS quiz_questions RENAME TO coursework_questions;
        """)
        print("✓ Renamed quiz_questions → coursework_questions")

        cursor.execute("""
            ALTER TABLE IF EXISTS quizzes RENAME TO courseworks;
        """)
        print("✓ Renamed quizzes → courseworks")

        # Step 2: Update foreign key constraint names (if needed for clarity)
        print("\n2. Updating constraint references...")

        # Update foreign key column name in coursework_questions
        cursor.execute("""
            ALTER TABLE coursework_questions
            RENAME COLUMN quiz_id TO coursework_id;
        """)
        print("✓ Renamed quiz_id → coursework_id in coursework_questions")

        # Update foreign key column name in coursework_answers
        cursor.execute("""
            ALTER TABLE coursework_answers
            RENAME COLUMN quiz_id TO coursework_id;
        """)
        print("✓ Renamed quiz_id → coursework_id in coursework_answers")

        # Update foreign key column name in coursework_submissions
        cursor.execute("""
            ALTER TABLE coursework_submissions
            RENAME COLUMN quiz_id TO coursework_id;
        """)
        print("✓ Renamed quiz_id → coursework_id in coursework_submissions")

        # Step 3: Rename quiz_type to coursework_type in courseworks table
        print("\n3. Renaming quiz_type to coursework_type...")

        cursor.execute("""
            ALTER TABLE courseworks
            RENAME COLUMN quiz_type TO coursework_type;
        """)
        print("✓ Renamed quiz_type → coursework_type in courseworks")

        # Step 4: Update indexes
        print("\n4. Renaming indexes...")

        # Drop old indexes and create new ones with correct names
        cursor.execute("""
            DROP INDEX IF EXISTS idx_quizzes_tutor_id;
            CREATE INDEX IF NOT EXISTS idx_courseworks_tutor_id ON courseworks(tutor_id);
        """)
        print("✓ Updated index: idx_courseworks_tutor_id")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quizzes_student_id;
            CREATE INDEX IF NOT EXISTS idx_courseworks_student_id ON courseworks(student_id);
        """)
        print("✓ Updated index: idx_courseworks_student_id")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quizzes_status;
            CREATE INDEX IF NOT EXISTS idx_courseworks_status ON courseworks(status);
        """)
        print("✓ Updated index: idx_courseworks_status")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quiz_questions_quiz_id;
            CREATE INDEX IF NOT EXISTS idx_coursework_questions_coursework_id ON coursework_questions(coursework_id);
        """)
        print("✓ Updated index: idx_coursework_questions_coursework_id")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quiz_answers_quiz_id;
            CREATE INDEX IF NOT EXISTS idx_coursework_answers_coursework_id ON coursework_answers(coursework_id);
        """)
        print("✓ Updated index: idx_coursework_answers_coursework_id")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quiz_answers_student_id;
            CREATE INDEX IF NOT EXISTS idx_coursework_answers_student_id ON coursework_answers(student_id);
        """)
        print("✓ Updated index: idx_coursework_answers_student_id")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quiz_submissions_quiz_id;
            CREATE INDEX IF NOT EXISTS idx_coursework_submissions_coursework_id ON coursework_submissions(coursework_id);
        """)
        print("✓ Updated index: idx_coursework_submissions_coursework_id")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quiz_submissions_student_id;
            CREATE INDEX IF NOT EXISTS idx_coursework_submissions_student_id ON coursework_submissions(student_id);
        """)
        print("✓ Updated index: idx_coursework_submissions_student_id")

        cursor.execute("""
            DROP INDEX IF EXISTS idx_quiz_submissions_status;
            CREATE INDEX IF NOT EXISTS idx_coursework_submissions_status ON coursework_submissions(status);
        """)
        print("✓ Updated index: idx_coursework_submissions_status")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("\nTables renamed:")
        print("  • quizzes → courseworks")
        print("  • quiz_questions → coursework_questions")
        print("  • quiz_answers → coursework_answers")
        print("  • quiz_submissions → coursework_submissions")
        print("\nColumns renamed:")
        print("  • quiz_id → coursework_id (in all child tables)")
        print("  • quiz_type → coursework_type (in courseworks table)")
        print("\nAll indexes updated to reflect new names")
        print("=" * 60)

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        raise

if __name__ == "__main__":
    migrate_quiz_to_coursework()
