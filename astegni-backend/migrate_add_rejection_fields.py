"""
Migration: Add rejected_reason and rejected_at columns to requested_sessions table

Run: python migrate_add_rejection_fields.py
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
        print("MIGRATION: Add rejected_reason and rejected_at to requested_sessions")
        print("=" * 60)

        # Check if table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'requested_sessions'
            )
        """)
        table_exists = cur.fetchone()[0]

        if not table_exists:
            print("ERROR: Table 'requested_sessions' does not exist.")
            return

        # Check current columns
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
        """)
        existing_columns = [row[0] for row in cur.fetchall()]
        print(f"\nExisting columns: {', '.join(existing_columns)}")

        # Add rejected_reason column if not exists
        if 'rejected_reason' not in existing_columns:
            print("\nAdding rejected_reason column...")
            cur.execute("""
                ALTER TABLE requested_sessions
                ADD COLUMN rejected_reason TEXT
            """)
            conn.commit()
            print("OK - Added rejected_reason column")
        else:
            print("\nSKIP - rejected_reason column already exists")

        # Add rejected_at column if not exists
        if 'rejected_at' not in existing_columns:
            print("\nAdding rejected_at column...")
            cur.execute("""
                ALTER TABLE requested_sessions
                ADD COLUMN rejected_at TIMESTAMP
            """)
            conn.commit()
            print("OK - Added rejected_at column")
        else:
            print("SKIP - rejected_at column already exists")

        # Show updated table structure
        print("\n" + "-" * 40)
        print("Updated table structure:")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            ORDER BY ordinal_position
        """)
        columns = cur.fetchall()
        for col in columns:
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
