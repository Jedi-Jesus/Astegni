"""
Migration: Add extended fields to brand_profile table

Adds the following columns:
- industry: VARCHAR(100) - The industry category of the brand
- website: VARCHAR(500) - The brand's website URL
- brand_color: VARCHAR(20) - The primary brand color (hex code)

Also updates the status check constraint to allow 'active', 'paused', 'inactive' statuses.
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def run_migration():
    print("Starting migration: Add extended fields to brand_profile...")

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            # Check if columns already exist
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name = 'brand_profile'
                AND column_name IN ('industry', 'website', 'brand_color')
            """)
            existing_columns = [row[0] for row in cur.fetchall()]

            # Add industry column if not exists
            if 'industry' not in existing_columns:
                print("Adding 'industry' column...")
                cur.execute("""
                    ALTER TABLE brand_profile
                    ADD COLUMN industry VARCHAR(100)
                """)
                print("  [OK] Added 'industry' column")
            else:
                print("  - 'industry' column already exists")

            # Add website column if not exists
            if 'website' not in existing_columns:
                print("Adding 'website' column...")
                cur.execute("""
                    ALTER TABLE brand_profile
                    ADD COLUMN website VARCHAR(500)
                """)
                print("  [OK] Added 'website' column")
            else:
                print("  - 'website' column already exists")

            # Add brand_color column if not exists
            if 'brand_color' not in existing_columns:
                print("Adding 'brand_color' column...")
                cur.execute("""
                    ALTER TABLE brand_profile
                    ADD COLUMN brand_color VARCHAR(20) DEFAULT '#8B5CF6'
                """)
                print("  [OK] Added 'brand_color' column")
            else:
                print("  - 'brand_color' column already exists")

            # Update the status check constraint to include more statuses
            print("Updating status check constraint...")
            try:
                # Drop old constraint
                cur.execute("""
                    ALTER TABLE brand_profile
                    DROP CONSTRAINT IF EXISTS brand_profile_status_check
                """)

                # Add new constraint with more status options
                cur.execute("""
                    ALTER TABLE brand_profile
                    ADD CONSTRAINT brand_profile_status_check
                    CHECK (status IN ('pending', 'verified', 'rejected', 'suspended', 'active', 'paused', 'inactive'))
                """)
                print("  [OK] Updated status check constraint")
            except Exception as e:
                print(f"  - Warning: Could not update constraint: {e}")

            conn.commit()
            print("\n[SUCCESS] Migration completed successfully!")

            # Verify the changes
            cur.execute("""
                SELECT column_name, data_type, column_default
                FROM information_schema.columns
                WHERE table_name = 'brand_profile'
                AND column_name IN ('industry', 'website', 'brand_color')
                ORDER BY column_name
            """)
            columns = cur.fetchall()
            print("\nNew columns:")
            for col in columns:
                print(f"  - {col[0]}: {col[1]} (default: {col[2]})")


if __name__ == "__main__":
    run_migration()
