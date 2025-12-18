"""
Migration: Simplify brand_packages discount fields
- Remove discount_3_months, discount_6_months, discount_yearly columns
- Add single 'discount' column for cross-package discount calculation
- Brand packages are time-based (daily price × duration days)
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

def run_migration():
    """Simplify brand_packages to use single discount field"""
    conn = None
    try:
        conn = psycopg2.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 60)
        print("SIMPLIFYING BRAND_PACKAGES DISCOUNT FIELDS")
        print("=" * 60)

        # Check current columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'brand_packages'
            ORDER BY ordinal_position
        """)
        cols = [row[0] for row in cursor.fetchall()]
        print(f"Current columns: {cols}")

        # Step 1: Add single 'discount' column if not exists
        if 'discount' not in cols:
            print("\nStep 1: Adding 'discount' column...")
            cursor.execute("""
                ALTER TABLE brand_packages
                ADD COLUMN discount NUMERIC(5,2) DEFAULT 0
            """)
            conn.commit()
            print("[OK] Added 'discount' column with default 0")
        else:
            print("\nStep 1: 'discount' column already exists. Skipping.")

        # Step 2: Migrate data - use the average of existing discounts or the yearly discount
        if 'discount_yearly' in cols:
            print("\nStep 2: Migrating discount data from discount_yearly...")
            cursor.execute("""
                UPDATE brand_packages
                SET discount = COALESCE(discount_yearly, 0)
                WHERE discount IS NULL OR discount = 0
            """)
            conn.commit()
            print("[OK] Migrated discount values")
        else:
            print("\nStep 2: No discount_yearly column to migrate from. Skipping.")

        # Step 3: Drop the old discount tier columns
        columns_to_drop = ['discount_3_months', 'discount_6_months', 'discount_yearly']
        for col_name in columns_to_drop:
            if col_name in cols:
                print(f"\nStep 3: Dropping '{col_name}' column...")
                cursor.execute(f"ALTER TABLE brand_packages DROP COLUMN {col_name}")
                conn.commit()
                print(f"[OK] Dropped '{col_name}' column")
            else:
                print(f"\nStep 3: '{col_name}' column doesn't exist. Skipping.")

        # Verify final structure
        print("\n" + "=" * 60)
        print("VERIFICATION - brand_packages columns:")
        print("=" * 60)
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'brand_packages'
            ORDER BY ordinal_position
        """)
        for row in cursor.fetchall():
            default = str(row[2])[:30] if row[2] else 'NULL'
            print(f"  - {row[0]}: {row[1]} (default: {default})")

        print("\n[OK] Migration completed successfully!")
        print("\nBrand packages now use single 'discount' field")
        print("Discount is auto-calculated: ((Base Rate - This Rate) / Base Rate) × 100")

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
