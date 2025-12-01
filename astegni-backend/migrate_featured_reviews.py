import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def create_featured_reviews_table():
    """Create the featured_reviews table for showcasing reviews on pages"""

    db_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                # Create featured_reviews table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS featured_reviews (
                        id SERIAL PRIMARY KEY,
                        review_id INTEGER NOT NULL REFERENCES astegni_reviews(id) ON DELETE CASCADE,
                        display_location VARCHAR(100) DEFAULT 'all',
                        display_order INTEGER DEFAULT 0,
                        is_active BOOLEAN DEFAULT true,
                        featured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        featured_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                        UNIQUE(review_id, display_location)
                    );
                """)

                # Create indexes
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_featured_reviews_location
                    ON featured_reviews(display_location);
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_featured_reviews_active
                    ON featured_reviews(is_active);
                """)

                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_featured_reviews_order
                    ON featured_reviews(display_order);
                """)

                conn.commit()
                print("SUCCESS: featured_reviews table created successfully")

                # Display table structure
                cur.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'featured_reviews'
                    ORDER BY ordinal_position;
                """)

                print("\nTable structure:")
                for row in cur.fetchall():
                    print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")

    except Exception as e:
        print(f"ERROR: Error creating featured_reviews table: {e}")
        raise

if __name__ == "__main__":
    create_featured_reviews_table()
