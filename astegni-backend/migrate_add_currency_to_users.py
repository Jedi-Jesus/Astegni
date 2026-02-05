"""
Migration: Add currency column to users table
Author: Claude Code
Date: 2026-01-22

This migration adds a currency field to the users table that will be automatically
populated based on the user's GPS-detected country location.

IMPORTANT: Run this migration once:
    python migrate_add_currency_to_users.py
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def migrate():
    print("\n" + "="*70)
    print("MIGRATION: Add currency to users table")
    print("="*70)

    try:
        # Create engine
        engine = create_engine(DATABASE_URL)

        with engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                print("\n[1/3] Adding currency column to users table...")
                # Add currency column (nullable, default NULL)
                # Will be populated automatically when user sets location via GPS
                conn.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT NULL;
                """))
                print("OK Currency column added")

                print("\n[2/3] Adding country_code column to users table...")
                # Add country_code column to store ISO country code (e.g., 'ET', 'US', 'GB')
                # This will be populated from GPS detection
                conn.execute(text("""
                    ALTER TABLE users
                    ADD COLUMN IF NOT EXISTS country_code VARCHAR(10) DEFAULT NULL;
                """))
                print("OK Country code column added")

                print("\n[3/3] Creating index on currency for faster queries...")
                conn.execute(text("""
                    CREATE INDEX IF NOT EXISTS idx_users_currency
                    ON users(currency);
                """))
                print("OK Index created")

                # Commit transaction
                trans.commit()
                print("\n" + "="*70)
                print("OK MIGRATION COMPLETED SUCCESSFULLY")
                print("="*70)
                print("\nNew columns added:")
                print("  - users.currency (VARCHAR(10), nullable)")
                print("  - users.country_code (VARCHAR(10), nullable)")
                print("\nThese columns will be auto-populated when users:")
                print("  1. Enable GPS location detection")
                print("  2. System detects their country via Nominatim API")
                print("  3. Currency is mapped from country code")
                print("\nSupported currencies: 195+ countries worldwide")
                print("="*70 + "\n")

            except Exception as e:
                trans.rollback()
                raise e

    except Exception as e:
        print(f"\nERROR ERROR: {str(e)}")
        print("\nMigration failed. Please check the error above.")
        sys.exit(1)

if __name__ == "__main__":
    migrate()
