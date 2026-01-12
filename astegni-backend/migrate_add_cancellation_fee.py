"""
Migration: Add Cancellation Fee to Campaign Profile
Adds cancellation fee percentage for early campaign termination

Date: 2026-01-02
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def migrate():
    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 70)
        print("MIGRATION: Add Cancellation Fee")
        print("=" * 70)

        print("\nAdding cancellation_fee_percent to campaign_profile...")

        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD COLUMN IF NOT EXISTS cancellation_fee_percent DECIMAL(5,2) DEFAULT 5.00
        """)

        print("   [OK] Added cancellation_fee_percent (default: 5%)")

        # Also add to advertiser_profiles for platform-wide settings
        cursor.execute("""
            ALTER TABLE advertiser_profiles
            ADD COLUMN IF NOT EXISTS default_cancellation_fee_percent DECIMAL(5,2) DEFAULT 5.00
        """)

        print("   [OK] Added default_cancellation_fee_percent to advertiser_profiles")

        conn.commit()

        print("\n" + "=" * 70)
        print("[SUCCESS] MIGRATION COMPLETED!")
        print("=" * 70)
        print("\nChanges:")
        print("  1. Added cancellation_fee_percent to campaign_profile")
        print("  2. Added default_cancellation_fee_percent to advertiser_profiles")
        print("  3. Default cancellation fee: 5%")
        print("\nUsage:")
        print("  - Advertisers can cancel campaigns anytime")
        print("  - Cancellation fee (5%) applied to remaining balance")
        print("  - Final charge = delivered impressions + cancellation fee")
        print("=" * 70)

    except Exception as e:
        print(f"\n[ERROR] Migration failed: {e}")
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    migrate()
