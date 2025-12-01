"""
Test script for admin tutor endpoints
"""
import requests
import json

API_BASE = "http://localhost:8000"

# First, login as admin
print("Logging in as admin...")
# Try as form data
login_response = requests.post(f"{API_BASE}/api/login", data={
    "username": "admin@astegni.com",
    "password": "Admin2025!"
})

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data.get("access_token")

if not token:
    print("No access token received")
    print(login_data)
    exit(1)

print(f"Logged in successfully. Token: {token[:20]}...")

# Set headers with token
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Test each endpoint
endpoints = [
    "/api/admin/tutors/pending",
    "/api/admin/tutors/verified",
    "/api/admin/tutors/rejected",
    "/api/admin/tutors/suspended"
]

for endpoint in endpoints:
    print(f"\nTesting {endpoint}...")
    response = requests.get(f"{API_BASE}{endpoint}?page=1&limit=5", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] Success! Found {data.get('total', 0)} tutors")
        if data.get('tutors'):
            print(f"  First tutor: {data['tutors'][0].get('fullName', 'No name')}")
    else:
        print(f"[FAIL] Failed with status {response.status_code}")
        print(f"  Error: {response.text}")