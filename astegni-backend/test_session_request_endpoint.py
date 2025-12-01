"""
Test Session Request Endpoint
Tests the /api/tutor/session-requests endpoint with different scenarios
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# First, we need a token. Let's try to login as a tutor
print("=" * 60)
print("Testing Session Request Endpoint")
print("=" * 60)

# Try to login as the test tutor (user_id 12)
login_data = {
    "username": "tutor_abebe_123",  # From seed data
    "password": "Password123"
}

print("\n1. Attempting login...")
response = requests.post(f"{BASE_URL}/api/login", json=login_data)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    token = response.json().get("access_token")
    print(f"✅ Login successful! Token: {token[:20]}...")

    # Test the session requests endpoint
    print("\n2. Testing session requests endpoint...")

    # Test without status parameter
    print("\n   a) Without status parameter:")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/tutor/session-requests", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Success! Requests: {len(response.json())}")
    else:
        print(f"   ❌ Error: {response.text}")

    # Test with status=pending
    print("\n   b) With status=pending:")
    response = requests.get(f"{BASE_URL}/api/tutor/session-requests?status=pending", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Success! Requests: {len(response.json())}")
    else:
        print(f"   ❌ Error: {response.text}")

    # Test with status=accepted
    print("\n   c) With status=accepted:")
    response = requests.get(f"{BASE_URL}/api/tutor/session-requests?status=accepted", headers=headers)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        print(f"   ✅ Success! Requests: {len(response.json())}")
    else:
        print(f"   ❌ Error: {response.text}")

else:
    print(f"❌ Login failed: {response.text}")
    print("\nTrying alternative login credentials...")

    # Try any user with tutor role
    # Let's check if there are any users in the database first
    print("\nNote: Make sure the backend is running (python app.py)")
    print("and that you have seeded tutor data (python seed_tutor_data.py)")

print("\n" + "=" * 60)
