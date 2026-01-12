"""
Migration: Create astegni_reviews table in admin database
Purpose: Store user reviews and ratings for the Astegni platform
"""

import psycopg
from config import ADMIN_DATABASE_URL

def create_astegni_reviews_table():
    """Create astegni_reviews table in admin database"""

    # Convert URL format from sqlalchemy to psycopg3
    db_url = ADMIN_DATABASE_URL.replace('postgresql://', '').replace('postgresql+psycopg://', '')

    conn = psycopg.connect(f'postgresql://{db_url}')
    cursor = conn.cursor()

    print('🔵 Creating astegni_reviews table in admin database...')

    # Create astegni_reviews table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS astegni_reviews (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            user_role VARCHAR(50),
            user_name VARCHAR(255),
            user_email VARCHAR(255),

            -- Overall rating (required)
            overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),

            -- Category ratings (optional)
            ease_of_use_rating INTEGER CHECK (ease_of_use_rating >= 1 AND ease_of_use_rating <= 5),
            features_rating INTEGER CHECK (features_rating >= 1 AND features_rating <= 5),
            support_rating INTEGER CHECK (support_rating >= 1 AND support_rating <= 5),
            value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),

            -- Review text
            review_text TEXT,

            -- Feature suggestions (JSON array)
            feature_suggestions JSON DEFAULT '[]',

            -- Recommendation
            would_recommend BOOLEAN,

            -- Status and moderation
            status VARCHAR(50) DEFAULT 'pending',
            is_visible BOOLEAN DEFAULT FALSE,
            is_featured BOOLEAN DEFAULT FALSE,

            -- Admin response
            admin_response TEXT,
            responded_by INTEGER,
            responded_at TIMESTAMP,

            -- Metadata
            platform VARCHAR(50),
            device_info VARCHAR(255),
            ip_address VARCHAR(45),

            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Create indexes
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_astegni_reviews_user_id ON astegni_reviews(user_id);
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_astegni_reviews_overall_rating ON astegni_reviews(overall_rating);
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_astegni_reviews_status ON astegni_reviews(status);
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_astegni_reviews_created_at ON astegni_reviews(created_at DESC);
    """)

    conn.commit()
    print('✅ astegni_reviews table created successfully with indexes!')

    cursor.close()
    conn.close()
    print('✅ Admin database connection closed')


if __name__ == '__main__':
    create_astegni_reviews_table()
    print('\n🎉 Migration completed successfully!')
