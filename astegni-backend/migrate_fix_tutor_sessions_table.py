"""
Migration: Fix tutor_sessions table and drop tutoring_sessions table

This migration:
1. Adds notification_enabled, alarm_enabled, alarm_before_minutes, and is_featured to tutor_sessions table
2. Drops the unused tutoring_sessions table (fields were mistakenly added there)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def migrate():
    """Add notification and alarm fields to tutor_sessions table and drop tutoring_sessions table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("[*] Starting migration: Fixing tutor_sessions table...")

            # Check if columns already exist in tutor_sessions
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'tutor_sessions'
                AND column_name IN ('notification_enabled', 'alarm_enabled', 'alarm_before_minutes', 'is_featured')
            """)
            existing_columns = [row[0] for row in cur.fetchall()]

            # Add notification_enabled column if it doesn't exist
            if 'notification_enabled' not in existing_columns:
                print("  [+] Adding notification_enabled column to tutor_sessions...")
                cur.execute("""
                    ALTER TABLE tutor_sessions
                    ADD COLUMN notification_enabled BOOLEAN DEFAULT FALSE
                """)
                print("  [OK] notification_enabled column added")
            else:
                print("  [SKIP] notification_enabled column already exists")

            # Add alarm_enabled column if it doesn't exist
            if 'alarm_enabled' not in existing_columns:
                print("  [+] Adding alarm_enabled column to tutor_sessions...")
                cur.execute("""
                    ALTER TABLE tutor_sessions
                    ADD COLUMN alarm_enabled BOOLEAN DEFAULT FALSE
                """)
                print("  [OK] alarm_enabled column added")
            else:
                print("  [SKIP] alarm_enabled column already exists")

            # Add alarm_before_minutes column if it doesn't exist
            if 'alarm_before_minutes' not in existing_columns:
                print("  [+] Adding alarm_before_minutes column to tutor_sessions...")
                cur.execute("""
                    ALTER TABLE tutor_sessions
                    ADD COLUMN alarm_before_minutes INTEGER DEFAULT 15
                """)
                print("  [OK] alarm_before_minutes column added")
            else:
                print("  [SKIP] alarm_before_minutes column already exists")

            # Add is_featured column if it doesn't exist
            if 'is_featured' not in existing_columns:
                print("  [+] Adding is_featured column to tutor_sessions...")
                cur.execute("""
                    ALTER TABLE tutor_sessions
                    ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
                """)
                print("  [OK] is_featured column added")
            else:
                print("  [SKIP] is_featured column already exists")

            # Create index on is_featured for faster queries
            print("  [+] Creating index on is_featured...")
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tutor_sessions_is_featured
                ON tutor_sessions(is_featured)
                WHERE is_featured = TRUE
            """)
            print("  [OK] Index created")

            # Check if tutoring_sessions table exists
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'tutoring_sessions'
                )
            """)
            table_exists = cur.fetchone()[0]

            # Drop tutoring_sessions table if it exists
            if table_exists:
                print("  [+] Dropping unused tutoring_sessions table...")
                cur.execute("DROP TABLE IF EXISTS tutoring_sessions CASCADE")
                print("  [OK] tutoring_sessions table dropped")
            else:
                print("  [SKIP] tutoring_sessions table does not exist")

            conn.commit()
            print("[SUCCESS] Migration completed successfully!")
            print("")
            print("Summary:")
            print("  - Added notification_enabled, alarm_enabled, alarm_before_minutes, is_featured to tutor_sessions")
            print("  - Created index on is_featured for performance")
            print("  - Dropped unused tutoring_sessions table")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
