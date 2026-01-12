"""
Migration: Create TrueVoice Tables
===================================
TrueVoice is Astegni's voice-personalized messaging feature.
When users read messages, they can hear them in the sender's actual voice.

This migration creates:
1. truevoice_profiles - Voice models for users who enrolled their voice
2. truevoice_audio_cache - Cached synthesized audio to avoid re-generation

Key Features:
- Voice enrollment with sample recordings
- Consent-based voice usage permissions
- Audio caching for cost optimization (ElevenLabs API)
- Per-message audio with TTL for cache management

Run: python migrate_create_truevoice_tables.py
"""

import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")


def run_migration():
    print("=" * 70)
    print("Migration: Create TrueVoice Tables")
    print("=" * 70)

    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    try:
        # =====================================================
        # Table 1: truevoice_profiles
        # Stores voice models and enrollment data for users
        # =====================================================
        print("\n1. Creating truevoice_profiles table...")

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'truevoice_profiles'
            )
        """)

        if cur.fetchone()['exists']:
            print("   [SKIP] Table already exists")
        else:
            cur.execute("""
                CREATE TABLE truevoice_profiles (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

                    -- Voice Model Info
                    voice_model_id VARCHAR(100),           -- External API voice model ID (e.g., ElevenLabs)
                    voice_provider VARCHAR(50) DEFAULT 'elevenlabs',  -- elevenlabs, coqui, azure, etc.
                    voice_name VARCHAR(100),               -- User-friendly name for the voice
                    voice_description TEXT,                -- Description of voice characteristics

                    -- Enrollment Status
                    enrollment_status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, active, failed
                    enrollment_progress INTEGER DEFAULT 0,  -- 0-100 progress percentage
                    enrollment_error TEXT,                  -- Error message if failed

                    -- Voice Samples (stored in Backblaze)
                    sample_urls JSONB DEFAULT '[]',        -- Array of audio sample URLs
                    sample_texts JSONB DEFAULT '[]',       -- Array of texts used for samples
                    total_sample_duration INTEGER DEFAULT 0, -- Total seconds of samples

                    -- Voice Quality Metrics
                    voice_quality_score DECIMAL(3,2),      -- 0.00-1.00 quality score
                    similarity_score DECIMAL(3,2),         -- How similar to original voice

                    -- Consent & Privacy
                    consent_given BOOLEAN DEFAULT FALSE,
                    consent_given_at TIMESTAMP WITHOUT TIME ZONE,
                    allow_students_to_hear BOOLEAN DEFAULT TRUE,
                    allow_parents_to_hear BOOLEAN DEFAULT TRUE,
                    allow_tutors_to_hear BOOLEAN DEFAULT TRUE,
                    allow_in_groups BOOLEAN DEFAULT TRUE,
                    allow_in_channels BOOLEAN DEFAULT FALSE,

                    -- Usage Settings
                    is_active BOOLEAN DEFAULT FALSE,       -- Master on/off switch
                    auto_play_for_recipients BOOLEAN DEFAULT FALSE,  -- Auto-play or click-to-play
                    default_speed DECIMAL(3,2) DEFAULT 1.00,  -- 0.5-2.0 playback speed

                    -- Usage Statistics
                    total_syntheses INTEGER DEFAULT 0,      -- Total times voice was used
                    total_characters_used INTEGER DEFAULT 0, -- Total chars synthesized
                    last_used_at TIMESTAMP WITHOUT TIME ZONE,

                    -- Timestamps
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                    -- Unique constraint - one voice profile per user
                    UNIQUE(user_id)
                )
            """)
            print("   [OK] Created truevoice_profiles table")

        # =====================================================
        # Table 2: truevoice_audio_cache
        # Caches generated audio to avoid re-synthesizing
        # =====================================================
        print("\n2. Creating truevoice_audio_cache table...")

        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'truevoice_audio_cache'
            )
        """)

        if cur.fetchone()['exists']:
            print("   [SKIP] Table already exists")
        else:
            cur.execute("""
                CREATE TABLE truevoice_audio_cache (
                    id SERIAL PRIMARY KEY,

                    -- Link to message and voice
                    message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                    voice_profile_id INTEGER NOT NULL REFERENCES truevoice_profiles(id) ON DELETE CASCADE,

                    -- Content Hash (for cache lookup)
                    content_hash VARCHAR(64) NOT NULL,     -- SHA-256 of message content + voice_id

                    -- Audio Data
                    audio_url VARCHAR(500) NOT NULL,       -- Backblaze URL to cached audio
                    audio_format VARCHAR(20) DEFAULT 'mp3', -- mp3, wav, ogg
                    audio_duration INTEGER,                 -- Duration in milliseconds
                    audio_size INTEGER,                     -- File size in bytes

                    -- Generation Info
                    characters_used INTEGER DEFAULT 0,      -- Characters in this synthesis
                    generation_time_ms INTEGER,             -- How long synthesis took

                    -- Cache Management
                    access_count INTEGER DEFAULT 0,         -- How many times played
                    last_accessed_at TIMESTAMP WITHOUT TIME ZONE,
                    expires_at TIMESTAMP WITHOUT TIME ZONE, -- TTL for cache cleanup

                    -- Timestamps
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

                    -- Unique constraint - one cache per message + voice combo
                    UNIQUE(message_id, voice_profile_id),
                    UNIQUE(content_hash)
                )
            """)
            print("   [OK] Created truevoice_audio_cache table")

        # =====================================================
        # Add indexes for performance
        # =====================================================
        print("\n3. Creating indexes...")

        # Simple indexes (index_name, table_name, columns)
        simple_indexes = [
            ("idx_truevoice_profiles_user", "truevoice_profiles", "user_id"),
            ("idx_truevoice_profiles_status", "truevoice_profiles", "enrollment_status"),
            ("idx_truevoice_cache_message", "truevoice_audio_cache", "message_id"),
            ("idx_truevoice_cache_hash", "truevoice_audio_cache", "content_hash"),
            ("idx_truevoice_cache_expires", "truevoice_audio_cache", "expires_at"),
            ("idx_truevoice_cache_accessed", "truevoice_audio_cache", "last_accessed_at"),
        ]

        for index_name, table_name, columns in simple_indexes:
            cur.execute(f"""
                SELECT indexname FROM pg_indexes
                WHERE tablename = '{table_name}' AND indexname = '{index_name}'
            """)
            if not cur.fetchone():
                cur.execute(f"CREATE INDEX {index_name} ON {table_name}({columns})")
                print(f"   [OK] Created index: {index_name}")
            else:
                print(f"   [SKIP] Index exists: {index_name}")

        # Partial index for active profiles
        cur.execute("""
            SELECT indexname FROM pg_indexes
            WHERE tablename = 'truevoice_profiles' AND indexname = 'idx_truevoice_profiles_active'
        """)
        if not cur.fetchone():
            cur.execute("""
                CREATE INDEX idx_truevoice_profiles_active
                ON truevoice_profiles(is_active)
                WHERE is_active = TRUE
            """)
            print("   [OK] Created index: idx_truevoice_profiles_active (partial)")
        else:
            print("   [SKIP] Index exists: idx_truevoice_profiles_active")

        # =====================================================
        # Add TrueVoice columns to chat_settings
        # =====================================================
        print("\n4. Adding TrueVoice columns to chat_settings...")

        truevoice_columns = [
            ("truevoice_enabled", "BOOLEAN DEFAULT FALSE"),
            ("truevoice_auto_play", "BOOLEAN DEFAULT FALSE"),
            ("truevoice_playback_speed", "DECIMAL(3,2) DEFAULT 1.00"),
            ("truevoice_prefer_sender_voice", "BOOLEAN DEFAULT TRUE"),
            ("truevoice_fallback_voice", "VARCHAR(50) DEFAULT 'default'"),
        ]

        for col_name, col_def in truevoice_columns:
            cur.execute(f"""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'chat_settings' AND column_name = '{col_name}'
            """)
            if not cur.fetchone():
                cur.execute(f"ALTER TABLE chat_settings ADD COLUMN {col_name} {col_def}")
                print(f"   [OK] Added column: {col_name}")
            else:
                print(f"   [SKIP] Column exists: {col_name}")

        # =====================================================
        # Commit changes
        # =====================================================
        conn.commit()

        print("\n" + "=" * 70)
        print("TrueVoice Migration Summary")
        print("=" * 70)
        print("""
Tables Created:
  1. truevoice_profiles    - Voice models and enrollment data
  2. truevoice_audio_cache - Cached synthesized audio

Columns Added to chat_settings:
  - truevoice_enabled           - Master switch for TrueVoice playback
  - truevoice_auto_play         - Auto-play voice messages
  - truevoice_playback_speed    - Default playback speed
  - truevoice_prefer_sender_voice - Use sender's voice if available
  - truevoice_fallback_voice    - Voice to use if sender has no TrueVoice

Indexes Created:
  - idx_truevoice_profiles_user
  - idx_truevoice_profiles_active
  - idx_truevoice_profiles_status
  - idx_truevoice_cache_message
  - idx_truevoice_cache_hash
  - idx_truevoice_cache_expires
  - idx_truevoice_cache_accessed
        """)
        print("Migration completed successfully!")
        print("=" * 70)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def show_schema():
    """Display the created schema for verification"""
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    cur = conn.cursor()

    print("\n" + "=" * 70)
    print("TrueVoice Schema Verification")
    print("=" * 70)

    for table in ['truevoice_profiles', 'truevoice_audio_cache']:
        cur.execute(f"""
            SELECT column_name, data_type, column_default, is_nullable
            FROM information_schema.columns
            WHERE table_name = '{table}'
            ORDER BY ordinal_position
        """)

        columns = cur.fetchall()
        if columns:
            print(f"\n{table}:")
            print("-" * 60)
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
                print(f"  {col['column_name']}: {col['data_type']} {nullable}{default}")

    cur.close()
    conn.close()


if __name__ == "__main__":
    run_migration()
    show_schema()
