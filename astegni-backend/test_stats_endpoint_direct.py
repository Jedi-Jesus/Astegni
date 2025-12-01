"""
Direct test of the /api/connections/stats endpoint
"""
import requests

API_BASE_URL = "http://localhost:8000"

# Use the token from the logs (user 115)
# You'll need to get a fresh token by logging in first
print("Step 1: Logging in as user...")
login_response = requests.post(f"{API_BASE_URL}/api/login", data={
    "username": "jediael.s.abebe@gmail.com",  # OAuth2PasswordRequestForm uses 'username' field
    "password": "@JesusJediael1234"
})

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.json())
    exit(1)

login_data = login_response.json()
token = login_data.get("access_token")
print(f"Login successful! Token: {token[:30]}...")

# Test the /api/connections/stats endpoint
print("\nStep 2: Testing /api/connections/stats endpoint...")
headers = {
    "Authorization": f"Bearer {token}"
}

response = requests.get(f"{API_BASE_URL}/api/connections/stats", headers=headers)

print(f"\nResponse Status: {response.status_code}")
print(f"Response Headers: {response.headers}")

if response.status_code == 200:
    print("SUCCESS!")
    print(f"Response Data: {response.json()}")
else:
    print(f"ERROR: {response.status_code}")
    try:
        error_detail = response.json()
        print(f"Error Detail: {error_detail}")
    except:
        print(f"Raw Response: {response.text}")
