"""
Migration: Create Events and Clubs Tables
Creates tables for events, clubs, and their related junction tables
Any user can create events and clubs
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Create events and clubs tables"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Creating events table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id SERIAL PRIMARY KEY,
                created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                event_picture TEXT,
                title VARCHAR(255) NOT NULL,
                type VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                location VARCHAR(255) NOT NULL,
                is_online BOOLEAN DEFAULT false,
                start_datetime TIMESTAMP NOT NULL,
                end_datetime TIMESTAMP NOT NULL,
                available_seats INTEGER NOT NULL DEFAULT 0,
                registered_count INTEGER DEFAULT 0,
                price DECIMAL(10, 2) DEFAULT 0.00,
                subjects JSONB DEFAULT '[]'::jsonb,
                grade_levels JSONB DEFAULT '[]'::jsonb,
                requirements TEXT,
                status VARCHAR(50) DEFAULT 'upcoming',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_seats CHECK (registered_count <= available_seats),
                CONSTRAINT check_datetime CHECK (end_datetime > start_datetime),
                CONSTRAINT check_status CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled'))
            )
        """)
        print("[OK] events table created")

        print("\nCreating clubs table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS clubs (
                id SERIAL PRIMARY KEY,
                created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                club_picture TEXT,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                description TEXT NOT NULL,
                member_limit INTEGER NOT NULL DEFAULT 0,
                member_count INTEGER DEFAULT 0,
                membership_type VARCHAR(50) DEFAULT 'open',
                is_paid BOOLEAN DEFAULT false,
                membership_fee DECIMAL(10, 2) DEFAULT 0.00,
                subjects JSONB DEFAULT '[]'::jsonb,
                meeting_schedule VARCHAR(255),
                meeting_location VARCHAR(255),
                rules TEXT,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT check_members CHECK (member_count <= member_limit),
                CONSTRAINT check_membership_type CHECK (membership_type IN ('open', 'approval_required', 'invite_only')),
                CONSTRAINT check_status CHECK (status IN ('active', 'inactive', 'archived'))
            )
        """)
        print("[OK] clubs table created")

        print("\nCreating event_registrations table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS event_registrations (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                attendance_status VARCHAR(50) DEFAULT 'registered',
                registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, event_id),
                CONSTRAINT check_attendance_status CHECK (attendance_status IN ('registered', 'attended', 'cancelled', 'no_show'))
            )
        """)
        print("[OK] event_registrations table created")

        print("\nCreating club_memberships table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS club_memberships (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
                role VARCHAR(50) DEFAULT 'member',
                status VARCHAR(50) DEFAULT 'active',
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, club_id),
                CONSTRAINT check_role CHECK (role IN ('member', 'moderator', 'admin')),
                CONSTRAINT check_status CHECK (status IN ('active', 'pending', 'inactive'))
            )
        """)
        print("[OK] club_memberships table created")

        print("\nCreating indexes for performance...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
            CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
            CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
            CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
            CREATE INDEX IF NOT EXISTS idx_clubs_created_by ON clubs(created_by);
            CREATE INDEX IF NOT EXISTS idx_clubs_status ON clubs(status);
            CREATE INDEX IF NOT EXISTS idx_clubs_category ON clubs(category);
            CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);
            CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
            CREATE INDEX IF NOT EXISTS idx_club_memberships_user_id ON club_memberships(user_id);
            CREATE INDEX IF NOT EXISTS idx_club_memberships_club_id ON club_memberships(club_id);
        """)
        print("[OK] Indexes created")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")
        print("\nTables created:")
        print("  - events (any user can create)")
        print("  - clubs (any user can create)")
        print("  - event_registrations (tracks who registered for events)")
        print("  - club_memberships (tracks club members)")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
