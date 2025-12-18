"""
Migration: Standardize brand_packages and subscription_plans tables
Both tables will have identical structure:
- id, package_title, package_price, currency, is_base_package, features,
- discount_3_months, discount_6_months, discount_yearly, is_active, label,
- display_order, duration_days, created_at, updated_at
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

def run_migration():
    """Standardize both package tables"""
    conn = None
    try:
        conn = psycopg2.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 60)
        print("STANDARDIZING PACKAGE TABLES")
        print("=" * 60)

        # ========================================
        # BRAND_PACKAGES TABLE
        # ========================================
        print("\n1. Updating brand_packages table...")

        # Check current columns
        cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'brand_packages'
            ORDER BY ordinal_position
        """)
        brand_cols = [row[0] for row in cursor.fetchall()]
        print(f"   Current columns: {brand_cols}")

        # Add is_base_package if not exists
        if 'is_base_package' not in brand_cols:
            print("   Adding is_base_package column...")
            cursor.execute("""
                ALTER TABLE brand_packages
                ADD COLUMN is_base_package BOOLEAN DEFAULT FALSE
            """)
            conn.commit()
            print("   [OK] Added is_base_package")

        # Add currency if not exists
        if 'currency' not in brand_cols:
            print("   Adding currency column...")
            cursor.execute("""
                ALTER TABLE brand_packages
                ADD COLUMN currency VARCHAR(10) DEFAULT 'ETB'
            """)
            conn.commit()
            print("   [OK] Added currency")

        # Add duration_days if not exists
        if 'duration_days' not in brand_cols:
            print("   Adding duration_days column...")
            cursor.execute("""
                ALTER TABLE brand_packages
                ADD COLUMN duration_days INTEGER DEFAULT 30
            """)
            conn.commit()
            print("   [OK] Added duration_days")

        # Add discount columns if not exist
        for col in ['discount_3_months', 'discount_6_months', 'discount_yearly']:
            if col not in brand_cols:
                print(f"   Adding {col} column...")
                cursor.execute(f"""
                    ALTER TABLE brand_packages
                    ADD COLUMN {col} NUMERIC(5,2) DEFAULT 0
                """)
                conn.commit()
                print(f"   [OK] Added {col}")

        # Remove unnecessary columns
        cols_to_remove = ['discount_monthly', 'duration_label', 'description', 'package_type']
        for col in cols_to_remove:
            if col in brand_cols:
                print(f"   Removing {col} column...")
                cursor.execute(f"ALTER TABLE brand_packages DROP COLUMN {col}")
                conn.commit()
                print(f"   [OK] Removed {col}")

        # ========================================
        # SUBSCRIPTION_PLANS TABLE
        # ========================================
        print("\n2. Updating subscription_plans table...")

        # Check if subscription_plans table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'subscription_plans'
            )
        """)
        if not cursor.fetchone()[0]:
            print("   Creating subscription_plans table...")
            cursor.execute("""
                CREATE TABLE subscription_plans (
                    id SERIAL PRIMARY KEY,
                    package_title VARCHAR(255) NOT NULL,
                    package_price NUMERIC(10,2) DEFAULT 0,
                    currency VARCHAR(10) DEFAULT 'ETB',
                    is_base_package BOOLEAN DEFAULT FALSE,
                    features JSONB DEFAULT '[]'::jsonb,
                    discount_3_months NUMERIC(5,2) DEFAULT 0,
                    discount_6_months NUMERIC(5,2) DEFAULT 0,
                    discount_yearly NUMERIC(5,2) DEFAULT 0,
                    is_active BOOLEAN DEFAULT TRUE,
                    label VARCHAR(50) DEFAULT 'none',
                    display_order INTEGER DEFAULT 0,
                    duration_days INTEGER DEFAULT 30,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            print("   [OK] Created subscription_plans table")
        else:
            # Check current columns
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'subscription_plans'
                ORDER BY ordinal_position
            """)
            sub_cols = [row[0] for row in cursor.fetchall()]
            print(f"   Current columns: {sub_cols}")

            # Add missing columns
            columns_to_add = {
                'package_title': "VARCHAR(255) NOT NULL DEFAULT 'Untitled'",
                'package_price': "NUMERIC(10,2) DEFAULT 0",
                'currency': "VARCHAR(10) DEFAULT 'ETB'",
                'is_base_package': "BOOLEAN DEFAULT FALSE",
                'features': "JSONB DEFAULT '[]'::jsonb",
                'discount_3_months': "NUMERIC(5,2) DEFAULT 0",
                'discount_6_months': "NUMERIC(5,2) DEFAULT 0",
                'discount_yearly': "NUMERIC(5,2) DEFAULT 0",
                'is_active': "BOOLEAN DEFAULT TRUE",
                'label': "VARCHAR(50) DEFAULT 'none'",
                'display_order': "INTEGER DEFAULT 0",
                'duration_days': "INTEGER DEFAULT 30"
            }

            for col, col_type in columns_to_add.items():
                if col not in sub_cols:
                    print(f"   Adding {col} column...")
                    cursor.execute(f"ALTER TABLE subscription_plans ADD COLUMN {col} {col_type}")
                    conn.commit()
                    print(f"   [OK] Added {col}")

            # Refresh column list after additions
            cursor.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'subscription_plans'
            """)
            sub_cols_updated = [row[0] for row in cursor.fetchall()]

            # Handle column renames/migrations - copy data if old columns exist
            if 'plan_name' in sub_cols_updated and 'package_title' in sub_cols_updated:
                print("   Copying plan_name data to package_title...")
                cursor.execute("UPDATE subscription_plans SET package_title = plan_name WHERE package_title IS NULL OR package_title = 'Untitled'")
                conn.commit()
                print("   [OK] Copied plan_name to package_title")

            if 'price' in sub_cols_updated and 'package_price' in sub_cols_updated:
                print("   Copying price data to package_price...")
                cursor.execute("UPDATE subscription_plans SET package_price = price WHERE package_price IS NULL OR package_price = 0")
                conn.commit()
                print("   [OK] Copied price to package_price")

            # Copy discount data from old columns
            if 'discount_3_month' in sub_cols_updated and 'discount_3_months' in sub_cols_updated:
                print("   Copying discount_3_month data...")
                cursor.execute("UPDATE subscription_plans SET discount_3_months = discount_3_month WHERE discount_3_months = 0")
                conn.commit()
                print("   [OK] Copied discount_3_month")

            if 'discount_6_month' in sub_cols_updated and 'discount_6_months' in sub_cols_updated:
                print("   Copying discount_6_month data...")
                cursor.execute("UPDATE subscription_plans SET discount_6_months = discount_6_month WHERE discount_6_months = 0")
                conn.commit()
                print("   [OK] Copied discount_6_month")

            # Remove unnecessary columns from subscription_plans (including old column names)
            cols_to_remove_sub = ['description', 'plan_type', 'duration_label', 'monthly_price',
                                   'quarterly_price', 'biannual_price', 'yearly_price', 'discount_monthly',
                                   'plan_name', 'price', 'discount_3_month', 'discount_6_month', 'is_popular']
            for col in cols_to_remove_sub:
                if col in sub_cols_updated:
                    print(f"   Removing {col} column...")
                    cursor.execute(f"ALTER TABLE subscription_plans DROP COLUMN {col}")
                    conn.commit()
                    print(f"   [OK] Removed {col}")

        # ========================================
        # VERIFY FINAL STRUCTURE
        # ========================================
        print("\n" + "=" * 60)
        print("VERIFICATION")
        print("=" * 60)

        for table in ['brand_packages', 'subscription_plans']:
            print(f"\n{table} columns:")
            cursor.execute(f"""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = '{table}'
                ORDER BY ordinal_position
            """)
            for row in cursor.fetchall():
                default = str(row[2])[:30] if row[2] else 'NULL'
                print(f"   - {row[0]}: {row[1]} (default: {default})")

        print("\n" + "=" * 60)
        print("MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 60)

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
