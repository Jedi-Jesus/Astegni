"""
Migration: Update whiteboard system to use profile IDs instead of user IDs

This migration:
1. Adds tutor_profile_id and student_profile_ids columns
2. Populates them from existing tutor_id and student_id (user IDs)
3. Updates foreign key constraints to reference profile tables
4. Updates the whiteboard endpoints to use profile IDs
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Fix encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    print("Starting migration: Whiteboard system to profile IDs...")

    conn = psycopg.connect(DATABASE_URL)
    conn.autocommit = False
    cursor = conn.cursor()

    try:
        # Step 1: Add new profile ID columns
        print("\n📝 Step 1: Adding profile ID columns...")

        cursor.execute("""
            -- Add host_profile_id column (can be tutor or student)
            ALTER TABLE whiteboard_sessions
            ADD COLUMN IF NOT EXISTS host_profile_id INTEGER;

            -- Add host_profile_type column
            ALTER TABLE whiteboard_sessions
            ADD COLUMN IF NOT EXISTS host_profile_type VARCHAR(20);

            -- Add participant_profile_ids column (array of all participants)
            ALTER TABLE whiteboard_sessions
            ADD COLUMN IF NOT EXISTS participant_profile_ids INTEGER[];

            -- Add participant_profile_types column (array matching participant_profile_ids)
            ALTER TABLE whiteboard_sessions
            ADD COLUMN IF NOT EXISTS participant_profile_types VARCHAR(20)[];

            -- Add comments explaining the columns
            COMMENT ON COLUMN whiteboard_sessions.host_profile_id IS 'Profile ID of the session host (from tutor_profiles or student_profiles)';
            COMMENT ON COLUMN whiteboard_sessions.host_profile_type IS 'Profile type of host: tutor or student';
            COMMENT ON COLUMN whiteboard_sessions.participant_profile_ids IS 'Array of profile IDs for all participants';
            COMMENT ON COLUMN whiteboard_sessions.participant_profile_types IS 'Array of profile types matching participant_profile_ids';
        """)

        print("✅ Profile ID columns added")

        # Step 2: Populate new columns from existing data
        print("\n📝 Step 2: Populating profile IDs from user IDs...")

        # For now, assume tutor is always the host (existing sessions)
        cursor.execute("""
            -- Populate host as tutor (existing behavior)
            UPDATE whiteboard_sessions ws
            SET host_profile_id = tp.id,
                host_profile_type = 'tutor'
            FROM tutor_profiles tp
            WHERE tp.user_id = ws.tutor_id;
        """)

        cursor.execute("SELECT COUNT(*) FROM whiteboard_sessions WHERE host_profile_id IS NOT NULL;")
        host_count = cursor.fetchone()[0]
        print(f"Updated {host_count} sessions with host_profile_id (tutors as hosts)")

        # Populate participant_profile_ids from student_id array (user_ids)
        cursor.execute("""
            -- Convert student user IDs to profile IDs
            UPDATE whiteboard_sessions ws
            SET participant_profile_ids = ARRAY(
                SELECT sp.id
                FROM student_profiles sp
                WHERE sp.user_id = ANY(ws.student_id)
            ),
            participant_profile_types = (
                SELECT array_agg('student'::VARCHAR)
                FROM unnest(ws.student_id) AS uid
            )
            WHERE ws.student_id IS NOT NULL;
        """)

        cursor.execute("SELECT COUNT(*) FROM whiteboard_sessions WHERE participant_profile_ids IS NOT NULL;")
        participant_count = cursor.fetchone()[0]
        print(f"Updated {participant_count} sessions with participant_profile_ids")

        # Step 3: Add constraints
        print("\n📝 Step 3: Adding constraints...")

        cursor.execute("""
            -- Note: We can't add FK constraint for host_profile_id since it can reference either table
            -- Instead, add check constraints

            ALTER TABLE whiteboard_sessions
            DROP CONSTRAINT IF EXISTS check_host_profile_type;

            ALTER TABLE whiteboard_sessions
            ADD CONSTRAINT check_host_profile_type
            CHECK (host_profile_type IN ('tutor', 'student'));

            ALTER TABLE whiteboard_sessions
            DROP CONSTRAINT IF EXISTS check_participant_profile_ids_not_empty;

            ALTER TABLE whiteboard_sessions
            ADD CONSTRAINT check_participant_profile_ids_not_empty
            CHECK (participant_profile_ids IS NULL OR array_length(participant_profile_ids, 1) > 0);

            -- Ensure arrays are same length
            ALTER TABLE whiteboard_sessions
            DROP CONSTRAINT IF EXISTS check_participant_arrays_same_length;

            ALTER TABLE whiteboard_sessions
            ADD CONSTRAINT check_participant_arrays_same_length
            CHECK (
                (participant_profile_ids IS NULL AND participant_profile_types IS NULL) OR
                (array_length(participant_profile_ids, 1) = array_length(participant_profile_types, 1))
            );
        """)

        print("✅ Foreign key constraints added")

        # Step 4: Create indexes for performance
        print("\n📝 Step 4: Creating indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_whiteboard_sessions_host_profile
            ON whiteboard_sessions(host_profile_id, host_profile_type);

            CREATE INDEX IF NOT EXISTS idx_whiteboard_sessions_participant_profile_ids
            ON whiteboard_sessions USING GIN(participant_profile_ids);
        """)

        print("✅ Indexes created")

        # Step 5: Update whiteboard_canvas_data to use profile_id
        print("\n📝 Step 5: Adding profile_id to canvas data...")

        cursor.execute("""
            ALTER TABLE whiteboard_canvas_data
            ADD COLUMN IF NOT EXISTS profile_id INTEGER;

            ALTER TABLE whiteboard_canvas_data
            ADD COLUMN IF NOT EXISTS profile_type VARCHAR(20);

            COMMENT ON COLUMN whiteboard_canvas_data.profile_id IS 'Profile ID (from tutor_profiles or student_profiles)';
            COMMENT ON COLUMN whiteboard_canvas_data.profile_type IS 'Profile type: tutor or student';
        """)

        print("✅ Profile columns added to canvas data")

        # Step 6: Populate profile_id in canvas data from user_id
        print("\n📝 Step 6: Populating profile_id in canvas data...")

        cursor.execute("""
            -- Update canvas data with tutor profile IDs
            UPDATE whiteboard_canvas_data wcd
            SET profile_id = tp.id, profile_type = 'tutor'
            FROM tutor_profiles tp
            WHERE tp.user_id = wcd.user_id;

            -- Update canvas data with student profile IDs
            UPDATE whiteboard_canvas_data wcd
            SET profile_id = sp.id, profile_type = 'student'
            FROM student_profiles sp
            WHERE sp.user_id = wcd.user_id AND wcd.profile_id IS NULL;
        """)

        print("✅ Profile IDs populated in canvas data")

        # Commit all changes
        conn.commit()

        print("\n✅ Migration completed successfully!")
        print("\n📊 Summary:")
        print(f"  - Sessions with host assigned: {host_count}")
        print(f"  - Sessions with participants assigned: {participant_count}")
        print("  - New columns: host_profile_id, host_profile_type, participant_profile_ids, participant_profile_types")
        print("  - Canvas data now includes: profile_id, profile_type")
        print("\n⚠️  IMPORTANT: Update whiteboard_endpoints.py to use host/participant profile IDs")

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
