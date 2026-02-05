"""
Test Role Switch Fix - Verify role switching no longer reverts
This test verifies the fix for the bug where /api/my-roles was reverting role switches
"""
import sys
import os
import io
import requests
import time

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))
from models import SessionLocal, User

API_BASE_URL = 'http://localhost:8000'
TEST_EMAIL = 'jediael.s.abebe@gmail.com'
TEST_PASSWORD = '@JesusJediael1234'

def print_section(title):
    print('\n' + '=' * 80)
    print(f'  {title}')
    print('=' * 80)

def check_database_active_role(label):
    """Check active_role directly from database"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == TEST_EMAIL).first()
    active_role = user.active_role if user else None
    db.close()
    print(f'{label}: {active_role}')
    return active_role

def check_api_active_role(token, label):
    """Check active_role via /api/me"""
    response = requests.get(
        f'{API_BASE_URL}/api/me',
        headers={'Authorization': f'Bearer {token}'}
    )
    if response.status_code == 200:
        data = response.json()
        active_role = data.get('active_role')
        print(f'{label}: {active_role}')
        return active_role
    else:
        print(f'{label}: ERROR - {response.status_code}')
        return None

# STEP 1: LOGIN
print_section('STEP 1: LOGIN')
login_response = requests.post(
    f'{API_BASE_URL}/api/login',
    data={'username': TEST_EMAIL, 'password': TEST_PASSWORD},
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)

if login_response.status_code != 200:
    print(f'❌ Login failed: {login_response.text}')
    sys.exit(1)

login_data = login_response.json()
ACCESS_TOKEN = login_data['access_token']
print(f'✅ Logged in as: {login_data["user"]["first_name"]}')
print(f'Initial role: {login_data["user"]["active_role"]}')

initial_role = login_data["user"]["active_role"]

# STEP 2: SWITCH ROLE (student → tutor)
print_section('STEP 2: SWITCH ROLE (student → tutor)')

switch_response = requests.post(
    f'{API_BASE_URL}/api/switch-role',
    headers={
        'Authorization': f'Bearer {ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    },
    json={'role': 'tutor'}
)

print(f'Response Status: {switch_response.status_code}')

if switch_response.status_code == 200:
    data = switch_response.json()
    print('✅ Switch API call successful!')
    print(f'  - Response says active_role: {data["user"]["active_role"]}')

    # Update token (switch generates new token)
    ACCESS_TOKEN = data['access_token']
else:
    print(f'❌ Switch failed: {switch_response.text}')
    sys.exit(1)

# STEP 3: VERIFY DATABASE IMMEDIATELY AFTER SWITCH
print_section('STEP 3: DATABASE STATE TIMELINE')
print('\n🔍 Tracking database active_role over time:\n')

db_role_1 = check_database_active_role('  1️⃣  After Login        ')
time.sleep(0.5)

# Check database after switch
db_role_2 = check_database_active_role('  2️⃣  After Switch       ')
time.sleep(0.5)

# STEP 4: CALL /api/my-roles (this was causing the revert)
print_section('STEP 4: CALL /api/my-roles (THE CRITICAL TEST)')
print('This endpoint was reverting role switches. Testing if fix works...\n')

my_roles_response = requests.get(
    f'{API_BASE_URL}/api/my-roles',
    headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
)

if my_roles_response.status_code == 200:
    data = my_roles_response.json()
    print(f'✅ /api/my-roles returned successfully')
    print(f'  - Active roles: {data.get("user_roles")}')
    print(f'  - Active role: {data.get("active_role")}')
else:
    print(f'❌ /api/my-roles failed: {my_roles_response.text}')

time.sleep(0.5)

# STEP 5: CHECK DATABASE AFTER /api/my-roles
db_role_3 = check_database_active_role('\n  3️⃣  After /api/my-roles')

# STEP 6: VERIFY VIA /api/me
time.sleep(0.5)
api_role_1 = check_api_active_role(ACCESS_TOKEN, '  4️⃣  Via /api/me       ')

# STEP 7: FINAL DATABASE CHECK
time.sleep(0.5)
db_role_4 = check_database_active_role('  5️⃣  Final State      ')

# ANALYSIS
print_section('ANALYSIS')

print('\n📊 Timeline Summary:')
print(f'  1. Initial (login):          {db_role_1}')
print(f'  2. After switch:             {db_role_2}')
print(f'  3. After /api/my-roles:      {db_role_3}')
print(f'  4. Via /api/me:              {api_role_1}')
print(f'  5. Final database state:     {db_role_4}')

print('\n🔍 Verification:')

# Check if switch worked
if db_role_2 == 'tutor':
    print('  ✅ Switch updated database correctly (student → tutor)')
else:
    print(f'  ❌ Switch failed to update database (expected tutor, got {db_role_2})')

# Check if /api/my-roles reverted it (THE BUG TEST)
if db_role_3 == 'tutor':
    print('  ✅ /api/my-roles DID NOT revert the switch!')
else:
    print(f'  ❌ /api/my-roles REVERTED the switch (tutor → {db_role_3})')

# Check final state
if db_role_4 == 'tutor':
    print('  ✅ Final state is correct (tutor)')
else:
    print(f'  ❌ Final state reverted to {db_role_4}')

# FINAL VERDICT
print_section('FINAL VERDICT')

if db_role_2 == 'tutor' and db_role_3 == 'tutor' and db_role_4 == 'tutor':
    print('\n🎉 SUCCESS! THE FIX WORKS!')
    print('\n✅ Role switch is working correctly:')
    print('  - Switch API updated database ✅')
    print('  - /api/my-roles DID NOT revert it ✅')
    print('  - Final state is correct ✅')
    print('\n🎯 THE BUG IS FIXED! Role switching no longer reverts.')
else:
    print('\n❌ FAILURE! The bug still exists.')
    print('\nDetected issues:')
    if db_role_2 != 'tutor':
        print('  - Switch API did not update database')
    if db_role_3 != 'tutor':
        print('  - /api/my-roles reverted the switch (BUG STILL PRESENT)')
    if db_role_4 != 'tutor':
        print('  - Final state is incorrect')
    print('\n⚠️  Backend may need restart, or fix not applied correctly.')

print('\n' + '=' * 80)
