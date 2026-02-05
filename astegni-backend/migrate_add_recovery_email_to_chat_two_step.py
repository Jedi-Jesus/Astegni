"""
Migration: Add recovery_email and password_hash columns to chat_two_step_verification table.

These columns are used by the 2FA endpoints but were missing from the initial migration.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("Starting migration: Add recovery_email and password_hash columns...")

        # Check if columns already exist
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'chat_two_step_verification'
            AND column_name IN ('recovery_email', 'password_hash');
        """)

        existing_columns = [row[0] for row in cur.fetchall()]

        # Add password_hash column if it doesn't exist
        if 'password_hash' not in existing_columns:
            print("  Adding password_hash column...")
            cur.execute("""
                ALTER TABLE chat_two_step_verification
                ADD COLUMN password_hash VARCHAR(255);
            """)
            print("  OK password_hash column added")
        else:
            print("  password_hash column already exists - skipping")

        # Add recovery_email column if it doesn't exist
        if 'recovery_email' not in existing_columns:
            print("  Adding recovery_email column...")
            cur.execute("""
                ALTER TABLE chat_two_step_verification
                ADD COLUMN recovery_email VARCHAR(255);
            """)
            print("  OK recovery_email column added")
        else:
            print("  recovery_email column already exists - skipping")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show updated table structure
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'chat_two_step_verification'
            ORDER BY ordinal_position;
        """)

        print("\nchat_two_step_verification table schema:")
        print("-" * 60)
        for row in cur.fetchall():
            col_name, data_type, nullable = row
            nullable_str = "NULL" if nullable == "YES" else "NOT NULL"
            print(f"  {col_name:25} {data_type:20} {nullable_str}")

    except Exception as e:
        conn.rollback()
        print(f"\nError during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
