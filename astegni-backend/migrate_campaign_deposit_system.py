"""
Migration: Campaign 20% Deposit System
Adds fields to support the new payment model:
- 20% non-refundable deposit upfront
- Pay remaining 80% after impressions delivered
- Invoice system for outstanding balance
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db')

def migrate():
    """Add new fields to campaign_profile for deposit payment system"""

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Adding new fields to campaign_profile table...")

        # Add new fields for deposit payment system
        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) DEFAULT 20.00,
            ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS deposit_transaction_id INTEGER,
            ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS total_impressions_planned BIGINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS payment_model CHARACTER VARYING(50) DEFAULT 'deposit',
            ADD COLUMN IF NOT EXISTS invoice_id INTEGER,
            ADD COLUMN IF NOT EXISTS invoice_status CHARACTER VARYING(50) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS invoice_due_date TIMESTAMP,
            ADD COLUMN IF NOT EXISTS final_settlement_amount NUMERIC(10,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS final_settlement_paid BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS final_settlement_transaction_id INTEGER
        """)

        print("OK - Added deposit payment fields to campaign_profile")

        # Create campaign_invoices table for tracking remaining payments
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_invoices (
                id SERIAL PRIMARY KEY,
                campaign_id INTEGER NOT NULL REFERENCES campaign_profile(id),
                advertiser_id INTEGER NOT NULL,
                brand_id INTEGER,
                invoice_number CHARACTER VARYING(50) UNIQUE NOT NULL,
                invoice_type CHARACTER VARYING(50) DEFAULT 'final_settlement',
                amount NUMERIC(10,2) NOT NULL,
                impressions_delivered BIGINT DEFAULT 0,
                cpi_rate NUMERIC(10,4),
                deposit_amount NUMERIC(10,2) DEFAULT 0.00,
                outstanding_amount NUMERIC(10,2) NOT NULL,
                status CHARACTER VARYING(50) DEFAULT 'pending',
                issued_at TIMESTAMP DEFAULT NOW(),
                due_date TIMESTAMP,
                paid_at TIMESTAMP,
                payment_transaction_id INTEGER,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)

        print("OK - Created campaign_invoices table")

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_invoices_campaign_id
            ON campaign_invoices(campaign_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_invoices_advertiser_id
            ON campaign_invoices(advertiser_id)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_invoices_status
            ON campaign_invoices(status)
        """)

        print("OK - Created indexes on campaign_invoices")

        # Update existing campaigns to use new payment model
        cursor.execute("""
            UPDATE campaign_profile
            SET
                payment_model = 'legacy_full_payment',
                deposit_percent = 100.00,
                deposit_amount = campaign_budget,
                deposit_paid = TRUE,
                outstanding_balance = 0.00
            WHERE payment_model IS NULL AND campaign_budget > 0
        """)

        print("OK - Updated existing campaigns to legacy payment model")

        conn.commit()
        print("\nSUCCESS: Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: Migration failed: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    migrate()
