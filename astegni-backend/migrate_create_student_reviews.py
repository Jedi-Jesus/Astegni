"""
Migration: Create student_reviews table for storing student reviews from tutors and parents
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def create_student_reviews_table():
    """Create the student_reviews table"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Creating student_reviews table...")

        # Create student_reviews table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS student_reviews (
                id SERIAL PRIMARY KEY,
                student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                reviewer_profile_id INTEGER NOT NULL,
                reviewer_role VARCHAR(50) NOT NULL CHECK (reviewer_role IN ('tutor', 'parent', 'teacher', 'admin')),

                -- Rating categories (1-5 stars for each)
                subject_understanding DECIMAL(2,1) CHECK (subject_understanding >= 1 AND subject_understanding <= 5),
                discipline DECIMAL(2,1) CHECK (discipline >= 1 AND discipline <= 5),
                punctuality DECIMAL(2,1) CHECK (punctuality >= 1 AND punctuality <= 5),
                participation DECIMAL(2,1) CHECK (participation >= 1 AND participation <= 5),
                attendance DECIMAL(2,1) CHECK (attendance >= 1 AND attendance <= 5),

                -- Overall rating (calculated average)
                overall_rating DECIMAL(2,1),

                -- Review content
                review_title VARCHAR(200),
                review_text TEXT NOT NULL,
                review_type VARCHAR(50) CHECK (review_type IN ('positive', 'neutral', 'improvement', 'concern')),

                -- Metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_featured BOOLEAN DEFAULT FALSE,
                helpful_count INTEGER DEFAULT 0
            );
        """)

        # Create indexes for better query performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_reviews_student_id ON student_reviews(student_id);
            CREATE INDEX IF NOT EXISTS idx_student_reviews_reviewer_id ON student_reviews(reviewer_id);
            CREATE INDEX IF NOT EXISTS idx_student_reviews_reviewer_role ON student_reviews(reviewer_role);
            CREATE INDEX IF NOT EXISTS idx_student_reviews_created_at ON student_reviews(created_at DESC);
        """)

        conn.commit()
        print("[SUCCESS] student_reviews table created successfully!")

        # Display table structure
        cur.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'student_reviews'
            ORDER BY ordinal_position;
        """)

        print("\nTable structure:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]} {f'(default: {row[2]})' if row[2] else ''}")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error creating student_reviews table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_student_reviews_table()
