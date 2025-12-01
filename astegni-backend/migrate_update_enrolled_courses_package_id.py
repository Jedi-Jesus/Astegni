"""
Migration: Update enrolled_courses table to make package_id NOT NULL
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
    """Update enrolled_courses to make package_id NOT NULL"""
    engine = create_engine(DATABASE_URL)

    try:
        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("Checking for NULL package_id values...")

                # Check if there are any NULL values
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM enrolled_courses WHERE package_id IS NULL
                """))
                null_count = result.scalar()

                if null_count > 0:
                    print(f"⚠ Found {null_count} rows with NULL package_id")
                    print("These rows need to be updated before making package_id NOT NULL")
                    print("\nPlease either:")
                    print("  1. Delete these rows, OR")
                    print("  2. Update them with valid package_id values")
                    trans.rollback()
                    return

                print("✓ No NULL package_id values found")

                print("\nUpdating enrolled_courses table...")

                # Alter column to NOT NULL
                conn.execute(text("""
                    ALTER TABLE enrolled_courses
                    ALTER COLUMN package_id SET NOT NULL
                """))

                print("✓ package_id column updated to NOT NULL")

                # Commit transaction
                trans.commit()
                print("\n✅ Migration completed successfully!")
                print("\nUpdated structure:")
                print("  - package_id is now NOT NULL (required field)")

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
