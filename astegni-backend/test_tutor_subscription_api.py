"""
Test tutor subscription API endpoint
"""
import requests
import json

BASE_URL = "http://localhost:8000"

# First, login to get token
print("\n1. Logging in as tutor...")
login_response = requests.post(
    f"{BASE_URL}/api/login",
    data={
        "username": "jediael.s.abebe@gmail.com",
        "password": "@JesusJediael1234"
    }
)

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data.get('access_token')
print(f"[OK] Logged in successfully, got token")

# Test the subscriptions endpoint
print("\n2. Testing GET /api/tutor/subscriptions...")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

response = requests.get(f"{BASE_URL}/api/tutor/subscriptions", headers=headers)
print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"[OK] SUCCESS: Found {len(data)} subscriptions")
    if data:
        print("\nFirst subscription:")
        print(json.dumps(data[0], indent=2, default=str))
else:
    print(f"[ERROR] Failed: {response.text}")
