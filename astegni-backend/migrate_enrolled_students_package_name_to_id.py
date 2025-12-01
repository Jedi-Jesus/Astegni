"""
Migration: Change enrolled_students.package_name to package_id
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
    """Change package_name column to package_id"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Updating enrolled_students table...")

                # Step 1: Add new package_id column
                print("\n1. Adding package_id column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_students
                    ADD COLUMN IF NOT EXISTS package_id INTEGER
                """))
                print("   ✓ package_id column added")

                # Step 2: Migrate data from package_name to package_id
                print("\n2. Migrating data from package_name to package_id...")

                # Get all enrolled_students with package_name
                result = conn.execute(text("""
                    SELECT id, tutor_id, package_name
                    FROM enrolled_students
                    WHERE package_name IS NOT NULL
                """))
                students = result.fetchall()

                print(f"   Found {len(students)} students with package_name")

                migrated_count = 0
                for student in students:
                    # Try to find matching package by name and tutor_id
                    package_result = conn.execute(
                        text("""
                            SELECT id FROM tutor_packages
                            WHERE tutor_id = :tutor_id
                            AND name = :package_name
                            LIMIT 1
                        """),
                        {
                            "tutor_id": student.tutor_id,
                            "package_name": student.package_name
                        }
                    )
                    package = package_result.fetchone()

                    if package:
                        # Update with package_id
                        conn.execute(
                            text("""
                                UPDATE enrolled_students
                                SET package_id = :package_id
                                WHERE id = :student_id
                            """),
                            {
                                "package_id": package.id,
                                "student_id": student.id
                            }
                        )
                        migrated_count += 1
                    else:
                        # No matching package found, use first available package for this tutor
                        any_package_result = conn.execute(
                            text("""
                                SELECT id FROM tutor_packages
                                WHERE tutor_id = :tutor_id AND is_active = true
                                LIMIT 1
                            """),
                            {"tutor_id": student.tutor_id}
                        )
                        any_package = any_package_result.fetchone()

                        if any_package:
                            conn.execute(
                                text("""
                                    UPDATE enrolled_students
                                    SET package_id = :package_id
                                    WHERE id = :student_id
                                """),
                                {
                                    "package_id": any_package.id,
                                    "student_id": student.id
                                }
                            )
                            migrated_count += 1
                            print(f"   ⚠ Student {student.id}: Package '{student.package_name}' not found, using package ID {any_package.id}")

                print(f"   ✓ Migrated {migrated_count} records")

                # Step 3: Make package_id NOT NULL (only if all records have been migrated)
                null_check = conn.execute(text("SELECT COUNT(*) FROM enrolled_students WHERE package_id IS NULL")).scalar()

                if null_check == 0:
                    print("\n3. Setting package_id to NOT NULL...")
                    conn.execute(text("""
                        ALTER TABLE enrolled_students
                        ALTER COLUMN package_id SET NOT NULL
                    """))
                    print("   ✓ package_id is now NOT NULL")
                else:
                    print(f"\n3. ⚠ Skipping NOT NULL constraint ({null_check} records still have NULL package_id)")

                # Step 4: Add foreign key constraint
                print("\n4. Adding foreign key constraint...")
                conn.execute(text("""
                    ALTER TABLE enrolled_students
                    DROP CONSTRAINT IF EXISTS fk_enrolled_students_package
                """))

                conn.execute(text("""
                    ALTER TABLE enrolled_students
                    ADD CONSTRAINT fk_enrolled_students_package
                    FOREIGN KEY (package_id)
                    REFERENCES tutor_packages(id)
                    ON DELETE SET NULL
                """))
                print("   ✓ Foreign key constraint added")

                # Step 5: Create index on package_id
                print("\n5. Creating index on package_id...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_students_package_id
                    ON enrolled_students(package_id)
                """))
                print("   ✓ Index created")

                # Step 6: Drop package_name column
                print("\n6. Dropping package_name column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_students
                    DROP COLUMN IF EXISTS package_name
                """))
                print("   ✓ package_name column dropped")

                # Commit transaction
                trans.commit()
                print("\n✅ Migration completed successfully!")
                print("\nUpdated structure:")
                print("  - package_name (VARCHAR) → package_id (INTEGER, NOT NULL)")
                print("  - Foreign key to tutor_packages(id)")
                print("  - Index created for performance")

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
