"""
Migration: Add Country/Location to Base Price Rules
Adds country column to base_price_rules table for location-specific pricing
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import create_engine, text
from admin_models import AdminSessionLocal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def run_migration():
    """Add country column to base_price_rules table"""

    db = AdminSessionLocal()

    try:
        print("[*] Starting migration: Add country/location to base_price_rules...")

        # Check if column already exists
        check_column = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'base_price_rules'
            AND column_name = 'country'
        """)

        existing_column = db.execute(check_column).fetchall()

        if existing_column:
            print("[OK] Country column already exists. Migration skipped.")
            return

        # Add country column (nullable, default to 'all' for global rules)
        print("   Adding country column...")
        add_country = text("""
            ALTER TABLE base_price_rules
            ADD COLUMN country VARCHAR(100) DEFAULT 'all'
        """)
        db.execute(add_country)
        print("   [+] country column added")

        # Create index on country for faster lookups
        print("   Adding index on country column...")
        add_index = text("""
            CREATE INDEX idx_base_price_rules_country
            ON base_price_rules(country)
        """)
        try:
            db.execute(add_index)
            print("   [+] Index created on country column")
        except Exception as e:
            if "already exists" in str(e).lower():
                print("   [i] Index already exists")
            else:
                print(f"   [!] Warning: Could not create index: {e}")

        # Update existing rules to have 'all' (global) country
        print("   Setting existing rules to 'all' (global)...")
        update_rules = text("""
            UPDATE base_price_rules
            SET country = 'all'
            WHERE country IS NULL
        """)
        result = db.execute(update_rules)
        print(f"   [+] Updated {result.rowcount} rules to global")

        # Commit changes
        db.commit()

        # Verify the changes
        print("\n[*] Verifying migration...")
        verify_query = text("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'base_price_rules'
            AND column_name = 'country'
        """)

        columns = db.execute(verify_query).fetchall()
        if columns:
            print(f"   Column: {columns[0][0]} ({columns[0][1]}), default = {columns[0][2]}")

        # Show current rules
        print("\n[*] Current base price rules:")
        rules_query = text("""
            SELECT id, rule_name, country, subject_category, session_format,
                   min_grade_level, max_grade_level,
                   base_price_per_hour, is_active
            FROM base_price_rules
            ORDER BY country, priority, id
        """)

        rules = db.execute(rules_query).fetchall()
        if rules:
            print(f"   Found {len(rules)} rules:")
            for rule in rules:
                country_label = "Global (All Countries)" if rule[1] == 'all' else rule[1]

                min_g = rule[4]
                max_g = rule[5]
                if min_g == 1 and max_g == 14:
                    grade_range = "All Levels"
                elif min_g == max_g:
                    grade_range = f"Level {min_g}"
                else:
                    grade_range = f"Levels {min_g}-{max_g}"

                status = "[Active]" if rule[8] else "[Inactive]"
                print(f"   - [{rule[0]}] {rule[2]}: {country_label} | {rule[3]} + {rule[4]} | {grade_range} | {rule[6]} ETB/hr | {status}")
        else:
            print("   No rules found in database")

        print("\n[OK] Migration completed successfully!")
        print("\n[i] Country/Location Features:")
        print("   - country: Country code or 'all' for global rules")
        print("   - Supported: Ethiopia (ET), Cameroon (CM), Kenya (KE), Mexico (MX), etc.")
        print("   - 'all' means rule applies globally (all countries)")
        print("   - System will match country-specific rules first, then fall back to global")
        print("   - Examples: 'ET' (Ethiopia), 'CM' (Cameroon), 'KE' (Kenya), 'MX' (Mexico)")

    except Exception as e:
        db.rollback()
        print(f"\n[ERROR] Migration failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_migration()
