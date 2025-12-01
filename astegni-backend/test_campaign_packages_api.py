"""Test campaign packages API endpoint"""
import requests
import json

API_BASE_URL = 'http://localhost:8000'

# You'll need to get a token first by logging in
# For testing, you can use a hardcoded token or get it from localStorage

print("Testing Campaign Packages API...")
print("-" * 60)

# Test without authentication first to see the error
print("\n1. Testing GET /api/admin/campaign-packages (without auth):")
response = requests.get(f"{API_BASE_URL}/api/admin/campaign-packages")
print(f"   Status: {response.status_code}")
print(f"   Response: {response.text[:200]}...")

# If you have a token, uncomment and use:
# token = "YOUR_TOKEN_HERE"
# headers = {"Authorization": f"Bearer {token}"}
# response = requests.get(f"{API_BASE_URL}/api/admin/campaign-packages", headers=headers)
# print(f"\n2. Testing with authentication:")
# print(f"   Status: {response.status_code}")
# data = response.json()
# print(f"   Success: {data.get('success')}")
# print(f"   Package count: {len(data.get('packages', []))}")
# if data.get('packages'):
#     print(f"   First package: {data['packages'][0]}")
