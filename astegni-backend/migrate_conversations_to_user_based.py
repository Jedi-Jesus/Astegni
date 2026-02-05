"""
Migration: Add created_by_user_id to conversations table for user-based chat system

This migration adds a new column to support user-based conversations
instead of profile-based ones.
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Starting migration: Add created_by_user_id to conversations table")

        # Check if column already exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'conversations' AND column_name = 'created_by_user_id'
        """)

        if cur.fetchone():
            print("✓ Column 'created_by_user_id' already exists")
        else:
            # Add created_by_user_id column
            print("Adding created_by_user_id column to conversations table...")
            cur.execute("""
                ALTER TABLE conversations
                ADD COLUMN created_by_user_id INTEGER
            """)
            print("✓ Column added successfully")

            # Populate existing data by looking up user_id from profile
            print("Populating existing conversation data...")
            cur.execute("""
                UPDATE conversations c
                SET created_by_user_id = (
                    CASE
                        WHEN c.created_by_profile_type = 'student' THEN (
                            SELECT user_id FROM student_profiles WHERE id = c.created_by_profile_id LIMIT 1
                        )
                        WHEN c.created_by_profile_type = 'tutor' THEN (
                            SELECT user_id FROM tutor_profiles WHERE id = c.created_by_profile_id LIMIT 1
                        )
                        WHEN c.created_by_profile_type = 'parent' THEN (
                            SELECT user_id FROM parent_profiles WHERE id = c.created_by_profile_id LIMIT 1
                        )
                        WHEN c.created_by_profile_type = 'advertiser' THEN (
                            SELECT user_id FROM advertiser_profiles WHERE id = c.created_by_profile_id LIMIT 1
                        )
                        ELSE NULL
                    END
                )
                WHERE created_by_profile_id IS NOT NULL AND created_by_user_id IS NULL
            """)
            rows_updated = cur.rowcount
            print(f"✓ Updated {rows_updated} existing conversations with user IDs")

        # Check conversation_participants structure
        print("\nVerifying conversation_participants has user_id...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'conversation_participants' AND column_name = 'user_id'
        """)

        if cur.fetchone():
            print("✓ conversation_participants already has user_id column")
        else:
            print("⚠ WARNING: conversation_participants missing user_id column!")

        # Make profile columns nullable since we're moving to user-based
        print("\nMaking profile-based columns nullable...")
        cur.execute("""
            ALTER TABLE conversation_participants
            ALTER COLUMN profile_id DROP NOT NULL,
            ALTER COLUMN profile_type DROP NOT NULL
        """)
        print("✓ Profile columns are now nullable")

        cur.execute("""
            ALTER TABLE chat_messages
            ALTER COLUMN sender_profile_id DROP NOT NULL,
            ALTER COLUMN sender_profile_type DROP NOT NULL
        """)
        print("✓ Message sender profile columns are now nullable")

        conn.commit()
        print("\n✅ Migration completed successfully!")

        # Show summary
        cur.execute("SELECT COUNT(*) FROM conversations")
        total_convs = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM conversations WHERE created_by_user_id IS NOT NULL")
        user_based_convs = cur.fetchone()[0]

        print(f"\nSummary:")
        print(f"Total conversations: {total_convs}")
        print(f"User-based conversations: {user_based_convs}")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
