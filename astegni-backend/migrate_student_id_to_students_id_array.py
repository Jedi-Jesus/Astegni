"""
Migration: Change enrolled_courses.student_id to students_id (INTEGER ARRAY)
Supports multiple students enrolling in one course
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    """Change student_id to students_id array"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Updating enrolled_courses table...")
                print("\n1. Adding new students_id column (INTEGER ARRAY)...")

                # Add new students_id column as array
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN IF NOT EXISTS students_id INTEGER[] DEFAULT '{}'
                """))
                print("   ✓ students_id column added")

                print("\n2. Migrating data from student_id to students_id...")

                # Migrate existing student_id values to students_id array
                conn.execute(text("""
                    UPDATE enrolled_courses
                    SET students_id = ARRAY[student_id]
                    WHERE student_id IS NOT NULL
                """))

                # Get count of migrated records
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM enrolled_courses WHERE students_id IS NOT NULL
                """))
                migrated_count = result.scalar()
                print(f"   ✓ Migrated {migrated_count} records")

                print("\n3. Making students_id NOT NULL...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ALTER COLUMN students_id SET NOT NULL
                """))
                print("   ✓ students_id is now NOT NULL")

                print("\n4. Dropping old student_id column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    DROP COLUMN IF EXISTS student_id
                """))
                print("   ✓ student_id column dropped")

                print("\n5. Creating index on students_id...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_courses_students_id
                    ON enrolled_courses USING GIN (students_id)
                """))
                print("   ✓ GIN index created for array queries")

                print("\n6. Dropping old foreign key constraint...")
                # Try to drop the old FK constraint if it exists
                try:
                    conn.execute(text("""
                        ALTER TABLE enrolled_courses
                        DROP CONSTRAINT IF EXISTS fk_enrolled_student
                    """))
                    print("   ✓ Old foreign key constraint dropped")
                except:
                    print("   ℹ No old foreign key constraint found")

                # Commit transaction
                trans.commit()
                print("\n✅ Migration completed successfully!")
                print("\nUpdated structure:")
                print("  - student_id (INTEGER) → students_id (INTEGER[])")
                print("  - students_id is NOT NULL")
                print("  - GIN index for efficient array queries")
                print("  - Can now store multiple students per enrollment")
                print("\nExample:")
                print("  - Single student: students_id = [28]")
                print("  - Multiple students: students_id = [28, 26, 25]")

            except Exception as e:
                trans.rollback()
                print(f"\n✗ Error during migration: {e}")
                raise

    except Exception as e:
        print(f"\n✗ Migration failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    migrate()
