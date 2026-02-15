"""
Test script to verify logo ad serving endpoint works correctly
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def test_logo_ad_query():
    """Test the exact query used by the ad serving endpoint"""

    conn = None
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        # This is the exact query from campaign_launch_endpoints.py
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
            LIMIT %s
        """

        placement_type = 'logo'
        limit = 5

        print("=" * 80)
        print("TESTING LOGO AD QUERY")
        print("=" * 80)
        print(f"\nPlacement: {placement_type}")
        print(f"Limit: {limit}\n")

        cursor.execute(query, (placement_type, limit))
        rows = cursor.fetchall()

        if not rows:
            print("NO ADS FOUND!")
            print("\nPossible reasons:")
            print("  1. No campaigns with campaign_status='active'")
            print("  2. No campaigns with verification_status IN ('verified', 'approved')")
            print("  3. No campaign_media with placement='logo'")
        else:
            print(f"FOUND {len(rows)} AD(S):\n")

            for i, row in enumerate(rows, 1):
                print(f"Ad #{i}:")
                print(f"  Campaign ID: {row[0]}")
                print(f"  Campaign Name: {row[1]}")
                print(f"  Advertiser ID: {row[2]}")
                print(f"  Brand ID: {row[3]}")
                print(f"  Media ID: {row[4]}")
                print(f"  File URL: {row[5]}")
                print(f"  File Type: {row[6]}")
                print(f"  Media Type: {row[7]}")
                print(f"  CPI Rate: {row[12]}")
                print()

        print("=" * 80)
        print("TEST SUCCESSFUL!")
        print("=" * 80)

        cursor.close()

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if conn:
            conn.close()

if __name__ == '__main__':
    test_logo_ad_query()
