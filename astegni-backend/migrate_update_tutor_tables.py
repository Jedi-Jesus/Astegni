"""
Migration script to update tutor-related tables:
1. Remove 'notes' field from tutor_students
2. Rename rating fields in tutor_analysis to use 'avg_' prefix
3. Rename total_bookings to total_requests in tutor_analysis
4. Add improvement_rate field to tutor_analysis

Run this to update existing tables to match the new schema.
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")

# Convert postgresql:// to postgresql+psycopg://
if DATABASE_URL.startswith('postgresql://'):
    DATABASE_URL = DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://')

def update_tables():
    """Update the tutor-related tables"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, echo=True)

        print("Updating tutor-related tables...")
        print("=" * 60)

        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                # 1. Remove 'notes' column from tutor_students (if it exists)
                print("\n1. Checking tutor_students table...")
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='tutor_students' AND column_name='notes'
                """))
                if result.fetchone():
                    print("   Removing 'notes' column from tutor_students...")
                    conn.execute(text("ALTER TABLE tutor_students DROP COLUMN IF EXISTS notes"))
                    print("   -> notes column removed")
                else:
                    print("   -> notes column doesn't exist (already removed)")

                # 2. Rename rating fields in tutor_analysis
                print("\n2. Updating tutor_analysis rating fields...")

                # Check if old columns exist
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='tutor_analysis' AND column_name='subject_matter_rating'
                """))

                if result.fetchone():
                    print("   Renaming rating columns...")
                    conn.execute(text("""
                        ALTER TABLE tutor_analysis
                        RENAME COLUMN subject_matter_rating TO avg_subject_understanding_rating
                    """))
                    print("   -> subject_matter_rating -> avg_subject_understanding_rating")

                    conn.execute(text("""
                        ALTER TABLE tutor_analysis
                        RENAME COLUMN communication_rating TO avg_communication_rating
                    """))
                    print("   -> communication_rating -> avg_communication_rating")

                    conn.execute(text("""
                        ALTER TABLE tutor_analysis
                        RENAME COLUMN discipline_rating TO avg_discipline_rating
                    """))
                    print("   -> discipline_rating -> avg_discipline_rating")

                    conn.execute(text("""
                        ALTER TABLE tutor_analysis
                        RENAME COLUMN punctuality_rating TO avg_punctuality_rating
                    """))
                    print("   -> punctuality_rating -> avg_punctuality_rating")
                else:
                    print("   -> Rating columns already renamed")

                # 3. Rename total_bookings to total_requests
                print("\n3. Updating tutor_analysis engagement fields...")
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='tutor_analysis' AND column_name='total_bookings'
                """))

                if result.fetchone():
                    print("   Renaming total_bookings to total_requests...")
                    conn.execute(text("""
                        ALTER TABLE tutor_analysis
                        RENAME COLUMN total_bookings TO total_requests
                    """))
                    print("   -> total_bookings -> total_requests")
                else:
                    print("   -> total_requests column already exists")

                # 4. Add improvement_rate field (if it doesn't exist)
                result = conn.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name='tutor_analysis' AND column_name='improvement_rate'
                """))

                if not result.fetchone():
                    print("\n4. Adding improvement_rate field...")
                    conn.execute(text("""
                        ALTER TABLE tutor_analysis
                        ADD COLUMN improvement_rate DOUBLE PRECISION DEFAULT 0.0
                    """))
                    print("   -> improvement_rate column added")
                else:
                    print("\n4. improvement_rate column already exists")

                # Commit transaction
                trans.commit()

                print("\n" + "=" * 60)
                print("Successfully updated tables!")
                print("=" * 60)
                print("\nChanges made:")
                print("  1. tutor_students: Removed 'notes' field")
                print("  2. tutor_analysis: Renamed rating fields with 'avg_' prefix")
                print("  3. tutor_analysis: Renamed total_bookings -> total_requests")
                print("  4. tutor_analysis: Added improvement_rate field")
                print("=" * 60)

            except Exception as e:
                trans.rollback()
                raise e

    except Exception as e:
        print(f"\nError updating tables: {e}")
        raise

if __name__ == "__main__":
    update_tables()
