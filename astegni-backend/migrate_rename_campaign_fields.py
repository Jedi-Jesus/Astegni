"""
Migration: Rename campaign fields for consistency
- Renames age_range to target_age_range
- Renames locations to target_location

Run this migration:
    python migrate_rename_campaign_fields.py
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def run_migration():
    print("=" * 60)
    print("MIGRATION: Rename Campaign Fields")
    print("=" * 60)
    print("\nThis migration will rename the following fields in ad_campaigns table:")
    print("  - age_range → target_age_range")
    print("  - locations → target_location")
    print("\n" + "=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("\nStep 1: Checking if columns exist...")

                # Check if old columns exist
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'ad_campaigns'
                    AND column_name IN ('age_range', 'locations', 'target_age_range', 'target_location');
                """)
                existing_columns = [row[0] for row in cur.fetchall()]
                print(f"Existing columns: {existing_columns}")

                # Rename age_range to target_age_range if needed
                if 'age_range' in existing_columns and 'target_age_range' not in existing_columns:
                    print("\nStep 2a: Renaming age_range to target_age_range...")
                    cur.execute("""
                        ALTER TABLE ad_campaigns
                        RENAME COLUMN age_range TO target_age_range;
                    """)
                    print("✓ age_range renamed to target_age_range")
                elif 'target_age_range' in existing_columns:
                    print("\nStep 2a: target_age_range already exists, skipping...")
                else:
                    print("\nStep 2a: Neither age_range nor target_age_range exists, skipping...")

                # Rename locations to target_location if needed
                if 'locations' in existing_columns and 'target_location' not in existing_columns:
                    print("\nStep 2b: Renaming locations to target_location...")
                    cur.execute("""
                        ALTER TABLE ad_campaigns
                        RENAME COLUMN locations TO target_location;
                    """)
                    print("✓ locations renamed to target_location")
                elif 'target_location' in existing_columns:
                    print("\nStep 2b: target_location already exists, skipping...")
                else:
                    print("\nStep 2b: Neither locations nor target_location exists, skipping...")

                conn.commit()

                print("\n" + "=" * 60)
                print("✅ Migration completed successfully!")
                print("=" * 60)
                print("\nVerifying final schema...")

                # Verify the changes
                cur.execute("""
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'ad_campaigns'
                    AND column_name IN ('target_age_range', 'target_location')
                    ORDER BY column_name;
                """)

                final_columns = cur.fetchall()
                if final_columns:
                    print("\nFinal columns in ad_campaigns:")
                    for col_name, col_type in final_columns:
                        print(f"  - {col_name} ({col_type})")
                else:
                    print("\n⚠️ Warning: Expected columns not found!")

    except psycopg.Error as e:
        print(f"\n❌ Migration failed: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return False

    return True

if __name__ == "__main__":
    success = run_migration()
    if not success:
        exit(1)
