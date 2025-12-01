"""
Migration: Create enrolled_courses table
Tracks student enrollments in courses with tutors
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
    """Create enrolled_courses table"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Creating 'enrolled_courses' table...")

                # Create enrolled_courses table
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS enrolled_courses (
                        id SERIAL PRIMARY KEY,
                        tutor_id INTEGER NOT NULL,
                        student_id INTEGER NOT NULL,
                        course_id INTEGER NOT NULL,
                        package_id INTEGER,
                        enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                        -- Foreign key constraints
                        CONSTRAINT fk_enrolled_tutor
                            FOREIGN KEY (tutor_id)
                            REFERENCES tutor_profiles(id)
                            ON DELETE CASCADE,

                        CONSTRAINT fk_enrolled_student
                            FOREIGN KEY (student_id)
                            REFERENCES student_profiles(id)
                            ON DELETE CASCADE,

                        CONSTRAINT fk_enrolled_course
                            FOREIGN KEY (course_id)
                            REFERENCES courses(id)
                            ON DELETE CASCADE,

                        -- Unique constraint to prevent duplicate enrollments
                        CONSTRAINT unique_enrollment
                            UNIQUE (tutor_id, student_id, course_id)
                    )
                """))

                print("✓ enrolled_courses table created successfully")

                # Create index for faster queries
                print("Creating indexes...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_tutor_id
                    ON enrolled_courses(tutor_id)
                """))

                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_student_id
                    ON enrolled_courses(student_id)
                """))

                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_course_id
                    ON enrolled_courses(course_id)
                """))

                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_package_id
                    ON enrolled_courses(package_id)
                """))

                print("✓ Indexes created successfully")

                # Create trigger to auto-update updated_at timestamp
                print("Creating trigger for auto-update timestamp...")
                conn.execute(text("""
                    CREATE OR REPLACE FUNCTION update_enrolled_courses_updated_at()
                    RETURNS TRIGGER AS $$
                    BEGIN
                        NEW.updated_at = CURRENT_TIMESTAMP;
                        RETURN NEW;
                    END;
                    $$ LANGUAGE plpgsql
                """))

                conn.execute(text("""
                    DROP TRIGGER IF EXISTS trigger_update_enrolled_courses_updated_at
                    ON enrolled_courses
                """))

                conn.execute(text("""
                    CREATE TRIGGER trigger_update_enrolled_courses_updated_at
                    BEFORE UPDATE ON enrolled_courses
                    FOR EACH ROW
                    EXECUTE FUNCTION update_enrolled_courses_updated_at()
                """))

                print("✓ Auto-update trigger created successfully")

                # Commit transaction
                trans.commit()
                print("\n✅ Migration completed successfully!")
                print("\nTable structure:")
                print("  - id (SERIAL PRIMARY KEY)")
                print("  - tutor_id (INTEGER, FK to tutor_profiles)")
                print("  - student_id (INTEGER, FK to student_profiles)")
                print("  - course_id (INTEGER, FK to courses)")
                print("  - package_id (INTEGER, nullable)")
                print("  - enrolled_at (TIMESTAMP)")
                print("  - created_at (TIMESTAMP)")
                print("  - updated_at (TIMESTAMP, auto-updated)")
                print("\nConstraints:")
                print("  - Unique: (tutor_id, student_id, course_id)")
                print("  - Foreign keys with CASCADE delete")
                print("\nIndexes created on: tutor_id, student_id, course_id, package_id")

            except Exception as e:
                trans.rollback()
                print(f"✗ Error during migration: {e}")
                raise

    except Exception as e:
        print(f"✗ Migration failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    migrate()
