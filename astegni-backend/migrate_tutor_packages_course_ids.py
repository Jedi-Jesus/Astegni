"""
Migration: Change tutor_packages.courses from TEXT to course_ids INTEGER[]

Changes:
1. Add new column course_ids as INTEGER[] (array of course IDs referencing courses table)
2. Migrate any existing course data if possible
3. Drop the old courses TEXT column
4. Update indexes

Workflow:
- When tutor creates a course in package modal → saved to requested_courses (pending)
- When admin approves → course moves to courses table with new ID
- tutor_packages.course_ids stores array of approved course IDs from courses table
"""

import os
import sys
from datetime import datetime, timezone
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def run_migration():
    """Change tutor_packages.courses to course_ids[]"""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

        # Parse connection string
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")

        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_part = host_db.split("/")
        db_name = db_part.split("?")[0]

        if ":" in host_port:
            host, port = host_port.split(":")
        else:
            host = host_port
            port = "5432"

        print(f"Connecting to {host}:{port}/{db_name}")

        conn = psycopg.connect(
            dbname=db_name,
            user=user,
            password=password,
            host=host,
            port=port
        )

        cursor = conn.cursor()

        # Step 1: Check current table structure
        print("\n Step 1: Checking current tutor_packages structure...")

        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print("  Current columns:")
        for col in columns:
            print(f"    - {col[0]}: {col[1]}")

        # Check if course_ids already exists
        existing_columns = [col[0] for col in columns]

        if 'course_ids' in existing_columns:
            print("\n  course_ids column already exists. Migration may have already run.")
            # Check if we still need to drop courses column
            if 'courses' in existing_columns:
                print("  Dropping old courses column...")
                cursor.execute("ALTER TABLE tutor_packages DROP COLUMN IF EXISTS courses")
                conn.commit()
                print("  courses column dropped")
            print("\n Migration complete (was already partially done)")
            cursor.close()
            conn.close()
            return True

        # Step 2: Add the new course_ids column
        print("\n Step 2: Adding course_ids column...")

        cursor.execute("""
            ALTER TABLE tutor_packages
            ADD COLUMN IF NOT EXISTS course_ids INTEGER[] DEFAULT '{}'
        """)
        print("  course_ids INTEGER[] column added")

        # Step 3: Add pending_course_ids for courses awaiting approval
        print("\n Step 3: Adding pending_course_ids column...")

        cursor.execute("""
            ALTER TABLE tutor_packages
            ADD COLUMN IF NOT EXISTS pending_course_ids INTEGER[] DEFAULT '{}'
        """)
        print("  pending_course_ids INTEGER[] column added")

        # Step 4: Drop the old courses TEXT column
        print("\n Step 4: Dropping old courses TEXT column...")

        if 'courses' in existing_columns:
            cursor.execute("ALTER TABLE tutor_packages DROP COLUMN IF EXISTS courses")
            print("  courses TEXT column dropped")
        else:
            print("  courses column doesn't exist, skipping drop")

        # Step 5: Create index for course_ids
        print("\n Step 5: Creating indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tutor_packages_course_ids
            ON tutor_packages USING GIN(course_ids)
        """)
        print("  GIN index on course_ids created")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_tutor_packages_pending_course_ids
            ON tutor_packages USING GIN(pending_course_ids)
        """)
        print("  GIN index on pending_course_ids created")

        conn.commit()
        print("\n Migration completed successfully!")

        # Show new table structure
        print("\n New tutor_packages table structure:")
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print(f"  {'Column':<25} {'Type':<20} {'Default'}")
        print("  " + "-" * 70)
        for col in columns:
            default = str(col[2])[:25] if col[2] else ''
            print(f"  {col[0]:<25} {col[1]:<20} {default}")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"\n Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("TUTOR_PACKAGES COURSE_IDS MIGRATION")
    print("=" * 60)
    print("\nThis migration changes tutor_packages.courses (TEXT)")
    print("to course_ids (INTEGER[]) for proper foreign key references")
    print("=" * 60)
    run_migration()
