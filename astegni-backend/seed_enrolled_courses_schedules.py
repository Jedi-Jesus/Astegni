"""
Seed data for schedule fields in enrolled_courses table
Updates existing enrollments with schedule information
"""
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import random
import json

# Set UTF-8 encoding for console output
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

# Sample schedule configurations
RECURRING_SCHEDULES = [
    {
        "schedule_type": "recurring",
        "year_range": [2024, 2025],
        "months": [1, 2, 3, 4, 5, 6],  # First semester
        "days": ["Monday", "Wednesday", "Friday"],
        "start_time": "09:00:00",
        "end_time": "10:30:00"
    },
    {
        "schedule_type": "recurring",
        "year_range": [2025],
        "months": [1, 2, 3, 4, 5],
        "days": ["Tuesday", "Thursday"],
        "start_time": "14:00:00",
        "end_time": "15:30:00"
    },
    {
        "schedule_type": "recurring",
        "year_range": [2024, 2025],
        "months": [9, 10, 11, 12],  # Second semester
        "days": ["Monday", "Wednesday"],
        "start_time": "16:00:00",
        "end_time": "17:30:00"
    },
    {
        "schedule_type": "recurring",
        "year_range": [2025],
        "months": [1, 2, 3],
        "days": ["Saturday"],
        "start_time": "10:00:00",
        "end_time": "12:00:00"
    },
    {
        "schedule_type": "recurring",
        "year_range": [2024, 2025],
        "months": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],  # Year-round
        "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "start_time": "08:00:00",
        "end_time": "09:00:00"
    }
]

SPECIFIC_DATE_SCHEDULES = [
    {
        "schedule_type": "specific_dates",
        "year_range": [],
        "months": [],
        "days": [],
        "specific_dates": ["2025-01-05", "2025-01-12", "2025-01-19", "2025-01-26"],
        "start_time": "10:00:00",
        "end_time": "12:00:00"
    },
    {
        "schedule_type": "specific_dates",
        "year_range": [],
        "months": [],
        "days": [],
        "specific_dates": ["2025-02-01", "2025-02-08", "2025-02-15", "2025-02-22"],
        "start_time": "14:00:00",
        "end_time": "16:00:00"
    },
    {
        "schedule_type": "specific_dates",
        "year_range": [],
        "months": [],
        "days": [],
        "specific_dates": ["2025-03-01", "2025-03-15", "2025-03-29"],
        "start_time": "09:00:00",
        "end_time": "11:00:00"
    },
    {
        "schedule_type": "specific_dates",
        "year_range": [],
        "months": [],
        "days": [],
        "specific_dates": ["2025-01-10", "2025-01-17", "2025-01-24", "2025-01-31", "2025-02-07"],
        "start_time": "18:00:00",
        "end_time": "19:30:00"
    },
    {
        "schedule_type": "specific_dates",
        "year_range": [],
        "months": [],
        "days": [],
        "specific_dates": ["2025-04-05", "2025-04-19", "2025-05-03", "2025-05-17"],
        "start_time": "11:00:00",
        "end_time": "13:00:00"
    }
]

def seed_schedules():
    """Update existing enrollments with schedule data"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                # Check if schedule_type column exists
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'enrolled_courses'
                    AND column_name = 'schedule_type'
                """))

                if not result.fetchone():
                    print("ERROR: Schedule columns do not exist!")
                    print("Please run 'migrate_add_schedule_to_enrolled_courses.py' first.")
                    return

                # Get all enrollments
                result = conn.execute(text("SELECT id FROM enrolled_courses"))
                enrollments = [row.id for row in result.fetchall()]

                if not enrollments:
                    print("No enrollments found to update.")
                    return

                print(f"Found {len(enrollments)} enrollments to update with schedule data...")

                updated_count = 0
                recurring_count = 0
                specific_count = 0

                for enrollment_id in enrollments:
                    # Randomly choose between recurring (70%) and specific dates (30%)
                    if random.random() < 0.7:
                        schedule = random.choice(RECURRING_SCHEDULES)
                        recurring_count += 1
                    else:
                        schedule = random.choice(SPECIFIC_DATE_SCHEDULES)
                        specific_count += 1

                    # Update the enrollment
                    conn.execute(
                        text("""
                            UPDATE enrolled_courses
                            SET
                                schedule_type = :schedule_type,
                                year_range = :year_range,
                                months = :months,
                                days = :days,
                                specific_dates = :specific_dates,
                                start_time = :start_time,
                                end_time = :end_time
                            WHERE id = :id
                        """),
                        {
                            "id": enrollment_id,
                            "schedule_type": schedule["schedule_type"],
                            "year_range": json.dumps(schedule["year_range"]),
                            "months": json.dumps(schedule["months"]),
                            "days": json.dumps(schedule["days"]),
                            "specific_dates": json.dumps(schedule.get("specific_dates", [])),
                            "start_time": schedule["start_time"],
                            "end_time": schedule["end_time"]
                        }
                    )

                    updated_count += 1
                    print(f"  ✓ Updated enrollment {enrollment_id}: {schedule['schedule_type']}")

                # Commit transaction
                trans.commit()

                print("\n" + "=" * 60)
                print("SCHEDULE SEEDING COMPLETED!")
                print("=" * 60)
                print(f"\nTotal enrollments updated: {updated_count}")
                print(f"  - Recurring schedules: {recurring_count}")
                print(f"  - Specific date schedules: {specific_count}")

                # Show sample data
                print("\n" + "-" * 60)
                print("Sample Updated Enrollments:")
                print("-" * 60)

                result = conn.execute(text("""
                    SELECT id, schedule_type, year_range, months, days,
                           specific_dates, start_time, end_time
                    FROM enrolled_courses
                    LIMIT 5
                """))

                for row in result.fetchall():
                    print(f"\nEnrollment ID: {row.id}")
                    print(f"  Schedule Type: {row.schedule_type}")
                    if row.schedule_type == 'recurring':
                        print(f"  Year Range: {row.year_range}")
                        print(f"  Months: {row.months}")
                        print(f"  Days: {row.days}")
                    else:
                        print(f"  Specific Dates: {row.specific_dates}")
                    print(f"  Time: {row.start_time} - {row.end_time}")

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
    seed_schedules()
