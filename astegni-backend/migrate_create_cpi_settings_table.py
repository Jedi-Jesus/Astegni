"""
Migration: Create CPI Settings Table
Creates a table to store Cost Per Impression (CPI) pricing settings
in the astegni_admin_db database.

CPI Pricing Structure:
- Base rate: Cost per impression for "All" audience + "International" location
- Audience premiums: Additional cost for targeting specific audiences (tutor, student, parent)
- Location premiums: Additional cost for targeting specific locations (national, regional)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Use Admin Database
ADMIN_DATABASE_URL = os.getenv("ADMIN_DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db")

def run_migration():
    print("=" * 60)
    print("Creating CPI Settings Table in astegni_admin_db")
    print("=" * 60)

    try:
        conn = psycopg.connect(ADMIN_DATABASE_URL)
        cursor = conn.cursor()

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'cpi_settings'
            )
        """)
        table_exists = cursor.fetchone()[0]

        if table_exists:
            print("[INFO] Table 'cpi_settings' already exists. Skipping creation.")
        else:
            print("[INFO] Creating 'cpi_settings' table...")

            cursor.execute("""
                CREATE TABLE cpi_settings (
                    id SERIAL PRIMARY KEY,

                    -- Base CPI Rate (applies when no targeting)
                    base_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.05,

                    -- Audience Premiums (added to base rate)
                    tutor_premium NUMERIC(10, 4) DEFAULT 0.02,
                    student_premium NUMERIC(10, 4) DEFAULT 0.015,
                    parent_premium NUMERIC(10, 4) DEFAULT 0.018,

                    -- Location Premiums (added to base rate)
                    national_premium NUMERIC(10, 4) DEFAULT 0.01,
                    regional_premium NUMERIC(10, 4) DEFAULT 0.025,

                    -- Currency
                    currency VARCHAR(10) DEFAULT 'ETB',

                    -- Metadata
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER
                )
            """)

            print("[OK] Table 'cpi_settings' created successfully!")

            # Insert default settings
            print("[INFO] Inserting default CPI settings...")
            cursor.execute("""
                INSERT INTO cpi_settings (
                    base_rate,
                    tutor_premium,
                    student_premium,
                    parent_premium,
                    national_premium,
                    regional_premium,
                    currency
                ) VALUES (
                    0.05,   -- 0.05 ETB base rate
                    0.02,   -- +0.02 ETB for tutor targeting
                    0.015,  -- +0.015 ETB for student targeting
                    0.018,  -- +0.018 ETB for parent targeting
                    0.01,   -- +0.01 ETB for national targeting
                    0.025,  -- +0.025 ETB for regional targeting
                    'ETB'
                )
            """)

            print("[OK] Default CPI settings inserted!")

        conn.commit()

        # Verify the table
        print("\n[INFO] Verifying table structure...")
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'cpi_settings'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()
        print("\nTable 'cpi_settings' columns:")
        print("-" * 50)
        for col in columns:
            print(f"  {col[0]}: {col[1]} (default: {col[2]})")

        # Show current data
        print("\n[INFO] Current CPI settings:")
        cursor.execute("SELECT * FROM cpi_settings WHERE is_active = TRUE LIMIT 1")
        row = cursor.fetchone()
        if row:
            print(f"  Base Rate: {row[1]} ETB")
            print(f"  Tutor Premium: +{row[2]} ETB")
            print(f"  Student Premium: +{row[3]} ETB")
            print(f"  Parent Premium: +{row[4]} ETB")
            print(f"  National Premium: +{row[5]} ETB")
            print(f"  Regional Premium: +{row[6]} ETB")

        cursor.close()
        conn.close()

        print("\n" + "=" * 60)
        print("[SUCCESS] Migration completed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
