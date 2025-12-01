"""
Migration: Refactor to enrolled_students table
This migration:
1. Creates enrolled_students table with simplified fields
2. Migrates existing data from tutor_students
3. Drops the old tutor_students table
"""
import psycopg
from datetime import datetime
import sys

# Fix encoding for Windows console
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def run_migration():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("🔄 Starting tutor_students table refactoring migration...")

        # Step 1: Check if old tutor_students table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'tutor_students'
            );
        """)
        old_table_exists = cur.fetchone()[0]

        if not old_table_exists:
            print("⚠️  Old tutor_students table doesn't exist. Creating new table from scratch...")

        # Step 2: Create backup of old table if it exists
        if old_table_exists:
            print("📦 Creating backup of old tutor_students table...")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS tutor_students_backup AS
                SELECT * FROM tutor_students;
            """)
            conn.commit()
            print("✅ Backup created as 'tutor_students_backup'")

        # Step 3: Drop the old tutor_students table
        if old_table_exists:
            print("🗑️  Dropping old tutor_students table...")
            cur.execute("DROP TABLE IF EXISTS tutor_students CASCADE;")
            conn.commit()
            print("✅ Old table dropped")

        # Step 4: Create new enrolled_students table with simplified schema
        print("🔨 Creating new enrolled_students table...")
        cur.execute("""
            CREATE TABLE enrolled_students (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
                student_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
                package_name VARCHAR(255),
                session_request_id INTEGER,
                enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()
        print("✅ enrolled_students table created")

        # Step 5: Create indexes for performance
        print("📊 Creating indexes...")
        cur.execute("""
            CREATE INDEX idx_enrolled_students_tutor_id ON enrolled_students(tutor_id);
            CREATE INDEX idx_enrolled_students_student_id ON enrolled_students(student_id);
        """)
        conn.commit()
        print("✅ Indexes created")

        # Step 6: Migrate data from backup if it exists
        if old_table_exists:
            print("📊 Migrating data from tutor_students_backup to enrolled_students...")
            # The old table structure may vary, we'll migrate what we can
            cur.execute("""
                INSERT INTO enrolled_students (
                    tutor_id,
                    student_id,
                    package_name,
                    session_request_id,
                    enrolled_at,
                    created_at,
                    updated_at
                )
                SELECT
                    b.tutor_id,
                    b.student_profile_id as student_id,  -- Already profile ID
                    b.package_name,
                    b.session_request_id,
                    b.enrolled_at,
                    b.created_at,
                    b.updated_at
                FROM tutor_students_backup b
                WHERE b.student_profile_id IS NOT NULL;
            """)
            conn.commit()

            # Get migration stats
            cur.execute("SELECT COUNT(*) FROM enrolled_students;")
            migrated_count = cur.fetchone()[0]
            print(f"✅ Migrated {migrated_count} records to enrolled_students table")

        print("\n✨ Migration completed successfully!")
        print("\n📋 New enrolled_students table schema:")
        print("   - id (SERIAL PRIMARY KEY)")
        print("   - tutor_id (INTEGER, FK to tutor_profiles)")
        print("   - student_id (INTEGER, FK to student_profiles)")
        print("   - package_name (VARCHAR(255))")
        print("   - session_request_id (INTEGER)")
        print("   - enrolled_at (TIMESTAMP)")
        print("   - created_at (TIMESTAMP)")
        print("   - updated_at (TIMESTAMP)")

        if old_table_exists:
            print("\n💡 Old data backed up in 'tutor_students_backup' table")
            print("   You can drop this backup table later with: DROP TABLE tutor_students_backup;")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
