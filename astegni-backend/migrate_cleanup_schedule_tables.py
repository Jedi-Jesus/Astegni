"""
Migration: Clean up schedule tables
- Drop tutor_teaching_schedules (obsolete)
- Drop tutor_student_enrollments (obsolete)
- Rename tutoring_sessions to tutor_sessions (standardize naming)
- Keep tutor_schedules (primary schedule table)
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
    """Clean up and reorganize schedule tables"""
    conn = get_db_connection()

    try:
        with conn.cursor() as cur:
            print("=" * 70)
            print("MIGRATION: Clean Up Schedule Tables")
            print("=" * 70)
            print()

            # Step 1: Check if tutor_sessions already exists
            print("Step 1: Checking if tutor_sessions table exists...")
            cur.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'tutor_sessions'
                )
            """)
            tutor_sessions_exists = cur.fetchone()[0]

            if tutor_sessions_exists:
                print("  [INFO] tutor_sessions table already exists")
                print("  [SKIP] Will not rename tutoring_sessions")
            else:
                # Step 2: Rename tutoring_sessions to tutor_sessions
                print("\nStep 2: Renaming tutoring_sessions to tutor_sessions...")
                cur.execute("""
                    ALTER TABLE tutoring_sessions
                    RENAME TO tutor_sessions
                """)
                print("  [SUCCESS] Table renamed: tutoring_sessions -> tutor_sessions")

            # Step 3: Drop tutor_teaching_schedules if it exists
            print("\nStep 3: Dropping tutor_teaching_schedules table...")
            cur.execute("""
                DROP TABLE IF EXISTS tutor_teaching_schedules CASCADE
            """)
            print("  [SUCCESS] Table dropped: tutor_teaching_schedules")

            # Step 4: Drop tutor_student_enrollments if it exists
            print("\nStep 4: Dropping tutor_student_enrollments table...")
            cur.execute("""
                DROP TABLE IF EXISTS tutor_student_enrollments CASCADE
            """)
            print("  [SUCCESS] Table dropped: tutor_student_enrollments")

            # Commit changes
            conn.commit()

            print("\n" + "=" * 70)
            print("MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 70)
            print()
            print("Summary of changes:")
            print("  - tutor_teaching_schedules: DROPPED")
            print("  - tutor_student_enrollments: DROPPED")
            if not tutor_sessions_exists:
                print("  - tutoring_sessions: RENAMED to tutor_sessions")
            else:
                print("  - tutoring_sessions: Already renamed (skipped)")
            print()
            print("Remaining tables:")
            print("  - tutor_schedules (schedule/availability data)")
            print("  - tutor_sessions (actual session data)")
            print()

            # Show final table list
            print("Verifying remaining schedule-related tables:")
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND (table_name LIKE '%schedule%' OR table_name LIKE '%session%')
                ORDER BY table_name
            """)
            tables = [row[0] for row in cur.fetchall()]
            for table in tables:
                print(f"  ✓ {table}")

    except psycopg.Error as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    try:
        migrate()
        print("\n✓ Migration completed successfully!")
        print("✓ You can now use tutor_schedules and tutor_sessions tables")
        print("\nNext steps:")
        print("1. Update backend endpoints to use new table names")
        print("2. Update frontend to read from tutor_schedules and tutor_sessions")
        print()
    except Exception as e:
        print("\n✗ Migration failed! Please check the error above.")
        exit(1)
