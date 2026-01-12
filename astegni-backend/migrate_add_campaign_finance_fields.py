"""
Migration: Add campaign finance tracking fields
Implements deposit-based pre-payment system for campaigns

New Fields:
- campaign_budget: Total budget deposited when campaign created
- amount_used: Money spent on delivered impressions (non-refundable)
- remaining_balance: Budget not yet spent (refundable minus 5% cancellation fee)
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
    print("MIGRATION: Add Campaign Finance Tracking Fields")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check if columns already exist
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'campaign_profile'
                    AND column_name IN ('campaign_budget', 'amount_used', 'remaining_balance')
                """)
                existing_columns = [row[0] for row in cur.fetchall()]

                if 'campaign_budget' in existing_columns:
                    print("[INFO] Campaign finance fields already exist. Skipping...")
                    return

                print("[1/4] Adding campaign_budget field...")
                cur.execute("""
                    ALTER TABLE campaign_profile
                    ADD COLUMN campaign_budget DECIMAL(12,2) DEFAULT 0.00,
                    ADD COLUMN amount_used DECIMAL(12,2) DEFAULT 0.00,
                    ADD COLUMN remaining_balance DECIMAL(12,2) DEFAULT 0.00
                """)
                print("      Done!")

                print("[2/4] Adding campaign payment tracking fields...")
                cur.execute("""
                    ALTER TABLE campaign_profile
                    ADD COLUMN payment_status VARCHAR(50) DEFAULT 'unpaid',
                    ADD COLUMN paid_at TIMESTAMP,
                    ADD COLUMN payment_transaction_id INTEGER
                """)
                print("      Done!")

                print("[3/4] Adding cancellation tracking fields...")
                # Add each column individually to handle existing columns
                cancellation_fields = [
                    ('cancellation_fee_percent', 'DECIMAL(5,2) DEFAULT 5.00'),
                    ('cancellation_fee_amount', 'DECIMAL(12,2) DEFAULT 0.00'),
                    ('cancelled_by_user_id', 'INTEGER'),
                    ('cancellation_reason', 'TEXT')
                ]

                for field_name, field_type in cancellation_fields:
                    # Check if column exists first
                    cur.execute("""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_name = 'campaign_profile'
                        AND column_name = %s
                    """, (field_name,))

                    if cur.fetchone():
                        print(f"      Skipped {field_name} (already exists)")
                    else:
                        cur.execute(f"""
                            ALTER TABLE campaign_profile
                            ADD COLUMN {field_name} {field_type}
                        """)
                        print(f"      Added {field_name}")
                print("      Done!")

                print("[4/4] Creating index on payment_status...")
                cur.execute("""
                    CREATE INDEX IF NOT EXISTS idx_campaign_payment_status
                    ON campaign_profile (payment_status)
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
