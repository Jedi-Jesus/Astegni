"""
Migration: Add experience bonus fields to base_price_rules table
Adds support for years of experience multiplier in pricing calculations
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import create_engine, Column, Numeric, text
from config import ADMIN_DATABASE_URL

def migrate_add_experience_bonus():
    """Add experience_bonus_per_year to base_price_rules table"""

    engine = create_engine(ADMIN_DATABASE_URL)

    print("[MIGRATION] Starting migration: Add experience bonus to base_price_rules...")

    with engine.connect() as conn:
        try:
            # Check if column already exists
            check_query = text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'base_price_rules'
                AND column_name = 'experience_bonus_per_year'
            """)
            result = conn.execute(check_query)

            if result.fetchone():
                print("[WARNING] Column 'experience_bonus_per_year' already exists. Skipping migration.")
                return

            # Add experience_bonus_per_year column
            print("[ACTION] Adding experience_bonus_per_year column...")
            alter_query = text("""
                ALTER TABLE base_price_rules
                ADD COLUMN experience_bonus_per_year NUMERIC(10, 2) DEFAULT 0 NOT NULL
            """)
            conn.execute(alter_query)
            conn.commit()

            print("[SUCCESS] Migration completed successfully!")
            print("\n[INFO] Column added:")
            print("   - experience_bonus_per_year: NUMERIC(10, 2) - Bonus per year of experience (multiplied by years)")

            # Show current structure
            print("\n[VERIFY] Verifying table structure...")
            verify_query = text("""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'base_price_rules'
                ORDER BY ordinal_position
            """)
            result = conn.execute(verify_query)

            print("\n[COLUMNS] Current base_price_rules columns:")
            for row in result:
                print(f"   - {row[0]}: {row[1]} (default: {row[2]})")

        except Exception as e:
            print(f"[ERROR] Migration failed: {str(e)}")
            conn.rollback()
            raise

if __name__ == "__main__":
    migrate_add_experience_bonus()
