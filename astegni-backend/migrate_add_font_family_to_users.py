"""
Migration: Add font_family column to users table
Adds font_family column to store user's selected font preference
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv('DATABASE_URL')

# Create engine
engine = create_engine(DATABASE_URL)

def run_migration():
    """Add font_family column to users table"""

    print("Starting migration: Add font_family to users table...")

    with engine.connect() as conn:
        try:
            # Add font_family column
            print("Adding font_family column...")

            # Font family (system/inter/roboto/open-sans/comic-neue/caveat/patrick-hand/dancing-script)
            conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS font_family VARCHAR(50) DEFAULT 'system'
            """))
            conn.commit()
            print("OK - Added 'font_family' column")

            print("\nSUCCESS - Migration completed successfully!")
            print("\nNew column added to users table:")
            print("  - font_family (VARCHAR): system/inter/roboto/open-sans/comic-neue/caveat/patrick-hand/dancing-script")

        except Exception as e:
            print(f"\nERROR - Migration failed: {str(e)}")
            conn.rollback()
            raise

def verify_migration():
    """Verify the migration was successful"""

    print("\nVerifying migration...")

    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            AND column_name = 'font_family'
        """))

        column = result.fetchone()

        if column:
            print("\nSUCCESS - Verification successful! Column present:")
            print(f"  - {column[0]}: {column[1]} (default: {column[2]})")
        else:
            print("\nERROR - Column 'font_family' not found!")

if __name__ == "__main__":
    print("=" * 60)
    print("FONT FAMILY MIGRATION")
    print("=" * 60)
    print()

    run_migration()
    verify_migration()

    print("\n" + "=" * 60)
    print("Next steps:")
    print("1. Update User model in models.py to include font_family column")
    print("2. Update appearance_settings_endpoints.py to handle font_family")
    print("3. Restart the backend server")
    print("4. Test font family selection in appearance modal")
    print("=" * 60)
