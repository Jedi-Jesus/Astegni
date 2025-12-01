"""
Fix student_reviews table structure
- student_id should reference student_profiles(id) not users(id)
- reviewer_id should reference profile-specific ID (tutor_profiles.id or parent_profiles.id)
- Remove reviewer_profile_id (it's duplicated with reviewer_id)
- reviewer_role still reads from users table
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def fix_student_reviews_structure():
    """Fix the student_reviews table structure"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Fixing student_reviews table structure...")

        # Drop the old table
        cur.execute("DROP TABLE IF EXISTS student_reviews CASCADE;")
        print("  - Dropped old student_reviews table")

        # Create new table with correct structure
        cur.execute("""
            CREATE TABLE student_reviews (
                id SERIAL PRIMARY KEY,

                -- Student being reviewed (from student_profiles)
                student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

                -- Reviewer (profile-specific ID: tutor_profiles.id or parent_profiles.id)
                reviewer_id INTEGER NOT NULL,

                -- Role of the reviewer (to know which profile table reviewer_id references)
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
        print("  - Created new student_reviews table with correct structure")

        # Create indexes
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_student_reviews_student_id ON student_reviews(student_id);
            CREATE INDEX IF NOT EXISTS idx_student_reviews_reviewer_id ON student_reviews(reviewer_id);
            CREATE INDEX IF NOT EXISTS idx_student_reviews_reviewer_role ON student_reviews(reviewer_role);
            CREATE INDEX IF NOT EXISTS idx_student_reviews_created_at ON student_reviews(created_at DESC);
        """)
        print("  - Created indexes")

        conn.commit()
        print("\n[SUCCESS] student_reviews table structure fixed!")

        # Show new structure
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'student_reviews'
            ORDER BY ordinal_position;
        """)

        print("\nNew table structure:")
        for row in cur.fetchall():
            nullable = "NULL" if row[2] == 'YES' else "NOT NULL"
            print(f"  - {row[0]}: {row[1]} ({nullable})")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error fixing table structure: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    fix_student_reviews_structure()
