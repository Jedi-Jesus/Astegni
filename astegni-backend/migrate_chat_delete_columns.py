"""
Migration: Add columns for one-sided chat deletion
==================================================
Adds:
- chat_messages.deleted_for_user_ids (JSONB) - Array of user IDs who have deleted this message
- conversation_participants.chat_cleared_at (TIMESTAMP) - When user last cleared chat history

Run this migration to enable the delete chat feature.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def run_migration():
    print("=" * 60)
    print("Migration: Add Chat Delete Columns")
    print("=" * 60)

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    try:
        # Check and add deleted_for_user_ids to chat_messages
        print("\n1. Checking chat_messages.deleted_for_user_ids...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'chat_messages'
            AND column_name = 'deleted_for_user_ids'
        """)

        if not cur.fetchone():
            print("   Adding deleted_for_user_ids column...")
            cur.execute("""
                ALTER TABLE chat_messages
                ADD COLUMN deleted_for_user_ids JSONB DEFAULT '[]'::jsonb
            """)
            print("   [OK] Added deleted_for_user_ids column")
        else:
            print("   [OK] Column already exists")

        # Check and add chat_cleared_at to conversation_participants
        print("\n2. Checking conversation_participants.chat_cleared_at...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'conversation_participants'
            AND column_name = 'chat_cleared_at'
        """)

        if not cur.fetchone():
            print("   Adding chat_cleared_at column...")
            cur.execute("""
                ALTER TABLE conversation_participants
                ADD COLUMN chat_cleared_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL
            """)
            print("   [OK] Added chat_cleared_at column")
        else:
            print("   [OK] Column already exists")

        # Add index for better query performance
        print("\n3. Adding index for deleted_for_user_ids...")
        cur.execute("""
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'chat_messages'
            AND indexname = 'idx_messages_deleted_for_users'
        """)

        if not cur.fetchone():
            cur.execute("""
                CREATE INDEX idx_messages_deleted_for_users
                ON chat_messages USING GIN (deleted_for_user_ids)
            """)
            print("   [OK] Added GIN index for deleted_for_user_ids")
        else:
            print("   [OK] Index already exists")

        conn.commit()
        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
