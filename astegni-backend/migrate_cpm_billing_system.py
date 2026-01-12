"""
Migration: CPM (Cost Per Mille) Billing System
Implements pay-per-1000-impressions charging model for campaigns

Changes:
1. Add advertiser balance tracking to advertiser_profiles
2. Add CPM billing fields to campaign_profile
3. Create advertiser_transactions table for payment history
4. Create campaign_impressions table for real-time tracking
5. Update advertisement_earnings to support CPM billing

Migration Date: 2026-01-02
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
        print("MIGRATION: CPM Billing System")
        print("=" * 70)

        # ============================================
        # 1. Add Balance to Advertiser Profiles
        # ============================================
        print("\n[1/5] Adding balance columns to advertiser_profiles...")

        cursor.execute("""
            ALTER TABLE advertiser_profiles
            ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'ETB',
            ADD COLUMN IF NOT EXISTS total_deposits DECIMAL(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS last_transaction_at TIMESTAMP
        """)
        print("   [OK] Added: balance, currency, total_deposits, total_spent, last_transaction_at")

        # ============================================
        # 2. Add CPM Billing Fields to campaign_profile
        # ============================================
        print("\n[2/5] Adding CPM billing fields to campaign_profile...")

        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD COLUMN IF NOT EXISTS impressions_delivered BIGINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS impressions_charged BIGINT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS last_billing_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS cpi_rate DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS total_charged DECIMAL(12,2) DEFAULT 0.00,
            ADD COLUMN IF NOT EXISTS billing_frequency INTEGER DEFAULT 1000,
            ADD COLUMN IF NOT EXISTS auto_pause_on_low_balance BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS minimum_balance_threshold DECIMAL(12,2) DEFAULT 100.00,
            ADD COLUMN IF NOT EXISTS launched_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS pause_reason VARCHAR(100)
        """)
        print("   [OK] Added: impressions_delivered, impressions_charged, cpi_rate")
        print("   [OK] Added: total_charged, billing_frequency, auto_pause_on_low_balance")
        print("   [OK] Added: minimum_balance_threshold, launched_at, ended_at, pause_reason")

        # ============================================
        # 3. Create advertiser_transactions Table
        # ============================================
        print("\n[3/5] Creating advertiser_transactions table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS advertiser_transactions (
                id SERIAL PRIMARY KEY,
                advertiser_id INTEGER NOT NULL,
                campaign_id INTEGER,
                brand_id INTEGER,
                transaction_type VARCHAR(50) NOT NULL,
                amount DECIMAL(12,2) NOT NULL,
                balance_before DECIMAL(12,2),
                balance_after DECIMAL(12,2),
                currency VARCHAR(3) DEFAULT 'ETB',
                description TEXT,
                impressions_count INTEGER,
                payment_method VARCHAR(50),
                payment_reference VARCHAR(255),
                status VARCHAR(50) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (advertiser_id) REFERENCES advertiser_profiles(id) ON DELETE CASCADE
            )
        """)
        print("   [OK] Created advertiser_transactions table")
        print("   [OK] Transaction types: deposit, deduction, refund, adjustment")

        # Create indexes for performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_advertiser_transactions_advertiser
            ON advertiser_transactions(advertiser_id);

            CREATE INDEX IF NOT EXISTS idx_advertiser_transactions_campaign
            ON advertiser_transactions(campaign_id);

            CREATE INDEX IF NOT EXISTS idx_advertiser_transactions_type
            ON advertiser_transactions(transaction_type);

            CREATE INDEX IF NOT EXISTS idx_advertiser_transactions_created
            ON advertiser_transactions(created_at DESC);
        """)
        print("   [OK] Created indexes for advertiser_transactions")

        # ============================================
        # 4. Create campaign_impressions Table
        # ============================================
        print("\n[4/5] Creating campaign_impressions table...")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_impressions (
                id SERIAL PRIMARY KEY,
                campaign_id INTEGER NOT NULL,
                brand_id INTEGER,
                user_id INTEGER,
                profile_id INTEGER,
                profile_type VARCHAR(50),
                placement VARCHAR(50),
                location VARCHAR(100),
                audience VARCHAR(50),
                region VARCHAR(100),
                device_type VARCHAR(50),
                ip_address VARCHAR(45),
                user_agent TEXT,
                session_id VARCHAR(255),
                is_unique_impression BOOLEAN DEFAULT TRUE,
                is_viewable BOOLEAN DEFAULT FALSE,
                viewable_duration INTEGER,
                clicked BOOLEAN DEFAULT FALSE,
                clicked_at TIMESTAMP,
                converted BOOLEAN DEFAULT FALSE,
                converted_at TIMESTAMP,
                cpi_rate DECIMAL(10,4),
                charged BOOLEAN DEFAULT FALSE,
                charged_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (campaign_id) REFERENCES campaign_profile(id) ON DELETE CASCADE
            )
        """)
        print("   [OK] Created campaign_impressions table")
        print("   [OK] Tracks: impressions, clicks, conversions, viewability")

        # Create indexes for real-time tracking
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_impressions_campaign
            ON campaign_impressions(campaign_id);

            CREATE INDEX IF NOT EXISTS idx_campaign_impressions_user
            ON campaign_impressions(user_id);

            CREATE INDEX IF NOT EXISTS idx_campaign_impressions_charged
            ON campaign_impressions(charged, campaign_id);

            CREATE INDEX IF NOT EXISTS idx_campaign_impressions_created
            ON campaign_impressions(created_at DESC);

            CREATE INDEX IF NOT EXISTS idx_campaign_impressions_placement
            ON campaign_impressions(placement);

            CREATE INDEX IF NOT EXISTS idx_campaign_impressions_location
            ON campaign_impressions(location);
        """)
        print("   [OK] Created indexes for campaign_impressions")

        # ============================================
        # 5. Update advertisement_earnings for CPM
        # ============================================
        print("\n[5/5] Updating advertisement_earnings for CPM billing...")

        cursor.execute("""
            ALTER TABLE advertisement_earnings
            ADD COLUMN IF NOT EXISTS billing_period_id INTEGER,
            ADD COLUMN IF NOT EXISTS impressions_start BIGINT,
            ADD COLUMN IF NOT EXISTS impressions_end BIGINT,
            ADD COLUMN IF NOT EXISTS cpi_rate_used DECIMAL(10,4),
            ADD COLUMN IF NOT EXISTS transaction_id INTEGER
        """)
        print("   [OK] Added: billing_period_id, impressions_start, impressions_end")
        print("   [OK] Added: cpi_rate_used, transaction_id")

        # Commit all changes
        conn.commit()

        print("\n" + "=" * 70)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\nNew Tables Created:")
        print("  1. advertiser_transactions - Payment history tracking")
        print("  2. campaign_impressions - Real-time impression tracking")
        print("\nUpdated Tables:")
        print("  1. advertiser_profiles - Added balance tracking")
        print("  2. campaign_profile - Added CPM billing fields")
        print("  3. advertisement_earnings - Added CPM metadata")
        print("\nNext Steps:")
        print("  1. Update advertiser_brands_endpoints.py with CPM logic")
        print("  2. Create impression tracking endpoint")
        print("  3. Create balance management endpoints")
        print("  4. Update frontend campaign modal")
        print("=" * 70)

    except Exception as e:
        print(f"\n[ERROR] ERROR during migration: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate()
