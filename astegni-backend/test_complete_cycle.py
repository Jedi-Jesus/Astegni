"""
Test Complete Role Management Cycle:
1. Deactivate advertiser role
2. Verify it's deactivated
3. Reactivate it
4. Verify it's reactivated
"""
import sys
import os
import io
import requests

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))
from models import SessionLocal, User, AdvertiserProfile

API_BASE_URL = 'http://localhost:8000'
TEST_EMAIL = 'jediael.s.abebe@gmail.com'
TEST_PASSWORD = '@JesusJediael1234'

def print_section(title):
    print('\n' + '=' * 80)
    print(f'  {title}')
    print('=' * 80)

def check_advertiser_status(label):
    """Check advertiser profile is_active status"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == TEST_EMAIL).first()
    advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()

    status_emoji = '✅ ACTIVE' if advertiser and advertiser.is_active else '❌ DEACTIVATED'
    print(f'\n📊 {label}:')
    print(f'  - Advertiser Profile: {status_emoji}')
    if advertiser:
        print(f'  - Profile ID: {advertiser.id}')
        print(f'  - is_active: {advertiser.is_active}')

    db.close()
    return advertiser

# LOGIN
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
print(f'Current active role: {login_data["user"]["active_role"]}')
print(f'All roles: {login_data["user"]["roles"]}')

initial_state = check_advertiser_status('INITIAL STATE')

# STEP 2: DEACTIVATE ADVERTISER ROLE
print_section('STEP 2: DEACTIVATE ADVERTISER ROLE')

deactivate_response = requests.post(
    f'{API_BASE_URL}/api/role/deactivate',
    headers={
        'Authorization': f'Bearer {ACCESS_TOKEN}',
        'Content-Type': 'application/json'
    },
    json={'role': 'advertiser', 'password': TEST_PASSWORD}
)

print(f'Response Status: {deactivate_response.status_code}')

if deactivate_response.status_code == 200:
    data = deactivate_response.json()
    print('✅ Advertiser role deactivated!')
    print(f'  - Message: {data.get("message")}')
    print(f'  - Remaining active roles: {data.get("remaining_active_roles")}')
else:
    print(f'❌ Deactivation failed: {deactivate_response.text}')

after_deactivation = check_advertiser_status('AFTER DEACTIVATION')

# STEP 3: VERIFY DEACTIVATION VIA API
print_section('STEP 3: VERIFY DEACTIVATION VIA /api/my-roles')

roles_response = requests.get(
    f'{API_BASE_URL}/api/my-roles',
    headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
)

if roles_response.status_code == 200:
    data = roles_response.json()
    print(f'Active roles: {data.get("user_roles")}')

    if 'advertiser' not in data.get("user_roles", []):
        print('✅ Advertiser is NOT in active roles (correctly hidden)')
    else:
        print('❌ Advertiser still in active roles (unexpected)')

# STEP 4: REACTIVATE ADVERTISER ROLE
print_section('STEP 4: REACTIVATE ADVERTISER ROLE (TEST FIX)')

reactivate_response = requests.post(
    f'{API_BASE_URL}/api/register',
    headers={'Content-Type': 'application/json'},
    json={
        'email': TEST_EMAIL,
        'password': TEST_PASSWORD,
        'role': 'advertiser',
        'first_name': 'Jediael',
        'father_name': 'Seyoum',
        'grandfather_name': 'Abebe'
    }
)

print(f'Response Status: {reactivate_response.status_code}')

if reactivate_response.status_code == 200:
    data = reactivate_response.json()
    print('✅ SUCCESS! Advertiser role REACTIVATED!')
    print(f'  - Active role switched to: {data["user"]["active_role"]}')
    print(f'  - All roles: {data["user"]["roles"]}')
    print(f'  - New tokens issued: Yes')

    # Update token for next request
    ACCESS_TOKEN = data['access_token']
else:
    print(f'❌ REACTIVATION FAILED: {reactivate_response.text}')

after_reactivation = check_advertiser_status('AFTER REACTIVATION')

# STEP 5: VERIFY REACTIVATION VIA API
print_section('STEP 5: VERIFY REACTIVATION VIA /api/my-roles')

roles_response = requests.get(
    f'{API_BASE_URL}/api/my-roles',
    headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
)

if roles_response.status_code == 200:
    data = roles_response.json()
    print(f'Active roles: {data.get("user_roles")}')

    if 'advertiser' in data.get("user_roles", []):
        print('✅ Advertiser is back in active roles!')
    else:
        print('⚠️  Advertiser still not in active roles (may need re-login)')

# FINAL SUMMARY
print_section('FINAL SUMMARY')

print('\n🔄 Complete Cycle Test Results:')
print(f'1. Initial State: {initial_state.is_active if initial_state else "N/A"}')
print(f'2. After Deactivation: {after_deactivation.is_active if after_deactivation else "N/A"}')
print(f'3. After Reactivation: {after_reactivation.is_active if after_reactivation else "N/A"}')

if after_deactivation and not after_deactivation.is_active:
    print('\n✅ Deactivation: WORKING')
else:
    print('\n❌ Deactivation: FAILED')

if after_reactivation and after_reactivation.is_active:
    print('✅ Reactivation: WORKING')
    print('\n🎉 THE FIX IS WORKING! Role management cycle complete!')
else:
    print('❌ Reactivation: FAILED')
    print('\n⚠️  The fix may not be active. Did you restart the backend?')

print('\n' + '=' * 80)
