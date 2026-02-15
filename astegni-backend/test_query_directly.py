"""
Test Campaign Query Directly
Tests the exact SQL query used by the ads endpoint
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def test_query():
    """Test the ads query directly"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 80)
        print("TESTING ADS QUERY DIRECTLY")
        print("=" * 80)

        # Test 1: Leaderboard Banner
        print("\n1. LEADERBOARD BANNER ADS")
        print("-" * 80)

        query = """
            SELECT
                cp.id as campaign_id,
                cp.name as campaign_name,
                cp.advertiser_id,
                cp.brand_id,
                cm.id as media_id,
                cm.file_url,
                cm.content_type as file_type,
                cm.media_type,
                0 as duration,
                cp.target_location,
                cp.target_audiences,
                cp.target_regions,
                cp.cpi_rate
            FROM campaign_profile cp
            INNER JOIN campaign_media cm ON cp.id = cm.campaign_id
            WHERE cp.campaign_status = 'active'
              AND cp.verification_status IN ('verified', 'approved')
              AND cm.placement = %s
            ORDER BY RANDOM()
            LIMIT 5
        """

        cursor.execute(query, ('leaderboard_banner',))
        rows = cursor.fetchall()

        print(f"   Found {len(rows)} leaderboard banner ads")

        for row in rows:
            print(f"\n   Campaign #{row[0]}: {row[1]}")
            print(f"      Media ID: {row[4]}")
            print(f"      Media Type: {row[7]}")
            print(f"      File URL: {row[5][:70]}...")
            print(f"      CPI Rate: {row[12]}")

        # Test 2: Logo Ads
        print("\n\n2. LOGO ADS")
        print("-" * 80)

        cursor.execute(query, ('logo',))
        rows = cursor.fetchall()

        print(f"   Found {len(rows)} logo ads")

        for row in rows:
            print(f"\n   Campaign #{row[0]}: {row[1]}")
            print(f"      Media ID: {row[4]}")
            print(f"      Media Type: {row[7]}")
            print(f"      File URL: {row[5][:70]}...")
            print(f"      CPI Rate: {row[12]}")

        print("\n" + "=" * 80)
        print("QUERY TEST COMPLETE")
        print("=" * 80)

        if len(rows) > 0:
            print("\n[SUCCESS] Query works! Ads are available in database.")
            print("\nIf ads still don't show on frontend:")
            print("  1. Make sure backend server is running: python astegni-backend/app.py")
            print("  2. Check browser console for errors (F12)")
            print("  3. Check Network tab in DevTools for API calls")
        else:
            print("\n[WARNING] Query works but returned 0 ads")
            print("  - Need more campaigns with active status and verified status")
            print("  - Need campaign media uploaded with correct placement values")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_query()
