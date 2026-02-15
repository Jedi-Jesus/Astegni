"""
Create user_storage_usage table for tracking user storage consumption
This table tracks total storage used per user across all media types
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def create_user_storage_usage_table():
    """Create user_storage_usage table"""
    print("Creating user_storage_usage table...")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Create user_storage_usage table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_storage_usage (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

            -- Storage usage by media type (in bytes)
            images_size BIGINT DEFAULT 0,
            videos_size BIGINT DEFAULT 0,
            documents_size BIGINT DEFAULT 0,
            audios_size BIGINT DEFAULT 0,

            -- Total storage used (in bytes)
            total_size BIGINT DEFAULT 0,

            -- File counts by type
            images_count INTEGER DEFAULT 0,
            videos_count INTEGER DEFAULT 0,
            documents_count INTEGER DEFAULT 0,
            audios_count INTEGER DEFAULT 0,

            -- Timestamps
            last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            -- Ensure one row per user
            CONSTRAINT unique_user_storage UNIQUE (user_id)
        )
    """)

    # Create index for efficient querying
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_user_storage_usage_user_id
        ON user_storage_usage(user_id);
    """)

    # Create trigger to auto-update updated_at
    cur.execute("""
        CREATE OR REPLACE FUNCTION update_user_storage_usage_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    cur.execute("""
        DROP TRIGGER IF EXISTS trigger_update_user_storage_usage_timestamp
        ON user_storage_usage;
    """)

    cur.execute("""
        CREATE TRIGGER trigger_update_user_storage_usage_timestamp
        BEFORE UPDATE ON user_storage_usage
        FOR EACH ROW
        EXECUTE FUNCTION update_user_storage_usage_timestamp();
    """)

    conn.commit()
    print("SUCCESS: user_storage_usage table created successfully!")

    # Verify table structure
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_storage_usage'
        ORDER BY ordinal_position
    """)

    columns = cur.fetchall()
    print("\nTable structure:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")

    cur.close()
    conn.close()

if __name__ == "__main__":
    create_user_storage_usage_table()
