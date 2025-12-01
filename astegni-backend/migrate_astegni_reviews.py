import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def create_astegni_reviews_table():
    """Create the astegni_reviews table for platform reviews"""

    # Get database URL and convert to psycopg3 format
    db_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

    try:
        # Connect to database
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                # Create astegni_reviews table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS astegni_reviews (
                        id SERIAL PRIMARY KEY,
                        reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        review TEXT NOT NULL,
                        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                        review_type VARCHAR(50) DEFAULT 'platform',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)

                # Create indexes for better performance
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_astegni_reviews_reviewer
                    ON astegni_reviews(reviewer_id);
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_astegni_reviews_rating
                    ON astegni_reviews(rating);
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_astegni_reviews_created
                    ON astegni_reviews(created_at DESC);
                """)

                conn.commit()
                print("SUCCESS: astegni_reviews table created successfully")

                # Display table structure
                cur.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'astegni_reviews'
                    ORDER BY ordinal_position;
                """)

                print("\nTable structure:")
                for row in cur.fetchall():
                    print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")

    except Exception as e:
        print(f"ERROR: Error creating astegni_reviews table: {e}")
        raise

if __name__ == "__main__":
    create_astegni_reviews_table()
