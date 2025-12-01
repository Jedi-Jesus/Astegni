"""
Update enrolled_students records with NULL package_id
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import random

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def update_null_packages():
    """Update enrolled_students with NULL package_id"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Fetching enrolled_students with NULL package_id...")

                # Get all with NULL package_id
                result = conn.execute(text("""
                    SELECT id, tutor_id, student_id
                    FROM enrolled_students
                    WHERE package_id IS NULL
                """))
                students = result.fetchall()

                print(f"Found {len(students)} students with NULL package_id\n")

                updated_count = 0

                for student in students:
                    # Get packages for this tutor
                    packages_result = conn.execute(
                        text("""
                            SELECT id, name FROM tutor_packages
                            WHERE tutor_id = :tutor_id AND is_active = true
                            LIMIT 5
                        """),
                        {"tutor_id": student.tutor_id}
                    )
                    packages = packages_result.fetchall()

                    if packages:
                        # Pick a random package
                        package = random.choice(packages)

                        # Update the record
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

                        updated_count += 1
                        print(f"  ✓ Student {student.id}: Assigned package '{package.name}' (ID: {package.id})")
                    else:
                        print(f"  ⚠ Student {student.id}: No packages found for tutor {student.tutor_id}")

                # Commit transaction
                trans.commit()
                print(f"\n✅ Successfully updated {updated_count} students with package_id!")

                # Check remaining NULL values
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM enrolled_students WHERE package_id IS NULL
                """))
                remaining_null = result.scalar()

                if remaining_null == 0:
                    print("\n✓ All students now have package_id values")

                    # Now make it NOT NULL
                    print("\nSetting package_id to NOT NULL...")
                    trans2 = conn.begin()
                    try:
                        conn.execute(text("""
                            ALTER TABLE enrolled_students
                            ALTER COLUMN package_id SET NOT NULL
                        """))
                        trans2.commit()
                        print("✓ package_id is now NOT NULL")
                    except Exception as e:
                        trans2.rollback()
                        print(f"✗ Failed to set NOT NULL: {e}")
                else:
                    print(f"\n⚠ Warning: {remaining_null} students still have NULL package_id")

            except Exception as e:
                trans.rollback()
                print(f"✗ Error during update: {e}")
                raise

    except Exception as e:
        print(f"✗ Update failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    update_null_packages()
