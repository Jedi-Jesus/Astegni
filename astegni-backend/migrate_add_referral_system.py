"""
Migration: Add Referral/Share Tracking System
Creates tables to track user referrals and registrations via shared links
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Creating referral system tables...")

        # Create user_referral_codes table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_referral_codes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                referral_code VARCHAR(20) UNIQUE NOT NULL,
                profile_type VARCHAR(20) NOT NULL,
                total_referrals INTEGER DEFAULT 0,
                active_referrals INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_user_profile_referral UNIQUE (user_id, profile_type)
            );
        """))
        print("[OK] Created user_referral_codes table")

        # Create referral_registrations table
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS referral_registrations (
                id SERIAL PRIMARY KEY,
                referrer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                referrer_profile_type VARCHAR(20) NOT NULL,
                referral_code VARCHAR(20) NOT NULL,
                referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                referred_user_email VARCHAR(255) NOT NULL,
                referred_user_name VARCHAR(255),
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT TRUE,
                last_activity TIMESTAMP,
                notes TEXT,
                CONSTRAINT unique_referred_user UNIQUE (referred_user_id)
            );
        """))
        print("[OK] Created referral_registrations table")

        # Create referral_clicks table for analytics
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS referral_clicks (
                id SERIAL PRIMARY KEY,
                referral_code VARCHAR(20) NOT NULL,
                clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ip_address VARCHAR(45),
                user_agent TEXT,
                converted BOOLEAN DEFAULT FALSE,
                converted_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
            );
        """))
        print("[OK] Created referral_clicks table")

        # Create indexes for performance
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_referral_codes_user
            ON user_referral_codes(user_id);
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_referral_codes_code
            ON user_referral_codes(referral_code);
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_referral_registrations_referrer
            ON referral_registrations(referrer_user_id);
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_referral_registrations_referred
            ON referral_registrations(referred_user_id);
        """))

        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_referral_clicks_code
            ON referral_clicks(referral_code);
        """))

        print("[OK] Created indexes")

        conn.commit()
        print("\n[SUCCESS] Migration completed successfully!")
        print("\nTables created:")
        print("  - user_referral_codes (stores unique referral codes per user/profile)")
        print("  - referral_registrations (tracks who registered via shared links)")
        print("  - referral_clicks (analytics for link clicks and conversions)")

if __name__ == "__main__":
    migrate()
