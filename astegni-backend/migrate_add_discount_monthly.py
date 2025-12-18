"""
Migration: Add discount_monthly column to brand_packages table
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

def run_migration():
    """Add discount_monthly column to brand_packages table"""
    conn = None
    try:
        conn = psycopg2.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        print("Checking brand_packages table structure...")

        # Check if discount_monthly column exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'brand_packages' AND column_name = 'discount_monthly'
        """)

        if cursor.fetchone():
            print("discount_monthly column already exists. Skipping.")
        else:
            print("Adding discount_monthly column...")
            cursor.execute("""
                ALTER TABLE brand_packages
                ADD COLUMN discount_monthly NUMERIC(5,2) DEFAULT 0
            """)
            conn.commit()
            print("Successfully added discount_monthly column!")

        # Show current table structure
        print("\nCurrent brand_packages columns:")
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'brand_packages'
            ORDER BY ordinal_position
        """)

        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (default: {row[2]})")

        print("\nMigration completed successfully!")

    except Exception as e:
        print(f"Error during migration: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    run_migration()
