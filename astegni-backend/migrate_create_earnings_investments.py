"""
Migration: Create Earnings and Investments Tables
Creates comprehensive tables for tracking tutor earnings and investments
"""

import psycopg
from datetime import datetime

DATABASE_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"

def create_earnings_investments_tables():
    """Create earnings and investments tracking tables"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        # 1. Direct Affiliate Earnings Table
        print("Creating direct_affiliate_earnings table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS direct_affiliate_earnings (
                id SERIAL PRIMARY KEY,
                tutor_profile_id INTEGER NOT NULL REFERENCES tutor_profiles(id),
                referred_user_id INTEGER NOT NULL REFERENCES users(id),
                referred_user_name VARCHAR(255),
                referred_user_profile_picture TEXT,
                amount DECIMAL(10, 2) NOT NULL,
                commission_percentage DECIMAL(5, 2) DEFAULT 10.00,
                source VARCHAR(100),
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Indirect Affiliate Earnings Table
        print("Creating indirect_affiliate_earnings table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS indirect_affiliate_earnings (
                id SERIAL PRIMARY KEY,
                tutor_profile_id INTEGER NOT NULL REFERENCES tutor_profiles(id),
                referred_by_user_id INTEGER NOT NULL REFERENCES users(id),
                referred_by_name VARCHAR(255),
                end_user_id INTEGER NOT NULL REFERENCES users(id),
                end_user_name VARCHAR(255),
                amount DECIMAL(10, 2) NOT NULL,
                commission_percentage DECIMAL(5, 2) DEFAULT 5.00,
                levels_deep INTEGER DEFAULT 1,
                source VARCHAR(100),
                description TEXT,
                status VARCHAR(50) DEFAULT 'pending',
                earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3. Tutoring Earnings Table
        print("Creating tutoring_earnings table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tutoring_earnings (
                id SERIAL PRIMARY KEY,
                tutor_profile_id INTEGER NOT NULL REFERENCES tutor_profiles(id),
                student_user_id INTEGER NOT NULL REFERENCES users(id),
                student_name VARCHAR(255),
                student_profile_picture TEXT,
                session_id INTEGER,
                amount DECIMAL(10, 2) NOT NULL,
                session_duration INTEGER,
                session_type VARCHAR(100),
                subject VARCHAR(255),
                payment_method VARCHAR(100),
                status VARCHAR(50) DEFAULT 'pending',
                earned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 4. Tutor Investments Table
        print("Creating tutor_investments table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS tutor_investments (
                id SERIAL PRIMARY KEY,
                tutor_profile_id INTEGER NOT NULL REFERENCES tutor_profiles(id),
                investment_type VARCHAR(100) NOT NULL,
                investment_name VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                current_value DECIMAL(10, 2),
                roi_percentage DECIMAL(5, 2),
                investment_date DATE NOT NULL,
                maturity_date DATE,
                status VARCHAR(50) DEFAULT 'active',
                description TEXT,
                risk_level VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 5. Monthly Earnings Summary Table (for graph data)
        print("Creating monthly_earnings_summary table...")
        cur.execute("""
            CREATE TABLE IF NOT EXISTS monthly_earnings_summary (
                id SERIAL PRIMARY KEY,
                tutor_profile_id INTEGER NOT NULL REFERENCES tutor_profiles(id),
                year INTEGER NOT NULL,
                month INTEGER NOT NULL,
                direct_affiliate_earnings DECIMAL(10, 2) DEFAULT 0,
                indirect_affiliate_earnings DECIMAL(10, 2) DEFAULT 0,
                tutoring_earnings DECIMAL(10, 2) DEFAULT 0,
                total_earnings DECIMAL(10, 2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tutor_profile_id, year, month)
            );
        """)

        # Create indexes for performance
        print("Creating indexes...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_direct_affiliate_tutor
            ON direct_affiliate_earnings(tutor_profile_id);

            CREATE INDEX IF NOT EXISTS idx_indirect_affiliate_tutor
            ON indirect_affiliate_earnings(tutor_profile_id);

            CREATE INDEX IF NOT EXISTS idx_tutoring_earnings_tutor
            ON tutoring_earnings(tutor_profile_id);

            CREATE INDEX IF NOT EXISTS idx_investments_tutor
            ON tutor_investments(tutor_profile_id);

            CREATE INDEX IF NOT EXISTS idx_monthly_summary_tutor
            ON monthly_earnings_summary(tutor_profile_id, year, month);
        """)

        conn.commit()
        print("SUCCESS: Successfully created all earnings and investments tables!")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: Error creating tables: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    create_earnings_investments_tables()
