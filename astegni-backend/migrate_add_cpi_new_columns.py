"""
Migration: Add new CPI columns for audience premiums (advertiser, user) and region exclusion premiums

This migration adds:
1. advertiser_premium - Audience targeting premium for advertisers
2. user_premium - Audience targeting premium for users
3. Region exclusion premiums for all 12 Ethiopian regions:
   - addis_premium, oromia_premium, amhara_premium, tigray_premium
   - snnpr_premium, somali_premium, afar_premium, benishangul_premium
   - gambela_premium, harari_premium, diredawa_premium, sidama_premium

Run this migration to update the cpi_settings table.
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

def run_migration():
    print("Starting CPI new columns migration...")

    conn = None
    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Add new audience premium columns
        new_audience_columns = [
            ("advertiser_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("user_premium", "DECIMAL(10, 4) DEFAULT 0")
        ]

        # Add region exclusion premium columns (all 12 Ethiopian regions)
        region_columns = [
            ("addis_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("oromia_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("amhara_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("tigray_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("snnpr_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("somali_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("afar_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("benishangul_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("gambela_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("harari_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("diredawa_premium", "DECIMAL(10, 4) DEFAULT 0"),
            ("sidama_premium", "DECIMAL(10, 4) DEFAULT 0")
        ]

        all_columns = new_audience_columns + region_columns

        for column_name, column_type in all_columns:
            try:
                cursor.execute(f"""
                    ALTER TABLE cpi_settings
                    ADD COLUMN IF NOT EXISTS {column_name} {column_type}
                """)
                print(f"  Added column: {column_name}")
            except Exception as e:
                if "already exists" in str(e).lower():
                    print(f"  Column {column_name} already exists, skipping...")
                else:
                    print(f"  Error adding column {column_name}: {e}")

        conn.commit()
        print("\nMigration completed successfully!")

        # Show updated table structure
        cursor.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'cpi_settings'
            ORDER BY ordinal_position
        """)

        print("\nUpdated cpi_settings table structure:")
        print("-" * 40)
        for row in cursor.fetchall():
            print(f"  {row[0]}: {row[1]}")

    except Exception as e:
        print(f"Migration failed: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    run_migration()
