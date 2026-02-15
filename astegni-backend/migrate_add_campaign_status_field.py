"""
Migration: Add campaign_status field to campaign_profile table

Description: Separates verification status (admin approval) from campaign operational status (active/paused/completed).

Fields:
- verification_status: Admin verification state (pending, verified, rejected, suspended)
- campaign_status: Campaign operational state (draft, active, paused, completed, archived)

Author: Astegni Platform
Date: 2026-02-13
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")


def migrate():
    """Add campaign_status field and fix verification_status constraint"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 80)
        print("MIGRATION: Add campaign_status field to campaign_profile")
        print("=" * 80)

        # Check if campaign_status column already exists
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_name = 'campaign_profile'
              AND column_name = 'campaign_status'
        """)

        column_exists = cursor.fetchone()[0] > 0

        if column_exists:
            print("OK - campaign_status column already exists. Skipping creation.")
        else:
            print("\n1. Adding campaign_status column...")
            cursor.execute("""
                ALTER TABLE campaign_profile
                ADD COLUMN campaign_status VARCHAR(20) DEFAULT 'draft'
            """)
            print("   OK - Added campaign_status column with default 'draft'")

        # Update constraint for verification_status (admin verification only)
        print("\n2. Updating verification_status constraint...")
        cursor.execute("""
            ALTER TABLE campaign_profile
            DROP CONSTRAINT IF EXISTS campaign_profile_verification_status_check
        """)
        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD CONSTRAINT campaign_profile_verification_status_check
            CHECK (verification_status IN ('pending', 'verified', 'approved', 'rejected', 'suspended'))
        """)
        print("   OK - verification_status now allows: pending, verified, approved, rejected, suspended")

        # Add constraint for campaign_status (operational lifecycle)
        print("\n3. Adding campaign_status constraint...")
        cursor.execute("""
            ALTER TABLE campaign_profile
            DROP CONSTRAINT IF EXISTS campaign_profile_campaign_status_check
        """)
        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD CONSTRAINT campaign_profile_campaign_status_check
            CHECK (campaign_status IN ('draft', 'active', 'paused', 'completed', 'archived'))
        """)
        print("   OK - campaign_status now allows: draft, active, paused, completed, archived")

        # Migrate existing 'active' values from verification_status to campaign_status
        print("\n4. Migrating existing data...")
        cursor.execute("""
            UPDATE campaign_profile
            SET campaign_status = 'active',
                verification_status = 'verified'
            WHERE verification_status = 'active'
        """)
        affected_rows = cursor.rowcount
        print(f"   OK - Migrated {affected_rows} campaigns from verification_status='active' to campaign_status='active'")

        # Migrate existing 'paused' values
        cursor.execute("""
            UPDATE campaign_profile
            SET campaign_status = 'paused',
                verification_status = 'verified'
            WHERE verification_status = 'paused'
        """)
        affected_rows = cursor.rowcount
        print(f"   OK - Migrated {affected_rows} campaigns from verification_status='paused' to campaign_status='paused'")

        # Commit changes
        conn.commit()

        print("\n" + "=" * 80)
        print("MIGRATION SUCCESSFUL!")
        print("=" * 80)
        print("\nField Responsibilities:")
        print("  verification_status: Admin verification (pending → verified/rejected/suspended)")
        print("  campaign_status: Campaign lifecycle (draft → active ⇄ paused → completed/archived)")
        print("\n")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"\nERROR - Migration failed: {e}")
        raise
    finally:
        if conn:
            cursor.close()
            conn.close()


if __name__ == "__main__":
    migrate()
