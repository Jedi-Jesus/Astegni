"""
Seed campaign packages data
"""

import psycopg
import os
from dotenv import load_dotenv
import json

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def seed():
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

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
        print(f'SUCCESS: Seeded {len(default_packages)} campaign packages')
        cursor.close()
        conn.close()

    except Exception as e:
        conn.rollback()
        print(f'ERROR: {e}')
        cursor.close()
        conn.close()

if __name__ == '__main__':
    seed()
