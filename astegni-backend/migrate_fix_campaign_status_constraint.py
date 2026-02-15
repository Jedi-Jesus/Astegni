"""
Migration: Fix campaign_status constraint

Issues Fixed:
1. Add 'cancelled' status (missing but needed for cancellation flow)
2. Remove 'archived' status (redundant with 'completed')

New campaign_status values:
- draft: Campaign created but not launched
- active: Campaign currently running
- paused: Campaign temporarily paused (reversible)
- cancelled: Campaign cancelled by user (irreversible)
- completed: Campaign ended naturally (time/budget exhausted)

State Flow:
  draft -> active -> paused -> active (resume)
                |         |
                v         v
            cancelled  cancelled
                |
                v
            completed (natural end)
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

def run_migration():
    """Fix campaign_status constraint to include 'cancelled' and remove 'archived'"""

    try:
        # Connect to database
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("=" * 80)
        print("MIGRATION: Fix campaign_status Constraint")
        print("=" * 80)

        # Check current constraint
        print("\n1. Checking current constraint...")
        cursor.execute("""
            SELECT conname, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'campaign_profile'::regclass
            AND contype = 'c'
            AND conname = 'campaign_profile_campaign_status_check'
        """)

        current_constraint = cursor.fetchone()
        if current_constraint:
            print(f"Current constraint: {current_constraint[1]}")
        else:
            print("WARNING: No existing constraint found")

        # Check if any campaigns use 'archived' status
        print("\n2. Checking for campaigns with 'archived' status...")
        cursor.execute("""
            SELECT COUNT(*) FROM campaign_profile WHERE campaign_status = 'archived'
        """)
        archived_count = cursor.fetchone()[0]

        if archived_count > 0:
            print(f"WARNING: Found {archived_count} campaigns with 'archived' status")
            print("Converting them to 'completed'...")
            cursor.execute("""
                UPDATE campaign_profile
                SET campaign_status = 'completed'
                WHERE campaign_status = 'archived'
            """)
            print(f"SUCCESS: Converted {archived_count} campaigns from 'archived' to 'completed'")
        else:
            print("OK: No campaigns using 'archived' status")

        # Drop old constraint
        print("\n3. Dropping old constraint...")
        cursor.execute("""
            ALTER TABLE campaign_profile
            DROP CONSTRAINT IF EXISTS campaign_profile_campaign_status_check
        """)
        print("SUCCESS: Old constraint dropped")

        # Add new constraint with 'cancelled' and without 'archived'
        print("\n4. Adding new constraint...")
        cursor.execute("""
            ALTER TABLE campaign_profile
            ADD CONSTRAINT campaign_profile_campaign_status_check
            CHECK (campaign_status IN ('draft', 'active', 'paused', 'cancelled', 'completed'))
        """)
        print("SUCCESS: New constraint added")

        # Verify new constraint
        print("\n5. Verifying new constraint...")
        cursor.execute("""
            SELECT conname, pg_get_constraintdef(oid)
            FROM pg_constraint
            WHERE conrelid = 'campaign_profile'::regclass
            AND contype = 'c'
            AND conname = 'campaign_profile_campaign_status_check'
        """)

        new_constraint = cursor.fetchone()
        if new_constraint:
            print(f"New constraint: {new_constraint[1]}")
        else:
            print("ERROR: Constraint not found after creation!")

        # Show current status distribution
        print("\n6. Current campaign_status distribution...")
        cursor.execute("""
            SELECT campaign_status, COUNT(*) as count
            FROM campaign_profile
            GROUP BY campaign_status
            ORDER BY campaign_status
        """)

        statuses = cursor.fetchall()
        for status in statuses:
            print(f"  {status[0]}: {status[1]} campaigns")

        print("\n" + "=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\nUpdated campaign_status values:")
        print("  - draft: Campaign created but not launched")
        print("  - active: Campaign currently running")
        print("  - paused: Campaign temporarily paused (can resume)")
        print("  - cancelled: Campaign cancelled by user (irreversible)")
        print("  - completed: Campaign ended naturally")
        print("\nRemoved:")
        print("  - archived (redundant, use 'completed' instead)")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
