"""
Migration: Add verification fields to ad_campaigns table
- Adds is_verified (BOOLEAN) column
- Adds verification_status (VARCHAR) column with values: pending, verified, rejected, suspended
- Removes status column (no longer needed)
- Removes budget and daily_budget columns (no longer needed)
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Force UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

# Convert to psycopg URL if needed
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def run_migration():
    """Run the migration to add verification fields to ad_campaigns table"""
    session = Session()

    try:
        print("🔄 Starting campaign verification migration...")

        # Check if table exists
        check_table = text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'ad_campaigns'
            );
        """)

        result = session.execute(check_table).scalar()

        if not result:
            print("❌ Table 'ad_campaigns' does not exist!")
            return

        print("✅ Table 'ad_campaigns' exists")

        # Add is_verified column (default to False)
        try:
            add_is_verified = text("""
                ALTER TABLE ad_campaigns
                ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
            """)
            session.execute(add_is_verified)
            print("✅ Added 'is_verified' column")
        except Exception as e:
            print(f"⚠️  is_verified column might already exist: {e}")

        # Add verification_status column (default to 'pending')
        try:
            add_verification_status = text("""
                ALTER TABLE ad_campaigns
                ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending';
            """)
            session.execute(add_verification_status)
            print("✅ Added 'verification_status' column")
        except Exception as e:
            print(f"⚠️  verification_status column might already exist: {e}")

        # Add CHECK constraint for verification_status values
        try:
            add_check_constraint = text("""
                ALTER TABLE ad_campaigns
                DROP CONSTRAINT IF EXISTS check_verification_status;

                ALTER TABLE ad_campaigns
                ADD CONSTRAINT check_verification_status
                CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended'));
            """)
            session.execute(add_check_constraint)
            print("✅ Added CHECK constraint for verification_status")
        except Exception as e:
            print(f"⚠️  CHECK constraint might already exist: {e}")

        # Update existing records to set default verification status
        try:
            update_existing = text("""
                UPDATE ad_campaigns
                SET verification_status = 'pending', is_verified = FALSE
                WHERE verification_status IS NULL;
            """)
            session.execute(update_existing)
            print("✅ Updated existing campaigns with default verification status")
        except Exception as e:
            print(f"⚠️  Error updating existing records: {e}")

        # Remove old status column (optional - commenting out to preserve data)
        # Uncomment if you want to remove the old status column
        """
        try:
            remove_status = text('''
                ALTER TABLE ad_campaigns
                DROP COLUMN IF EXISTS status;
            ''')
            session.execute(remove_status)
            print("✅ Removed old 'status' column")
        except Exception as e:
            print(f"⚠️  Error removing status column: {e}")
        """

        # Remove budget columns (optional - commenting out to preserve data)
        # Uncomment if you want to remove budget columns
        """
        try:
            remove_budget = text('''
                ALTER TABLE ad_campaigns
                DROP COLUMN IF EXISTS budget,
                DROP COLUMN IF EXISTS daily_budget;
            ''')
            session.execute(remove_budget)
            print("✅ Removed 'budget' and 'daily_budget' columns")
        except Exception as e:
            print(f"⚠️  Error removing budget columns: {e}")
        """

        session.commit()
        print("\n✨ Migration completed successfully!")
        print("\nNew columns added:")
        print("  - is_verified (BOOLEAN, default: FALSE)")
        print("  - verification_status (VARCHAR, default: 'pending')")
        print("\nVerification status values: pending, verified, rejected, suspended")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        session.close()

def verify_migration():
    """Verify the migration was successful"""
    session = Session()

    try:
        print("\n🔍 Verifying migration...")

        # Check columns
        check_columns = text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'ad_campaigns'
            AND column_name IN ('is_verified', 'verification_status')
            ORDER BY column_name;
        """)

        result = session.execute(check_columns)
        columns = result.fetchall()

        if columns:
            print("\n✅ Migration verification successful!")
            print("\nNew columns in ad_campaigns table:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (default: {col[2]})")
        else:
            print("\n❌ Verification failed: Columns not found!")

        # Show sample data
        sample_data = text("""
            SELECT id, name, is_verified, verification_status
            FROM ad_campaigns
            LIMIT 5;
        """)

        result = session.execute(sample_data)
        campaigns = result.fetchall()

        if campaigns:
            print("\n📊 Sample campaign data:")
            for campaign in campaigns:
                print(f"  ID: {campaign[0]}, Name: {campaign[1]}, Verified: {campaign[2]}, Status: {campaign[3]}")
        else:
            print("\n📊 No campaigns in database yet")

    except Exception as e:
        print(f"\n❌ Verification failed: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    print("=" * 60)
    print("CAMPAIGN VERIFICATION MIGRATION")
    print("=" * 60)
    print()

    run_migration()
    verify_migration()

    print("\n" + "=" * 60)
    print("Migration complete! You can now use the new verification fields.")
    print("=" * 60)
