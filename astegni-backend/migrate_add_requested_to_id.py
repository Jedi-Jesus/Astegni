"""
Migration: Add requested_to_id column to requested_sessions table

This column stores the student profile ID when a parent requests a session
on behalf of their child. This allows tracking which student the session is for.

- requested_to_id: The student_profile.id when a parent requests for a student
- When requester_type is 'student', this can be NULL (student requests for themselves)
- When requester_type is 'parent', this should be set to the child's student profile ID
"""

import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")


def run_migration():
    """Add requested_to_id column to requested_sessions table"""
    print("\n" + "=" * 60)
    print("Migration: Add requested_to_id to requested_sessions")
    print("=" * 60 + "\n")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # Step 1: Check if column already exists
        print("1. Checking if requested_to_id column exists...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            AND column_name = 'requested_to_id'
        """)

        if cur.fetchone():
            print("   [SKIP] Column 'requested_to_id' already exists")
        else:
            # Step 2: Add the column
            print("2. Adding requested_to_id column...")
            cur.execute("""
                ALTER TABLE requested_sessions
                ADD COLUMN requested_to_id INTEGER REFERENCES student_profiles(id) ON DELETE SET NULL
            """)
            print("   [OK] Added requested_to_id column")

            # Step 3: Add index for better query performance
            print("3. Creating index on requested_to_id...")
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_requested_sessions_requested_to
                ON requested_sessions(requested_to_id)
            """)
            print("   [OK] Created index")

            # Step 4: Add comment to describe the column
            print("4. Adding column comment...")
            cur.execute("""
                COMMENT ON COLUMN requested_sessions.requested_to_id IS
                'Student profile ID when parent requests session for their child. NULL when student requests for themselves.'
            """)
            print("   [OK] Added column comment")

            conn.commit()
            print("\n[SUCCESS] Migration completed successfully!")

        # Show current table structure
        print("\n" + "-" * 40)
        print("Current requested_sessions columns:")
        print("-" * 40)
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'requested_sessions'
            ORDER BY ordinal_position
        """)
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]} {'(nullable)' if row[2] == 'YES' else '(required)'}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise

    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    run_migration()
