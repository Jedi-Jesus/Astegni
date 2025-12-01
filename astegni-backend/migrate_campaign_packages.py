"""
Migration: Create campaign packages table
This table stores advertising campaign package configurations
"""

import psycopg
from psycopg.rows import dict_row
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Database URL
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def migrate():
    """Create campaign packages table"""
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("Creating campaign_packages table...")

        # Create campaign_packages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS campaign_packages (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                days INTEGER NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                description TEXT,
                is_base BOOLEAN DEFAULT FALSE,
                features JSONB DEFAULT '[]'::jsonb,
                label VARCHAR(50) DEFAULT 'none',
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Create index on display_order for efficient sorting
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_packages_order
            ON campaign_packages(display_order);
        """)

        # Create index on is_active for filtering
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_campaign_packages_active
            ON campaign_packages(is_active);
        """)

        conn.commit()
        print("✓ campaign_packages table created successfully")

        # Seed default packages
        print("\nSeeding default campaign packages...")
        seed_default_packages(cursor, conn)

    except Exception as e:
        conn.rollback()
        print(f"✗ Error creating campaign_packages table: {e}")
        raise
    finally:
        cursor.close()
        conn.close()

def seed_default_packages(cursor, conn):
    """Seed default campaign packages"""

    default_features = [
        'Unlimited impressions',
        'Custom targeting',
        'Priority placement',
        'Full analytics suite'
    ]

    default_packages = [
        {'name': 'Up to 3 Days', 'days': 3, 'price': 2000, 'description': 'Short-term campaigns', 'is_base': True, 'order': 1},
        {'name': 'Up to 7 Days', 'days': 7, 'price': 1800, 'description': '1 week campaigns', 'is_base': False, 'order': 2},
        {'name': 'Up to Half a Month', 'days': 15, 'price': 1500, 'description': '~15 days campaigns', 'is_base': False, 'order': 3},
        {'name': 'Up to 1 Month', 'days': 30, 'price': 1200, 'description': '30 days campaigns', 'is_base': False, 'order': 4},
        {'name': 'Up to 3 Months', 'days': 90, 'price': 1000, 'description': 'Quarterly campaigns', 'is_base': False, 'order': 5},
        {'name': 'Up to 6 Months', 'days': 180, 'price': 800, 'description': 'Half-year campaigns', 'is_base': False, 'order': 6},
        {'name': 'Up to 9 Months', 'days': 270, 'price': 600, 'description': 'Extended campaigns', 'is_base': False, 'order': 7},
        {'name': 'Up to 1 Year', 'days': 365, 'price': 400, 'description': 'Annual campaigns', 'is_base': False, 'order': 8}
    ]

    try:
        for pkg in default_packages:
            cursor.execute("""
                INSERT INTO campaign_packages
                (name, days, price, description, is_base, features, display_order)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
                ON CONFLICT DO NOTHING
            """, (
                pkg['name'],
                pkg['days'],
                pkg['price'],
                pkg['description'],
                pkg['is_base'],
                json.dumps(default_features),
                pkg['order']
            ))

        conn.commit()
        print("✓ Default campaign packages seeded successfully")

    except Exception as e:
        conn.rollback()
        print(f"✗ Error seeding packages: {e}")
        raise

if __name__ == '__main__':
    migrate()
