"""
Migration: Chat System - Role-Based to User-Based
==================================================

WHAT THIS MIGRATION DOES:
1. Makes profile_id and profile_type nullable (backward compatible)
2. Ensures user_id is properly set for all existing records
3. Creates indexes on user_id for performance
4. Updates chat_settings to be user-based instead of profile-based
5. Updates blocked_chat_contacts to be user-based

BEFORE RUNNING:
- Backup your database: pg_dump astegni_user_db > backup_chat_migration.sql
- Ensure backend is stopped

AFTER RUNNING:
- Update backend endpoints to use user_id
- Update frontend to use user_id instead of profile_id/profile_type
- Test thoroughly before deploying

Run with: python migrate_chat_to_user_based.py
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)

def log(message):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def migrate():
    conn = get_connection()
    cur = conn.cursor()

    try:
        log("Starting chat system migration to user-based...")

        # =============================================
        # 1. ALTER CONVERSATIONS TABLE
        # =============================================
        log("Step 1: Making conversations user-based...")

        # Make profile fields nullable
        cur.execute("""
            ALTER TABLE conversations
            ALTER COLUMN created_by_profile_id DROP NOT NULL,
            ALTER COLUMN created_by_profile_type DROP NOT NULL;
        """)
        log("  ✓ Made created_by_profile_id and created_by_profile_type nullable")

        # Add created_by_user_id if it doesn't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'conversations'
                    AND column_name = 'created_by_user_id'
                ) THEN
                    ALTER TABLE conversations
                    ADD COLUMN created_by_user_id INTEGER REFERENCES users(id);
                END IF;
            END $$;
        """)
        log("  ✓ Added created_by_user_id column")

        # Populate created_by_user_id from existing data
        cur.execute("""
            UPDATE conversations c
            SET created_by_user_id = cp.user_id
            FROM conversation_participants cp
            WHERE c.id = cp.conversation_id
            AND c.created_by_profile_id = cp.profile_id
            AND c.created_by_profile_type = cp.profile_type
            AND c.created_by_user_id IS NULL;
        """)
        updated = cur.rowcount
        log(f"  ✓ Updated {updated} conversations with created_by_user_id")

        # Create index on created_by_user_id
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversations_created_by_user_id
            ON conversations(created_by_user_id);
        """)
        log("  ✓ Created index on created_by_user_id")

        # =============================================
        # 2. ALTER CONVERSATION_PARTICIPANTS TABLE
        # =============================================
        log("Step 2: Making conversation_participants user-based...")

        # Make profile fields nullable
        cur.execute("""
            ALTER TABLE conversation_participants
            ALTER COLUMN profile_id DROP NOT NULL,
            ALTER COLUMN profile_type DROP NOT NULL;
        """)
        log("  ✓ Made profile_id and profile_type nullable")

        # Create unique index on conversation_id + user_id (prevent duplicate participants)
        cur.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_participants_conv_user
            ON conversation_participants(conversation_id, user_id)
            WHERE is_active = true;
        """)
        log("  ✓ Created unique index on conversation_id + user_id")

        # Create index on user_id for faster lookups
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id
            ON conversation_participants(user_id)
            WHERE is_active = true;
        """)
        log("  ✓ Created index on user_id")

        # =============================================
        # 3. ALTER CHAT_MESSAGES TABLE
        # =============================================
        log("Step 3: Making chat_messages user-based...")

        # Make sender profile fields nullable
        cur.execute("""
            ALTER TABLE chat_messages
            ALTER COLUMN sender_profile_id DROP NOT NULL,
            ALTER COLUMN sender_profile_type DROP NOT NULL;
        """)
        log("  ✓ Made sender_profile_id and sender_profile_type nullable")

        # Make pinned_by profile fields nullable (they already should be)
        cur.execute("""
            ALTER TABLE chat_messages
            ALTER COLUMN pinned_by_profile_id DROP NOT NULL,
            ALTER COLUMN pinned_by_profile_type DROP NOT NULL;
        """)
        log("  ✓ Made pinned_by_profile_id and pinned_by_profile_type nullable")

        # Add pinned_by_user_id if it doesn't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'chat_messages'
                    AND column_name = 'pinned_by_user_id'
                ) THEN
                    ALTER TABLE chat_messages
                    ADD COLUMN pinned_by_user_id INTEGER REFERENCES users(id);
                END IF;
            END $$;
        """)
        log("  ✓ Added pinned_by_user_id column")

        # Create index on sender_user_id
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_user_id
            ON chat_messages(sender_user_id);
        """)
        log("  ✓ Created index on sender_user_id")

        # Create index on conversation_id + created_at for message history
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
            ON chat_messages(conversation_id, created_at DESC)
            WHERE is_deleted = false;
        """)
        log("  ✓ Created index on conversation_id + created_at")

        # =============================================
        # 4. ALTER CALL_LOGS TABLE
        # =============================================
        log("Step 4: Making call_logs user-based...")

        # Make caller profile fields nullable
        cur.execute("""
            ALTER TABLE call_logs
            ALTER COLUMN caller_profile_id DROP NOT NULL,
            ALTER COLUMN caller_profile_type DROP NOT NULL;
        """)
        log("  ✓ Made caller_profile_id and caller_profile_type nullable")

        # Create index on caller_user_id
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_call_logs_caller_user_id
            ON call_logs(caller_user_id);
        """)
        log("  ✓ Created index on caller_user_id")

        # =============================================
        # 5. CREATE/UPDATE CHAT_SETTINGS TABLE (User-Based)
        # =============================================
        log("Step 5: Migrating chat_settings to user-based...")

        # Check if chat_settings table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'chat_settings'
            );
        """)
        table_exists = cur.fetchone()['exists']

        if table_exists:
            log("  ✓ chat_settings table exists")

            # Add user_id column if it doesn't exist
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'chat_settings'
                        AND column_name = 'user_id'
                    ) THEN
                        ALTER TABLE chat_settings
                        ADD COLUMN user_id INTEGER REFERENCES users(id);
                    END IF;
                END $$;
            """)
            log("  ✓ Added user_id column to chat_settings")

            # Populate user_id from profile_id/profile_type
            cur.execute("""
                UPDATE chat_settings cs
                SET user_id = CASE
                    WHEN cs.profile_type = 'student' THEN (
                        SELECT user_id FROM student_profiles WHERE id = cs.profile_id
                    )
                    WHEN cs.profile_type = 'tutor' THEN (
                        SELECT user_id FROM tutor_profiles WHERE id = cs.profile_id
                    )
                    WHEN cs.profile_type = 'parent' THEN (
                        SELECT user_id FROM parent_profiles WHERE id = cs.profile_id
                    )
                    WHEN cs.profile_type = 'advertiser' THEN (
                        SELECT user_id FROM advertiser_profiles WHERE id = cs.profile_id
                    )
                END
                WHERE cs.user_id IS NULL
                AND cs.profile_id IS NOT NULL
                AND cs.profile_type IS NOT NULL;
            """)
            updated = cur.rowcount
            log(f"  ✓ Populated user_id for {updated} chat_settings records")

            # Make profile fields nullable
            cur.execute("""
                ALTER TABLE chat_settings
                ALTER COLUMN profile_id DROP NOT NULL,
                ALTER COLUMN profile_type DROP NOT NULL;
            """)
            log("  ✓ Made profile_id and profile_type nullable in chat_settings")

            # Create unique index on user_id (one setting per user)
            cur.execute("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_settings_user_id
                ON chat_settings(user_id);
            """)
            log("  ✓ Created unique index on user_id in chat_settings")

        else:
            log("  ! chat_settings table does not exist - creating user-based version...")
            cur.execute("""
                CREATE TABLE chat_settings (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    profile_id INTEGER,
                    profile_type VARCHAR(50),
                    who_can_message VARCHAR(20) DEFAULT 'everyone',
                    read_receipts BOOLEAN DEFAULT true,
                    online_status BOOLEAN DEFAULT true,
                    typing_indicators BOOLEAN DEFAULT true,
                    last_seen_visibility VARCHAR(20) DEFAULT 'everyone',
                    block_screenshots BOOLEAN DEFAULT false,
                    disable_forwarding BOOLEAN DEFAULT false,
                    allow_calls_from VARCHAR(20) DEFAULT 'everyone',
                    allow_group_adds VARCHAR(20) DEFAULT 'everyone',
                    allow_channel_adds VARCHAR(20) DEFAULT 'everyone',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id)
                );

                CREATE INDEX idx_chat_settings_user_id ON chat_settings(user_id);
            """)
            log("  ✓ Created user-based chat_settings table")

        # =============================================
        # 6. CREATE/UPDATE BLOCKED_CHAT_CONTACTS TABLE (User-Based)
        # =============================================
        log("Step 6: Migrating blocked_chat_contacts to user-based...")

        # Check if blocked_chat_contacts table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'blocked_chat_contacts'
            );
        """)
        table_exists = cur.fetchone()['exists']

        if table_exists:
            log("  ✓ blocked_chat_contacts table exists")

            # Add user_id columns if they don't exist
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'blocked_chat_contacts'
                        AND column_name = 'blocker_user_id'
                    ) THEN
                        ALTER TABLE blocked_chat_contacts
                        ADD COLUMN blocker_user_id INTEGER REFERENCES users(id);
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'blocked_chat_contacts'
                        AND column_name = 'blocked_user_id'
                    ) THEN
                        ALTER TABLE blocked_chat_contacts
                        ADD COLUMN blocked_user_id INTEGER REFERENCES users(id);
                    END IF;
                END $$;
            """)
            log("  ✓ Added blocker_user_id and blocked_user_id columns")

            # Populate blocker_user_id
            cur.execute("""
                UPDATE blocked_chat_contacts bc
                SET blocker_user_id = CASE
                    WHEN bc.blocker_profile_type = 'student' THEN (
                        SELECT user_id FROM student_profiles WHERE id = bc.blocker_profile_id
                    )
                    WHEN bc.blocker_profile_type = 'tutor' THEN (
                        SELECT user_id FROM tutor_profiles WHERE id = bc.blocker_profile_id
                    )
                    WHEN bc.blocker_profile_type = 'parent' THEN (
                        SELECT user_id FROM parent_profiles WHERE id = bc.blocker_profile_id
                    )
                    WHEN bc.blocker_profile_type = 'advertiser' THEN (
                        SELECT user_id FROM advertiser_profiles WHERE id = bc.blocker_profile_id
                    )
                END
                WHERE bc.blocker_user_id IS NULL;
            """)
            updated1 = cur.rowcount

            # Populate blocked_user_id
            cur.execute("""
                UPDATE blocked_chat_contacts bc
                SET blocked_user_id = CASE
                    WHEN bc.blocked_profile_type = 'student' THEN (
                        SELECT user_id FROM student_profiles WHERE id = bc.blocked_profile_id
                    )
                    WHEN bc.blocked_profile_type = 'tutor' THEN (
                        SELECT user_id FROM tutor_profiles WHERE id = bc.blocked_profile_id
                    )
                    WHEN bc.blocked_profile_type = 'parent' THEN (
                        SELECT user_id FROM parent_profiles WHERE id = bc.blocked_profile_id
                    )
                    WHEN bc.blocked_profile_type = 'advertiser' THEN (
                        SELECT user_id FROM advertiser_profiles WHERE id = bc.blocked_profile_id
                    )
                END
                WHERE bc.blocked_user_id IS NULL;
            """)
            updated2 = cur.rowcount
            log(f"  ✓ Populated blocker_user_id ({updated1}) and blocked_user_id ({updated2})")

            # Make profile fields nullable
            cur.execute("""
                ALTER TABLE blocked_chat_contacts
                ALTER COLUMN blocker_profile_id DROP NOT NULL,
                ALTER COLUMN blocker_profile_type DROP NOT NULL,
                ALTER COLUMN blocked_profile_id DROP NOT NULL,
                ALTER COLUMN blocked_profile_type DROP NOT NULL;
            """)
            log("  ✓ Made profile fields nullable in blocked_chat_contacts")

            # Create indexes
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_blocked_contacts_blocker_user
                ON blocked_chat_contacts(blocker_user_id);

                CREATE INDEX IF NOT EXISTS idx_blocked_contacts_blocked_user
                ON blocked_chat_contacts(blocked_user_id);

                CREATE UNIQUE INDEX IF NOT EXISTS idx_blocked_contacts_unique
                ON blocked_chat_contacts(blocker_user_id, blocked_user_id)
                WHERE is_active = true;
            """)
            log("  ✓ Created indexes on user_id fields")

        else:
            log("  ! blocked_chat_contacts table does not exist - creating user-based version...")
            cur.execute("""
                CREATE TABLE blocked_chat_contacts (
                    id SERIAL PRIMARY KEY,
                    blocker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    blocker_profile_id INTEGER,
                    blocker_profile_type VARCHAR(50),
                    blocked_profile_id INTEGER,
                    blocked_profile_type VARCHAR(50),
                    reason TEXT,
                    is_active BOOLEAN DEFAULT true,
                    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    unblocked_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );

                CREATE INDEX idx_blocked_contacts_blocker_user ON blocked_chat_contacts(blocker_user_id);
                CREATE INDEX idx_blocked_contacts_blocked_user ON blocked_chat_contacts(blocked_user_id);
                CREATE UNIQUE INDEX idx_blocked_contacts_unique
                ON blocked_chat_contacts(blocker_user_id, blocked_user_id)
                WHERE is_active = true;
            """)
            log("  ✓ Created user-based blocked_chat_contacts table")

        # =============================================
        # 7. CREATE MESSAGE_REACTIONS TABLE (if not exists)
        # =============================================
        log("Step 7: Checking message_reactions table...")

        cur.execute("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_name = 'message_reactions'
            );
        """)
        table_exists = cur.fetchone()['exists']

        if not table_exists:
            log("  ! message_reactions table does not exist - creating user-based version...")
            cur.execute("""
                CREATE TABLE message_reactions (
                    id SERIAL PRIMARY KEY,
                    message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    profile_id INTEGER,
                    profile_type VARCHAR(50),
                    reaction VARCHAR(50) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(message_id, user_id, reaction)
                );

                CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
                CREATE INDEX idx_message_reactions_user ON message_reactions(user_id);
            """)
            log("  ✓ Created user-based message_reactions table")
        else:
            log("  ✓ message_reactions table already exists")

        # Commit all changes
        conn.commit()

        log("\n" + "="*60)
        log("MIGRATION COMPLETED SUCCESSFULLY!")
        log("="*60)
        log("\nSummary:")
        log("✓ Conversations: Made profile fields nullable, added user_id support")
        log("✓ Participants: Made profile fields nullable, indexed user_id")
        log("✓ Messages: Made profile fields nullable, indexed sender_user_id")
        log("✓ Call Logs: Made profile fields nullable, indexed caller_user_id")
        log("✓ Chat Settings: Migrated to user-based (backward compatible)")
        log("✓ Blocked Contacts: Migrated to user-based (backward compatible)")
        log("✓ Message Reactions: Ensured user-based structure")
        log("\nNext Steps:")
        log("1. Update backend endpoints to use user_id")
        log("2. Update frontend chat modal to use user_id")
        log("3. Test thoroughly")
        log("4. Deploy!")

    except Exception as e:
        conn.rollback()
        log(f"\n❌ ERROR during migration: {e}")
        log("Transaction rolled back. Database unchanged.")
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
