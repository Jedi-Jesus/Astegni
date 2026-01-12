"""
Migration script to create advertiser_profiles and ad_campaigns tables
Run this script to add advertiser functionality to the database
"""

import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from config import DATABASE_URL

def run_migration():
    """Create advertiser_profiles and ad_campaigns tables"""
    print("Starting advertiser tables migration...")

    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        try:
            # Create advertiser_profiles table
            print("Creating advertiser_profiles table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS advertiser_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    username VARCHAR UNIQUE,
                    company_name VARCHAR NOT NULL,
                    bio TEXT,
                    quote TEXT,
                    location VARCHAR,
                    website VARCHAR,
                    industry VARCHAR,
                    company_size VARCHAR,
                    profile_picture VARCHAR,
                    cover_image VARCHAR,
                    logo VARCHAR,
                    total_campaigns INTEGER DEFAULT 0,
                    active_campaigns INTEGER DEFAULT 0,
                    total_impressions INTEGER DEFAULT 0,
                    total_clicks INTEGER DEFAULT 0,
                    total_conversions INTEGER DEFAULT 0,
                    total_likes INTEGER DEFAULT 0,
                    total_followers INTEGER DEFAULT 0,
                    total_spent FLOAT DEFAULT 0.0,
                    average_ctr FLOAT DEFAULT 0.0,
                    average_conversion_rate FLOAT DEFAULT 0.0,
                    success_rate FLOAT DEFAULT 0.0,
                    rating FLOAT DEFAULT 0.0,
                    rating_count INTEGER DEFAULT 0,
                    is_verified BOOLEAN DEFAULT FALSE,
                    is_premium BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,
                    profile_complete BOOLEAN DEFAULT FALSE,
                    profile_completion FLOAT DEFAULT 0.0,
                    total_budget FLOAT DEFAULT 0.0,
                    available_budget FLOAT DEFAULT 0.0,
                    currency VARCHAR DEFAULT 'ETB',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            print("✓ advertiser_profiles table created successfully")

            # Create ad_campaigns table
            print("Creating ad_campaigns table...")
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS ad_campaigns (
                    id SERIAL PRIMARY KEY,
                    advertiser_id INTEGER NOT NULL REFERENCES advertiser_profiles(id) ON DELETE CASCADE,
                    name VARCHAR NOT NULL,
                    description TEXT,
                    objective VARCHAR,
                    status VARCHAR DEFAULT 'draft',
                    budget FLOAT NOT NULL,
                    spent FLOAT DEFAULT 0.0,
                    campaign_budget FLOAT,
                    currency VARCHAR DEFAULT 'ETB',
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    target_audience JSONB DEFAULT '{}'::jsonb,
                    age_range JSONB DEFAULT '{}'::jsonb,
                    locations JSONB DEFAULT '[]'::jsonb,
                    impressions INTEGER DEFAULT 0,
                    clicks INTEGER DEFAULT 0,
                    conversions INTEGER DEFAULT 0,
                    likes INTEGER DEFAULT 0,
                    shares INTEGER DEFAULT 0,
                    comments INTEGER DEFAULT 0,
                    followers INTEGER DEFAULT 0,
                    ctr FLOAT DEFAULT 0.0,
                    conversion_rate FLOAT DEFAULT 0.0,
                    cost_per_click FLOAT DEFAULT 0.0,
                    cost_per_conversion FLOAT DEFAULT 0.0,
                    engagement_rate FLOAT DEFAULT 0.0,
                    ad_type VARCHAR,
                    creative_urls JSONB DEFAULT '[]'::jsonb,
                    ad_copy TEXT,
                    call_to_action VARCHAR,
                    landing_page_url VARCHAR,
                    performance VARCHAR DEFAULT 'pending',
                    platforms JSONB DEFAULT '[]'::jsonb,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_activity TIMESTAMP
                );
            """))
            print("✓ ad_campaigns table created successfully")

            # Create indexes for better performance
            print("Creating indexes...")
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_user_id
                ON advertiser_profiles(user_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_username
                ON advertiser_profiles(username);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser_id
                ON ad_campaigns(advertiser_id);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status
                ON ad_campaigns(status);
            """))
            conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates
                ON ad_campaigns(start_date, end_date);
            """))
            print("✓ Indexes created successfully")

            conn.commit()
            print("\n✅ Migration completed successfully!")
            print("Advertiser tables are now ready to use.")

        except OperationalError as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()
            sys.exit(1)
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            conn.rollback()
            sys.exit(1)

if __name__ == "__main__":
    run_migration()
