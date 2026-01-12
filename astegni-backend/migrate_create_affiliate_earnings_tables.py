"""
Migration: Create new affiliate earnings tables for Advertisement, Subscription, and Commission
"""
import psycopg
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    print("Creating new affiliate earnings tables...")

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # ============================================================================
        # ADVERTISEMENT EARNINGS TABLE
        # Earnings from ads displayed to users who signed up through referral links
        # ============================================================================
        cur.execute("""
            CREATE TABLE IF NOT EXISTS advertisement_earnings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                profile_id INTEGER NOT NULL,
                profile_type VARCHAR(50) NOT NULL,
                referred_user_id INTEGER,
                referred_user_name VARCHAR(255),
                referred_user_profile_picture TEXT,
                advertiser_id INTEGER,
                advertiser_name VARCHAR(255),
                campaign_id INTEGER,
                campaign_name VARCHAR(255),
                ad_type VARCHAR(50),
                impressions INTEGER DEFAULT 0,
                clicks INTEGER DEFAULT 0,
                tier_level INTEGER DEFAULT 1,
                commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
                amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                cpm_rate NUMERIC(8, 4),
                cpc_rate NUMERIC(8, 4),
                referral_chain TEXT,
                period_start DATE,
                period_end DATE,
                status VARCHAR(50) DEFAULT 'pending',
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP
            );
        """)
        print("  - Created advertisement_earnings table")

        # ============================================================================
        # SUBSCRIPTION AFFILIATE EARNINGS TABLE
        # Commission from users they referred who subscribed
        # Uses affiliate tier levels for multi-level commissions
        # ============================================================================
        cur.execute("""
            CREATE TABLE IF NOT EXISTS subscription_affiliate_earnings (
                id SERIAL PRIMARY KEY,
                affiliate_user_id INTEGER NOT NULL,
                affiliate_profile_id INTEGER NOT NULL,
                affiliate_profile_type VARCHAR(50) NOT NULL,
                referred_user_id INTEGER NOT NULL,
                referred_user_name VARCHAR(255),
                referred_user_profile_picture TEXT,
                subscription_plan VARCHAR(100),
                subscription_amount NUMERIC(12, 2) NOT NULL,
                tier_level INTEGER DEFAULT 1,
                commission_rate NUMERIC(5, 2) NOT NULL,
                commission_amount NUMERIC(12, 2) NOT NULL,
                referral_chain TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                description TEXT,
                earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP
            );
        """)
        print("  - Created subscription_affiliate_earnings table")

        # ============================================================================
        # COMMISSION EARNINGS TABLE
        # Commission from tutor-student connections facilitated
        # Uses affiliate tier levels for multi-level commissions
        # ============================================================================
        cur.execute("""
            CREATE TABLE IF NOT EXISTS connection_commission_earnings (
                id SERIAL PRIMARY KEY,
                facilitator_user_id INTEGER NOT NULL,
                facilitator_profile_id INTEGER NOT NULL,
                facilitator_profile_type VARCHAR(50) NOT NULL,
                tutor_user_id INTEGER NOT NULL,
                tutor_name VARCHAR(255),
                tutor_profile_picture TEXT,
                student_user_id INTEGER NOT NULL,
                student_name VARCHAR(255),
                session_id INTEGER,
                session_amount NUMERIC(12, 2) NOT NULL,
                tier_level INTEGER DEFAULT 1,
                commission_rate NUMERIC(5, 2) NOT NULL,
                commission_amount NUMERIC(12, 2) NOT NULL,
                referral_chain TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                description TEXT,
                earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                paid_at TIMESTAMP
            );
        """)
        print("  - Created connection_commission_earnings table")

        # ============================================================================
        # MONTHLY AFFILIATE SUMMARY TABLE
        # Aggregated monthly data for charts
        # ============================================================================
        cur.execute("""
            CREATE TABLE IF NOT EXISTS monthly_affiliate_summary (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                profile_id INTEGER NOT NULL,
                profile_type VARCHAR(50) NOT NULL,
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                advertisement_earnings NUMERIC(12, 2) DEFAULT 0,
                subscription_earnings NUMERIC(12, 2) DEFAULT 0,
                commission_earnings NUMERIC(12, 2) DEFAULT 0,
                total_affiliate_earnings NUMERIC(12, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, profile_id, profile_type, year, month)
            );
        """)
        print("  - Created monthly_affiliate_summary table")

        # Create indexes for better performance
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_advertisement_earnings_user
            ON advertisement_earnings(user_id, profile_id, profile_type);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_subscription_affiliate_earnings_user
            ON subscription_affiliate_earnings(affiliate_user_id, affiliate_profile_id, affiliate_profile_type);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_connection_commission_earnings_user
            ON connection_commission_earnings(facilitator_user_id, facilitator_profile_id, facilitator_profile_type);
        """)
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_monthly_affiliate_summary_user
            ON monthly_affiliate_summary(user_id, profile_id, profile_type, year, month);
        """)
        print("  - Created indexes")

        conn.commit()
        print("\nMigration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
