"""
Add creator_type column to events and clubs tables
This column distinguishes between 'tutor' and 'admin' creators
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Adding creator_type column to events table...")
        cur.execute("""
            ALTER TABLE events
            ADD COLUMN IF NOT EXISTS creator_type VARCHAR(20) DEFAULT 'tutor';
        """)

        print("Adding creator_type column to clubs table...")
        cur.execute("""
            ALTER TABLE clubs
            ADD COLUMN IF NOT EXISTS creator_type VARCHAR(20) DEFAULT 'tutor';
        """)

        # Update existing records based on manage_uploads table
        print("Updating existing records to mark admin-created events...")
        cur.execute("""
            UPDATE events e
            SET creator_type = 'admin'
            WHERE EXISTS (
                SELECT 1 FROM manage_uploads mu
                WHERE mu.admin_id = e.created_by
            );
        """)

        print("Updating existing records to mark admin-created clubs...")
        cur.execute("""
            UPDATE clubs c
            SET creator_type = 'admin'
            WHERE EXISTS (
                SELECT 1 FROM manage_uploads mu
                WHERE mu.admin_id = c.created_by
            );
        """)

        conn.commit()
        print("✅ Migration completed successfully!")

        # Show stats
        cur.execute("SELECT creator_type, COUNT(*) FROM events GROUP BY creator_type")
        events_stats = cur.fetchall()
        print(f"\nEvents by creator type: {events_stats}")

        cur.execute("SELECT creator_type, COUNT(*) FROM clubs GROUP BY creator_type")
        clubs_stats = cur.fetchall()
        print(f"Clubs by creator type: {clubs_stats}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
