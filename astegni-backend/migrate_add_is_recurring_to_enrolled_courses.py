"""
Migration: Add is_recurring boolean column to enrolled_courses table
Also ensures package_id allows NULL values
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
    """Add is_recurring column to enrolled_courses table"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Adding is_recurring column to 'enrolled_courses' table...")

                # Check if is_recurring column already exists
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'enrolled_courses'
                    AND column_name = 'is_recurring'
                """))

                if result.fetchone():
                    print("is_recurring column already exists. Skipping...")
                else:
                    # Add is_recurring boolean column
                    print("  Adding is_recurring column...")
                    conn.execute(text("""
                        ALTER TABLE enrolled_courses
                        ADD COLUMN is_recurring BOOLEAN DEFAULT TRUE
                    """))
                    print("  ✓ is_recurring added")

                    # Create index for is_recurring for faster queries
                    print("  Creating index on is_recurring...")
                    conn.execute(text("""
                        CREATE INDEX IF NOT EXISTS idx_enrolled_is_recurring
                        ON enrolled_courses(is_recurring)
                    """))
                    print("  ✓ Index created")

                    # Update is_recurring based on existing schedule_type values
                    print("  Syncing is_recurring with schedule_type...")
                    conn.execute(text("""
                        UPDATE enrolled_courses
                        SET is_recurring = (schedule_type = 'recurring')
                        WHERE schedule_type IS NOT NULL
                    """))
                    print("  ✓ is_recurring synced with schedule_type")

                # Verify package_id allows NULL (it should already)
                print("\nVerifying package_id allows NULL...")
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
                    print("  Updating package_id to allow NULL...")
                    conn.execute(text("""
                        ALTER TABLE enrolled_courses
                        ALTER COLUMN package_id DROP NOT NULL
                    """))
                    print("  ✓ package_id now allows NULL values")

                # Commit transaction
                trans.commit()

                print("\n" + "=" * 60)
                print("MIGRATION COMPLETED SUCCESSFULLY!")
                print("=" * 60)
                print("\nChanges made:")
                print("  - is_recurring (BOOLEAN): TRUE for recurring, FALSE for specific dates")
                print("  - package_id: Confirmed to allow NULL values")
                print("\nUsage:")
                print("  - is_recurring = TRUE  → Uses year_range, months, days")
                print("  - is_recurring = FALSE → Uses specific_dates array")
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
