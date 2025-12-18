"""
Migration: Create Chat System Tables
=====================================
Creates tables for the chat/messaging system with support for:
- Direct messages (1-on-1)
- Group chats
- Message types (text, image, audio, video, file, system)
- Reactions, replies, pinning
- Read receipts
- Call logs

Uses profile_id + profile_type instead of user_id to support
multi-role users (tutor, student, parent, advertiser).

Contacts come from the connections table (status='accepted').
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def get_connection():
    """Get database connection"""
    return psycopg2.connect(DATABASE_URL)

def create_chat_tables():
    """Create all chat-related tables"""

    conn = get_connection()
    cur = conn.cursor()

    try:
        # =============================================
        # 1. CONVERSATIONS TABLE
        # =============================================
        print("Creating conversations table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,

                -- Conversation type
                type VARCHAR(20) NOT NULL DEFAULT 'direct',  -- 'direct' or 'group'

                -- Group chat fields (NULL for direct chats)
                name VARCHAR(255),                    -- Group name
                description TEXT,                     -- Group description
                avatar_url VARCHAR(500),              -- Group avatar

                -- Creator info (for groups)
                created_by_profile_id INTEGER,
                created_by_profile_type VARCHAR(50), -- 'tutor', 'student', 'parent', 'advertiser'

                -- Settings
                is_archived BOOLEAN DEFAULT FALSE,
                is_muted BOOLEAN DEFAULT FALSE,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_message_at TIMESTAMP,

                -- Constraints
                CONSTRAINT check_conversation_type CHECK (type IN ('direct', 'group')),
                CONSTRAINT check_creator_profile_type CHECK (
                    created_by_profile_type IS NULL OR
                    created_by_profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                )
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
            CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by_profile_id, created_by_profile_type);
            CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
            CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
        """)
        print("  [OK] conversations table created")

        # =============================================
        # 2. CONVERSATION PARTICIPANTS TABLE
        # =============================================
        print("Creating conversation_participants table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS conversation_participants (
                id SERIAL PRIMARY KEY,

                -- Links
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

                -- Participant profile (using profile_id + type instead of user_id)
                profile_id INTEGER NOT NULL,
                profile_type VARCHAR(50) NOT NULL,   -- 'tutor', 'student', 'parent', 'advertiser'
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- For quick user lookup

                -- Role in conversation
                role VARCHAR(20) DEFAULT 'member',    -- 'admin', 'member' (for groups)

                -- Settings
                is_muted BOOLEAN DEFAULT FALSE,
                is_pinned BOOLEAN DEFAULT FALSE,

                -- Read tracking
                last_read_at TIMESTAMP,
                last_read_message_id INTEGER,

                -- Status
                is_active BOOLEAN DEFAULT TRUE,      -- FALSE if left/removed
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                left_at TIMESTAMP,

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CONSTRAINT check_participant_profile_type CHECK (
                    profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                ),
                CONSTRAINT check_participant_role CHECK (role IN ('admin', 'member')),

                -- Unique constraint: one profile per conversation
                CONSTRAINT unique_participant UNIQUE (conversation_id, profile_id, profile_type)
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_participants_profile ON conversation_participants(profile_id, profile_type);
            CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants(user_id);
            CREATE INDEX IF NOT EXISTS idx_participants_active ON conversation_participants(is_active) WHERE is_active = TRUE;
        """)
        print("  [OK] conversation_participants table created")

        # =============================================
        # 3. CHAT MESSAGES TABLE
        # =============================================
        print("Creating chat_messages table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,

                -- Links
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

                -- Sender profile
                sender_profile_id INTEGER NOT NULL,
                sender_profile_type VARCHAR(50) NOT NULL,
                sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Message content
                message_type VARCHAR(20) NOT NULL DEFAULT 'text',  -- 'text', 'image', 'audio', 'video', 'file', 'system', 'location'
                content TEXT,                          -- Text content or caption

                -- Media/File info (stored as JSON)
                media_url VARCHAR(500),                -- URL to media file
                media_metadata JSONB,                  -- {filename, size, mime_type, duration, width, height, thumbnail_url}

                -- Reply to another message
                reply_to_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,

                -- Forwarded from
                forwarded_from_id INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,

                -- Edit tracking
                is_edited BOOLEAN DEFAULT FALSE,
                edited_at TIMESTAMP,
                original_content TEXT,                 -- Store original before edit

                -- Delete tracking
                is_deleted BOOLEAN DEFAULT FALSE,
                deleted_at TIMESTAMP,
                deleted_for_everyone BOOLEAN DEFAULT FALSE,

                -- Pinned
                is_pinned BOOLEAN DEFAULT FALSE,
                pinned_at TIMESTAMP,
                pinned_by_profile_id INTEGER,
                pinned_by_profile_type VARCHAR(50),

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CONSTRAINT check_message_type CHECK (
                    message_type IN ('text', 'image', 'audio', 'video', 'file', 'system', 'location', 'gif')
                ),
                CONSTRAINT check_sender_profile_type CHECK (
                    sender_profile_type IN ('tutor', 'student', 'parent', 'advertiser', 'system')
                )
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON chat_messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_messages_sender ON chat_messages(sender_profile_id, sender_profile_type);
            CREATE INDEX IF NOT EXISTS idx_messages_created ON chat_messages(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON chat_messages(conversation_id, created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_messages_reply ON chat_messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_messages_pinned ON chat_messages(conversation_id, is_pinned) WHERE is_pinned = TRUE;
            CREATE INDEX IF NOT EXISTS idx_messages_not_deleted ON chat_messages(conversation_id, created_at DESC) WHERE is_deleted = FALSE;
        """)
        print("  [OK] chat_messages table created")

        # =============================================
        # 4. MESSAGE REACTIONS TABLE
        # =============================================
        print("Creating message_reactions table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS message_reactions (
                id SERIAL PRIMARY KEY,

                -- Links
                message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,

                -- Reactor profile
                profile_id INTEGER NOT NULL,
                profile_type VARCHAR(50) NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Reaction
                reaction VARCHAR(50) NOT NULL,        -- 'heart', 'thumbsup', 'laugh', 'wow', 'sad', 'angry' or emoji

                -- Timestamp
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CONSTRAINT check_reaction_profile_type CHECK (
                    profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                ),

                -- One reaction type per user per message
                CONSTRAINT unique_reaction UNIQUE (message_id, profile_id, profile_type, reaction)
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);
            CREATE INDEX IF NOT EXISTS idx_reactions_profile ON message_reactions(profile_id, profile_type);
        """)
        print("  [OK] message_reactions table created")

        # =============================================
        # 5. MESSAGE READ RECEIPTS TABLE
        # =============================================
        print("Creating message_read_receipts table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS message_read_receipts (
                id SERIAL PRIMARY KEY,

                -- Links
                message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,

                -- Reader profile
                profile_id INTEGER NOT NULL,
                profile_type VARCHAR(50) NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Read timestamp
                read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CONSTRAINT check_receipt_profile_type CHECK (
                    profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                ),

                -- One receipt per user per message
                CONSTRAINT unique_read_receipt UNIQUE (message_id, profile_id, profile_type)
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_receipts_message ON message_read_receipts(message_id);
            CREATE INDEX IF NOT EXISTS idx_receipts_profile ON message_read_receipts(profile_id, profile_type);
        """)
        print("  [OK] message_read_receipts table created")

        # =============================================
        # 6. CALL LOGS TABLE
        # =============================================
        print("Creating call_logs table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS call_logs (
                id SERIAL PRIMARY KEY,

                -- Links
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

                -- Caller profile
                caller_profile_id INTEGER NOT NULL,
                caller_profile_type VARCHAR(50) NOT NULL,
                caller_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Call details
                call_type VARCHAR(20) NOT NULL,       -- 'voice', 'video'
                status VARCHAR(20) NOT NULL DEFAULT 'initiated',  -- 'initiated', 'ringing', 'answered', 'missed', 'declined', 'ended', 'failed'

                -- Timing
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                answered_at TIMESTAMP,
                ended_at TIMESTAMP,
                duration_seconds INTEGER,             -- Call duration in seconds

                -- Participants (for group calls)
                participants JSONB,                   -- [{profile_id, profile_type, joined_at, left_at}]

                -- Timestamps
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CONSTRAINT check_call_type CHECK (call_type IN ('voice', 'video')),
                CONSTRAINT check_call_status CHECK (
                    status IN ('initiated', 'ringing', 'answered', 'missed', 'declined', 'ended', 'failed')
                ),
                CONSTRAINT check_caller_profile_type CHECK (
                    caller_profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                )
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_calls_conversation ON call_logs(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_calls_caller ON call_logs(caller_profile_id, caller_profile_type);
            CREATE INDEX IF NOT EXISTS idx_calls_started ON call_logs(started_at DESC);
        """)
        print("  [OK] call_logs table created")

        # =============================================
        # 7. BLOCKED CONTACTS TABLE
        # =============================================
        print("Creating blocked_chat_contacts table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS blocked_chat_contacts (
                id SERIAL PRIMARY KEY,

                -- Blocker profile
                blocker_profile_id INTEGER NOT NULL,
                blocker_profile_type VARCHAR(50) NOT NULL,
                blocker_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Blocked profile
                blocked_profile_id INTEGER NOT NULL,
                blocked_profile_type VARCHAR(50) NOT NULL,
                blocked_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                -- Reason (optional)
                reason TEXT,

                -- Timestamp
                blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                -- Constraints
                CONSTRAINT check_blocker_type CHECK (
                    blocker_profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                ),
                CONSTRAINT check_blocked_type CHECK (
                    blocked_profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                ),

                -- Can't block same profile twice
                CONSTRAINT unique_block UNIQUE (blocker_profile_id, blocker_profile_type, blocked_profile_id, blocked_profile_type)
            );

            -- Indexes
            CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_chat_contacts(blocker_profile_id, blocker_profile_type);
            CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_chat_contacts(blocked_profile_id, blocked_profile_type);
        """)
        print("  [OK] blocked_chat_contacts table created")

        # Commit all changes
        conn.commit()
        print("\n[SUCCESS] All chat tables created successfully!")

        # Print summary
        print("\n" + "="*50)
        print("CHAT SYSTEM TABLES CREATED:")
        print("="*50)
        print("""
1. conversations
   - Stores direct and group chats
   - Links via profile_id + profile_type

2. conversation_participants
   - Links profiles to conversations
   - Tracks read status, mute, pin settings
   - Supports admin/member roles for groups

3. chat_messages
   - All message types (text, image, audio, video, file, system)
   - Reply support, forwarding, editing
   - Soft delete, pinning

4. message_reactions
   - Emoji reactions on messages
   - One reaction type per user per message

5. message_read_receipts
   - Track who read which message
   - For read receipts feature

6. call_logs
   - Voice and video call history
   - Duration tracking

7. blocked_chat_contacts
   - Block list for chat
   - Separate from connections blocking
        """)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error creating tables: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def verify_tables():
    """Verify all tables were created"""
    conn = get_connection()
    cur = conn.cursor()

    tables = [
        'conversations',
        'conversation_participants',
        'chat_messages',
        'message_reactions',
        'message_read_receipts',
        'call_logs',
        'blocked_chat_contacts'
    ]

    print("\nVerifying tables...")
    for table in tables:
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = %s
            );
        """, (table,))
        exists = cur.fetchone()[0]
        status = "[OK]" if exists else "[MISSING]"
        print(f"  {status} {table}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    print("="*50)
    print("CHAT SYSTEM DATABASE MIGRATION")
    print("="*50)
    print()

    create_chat_tables()
    verify_tables()

    print("\n" + "="*50)
    print("Migration complete!")
    print("="*50)
