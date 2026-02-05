"""
Test script to verify /api/switch-role endpoint is working
and actually updating the database
"""

import requests
import time
import sys
import io

# Fix Windows console encoding for emojis
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

API_BASE_URL = "http://localhost:8000"

print("=" * 70)
print("TESTING /api/switch-role ENDPOINT")
print("=" * 70)

# Step 1: Login
print("\n[1] Logging in...")
login_response = requests.post(f"{API_BASE_URL}/api/login", data={
    "username": "jediael.s.abebe@gmail.com",
    "password": "@JesusJediael1234"
})

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data["access_token"]
user_id = login_data["user"]["id"]
initial_role = login_data["user"].get("active_role") or login_data["user"].get("role")

print(f"✅ Logged in")
print(f"   User ID: {user_id}")
print(f"   Initial role: {initial_role}")
print(f"   Available roles: {login_data['user'].get('roles', [])}")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Step 2: Choose target role
available_roles = login_data['user'].get('roles', [])
if len(available_roles) < 2:
    print(f"\n⚠️ User only has {len(available_roles)} role(s)")
    print("   Cannot test role switching with single role")
    exit(1)

target_role = None
for role in available_roles:
    if role != initial_role:
        target_role = role
        break

if not target_role:
    print("❌ Could not find different role to switch to")
    exit(1)

# Step 3: Call /api/switch-role
print(f"\n[2] Calling POST /api/switch-role with role='{target_role}'...")
print(f"    Switching: {initial_role} → {target_role}")
print(f"    ⚠️ WATCH THE BACKEND TERMINAL FOR LOGS!")
print(f"    Expected logs:")
print(f"       [switch-role] BEFORE update: user {user_id} active_role = {initial_role}")
print(f"       [switch-role] AFTER update (before commit): user {user_id} active_role = {target_role}")
print(f"       [switch-role] ✅ COMMIT SUCCESSFUL")
print(f"       [switch-role] VERIFIED from DB (fresh query): user {user_id} active_role = {target_role}")

switch_response = requests.post(
    f"{API_BASE_URL}/api/switch-role",
    headers=headers,
    json={"role": target_role}
)

print(f"\n[3] Response received:")
print(f"    Status code: {switch_response.status_code}")

if switch_response.status_code != 200:
    print(f"❌ Role switch failed!")
    print(f"    Response: {switch_response.text}")
    exit(1)

switch_data = switch_response.json()
print(f"✅ Response successful!")
print(f"    active_role: {switch_data.get('active_role')}")
print(f"    message: {switch_data.get('message')}")
print(f"    New token received: {'Yes' if 'access_token' in switch_data else 'No'}")

# Step 4: Verify by calling /api/me
print(f"\n[4] Verifying with GET /api/me...")

# Update token if new one was provided
if "access_token" in switch_data:
    headers["Authorization"] = f"Bearer {switch_data['access_token']}"

me_response = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
me_data = me_response.json()
me_active_role = me_data.get('active_role')

print(f"    /api/me returned active_role: {me_active_role}")

if me_active_role == target_role:
    print(f"✅ Role switch verified successfully!")
else:
    print(f"❌ Role switch FAILED - /api/me returned wrong role!")
    print(f"    Expected: {target_role}")
    print(f"    Got: {me_active_role}")

# Step 5: Summary
print(f"\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Initial role: {initial_role}")
print(f"Target role: {target_role}")
print(f"/api/switch-role returned: {switch_data.get('active_role')}")
print(f"/api/me returned: {me_active_role}")

if switch_data.get('active_role') == target_role and me_active_role == target_role:
    print(f"\n✅ SUCCESS - Role switch working correctly!")
    print(f"\nIf you SAW the backend logs above, the endpoint is being called.")
    print(f"If you DID NOT see the logs, there's a routing or server issue.")
else:
    print(f"\n❌ FAILURE - Role switch not working!")

print("\n")
