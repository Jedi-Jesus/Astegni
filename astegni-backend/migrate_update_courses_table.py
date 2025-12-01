"""
Migration Script: Update Courses Table Schema
- Creates new courses table with updated fields
- Migrates data from active_courses to courses
- Drops active_courses table

New Schema:
- id, uploader_id, course_name, course_category, course_description, course_level
- thumbnail, duration, lessons, lesson_title[], language[]
- approved_by, approved_at, rating, rating_count, created_at, updated_at
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
    """Update courses table with new schema"""
    try:
        # Get database URL
        database_url = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

        # Parse connection string
        if database_url.startswith("postgresql://"):
            database_url = database_url.replace("postgresql://", "")

        auth, host_db = database_url.split("@")
        user, password = auth.split(":")
        host_port, db_part = host_db.split("/")

        # Remove query parameters from database name
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

        print("\n Step 1: Check if active_courses table exists...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'active_courses'
            );
        """)
        active_courses_exists = cursor.fetchone()[0]

        if active_courses_exists:
            print("  active_courses table found - will migrate data")
        else:
            print("  active_courses table not found - creating fresh courses table")

        print("\n Step 2: Check if old courses table exists...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'courses'
            );
        """)
        courses_exists = cursor.fetchone()[0]

        if courses_exists:
            print("  Backing up and dropping old courses table...")
            cursor.execute("DROP TABLE IF EXISTS courses_backup;")
            cursor.execute("ALTER TABLE courses RENAME TO courses_backup;")
            print("  Old courses table backed up as courses_backup")

        print("\n Step 3: Creating new courses table with updated schema...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS courses (
                id SERIAL PRIMARY KEY,
                uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                course_name VARCHAR(255) NOT NULL,
                course_category VARCHAR(100) NOT NULL,
                course_description TEXT,
                course_level VARCHAR(100),
                thumbnail VARCHAR(500),
                duration INTEGER DEFAULT 0,
                lessons INTEGER DEFAULT 0,
                lesson_title JSONB DEFAULT '[]'::jsonb,
                language JSONB DEFAULT '["English"]'::jsonb,
                approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                approved_at TIMESTAMP,
                rating DECIMAL(2, 1) DEFAULT 0.0,
                rating_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("  courses table created with new schema")

        # Migrate data from active_courses if it exists
        if active_courses_exists:
            print("\n Step 4: Migrating data from active_courses to courses...")
            cursor.execute("""
                INSERT INTO courses (
                    uploader_id,
                    course_name,
                    course_category,
                    course_description,
                    course_level,
                    thumbnail,
                    duration,
                    lessons,
                    lesson_title,
                    language,
                    approved_by,
                    approved_at,
                    rating,
                    rating_count,
                    created_at,
                    updated_at
                )
                SELECT
                    requester_user_id,
                    title,
                    category,
                    description,
                    level,
                    NULL,
                    0,
                    0,
                    '[]'::jsonb,
                    '["English"]'::jsonb,
                    approved_by,
                    approved_at,
                    COALESCE(rating, 0.0),
                    COALESCE(rating_count, 0),
                    created_at,
                    updated_at
                FROM active_courses;
            """)

            cursor.execute("SELECT COUNT(*) FROM courses;")
            migrated_count = cursor.fetchone()[0]
            print(f"  Migrated {migrated_count} courses from active_courses")

            print("\n Step 5: Dropping active_courses table...")
            cursor.execute("DROP TABLE IF EXISTS active_courses CASCADE;")
            print("  active_courses table dropped")
        else:
            print("\n Step 4: No active_courses to migrate - skipping")

        print("\n Step 6: Creating indexes for better performance...")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_courses_uploader_id ON courses(uploader_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(course_category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(course_level);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_courses_rating ON courses(rating);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at);")
        print("  Indexes created")

        conn.commit()
        print("\n Migration completed successfully!")

        # Show table structure
        print("\n New courses table structure:")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'courses'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print(f"  {'Column':<20} {'Type':<20} {'Nullable':<10} {'Default'}")
        print("  " + "-" * 70)
        for col in columns:
            print(f"  {col[0]:<20} {col[1]:<20} {col[2]:<10} {col[3] or ''}")

        # Show record count
        cursor.execute("SELECT COUNT(*) FROM courses;")
        count = cursor.fetchone()[0]
        print(f"\n  Total courses: {count}")

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
    print("COURSES TABLE SCHEMA UPDATE MIGRATION")
    print("=" * 60)
    run_migration()
