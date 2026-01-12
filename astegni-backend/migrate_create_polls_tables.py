"""
Migration script to create polls tables for chat system.
Run this script to add polls functionality to the database.

Tables created:
- polls: Main poll records
- poll_options: Poll options/choices
- poll_votes: User votes on polls
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

# Convert URL format if needed
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgres://", 1)

def get_connection():
    """Get database connection."""
    return psycopg2.connect(DATABASE_URL)

def create_polls_tables():
    """Create polls-related tables."""

    conn = get_connection()
    cur = conn.cursor()

    try:
        # Create polls table
        print("Creating polls table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS polls (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
                created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_by_profile_id INTEGER,
                created_by_profile_type VARCHAR(50),
                question TEXT NOT NULL,
                multiple_choice BOOLEAN DEFAULT FALSE,
                anonymous BOOLEAN DEFAULT FALSE,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
                end_time TIMESTAMP WITH TIME ZONE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  - polls table created successfully")

        # Create poll_options table
        print("Creating poll_options table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS poll_options (
                id SERIAL PRIMARY KEY,
                poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
                option_text TEXT NOT NULL,
                option_order INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  - poll_options table created successfully")

        # Create poll_votes table
        print("Creating poll_votes table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS poll_votes (
                id SERIAL PRIMARY KEY,
                poll_id INTEGER NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
                option_id INTEGER NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                profile_id INTEGER,
                profile_type VARCHAR(50),
                voted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(poll_id, option_id, profile_id)
            );
        """)
        print("  - poll_votes table created successfully")

        # Create indexes for better performance
        print("Creating indexes...")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_polls_conversation_id ON polls(conversation_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by_user_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_polls_end_time ON polls(end_time);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_poll_votes_profile_id ON poll_votes(profile_id);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);
        """)
        print("  - Indexes created successfully")

        # Create trigger for updating updated_at on polls
        print("Creating update trigger for polls...")
        cur.execute("""
            CREATE OR REPLACE FUNCTION update_polls_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        """)

        cur.execute("""
            DROP TRIGGER IF EXISTS trigger_update_polls_updated_at ON polls;
        """)

        cur.execute("""
            CREATE TRIGGER trigger_update_polls_updated_at
                BEFORE UPDATE ON polls
                FOR EACH ROW
                EXECUTE FUNCTION update_polls_updated_at();
        """)
        print("  - Update trigger created successfully")

        conn.commit()
        print("\n=== All polls tables created successfully! ===\n")

        # Show table info
        print("Tables created:")
        print("  1. polls - Main poll records (question, settings, end time)")
        print("  2. poll_options - Poll options/choices")
        print("  3. poll_votes - User votes on poll options")
        print("\nIndexes created for optimal query performance.")

    except Exception as e:
        conn.rollback()
        print(f"\nError creating tables: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def verify_tables():
    """Verify that tables were created correctly."""
    conn = get_connection()
    cur = conn.cursor()

    try:
        print("\nVerifying tables...")

        tables = ['polls', 'poll_options', 'poll_votes']
        for table in tables:
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = %s
                );
            """, (table,))
            exists = cur.fetchone()[0]
            status = "OK" if exists else "MISSING"
            print(f"  - {table}: {status}")

        print("\nVerification complete!")

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Poll Tables Migration Script")
    print("=" * 50)
    print()

    create_polls_tables()
    verify_tables()
