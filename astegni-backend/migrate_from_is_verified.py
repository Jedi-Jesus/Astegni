#!/usr/bin/env python3
"""
Migration script to properly handle both is_verified (boolean) and verification_status (string)
Migrates from the old boolean system to the new status-based system
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

def analyze_current_state():
    """Analyze the current state of the database"""
    session = Session()
    try:
        print("=" * 60)
        print("ANALYZING CURRENT DATABASE STATE")
        print("=" * 60)

        # Check columns
        result = session.execute(text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name IN ('is_verified', 'verification_status', 'rejection_reason', 'id_document_url')
            ORDER BY column_name
        """))

        print("\nExisting columns:")
        columns = {}
        for row in result:
            columns[row[0]] = row[1]
            print(f"  - {row[0]}: {row[1]} (default: {row[2] or 'none'})")

        # Check current data distribution
        if 'is_verified' in columns:
            print("\nis_verified distribution:")
            result = session.execute(text("""
                SELECT is_verified, COUNT(*) as count
                FROM tutor_profiles
                GROUP BY is_verified
                ORDER BY is_verified
            """))
            for row in result:
                print(f"  - {row[0]}: {row[1]} tutors")

        if 'verification_status' in columns:
            print("\nverification_status distribution:")
            result = session.execute(text("""
                SELECT verification_status, COUNT(*) as count
                FROM tutor_profiles
                GROUP BY verification_status
                ORDER BY count DESC
            """))
            for row in result:
                status = row[0] or 'NULL'
                print(f"  - {status}: {row[1]} tutors")

        # Check for tutors with documents (likely pending)
        if 'id_document_url' in columns:
            result = session.execute(text("""
                SELECT COUNT(*) FROM tutor_profiles
                WHERE id_document_url IS NOT NULL AND id_document_url != ''
            """))
            doc_count = result.scalar()
            print(f"\nTutors with ID documents: {doc_count}")

        # Check for rejected tutors
        if 'rejection_reason' in columns:
            result = session.execute(text("""
                SELECT COUNT(*) FROM tutor_profiles
                WHERE rejection_reason IS NOT NULL AND rejection_reason != ''
            """))
            rejected_count = result.scalar()
            print(f"Tutors with rejection reasons: {rejected_count}")

        return columns

    finally:
        session.close()

