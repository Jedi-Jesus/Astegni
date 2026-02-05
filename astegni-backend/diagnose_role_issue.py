"""
Diagnostic script to identify role reversion issue

This script checks:
1. What's in the database
2. What the API returns
3. Whether the fix is working
"""

import requests
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

API_BASE_URL = "http://localhost:8000"
DATABASE_URL = os.getenv('DATABASE_URL')

print("=" * 70)
print("ROLE REVERSION DIAGNOSTIC TOOL")
print("=" * 70)

# Step 1: Login
print("\n[STEP 1] Logging in...")
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

print(f"✅ Logged in as user ID: {user_id}")
print(f"   Initial role from login: {initial_role}")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Step 2: Check database directly
print("\n[STEP 2] Checking database directly...")
try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text(f"SELECT id, email, active_role, roles FROM users WHERE id = {user_id}"))
        row = result.fetchone()
        if row:
            db_active_role = row[2]
            db_roles = row[3]
            print(f"✅ Database query successful")
            print(f"   active_role in DB: {db_active_role}")
            print(f"   roles in DB: {db_roles}")
        else:
            print(f"❌ User not found in database")
            exit(1)
except Exception as e:
    print(f"❌ Database query failed: {e}")
    exit(1)

# Step 3: Call /api/me
print("\n[STEP 3] Calling /api/me...")
me_response = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
if me_response.status_code != 200:
    print(f"❌ /api/me failed: {me_response.status_code}")
    print(me_response.text)
    exit(1)

me_data = me_response.json()
api_active_role = me_data.get("active_role")
print(f"✅ /api/me returned successfully")
print(f"   active_role from API: {api_active_role}")

# Step 4: Switch role to tutor
print("\n[STEP 4] Switching role to 'tutor'...")
switch_response = requests.post(
    f"{API_BASE_URL}/api/switch-role",
    headers=headers,
    json={"role": "tutor"}
)

if switch_response.status_code != 200:
    print(f"❌ Role switch failed: {switch_response.status_code}")
    print(switch_response.text)
    exit(1)

switch_data = switch_response.json()
print(f"✅ Role switch successful")
print(f"   New active_role: {switch_data.get('active_role')}")

# Update token
if "access_token" in switch_data:
    token = switch_data["access_token"]
    headers["Authorization"] = f"Bearer {token}"

# Step 5: Check database again
print("\n[STEP 5] Checking database after role switch...")
with engine.connect() as conn:
    result = conn.execute(text(f"SELECT id, email, active_role, roles FROM users WHERE id = {user_id}"))
    row = result.fetchone()
    db_active_role_after = row[2]
    print(f"   active_role in DB after switch: {db_active_role_after}")

    if db_active_role_after == "tutor":
        print(f"✅ Database updated correctly!")
    else:
        print(f"❌ Database NOT updated! Still: {db_active_role_after}")

# Step 6: Call /api/me again immediately
print("\n[STEP 6] Calling /api/me immediately after switch...")
me_response_2 = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
me_data_2 = me_response_2.json()
api_active_role_2 = me_data_2.get("active_role")
print(f"   active_role from API: {api_active_role_2}")

if api_active_role_2 == "tutor":
    print(f"✅ API returned correct role!")
else:
    print(f"❌ API returned WRONG role: {api_active_role_2} (expected: tutor)")
    print(f"   THIS IS THE BUG - API returning stale data")

# Step 7: Wait and call /api/me again (simulate page reload)
print("\n[STEP 7] Waiting 3 seconds, then calling /api/me again...")
print("           (This simulates what happens when you reload the page)")
time.sleep(3)

me_response_3 = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
me_data_3 = me_response_3.json()
api_active_role_3 = me_data_3.get("active_role")
print(f"   active_role from API: {api_active_role_3}")

if api_active_role_3 == "tutor":
    print(f"✅ API STILL returned correct role!")
else:
    print(f"❌ API reverted to WRONG role: {api_active_role_3} (expected: tutor)")
    print(f"   THIS IS THE BUG - Role reverted!")

# Step 8: Check database one more time
print("\n[STEP 8] Final database check...")
with engine.connect() as conn:
    result = conn.execute(text(f"SELECT id, email, active_role, roles FROM users WHERE id = {user_id}"))
    row = result.fetchone()
    db_active_role_final = row[2]
    print(f"   active_role in DB (final): {db_active_role_final}")

# Summary
print("\n" + "=" * 70)
print("DIAGNOSTIC SUMMARY")
print("=" * 70)

print(f"\nDatabase:")
print(f"  - Before switch: {db_active_role}")
print(f"  - After switch:  {db_active_role_after}")
print(f"  - Final check:   {db_active_role_final}")

print(f"\nAPI /api/me:")
print(f"  - Before switch:     {api_active_role}")
print(f"  - After switch:      {api_active_role_2}")
print(f"  - After 3 seconds:   {api_active_role_3}")

if db_active_role_final == "tutor" and api_active_role_3 == "tutor":
    print(f"\n✅ EVERYTHING WORKING - FIX IS SUCCESSFUL!")
    print(f"   The backend is returning fresh data from database")
elif db_active_role_final == "tutor" and api_active_role_3 != "tutor":
    print(f"\n❌ BACKEND BUG - Database correct, but API returning stale data")
    print(f"   SOLUTION: Restart the backend server to apply the fix")
    print(f"   The db.expire() + db.refresh() fix is in the code but not active")
elif db_active_role_final != "tutor":
    print(f"\n❌ DATABASE BUG - Role switch not saving to database")
    print(f"   Check the /api/switch-role endpoint logic")
else:
    print(f"\n⚠️ UNKNOWN ISSUE")

print("\n")
