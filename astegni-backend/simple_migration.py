#!/usr/bin/env python3
"""
Simplified migration for databases with only is_verified column
No rejection_reason or id_document_url columns
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

def simple_migration():
    """Simple migration for basic database structure"""
    session = Session()

    try:
        print("=" * 60)
        print("SIMPLE VERIFICATION STATUS MIGRATION")
        print("=" * 60)

        # Check current state
        print("\n1. Checking current database state...")
        result = session.execute(text("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_verified = true THEN 1 ELSE 0 END) as verified_count
            FROM tutor_profiles
        """))
        row = result.fetchone()
        total = row[0]
        verified = row[1] or 0
        not_verified = total - verified

        print(f"   Total tutors: {total}")
        print(f"   Verified (is_verified=true): {verified}")
        print(f"   Not verified (is_verified=false): {not_verified}")

        # Check if verification_status exists
        result = session.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name = 'verification_status'
        """))

        if not result.fetchone():
            print("\n2. Creating verification_status column...")
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN verification_status VARCHAR DEFAULT 'not_verified'
            """))
            print("✓ Column created")
        else:
            print("\n2. verification_status column already exists")

        # Simple migration logic:
        # is_verified=true → 'verified'
        # is_verified=false → 'pending' (assuming they want verification)

        print("\n3. Migrating verified tutors...")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'verified'
            WHERE is_verified = true
        """))
        print(f"✓ Updated {result.rowcount} tutors to 'verified'")

        print("\n4. Migrating unverified tutors to 'pending'...")
        print("   (Assuming all registered tutors want verification)")
        result = session.execute(text("""
            UPDATE tutor_profiles
            SET verification_status = 'pending'
            WHERE is_verified = false
            AND (verification_status IS NULL OR verification_status = 'not_verified')
        """))
        print(f"✓ Updated {result.rowcount} tutors to 'pending'")

        # Add constraint
        print("\n5. Adding database constraints...")
        try:
            session.execute(text("""
                ALTER TABLE tutor_profiles
                DROP CONSTRAINT IF EXISTS check_verification_status
            """))

            session.execute(text("""
                ALTER TABLE tutor_profiles
                ADD CONSTRAINT check_verification_status
                CHECK (verification_status IN ('not_verified', 'pending', 'verified', 'suspended', 'rejected'))
            """))
            print("✓ Check constraint added")
        except Exception as e:
            print(f"Note: Could not add constraint: {e}")

        # Set default
        try:
            session.execute(text("""
                ALTER TABLE tutor_profiles
                ALTER COLUMN verification_status SET DEFAULT 'not_verified'
            """))
            print("✓ Default value set")
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
            ORDER BY count DESC
        """))

        print("\nFinal distribution:")
        total = 0
        for row in result:
            status = row[0] or 'NULL'
            count = row[1]
            print(f"  {status}: {count} tutors")
            total += count

        print(f"\nTotal tutors: {total}")

        # Admin visible count
        result = session.execute(text("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE verification_status IN ('pending', 'verified', 'rejected', 'suspended')
        """))
        admin_visible = result.scalar()
        print(f"Visible in admin dashboard: {admin_visible} tutors")

    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    print("SIMPLE TUTOR VERIFICATION MIGRATION")
    print("=" * 60)
    print("\nThis simplified script will:")
    print("  • is_verified=true  → verification_status='verified'")
    print("  • is_verified=false → verification_status='pending'")
    print("")
    print("All unverified tutors will be set to 'pending'")
    print("assuming they want to be verified.")
    print("")
    print("You can manually update specific tutors to 'not_verified'")
    print("if they haven't actually requested verification.")
    print("=" * 60)

    response = input("\nDo you want to proceed? (yes/no): ")
    if response.lower() in ['yes', 'y']:
        simple_migration()
    else:
        print("\nMigration cancelled.")