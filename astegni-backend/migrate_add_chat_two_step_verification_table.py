"""
Migration: Create chat_two_step_verification table for optional 2FA feature.

This table stores two-factor authentication settings for enhanced chat security.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("Starting migration: Create chat_two_step_verification table...")

        # Check if table already exists
        cur.execute("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname='public'
            AND tablename='chat_two_step_verification';
        """)

        if cur.fetchone():
            print("  chat_two_step_verification table already exists - skipping")
        else:
            # Create chat_two_step_verification table
            print("  Creating chat_two_step_verification table...")
            cur.execute("""
                CREATE TABLE chat_two_step_verification (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                    is_enabled BOOLEAN DEFAULT FALSE NOT NULL,
                    password_hash VARCHAR(255),
                    recovery_email VARCHAR(255),
                    secret_key VARCHAR(255),
                    backup_codes TEXT[],
                    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
                    last_verified_at TIMESTAMP
                );
            """)
            print("  OK chat_two_step_verification table created")

            # Create index for performance
            print("  Creating index...")
            cur.execute("""
                CREATE INDEX idx_chat_two_step_user
                ON chat_two_step_verification(user_id);
            """)
            print("  OK Index created")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show table structure
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
