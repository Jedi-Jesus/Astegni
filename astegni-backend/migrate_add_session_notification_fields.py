"""
Migration: Add notification, alarm, and is_featured fields to tutoring_sessions table
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
    """Add notification_enabled, alarm_enabled, alarm_before_minutes, and is_featured columns to tutoring_sessions table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("[*] Starting migration: Adding notification and alarm fields to tutoring_sessions...")

            # Check if columns already exist
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'tutoring_sessions'
                AND column_name IN ('notification_enabled', 'alarm_enabled', 'alarm_before_minutes', 'is_featured')
            """)
            existing_columns = [row[0] for row in cur.fetchall()]

            # Add notification_enabled column if it doesn't exist
            if 'notification_enabled' not in existing_columns:
                print("  [+] Adding notification_enabled column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN notification_enabled BOOLEAN DEFAULT FALSE
                """)
                print("  [OK] notification_enabled column added")
            else:
                print("  [SKIP] notification_enabled column already exists")

            # Add alarm_enabled column if it doesn't exist
            if 'alarm_enabled' not in existing_columns:
                print("  [+] Adding alarm_enabled column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN alarm_enabled BOOLEAN DEFAULT FALSE
                """)
                print("  [OK] alarm_enabled column added")
            else:
                print("  [SKIP] alarm_enabled column already exists")

            # Add alarm_before_minutes column if it doesn't exist
            if 'alarm_before_minutes' not in existing_columns:
                print("  [+] Adding alarm_before_minutes column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN alarm_before_minutes INTEGER DEFAULT 15
                """)
                print("  [OK] alarm_before_minutes column added")
            else:
                print("  [SKIP] alarm_before_minutes column already exists")

            # Add is_featured column if it doesn't exist
            if 'is_featured' not in existing_columns:
                print("  [+] Adding is_featured column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN is_featured BOOLEAN DEFAULT FALSE
                """)
                print("  [OK] is_featured column added")
            else:
                print("  [SKIP] is_featured column already exists")

            # Create index on is_featured for faster queries
            print("  [+] Creating index on is_featured...")
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_is_featured
                ON tutoring_sessions(is_featured)
                WHERE is_featured = TRUE
            """)
            print("  [OK] Index created")

            conn.commit()
            print("[SUCCESS] Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
