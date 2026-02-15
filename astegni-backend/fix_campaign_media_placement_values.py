"""
Fix Campaign Media Placement Values
Corrects placement naming convention from hyphens to underscores
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def fix_placement_values():
    """Fix placement values to use underscores instead of hyphens"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 80)
        print("FIXING CAMPAIGN MEDIA PLACEMENT VALUES")
        print("=" * 80)

        # Check current placement values
        cursor.execute("""
            SELECT placement, COUNT(*)
            FROM campaign_media
            GROUP BY placement
        """)

        print("\nCurrent placement values:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} files")

        # Fix 1: leaderboard-banner → leaderboard_banner
        cursor.execute("""
            UPDATE campaign_media
            SET placement = 'leaderboard_banner'
            WHERE placement = 'leaderboard-banner'
        """)
        updated_leaderboard = cursor.rowcount
        print(f"\n[OK] Updated {updated_leaderboard} 'leaderboard-banner' -> 'leaderboard_banner'")

        # Fix 2: in-session-skyscrapper-banner → in_session_skyscraper
        cursor.execute("""
            UPDATE campaign_media
            SET placement = 'in_session_skyscraper'
            WHERE placement = 'in-session-skyscrapper-banner'
               OR placement = 'in-session-skyscraper-banner'
               OR placement = 'in-session-skyscraper'
        """)
        updated_skyscraper = cursor.rowcount
        print(f"[OK] Updated {updated_skyscraper} skyscraper variants -> 'in_session_skyscraper'")

        # Fix 3: Standardize any other hyphenated values
        cursor.execute("""
            UPDATE campaign_media
            SET placement = REPLACE(placement, '-', '_')
            WHERE placement LIKE '%-%'
        """)
        updated_other = cursor.rowcount
        if updated_other > 0:
            print(f"[OK] Updated {updated_other} other hyphenated placements")

        conn.commit()

        # Show updated values
        cursor.execute("""
            SELECT placement, COUNT(*)
            FROM campaign_media
            GROUP BY placement
        """)

        print("\nUpdated placement values:")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} files")

        print("\n" + "=" * 80)
        print("STANDARD PLACEMENT VALUES:")
        print("=" * 80)
        print("  1. leaderboard_banner - Wide horizontal banners at top of pages")
        print("  2. logo - Square/vertical ads in sidebar widgets")
        print("  3. in_session_skyscraper - Vertical banners during whiteboard sessions")
        print("=" * 80)

        cursor.close()
        conn.close()

        print("\n[SUCCESS] Placement values fixed successfully!")
        print("\nNext steps:")
        print("  1. Refresh your browser")
        print("  2. Ads should now display correctly")

    except Exception as e:
        print(f"\n[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
        if conn:
            conn.rollback()

if __name__ == "__main__":
    fix_placement_values()
