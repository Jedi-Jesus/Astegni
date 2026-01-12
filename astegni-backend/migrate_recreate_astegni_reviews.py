"""
Migration: Drop and recreate astegni_reviews table with clean structure
This removes old columns and creates a fresh table with only the new fields
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def recreate_astegni_reviews_table():
    """Drop old astegni_reviews table and create fresh one with new structure"""

    # Get admin database URL from environment
    ADMIN_DATABASE_URL = os.getenv(
        'ADMIN_DATABASE_URL',
        'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
    )

    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    print('Recreating astegni_reviews table with clean structure...')

    try:
        # Drop the old table (backup data first if needed)
        print('Dropping old astegni_reviews table...')
        cursor.execute("""
            DROP TABLE IF EXISTS astegni_reviews CASCADE;
        """)

        # Create fresh table with only new columns
        print('Creating new astegni_reviews table...')
        cursor.execute("""
            CREATE TABLE astegni_reviews (
                id SERIAL PRIMARY KEY,
                reviewer_id INTEGER NOT NULL,
                reviewer_role VARCHAR(50),

                -- Calculated overall rating (average of 4 categories)
                rating DECIMAL(3, 2),

                -- 4 Required category ratings (1-5)
                ease_of_use INTEGER NOT NULL CHECK (ease_of_use >= 1 AND ease_of_use <= 5),
                features_quality INTEGER NOT NULL CHECK (features_quality >= 1 AND features_quality <= 5),
                support_quality INTEGER NOT NULL CHECK (support_quality >= 1 AND support_quality <= 5),
                overall_value INTEGER NOT NULL CHECK (overall_value >= 1 AND overall_value <= 5),

                -- Optional fields
                review_text TEXT,
                would_recommend BOOLEAN,

                -- Admin fields
                is_featured BOOLEAN DEFAULT FALSE,
                count INTEGER DEFAULT 0,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Ensure one review per user
                CONSTRAINT unique_reviewer UNIQUE (reviewer_id)
            );
        """)

        # Create indexes for performance
        print('Creating indexes...')
        cursor.execute("""
            CREATE INDEX idx_astegni_reviews_reviewer ON astegni_reviews(reviewer_id);
            CREATE INDEX idx_astegni_reviews_rating ON astegni_reviews(rating);
            CREATE INDEX idx_astegni_reviews_created ON astegni_reviews(created_at);
            CREATE INDEX idx_astegni_reviews_featured ON astegni_reviews(is_featured);
        """)

        conn.commit()
        print('astegni_reviews table recreated successfully!')

        # Show new structure
        print('\nNew table structure:')
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'astegni_reviews'
            ORDER BY ordinal_position;
        """)

        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (nullable: {row[2]}, default: {row[3]})")

    except Exception as e:
        print(f'Error recreating table: {str(e)}')
        conn.rollback()
        raise

    finally:
        cursor.close()
        conn.close()
        print('Admin database connection closed')


if __name__ == '__main__':
    print('WARNING: This will DROP the existing astegni_reviews table and ALL data!')
    print('Make sure you have a backup if needed.')
    response = input('Continue? (yes/no): ')

    if response.lower() == 'yes':
        recreate_astegni_reviews_table()
        print('\nMigration completed successfully!')
        print('\nNew table has only the following fields:')
        print('  - id, reviewer_id, reviewer_role')
        print('  - rating (calculated)')
        print('  - ease_of_use, features_quality, support_quality, overall_value (required)')
        print('  - review_text, would_recommend (optional)')
        print('  - is_featured, count, created_at, updated_at (admin)')
    else:
        print('Migration cancelled.')
