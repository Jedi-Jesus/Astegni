"""
Migration: Add scheduling fields to tutoring_sessions table

This migration adds the following fields to tutoring_sessions:
- session_frequency: VARCHAR(50) - 'one-time', 'weekly', 'bi-weekly', 'monthly'
- is_recurring: BOOLEAN - Whether this is a recurring session
- recurring_pattern: JSON - Pattern for recurring sessions (days, months, etc.)
- package_duration: INTEGER - Duration in weeks/months if part of a package
- grade_level: VARCHAR(50) - Grade level of the student for this session

Purpose:
- Links sessions to scheduling information
- Supports recurring session patterns
- Tracks package-based enrollment durations
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """Get database connection"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def migrate():
    """Add scheduling fields to tutoring_sessions table"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("🔧 Starting migration: Add scheduling fields to tutoring_sessions")

            # Check if columns already exist
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'tutoring_sessions'
                AND column_name IN ('session_frequency', 'is_recurring', 'recurring_pattern', 'package_duration', 'grade_level')
            """)
            existing_columns = [row[0] for row in cur.fetchall()]

            if existing_columns:
                print(f"⚠️  Some columns already exist: {existing_columns}")
                print("Skipping existing columns and adding only missing ones...")

            # Add session_frequency column if it doesn't exist
            if 'session_frequency' not in existing_columns:
                print("  ➕ Adding session_frequency column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN session_frequency VARCHAR(50) DEFAULT 'one-time';
                """)
                print("  ✅ session_frequency column added")
            else:
                print("  ⏭️  session_frequency column already exists")

            # Add is_recurring column if it doesn't exist
            if 'is_recurring' not in existing_columns:
                print("  ➕ Adding is_recurring column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
                """)
                print("  ✅ is_recurring column added")
            else:
                print("  ⏭️  is_recurring column already exists")

            # Add recurring_pattern column if it doesn't exist
            if 'recurring_pattern' not in existing_columns:
                print("  ➕ Adding recurring_pattern column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN recurring_pattern JSON;
                """)
                print("  ✅ recurring_pattern column added")
            else:
                print("  ⏭️  recurring_pattern column already exists")

            # Add package_duration column if it doesn't exist
            if 'package_duration' not in existing_columns:
                print("  ➕ Adding package_duration column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN package_duration INTEGER;
                """)
                print("  ✅ package_duration column added")
            else:
                print("  ⏭️  package_duration column already exists")

            # Add grade_level column if it doesn't exist
            if 'grade_level' not in existing_columns:
                print("  ➕ Adding grade_level column...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    ADD COLUMN grade_level VARCHAR(50);
                """)
                print("  ✅ grade_level column added")
            else:
                print("  ⏭️  grade_level column already exists")

            # Add comments to document the new columns
            print("  📝 Adding column comments...")
            cur.execute("""
                COMMENT ON COLUMN tutoring_sessions.session_frequency IS
                'Frequency of the session: one-time, weekly, bi-weekly, monthly';
            """)
            cur.execute("""
                COMMENT ON COLUMN tutoring_sessions.is_recurring IS
                'Whether this session is part of a recurring schedule';
            """)
            cur.execute("""
                COMMENT ON COLUMN tutoring_sessions.recurring_pattern IS
                'JSON pattern for recurring sessions: {days: [], months: [], specific_dates: []}';
            """)
            cur.execute("""
                COMMENT ON COLUMN tutoring_sessions.package_duration IS
                'Duration in weeks/months if this session is part of a package enrollment';
            """)
            cur.execute("""
                COMMENT ON COLUMN tutoring_sessions.grade_level IS
                'Grade level of the student for this tutoring session';
            """)

            # Commit the changes
            conn.commit()

            print("\n✅ Migration completed successfully!")
            print("\nNew columns added to tutoring_sessions:")
            print("  - session_frequency (VARCHAR(50), default: 'one-time')")
            print("  - is_recurring (BOOLEAN, default: FALSE)")
            print("  - recurring_pattern (JSON, nullable)")
            print("  - package_duration (INTEGER, nullable)")
            print("  - grade_level (VARCHAR(50), nullable)")

            # Show updated table structure
            print("\n📊 Updated tutoring_sessions table structure:")
            cur.execute("""
                SELECT column_name, data_type, column_default, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'tutoring_sessions'
                ORDER BY ordinal_position
            """)

            print(f"\n{'Column':<30} {'Type':<25} {'Default':<20} {'Nullable':<10}")
            print("-" * 85)
            for row in cur.fetchall():
                col_name = row[0]
                col_type = row[1]
                col_default = row[2] or 'NULL'
                col_nullable = row[3]
                print(f"{col_name:<30} {col_type:<25} {col_default:<20} {col_nullable:<10}")

    except psycopg.Error as e:
        conn.rollback()
        print(f"\n❌ Migration failed (psycopg.Error): {e}")
        import traceback
        traceback.print_exc()
        raise
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 80)
    print("TUTORING SESSIONS MIGRATION - Add Scheduling Fields")
    print("=" * 80)
    print()

    try:
        migrate()
        print("\n" + "=" * 80)
        print("Migration completed successfully! You can now use the new scheduling fields.")
        print("=" * 80)
    except Exception as e:
        print("\n" + "=" * 80)
        print("Migration failed! Please check the error above.")
        print("=" * 80)
        exit(1)
