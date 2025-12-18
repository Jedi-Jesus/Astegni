"""
Migration: Add is_base_package column to subscription_plans table
For package-based discount calculation (TWO discount types in subscription plans)
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

def run_migration():
    """Add is_base_package column to subscription_plans if it doesn't exist"""
    conn = None
    try:
        conn = psycopg2.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 60)
        print("ADDING is_base_package TO subscription_plans")
        print("=" * 60)

        # Check current columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'subscription_plans'
            ORDER BY ordinal_position
        """)
        cols = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {cols}")

        # Add is_base_package column if not exists
        if 'is_base_package' not in cols:
            print("\nAdding 'is_base_package' column...")
            cursor.execute("""
                ALTER TABLE subscription_plans
                ADD COLUMN is_base_package BOOLEAN DEFAULT FALSE
            """)
            conn.commit()
            print("[OK] Added 'is_base_package' column with default FALSE")
        else:
            print("\n'is_base_package' column already exists. Skipping.")

        # Verify final structure
        print("\n" + "=" * 60)
        print("VERIFICATION - subscription_plans columns:")
        print("=" * 60)
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'subscription_plans'
            ORDER BY ordinal_position
        """)
        for row in cursor.fetchall():
            default = str(row[2])[:30] if row[2] else 'NULL'
            print(f"  - {row[0]}: {row[1]} (default: {default})")

        print("\n[OK] Migration completed successfully!")
        print("\nSubscription plans now support TWO types of discounts:")
        print("  1. Package-based discount: Calculated from base plan's price per GB")
        print("  2. Upfront payment discount: For paying multiple months at once")

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
