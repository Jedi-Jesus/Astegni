"""
Migration: Remove pending_course_ids column from tutor_packages table

This column is redundant because:
1. The courses table has a 'status' column that determines if a course is pending/approved
2. We can just store all course IDs in course_ids and filter by status when fetching

Run: python migrate_remove_pending_course_ids.py
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found")
    return psycopg.connect(database_url)

def migrate():
    print("=" * 60)
    print("Migration: Remove pending_course_ids from tutor_packages")
    print("=" * 60)

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Step 1: Check if column exists
        print("\n1. Checking if pending_course_ids column exists...")
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages' AND column_name = 'pending_course_ids'
        """)

        if not cur.fetchone():
            print("   Column pending_course_ids does not exist. Nothing to do.")
            return

        print("   Column exists. Proceeding with migration...")

        # Step 2: Migrate any pending_course_ids to course_ids
        print("\n2. Migrating pending_course_ids data to course_ids...")
        cur.execute("""
            UPDATE tutor_packages
            SET course_ids = (
                SELECT array_agg(DISTINCT id)
                FROM unnest(COALESCE(course_ids, '{}') || COALESCE(pending_course_ids, '{}')) AS id
                WHERE id IS NOT NULL
            )
            WHERE pending_course_ids IS NOT NULL AND array_length(pending_course_ids, 1) > 0
        """)
        migrated_count = cur.rowcount
        print(f"   Migrated {migrated_count} packages")

        # Step 3: Drop the index if it exists
        print("\n3. Dropping index on pending_course_ids...")
        cur.execute("""
            DROP INDEX IF EXISTS idx_tutor_packages_pending_course_ids
        """)
        print("   Index dropped (if existed)")

        # Step 4: Drop the column
        print("\n4. Dropping pending_course_ids column...")
        cur.execute("""
            ALTER TABLE tutor_packages
            DROP COLUMN IF EXISTS pending_course_ids
        """)
        print("   Column dropped successfully")

        conn.commit()
        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\n ERROR: {str(e)}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
