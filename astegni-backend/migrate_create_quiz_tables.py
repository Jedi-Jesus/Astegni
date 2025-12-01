"""
Create Quiz Tables Migration
Creates tables for quiz management system for tutors and students
"""

import psycopg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def create_quiz_tables():
    """Create quiz-related tables"""
    try:
        # Connect to database
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Creating quiz tables...")

        # 1. Quizzes table - stores quiz metadata
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quizzes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                course_name VARCHAR(255) NOT NULL,
                quiz_type VARCHAR(50) NOT NULL, -- 'Class work', 'Home work', 'Practice test', 'Exam'
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
        print("✓ Created 'quizzes' table")

        # 2. Quiz questions table - stores individual questions
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_questions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                question_number INTEGER NOT NULL,
                question_text TEXT NOT NULL, -- HTML content from Quill editor
                question_type VARCHAR(50) NOT NULL, -- 'multipleChoice', 'trueFalse', 'openEnded'
                choices JSONB, -- Array of choices for multiple choice questions
                correct_answer TEXT, -- Correct answer for MC and T/F
                sample_answer TEXT, -- HTML content for open-ended questions
                points INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(quiz_id, question_number)
            );
        """)
        print("✓ Created 'quiz_questions' table")

        # 3. Quiz answers table - stores student answers
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_answers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
                question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                answer_text TEXT, -- Student's answer (text or selected option)
                is_correct BOOLEAN, -- For auto-graded questions
                points_awarded INTEGER DEFAULT 0,
                tutor_feedback TEXT, -- Optional feedback from tutor
                answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                graded_at TIMESTAMP,
                UNIQUE(quiz_id, question_id, student_id)
            );
        """)
        print("✓ Created 'quiz_answers' table")

        # 4. Quiz submissions table - tracks quiz submission status
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quiz_submissions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
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
                UNIQUE(quiz_id, student_id)
            );
        """)
        print("✓ Created 'quiz_submissions' table")

        # Create indexes for better query performance
        print("\nCreating indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quizzes_tutor_id ON quizzes(tutor_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quizzes_student_id ON quizzes(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quiz_answers_quiz_id ON quiz_answers(quiz_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quiz_answers_student_id ON quiz_answers(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quiz_submissions_quiz_id ON quiz_submissions(quiz_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quiz_submissions_student_id ON quiz_submissions(student_id);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quiz_submissions_status ON quiz_submissions(status);
        """)

        print("✓ Created all indexes")

        # Commit changes
        conn.commit()

        print("\n✅ Quiz tables created successfully!")
        print("\nTables created:")
        print("  1. quizzes - Quiz metadata and settings")
        print("  2. quiz_questions - Individual quiz questions")
        print("  3. quiz_answers - Student answers to questions")
        print("  4. quiz_submissions - Quiz submission tracking")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\n❌ Error creating quiz tables: {e}")
        raise

if __name__ == "__main__":
    create_quiz_tables()
