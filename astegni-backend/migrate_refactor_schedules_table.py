"""
Migration: Refactor tutor_schedules table to schedules table

Changes:
1. Rename table: tutor_schedules -> schedules
2. Rename column: tutor_id -> scheduler_id
3. Add new column: scheduler_role (VARCHAR(50))
4. Remove columns: subject, grade_level
5. Add new column: priority_level (VARCHAR(20), default 'medium')

This makes the schedules table universal for all roles (tutor, student, parent, etc.)
"""

import psycopg
import os
import sys
from dotenv import load_dotenv

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def migrate_schedules_table():
    """Migrate tutor_schedules to schedules table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("Starting migration: tutor_schedules -> schedules")
            print("=" * 70)

            # Step 1: Check if tutor_schedules table exists
            print("\n1. Checking if tutor_schedules table exists...")
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'tutor_schedules'
                )
            """)
            table_exists = cur.fetchone()[0]

            if not table_exists:
                print("   [ERROR] tutor_schedules table does not exist. Migration not needed.")
                return

            print("   [OK] tutor_schedules table found")

            # Step 2: Check if schedules table already exists
            print("\n2. Checking if schedules table already exists...")
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'schedules'
                )
            """)
            new_table_exists = cur.fetchone()[0]

            if new_table_exists:
                print("   [WARNING] schedules table already exists. Dropping it first...")
                cur.execute("DROP TABLE IF EXISTS schedules CASCADE")
                print("   [OK] Dropped existing schedules table")

            # Step 3: Create new schedules table with updated schema
            print("\n3. Creating new schedules table...")
            cur.execute("""
                CREATE TABLE schedules (
                    id SERIAL PRIMARY KEY,
                    scheduler_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    scheduler_role VARCHAR(50) NOT NULL,

                    -- Schedule Details
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    year INTEGER NOT NULL,

                    -- Schedule Type: 'recurring' or 'specific'
                    schedule_type VARCHAR(20) DEFAULT 'recurring',

                    -- For recurring schedules
                    months TEXT[],
                    days TEXT[],

                    -- For specific date schedules
                    specific_dates TEXT[],

                    -- Time
                    start_time TIME NOT NULL,
                    end_time TIME NOT NULL,
                    notes TEXT,

                    -- Priority Level (NEW - replaces subject/grade_level)
                    priority_level VARCHAR(20) DEFAULT 'medium',

                    -- Status
                    status VARCHAR(20) DEFAULT 'active',

                    -- Alarm/Notification settings
                    alarm_enabled BOOLEAN DEFAULT FALSE,
                    alarm_before_minutes INTEGER,
                    notification_browser BOOLEAN DEFAULT FALSE,
                    notification_sound BOOLEAN DEFAULT FALSE,

                    -- Timestamps
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """)
            print("   [OK] Created schedules table")

            # Step 4: Create indexes for performance
            print("\n4. Creating indexes...")
            cur.execute("""
                CREATE INDEX idx_schedules_scheduler_id ON schedules(scheduler_id);
                CREATE INDEX idx_schedules_scheduler_role ON schedules(scheduler_role);
                CREATE INDEX idx_schedules_status ON schedules(status);
                CREATE INDEX idx_schedules_created_at ON schedules(created_at);
            """)
            print("   [OK] Created indexes on schedules table")

            # Step 5: Migrate data from tutor_schedules to schedules
            print("\n5. Migrating data from tutor_schedules to schedules...")
            cur.execute("""
                INSERT INTO schedules (
                    scheduler_id,
                    scheduler_role,
                    title,
                    description,
                    year,
                    schedule_type,
                    months,
                    days,
                    specific_dates,
                    start_time,
                    end_time,
                    notes,
                    priority_level,
                    status,
                    alarm_enabled,
                    alarm_before_minutes,
                    notification_browser,
                    notification_sound,
                    created_at,
                    updated_at
                )
                SELECT
                    tutor_id,
                    'tutor',  -- Set scheduler_role to 'tutor' for all existing records
                    title,
                    description,
                    year,
                    schedule_type,
                    months,
                    days,
                    specific_dates,
                    start_time,
                    end_time,
                    notes,
                    'medium',  -- Default priority_level
                    status,
                    alarm_enabled,
                    alarm_before_minutes,
                    notification_browser,
                    notification_sound,
                    created_at,
                    updated_at
                FROM tutor_schedules
            """)

            migrated_count = cur.rowcount
            print(f"   [OK] Migrated {migrated_count} records from tutor_schedules to schedules")

            # Step 6: Verify migration
            print("\n6. Verifying migration...")
            cur.execute("SELECT COUNT(*) FROM tutor_schedules")
            old_count = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM schedules")
            new_count = cur.fetchone()[0]

            if old_count == new_count:
                print(f"   [OK] Verification successful: {old_count} records in tutor_schedules = {new_count} records in schedules")
            else:
                print(f"   [ERROR] Verification failed: {old_count} records in tutor_schedules != {new_count} records in schedules")
                raise Exception("Migration verification failed")

            # Step 7: Drop old tutor_schedules table
            print("\n7. Dropping old tutor_schedules table...")
            cur.execute("DROP TABLE tutor_schedules CASCADE")
            print("   [OK] Dropped tutor_schedules table")

            # Commit all changes
            conn.commit()

            print("\n" + "=" * 70)
            print("[SUCCESS] Migration completed successfully!")
            print("=" * 70)
            print("\nSummary of changes:")
            print("  - Table renamed: tutor_schedules -> schedules")
            print("  - Column renamed: tutor_id -> scheduler_id")
            print("  - New column added: scheduler_role (VARCHAR(50))")
            print("  - Columns removed: subject, grade_level")
            print("  - New column added: priority_level (VARCHAR(20), default 'medium')")
            print(f"  - Total records migrated: {migrated_count}")
            print("\nThe schedules table is now universal for all roles!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_schedules_table()
