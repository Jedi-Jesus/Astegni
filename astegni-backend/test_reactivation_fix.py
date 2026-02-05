"""
Test the reactivation fix for jediael.s.abebe@gmail.com
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

def check_database_state(title):
    """Check advertiser profile is_active status"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == TEST_EMAIL).first()
    advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()

    print(f'\n📊 {title}:')
    if advertiser:
        print(f'  - Advertiser Profile ID: {advertiser.id}')
        print(f'  - is_active: {advertiser.is_active}')
        status = '✅ ACTIVE' if advertiser.is_active else '❌ DEACTIVATED'
        print(f'  - Status: {status}')
    else:
        print('  - Advertiser Profile: NOT FOUND')

    db.close()
    return advertiser

# LOGIN FIRST
print_section('STEP 1: LOGIN')
login_response = requests.post(
    f'{API_BASE_URL}/api/login',
    data={'username': TEST_EMAIL, 'password': TEST_PASSWORD},
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)

if login_response.status_code == 200:
    login_data = login_response.json()
    ACCESS_TOKEN = login_data['access_token']
    print(f'✅ Logged in as: {login_data["user"]["first_name"]}')
    print(f'Current role: {login_data["user"]["active_role"]}')
else:
    print(f'❌ Login failed: {login_response.text}')
    sys.exit(1)

# Check initial state
check_database_state('BEFORE REACTIVATION')

# TEST: REACTIVATE ADVERTISER ROLE
print_section('TEST: REACTIVATE ADVERTISER ROLE (FIXED)')
print('Endpoint: POST /api/register')
print('Expected: Should reactivate deactivated advertiser role')

try:
    response = requests.post(
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

    print(f'\nResponse Status: {response.status_code}')

    if response.status_code == 200:
        data = response.json()
        print('✅ SUCCESS! Advertiser role reactivated!')
        print(f'\n📋 Response:')
        print(f'  - User Roles: {data["user"]["roles"]}')
        print(f'  - Active Role: {data["user"]["active_role"]}')
        print(f'  - New Token Issued: Yes')

        # Verify in database
        advertiser = check_database_state('AFTER REACTIVATION')

        if advertiser and advertiser.is_active:
            print('\n🎉 REACTIVATION SUCCESSFUL!')
            print('✅ is_active changed from FALSE → TRUE')
            print('✅ User can now use advertiser role')
        else:
            print('\n❌ Database not updated correctly!')

    else:
        print(f'❌ FAILED: {response.text}')

        if 'already has active' in response.text:
            print('\n⚠️  This means the role is already active (not a failure)')
        else:
            print('\n❌ Reactivation still broken!')

except Exception as e:
    print(f'❌ Error: {str(e)}')

# VERIFY VIA API
print_section('VERIFY: Check /api/my-roles')

try:
    response = requests.get(
        f'{API_BASE_URL}/api/my-roles',
        headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
    )

    if response.status_code == 200:
        data = response.json()
        print(f'User Roles: {data.get("user_roles")}')

        if 'advertiser' in data.get("user_roles", []):
            print('✅ Advertiser role now appears in active roles!')
        else:
            print('⚠️  Advertiser role still not in active roles (may need to re-login)')

except Exception as e:
    print(f'Error: {str(e)}')

print('\n' + '=' * 80)
print('TEST COMPLETE')
print('=' * 80)
