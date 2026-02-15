"""
Test Ads API Endpoints
Tests the campaign ads API to verify it returns correct data
"""

import requests

API_BASE_URL = "http://localhost:8000"

def test_ads_api():
    """Test the ads API endpoints"""

    print("=" * 80)
    print("TESTING ADS API ENDPOINTS")
    print("=" * 80)

    # Test 1: Leaderboard Banner Ads
    print("\n1. Testing GET /api/campaigns/ads/placement/leaderboard_banner")
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/campaigns/ads/placement/leaderboard_banner",
            params={"limit": 5}
        )

        print(f"   Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Placement: {data.get('placement_type')}")
            print(f"   Ads Count: {data.get('count')}")

            if data.get('ads'):
                print("\n   Ads returned:")
                for i, ad in enumerate(data['ads'], 1):
                    print(f"      {i}. Campaign #{ad['campaign_id']}: {ad['campaign_name']}")
                    print(f"         Media ID: {ad['media_id']}")
                    print(f"         Type: {ad['media_type']}")
                    print(f"         URL: {ad['file_url'][:60]}...")
            else:
                print("   [WARNING] No ads returned")
        else:
            print(f"   [ERROR] Request failed: {response.text}")

    except requests.exceptions.ConnectionError:
        print("   [ERROR] Cannot connect to backend. Is the server running?")
        print("   Run: cd astegni-backend && python app.py")
        return False
    except Exception as e:
        print(f"   [ERROR] {e}")
        return False

    # Test 2: Logo Ads
    print("\n2. Testing GET /api/campaigns/ads/placement/logo")
    try:
        response = requests.get(
            f"{API_BASE_URL}/api/campaigns/ads/placement/logo",
            params={"limit": 5}
        )

        print(f"   Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   Success: {data.get('success')}")
            print(f"   Placement: {data.get('placement_type')}")
            print(f"   Ads Count: {data.get('count')}")

            if data.get('ads'):
                print("\n   Ads returned:")
                for i, ad in enumerate(data['ads'], 1):
                    print(f"      {i}. Campaign #{ad['campaign_id']}: {ad['campaign_name']}")
                    print(f"         Media ID: {ad['media_id']}")
                    print(f"         Type: {ad['media_type']}")
                    print(f"         URL: {ad['file_url'][:60]}...")
            else:
                print("   [WARNING] No ads returned")
        else:
            print(f"   [ERROR] Request failed: {response.text}")

    except Exception as e:
        print(f"   [ERROR] {e}")
        return False

    print("\n" + "=" * 80)
    print("API TEST COMPLETE")
    print("=" * 80)

    return True

if __name__ == "__main__":
    success = test_ads_api()

    if success:
        print("\n[NEXT STEPS]")
        print("1. Open your browser to http://localhost:8081")
        print("2. Open browser DevTools (F12)")
        print("3. Go to Console tab")
        print("4. Refresh the page")
        print("5. Look for messages from [AdRotationManager]")
        print("\nIf ads still don't show, check:")
        print("- Is ad-rotation-manager.js loaded?")
        print("- Any JavaScript errors in console?")
        print("- Network tab shows requests to /api/campaigns/ads/placement/?")
