"""
Migration: Create requested_session_students join table

Supports cost-sharing package requests where one booker books a tutor for
several students (up to the package's max_shared_students). The primary
student stays on requested_sessions.requested_to_id; every student that
shares the session (including the primary) is also recorded here so the
tutor can see the full roster.

Run: python migrate_create_requested_session_students.py
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("MIGRATION: Create requested_session_students")
        print("=" * 60)

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'requested_sessions'
            )
        """)
        if not cur.fetchone()[0]:
            print("ERROR: Table 'requested_sessions' does not exist.")
            return

        cur.execute("""
            CREATE TABLE IF NOT EXISTS requested_session_students (
                id SERIAL PRIMARY KEY,
                requested_session_id INTEGER NOT NULL
                    REFERENCES requested_sessions(id) ON DELETE CASCADE,
                student_profile_id INTEGER NOT NULL,
                -- True when the student is linked to the booker (own profile or
                -- parent/guardian relationship); False when added via DOB check.
                is_related BOOLEAN NOT NULL DEFAULT FALSE,
                -- True when this is the booker's primary student (mirrors
                -- requested_sessions.requested_to_id).
                is_primary BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (requested_session_id, student_profile_id)
            )
        """)
        conn.commit()
        print("OK - Created requested_session_students table")

        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_rss_session
            ON requested_session_students (requested_session_id)
        """)
        conn.commit()
        print("OK - Created index on requested_session_id")

        print("\n" + "-" * 40)
        print("Table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'requested_session_students'
            ORDER BY ordinal_position
        """)
        for col in cur.fetchall():
            print(f"   - {col[0]}: {col[1]} (nullable: {col[2]})")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\nMigration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    migrate()
