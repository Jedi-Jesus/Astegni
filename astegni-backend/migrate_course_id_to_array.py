"""
Migration: Change course_id from INTEGER to INTEGER[] (array)
in enrolled_courses table

This allows a single enrollment record to reference multiple courses.
"""
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
import psycopg

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

def run_migration():
    """Change course_id from INTEGER to INTEGER[] in enrolled_courses"""
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

        print("\n Step 1: Check current course_id column type...")
        cursor.execute("""
            SELECT data_type
            FROM information_schema.columns
            WHERE table_name = 'enrolled_courses' AND column_name = 'course_id'
        """)
        result = cursor.fetchone()

        if not result:
            print("  course_id column not found!")
            return False

        current_type = result[0]
        print(f"  Current type: {current_type}")

        if current_type == 'ARRAY':
            print("  course_id is already an array. Migration not needed.")
            cursor.close()
            conn.close()
            return True

        print("\n Step 2: Drop foreign key constraint on course_id if exists...")
        # Check and drop foreign key constraint
        cursor.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'enrolled_courses'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%course%'
        """)
        fk_constraints = cursor.fetchall()
        for constraint in fk_constraints:
            constraint_name = constraint[0]
            print(f"  Dropping constraint: {constraint_name}")
            cursor.execute(f"ALTER TABLE enrolled_courses DROP CONSTRAINT IF EXISTS {constraint_name}")

        print("\n Step 3: Drop unique constraint that includes course_id if exists...")
        cursor.execute("""
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'enrolled_courses'
            AND constraint_type = 'UNIQUE'
        """)
        unique_constraints = cursor.fetchall()
        for constraint in unique_constraints:
            constraint_name = constraint[0]
            print(f"  Dropping constraint: {constraint_name}")
            cursor.execute(f"ALTER TABLE enrolled_courses DROP CONSTRAINT IF EXISTS {constraint_name}")

        print("\n Step 4: Drop index on course_id if exists...")
        cursor.execute("DROP INDEX IF EXISTS idx_enrolled_course_id")
        print("  Index dropped")

        print("\n Step 5: Add new course_ids column as INTEGER[]...")
        cursor.execute("""
            ALTER TABLE enrolled_courses
            ADD COLUMN IF NOT EXISTS course_ids INTEGER[] DEFAULT '{}'
        """)
        print("  course_ids column added")

        print("\n Step 6: Migrate existing data from course_id to course_ids...")
        cursor.execute("""
            UPDATE enrolled_courses
            SET course_ids = ARRAY[course_id]
            WHERE course_id IS NOT NULL AND (course_ids IS NULL OR course_ids = '{}')
        """)
        rows_updated = cursor.rowcount
        print(f"  Migrated {rows_updated} rows")

        print("\n Step 7: Drop old course_id column...")
        cursor.execute("ALTER TABLE enrolled_courses DROP COLUMN IF EXISTS course_id")
        print("  Old course_id column dropped")

        print("\n Step 8: Rename course_ids to course_id...")
        cursor.execute("ALTER TABLE enrolled_courses RENAME COLUMN course_ids TO course_id")
        print("  Renamed course_ids to course_id")

        print("\n Step 9: Create GIN index for array searches...")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_enrolled_course_id_gin
            ON enrolled_courses USING GIN (course_id)
        """)
        print("  GIN index created for efficient array searches")

        conn.commit()
        print("\n Migration completed successfully!")

        # Show updated table structure
        print("\n Updated enrolled_courses table structure:")
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'enrolled_courses'
            ORDER BY ordinal_position
        """)
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")

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
    print("ENROLLED_COURSES: COURSE_ID TO ARRAY MIGRATION")
    print("=" * 60)
    run_migration()
