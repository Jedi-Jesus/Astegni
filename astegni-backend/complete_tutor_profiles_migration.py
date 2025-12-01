#!/usr/bin/env python3
"""
Complete migration script for tutor_profiles table
- Adds missing columns (rejection_reason, id_document_url, profile_picture)
- Transforms is_verified to verification_status with proper values
- Adds constraints and defaults
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

def check_column_exists(session, column_name):
    """Check if a column exists in tutor_profiles table"""
    result = session.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tutor_profiles'
        AND column_name = :column_name
    """), {"column_name": column_name})
    return result.fetchone() is not None

def add_column_if_not_exists(session, column_name, column_type, default_value=None):
    """Add a column if it doesn't exist"""
    if not check_column_exists(session, column_name):
        print(f"   Adding {column_name} column...")

        if default_value is not None:
            query = f"""
                ALTER TABLE tutor_profiles
                ADD COLUMN {column_name} {column_type} DEFAULT {default_value}
            """
        else:
            query = f"""
                ALTER TABLE tutor_profiles
                ADD COLUMN {column_name} {column_type}
            """

        session.execute(text(query))
        print(f"   ✓ {column_name} column added")
        return True
    else:
        print(f"   {column_name} column already exists")
        return False

def complete_migration():
    """Complete migration of tutor_profiles table"""
    session = Session()

    try:
        print("=" * 70)
        print("COMPLETE TUTOR PROFILES TABLE MIGRATION")
        print("=" * 70)

        # Step 1: Analyze current state
        print("\n1. ANALYZING CURRENT STATE")
        print("-" * 40)

        # Check existing columns
        result = session.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name IN ('is_verified', 'verification_status', 'rejection_reason',
                               'id_document_url', 'profile_picture')
            ORDER BY column_name
        """))

        existing_columns = {}
        print("Existing columns:")
        for row in result:
            existing_columns[row[0]] = row[1]
            print(f"  - {row[0]}: {row[1]}")

        if not existing_columns:
            print("  No relevant columns found")

        # Get current data stats
        result = session.execute(text("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as verified
            FROM tutor_profiles
        """))
        row = result.fetchone()
        total_tutors = row[0] or 0
        verified_tutors = row[1] or 0

        print(f"\nCurrent data:")
        print(f"  Total tutors: {total_tutors}")
        print(f"  Verified (is_verified=true): {verified_tutors}")
        print(f"  Not verified (is_verified=false): {total_tutors - verified_tutors}")

        # Step 2: Add missing columns
        print("\n2. ADDING MISSING COLUMNS")
        print("-" * 40)

        # Add verification_status if it doesn't exist
        add_column_if_not_exists(session, 'verification_status', 'VARCHAR', "'not_verified'")

        # Add rejection_reason column
        add_column_if_not_exists(session, 'rejection_reason', 'TEXT')

        # Add id_document_url column
        add_column_if_not_exists(session, 'id_document_url', 'VARCHAR')

        # Add profile_picture column (assuming you meant this instead of live_picture)
        add_column_if_not_exists(session, 'profile_picture', 'VARCHAR')

        # Optional: Add live_picture if that's what you want
        add_column_if_not_exists(session, 'live_picture', 'VARCHAR')

        # Add additional useful columns
        add_column_if_not_exists(session, 'verified_at', 'TIMESTAMP')
        add_column_if_not_exists(session, 'rejected_at', 'TIMESTAMP')
        add_column_if_not_exists(session, 'suspended_at', 'TIMESTAMP')
        add_column_if_not_exists(session, 'suspension_reason', 'TEXT')

        # Commit column additions
        session.commit()
        print("\n✓ All columns added successfully")

        # Step 3: Migrate data from is_verified to verification_status
        print("\n3. MIGRATING DATA")
        print("-" * 40)

        # First, set all NULL verification_status to not_verified
        print("Setting NULL verification_status to 'not_verified'...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'not_verified'
            WHERE verification_status IS NULL OR verification_status = ''
        """))
        print(f"  Updated {result.rowcount} rows")

        # Migrate verified tutors
        print("\nMigrating verified tutors (is_verified=true)...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'verified',
                verified_at = COALESCE(verified_at, updated_at, created_at, NOW())
            WHERE is_verified = true
            AND verification_status != 'verified'
        """))
        print(f"  ✓ Updated {result.rowcount} tutors to 'verified'")

        # For unverified tutors, we'll set them to 'pending' by default
        # You can manually update specific ones to 'not_verified' later
        print("\nMigrating unverified tutors (is_verified=false)...")
        print("  Setting to 'pending' (assuming they want verification)...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'pending'
            WHERE is_verified = false
            AND verification_status = 'not_verified'
        """))
        print(f"  ✓ Updated {result.rowcount} tutors to 'pending'")

        # Step 4: Add constraints
        print("\n4. ADDING CONSTRAINTS")
        print("-" * 40)

        try:
            # Drop existing constraint if any
            session.execute(text("""
                ALTER TABLE tutor_profiles
                DROP CONSTRAINT IF EXISTS check_verification_status
            """))

            # Add check constraint for verification_status
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ADD CONSTRAINT check_verification_status
                CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'suspended', 'rejected'))
            """))
            print("✓ Added check constraint for verification_status")
        except Exception as e:
            print(f"⚠ Could not add constraint: {e}")

        # Set defaults
        try:
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ALTER COLUMN verification_status SET DEFAULT 'not_verified'
            """))
            print("✓ Set default value for verification_status to 'not_verified'")
        except Exception as e:
            print(f"⚠ Could not set default: {e}")

        # Commit all changes
        session.commit()
        print("\n" + "=" * 70)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)

        # Step 5: Show final state
        print("\n5. FINAL STATE")
        print("-" * 40)

        # Show column structure
        result = session.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name IN ('is_verified', 'verification_status', 'rejection_reason',
                               'id_document_url', 'profile_picture', 'live_picture',
                               'verified_at', 'rejected_at', 'suspended_at', 'suspension_reason')
            ORDER BY column_name
        """))

        print("Final columns:")
        for row in result:
            default = f" (default: {row[2]})" if row[2] else ""
            print(f"  - {row[0]}: {row[1]}{default}")

        # Show data distribution
        result = session.execute(text("""
            SELECT verification_status, COUNT(*) as count
            FROM tutor_profiles
            GROUP BY verification_status
            ORDER BY
                CASE verification_status
                    WHEN 'verified' THEN 1
                    WHEN 'pending' THEN 2
                    WHEN 'rejected' THEN 3
                    WHEN 'suspended' THEN 4
                    WHEN 'not_verified' THEN 5
                END
        """))

        print("\nVerification status distribution:")
        total = 0
        for row in result:
            status = row[0] or 'NULL'
            count = row[1]
            print(f"  - {status}: {count} tutors")
            total += count

        print(f"\nTotal tutors: {total}")

        # Show admin-visible count
        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE verification_status != 'not_verified'
        """))
        admin_visible = result.scalar()
        print(f"Visible in admin dashboard: {admin_visible} tutors")

        print("\n" + "=" * 70)
        print("NEXT STEPS:")
        print("=" * 70)
        print("\n1. The is_verified column is kept for backward compatibility")
        print("2. All unverified tutors are set to 'pending' by default")
        print("3. You can manually update specific tutors:")
        print("")
        print("   -- Set tutors who haven't requested verification:")
        print("   UPDATE tutor_profiles")
        print("   SET verification_status = 'not_verified'")
        print("   WHERE [your conditions];")
        print("")
        print("   -- Reject a tutor with reason:")
        print("   UPDATE tutor_profiles")
        print("   SET verification_status = 'rejected',")
        print("       rejection_reason = 'Your reason here',")
        print("       rejected_at = NOW()")
        print("   WHERE id = [tutor_id];")
        print("")
        print("   -- Suspend a tutor:")
        print("   UPDATE tutor_profiles")
        print("   SET verification_status = 'suspended',")
        print("       suspension_reason = 'Your reason here',")
        print("       suspended_at = NOW()")
        print("   WHERE id = [tutor_id];")
        print("")
        print("4. Tutors can now upload documents:")
        print("   -- Update id_document_url when documents are uploaded")
        print("   -- Update profile_picture when photo is uploaded")
        print("   -- Update live_picture for live verification")

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        session.rollback()
        raise
    finally:
        session.close()

def verify_migration():
    """Verify the migration was successful"""
    session = Session()
    try:
        print("\n" + "=" * 70)
        print("MIGRATION VERIFICATION")
        print("=" * 70)

        # Check all required columns exist
        required_columns = [
            'verification_status', 'rejection_reason', 'id_document_url',
            'profile_picture', 'live_picture'
        ]

        print("\nChecking required columns:")
        all_exist = True
        for col in required_columns:
            exists = check_column_exists(session, col)
            status = "✓" if exists else "✗"
            print(f"  {status} {col}")
            if not exists:
                all_exist = False

        if all_exist:
            print("\n✅ All required columns exist!")
        else:
            print("\n⚠ Some columns are missing")

        # Check data consistency
        result = session.execute(text("""
            SELECT
                COUNT(*) as total,
                COUNT(CASE WHEN verification_status IS NULL THEN 1 END) as null_status,
                COUNT(CASE WHEN verification_status NOT IN
                    ('not_verified', 'pending', 'verified', 'suspended', 'rejected')
                    THEN 1 END) as invalid_status
            FROM tutor_profiles
        """))

        row = result.fetchone()
        print("\nData consistency check:")
        print(f"  Total tutors: {row[0]}")
        print(f"  NULL verification_status: {row[1]}")
        print(f"  Invalid verification_status: {row[2]}")

        if row[1] == 0 and row[2] == 0:
            print("\n✅ All data is consistent!")
        else:
            print("\n⚠ Some data inconsistencies found")

    finally:
        session.close()

if __name__ == "__main__":
    print("COMPLETE TUTOR PROFILES MIGRATION")
    print("=" * 70)
    print("\nThis script will:")
    print("1. Add missing columns:")
    print("   - verification_status (with proper values)")
    print("   - rejection_reason")
    print("   - id_document_url")
    print("   - profile_picture")
    print("   - live_picture")
    print("   - verified_at, rejected_at, suspended_at timestamps")
    print("   - suspension_reason")
    print("")
    print("2. Transform is_verified to verification_status:")
    print("   - is_verified=true  → 'verified'")
    print("   - is_verified=false → 'pending'")
    print("")
    print("3. Add constraints and defaults")
    print("")
    print("Note: is_verified column will be kept for backward compatibility")
    print("=" * 70)

    response = input("\nDo you want to proceed? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        complete_migration()
        verify_migration()
    else:
        print("\nMigration cancelled.")