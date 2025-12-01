"""
Migration: Add submission, rejection, and suspension date/reason fields to ad_campaigns table

This migration adds the following fields:
- submitted_date (TIMESTAMP): When the campaign was submitted for review
- rejected_date (TIMESTAMP): When the campaign was rejected
- rejected_reason (TEXT): Reason for rejection
- suspended_date (TIMESTAMP): When the campaign was suspended
- suspended_reason (TEXT): Reason for suspension

These fields are required for proper campaign tracking and audit trail.
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
    """Run the migration to add date and reason fields to ad_campaigns table"""
    session = Session()

    try:
        print("🔄 Starting campaign dates and reasons migration...")

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

        # Add submitted_date column
        try:
            add_submitted_date = text("""
                ALTER TABLE ad_campaigns
                ADD COLUMN IF NOT EXISTS submitted_date TIMESTAMP;
            """)
            session.execute(add_submitted_date)
            print("✅ Added 'submitted_date' column (TIMESTAMP)")
        except Exception as e:
            print(f"⚠️  submitted_date column might already exist: {e}")

        # Add rejected_date column
        try:
            add_rejected_date = text("""
                ALTER TABLE ad_campaigns
                ADD COLUMN IF NOT EXISTS rejected_date TIMESTAMP;
            """)
            session.execute(add_rejected_date)
            print("✅ Added 'rejected_date' column (TIMESTAMP)")
        except Exception as e:
            print(f"⚠️  rejected_date column might already exist: {e}")

        # Add rejected_reason column
        try:
            add_rejected_reason = text("""
                ALTER TABLE ad_campaigns
                ADD COLUMN IF NOT EXISTS rejected_reason TEXT;
            """)
            session.execute(add_rejected_reason)
            print("✅ Added 'rejected_reason' column (TEXT)")
        except Exception as e:
            print(f"⚠️  rejected_reason column might already exist: {e}")

        # Add suspended_date column
        try:
            add_suspended_date = text("""
                ALTER TABLE ad_campaigns
                ADD COLUMN IF NOT EXISTS suspended_date TIMESTAMP;
            """)
            session.execute(add_suspended_date)
            print("✅ Added 'suspended_date' column (TIMESTAMP)")
        except Exception as e:
            print(f"⚠️  suspended_date column might already exist: {e}")

        # Add suspended_reason column
        try:
            add_suspended_reason = text("""
                ALTER TABLE ad_campaigns
                ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
            """)
            session.execute(add_suspended_reason)
            print("✅ Added 'suspended_reason' column (TEXT)")
        except Exception as e:
            print(f"⚠️  suspended_reason column might already exist: {e}")

        # Set submitted_date for existing campaigns to their created_at date
        try:
            update_submitted_dates = text("""
                UPDATE ad_campaigns
                SET submitted_date = created_at
                WHERE submitted_date IS NULL;
            """)
            result = session.execute(update_submitted_dates)
            print(f"✅ Set submitted_date for {result.rowcount} existing campaigns")
        except Exception as e:
            print(f"⚠️  Error setting submitted_date: {e}")

        session.commit()
        print("\n✨ Migration completed successfully!")
        print("\nNew columns added to ad_campaigns table:")
        print("  - submitted_date (TIMESTAMP)")
        print("  - rejected_date (TIMESTAMP)")
        print("  - rejected_reason (TEXT)")
        print("  - suspended_date (TIMESTAMP)")
        print("  - suspended_reason (TEXT)")

    except Exception as e:
        session.rollback()
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
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
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'ad_campaigns'
            AND column_name IN (
                'submitted_date',
                'rejected_date',
                'rejected_reason',
                'suspended_date',
                'suspended_reason'
            )
            ORDER BY column_name;
        """)

        result = session.execute(check_columns)
        columns = result.fetchall()

        if len(columns) == 5:
            print("\n✅ Migration verification successful!")
            print("\nNew columns in ad_campaigns table:")
            for col in columns:
                nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                print(f"  - {col[0]}: {col[1]} ({nullable})")
        else:
            print(f"\n⚠️  Expected 5 columns, found {len(columns)}")
            for col in columns:
                print(f"  - {col[0]}: {col[1]}")

        # Show sample data
        sample_data = text("""
            SELECT
                id,
                name,
                verification_status,
                submitted_date,
                rejected_date,
                suspended_date
            FROM ad_campaigns
            LIMIT 5;
        """)

        result = session.execute(sample_data)
        campaigns = result.fetchall()

        if campaigns:
            print("\n📊 Sample campaign data:")
            for campaign in campaigns:
                print(f"  ID: {campaign[0]}")
                print(f"    Name: {campaign[1]}")
                print(f"    Status: {campaign[2]}")
                print(f"    Submitted: {campaign[3]}")
                print(f"    Rejected: {campaign[4]}")
                print(f"    Suspended: {campaign[5]}")
                print()
        else:
            print("\n📊 No campaigns in database yet")

        # Show total count
        count_query = text("SELECT COUNT(*) FROM ad_campaigns;")
        count = session.execute(count_query).scalar()
        print(f"📈 Total campaigns in database: {count}")

    except Exception as e:
        print(f"\n❌ Verification failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    print("=" * 70)
    print("CAMPAIGN DATES AND REASONS MIGRATION")
    print("=" * 70)
    print()

    run_migration()
    verify_migration()

    print("\n" + "=" * 70)
    print("Migration complete!")
    print("=" * 70)
    print("\nYou can now track:")
    print("  ✅ When campaigns are submitted")
    print("  ✅ When campaigns are rejected (with reason)")
    print("  ✅ When campaigns are suspended (with reason)")
    print()
