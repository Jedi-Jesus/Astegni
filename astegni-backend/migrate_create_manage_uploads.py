"""
Create manage_uploads table
Similar to manage_tutors_profile but for content uploads management
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def create_manage_uploads_table():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Create manage_uploads table (similar to manage_tutors_profile)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS manage_uploads (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                position VARCHAR(255),
                joined_date DATE,
                rating NUMERIC(3, 2) DEFAULT 0.00,
                total_reviews INTEGER DEFAULT 0,
                badges JSONB DEFAULT '[]'::jsonb,

                -- Upload-specific stats (instead of tutor verification stats)
                events_created INTEGER DEFAULT 0,
                clubs_created INTEGER DEFAULT 0,
                events_moderated INTEGER DEFAULT 0,
                clubs_moderated INTEGER DEFAULT 0,

                -- Performance metrics
                avg_moderation_time_hours INTEGER DEFAULT 0,

                -- Permissions
                permissions JSONB DEFAULT '{
                    "can_create_events": true,
                    "can_create_clubs": true,
                    "can_moderate_events": true,
                    "can_moderate_clubs": true,
                    "can_delete_events": false,
                    "can_delete_clubs": false
                }'::jsonb,

                -- Metadata
                username VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create index on admin_id
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_manage_uploads_admin_id
            ON manage_uploads(admin_id);
        """)

        conn.commit()
        print("[OK] manage_uploads table created successfully")

        # Check if table exists
        cur.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_name = 'manage_uploads'
        """)

        if cur.fetchone()[0] > 0:
            print("[OK] Verified: manage_uploads table exists")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error creating manage_uploads table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("Creating manage_uploads table...")
    create_manage_uploads_table()
    print("Done!")
