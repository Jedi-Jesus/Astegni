"""
Migration: Create brand_packages table in astegni_admin_db
Fields: package_title, package_type, package_price, features[],
        discount_3_months, discount_6_months, discount_yearly,
        duration_days, duration_label
"""

import psycopg
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Admin Database URL
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db')

def migrate():
    """Create brand_packages table in admin database"""
    conn = psycopg.connect(ADMIN_DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Creating brand_packages table in astegni_admin_db...")

        # Drop existing table if needed (uncomment if you want to recreate)
        # cursor.execute("DROP TABLE IF EXISTS brand_packages CASCADE;")

        # Create brand_packages table with new schema
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS brand_packages (
                id SERIAL PRIMARY KEY,
                package_title VARCHAR(200) NOT NULL,
                package_type VARCHAR(50) NOT NULL DEFAULT 'standard',
                package_price DECIMAL(10, 2) NOT NULL,
                features JSONB DEFAULT '[]'::jsonb,
                discount_3_months DECIMAL(5, 2) DEFAULT 0,
                discount_6_months DECIMAL(5, 2) DEFAULT 0,
                discount_yearly DECIMAL(5, 2) DEFAULT 0,
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                display_order INTEGER DEFAULT 0,
                label VARCHAR(50) DEFAULT 'none',
                duration_days INTEGER DEFAULT 30,
                duration_label VARCHAR(50) DEFAULT '1 Month',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_brand_packages_order
            ON brand_packages(display_order);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_brand_packages_active
            ON brand_packages(is_active);
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_brand_packages_type
            ON brand_packages(package_type);
        """)

        conn.commit()
        print("[OK] brand_packages table created successfully in astegni_admin_db")

        # Seed default packages
        print("\nSeeding default brand packages...")
        seed_default_packages(cursor, conn)

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error creating brand_packages table: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def seed_default_packages(cursor, conn):
    """Seed default brand packages"""

    default_packages = [
        {
            'title': 'Basic',
            'type': 'basic',
            'price': 500,
            'features': ['Up to 1000 impressions', 'Basic analytics', 'Email support'],
            'discount_3_months': 5,
            'discount_6_months': 10,
            'discount_yearly': 15,
            'description': 'Perfect for small businesses getting started',
            'order': 1,
            'label': 'none',
            'duration_days': 30,
            'duration_label': '1 Month'
        },
        {
            'title': 'Standard',
            'type': 'standard',
            'price': 1500,
            'features': ['Up to 5000 impressions', 'Advanced analytics', 'Priority support', 'Custom targeting'],
            'discount_3_months': 10,
            'discount_6_months': 15,
            'discount_yearly': 20,
            'description': 'Great for growing businesses',
            'order': 2,
            'label': 'popular',
            'duration_days': 30,
            'duration_label': '1 Month'
        },
        {
            'title': 'Premium',
            'type': 'premium',
            'price': 3000,
            'features': ['Unlimited impressions', 'Full analytics suite', 'Dedicated support', 'Priority placement', 'A/B testing'],
            'discount_3_months': 15,
            'discount_6_months': 20,
            'discount_yearly': 25,
            'description': 'For businesses that need maximum exposure',
            'order': 3,
            'label': 'recommended',
            'duration_days': 30,
            'duration_label': '1 Month'
        },
        {
            'title': 'Enterprise',
            'type': 'enterprise',
            'price': 5000,
            'features': ['Unlimited everything', 'Custom integrations', 'Account manager', 'API access', 'White-label options'],
            'discount_3_months': 20,
            'discount_6_months': 25,
            'discount_yearly': 30,
            'description': 'Tailored solutions for large organizations',
            'order': 4,
            'label': 'none',
            'duration_days': 30,
            'duration_label': '1 Month'
        }
    ]

    try:
        for pkg in default_packages:
            cursor.execute("""
                INSERT INTO brand_packages
                (package_title, package_type, package_price, features,
                 discount_3_months, discount_6_months, discount_yearly,
                 description, display_order, label, duration_days, duration_label)
                VALUES (%s, %s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (
                pkg['title'],
                pkg['type'],
                pkg['price'],
                json.dumps(pkg['features']),
                pkg['discount_3_months'],
                pkg['discount_6_months'],
                pkg['discount_yearly'],
                pkg['description'],
                pkg['order'],
                pkg['label'],
                pkg['duration_days'],
                pkg['duration_label']
            ))

        conn.commit()
        print("[OK] Default brand packages seeded successfully")

        # Show what was created
        cursor.execute("SELECT id, package_title, package_type, package_price, duration_days, duration_label FROM brand_packages ORDER BY display_order")
        rows = cursor.fetchall()
        print(f"\nCreated {len(rows)} packages:")
        for row in rows:
            print(f"  - {row[1]} ({row[2]}): ETB {row[3]} - {row[5]} ({row[4]} days)")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error seeding packages: {e}")
        raise

if __name__ == '__main__':
    migrate()
