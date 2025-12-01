"""
Migration: Fix tutor_packages table schema to match endpoints

This migration adds the missing columns that the endpoints expect:
- grade_level
- courses
- hourly_rate (replaces 'price')
- days_per_week
- hours_per_day
- payment_frequency
- discount_1_month
- discount_3_month
- discount_6_month

And removes columns that are no longer used:
- price
- duration_hours
- sessions_count
- subjects
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise Exception("DATABASE_URL not found in environment variables")
    return psycopg.connect(database_url)

def migrate():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        print("Starting migration: Fix tutor_packages table schema...")

        # Add new columns
        print("Adding new columns...")

        cur.execute("""
            ALTER TABLE tutor_packages
            ADD COLUMN IF NOT EXISTS grade_level VARCHAR(255),
            ADD COLUMN IF NOT EXISTS courses TEXT,
            ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS days_per_week INTEGER,
            ADD COLUMN IF NOT EXISTS hours_per_day DECIMAL(4, 2),
            ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(50) DEFAULT 'monthly',
            ADD COLUMN IF NOT EXISTS discount_1_month DECIMAL(5, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS discount_3_month DECIMAL(5, 2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS discount_6_month DECIMAL(5, 2) DEFAULT 0
        """)

        # Migrate data from old columns to new ones if they exist
        print("Migrating existing data...")

        # Check if old 'price' column exists and migrate to hourly_rate
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages' AND column_name = 'price'
        """)

        if cur.fetchone():
            print("  - Migrating price -> hourly_rate...")
            cur.execute("""
                UPDATE tutor_packages
                SET hourly_rate = price
                WHERE price IS NOT NULL AND hourly_rate = 0
            """)

        # Check if old 'subjects' column exists and migrate to courses
        cur.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages' AND column_name = 'subjects'
        """)

        if cur.fetchone():
            print("  - Migrating subjects -> courses...")
            cur.execute("""
                UPDATE tutor_packages
                SET courses = subjects::text
                WHERE subjects IS NOT NULL AND courses IS NULL
            """)

        # Now we can safely drop the old columns
        print("Dropping old columns...")

        cur.execute("""
            ALTER TABLE tutor_packages
            DROP COLUMN IF EXISTS price,
            DROP COLUMN IF EXISTS duration_hours,
            DROP COLUMN IF EXISTS sessions_count,
            DROP COLUMN IF EXISTS subjects
        """)

        conn.commit()

        print("✅ Migration completed successfully!")
        print("\nNew tutor_packages schema:")

        # Display new schema
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'tutor_packages'
            ORDER BY ordinal_position
        """)

        print("\nColumn | Type | Nullable | Default")
        print("-" * 80)
        for row in cur.fetchall():
            print(f"{row[0]:30} | {row[1]:20} | {row[2]:8} | {row[3]}")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
