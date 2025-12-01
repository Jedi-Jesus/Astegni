"""
Migration: Create affiliate tracking tables
These tables track affiliate users, their referrals, and commissions
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

# Database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def migrate():
    """Create affiliate tracking tables"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Creating affiliate tracking tables...")

        # 1. Affiliates table - tracks users who are affiliates
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS affiliates (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                affiliate_code VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(20) DEFAULT 'active',
                total_referrals INTEGER DEFAULT 0,
                total_earnings DECIMAL(10, 2) DEFAULT 0.00,
                total_paid DECIMAL(10, 2) DEFAULT 0.00,
                balance DECIMAL(10, 2) DEFAULT 0.00,
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_payout_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            );
        """)

        # 2. Affiliate referrals table - tracks referred users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS affiliate_referrals (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
                referred_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                referral_code VARCHAR(50),
                status VARCHAR(20) DEFAULT 'pending',
                conversion_type VARCHAR(50),
                conversion_value DECIMAL(10, 2) DEFAULT 0.00,
                commission_earned DECIMAL(10, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                converted_at TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3. Affiliate commissions table - tracks commission payments
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS affiliate_commissions (
                id SERIAL PRIMARY KEY,
                affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
                referral_id INTEGER REFERENCES affiliate_referrals(id) ON DELETE SET NULL,
                amount DECIMAL(10, 2) NOT NULL,
                commission_type VARCHAR(50),
                status VARCHAR(20) DEFAULT 'pending',
                description TEXT,
                paid_at TIMESTAMP,
                payment_method VARCHAR(50),
                transaction_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create indexes for performance
        print("Creating indexes...")

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_affiliates_user_id
            ON affiliates(user_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_affiliates_status
            ON affiliates(status);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_affiliates_code
            ON affiliates(affiliate_code);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_referrals_affiliate_id
            ON affiliate_referrals(affiliate_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_referrals_status
            ON affiliate_referrals(status);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_id
            ON affiliate_commissions(affiliate_id);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_commissions_status
            ON affiliate_commissions(status);
        """)

        conn.commit()
        print("✓ Affiliate tracking tables created successfully")

        # Seed sample data
        print("\nSeeding sample affiliate data...")
        seed_sample_data(cursor, conn)

    except Exception as e:
        conn.rollback()
        print(f"✗ Error creating affiliate tables: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def seed_sample_data(cursor, conn):
    """Seed sample affiliate data for testing"""
    import random
    from datetime import datetime, timedelta

    try:
        # Get some user IDs
        cursor.execute("SELECT id FROM users LIMIT 10")
        user_ids = [row[0] for row in cursor.fetchall()]

        if not user_ids:
            print("⚠ No users found, skipping sample data")
            return

        # Create sample affiliates
        affiliates_created = 0
        for i, user_id in enumerate(user_ids[:5], 1):  # First 5 users as affiliates
            affiliate_code = f"AFF{random.randint(10000, 99999)}"
            total_referrals = random.randint(0, 20)
            total_earnings = round(random.uniform(100, 5000), 2)
            total_paid = round(total_earnings * random.uniform(0.3, 0.9), 2)
            balance = total_earnings - total_paid

            cursor.execute("""
                INSERT INTO affiliates
                (user_id, affiliate_code, status, total_referrals, total_earnings, total_paid, balance)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING
                RETURNING id
            """, (user_id, affiliate_code, 'active', total_referrals, total_earnings, total_paid, balance))

            result = cursor.fetchone()
            if result:
                affiliates_created += 1
                affiliate_id = result[0]

                # Create referrals for this affiliate
                for _ in range(total_referrals):
                    referred_user_id = random.choice(user_ids)
                    if referred_user_id != user_id:
                        conversion_value = round(random.uniform(50, 500), 2)
                        commission_earned = round(conversion_value * 0.1, 2)  # 10% commission

                        cursor.execute("""
                            INSERT INTO affiliate_referrals
                            (affiliate_id, referred_user_id, referral_code, status, conversion_type, conversion_value, commission_earned, converted_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            affiliate_id,
                            referred_user_id,
                            affiliate_code,
                            random.choice(['pending', 'completed', 'completed']),
                            random.choice(['subscription', 'verification', 'campaign']),
                            conversion_value,
                            commission_earned,
                            datetime.now() - timedelta(days=random.randint(1, 90))
                        ))

                # Create commission records
                num_commissions = random.randint(1, 5)
                for _ in range(num_commissions):
                    amount = round(random.uniform(50, 1000), 2)
                    status = random.choice(['pending', 'paid', 'paid'])

                    cursor.execute("""
                        INSERT INTO affiliate_commissions
                        (affiliate_id, amount, commission_type, status, description, paid_at, payment_method)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (
                        affiliate_id,
                        amount,
                        'referral_commission',
                        status,
                        f'Commission payment for referrals',
                        datetime.now() - timedelta(days=random.randint(1, 60)) if status == 'paid' else None,
                        'bank_transfer' if status == 'paid' else None
                    ))

        conn.commit()
        print(f"✓ Seeded {affiliates_created} sample affiliates with referrals and commissions")

    except Exception as e:
        conn.rollback()
        print(f"✗ Error seeding sample data: {e}")
        raise

if __name__ == '__main__':
    migrate()
