"""
Test Deactivate Active Role - Verify active_role becomes None
This test verifies that when a user deactivates their current active_role,
the system sets active_role = None (Option 2)
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
initial_role = login_data["user"]["active_role"]

print(f'✅ Logged in as: {login_data["user"]["first_name"]}')
print(f'Initial active_role: {initial_role}')

# STEP 2: CHECK INITIAL STATE
print_section('STEP 2: INITIAL STATE')
db_role_initial = check_database_active_role('Database active_role')

# Get list of roles
my_roles_response = requests.get(
    f'{API_BASE_URL}/api/my-roles',
    headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
)

if my_roles_response.status_code == 200:
    data = my_roles_response.json()
    print(f'Active roles: {data.get("user_roles")}')
    print(f'Current active_role: {data.get("active_role")}')
else:
    print(f'❌ /api/my-roles failed: {my_roles_response.text}')

# STEP 3: DEACTIVATE CURRENT ACTIVE ROLE
print_section(f'STEP 3: DEACTIVATE CURRENT ACTIVE ROLE ({initial_role})')

deactivate_response = requests.post(
    f'{API_BASE_URL}/api/role/deactivate',
    headers={
        'Authorization': f'Bearer {ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    },
    json={
        'role': initial_role,
        'password': TEST_PASSWORD
    }
)

print(f'Response Status: {deactivate_response.status_code}')

if deactivate_response.status_code == 200:
    data = deactivate_response.json()
    print('✅ Deactivation successful!')
    print(f'  - Message: {data.get("message")}')
    print(f'  - Deactivated role: {data.get("deactivated_role")}')
    print(f'  - New active_role: {data.get("new_active_role")}')
    print(f'  - Remaining active roles: {data.get("remaining_active_roles")}')
else:
    print(f'❌ Deactivation failed: {deactivate_response.text}')
    sys.exit(1)

# STEP 4: CHECK DATABASE STATE AFTER DEACTIVATION
print_section('STEP 4: DATABASE STATE AFTER DEACTIVATION')

time.sleep(0.5)
db_role_after = check_database_active_role('Database active_role')

# STEP 5: VERIFY VIA API
print_section('STEP 5: VERIFY VIA /api/me')

# Note: Token might be invalid now, so we may need to login again
login_response2 = requests.post(
    f'{API_BASE_URL}/api/login',
    data={'username': TEST_EMAIL, 'password': TEST_PASSWORD},
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)

if login_response2.status_code == 200:
    login_data2 = login_response2.json()
    new_token = login_data2['access_token']
    api_active_role = login_data2['user'].get('active_role')
    print(f'API active_role: {api_active_role}')
else:
    print(f'⚠️  Could not verify via API (login failed)')
    api_active_role = None

# ANALYSIS
print_section('ANALYSIS')

print('\n📊 Timeline Summary:')
print(f'  1. Initial active_role:      {db_role_initial}')
print(f'  2. Deactivated role:         {initial_role}')
print(f'  3. After deactivation (DB):  {db_role_after}')
print(f'  4. After login (API):        {api_active_role}')

print('\n🔍 Verification:')

# Check if deactivation set active_role to None (Option 2)
if db_role_after is None:
    print('  ✅ Deactivation correctly set active_role = None')
else:
    print(f'  ❌ Expected active_role = None, got {db_role_after}')

# Check API consistency
if api_active_role == db_role_after:
    print('  ✅ API and database are consistent')
else:
    print(f'  ⚠️  API ({api_active_role}) != Database ({db_role_after})')

# FINAL VERDICT
print_section('FINAL VERDICT')

if db_role_after is None:
    print('\n🎉 SUCCESS! Option 2 is working correctly!')
    print('\n✅ When user deactivates their active_role:')
    print('  - active_role is set to None ✅')
    print('  - User must choose next role manually ✅')
    print('  - System does not auto-select a role ✅')
    print('\n⚠️  IMPORTANT: Frontend must handle active_role = None state!')
    print('  - Show role selection modal/page')
    print('  - Don\'t try to load profile for null role')
    print('  - Guide user to choose a role from remaining_active_roles')
else:
    print('\n❌ FAILURE! Deactivation did not set active_role to None.')
    print(f'\nDetected issues:')
    print(f'  - active_role is {db_role_after} (expected None)')
    print('\n⚠️  Backend may need restart, or fix not applied correctly.')

print('\n' + '=' * 80)

# CLEANUP: Reactivate the role for future tests
print_section('CLEANUP: REACTIVATING ROLE FOR FUTURE TESTS')

reactivate_response = requests.post(
    f'{API_BASE_URL}/api/register',
    json={
        'email': TEST_EMAIL,
        'password': TEST_PASSWORD,
        'first_name': 'Jediael',
        'role': initial_role
    }
)

if reactivate_response.status_code == 200:
    print(f'✅ Reactivated {initial_role} role for future tests')
else:
    print(f'⚠️  Could not reactivate role: {reactivate_response.text}')
    print(f'   You may need to manually reactivate {initial_role} role')

print('\n' + '=' * 80)
