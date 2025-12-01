"""
Database Migration: Rename is_premium to is_basic

This migration renames the column in both tutor_profiles and advertiser_profiles tables.

IMPORTANT: Run this ONCE before restarting the backend with updated code.
"""

import os
import sys
from dotenv import load_dotenv
import psycopg

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("[ERROR] ERROR: DATABASE_URL not found in .env file")
    sys.exit(1)

def run_migration():
    """Rename is_premium to is_basic in all relevant tables"""

    try:
        # Connect to database
        print("Connecting to database...")
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Connected successfully!")

        # Check if migration is needed
        print("\nChecking if migration is needed...")

        # Check tutor_profiles table
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_profiles'
            AND column_name IN ('is_premium', 'is_basic')
        """)
        tutor_columns = [row[0] for row in cursor.fetchall()]

        # Check advertiser_profiles table
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'advertiser_profiles'
            AND column_name IN ('is_premium', 'is_basic')
        """)
        advertiser_columns = [row[0] for row in cursor.fetchall()]

        print(f"   Tutor profiles columns: {tutor_columns}")
        print(f"   Advertiser profiles columns: {advertiser_columns}")

        # Migrate tutor_profiles table
        if 'is_premium' in tutor_columns and 'is_basic' not in tutor_columns:
            print("\n[MIGRATING] Migrating tutor_profiles table...")
            cursor.execute("""
                ALTER TABLE tutor_profiles
                RENAME COLUMN is_premium TO is_basic
            """)
            print("   [OK] tutor_profiles.is_premium → is_basic")
        elif 'is_basic' in tutor_columns:
            print("\n[OK] tutor_profiles already has 'is_basic' column (migration already done)")
        else:
            print("\n[WARNING]  WARNING: tutor_profiles has neither is_premium nor is_basic!")
            print("   Creating is_basic column with default False...")
            cursor.execute("""
                ALTER TABLE tutor_profiles
                ADD COLUMN is_basic BOOLEAN DEFAULT FALSE
            """)
            print("   [OK] Created is_basic column")

        # Migrate advertiser_profiles table
        if 'is_premium' in advertiser_columns and 'is_basic' not in advertiser_columns:
            print("\n[MIGRATING] Migrating advertiser_profiles table...")
            cursor.execute("""
                ALTER TABLE advertiser_profiles
                RENAME COLUMN is_premium TO is_basic
            """)
            print("   [OK] advertiser_profiles.is_premium → is_basic")
        elif 'is_basic' in advertiser_columns:
            print("\n[OK] advertiser_profiles already has 'is_basic' column (migration already done)")
        else:
            print("\n[WARNING]  WARNING: advertiser_profiles has neither is_premium nor is_basic!")
            print("   Creating is_basic column with default False...")
            cursor.execute("""
                ALTER TABLE advertiser_profiles
                ADD COLUMN is_basic BOOLEAN DEFAULT FALSE
            """)
            print("   [OK] Created is_basic column")

        # Commit changes
        conn.commit()
        print("\n[OK] Migration completed successfully!")

        # Verify migration
        print("\n[INFO] Verifying migration...")
        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_basic = true THEN 1 ELSE 0 END) as basic_count
            FROM tutor_profiles
        """)
        result = cursor.fetchone()
        print(f"   Tutor profiles: {result[0]} total, {result[1]} basic tutors")

        cursor.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN is_basic = true THEN 1 ELSE 0 END) as basic_count
            FROM advertiser_profiles
        """)
        result = cursor.fetchone()
        print(f"   Advertiser profiles: {result[0]} total, {result[1]} basic advertisers")

        cursor.close()
        conn.close()

        print("\n" + "="*60)
        print("[OK] MIGRATION COMPLETE!")
        print("="*60)
        print("\n[NEXT] Next steps:")
        print("1. Restart the backend: cd astegni-backend && python app.py")
        print("2. Test the find-tutors page")
        print("3. Check that smart ranking still works")
        print("\n[TIP] To mark tutors as basic:")
        print("   UPDATE tutor_profiles SET is_basic = true WHERE id IN (1, 2, 3);")

    except Exception as e:
        print(f"\n[ERROR] ERROR during migration: {e}")
        if conn:
            conn.rollback()
        sys.exit(1)

if __name__ == "__main__":
    # Set UTF-8 encoding for Windows console
    import sys
    if sys.platform == 'win32':
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

    print("="*60)
    print("Database Migration: is_premium -> is_basic")
    print("="*60)
    print("\nThis script will rename the column from 'is_premium' to 'is_basic'")
    print("in tutor_profiles and advertiser_profiles tables.")
    print("\nPress Enter to continue, or Ctrl+C to cancel...")
    input()

    run_migration()
