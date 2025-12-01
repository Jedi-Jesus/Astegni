"""
Migration: Add schedule fields to enrolled_courses table
Adds schedule_type, is_recurring, year_range, months, days, specific_dates, start_time, end_time
Also ensures package_id allows NULL
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
    """Add schedule fields to enrolled_courses table"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Adding schedule fields to 'enrolled_courses' table...")

                # Check if columns already exist
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'enrolled_courses'
                    AND column_name = 'schedule_type'
                """))

                if result.fetchone():
                    print("Schedule fields already exist. Skipping migration.")
                    trans.rollback()
                    return

                # Ensure package_id allows NULL
                print("  Verifying package_id allows NULL...")
                result = conn.execute(text("""
                    SELECT is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'enrolled_courses'
                    AND column_name = 'package_id'
                """))
                row = result.fetchone()
                if row and row.is_nullable == 'YES':
                    print("  ✓ package_id already allows NULL values")
                else:
                    conn.execute(text("""
                        ALTER TABLE enrolled_courses
                        ALTER COLUMN package_id DROP NOT NULL
                    """))
                    print("  ✓ package_id now allows NULL values")

                # Add schedule_type column (enum: 'recurring' or 'specific_dates')
                print("  Adding schedule_type column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN schedule_type VARCHAR(20) DEFAULT 'recurring'
                    CHECK (schedule_type IN ('recurring', 'specific_dates'))
                """))
                print("  ✓ schedule_type added")

                # Add is_recurring boolean column for easier querying
                print("  Adding is_recurring column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN is_recurring BOOLEAN DEFAULT TRUE
                """))
                print("  ✓ is_recurring added")

                # Add year_range column (JSON array of years, e.g., [2024, 2025])
                print("  Adding year_range column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN year_range JSONB DEFAULT '[]'::jsonb
                """))
                print("  ✓ year_range added")

                # Add months column (JSON array of month numbers 1-12, e.g., [1, 2, 3])
                print("  Adding months column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN months JSONB DEFAULT '[]'::jsonb
                """))
                print("  ✓ months added")

                # Add days column (JSON array of day names or numbers)
                # e.g., ["Monday", "Wednesday", "Friday"] or [1, 3, 5]
                print("  Adding days column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN days JSONB DEFAULT '[]'::jsonb
                """))
                print("  ✓ days added")

                # Add specific_dates column (JSON array of date strings)
                # e.g., ["2024-12-01", "2024-12-08", "2024-12-15"]
                print("  Adding specific_dates column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN specific_dates JSONB DEFAULT '[]'::jsonb
                """))
                print("  ✓ specific_dates added")

                # Add start_time column (TIME format, e.g., '09:00:00')
                print("  Adding start_time column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN start_time TIME
                """))
                print("  ✓ start_time added")

                # Add end_time column (TIME format, e.g., '10:30:00')
                print("  Adding end_time column...")
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ADD COLUMN end_time TIME
                """))
                print("  ✓ end_time added")

                # Create index for schedule_type for faster queries
                print("  Creating index on schedule_type...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_schedule_type
                    ON enrolled_courses(schedule_type)
                """))
                print("  ✓ Index on schedule_type created")

                # Create index for is_recurring for faster queries
                print("  Creating index on is_recurring...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_enrolled_is_recurring
                    ON enrolled_courses(is_recurring)
                """))
                print("  ✓ Index on is_recurring created")

                # Commit transaction
                trans.commit()

                print("\n" + "=" * 60)
                print("MIGRATION COMPLETED SUCCESSFULLY!")
                print("=" * 60)
                print("\nNew columns added to enrolled_courses:")
                print("  - package_id: Allows NULL values")
                print("  - schedule_type (VARCHAR(20)): 'recurring' or 'specific_dates'")
                print("  - is_recurring (BOOLEAN): TRUE for recurring, FALSE for specific dates")
                print("  - year_range (JSONB): Array of years, e.g., [2024, 2025]")
                print("  - months (JSONB): Array of month numbers 1-12")
                print("  - days (JSONB): Array of day names, e.g., ['Monday', 'Wednesday']")
                print("  - specific_dates (JSONB): Array of date strings")
                print("  - start_time (TIME): Session start time, e.g., '09:00:00'")
                print("  - end_time (TIME): Session end time, e.g., '10:30:00'")
                print("\nUsage Examples:")
                print("-" * 60)
                print("RECURRING Schedule:")
                print("  schedule_type: 'recurring'")
                print("  year_range: [2024, 2025]")
                print("  months: [1, 2, 3, 4, 5, 6]  (Jan-Jun)")
                print("  days: ['Monday', 'Wednesday', 'Friday']")
                print("  start_time: '09:00:00'")
                print("  end_time: '10:30:00'")
                print("-" * 60)
                print("SPECIFIC DATES Schedule:")
                print("  schedule_type: 'specific_dates'")
                print("  specific_dates: ['2024-12-01', '2024-12-08', '2024-12-15']")
                print("  start_time: '14:00:00'")
                print("  end_time: '15:30:00'")
                print("=" * 60)

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
