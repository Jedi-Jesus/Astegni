"""
Complete role switch test with database verification
"""
import requests
import time
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

API_BASE_URL = "http://localhost:8000"
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def check_db(label):
    """Check database and print current active_role"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT active_role FROM users WHERE id = 1"))
        row = result.fetchone()
        print(f"[{label}] Database active_role: {row[0]}")
        return row[0]

print("=" * 70)
print("COMPLETE ROLE SWITCH TEST")
print("=" * 70)

# Step 1: Check initial database state
print("\n[STEP 1] Initial database state:")
initial_role = check_db("INITIAL")

# Step 2: Login
print("\n[STEP 2] Logging in...")
login_response = requests.post(f"{API_BASE_URL}/api/login", data={
    "username": "jediael.s.abebe@gmail.com",
    "password": "@JesusJediael1234"
})

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    exit(1)

login_data = login_response.json()
token = login_data["access_token"]
user_id = login_data["user"]["id"]
print(f"✅ Logged in (user {user_id})")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Step 3: Switch to tutor
print("\n[STEP 3] Switching to tutor...")
print("🔍 WATCH THE BACKEND TERMINAL FOR [switch-role] LOGS!")

switch_response = requests.post(
    f"{API_BASE_URL}/api/switch-role",
    headers=headers,
    json={"role": "tutor"}
)

print(f"API Response Status: {switch_response.status_code}")
if switch_response.status_code == 200:
    switch_data = switch_response.json()
    print(f"API returned active_role: {switch_data.get('active_role')}")
else:
    print(f"❌ Switch failed: {switch_response.text}")
    exit(1)

# Step 4: Check database immediately after switch
print("\n[STEP 4] Checking database immediately after switch:")
db_role_after_switch = check_db("AFTER SWITCH")

if db_role_after_switch == "tutor":
    print("✅ Database updated correctly!")
else:
    print(f"❌ Database NOT updated! Still: {db_role_after_switch}")

# Step 5: Call /api/me to see what it returns
print("\n[STEP 5] Calling /api/me to see what it returns:")
me_response = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
me_data = me_response.json()
print(f"/api/me returned active_role: {me_data.get('active_role')}")

# Step 6: Check database again
print("\n[STEP 6] Checking database after /api/me:")
db_role_after_me = check_db("AFTER /api/me")

# Step 7: Wait 5 seconds and check again
print("\n[STEP 7] Waiting 5 seconds...")
time.sleep(5)
db_role_after_wait = check_db("AFTER 5 SECONDS")

# Step 8: Call /api/me again
print("\n[STEP 8] Calling /api/me again:")
me_response_2 = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
me_data_2 = me_response_2.json()
print(f"/api/me returned active_role: {me_data_2.get('active_role')}")

# Step 9: Final database check
print("\n[STEP 9] Final database check:")
db_role_final = check_db("FINAL")

# Summary
print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"Initial:              {initial_role}")
print(f"After switch API:     {switch_data.get('active_role')}")
print(f"Database after API:   {db_role_after_switch}")
print(f"After /api/me call:   {me_data.get('active_role')}")
print(f"Database after /me:   {db_role_after_me}")
print(f"After 5 seconds:      {db_role_after_wait}")
print(f"Second /api/me call:  {me_data_2.get('active_role')}")
print(f"Final database:       {db_role_final}")

print("\n" + "=" * 70)
if db_role_final == "tutor":
    print("✅ SUCCESS - Role persisted!")
else:
    print(f"❌ FAILURE - Role reverted to {db_role_final}")
    print("\nThe role switch API worked, but something is reverting it.")
    print("Check the backend terminal logs to see if /api/me is overwriting it.")
print("=" * 70)
