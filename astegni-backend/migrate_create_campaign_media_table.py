"""
Migration: Create campaign_media table

This table stores all media files (images/videos) uploaded for campaigns.
Each media item is linked to a campaign and has placement information.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def migrate():
    """Create campaign_media table"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Creating campaign_media table...")

        # Create table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_media (
                id SERIAL PRIMARY KEY,
                campaign_id INTEGER NOT NULL,
                brand_id INTEGER NOT NULL,
                advertiser_id INTEGER NOT NULL,
                media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
                file_url VARCHAR(500) NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_size BIGINT,
                placement VARCHAR(50) NOT NULL,
                content_type VARCHAR(100),
                folder_path VARCHAR(500),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                -- Foreign key constraint (if you have campaign_profile table)
                CONSTRAINT fk_campaign FOREIGN KEY (campaign_id)
                    REFERENCES campaign_profile(id) ON DELETE CASCADE
            );
        """)

        # Create indexes for faster queries
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_media_campaign_id
            ON campaign_media(campaign_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_media_brand_id
            ON campaign_media(brand_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_media_advertiser_id
            ON campaign_media(advertiser_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_media_placement
            ON campaign_media(placement);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_media_media_type
            ON campaign_media(media_type);
        """)

        # Create trigger to update updated_at timestamp
        cursor.execute("""
            CREATE OR REPLACE FUNCTION update_campaign_media_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """)

        cursor.execute("""
            DROP TRIGGER IF EXISTS trigger_update_campaign_media_updated_at
            ON campaign_media;
        """)

        cursor.execute("""
            CREATE TRIGGER trigger_update_campaign_media_updated_at
            BEFORE UPDATE ON campaign_media
            FOR EACH ROW
            EXECUTE FUNCTION update_campaign_media_updated_at();
        """)

        conn.commit()
        print("SUCCESS: Created campaign_media table with indexes and triggers!")

        # Verify table creation
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'campaign_media'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()

        print("\nTable structure:")
        for col, dtype in columns:
            print(f"  - {col}: {dtype}")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
