"""
Migration: Normalize placement names in campaign_media table

Replaces dashes with underscores in placement field for consistency:
- leaderboard-banner -> leaderboard_banner
- in-session-skyscrapper-banner -> in_session_skyscrapper_banner
- etc.

This ensures all placement queries work correctly.
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

def run_migration():
    """Normalize all placement names to use underscores instead of dashes"""

    try:
        # Connect to database
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()

        print("=" * 80)
        print("MIGRATION: Normalize placement names (dash -> underscore)")
        print("=" * 80)

        # Check current placement values
        print("\n1. Analyzing current placement values...")
        cursor.execute("""
            SELECT DISTINCT placement, COUNT(*) as count
            FROM campaign_media
            GROUP BY placement
            ORDER BY placement
        """)

        current_placements = cursor.fetchall()
        print(f"\nFound {len(current_placements)} unique placement values:")
        for placement in current_placements:
            print(f"  - {placement[0]}: {placement[1]} files")

        # Update placements with dashes to use underscores
        print("\n2. Normalizing placement names (replacing dashes with underscores)...")
        cursor.execute("""
            UPDATE campaign_media
            SET placement = REPLACE(placement, '-', '_')
            WHERE placement LIKE '%-%'
            RETURNING id, placement
        """)

        updated = cursor.fetchall()
        print(f"SUCCESS: Updated {len(updated)} media records")

        if updated:
            print("\nUpdated records:")
            for record in updated:
                print(f"  Media ID {record[0]}: {record[1]}")

        # Verify final state
        print("\n3. Verifying final placement values...")
        cursor.execute("""
            SELECT DISTINCT placement, COUNT(*) as count
            FROM campaign_media
            GROUP BY placement
            ORDER BY placement
        """)

        final_placements = cursor.fetchall()
        print(f"\nFinal state - {len(final_placements)} unique placement values:")
        for placement in final_placements:
            print(f"  - {placement[0]}: {placement[1]} files")

        # Check for any remaining dashes
        cursor.execute("""
            SELECT COUNT(*) FROM campaign_media WHERE placement LIKE '%-%'
        """)
        remaining_dashes = cursor.fetchone()[0]

        if remaining_dashes > 0:
            print(f"\nWARNING: {remaining_dashes} records still have dashes!")
        else:
            print("\nSUCCESS: All placement names normalized (no dashes remaining)")

        print("\n" + "=" * 80)
        print("MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 80)
        print("\nStandard placement names:")
        print("  - leaderboard_banner")
        print("  - logo")
        print("  - in_session_skyscraper")
        print("  - in_session_skyscrapper_banner (legacy)")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\nERROR: Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
