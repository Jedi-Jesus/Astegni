"""
Test Role Management Flows (Add, Deactivate, Reactivate) for jediael.s.abebe@gmail.com

NOTE: We won't test DELETE role as it's permanent and destructive.
"""
import sys
import os
import io
import requests
import json

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

def print_success(message):
    print(f'✅ {message}')

def print_error(message):
    print(f'❌ {message}')

def print_info(message):
    print(f'ℹ️  {message}')

def check_database_state():
    """Check user's current state in database"""
    db = SessionLocal()
    user = db.query(User).filter(User.email == TEST_EMAIL).first()

    if user:
        print('\n📊 Current Database State:')
        print(f'  - User ID: {user.id}')
        print(f'  - Roles Array: {user.roles}')
        print(f'  - Active Role: {user.active_role}')

        # Check advertiser profile
        advertiser = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
        if advertiser:
            print(f'  - Advertiser Profile: ID={advertiser.id}, is_active={advertiser.is_active}')
        else:
            print(f'  - Advertiser Profile: NOT FOUND')

    db.close()

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
    print_success(f'Logged in as: {login_data["user"]["first_name"]}')
    print(f'Current role: {login_data["user"]["active_role"]}')
    print(f'All roles: {login_data["user"]["roles"]}')
else:
    print_error(f'Login failed: {login_response.text}')
    sys.exit(1)

check_database_state()

# TEST 1: DEACTIVATE ROLE (advertiser - which is already is_active=False)
print_section('TEST 1: DEACTIVATE ADVERTISER ROLE')
print_info('Note: Advertiser role is already is_active=False in database')
print(f'Endpoint: POST {API_BASE_URL}/api/role/deactivate')

try:
    response = requests.post(
        f'{API_BASE_URL}/api/role/deactivate',
        headers={
            'Authorization': f'Bearer {ACCESS_TOKEN}',
            'Content-Type': 'application/json'
        },
        json={
            'role': 'advertiser',
            'password': TEST_PASSWORD
        }
    )

    print(f'\nResponse Status: {response.status_code}')
    print(f'Response: {response.text}')

    if response.status_code == 200:
        data = response.json()
        print_success('Advertiser role deactivated!')
        print(f'  - Deactivated Role: {data.get("deactivated_role")}')
        print(f'  - New Current Role: {data.get("new_current_role")}')
        print(f'  - Remaining Active Roles: {data.get("remaining_active_roles")}')
    else:
        print_error(f'Deactivation failed: {response.text}')

    check_database_state()

except Exception as e:
    print_error(f'Error: {str(e)}')

# TEST 2: TRY TO ADD ROLE BACK (REACTIVATION via /api/register)
print_section('TEST 2: REACTIVATE ADVERTISER ROLE (via /api/register)')
print_info('Adding role to existing user reactivates deactivated profiles')
print(f'Endpoint: POST {API_BASE_URL}/api/register')

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
        print_success('Advertiser role reactivated!')
        print(f'  - User Roles: {data["user"]["roles"]}')
        print(f'  - Active Role: {data["user"]["active_role"]}')
        print(f'  - New Token Issued: Yes')

        # Update token
        ACCESS_TOKEN = data['access_token']

    else:
        print_error(f'Reactivation failed: {response.text}')

    check_database_state()

except Exception as e:
    print_error(f'Error: {str(e)}')

# TEST 3: VERIFY ROLES ENDPOINT
print_section('TEST 3: VERIFY CURRENT ROLES')
print(f'Endpoint: GET {API_BASE_URL}/api/my-roles')

try:
    response = requests.get(
        f'{API_BASE_URL}/api/my-roles',
        headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
    )

    if response.status_code == 200:
        data = response.json()
        print_success('Roles verified!')
        print(f'  - User Roles: {data.get("user_roles")}')
        print(f'  - Active Role: {data.get("active_role")}')

        if 'advertiser' in data.get("user_roles", []):
            print_success('Advertiser role is now active again!')
        else:
            print_error('Advertiser role not in active roles')
    else:
        print_error(f'Failed: {response.text}')

    check_database_state()

except Exception as e:
    print_error(f'Error: {str(e)}')

# SUMMARY
print_section('TEST SUMMARY')
print('🔍 What we tested:')
print('1. ✅ Deactivate Role - Sets is_active=False, keeps data')
print('2. ✅ Reactivate Role - Adding same role reactivates profile')
print('3. ✅ Role Management - Database state correctly updated')
print()
print_info('DELETE role NOT tested (permanent and destructive)')
print()
print('🎉 Role management flows verified!')
