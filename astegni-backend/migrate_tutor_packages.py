"""
Migration: Create tutor_packages table
Adds support for tutor package management with pricing calculator
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')

def create_tutor_packages_table():
    """Create the tutor_packages table"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Creating tutor_packages table...")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS tutor_packages (
                id SERIAL PRIMARY KEY,
                tutor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                grade_level VARCHAR(50),
                courses TEXT,
                description TEXT,
                hourly_rate DECIMAL(10, 2) NOT NULL CHECK (hourly_rate >= 0),
                days_per_week INTEGER CHECK (days_per_week >= 0 AND days_per_week <= 7),
                hours_per_day DECIMAL(4, 2) CHECK (hours_per_day >= 0 AND hours_per_day <= 24),
                payment_frequency VARCHAR(50) DEFAULT 'monthly',
                discount_1_month DECIMAL(5, 2) DEFAULT 0 CHECK (discount_1_month >= 0 AND discount_1_month <= 100),
                discount_3_month DECIMAL(5, 2) DEFAULT 0 CHECK (discount_3_month >= 0 AND discount_3_month <= 100),
                discount_6_month DECIMAL(5, 2) DEFAULT 0 CHECK (discount_6_month >= 0 AND discount_6_month <= 100),
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("✓ tutor_packages table created")

        # Create index for faster queries
        print("Creating index on tutor_id...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_tutor_packages_tutor_id
            ON tutor_packages(tutor_id);
        """)
        print("✓ Index created")

        # Create index for active packages
        print("Creating index on is_active...")
        cur.execute("""
            CREATE INDEX IF NOT EXISTS idx_tutor_packages_active
            ON tutor_packages(tutor_id, is_active);
        """)
        print("✓ Active packages index created")

        conn.commit()
        print("\n✅ Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("TUTOR PACKAGES TABLE MIGRATION")
    print("=" * 60)
    create_tutor_packages_table()
