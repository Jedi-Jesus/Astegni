"""
Migration: Drop student_tutors table
This migration removes the student_tutors table as we now only use tutor_students table
for tracking tutor-student relationships.
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
        print("🔄 Starting student_tutors table removal migration...")

        # Step 1: Check if student_tutors table exists
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'student_tutors'
            );
        """)
        table_exists = cur.fetchone()[0]

        if not table_exists:
            print("⚠️  student_tutors table doesn't exist. Nothing to drop.")
            return

        # Step 2: Create backup of student_tutors table before dropping
        print("📦 Creating backup of student_tutors table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS student_tutors_backup AS
            SELECT * FROM student_tutors;
        """)
        conn.commit()

        # Get count for logging
        cur.execute("SELECT COUNT(*) FROM student_tutors_backup;")
        backup_count = cur.fetchone()[0]
        print(f"✅ Backup created with {backup_count} records as 'student_tutors_backup'")

        # Step 3: Drop the student_tutors table
        print("🗑️  Dropping student_tutors table...")
        cur.execute("DROP TABLE IF EXISTS student_tutors CASCADE;")
        conn.commit()
        print("✅ student_tutors table dropped successfully")

        # Step 4: Remove StudentTutor model from models.py (manual step)
        print("\n⚠️  MANUAL STEP REQUIRED:")
        print("   Please remove the 'StudentTutor' class from:")
        print("   astegni-backend/app.py modules/models.py")
        print("   (Lines around 1689-1706)")

        print("\n✨ Migration completed successfully!")
        print("\n💡 Backup information:")
        print("   - Data backed up in 'student_tutors_backup' table")
        print("   - You can restore if needed or drop the backup table with:")
        print("     DROP TABLE student_tutors_backup;")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Migration failed: {str(e)}")
        raise

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    run_migration()
