"""
Migration: Consolidate course request tables into requested_courses

Changes:
1. Rename course_requests → requested_courses
2. Update schema with new fields:
   - id, requester_id, course_name, course_category, course_description, course_level
   - thumbnail, duration, lessons, lesson_title[], language[]
   - status (pending/approved/rejected/suspended), status_by, status_reason, status_at
   - created_at, updated_at
3. Migrate data from rejected_courses and suspended_courses
4. Drop rejected_courses and suspended_courses tables
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
    """Consolidate course request tables"""
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

        # Step 1: Check existing tables
        print("\n Step 1: Checking existing tables...")

        cursor.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_name IN ('course_requests', 'rejected_courses', 'suspended_courses', 'requested_courses')
        """)
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"  Found tables: {existing_tables}")

        # Step 2: Create new requested_courses table
        print("\n Step 2: Creating new requested_courses table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS requested_courses (
                id SERIAL PRIMARY KEY,
                requester_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                course_name VARCHAR(255) NOT NULL,
                course_category VARCHAR(100) NOT NULL,
                course_description TEXT,
                course_level VARCHAR(100),
                thumbnail VARCHAR(500),
                duration INTEGER DEFAULT 0,
                lessons INTEGER DEFAULT 0,
                lesson_title JSONB DEFAULT '[]'::jsonb,
                language JSONB DEFAULT '["English"]'::jsonb,
                status VARCHAR(50) DEFAULT 'pending',
                status_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                status_reason TEXT,
                status_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  requested_courses table created")

        # Step 3: Migrate data from course_requests if it exists
        if 'course_requests' in existing_tables:
            print("\n Step 3: Migrating data from course_requests...")
            cursor.execute("""
                INSERT INTO requested_courses (
                    requester_id, course_name, course_category, course_description, course_level,
                    thumbnail, duration, lessons, lesson_title, language,
                    status, status_by, status_reason, status_at, created_at, updated_at
                )
                SELECT
                    user_id,
                    COALESCE(course_title, 'Untitled Course'),
                    COALESCE(category, 'General'),
                    description,
                    level,
                    NULL,
                    0,
                    0,
                    '[]'::jsonb,
                    '["English"]'::jsonb,
                    COALESCE(status, 'pending'),
                    NULL,
                    NULL,
                    NULL,
                    COALESCE(created_at, CURRENT_TIMESTAMP),
                    COALESCE(updated_at, CURRENT_TIMESTAMP)
                FROM course_requests
                ON CONFLICT DO NOTHING
            """)
            migrated_requests = cursor.rowcount
            print(f"  Migrated {migrated_requests} records from course_requests")

        # Step 4: Migrate data from rejected_courses if it exists
        if 'rejected_courses' in existing_tables:
            print("\n Step 4: Migrating data from rejected_courses...")
            cursor.execute("""
                INSERT INTO requested_courses (
                    requester_id, course_name, course_category, course_description, course_level,
                    thumbnail, duration, lessons, lesson_title, language,
                    status, status_by, status_reason, status_at, created_at, updated_at
                )
                SELECT
                    requester_user_id,
                    COALESCE(title, 'Untitled Course'),
                    COALESCE(category, 'General'),
                    description,
                    level,
                    NULL,
                    0,
                    0,
                    '[]'::jsonb,
                    '["English"]'::jsonb,
                    'rejected',
                    rejected_by,
                    rejection_reason,
                    rejected_at,
                    COALESCE(created_at, rejected_at, CURRENT_TIMESTAMP),
                    COALESCE(created_at, rejected_at, CURRENT_TIMESTAMP)
                FROM rejected_courses
                ON CONFLICT DO NOTHING
            """)
            migrated_rejected = cursor.rowcount
            print(f"  Migrated {migrated_rejected} records from rejected_courses")

        # Step 5: Migrate data from suspended_courses if it exists
        if 'suspended_courses' in existing_tables:
            print("\n Step 5: Migrating data from suspended_courses...")
            cursor.execute("""
                INSERT INTO requested_courses (
                    requester_id, course_name, course_category, course_description, course_level,
                    thumbnail, duration, lessons, lesson_title, language,
                    status, status_by, status_reason, status_at, created_at, updated_at
                )
                SELECT
                    requester_user_id,
                    COALESCE(title, 'Untitled Course'),
                    COALESCE(category, 'General'),
                    description,
                    level,
                    NULL,
                    0,
                    0,
                    '[]'::jsonb,
                    '["English"]'::jsonb,
                    'suspended',
                    suspended_by,
                    suspension_reason,
                    suspended_at,
                    COALESCE(created_at, suspended_at, CURRENT_TIMESTAMP),
                    COALESCE(created_at, suspended_at, CURRENT_TIMESTAMP)
                FROM suspended_courses
                ON CONFLICT DO NOTHING
            """)
            migrated_suspended = cursor.rowcount
            print(f"  Migrated {migrated_suspended} records from suspended_courses")

        # Step 6: Create indexes
        print("\n Step 6: Creating indexes...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_requested_courses_requester_id ON requested_courses(requester_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_requested_courses_status ON requested_courses(status)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_requested_courses_category ON requested_courses(course_category)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_requested_courses_created_at ON requested_courses(created_at)")
        print("  Indexes created")

        # Step 7: Drop old tables
        print("\n Step 7: Dropping old tables...")

        if 'course_requests' in existing_tables:
            cursor.execute("DROP TABLE IF EXISTS course_requests CASCADE")
            print("  Dropped course_requests")

        if 'rejected_courses' in existing_tables:
            cursor.execute("DROP TABLE IF EXISTS rejected_courses CASCADE")
            print("  Dropped rejected_courses")

        if 'suspended_courses' in existing_tables:
            cursor.execute("DROP TABLE IF EXISTS suspended_courses CASCADE")
            print("  Dropped suspended_courses")

        conn.commit()
        print("\n Migration completed successfully!")

        # Show table structure
        print("\n New requested_courses table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'requested_courses'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        print(f"  {'Column':<20} {'Type':<25} {'Nullable':<10} {'Default'}")
        print("  " + "-" * 80)
        for col in columns:
            default = str(col[3])[:30] if col[3] else ''
            print(f"  {col[0]:<20} {col[1]:<25} {col[2]:<10} {default}")

        # Show record count by status
        print("\n  Records by status:")
        cursor.execute("SELECT status, COUNT(*) FROM requested_courses GROUP BY status ORDER BY status")
        for row in cursor.fetchall():
            print(f"    {row[0]}: {row[1]}")

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
    print("REQUESTED_COURSES TABLE CONSOLIDATION MIGRATION")
    print("=" * 60)
    run_migration()
