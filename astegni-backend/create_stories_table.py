"""
Create stories table for user stories feature
Stories expire after 24 hours (Instagram/WhatsApp style)
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def create_stories_table():
    """Create stories table"""
    print("Creating stories table...")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    # Create stories table
    cur.execute("""
        CREATE TABLE IF NOT EXISTS stories (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            profile_id INTEGER NOT NULL,
            profile_type VARCHAR(20) NOT NULL CHECK (profile_type IN ('tutor', 'student', 'parent', 'advertiser')),
            media_url VARCHAR(500) NOT NULL,
            media_type VARCHAR(10) NOT NULL CHECK (media_type IN ('image', 'video')),
            caption TEXT,
            views INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # Create indexes for efficient querying
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_stories_profile ON stories(profile_id, profile_type);
    """)

    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_stories_active ON stories(is_active, expires_at);
    """)

    conn.commit()
    print("Stories table created successfully!")

    # Verify table structure
    cur.execute("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'stories'
        ORDER BY ordinal_position
    """)

    columns = cur.fetchall()
    print("\nTable structure:")
    for col in columns:
        print(f"  - {col[0]}: {col[1]} (nullable: {col[2]})")

    cur.close()
    conn.close()

if __name__ == "__main__":
    create_stories_table()
