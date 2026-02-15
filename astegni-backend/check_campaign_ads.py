"""
Diagnostic Script: Check Campaign Ads Status
Checks if there are active campaigns with media for leaderboard and logo placements
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db")

def check_campaigns():
    """Check campaign data in database"""
    try:
        conn = psycopg.connect(DATABASE_URL)
        cursor = conn.cursor()

        print("=" * 80)
        print("CAMPAIGN ADS DIAGNOSTIC REPORT")
        print("=" * 80)

        # 1. Check if campaign_profile table exists
        cursor.execute("""
            SELECT COUNT(*) FROM campaign_profile
        """)
        campaign_count = cursor.fetchone()[0]
        print(f"\n1. Total campaigns in database: {campaign_count}")

        # 2. Check campaigns by status
        cursor.execute("""
            SELECT campaign_status, COUNT(*)
            FROM campaign_profile
            GROUP BY campaign_status
        """)
        print("\n2. Campaigns by status:")
        for row in cursor.fetchall():
            print(f"   - {row[0]}: {row[1]}")

        # 3. Check campaigns by verification status
        cursor.execute("""
            SELECT verification_status, COUNT(*)
            FROM campaign_profile
            GROUP BY verification_status
        """)
        print("\n3. Campaigns by verification status:")
        for row in cursor.fetchall():
            print(f"   - {row[0]}: {row[1]}")

        # 4. Check active + verified campaigns
        cursor.execute("""
            SELECT COUNT(*)
            FROM campaign_profile
            WHERE campaign_status = 'active'
              AND verification_status IN ('verified', 'approved')
        """)
        active_verified_count = cursor.fetchone()[0]
        print(f"\n4. Active + Verified campaigns: {active_verified_count}")

        # 5. Check campaign_media table
        cursor.execute("""
            SELECT COUNT(*) FROM campaign_media
        """)
        media_count = cursor.fetchone()[0]
        print(f"\n5. Total campaign media files: {media_count}")

        # 6. Check media by placement type
        cursor.execute("""
            SELECT placement, COUNT(*)
            FROM campaign_media
            GROUP BY placement
        """)
        print("\n6. Media by placement type:")
        for row in cursor.fetchall():
            print(f"   - {row[0]}: {row[1]}")

        # 7. Check leaderboard_banner ads (ready to display)
        cursor.execute("""
            SELECT
                cp.id,
                cp.name,
                cp.campaign_status,
                cp.verification_status,
                cm.placement,
                cm.media_type,
                cm.file_url
            FROM campaign_profile cp
            INNER JOIN campaign_media cm ON cp.id = cm.campaign_id
            WHERE cp.campaign_status = 'active'
              AND cp.verification_status IN ('verified', 'approved')
              AND cm.placement = 'leaderboard_banner'
            LIMIT 5
        """)

        leaderboard_ads = cursor.fetchall()
        print(f"\n7. Active Leaderboard Banner Ads: {len(leaderboard_ads)}")
        for ad in leaderboard_ads:
            print(f"   - Campaign #{ad[0]}: {ad[1]}")
            print(f"     Status: {ad[2]} | Verified: {ad[3]}")
            print(f"     Media: {ad[4]} | Type: {ad[5]}")
            print(f"     URL: {ad[6][:80]}...")

        # 8. Check logo ads (ready to display)
        cursor.execute("""
            SELECT
                cp.id,
                cp.name,
                cp.campaign_status,
                cp.verification_status,
                cm.placement,
                cm.media_type,
                cm.file_url
            FROM campaign_profile cp
            INNER JOIN campaign_media cm ON cp.id = cm.campaign_id
            WHERE cp.campaign_status = 'active'
              AND cp.verification_status IN ('verified', 'approved')
              AND cm.placement = 'logo'
            LIMIT 5
        """)

        logo_ads = cursor.fetchall()
        print(f"\n8. Active Logo Ads: {len(logo_ads)}")
        for ad in logo_ads:
            print(f"   - Campaign #{ad[0]}: {ad[1]}")
            print(f"     Status: {ad[2]} | Verified: {ad[3]}")
            print(f"     Media: {ad[4]} | Type: {ad[5]}")
            print(f"     URL: {ad[6][:80]}...")

        # 9. Check all campaigns with their media (if any exists)
        cursor.execute("""
            SELECT
                cp.id,
                cp.name,
                cp.campaign_status,
                cp.verification_status,
                COUNT(cm.id) as media_count
            FROM campaign_profile cp
            LEFT JOIN campaign_media cm ON cp.id = cm.campaign_id
            GROUP BY cp.id, cp.name, cp.campaign_status, cp.verification_status
            LIMIT 10
        """)

        print(f"\n9. Sample campaigns (first 10):")
        for row in cursor.fetchall():
            print(f"   - Campaign #{row[0]}: {row[1]}")
            print(f"     Status: {row[2]} | Verified: {row[3]} | Media files: {row[4]}")

        print("\n" + "=" * 80)
        print("DIAGNOSIS SUMMARY:")
        print("=" * 80)

        if active_verified_count == 0:
            print("❌ NO ACTIVE & VERIFIED CAMPAIGNS FOUND")
            print("   → Campaigns need to be both 'active' AND 'verified'/'approved'")

        if media_count == 0:
            print("❌ NO CAMPAIGN MEDIA FOUND")
            print("   → Advertisers need to upload media files for their campaigns")

        if len(leaderboard_ads) == 0:
            print("❌ NO LEADERBOARD BANNER ADS READY")
            print("   → Need active campaigns with media where placement='leaderboard_banner'")
        else:
            print(f"✅ {len(leaderboard_ads)} leaderboard banner ads ready to display")

        if len(logo_ads) == 0:
            print("❌ NO LOGO ADS READY")
            print("   → Need active campaigns with media where placement='logo'")
        else:
            print(f"✅ {len(logo_ads)} logo ads ready to display")

        print("\n" + "=" * 80)

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_campaigns()
