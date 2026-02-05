"""
Migration: Add business_type column to affiliate_tiers table
This column categorizes affiliate income sources:
- tutoring: Commission from tutor hiring transactions (up to 18% across 4 tiers)
- subscription: Commission from subscription purchases
- advertisement: Commission from ad impressions (both direct and referred user views)
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def migrate():
    """Add business_type column to affiliate_tiers table"""
    try:
        with psycopg.connect(ADMIN_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                print("Adding business_type column to affiliate_tiers...")

                # Add business_type column with default value 'tutoring' for backwards compatibility
                cur.execute("""
                    ALTER TABLE affiliate_tiers
                    ADD COLUMN IF NOT EXISTS business_type VARCHAR(50) DEFAULT 'tutoring' NOT NULL;
                """)

                # Add check constraint to ensure valid business types
                cur.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'affiliate_tiers_business_type_check'
                        ) THEN
                            ALTER TABLE affiliate_tiers
                            ADD CONSTRAINT affiliate_tiers_business_type_check
                            CHECK (business_type IN ('tutoring', 'subscription', 'advertisement'));
                        END IF;
                    END $$;
                """)

                # Update the unique constraint to include business_type
                # First drop the old constraint if it exists
                cur.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'affiliate_tiers_program_id_tier_level_key'
                        ) THEN
                            ALTER TABLE affiliate_tiers
                            DROP CONSTRAINT affiliate_tiers_program_id_tier_level_key;
                        END IF;
                    END $$;
                """)

                # Also drop the other old constraint name
                cur.execute("""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'affiliate_tiers_program_tier_unique'
                        ) THEN
                            ALTER TABLE affiliate_tiers
                            DROP CONSTRAINT affiliate_tiers_program_tier_unique;
                        END IF;
                    END $$;
                """)

                # Add new unique constraint including business_type
                cur.execute("""
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM pg_constraint
                            WHERE conname = 'affiliate_tiers_program_id_tier_level_business_type_key'
                        ) THEN
                            ALTER TABLE affiliate_tiers
                            ADD CONSTRAINT affiliate_tiers_program_id_tier_level_business_type_key
                            UNIQUE (program_id, tier_level, business_type);
                        END IF;
                    END $$;
                """)

                # Add index for faster queries by business_type
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_affiliate_tiers_business_type
                    ON affiliate_tiers(business_type);
                """)

                conn.commit()
                print("Migration completed successfully!")
                print("   - Added business_type column (tutoring|subscription|advertisement)")
                print("   - Added check constraint for valid business types")
                print("   - Updated unique constraint to include business_type")
                print("   - Added index for business_type queries")

                # Display current table structure
                cur.execute("""
                    SELECT column_name, data_type, column_default, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'affiliate_tiers'
                    ORDER BY ordinal_position;
                """)
                columns = cur.fetchall()
                print("\nCurrent affiliate_tiers table structure:")
                for col in columns:
                    print(f"   - {col[0]}: {col[1]} (default: {col[2]}, nullable: {col[3]})")

    except Exception as e:
        print(f"Migration failed: {e}")
        raise

if __name__ == "__main__":
    migrate()
