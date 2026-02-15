"""
Migration: Add location-specific fields to campaign_profile table
Date: 2026-02-11
Description: Adds national_location, national_country_code, and regional_country_code
            fields to support national and regional campaign targeting
"""

import psycopg
from datetime import datetime

# Database connection
DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

def run_migration():
    """Add location-specific columns to campaign_profile table"""

    print("[Migration] Starting campaign_profile location fields migration...")
    print(f"[{datetime.now()}] Connecting to database...")

    try:
        # Connect to database
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print(f"[{datetime.now()}] Connected successfully")

                # Check if columns already exist
                print(f"[{datetime.now()}] Checking existing columns...")
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_profile'
                    AND column_name IN ('national_location', 'national_country_code', 'regional_country_code')
                """)
                existing_columns = [row[0] for row in cur.fetchall()]

                if existing_columns:
                    print(f"[{datetime.now()}] ⚠️  Found existing columns: {existing_columns}")
                    print("[Migration] Columns already exist. Skipping...")
                    return

                # Add new columns
                print(f"[{datetime.now()}] Adding new columns to campaign_profile table...")

                # 1. national_location - stores user's location string (e.g., "Addis Ababa, Ethiopia")
                print("  > Adding national_location (VARCHAR(500))...")
                cur.execute("""
                    ALTER TABLE campaign_profile
                    ADD COLUMN national_location VARCHAR(500) DEFAULT NULL
                """)

                # 2. national_country_code - stores ISO country code for national targeting (e.g., "ET")
                print("  > Adding national_country_code (VARCHAR(10))...")
                cur.execute("""
                    ALTER TABLE campaign_profile
                    ADD COLUMN national_country_code VARCHAR(10) DEFAULT NULL
                """)

                # 3. regional_country_code - stores country code for regional targeting (e.g., "ET")
                print("  > Adding regional_country_code (VARCHAR(10))...")
                cur.execute("""
                    ALTER TABLE campaign_profile
                    ADD COLUMN regional_country_code VARCHAR(10) DEFAULT NULL
                """)

                # Commit the transaction
                conn.commit()
                print(f"[{datetime.now()}] SUCCESS: All columns added successfully")

                # Verify the changes
                print(f"[{datetime.now()}] Verifying changes...")
                cur.execute("""
                    SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_profile'
                    AND column_name IN ('national_location', 'national_country_code', 'regional_country_code')
                    ORDER BY column_name
                """)

                print("\n" + "="*80)
                print("NEW COLUMNS:")
                print("="*80)
                for row in cur.fetchall():
                    col_name, data_type, max_length, nullable, default = row
                    print(f"  • {col_name}")
                    print(f"    - Type: {data_type}({max_length if max_length else 'N/A'})")
                    print(f"    - Nullable: {nullable}")
                    print(f"    - Default: {default if default else 'NULL'}")
                    print()

                print("="*80)
                print(f"[{datetime.now()}] SUCCESS: Migration completed successfully!")
                print("="*80)
                print("\nUsage:")
                print("  • national_location: Stores user's location for national targeting")
                print("    Example: 'Addis Ababa, Addis Ababa, Ethiopia'")
                print("  • national_country_code: ISO country code for national targeting")
                print("    Example: 'ET'")
                print("  • regional_country_code: Country code for regional targeting")
                print("    Example: 'ET'")
                print("\nFrontend Integration:")
                print("  • brands-manager.js sends these fields in executeCreate() and executeUpdate()")
                print("  • Backend endpoints need to accept and store these fields")
                print("="*80)

    except Exception as e:
        print(f"\nERROR: Migration failed!")
        print(f"Error: {str(e)}")
        print(f"Type: {type(e).__name__}")
        raise

if __name__ == "__main__":
    run_migration()
