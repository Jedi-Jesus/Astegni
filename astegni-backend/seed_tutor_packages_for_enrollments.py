"""
Create sample packages for tutors who have enrolled students
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

def create_packages():
    """Create sample packages for tutors"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Fetching tutors from enrolled_courses...")

                # Get unique tutors from enrolled_courses
                result = conn.execute(text("""
                    SELECT DISTINCT tutor_id FROM enrolled_courses
                """))
                tutor_ids = [row.tutor_id for row in result.fetchall()]

                print(f"Found {len(tutor_ids)} tutors with enrollments\n")

                packages_created = 0

                for tutor_id in tutor_ids:
                    # Check if tutor already has packages
                    check_result = conn.execute(
                        text("SELECT COUNT(*) FROM tutor_packages WHERE tutor_id = :tutor_id"),
                        {"tutor_id": tutor_id}
                    )
                    existing_packages = check_result.scalar()

                    if existing_packages > 0:
                        print(f"  ✓ Tutor {tutor_id}: Already has {existing_packages} packages")
                        continue

                    # Create 2-3 sample packages for this tutor
                    num_packages = random.randint(2, 3)

                    package_templates = [
                        {
                            "name": "Basic Package",
                            "description": "Foundational learning package for beginners",
                            "hourly_rate": 150.00,
                            "days_per_week": 2,
                            "hours_per_day": 1.5
                        },
                        {
                            "name": "Standard Package",
                            "description": "Comprehensive learning package for intermediate students",
                            "hourly_rate": 200.00,
                            "days_per_week": 3,
                            "hours_per_day": 2.0
                        },
                        {
                            "name": "Premium Package",
                            "description": "Intensive learning package for advanced students",
                            "hourly_rate": 300.00,
                            "days_per_week": 4,
                            "hours_per_day": 2.5
                        },
                        {
                            "name": "Exam Prep Package",
                            "description": "Focused preparation for exams and assessments",
                            "hourly_rate": 250.00,
                            "days_per_week": 3,
                            "hours_per_day": 2.0
                        }
                    ]

                    selected_templates = random.sample(package_templates, num_packages)

                    for template in selected_templates:
                        conn.execute(
                            text("""
                                INSERT INTO tutor_packages
                                (tutor_id, name, description, hourly_rate, days_per_week, hours_per_day,
                                 payment_frequency, session_format, schedule_type, is_active)
                                VALUES
                                (:tutor_id, :name, :description, :hourly_rate, :days_per_week, :hours_per_day,
                                 'Monthly', 'Online', 'Flexible', true)
                            """),
                            {
                                "tutor_id": tutor_id,
                                "name": template["name"],
                                "description": template["description"],
                                "hourly_rate": template["hourly_rate"],
                                "days_per_week": template["days_per_week"],
                                "hours_per_day": template["hours_per_day"]
                            }
                        )
                        packages_created += 1

                    print(f"  ✓ Tutor {tutor_id}: Created {num_packages} packages")

                # Commit transaction
                trans.commit()
                print(f"\n✅ Successfully created {packages_created} packages for {len(tutor_ids)} tutors!")

            except Exception as e:
                trans.rollback()
                print(f"✗ Error during seeding: {e}")
                raise

    except Exception as e:
        print(f"✗ Seeding failed: {e}")
        return

    finally:
        engine.dispose()

if __name__ == "__main__":
    create_packages()