def migrate_to_verification_status():
    """Migrate from is_verified boolean to verification_status string"""
    session = Session()

    try:
        print("\n" + "=" * 60)
        print("STARTING MIGRATION")
        print("=" * 60)

        # Check if verification_status column exists, if not create it
        result = session.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name = 'verification_status'
        """))

        if not result.fetchone():
            print("\n1. Creating verification_status column...")
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN verification_status VARCHAR DEFAULT 'not_verified'
            """))
            print("✓ Column created")
        else:
            print("\n1. verification_status column already exists")

        # Step 2: Migrate verified tutors (is_verified = true)
        print("\n2. Migrating verified tutors...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'verified'
            WHERE is_verified = true
            AND (verification_status IS NULL OR verification_status != 'verified')
        """))
        print(f"✓ Updated {result.rowcount} tutors to 'verified'")

        # Step 3: Check if rejection_reason column exists and migrate rejected tutors
        print("\n3. Checking for rejection_reason column...")
        col_check = session.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name = 'rejection_reason'
        """))

        has_rejection_column = col_check.fetchone() is not None

        if has_rejection_column:
            print("   Found rejection_reason column, migrating rejected tutors...")
            result = session.execute(text("""
                UPDATE tutor_profiles
                SET verification_status = 'rejected'
                WHERE rejection_reason IS NOT NULL
                AND rejection_reason != ''
                AND is_verified = false
            """))
            print(f"✓ Updated {result.rowcount} tutors to 'rejected'")
        else:
            print("   No rejection_reason column found, skipping rejected status migration")

        # Step 4: Check if id_document_url column exists and migrate pending tutors
        print("\n4. Checking for id_document_url column...")
        col_check = session.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name = 'id_document_url'
        """))

        has_document_column = col_check.fetchone() is not None

        if has_document_column:
            print("   Found id_document_url column, migrating pending tutors...")
            if has_rejection_column:
                # Include rejection_reason check if column exists
                result = session.execute(text("""
                    UPDATE tutor_profiles
                    SET verification_status = 'pending'
                    WHERE is_verified = false
                    AND (rejection_reason IS NULL OR rejection_reason = '')
                    AND id_document_url IS NOT NULL
                    AND id_document_url != ''
                    AND (verification_status IS NULL OR verification_status NOT IN ('rejected', 'suspended'))
                """))
            else:
                # Skip rejection_reason check if column doesn't exist
                result = session.execute(text("""
                    UPDATE tutor_profiles
                    SET verification_status = 'pending'
                    WHERE is_verified = false
                    AND id_document_url IS NOT NULL
                    AND id_document_url != ''
                    AND (verification_status IS NULL OR verification_status NOT IN ('rejected', 'suspended'))
                """))
            print(f"✓ Updated {result.rowcount} tutors to 'pending'")
        else:
            print("   No id_document_url column found, skipping pending status migration")

        # Step 5: Remaining tutors are not_verified
        print("\n5. Setting remaining tutors to 'not_verified'...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'not_verified'
            WHERE verification_status IS NULL
            OR verification_status = ''
            OR verification_status NOT IN ('verified', 'pending', 'rejected', 'suspended', 'not_verified')
        """))
        print(f"✓ Updated {result.rowcount} tutors to 'not_verified'")

        # Step 6: Add constraints
        print("\n6. Adding database constraints...")
        try:
            # Drop existing constraint if any
            session.execute(text("""
                ALTER TABLE tutor_profiles
                DROP CONSTRAINT IF EXISTS check_verification_status
            """))

            # Add new constraint
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ADD CONSTRAINT check_verification_status
                CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'suspended', 'rejected'))
            """))
            print("✓ Check constraint added")
        except Exception as e:
            print(f"Note: Could not add constraint: {e}")

        # Set default value
        try:
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ALTER COLUMN verification_status SET DEFAULT 'not_verified'
            """))
            print("✓ Default value set to 'not_verified'")
        except Exception as e:
            print(f"Note: Could not set default: {e}")

        # Commit changes
        session.commit()
        print("\n✅ Migration completed successfully!")

        # Show final state
        print("\n" + "=" * 60)
        print("FINAL STATE")
        print("=" * 60)

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
                    ELSE 6
                END
        """))

        total = 0
        print("\nFinal verification_status distribution:")
        for row in result:
            status = row[0] or 'NULL'
            count = row[1]
            print(f"  - {status}: {count} tutors")
            total += count

        print(f"\nTotal tutors: {total}")

        # Show admin-visible count
        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE verification_status IN ('pending', 'verified', 'rejected', 'suspended')
        """))
        admin_visible = result.scalar()
        print(f"Visible in admin dashboard: {admin_visible} tutors")

        # Show not_verified count
        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE verification_status = 'not_verified'
        """))
        not_verified = result.scalar()
        print(f"Not verified (hidden from admin): {not_verified} tutors")

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
        print("\n" + "=" * 60)
        print("VERIFICATION CHECKS")
        print("=" * 60)

        # Check 1: is_verified=true should match verification_status='verified'
        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE is_verified = true AND verification_status != 'verified'
        """))
        mismatch1 = result.scalar()

        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE is_verified = false AND verification_status = 'verified'
        """))
        mismatch2 = result.scalar()

        if mismatch1 == 0 and mismatch2 == 0:
            print("✓ is_verified and verification_status are consistent")
        else:
            print(f"✗ Found {mismatch1 + mismatch2} mismatches between is_verified and verification_status")

        # Check 2: No NULL verification_status
        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE verification_status IS NULL OR verification_status = ''
        """))
        null_count = result.scalar()

        if null_count == 0:
            print("✓ No NULL or empty verification_status values")
        else:
            print(f"✗ Found {null_count} tutors with NULL/empty verification_status")

        # Check 3: All values are valid
        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE verification_status NOT IN ('not_verified', 'pending', 'verified', 'suspended', 'rejected')
        """))
        invalid_count = result.scalar()

        if invalid_count == 0:
            print("✓ All verification_status values are valid")
        else:
            print(f"✗ Found {invalid_count} tutors with invalid verification_status")

    finally:
        session.close()

if __name__ == "__main__":
    print("TUTOR VERIFICATION STATUS MIGRATION")
    print("=" * 60)
    print("\nThis script will migrate from the is_verified boolean")
    print("to the verification_status string system:")
    print("")
    print("  is_verified=true         → verification_status='verified'")
    print("  has rejection_reason     → verification_status='rejected'")
    print("  has id_document_url      → verification_status='pending'")
    print("  everything else          → verification_status='not_verified'")
    print("")
    print("The script will NOT delete the is_verified column,")
    print("so you can rollback if needed.")
    print("=" * 60)

    # First analyze current state
    columns = analyze_current_state()

    if 'is_verified' not in columns:
        print("\n⚠️  No is_verified column found. This migration may not be needed.")
        response = input("\nDo you want to continue anyway? (yes/no): ")
    else:
        response = input("\nDo you want to proceed with the migration? (yes/no): ")

    if response.lower() in ['yes', 'y']:
        migrate_to_verification_status()
        verify_migration()
    else:
        print("\nMigration cancelled.")