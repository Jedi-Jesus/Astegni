"""
Migration: Add brand_ids array to advertiser_profiles table
This creates the relationship between advertisers and their brands.
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
    print("=" * 60)
    print("MIGRATION: Add brand_ids to advertiser_profiles")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check if column already exists
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'advertiser_profiles'
                    AND column_name = 'brand_ids'
                """)

                if cur.fetchone():
                    print("[INFO] Column 'brand_ids' already exists. Skipping...")
                    return

                # Add brand_ids column
                print("[1/2] Adding brand_ids column...")
                cur.execute("""
                    ALTER TABLE advertiser_profiles
                    ADD COLUMN brand_ids INTEGER[] DEFAULT '{}'::INTEGER[]
                """)
                print("      Done!")

                # Add index for faster lookups
                print("[2/2] Creating index on brand_ids...")
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_advertiser_profiles_brand_ids
                    ON advertiser_profiles USING GIN (brand_ids)
                """)
                print("      Done!")

                conn.commit()
                print("\n[SUCCESS] Migration completed successfully!")
                print("=" * 60)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
