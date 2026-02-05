"""
Migration: Add years column to credentials table

This migration adds a 'years' column to the credentials table to store
the number of years of experience when credential_type is 'experience'.

Database: astegni_user_db
Table: credentials
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')


def run_migration():
    """Add years column to credentials table"""
    print("=" * 80)
    print("MIGRATION: Add years column to credentials table")
    print("=" * 80)

    try:
        # Connect to astegni_user_db
        conn = psycopg.connect(DATABASE_URL)
        cur = conn.cursor()

        print("\n1. Checking if 'years' column already exists...")

        # Check if years column exists
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'credentials'
            AND column_name = 'years'
        """)

        column_exists = cur.fetchone() is not None

        if column_exists:
            print("   [SKIP] 'years' column already exists in credentials table")
        else:
            print("   [OK] 'years' column does not exist, proceeding with migration...")

            print("\n2. Adding 'years' column to credentials table...")
            cur.execute("""
                ALTER TABLE credentials
                ADD COLUMN years INTEGER;
            """)
            conn.commit()
            print("   [OK] 'years' column added successfully")

            # Add a comment to the column for documentation
            cur.execute("""
                COMMENT ON COLUMN credentials.years
                IS 'Number of years of experience (only applicable when credential_type is experience)';
            """)
            conn.commit()
            print("   [OK] Column comment added")

        print("\n3. Verifying migration...")
        cur.execute("""
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'credentials'
            AND column_name = 'years'
        """)

        result = cur.fetchone()
        if result:
            print(f"   [OK] Verification successful:")
            print(f"        Column Name: {result[0]}")
            print(f"        Data Type: {result[1]}")
            print(f"        Nullable: {result[2]}")
        else:
            print("   [ERROR] Verification failed - column not found")
            return False

        # Close connection
        cur.close()
        conn.close()

        print("\n" + "=" * 80)
        print("✅ MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        return True

    except Exception as e:
        print(f"\n❌ ERROR during migration: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False


if __name__ == "__main__":
    success = run_migration()
    exit(0 if success else 1)
