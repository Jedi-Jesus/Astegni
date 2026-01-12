"""
Migration: Add account_balance column to users table

This migration adds the account_balance field to users table to support
direct payment from user accounts instead of advertiser-specific balances.

Changes:
- Add account_balance NUMERIC(10, 2) DEFAULT 0.00 to users table
- This allows all users (regardless of role) to have a balance
- Advertisers will pay for campaigns from their user account balance
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db'
)

def run_migration():
    print("=" * 60)
    print("MIGRATION: Add account_balance to users table")
    print("=" * 60)

    try:
        with psycopg.connect(DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Check if column already exists
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                    AND column_name = 'account_balance'
                """)
                existing = cur.fetchone()

                if existing:
                    print("[INFO] account_balance column already exists. Skipping...")
                    return

                print("[1/1] Adding account_balance column to users table...")
                cur.execute("""
                    ALTER TABLE users
                    ADD COLUMN account_balance NUMERIC(10, 2) DEFAULT 0.00
                """)
                print("      Added account_balance NUMERIC(10, 2) DEFAULT 0.00")

                conn.commit()
                print("\n[SUCCESS] Migration completed successfully!")
                print("=" * 60)

                # Verify the column was added
                cur.execute("""
                    SELECT column_name, data_type, column_default
                    FROM information_schema.columns
                    WHERE table_name = 'users'
                    AND column_name = 'account_balance'
                """)
                result = cur.fetchone()
                if result:
                    print(f"\nVerification: {result[0]} ({result[1]}) DEFAULT {result[2]}")

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()
