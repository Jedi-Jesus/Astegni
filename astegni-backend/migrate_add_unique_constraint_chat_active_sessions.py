"""
Migration: Add unique constraint on (user_id, device_name) to chat_active_sessions
to allow ON CONFLICT in status update endpoint.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("Starting migration: Add unique constraint to chat_active_sessions...")

        # Check if constraint already exists
        cur.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'chat_active_sessions'
            AND constraint_name = 'unique_user_device';
        """)

        if cur.fetchone():
            print("  Unique constraint already exists - skipping")
        else:
            # First, clean up any duplicate rows (keep most recent)
            print("  Cleaning up duplicate rows...")
            cur.execute("""
                DELETE FROM chat_active_sessions
                WHERE id NOT IN (
                    SELECT MAX(id)
                    FROM chat_active_sessions
                    GROUP BY user_id, device_name
                );
            """)
            deleted = cur.rowcount
            print(f"  Deleted {deleted} duplicate rows")

            # Add unique constraint
            print("  Adding unique constraint on (user_id, device_name)...")
            cur.execute("""
                ALTER TABLE chat_active_sessions
                ADD CONSTRAINT unique_user_device UNIQUE (user_id, device_name);
            """)
            print("  Unique constraint added successfully")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show constraints
        cur.execute("""
            SELECT constraint_name, constraint_type
            FROM information_schema.table_constraints
            WHERE table_name = 'chat_active_sessions'
            AND constraint_type IN ('UNIQUE', 'PRIMARY KEY')
            ORDER BY constraint_name;
        """)

        print("\nUnique constraints on chat_active_sessions:")
        print("-" * 60)
        for row in cur.fetchall():
            print(f"  {row[0]:50} {row[1]}")

    except Exception as e:
        conn.rollback()
        print(f"\nError during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
