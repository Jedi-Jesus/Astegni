"""
Seed affiliate tracking data
"""

import psycopg
import os
from dotenv import load_dotenv
import random
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def seed():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        # Get some user IDs
        cursor.execute("SELECT id FROM users LIMIT 10")
        user_ids = [row[0] for row in cursor.fetchall()]

        if not user_ids:
            print('No users found, skipping affiliate data seeding')
            return

        # Create sample affiliates
        affiliates_created = 0
        for i, user_id in enumerate(user_ids[:5], 1):  # First 5 users as affiliates
            affiliate_code = f"AFF{random.randint(10000, 99999)}"
            total_referrals = random.randint(5, 20)
            total_earnings = round(random.uniform(500, 5000), 2)
            total_paid = round(total_earnings * random.uniform(0.5, 0.9), 2)
            balance = total_earnings - total_paid

            cursor.execute("""
                INSERT INTO affiliates
                (user_id, affiliate_code, status, total_referrals, total_earnings, total_paid, balance)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (user_id, affiliate_code, 'active', total_referrals, total_earnings, total_paid, balance))

            affiliate_id = cursor.fetchone()[0]
            affiliates_created += 1

            # Create referrals for this affiliate
            for _ in range(total_referrals):
                referred_user_id = random.choice(user_ids)
                if referred_user_id != user_id:
                    conversion_value = round(random.uniform(50, 500), 2)
                    commission_earned = round(conversion_value * 0.1, 2)

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
            num_commissions = random.randint(2, 5)
            for _ in range(num_commissions):
                amount = round(random.uniform(100, 1000), 2)
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
                    'Commission payment for referrals',
                    datetime.now() - timedelta(days=random.randint(1, 60)) if status == 'paid' else None,
                    'bank_transfer' if status == 'paid' else None
                ))

        conn.commit()
        print(f'SUCCESS: Seeded {affiliates_created} affiliates with referrals and commissions')
        cursor.close()
        conn.close()

    except Exception as e:
        conn.rollback()
        print(f'ERROR: {e}')
        cursor.close()
        conn.close()

if __name__ == '__main__':
    seed()
