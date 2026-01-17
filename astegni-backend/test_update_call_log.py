"""
Test updating a call log via API
"""
import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8000"
EMAIL = "jediael.s.abebe@gmail.com"
PASSWORD = "@JesusJediael1234"

print("=" * 60)
print("TESTING CALL LOG UPDATE")
print("=" * 60)

# Step 1: Login
print("\n1. Logging in...")
login_response = requests.post(
    f"{API_BASE_URL}/api/login",
    data={"username": EMAIL, "password": PASSWORD}
)

if login_response.status_code != 200:
    print(f"[FAIL] Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data.get("access_token")
user_id = login_data.get("user", {}).get("id")
print(f"[OK] Logged in successfully. User ID: {user_id}")

# Step 2: Update call log 30 (from the error message)
print("\n2. Updating call log 30...")
update_data = {
    "status": "answered",
    "answered_at": "2026-01-16T17:55:15.000Z"
}

print(f"Update data: {json.dumps(update_data, indent=2)}")

update_response = requests.put(
    f"{API_BASE_URL}/api/call-logs/30?profile_id=1&profile_type=tutor&user_id={user_id}",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json=update_data
)

print(f"\nResponse status: {update_response.status_code}")
print(f"Response body: {update_response.text}")

if update_response.status_code == 200:
    print("\n[SUCCESS] Call log updated.")
else:
    print(f"\n[FAILED] Status {update_response.status_code}")
    try:
        error_data = update_response.json()
        print(f"Error detail: {error_data.get('detail')}")
    except:
        print(f"Raw error: {update_response.text}")

print("\n" + "=" * 60)
