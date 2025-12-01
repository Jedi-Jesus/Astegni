"""Test packages and schedules endpoints to debug 422 errors"""

import requests
import json

BASE_URL = "http://localhost:8000"

# You'll need to get a valid token from the browser console
# Look for: localStorage.getItem('token')
TOKEN = input("Paste your auth token from browser localStorage: ").strip()

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

print("\n" + "="*60)
print("Testing /api/tutor/packages endpoint")
print("="*60)

try:
    response = requests.get(f"{BASE_URL}/api/tutor/packages", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Response text: {response.text}")

print("\n" + "="*60)
print("Testing /api/tutor/schedules endpoint")
print("="*60)

try:
    response = requests.get(f"{BASE_URL}/api/tutor/schedules", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
    print(f"Response text: {response.text}")

print("\n" + "="*60)
print("Testing /api/me to verify token")
print("="*60)

try:
    response = requests.get(f"{BASE_URL}/api/me", headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
except Exception as e:
    print(f"Error: {e}")
