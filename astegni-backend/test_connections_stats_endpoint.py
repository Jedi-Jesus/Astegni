"""
Test script for /api/connections/stats endpoint
"""
import requests
import json

API_BASE_URL = "http://localhost:8000"

# First, let's try to get a token by logging in
print("=" * 60)
print("Testing /api/connections/stats endpoint")
print("=" * 60)

# Try with different accounts
accounts_to_try = [
    {"username": "student@example.com", "password": "password123"},
    {"username": "jediael.s.abebe@gmail.com", "password": "password123"},
    {"username": "admin@astegni.com", "password": "admin123"},
]

login_data = accounts_to_try[0]  # Try first account

print("\n1. Attempting login...")
try:
    # Login endpoint expects form data, not JSON (OAuth2PasswordRequestForm)
    login_response = requests.post(f"{API_BASE_URL}/api/login", data=login_data)
    print(f"   Login status: {login_response.status_code}")

    if login_response.status_code == 200:
        login_result = login_response.json()
        token = login_result.get("access_token")
        print(f"   [OK] Login successful!")
        print(f"   Token: {token[:50]}..." if token else "   [FAIL] No token received")

        # Now try the stats endpoint
        print("\n2. Testing /api/connections/stats endpoint...")
        headers = {
            "Authorization": f"Bearer {token}"
        }

        stats_response = requests.get(f"{API_BASE_URL}/api/connections/stats", headers=headers)
        print(f"   Status: {stats_response.status_code}")
        print(f"   Response: {json.dumps(stats_response.json(), indent=2)}")

        if stats_response.status_code == 422:
            print("\n   [ERROR] 422 Error - Unprocessable Content")
            print("   This usually means:")
            print("   - Missing required parameters")
            print("   - Invalid token structure")
            print("   - Token missing required fields (like role_ids)")

    else:
        print(f"   [FAIL] Login failed")
        print(f"   Response: {login_response.text}")

except Exception as e:
    print(f"   [ERROR] Error: {str(e)}")

print("\n" + "=" * 60)
