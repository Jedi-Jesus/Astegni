"""
Create Coursework Tables Migration
Creates tables for coursework management system (quizzes, homework, classwork, exams)
This creates the final table structure directly (courseworks instead of quizzes)
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

def create_coursework_tables():
    """Create coursework-related tables"""
    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Creating coursework tables...")

        # Check if tables already exist
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'courseworks'
            )
        """)
        courseworks_exists = cursor.fetchone()[0]

        if courseworks_exists:
            print("Tables already exist. Skipping creation.")
            cursor.close()
            conn.close()
            return

        # 1. Courseworks table - stores coursework metadata
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS courseworks (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                course_name VARCHAR(255) NOT NULL,
                coursework_type VARCHAR(50) NOT NULL, -- 'Class work', 'Home work', 'Practice test', 'Exam'
                time_limit INTEGER NOT NULL, -- in minutes
                days_to_complete INTEGER NOT NULL,
                due_date TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'posted', 'completed', 'graded'
                total_points INTEGER DEFAULT 0,
                scored_points INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                posted_at TIMESTAMP,
                completed_at TIMESTAMP,
                graded_at TIMESTAMP
            );
        """)
        print("Created 'courseworks' table")

        # 2. Coursework questions table - stores individual questions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS coursework_questions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                coursework_id UUID NOT NULL REFERENCES courseworks(id) ON DELETE CASCADE,
                question_number INTEGER NOT NULL,
                question_text TEXT NOT NULL, -- HTML content from Quill editor
                question_type VARCHAR(50) NOT NULL, -- 'multipleChoice', 'trueFalse', 'openEnded'
                choices JSONB, -- Array of choices for multiple choice questions
                correct_answer TEXT, -- Correct answer for MC and T/F
                sample_answer TEXT, -- HTML content for open-ended questions
                points INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(coursework_id, question_number)
            );
        """)
        print("Created 'coursework_questions' table")

        # 3. Coursework answers table - stores student answers
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS coursework_answers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                coursework_id UUID NOT NULL REFERENCES courseworks(id) ON DELETE CASCADE,
                question_id UUID NOT NULL REFERENCES coursework_questions(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                answer_text TEXT, -- Student's answer (text or selected option)
                is_correct BOOLEAN, -- For auto-graded questions
                points_awarded INTEGER DEFAULT 0,
                tutor_feedback TEXT, -- Optional feedback from tutor
                answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                graded_at TIMESTAMP,
                UNIQUE(coursework_id, question_id, student_id)
            );
        """)
        print("Created 'coursework_answers' table")

        # 4. Coursework submissions table - tracks coursework submission status
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS coursework_submissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                coursework_id UUID NOT NULL REFERENCES courseworks(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                started_at TIMESTAMP,
                submitted_at TIMESTAMP,
                time_taken INTEGER, -- in seconds
                status VARCHAR(20) DEFAULT 'not_started', -- 'not_started', 'in_progress', 'submitted', 'graded'
                total_points INTEGER DEFAULT 0,
                scored_points INTEGER DEFAULT 0,
                grade_percentage DECIMAL(5, 2),
                tutor_comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(coursework_id, student_id)
            );
        """)
        print("Created 'coursework_submissions' table")

        # Create indexes for better query performance
        print("\nCreating indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_courseworks_tutor_id ON courseworks(tutor_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_courseworks_student_id ON courseworks(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_courseworks_status ON courseworks(status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_coursework_questions_coursework_id ON coursework_questions(coursework_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_coursework_answers_coursework_id ON coursework_answers(coursework_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_coursework_answers_student_id ON coursework_answers(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_coursework_submissions_coursework_id ON coursework_submissions(coursework_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_coursework_submissions_student_id ON coursework_submissions(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_coursework_submissions_status ON coursework_submissions(status);
        """)

        print("Created all indexes")

        # Commit changes
        conn.commit()

        print("\nCoursework tables created successfully!")
        print("\nTables created:")
        print("  1. courseworks - Coursework metadata and settings")
        print("  2. coursework_questions - Individual coursework questions")
        print("  3. coursework_answers - Student answers to questions")
        print("  4. coursework_submissions - Coursework submission tracking")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\nError creating coursework tables: {e}")
        raise

if __name__ == "__main__":
    create_coursework_tables()
