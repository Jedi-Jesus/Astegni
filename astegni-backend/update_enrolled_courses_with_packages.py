"""
Update enrolled_courses records with package_id values
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

def update_packages():
    """Update enrolled_courses with package_id values"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Fetching enrolled_courses with NULL package_id...")

                # Get all enrolled_courses with NULL package_id
                result = conn.execute(text("""
                    SELECT id, tutor_id, student_id, course_id
                    FROM enrolled_courses
                    WHERE package_id IS NULL
                """))
                enrollments = result.fetchall()

                print(f"Found {len(enrollments)} enrollments with NULL package_id\n")

                updated_count = 0

                for enrollment in enrollments:
                    # Get packages for this tutor
                    packages_result = conn.execute(
                        text("""
                            SELECT id, name FROM tutor_packages
                            WHERE tutor_id = :tutor_id AND is_active = true
                            LIMIT 5
                        """),
                        {"tutor_id": enrollment.tutor_id}
                    )
                    packages = packages_result.fetchall()

                    if packages:
                        # Pick a random package for this enrollment
                        package = random.choice(packages)

                        # Update the enrollment
                        conn.execute(
                            text("""
                                UPDATE enrolled_courses
                                SET package_id = :package_id
                                WHERE id = :enrollment_id
                            """),
                            {
                                "package_id": package.id,
                                "enrollment_id": enrollment.id
                            }
                        )

                        updated_count += 1
                        print(f"  ✓ Enrollment {enrollment.id}: Assigned package '{package.name}' (ID: {package.id})")
                    else:
                        print(f"  ⚠ Enrollment {enrollment.id}: No packages found for tutor {enrollment.tutor_id}")

                # Commit transaction
                trans.commit()
                print(f"\n✅ Successfully updated {updated_count} enrollments with package_id!")

                # Show remaining NULL values
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM enrolled_courses WHERE package_id IS NULL
                """))
                remaining_null = result.scalar()

                if remaining_null > 0:
                    print(f"\n⚠ Warning: {remaining_null} enrollments still have NULL package_id")
                    print("These tutors may not have any active packages.")
                else:
                    print("\n✓ All enrollments now have package_id values")

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
    update_packages()
