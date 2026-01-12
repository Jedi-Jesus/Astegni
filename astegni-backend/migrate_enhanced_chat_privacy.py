"""
Migration: Add enhanced privacy & security settings to chat_settings table
============================================================================
Adds additional privacy controls:
- Last seen visibility (everyone, contacts, nobody)
- Profile photo visibility (everyone, contacts, nobody)
- Screenshot blocking toggle
- Message forwarding restrictions
- Two-step verification status
- Account self-destruct timer
- Session/device tracking

Also creates active_sessions table for device management.

Run this migration to enable enhanced privacy features.
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def run_migration():
    print("=" * 70)
    print("Migration: Enhanced Privacy & Security Settings")
    print("=" * 70)

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    try:
        # Step 1: Add new columns to chat_settings table
        print("\n1. Adding new privacy columns to chat_settings table...")

        new_columns = [
            ("last_seen_visibility", "VARCHAR(20)", "'everyone'"),
            ("profile_photo_visibility", "VARCHAR(20)", "'everyone'"),
            ("about_visibility", "VARCHAR(20)", "'everyone'"),
            ("groups_visibility", "VARCHAR(20)", "'everyone'"),
            ("block_screenshots", "BOOLEAN", "FALSE"),
            ("disable_forwarding", "BOOLEAN", "FALSE"),
            ("two_step_verification", "BOOLEAN", "FALSE"),
            ("two_step_email", "VARCHAR(255)", "NULL"),
            ("two_step_password_hash", "VARCHAR(255)", "NULL"),
            ("account_self_destruct", "VARCHAR(20)", "'never'"),
            ("hide_phone_number", "BOOLEAN", "TRUE"),
            ("hide_email", "BOOLEAN", "FALSE"),
            ("allow_calls_from", "VARCHAR(20)", "'everyone'"),
            ("allow_group_adds", "VARCHAR(20)", "'everyone'"),
            ("allow_channel_adds", "VARCHAR(20)", "'everyone'"),
        ]

        for col_name, col_type, default_val in new_columns:
            cur.execute(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'chat_settings' AND column_name = '{col_name}'
            """)

            if not cur.fetchone():
                cur.execute(f"""
                    ALTER TABLE chat_settings
                    ADD COLUMN {col_name} {col_type} DEFAULT {default_val}
                """)
                print(f"   [OK] Added column: {col_name}")
            else:
                print(f"   [SKIP] Column already exists: {col_name}")

        # Step 2: Create active_sessions table
        print("\n2. Creating active_sessions table...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'chat_active_sessions'
            )
        """)

        if not cur.fetchone()['exists']:
            cur.execute("""
                CREATE TABLE chat_active_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    profile_id INTEGER NOT NULL,
                    profile_type VARCHAR(20) NOT NULL,
                    session_token VARCHAR(255) NOT NULL UNIQUE,
                    device_name VARCHAR(100),
                    device_type VARCHAR(20) DEFAULT 'unknown',
                    browser VARCHAR(100),
                    os VARCHAR(50),
                    ip_address VARCHAR(45),
                    location VARCHAR(100),
                    is_current BOOLEAN DEFAULT FALSE,
                    last_active TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                    CONSTRAINT check_device_type CHECK (
                        device_type IN ('desktop', 'mobile', 'tablet', 'unknown')
                    )
                )
            """)
            print("   [OK] Created chat_active_sessions table")

            # Add indexes
            cur.execute("""
                CREATE INDEX idx_active_sessions_user
                ON chat_active_sessions(user_id, profile_id, profile_type)
            """)
            cur.execute("""
                CREATE INDEX idx_active_sessions_token
                ON chat_active_sessions(session_token)
            """)
            print("   [OK] Added indexes for active_sessions")
        else:
            print("   [SKIP] Table already exists")

        # Step 3: Create blocked_reasons table for detailed block info
        print("\n3. Enhancing blocked_chat_contacts table...")

        # Check if blocked_at column exists (it should from original table)
        cur.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'blocked_chat_contacts' AND column_name = 'block_type'
        """)

        if not cur.fetchone():
            cur.execute("""
                ALTER TABLE blocked_chat_contacts
                ADD COLUMN block_type VARCHAR(20) DEFAULT 'manual'
            """)
            print("   [OK] Added block_type column")
        else:
            print("   [SKIP] block_type column already exists")

        # Step 4: Create privacy_report_logs table
        print("\n4. Creating privacy_report_logs table...")
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'chat_privacy_reports'
            )
        """)

        if not cur.fetchone()['exists']:
            cur.execute("""
                CREATE TABLE chat_privacy_reports (
                    id SERIAL PRIMARY KEY,
                    reporter_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    reporter_profile_id INTEGER NOT NULL,
                    reporter_profile_type VARCHAR(20) NOT NULL,
                    reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    reported_profile_id INTEGER NOT NULL,
                    reported_profile_type VARCHAR(20) NOT NULL,
                    report_type VARCHAR(30) NOT NULL,
                    report_reason TEXT,
                    message_ids INTEGER[],
                    status VARCHAR(20) DEFAULT 'pending',
                    reviewed_by INTEGER REFERENCES users(id),
                    reviewed_at TIMESTAMP WITHOUT TIME ZONE,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                    CONSTRAINT check_report_type CHECK (
                        report_type IN ('spam', 'harassment', 'inappropriate_content', 'impersonation', 'scam', 'other')
                    ),
                    CONSTRAINT check_report_status CHECK (
                        status IN ('pending', 'reviewed', 'action_taken', 'dismissed')
                    )
                )
            """)
            print("   [OK] Created chat_privacy_reports table")

            # Add indexes
            cur.execute("""
                CREATE INDEX idx_privacy_reports_reporter
                ON chat_privacy_reports(reporter_user_id, reporter_profile_id, reporter_profile_type)
            """)
            cur.execute("""
                CREATE INDEX idx_privacy_reports_reported
                ON chat_privacy_reports(reported_user_id, reported_profile_id, reported_profile_type)
            """)
            cur.execute("""
                CREATE INDEX idx_privacy_reports_status
                ON chat_privacy_reports(status)
            """)
            print("   [OK] Added indexes for privacy_reports")
        else:
            print("   [SKIP] Table already exists")

        conn.commit()

        print("\n" + "=" * 70)
        print("Migration completed successfully!")
        print("=" * 70)
        print("\nNew features available:")
        print("  - Last seen visibility control")
        print("  - Profile photo visibility control")
        print("  - Screenshot blocking")
        print("  - Message forwarding restrictions")
        print("  - Two-step verification settings")
        print("  - Account self-destruct timer")
        print("  - Active sessions/device management")
        print("  - Enhanced blocking with block types")
        print("  - Privacy reporting system")
        print("=" * 70)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
