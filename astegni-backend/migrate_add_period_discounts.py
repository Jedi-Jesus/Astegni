"""
Migration: Add period_discounts column to subscription_tiers table
This allows storing discount percentages for different subscription periods (1m, 3m, 6m, 9m, 12m)
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")

def migrate():
    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("Starting migration: Add period_discounts to subscription_tiers")
        print("-" * 60)

        # Check if column already exists
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'subscription_tiers' AND column_name = 'period_discounts'
        """)

        if cursor.fetchone():
            print("[OK] Column 'period_discounts' already exists. Skipping...")
            return

        # Add period_discounts column
        cursor.execute("""
            ALTER TABLE subscription_tiers
            ADD COLUMN period_discounts JSONB DEFAULT '{}'::jsonb
        """)

        conn.commit()
        print("[OK] Added period_discounts column (JSONB)")

        # Update existing records with default structure
        cursor.execute("""
            UPDATE subscription_tiers
            SET period_discounts = '{"1m": 0, "3m": 5, "6m": 10, "9m": 15, "12m": 20}'::jsonb
            WHERE period_discounts = '{}'::jsonb OR period_discounts IS NULL
        """)

        conn.commit()
        print("[OK] Initialized period_discounts for existing tiers")

        print("\nMigration completed successfully!")
        print("\nExample structure of period_discounts:")
        print('  {"1m": 0, "3m": 5, "6m": 10, "9m": 15, "12m": 20}')
        print("  where each key is the period and value is discount percentage")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"[ERROR] Migration failed: {e}")
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate()
