#!/usr/bin/env python3
"""
Migration script to update verification_status values in tutor_profiles table
Adds 'not_verified' as default for tutors without verification status
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

# Create engine
engine = create_engine(DATABASE_URL.replace('postgresql://', 'postgresql+psycopg://'))
Session = sessionmaker(bind=engine)

def migrate_verification_status():
    """Update verification status values"""
    session = Session()

    try:
        # First, update any NULL verification_status to 'not_verified'
        print("Updating NULL verification_status to 'not_verified'...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'not_verified'
            WHERE verification_status IS NULL
        """))
        null_updated = result.rowcount
        print(f"Updated {null_updated} tutors with NULL status to 'not_verified'")

        # Update any empty string verification_status to 'not_verified'
        print("\nUpdating empty verification_status to 'not_verified'...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'not_verified'
            WHERE verification_status = ''
        """))
        empty_updated = result.rowcount
        print(f"Updated {empty_updated} tutors with empty status to 'not_verified'")

        # Get current status distribution
        print("\nCurrent verification status distribution:")
        result = session.execute(text("""
            SELECT verification_status, COUNT(*) as count
            FROM tutor_profiles
            GROUP BY verification_status
            ORDER BY count DESC
        """))

        for row in result:
            status = row[0] or 'NULL'
            count = row[1]
            print(f"  {status}: {count} tutors")

        # Add check constraint if not exists (PostgreSQL specific)
        print("\nAdding verification_status check constraint...")
        try:
            session.execute(text("""
                ALTER TABLE tutor_profiles
                DROP CONSTRAINT IF EXISTS check_verification_status;
            """))

            session.execute(text("""
                ALTER TABLE tutor_profiles
                ADD CONSTRAINT check_verification_status
                CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'suspended', 'rejected'));
            """))
            print("✓ Check constraint added successfully")
        except Exception as e:
            print(f"Note: Could not add constraint: {e}")

        # Set default value for future inserts
        print("\nSetting default value for verification_status...")
        try:
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ALTER COLUMN verification_status SET DEFAULT 'not_verified';
            """))
            print("✓ Default value set to 'not_verified'")
        except Exception as e:
            print(f"Note: Could not set default: {e}")

        # Commit all changes
        session.commit()
        print("\n✅ Migration completed successfully!")

        # Show final statistics
        print("\nFinal verification status distribution:")
        result = session.execute(text("""
            SELECT verification_status, COUNT(*) as count
            FROM tutor_profiles
            GROUP BY verification_status
            ORDER BY count DESC
        """))

        total = 0
        for row in result:
            status = row[0] or 'NULL'
            count = row[1]
            print(f"  {status}: {count} tutors")
            total += count

        print(f"\nTotal tutors: {total}")

        # Show how many would be visible in admin
        result = session.execute(text("""
            SELECT COUNT(*) as count
            FROM tutor_profiles
            WHERE verification_status != 'not_verified'
        """))
        visible_count = result.scalar()
        print(f"Visible in admin dashboard: {visible_count} tutors")

    except Exception as e:
        print(f"Error during migration: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("=" * 60)
    print("TUTOR VERIFICATION STATUS MIGRATION")
    print("=" * 60)
    print("\nThis script will:")
    print("1. Update NULL/empty verification_status to 'not_verified'")
    print("2. Add check constraint for valid status values")
    print("3. Set default value for new tutors")
    print("4. Show statistics before and after")
    print("\n" + "=" * 60)

    response = input("\nDo you want to continue? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        migrate_verification_status()
    else:
        print("Migration cancelled.")