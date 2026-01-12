"""
Migration: Fix payment_methods table
Purpose: Remove profile_type column (not needed - tied to user, not profile)
Date: January 2026
"""

import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def run_migration():
    """Remove profile_type column from payment_methods table"""

    # Convert SQLAlchemy URL to psycopg2 format
    db_url = DATABASE_URL.replace('postgresql+psycopg://', 'postgresql://')

    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()

    try:
        # Check if profile_type column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'payment_methods' AND column_name = 'profile_type';
        """)

        if cursor.fetchone():
            # Drop the profile_type column
            cursor.execute("""
                ALTER TABLE payment_methods DROP COLUMN IF EXISTS profile_type;
            """)
            print("SUCCESS: Dropped profile_type column from payment_methods")
        else:
            print("INFO: profile_type column does not exist, nothing to drop")

        conn.commit()

        # Verify table structure
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'payment_methods'
            ORDER BY ordinal_position;
        """)

        columns = cursor.fetchall()
        print("\nUpdated table structure:")
        print("-" * 70)
        for col in columns:
            print(f"  {col[0]:<25} {col[1]:<20} {'NULL' if col[2] == 'YES' else 'NOT NULL':<10} {col[3] or ''}")
        print("-" * 70)
        print(f"Total columns: {len(columns)}")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("Running migration to fix payment_methods table...")
    run_migration()
