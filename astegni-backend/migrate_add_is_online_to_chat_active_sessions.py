"""
Migration: Add is_online column to chat_active_sessions table
and rename last_active to last_active_at for consistency.

This migration:
1. Adds is_online BOOLEAN column (defaults to TRUE)
2. Renames last_active to last_active_at
3. Keeps is_current for backward compatibility (session validity)
4. is_online = user's online/offline status (updated via heartbeat)
5. is_current = whether this is the active session (browser tab)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("Starting migration: Add is_online to chat_active_sessions...")

        # Check if is_online already exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'chat_active_sessions'
            AND column_name = 'is_online';
        """)

        if cur.fetchone():
            print("  is_online column already exists - skipping")
        else:
            # Add is_online column
            print("  Adding is_online column...")
            cur.execute("""
                ALTER TABLE chat_active_sessions
                ADD COLUMN is_online BOOLEAN DEFAULT TRUE NOT NULL;
            """)
            print("  is_online column added")

        # Check if last_active_at already exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'chat_active_sessions'
            AND column_name = 'last_active_at';
        """)

        if cur.fetchone():
            print("  last_active_at column already exists - skipping rename")
        else:
            # Rename last_active to last_active_at
            print("  Renaming last_active to last_active_at...")
            cur.execute("""
                ALTER TABLE chat_active_sessions
                RENAME COLUMN last_active TO last_active_at;
            """)
            print("  Column renamed")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show updated schema
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'chat_active_sessions'
            ORDER BY ordinal_position;
        """)

        print("\nUpdated chat_active_sessions schema:")
        print("-" * 80)
        for row in cur.fetchall():
            col_name, data_type, nullable, default = row
            nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
            default_str = f" DEFAULT {default}" if default else ""
            print(f"  {col_name:20} {data_type:20} {nullable_str:10}{default_str}")

    except Exception as e:
        conn.rollback()
        print(f"\nError during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
