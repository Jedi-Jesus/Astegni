"""
Test student subscription API endpoint
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# You'll need a valid JWT token for a student user
# This is just a test structure - replace with actual token
TEST_TOKEN = "your-test-token-here"

headers = {
    "Authorization": f"Bearer {TEST_TOKEN}",
    "Content-Type": "application/json"
}

print("Testing Student Subscription API Endpoints")
print("=" * 60)

# Test 1: Get all subscriptions
print("\n1. Testing GET /api/student/subscriptions")
try:
    response = requests.get(f"{BASE_URL}/api/student/subscriptions", headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"SUCCESS: Found {len(data)} subscriptions")
        if data:
            print("\nFirst subscription:")
            print(json.dumps(data[0], indent=2, default=str))
    else:
        print(f"ERROR: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")

# Test 2: Get current subscription
print("\n2. Testing GET /api/student/subscriptions/current")
try:
    response = requests.get(f"{BASE_URL}/api/student/subscriptions/current", headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("SUCCESS: Current subscription:")
        print(json.dumps(data, indent=2, default=str))
    else:
        print(f"ERROR: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")

print("\n" + "=" * 60)
print("Note: To test properly, you need a valid JWT token for a student user")
print("Get token by logging in as a student through the frontend")
