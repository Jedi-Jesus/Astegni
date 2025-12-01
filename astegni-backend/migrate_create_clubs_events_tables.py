"""
Migration: Create clubs and events tables for student activities
"""

import psycopg
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def create_clubs_events_tables():
    """Create clubs and events tables"""

    # Convert postgresql:// to postgresql+psycopg:// if needed
    db_url = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://')

    # For psycopg (not psycopg3), we need the original format
    db_url = DATABASE_URL

    conn = psycopg.connect(db_url)
    cursor = conn.cursor()

    try:
        print("Creating clubs and events tables...")

        # Create clubs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS clubs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                created_by INTEGER REFERENCES users(id),
                club_image VARCHAR(500),
                member_count INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                meeting_schedule VARCHAR(200),
                location VARCHAR(200),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] Created clubs table")

        # Create club_members table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS club_members (
                id SERIAL PRIMARY KEY,
                club_id INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'member',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(club_id, user_id)
            )
        """)
        print("[OK] Created club_members table")

        # Create events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                event_type VARCHAR(100),
                event_date TIMESTAMP NOT NULL,
                location VARCHAR(200),
                organizer_id INTEGER REFERENCES users(id),
                event_image VARCHAR(500),
                attendee_count INTEGER DEFAULT 0,
                max_attendees INTEGER,
                is_active BOOLEAN DEFAULT true,
                registration_deadline TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("[OK] Created events table")

        # Create event_attendees table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS event_attendees (
                id SERIAL PRIMARY KEY,
                event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(50) DEFAULT 'registered',
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, user_id)
            )
        """)
        print("[OK] Created event_attendees table")

        # Create indexes for better performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_clubs_created_by ON clubs(created_by);
            CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
            CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
            CREATE INDEX IF NOT EXISTS idx_events_organizer_id ON events(organizer_id);
            CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
            CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);
            CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
        """)
        print("[OK] Created indexes")

        conn.commit()
        print("\n[SUCCESS] Successfully created all clubs and events tables!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error creating tables: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    create_clubs_events_tables()
