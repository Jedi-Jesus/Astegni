"""
Deep analysis of role switching to find where the switch might be reverting
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

def check_db_state(step):
    """Check actual database state"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == TEST_EMAIL).first()
    print(f'\n📊 [{step}] DATABASE STATE:')
    print(f'  users.active_role = {user.active_role}')
    db.close()
    return user.active_role

print('=' * 80)
print('DEEP ANALYSIS: ROLE SWITCH FLOW')
print('=' * 80)

# Step 1: Login
print('\n[STEP 1] LOGIN')
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
REFRESH_TOKEN = login_data['refresh_token']

print(f'✅ Logged in')
print(f'  Response says active_role: {login_data["user"]["active_role"]}')

db_role = check_db_state('AFTER LOGIN')

# Step 2: Switch to tutor
print('\n' + '=' * 80)
print('[STEP 2] SWITCH ROLE: student → tutor')
print('=' * 80)

switch_response = requests.post(
    f'{API_BASE_URL}/api/switch-role',
    headers={
        'Authorization': f'Bearer {ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    },
    json={'role': 'tutor'}
)

print(f'\nSwitch Response Status: {switch_response.status_code}')

if switch_response.status_code == 200:
    switch_data = switch_response.json()
    print(f'✅ Switch successful')
    print(f'  Response says active_role: {switch_data["active_role"]}')
    print(f'  New access_token received: Yes')
    print(f'  New refresh_token received: Yes')

    NEW_ACCESS_TOKEN = switch_data['access_token']
    NEW_REFRESH_TOKEN = switch_data['refresh_token']
else:
    print(f'❌ Switch failed: {switch_response.text}')
    sys.exit(1)

db_role_after_switch = check_db_state('IMMEDIATELY AFTER SWITCH')

# Step 3: Wait 1 second
print('\n⏱️  Waiting 1 second...')
time.sleep(1)

db_role_after_wait = check_db_state('AFTER 1 SECOND WAIT')

# Step 4: Verify with OLD token
print('\n' + '=' * 80)
print('[STEP 3] VERIFY WITH OLD TOKEN')
print('=' * 80)

old_token_response = requests.get(
    f'{API_BASE_URL}/api/me',
    headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
)

print(f'Status: {old_token_response.status_code}')
if old_token_response.status_code == 200:
    data = old_token_response.json()
    print(f'⚠️  OLD TOKEN STILL WORKS!')
    print(f'  active_role: {data.get("active_role")}')
else:
    print(f'✅ Old token rejected (as expected)')

# Step 5: Verify with NEW token
print('\n' + '=' * 80)
print('[STEP 4] VERIFY WITH NEW TOKEN')
print('=' * 80)

new_token_response = requests.get(
    f'{API_BASE_URL}/api/me',
    headers={'Authorization': f'Bearer {NEW_ACCESS_TOKEN}'}
)

print(f'Status: {new_token_response.status_code}')
if new_token_response.status_code == 200:
    data = new_token_response.json()
    print(f'✅ NEW TOKEN WORKS')
    print(f'  active_role from /api/me: {data.get("active_role")}')
else:
    print(f'❌ New token rejected: {new_token_response.text}')

db_role_after_verify = check_db_state('AFTER VERIFY')

# Step 6: Get roles endpoint
print('\n' + '=' * 80)
print('[STEP 5] CHECK /api/my-roles WITH NEW TOKEN')
print('=' * 80)

roles_response = requests.get(
    f'{API_BASE_URL}/api/my-roles',
    headers={'Authorization': f'Bearer {NEW_ACCESS_TOKEN}'}
)

if roles_response.status_code == 200:
    data = roles_response.json()
    print(f'✅ /api/my-roles response:')
    print(f'  active_role: {data.get("active_role")}')
    print(f'  user_roles: {data.get("user_roles")}')
else:
    print(f'❌ Failed: {roles_response.text}')

db_role_final = check_db_state('FINAL STATE')

# Step 7: Check if database was modified
print('\n' + '=' * 80)
print('ANALYSIS SUMMARY')
print('=' * 80)

print(f'\n📊 Database active_role Timeline:')
print(f'  1. After Login:           {db_role}')
print(f'  2. After Switch:          {db_role_after_switch}')
print(f'  3. After 1 Second Wait:   {db_role_after_wait}')
print(f'  4. After Verify:          {db_role_after_verify}')
print(f'  5. Final State:           {db_role_final}')

print(f'\n🔍 Detection:')
if db_role_after_switch == 'tutor':
    print(f'  ✅ Database updated during switch: {db_role} → {db_role_after_switch}')
else:
    print(f'  ❌ Database NOT updated during switch (still {db_role_after_switch})')

if db_role_final != 'tutor':
    print(f'  ⚠️  DATABASE WAS REVERTED: {db_role_after_switch} → {db_role_final}')
    print(f'  🔍 Something is changing the database back!')
else:
    print(f'  ✅ Database remains as: {db_role_final}')

print('\n' + '=' * 80)
