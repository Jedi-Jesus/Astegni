"""
Migration: Rename session_requests to tutor_session_requests
"""
import psycopg
from dotenv import load_dotenv
import os
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def rename_session_requests_table():
    """Rename session_requests table to tutor_session_requests"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Check if session_requests table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'session_requests'
            );
        """)

        table_exists = cur.fetchone()[0]

        if not table_exists:
            print("⚠️ session_requests table does not exist. Nothing to rename.")
            return

        # Check if tutor_session_requests already exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'tutor_session_requests'
            );
        """)

        new_table_exists = cur.fetchone()[0]

        if new_table_exists:
            print("⚠️ tutor_session_requests table already exists. Skipping rename.")
            return

        # Rename the table
        cur.execute("ALTER TABLE session_requests RENAME TO tutor_session_requests;")
        print("✅ Renamed session_requests to tutor_session_requests")

        # Rename indexes
        cur.execute("""
            ALTER INDEX IF EXISTS idx_session_requests_tutor
            RENAME TO idx_tutor_session_requests_tutor;
        """)
        print("✅ Renamed index idx_session_requests_tutor to idx_tutor_session_requests_tutor")

        cur.execute("""
            ALTER INDEX IF EXISTS idx_session_requests_requester
            RENAME TO idx_tutor_session_requests_requester;
        """)
        print("✅ Renamed index idx_session_requests_requester to idx_tutor_session_requests_requester")

        conn.commit()
        print("\n✅ Migration completed successfully!")

        # Show table structure
        cur.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'tutor_session_requests'
            ORDER BY ordinal_position;
        """)

        print("\n📋 tutor_session_requests table structure:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]}" + (f"({row[2]})" if row[2] else ""))

    except Exception as e:
        conn.rollback()
        print(f"❌ Error renaming session_requests table: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    rename_session_requests_table()
