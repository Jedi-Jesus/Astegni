"""
Migration: Create pinned_messages table for chat message pinning feature.

This table tracks which messages are pinned in group conversations.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    conn = psycopg.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()

    try:
        print("Starting migration: Create pinned_messages table...")

        # Check if table already exists
        cur.execute("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname='public'
            AND tablename='pinned_messages';
        """)

        if cur.fetchone():
            print("  pinned_messages table already exists - skipping")
        else:
            # Create pinned_messages table
            print("  Creating pinned_messages table...")
            cur.execute("""
                CREATE TABLE pinned_messages (
                    id SERIAL PRIMARY KEY,
                    message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                    pinned_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    pinned_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    UNIQUE(message_id, conversation_id)
                );
            """)
            print("  OK pinned_messages table created")

            # Create indexes for performance
            print("  Creating indexes...")
            cur.execute("""
                CREATE INDEX idx_pinned_messages_conversation
                ON pinned_messages(conversation_id);
            """)
            cur.execute("""
                CREATE INDEX idx_pinned_messages_message
                ON pinned_messages(message_id);
            """)
            print("  OK Indexes created")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show table structure
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'pinned_messages'
            ORDER BY ordinal_position;
        """)

        print("\npinned_messages table schema:")
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
