"""
Migration: Add expertise_badge field to tutor_profiles table
This field will store the expertise badge text (e.g., "Expert", "Intermediate", "Beginner")
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def run_migration():
    """Add expertise_badge column to tutor_profiles table"""
    db = SessionLocal()

    try:
        print("Starting migration: Add expertise_badge to tutor_profiles")

        # Check if column already exists
        check_column = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name = 'expertise_badge'
        """)

        result = db.execute(check_column).fetchone()

        if result:
            print("SUCCESS: Column 'expertise_badge' already exists in tutor_profiles table")
        else:
            # Add expertise_badge column
            add_column = text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN expertise_badge VARCHAR(50) DEFAULT 'Tutor'
            """)

            db.execute(add_column)
            db.commit()
            print("SUCCESS: Successfully added 'expertise_badge' column to tutor_profiles")
            print("   Default value: 'Tutor'")
            print("   Possible values: 'Expert', 'Intermediate', 'Beginner', 'Tutor', etc.")

        print("\nMigration completed successfully!")

    except Exception as e:
        print(f"ERROR: Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
