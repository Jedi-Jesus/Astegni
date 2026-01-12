"""
Migration: Create whiteboard_call_history table
Tracks video call history for whiteboard sessions including missed calls
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

def run_migration():
    """Create whiteboard_call_history table"""

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("[ERROR] DATABASE_URL not found in environment")
        return False

    # Convert postgresql:// to postgresql+psycopg:// if needed
    if database_url.startswith("postgresql://") and "+psycopg" not in database_url:
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)

    # Remove the +psycopg part for psycopg3 direct connection
    clean_url = database_url.replace("+psycopg", "")

    try:
        with psycopg.connect(clean_url) as conn:
            with conn.cursor() as cur:
                print("Creating whiteboard_call_history table...")

                cur.execute("""
                    CREATE TABLE IF NOT EXISTS whiteboard_call_history (
                        id SERIAL PRIMARY KEY,

                        -- Caller info (who initiated the call)
                        caller_profile_id INTEGER NOT NULL,
                        caller_profile_type VARCHAR(50) NOT NULL,
                        caller_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        caller_name VARCHAR(255),
                        caller_avatar TEXT,

                        -- Callee info (who was being called)
                        callee_profile_id INTEGER NOT NULL,
                        callee_profile_type VARCHAR(50) NOT NULL,
                        callee_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                        callee_name VARCHAR(255),
                        callee_avatar TEXT,

                        -- Call details
                        call_type VARCHAR(20) NOT NULL DEFAULT 'video',  -- 'video', 'audio'
                        status VARCHAR(30) NOT NULL DEFAULT 'initiated',
                        -- Status values: 'initiated', 'ringing', 'answered', 'missed', 'declined',
                        --                'ended', 'failed', 'offline', 'no_answer'

                        -- Context info
                        whiteboard_session_id INTEGER REFERENCES whiteboard_sessions(id) ON DELETE SET NULL,
                        tutor_package_name VARCHAR(255),  -- Name of the tutor's package/course
                        tutor_package_id INTEGER,

                        -- Timing
                        initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        answered_at TIMESTAMP,
                        ended_at TIMESTAMP,
                        duration_seconds INTEGER DEFAULT 0,

                        -- Multi-party call support
                        is_multi_party BOOLEAN DEFAULT FALSE,
                        participants JSONB,  -- [{profile_id, profile_type, name, avatar, joined_at, left_at}]

                        -- Read status (for missed call notifications)
                        caller_seen BOOLEAN DEFAULT TRUE,   -- Caller always sees their own call
                        callee_seen BOOLEAN DEFAULT FALSE,  -- Callee needs to see missed calls

                        -- Timestamps
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                        -- Constraints
                        CONSTRAINT check_wb_call_type CHECK (call_type IN ('video', 'audio')),
                        CONSTRAINT check_wb_call_status CHECK (
                            status IN ('initiated', 'ringing', 'answered', 'missed', 'declined',
                                      'ended', 'failed', 'offline', 'no_answer')
                        ),
                        CONSTRAINT check_wb_caller_type CHECK (
                            caller_profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                        ),
                        CONSTRAINT check_wb_callee_type CHECK (
                            callee_profile_type IN ('tutor', 'student', 'parent', 'advertiser')
                        )
                    );

                    -- Indexes for efficient queries
                    CREATE INDEX IF NOT EXISTS idx_wb_calls_caller
                        ON whiteboard_call_history(caller_profile_id, caller_profile_type);
                    CREATE INDEX IF NOT EXISTS idx_wb_calls_callee
                        ON whiteboard_call_history(callee_profile_id, callee_profile_type);
                    CREATE INDEX IF NOT EXISTS idx_wb_calls_status
                        ON whiteboard_call_history(status);
                    CREATE INDEX IF NOT EXISTS idx_wb_calls_initiated
                        ON whiteboard_call_history(initiated_at DESC);
                    CREATE INDEX IF NOT EXISTS idx_wb_calls_session
                        ON whiteboard_call_history(whiteboard_session_id);
                    CREATE INDEX IF NOT EXISTS idx_wb_calls_unseen_callee
                        ON whiteboard_call_history(callee_profile_id, callee_profile_type, callee_seen)
                        WHERE callee_seen = FALSE;
                    CREATE INDEX IF NOT EXISTS idx_wb_calls_unseen_caller
                        ON whiteboard_call_history(caller_profile_id, caller_profile_type, caller_seen)
                        WHERE caller_seen = FALSE;
                """)

                conn.commit()
                print("[OK] whiteboard_call_history table created successfully!")

                # Verify table was created
                cur.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'whiteboard_call_history'
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()

                print(f"\nTable has {len(columns)} columns:")
                for col_name, col_type in columns:
                    print(f"  - {col_name}: {col_type}")

                return True

    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("WHITEBOARD CALL HISTORY TABLE MIGRATION")
    print("=" * 60)
    run_migration()
