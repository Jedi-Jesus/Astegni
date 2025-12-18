"""
Migration: Create pricing tables in astegni_admin_db
Tables: verification_fee, subscription_plans, affiliate_settings

These tables store admin-controlled pricing configurations.
"""

import psycopg
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Admin Database URL
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db')

def migrate():
    """Create pricing tables in admin database"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("=" * 60)
        print("Creating pricing tables in astegni_admin_db...")
        print("=" * 60)

        # 1. Create verification_fee table
        print("\n[1/3] Creating verification_fee table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verification_fee (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) UNIQUE NOT NULL,
                display_name VARCHAR(100),
                features JSONB DEFAULT '[]'::jsonb,
                price DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_verification_fee_type
            ON verification_fee(type);
        """)
        print("   [OK] verification_fee table created")

        # 2. Create subscription_plans table
        print("\n[2/3] Creating subscription_plans table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id SERIAL PRIMARY KEY,
                plan_name VARCHAR(100) UNIQUE NOT NULL,
                features JSONB DEFAULT '[]'::jsonb,
                price DECIMAL(10, 2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'ETB',
                discount_3_month DECIMAL(5, 2) DEFAULT 0,
                discount_6_month DECIMAL(5, 2) DEFAULT 0,
                discount_yearly DECIMAL(5, 2) DEFAULT 0,
                is_popular BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_subscription_plans_name
            ON subscription_plans(plan_name);
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_subscription_plans_active
            ON subscription_plans(is_active);
        """)
        print("   [OK] subscription_plans table created")

        # 3. Create affiliate_program table
        print("\n[3/3] Creating affiliate_program table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS affiliate_program (
                id SERIAL PRIMARY KEY,
                enabled BOOLEAN DEFAULT FALSE,
                payout_threshold DECIMAL(10, 2) DEFAULT 1000.0,
                payout_schedule VARCHAR(50) DEFAULT 'monthly',
                direct_basic_commission DECIMAL(5, 2) DEFAULT 10.0,
                direct_premium_commission DECIMAL(5, 2) DEFAULT 15.0,
                direct_duration_months INTEGER DEFAULT 12,
                indirect_basic_commission DECIMAL(5, 2) DEFAULT 5.0,
                indirect_premium_commission DECIMAL(5, 2) DEFAULT 7.5,
                indirect_duration_months INTEGER DEFAULT 6,
                tier_bonuses JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        print("   [OK] affiliate_program table created")

        conn.commit()
        print("\n" + "=" * 60)
        print("[SUCCESS] All pricing tables created in astegni_admin_db")
        print("=" * 60)

        # Seed default data
        print("\nSeeding default data...")
        seed_default_data(cursor, conn)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error creating pricing tables: {e}")
        raise
    finally:
        cursor.close()
        conn.close()


def seed_default_data(cursor, conn):
    """Seed default pricing data"""

    try:
        # 1. Seed verification fee types
        print("\n[1/3] Seeding verification fee types...")
        verification_fees = [
            {
                'type': 'individual',
                'display_name': 'Individual Verification',
                'features': ['Profile verification badge', 'Identity verification', 'Priority support'],
                'price': 99
            },
            {
                'type': 'organization',
                'display_name': 'Organization Verification',
                'features': ['Organization verification badge', 'Identity verification', 'Multiple user verification', 'Featured listing', 'Priority support'],
                'price': 299
            }
        ]

        for fee in verification_fees:
            cursor.execute("""
                INSERT INTO verification_fee (type, display_name, features, price)
                VALUES (%s, %s, %s::jsonb, %s)
                ON CONFLICT (type) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    features = EXCLUDED.features,
                    price = EXCLUDED.price,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                fee['type'],
                fee['display_name'],
                json.dumps(fee['features']),
                fee['price']
            ))
        print("   [OK] Verification fees seeded")

        # 2. Seed subscription plans
        print("\n[2/3] Seeding subscription plans...")
        subscription_plans = [
            {
                'plan_name': 'Basic',
                'features': ['Access to basic features', '5 GB storage', 'Email support', 'Basic analytics'],
                'price': 99,
                'discount_3_month': 5,
                'discount_6_month': 10,
                'discount_yearly': 20,
                'is_popular': False,
                'order': 1
            },
            {
                'plan_name': 'Premium',
                'features': ['All basic features', '50 GB storage', 'Priority support', 'Advanced analytics', 'API access', 'Custom branding'],
                'price': 299,
                'discount_3_month': 10,
                'discount_6_month': 15,
                'discount_yearly': 25,
                'is_popular': True,
                'order': 2
            }
        ]

        for plan in subscription_plans:
            cursor.execute("""
                INSERT INTO subscription_plans (plan_name, features, price, discount_3_month, discount_6_month, discount_yearly, is_popular, display_order)
                VALUES (%s, %s::jsonb, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (plan_name) DO UPDATE SET
                    features = EXCLUDED.features,
                    price = EXCLUDED.price,
                    discount_3_month = EXCLUDED.discount_3_month,
                    discount_6_month = EXCLUDED.discount_6_month,
                    discount_yearly = EXCLUDED.discount_yearly,
                    is_popular = EXCLUDED.is_popular,
                    display_order = EXCLUDED.display_order,
                    updated_at = CURRENT_TIMESTAMP
            """, (
                plan['plan_name'],
                json.dumps(plan['features']),
                plan['price'],
                plan['discount_3_month'],
                plan['discount_6_month'],
                plan['discount_yearly'],
                plan['is_popular'],
                plan['order']
            ))
        print("   [OK] Subscription plans seeded")

        # 3. Seed affiliate program
        print("\n[3/3] Seeding affiliate program...")
        cursor.execute("""
            INSERT INTO affiliate_program (
                enabled, payout_threshold, payout_schedule,
                direct_basic_commission, direct_premium_commission, direct_duration_months,
                indirect_basic_commission, indirect_premium_commission, indirect_duration_months
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT DO NOTHING
        """, (
            True,      # enabled
            1000.0,    # payout_threshold
            'monthly', # payout_schedule
            10.0,      # direct_basic_commission
            15.0,      # direct_premium_commission
            12,        # direct_duration_months
            5.0,       # indirect_basic_commission
            7.5,       # indirect_premium_commission
            6          # indirect_duration_months
        ))
        print("   [OK] Affiliate program seeded")

        conn.commit()

        # Show summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)

        cursor.execute("SELECT type, display_name, price FROM verification_fee ORDER BY id")
        rows = cursor.fetchall()
        print(f"\nVerification Fees ({len(rows)} types):")
        for row in rows:
            print(f"  - {row[0]} ({row[1]}): ETB {row[2]}")

        cursor.execute("SELECT plan_name, price, is_popular FROM subscription_plans ORDER BY display_order")
        rows = cursor.fetchall()
        print(f"\nSubscription Plans ({len(rows)} plans):")
        for row in rows:
            popular = " [POPULAR]" if row[2] else ""
            print(f"  - {row[0]}: ETB {row[1]}/month{popular}")

        cursor.execute("SELECT enabled, payout_threshold, payout_schedule FROM affiliate_program LIMIT 1")
        row = cursor.fetchone()
        if row:
            print(f"\nAffiliate Program:")
            print(f"  - Enabled: {row[0]}")
            print(f"  - Payout Threshold: ETB {row[1]}")
            print(f"  - Payout Schedule: {row[2]}")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Error seeding data: {e}")
        raise


if __name__ == '__main__':
    migrate()
