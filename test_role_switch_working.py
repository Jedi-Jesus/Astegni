"""Test if role switching is working"""
import requests
import sys
sys.path.append('astegni-backend/app.py modules')
from models import SessionLocal, User

API_BASE = "http://localhost:8000"

print("=" * 60)
print("ROLE SWITCHING TEST")
print("=" * 60)

# Step 1: Check database state
print("\n[1] Checking database state...")
db = SessionLocal()
user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()

if not user:
    print("❌ User not found in database")
    sys.exit(1)

print(f"[OK] User: {user.first_name} {user.father_name}")
print(f"[OK] Current active_role in DB: {user.active_role}")
print(f"[OK] All roles: {user.roles}")
original_role = user.active_role
db.close()

# Step 2: Login
print("\n[2] Logging in...")
login_response = requests.post(
    f"{API_BASE}/api/login",
    data={  # OAuth2PasswordRequestForm uses form data, not JSON
        'username': 'jediael.s.abebe@gmail.com',
        'password': '@JesusJediael1234'
    }
)

if login_response.status_code != 200:
    print(f"❌ Login failed: {login_response.status_code}")
    print(f"Error: {login_response.text}")
    sys.exit(1)

login_data = login_response.json()
token = login_data.get('access_token')
print(f"[OK] Login successful")
print(f"[OK] Token received: {token[:50]}...")
print(f"[OK] Active role from login: {login_data.get('user', {}).get('active_role')}")

# Step 3: Try to switch role
target_role = 'tutor' if original_role != 'tutor' else 'student'
print(f"\n[3] Attempting to switch from '{original_role}' to '{target_role}'...")

switch_response = requests.post(
    f"{API_BASE}/api/switch-role",
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={'role': target_role}
)

print(f"Response status: {switch_response.status_code}")

if switch_response.status_code == 200:
    switch_data = switch_response.json()
    print(f"[OK] API Response: {switch_data.get('message')}")
    print(f"[OK] New active_role from API: {switch_data.get('active_role')}")
    print(f"[OK] New token received: {switch_data.get('access_token')[:50] if switch_data.get('access_token') else 'None'}...")

    # Step 4: Verify in database
    print(f"\n[4] Verifying database update...")
    db = SessionLocal()
    user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()
    print(f"[OK] Database active_role: {user.active_role}")

    if user.active_role == target_role:
        print(f"\n[SUCCESS] Role switch is WORKING correctly!")
        print(f"   Changed from '{original_role}' to '{target_role}'")
    else:
        print(f"\n[WARNING] PARTIAL SUCCESS - API succeeded but DB not updated")
        print(f"   API says: {switch_data.get('active_role')}")
        print(f"   DB says: {user.active_role}")

    db.close()
else:
    print(f"❌ Role switch failed!")
    print(f"Status code: {switch_response.status_code}")
    print(f"Error: {switch_response.text}")

print("\n" + "=" * 60)
