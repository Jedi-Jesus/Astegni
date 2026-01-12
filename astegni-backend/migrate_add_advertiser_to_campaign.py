"""
Migration: Add advertiser_id to campaign_profile
Establishes direct relationship between campaigns and advertisers

Date: 2026-01-02
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 70)
        print("MIGRATION: Add advertiser_id to campaign_profile")
        print("=" * 70)

        # Add advertiser_id and brand_id to campaign_profile
        print("\nAdding advertiser_id and brand_id to campaign_profile...")

        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD COLUMN IF NOT EXISTS advertiser_id INTEGER,
            ADD COLUMN IF NOT EXISTS brand_id INTEGER
        """)

        print("   [OK] Added advertiser_id and brand_id columns")

        # Add foreign key constraints
        cursor.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'fk_campaign_advertiser'
                ) THEN
                    ALTER TABLE campaign_profile
                    ADD CONSTRAINT fk_campaign_advertiser
                    FOREIGN KEY (advertiser_id) REFERENCES advertiser_profiles(id)
                    ON DELETE CASCADE;
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints
                    WHERE constraint_name = 'fk_campaign_brand'
                ) THEN
                    ALTER TABLE campaign_profile
                    ADD CONSTRAINT fk_campaign_brand
                    FOREIGN KEY (brand_id) REFERENCES brand_profile(id)
                    ON DELETE SET NULL;
                END IF;
            END $$;
        """)

        print("   [OK] Added foreign key constraints")

        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_advertiser
            ON campaign_profile(advertiser_id);

            CREATE INDEX IF NOT EXISTS idx_campaign_brand
            ON campaign_profile(brand_id);

            CREATE INDEX IF NOT EXISTS idx_campaign_verification_status
            ON campaign_profile(verification_status);

            CREATE INDEX IF NOT EXISTS idx_campaign_launched
            ON campaign_profile(launched_at DESC);
        """)

        print("   [OK] Created indexes")

        conn.commit()

        print("\n" + "=" * 70)
        print("[SUCCESS] MIGRATION COMPLETED!")
        print("=" * 70)
        print("\nChanges:")
        print("  1. Added advertiser_id to campaign_profile")
        print("  2. Added brand_id to campaign_profile")
        print("  3. Added foreign key constraints")
        print("  4. Added indexes for performance")
        print("=" * 70)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate()
