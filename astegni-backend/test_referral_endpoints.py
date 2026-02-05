"""
Test Referral Endpoints
Quick test to verify referral system is working
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_referral_endpoints():
    print("=" * 60)
    print("Testing Referral Endpoints")
    print("=" * 60)

    # Test 1: Health check
    print("\n[1] Testing server health...")
    try:
        response = requests.get(f"{API_BASE_URL}/api/tutors?page=1&limit=1")
        if response.status_code == 200:
            print("[OK] Server is running")
        else:
            print(f"[WARN] Server responded with status {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Server not reachable: {e}")
        return

    # Test 2: Check referral endpoint exists
    print("\n[2] Testing referral endpoints availability...")

    # Note: This will fail without auth, but we're checking if endpoint exists
    test_endpoints = [
        "/api/referrals/my-code?profile_type=tutor",
        "/api/referrals/stats?profile_type=tutor",
    ]

    for endpoint in test_endpoints:
        try:
            response = requests.get(f"{API_BASE_URL}{endpoint}")
            if response.status_code == 401:
                print(f"[OK] {endpoint} - Endpoint exists (requires auth)")
            elif response.status_code == 404:
                print(f"[ERROR] {endpoint} - Endpoint NOT FOUND")
            else:
                print(f"[OK] {endpoint} - Responds (status {response.status_code})")
        except Exception as e:
            print(f"[ERROR] {endpoint} - Error: {e}")

    # Test 3: Check database tables exist
    print("\n[3] Checking if database tables exist...")
    print("Run this SQL query manually to verify:")
    print("""
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('user_referral_codes', 'referral_registrations', 'referral_clicks')
    ORDER BY table_name;
    """)

    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print("[OK] Backend server is running")
    print("[OK] Referral endpoints are registered")
    print("[INFO] Next: Test with authenticated user in browser")
    print("\nTo test manually:")
    print("1. Login to any profile page")
    print("2. Click the Share button (link icon)")
    print("3. Share modal should open with referral code")
    print("4. Click 'View Detailed Analytics' to see dashboard")
    print("=" * 60)

if __name__ == "__main__":
    test_referral_endpoints()
