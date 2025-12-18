"""
Migration: Create chat_settings table for user preferences
==========================================================
Creates a table to store user chat preferences including:
- Privacy settings (who can message, read receipts, online status, typing indicators)
- Notification settings (message notifications, sound alerts, mute duration)
- Appearance settings (bubble style, font size, message density, enter key behavior)
- Media settings (auto-download, image quality)
- Language settings (default translation, auto-translate, TTS voice)

Run this migration to enable the chat settings feature.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def run_migration():
    print("=" * 60)
    print("Migration: Create Chat Settings Table")
    print("=" * 60)

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    try:
        # Check if table exists
        print("\n1. Checking if chat_settings table exists...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'chat_settings'
            )
        """)

        if cur.fetchone()['exists']:
            print("   [OK] Table already exists")
        else:
            print("   Creating chat_settings table...")
            cur.execute("""
                CREATE TABLE chat_settings (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    profile_id INTEGER NOT NULL,
                    profile_type VARCHAR(20) NOT NULL,

                    -- Privacy & Security
                    who_can_message VARCHAR(20) DEFAULT 'everyone',
                    read_receipts BOOLEAN DEFAULT TRUE,
                    online_status BOOLEAN DEFAULT TRUE,
                    typing_indicators BOOLEAN DEFAULT TRUE,

                    -- Notifications
                    message_notifications BOOLEAN DEFAULT TRUE,
                    sound_alerts BOOLEAN DEFAULT TRUE,
                    mute_duration VARCHAR(20) DEFAULT 'off',
                    mute_until TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,

                    -- Appearance
                    bubble_style VARCHAR(20) DEFAULT 'rounded',
                    font_size VARCHAR(20) DEFAULT 'medium',
                    message_density VARCHAR(20) DEFAULT 'comfortable',
                    enter_key VARCHAR(20) DEFAULT 'send',

                    -- Media & Storage
                    auto_download VARCHAR(20) DEFAULT 'wifi',
                    image_quality VARCHAR(20) DEFAULT 'compressed',

                    -- Language & Accessibility
                    default_translation VARCHAR(10) DEFAULT 'none',
                    auto_translate BOOLEAN DEFAULT FALSE,
                    tts_voice VARCHAR(20) DEFAULT 'default',

                    -- Timestamps
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                    -- Unique constraint per user profile
                    UNIQUE(user_id, profile_id, profile_type)
                )
            """)
            print("   [OK] Created chat_settings table")

        # Add index for faster lookups
        print("\n2. Adding indexes...")
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'chat_settings' AND indexname = 'idx_chat_settings_user_profile'
        """)

        if not cur.fetchone():
            cur.execute("""
                CREATE INDEX idx_chat_settings_user_profile
                ON chat_settings(user_id, profile_id, profile_type)
            """)
            print("   [OK] Added user profile index")
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
