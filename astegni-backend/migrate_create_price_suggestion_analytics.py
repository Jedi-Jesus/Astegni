"""
Migration: Create price_suggestion_analytics table
Tracks price suggestions given to tutors and whether they accept them
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        return

    conn = psycopg.connect(database_url)
    try:
        with conn.cursor() as cur:
            print("Creating price_suggestion_analytics table...")

            # Create the analytics table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS price_suggestion_analytics (
                    id SERIAL PRIMARY KEY,
                    tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    suggested_price DECIMAL(10, 2) NOT NULL,
                    market_average DECIMAL(10, 2) NOT NULL,
                    tutor_rating DECIMAL(3, 2),
                    tutor_experience_years INTEGER,
                    tutor_student_count INTEGER,
                    time_period_months INTEGER NOT NULL DEFAULT 3,
                    filters_applied TEXT,
                    accepted BOOLEAN DEFAULT FALSE,
                    accepted_price DECIMAL(10, 2),
                    accepted_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)

            print("Table created successfully")

            # Create indexes for better query performance
            print("Creating indexes...")

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_price_analytics_tutor_id
                ON price_suggestion_analytics(tutor_id);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_price_analytics_user_id
                ON price_suggestion_analytics(user_id);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_price_analytics_created_at
                ON price_suggestion_analytics(created_at DESC);
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_price_analytics_accepted
                ON price_suggestion_analytics(accepted)
                WHERE accepted = TRUE;
            """)

            print("Indexes created successfully")

            conn.commit()
            print("Migration completed successfully!")

            # Show table structure
            print("\nTable Structure:")
            cur.execute("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'price_suggestion_analytics'
                ORDER BY ordinal_position;
            """)

            print("\nColumn Name | Data Type | Nullable | Default")
            print("-" * 80)
            for row in cur.fetchall():
                print(f"{row[0]:25} | {row[1]:15} | {row[2]:8} | {row[3] or 'None'}")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
