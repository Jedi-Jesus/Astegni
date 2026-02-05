"""
Migration: Make profile_id and profile_type nullable in chat_active_sessions.

The chat system is now user-based, so profile_id and profile_type are optional
for backward compatibility but not required for new user-based sessions.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("Starting migration: Make profile fields nullable in chat_active_sessions...")

        # Make profile_id nullable
        print("  Making profile_id nullable...")
        cur.execute("""
            ALTER TABLE chat_active_sessions
            ALTER COLUMN profile_id DROP NOT NULL;
        """)
        print("  profile_id is now nullable")

        # Make profile_type nullable
        print("  Making profile_type nullable...")
        cur.execute("""
            ALTER TABLE chat_active_sessions
            ALTER COLUMN profile_type DROP NOT NULL;
        """)
        print("  profile_type is now nullable")

        # Make session_token nullable (not always needed for status tracking)
        print("  Making session_token nullable...")
        cur.execute("""
            ALTER TABLE chat_active_sessions
            ALTER COLUMN session_token DROP NOT NULL;
        """)
        print("  session_token is now nullable")

        # Drop unique constraint on session_token (can be null for multiple rows)
        print("  Dropping unique constraint on session_token...")
        cur.execute("""
            ALTER TABLE chat_active_sessions
            DROP CONSTRAINT IF EXISTS chat_active_sessions_session_token_key;
        """)
        print("  Unique constraint dropped")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show updated schema
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'chat_active_sessions'
            ORDER BY ordinal_position;
        """)

        print("\nUpdated chat_active_sessions schema:")
        print("-" * 60)
        for row in cur.fetchall():
            col_name, data_type, nullable = row
            nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
            print(f"  {col_name:20} {data_type:25} {nullable_str}")

    except Exception as e:
        conn.rollback()
        print(f"\nError during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
