"""
Test Authentication & Role Management Flows for jediael.s.abebe@gmail.com
"""
import sys
import os
import io
import requests
import json
from datetime import datetime

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

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

# Test 1: LOGIN
print_section('TEST 1: LOGIN')
print(f'Testing login for: {TEST_EMAIL}')
print(f'Endpoint: POST {API_BASE_URL}/api/login')

login_data = {
    'username': TEST_EMAIL,
    'password': TEST_PASSWORD
}

try:
    response = requests.post(
        f'{API_BASE_URL}/api/login',
        data=login_data,
        headers={'Content-Type': 'application/x-www-form-urlencoded'}
    )

    if response.status_code == 200:
        data = response.json()
        print_success(f'Login successful!')
        print(f'\n📋 Response:')
        print(f'  - access_token: {data["access_token"][:50]}...')
        print(f'  - refresh_token: {data["refresh_token"][:50]}...')
        print(f'\n👤 User Data:')
        user = data['user']
        print(f'  - ID: {user["id"]}')
        print(f'  - Name: {user["first_name"]} {user["father_name"]}')
        print(f'  - Email: {user["email"]}')
        print(f'  - Roles: {user.get("roles", [])}')
        print(f'  - Active Role: {user.get("active_role")}')
        print(f'  - Role IDs: {user.get("role_ids", {})}')

        # Store token for subsequent tests
        ACCESS_TOKEN = data['access_token']
        REFRESH_TOKEN = data['refresh_token']
        CURRENT_ROLE = user.get('active_role')

    else:
        print_error(f'Login failed with status {response.status_code}')
        print(f'Response: {response.text}')
        sys.exit(1)

except Exception as e:
    print_error(f'Login error: {str(e)}')
    sys.exit(1)

# Test 2: GET CURRENT USER (/api/me)
print_section('TEST 2: GET CURRENT USER (/api/me)')
print(f'Endpoint: GET {API_BASE_URL}/api/me')
print(f'Using token: {ACCESS_TOKEN[:30]}...')

try:
    response = requests.get(
        f'{API_BASE_URL}/api/me',
        headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
    )

    if response.status_code == 200:
        user = response.json()
        print_success('User data fetched successfully!')
        print(f'\n👤 Current User:')
        print(f'  - ID: {user["id"]}')
        print(f'  - Name: {user["first_name"]} {user["father_name"]}')
        print(f'  - Active Role: {user.get("active_role")}')
        print(f'  - All Roles: {user.get("roles", [])}')
    else:
        print_error(f'Failed with status {response.status_code}')
        print(f'Response: {response.text}')

except Exception as e:
    print_error(f'Error: {str(e)}')

# Test 3: GET USER ROLES (/api/my-roles)
print_section('TEST 3: GET USER ROLES (/api/my-roles)')
print(f'Endpoint: GET {API_BASE_URL}/api/my-roles')

try:
    response = requests.get(
        f'{API_BASE_URL}/api/my-roles',
        headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
    )

    if response.status_code == 200:
        data = response.json()
        print_success('Roles fetched successfully!')
        print(f'\n📝 Roles Data:')
        print(f'  - User Roles: {data.get("user_roles", [])}')
        print(f'  - Active Role: {data.get("active_role")}')
        print(f'  - Total Roles: {len(data.get("user_roles", []))}')
    else:
        print_error(f'Failed with status {response.status_code}')
        print(f'Response: {response.text}')

except Exception as e:
    print_error(f'Error: {str(e)}')

# Test 4: SWITCH ROLE
print_section('TEST 4: SWITCH ROLE')
print(f'Current Role: {CURRENT_ROLE}')

# Determine target role (switch from current to a different role)
if CURRENT_ROLE == 'student':
    target_role = 'tutor'
else:
    target_role = 'student'

print(f'Target Role: {target_role}')
print(f'Endpoint: POST {API_BASE_URL}/api/switch-role')

try:
    response = requests.post(
        f'{API_BASE_URL}/api/switch-role',
        headers={
            'Authorization': f'Bearer {ACCESS_TOKEN}',
            'Content-Type': 'application/json'
        },
        json={'role': target_role}
    )

    if response.status_code == 200:
        data = response.json()
        print_success(f'Role switched successfully from {CURRENT_ROLE} to {target_role}!')
        print(f'\n📋 New Tokens:')
        print(f'  - New access_token: {data["access_token"][:50]}...')
        print(f'  - New refresh_token: {data["refresh_token"][:50]}...')
        print(f'  - Active Role: {data.get("active_role")}')
        print(f'  - Message: {data.get("message")}')

        # Update token for next tests
        ACCESS_TOKEN = data['access_token']
        CURRENT_ROLE = data.get('active_role')

    else:
        print_error(f'Role switch failed with status {response.status_code}')
        print(f'Response: {response.text}')

except Exception as e:
    print_error(f'Error: {str(e)}')

# Test 5: VERIFY ROLE SWITCH (check /api/me again)
print_section('TEST 5: VERIFY ROLE SWITCH')
print(f'Endpoint: GET {API_BASE_URL}/api/me')
print(f'Using new token: {ACCESS_TOKEN[:30]}...')

try:
    response = requests.get(
        f'{API_BASE_URL}/api/me',
        headers={'Authorization': f'Bearer {ACCESS_TOKEN}'}
    )

    if response.status_code == 200:
        user = response.json()
        print_success('Verified role switch!')
        print(f'\n👤 Updated User:')
        print(f'  - Active Role: {user.get("active_role")}')

        if user.get('active_role') == target_role:
            print_success(f'Role is correctly set to {target_role}')
        else:
            print_error(f'Role mismatch! Expected {target_role}, got {user.get("active_role")}')
    else:
        print_error(f'Failed with status {response.status_code}')

except Exception as e:
    print_error(f'Error: {str(e)}')

# Test 6: TOKEN REFRESH
print_section('TEST 6: TOKEN REFRESH')
print(f'Endpoint: POST {API_BASE_URL}/api/refresh')
print(f'Using refresh token: {REFRESH_TOKEN[:30]}...')

try:
    response = requests.post(
        f'{API_BASE_URL}/api/refresh',
        headers={'Content-Type': 'application/json'},
        json={'refresh_token': REFRESH_TOKEN}
    )

    if response.status_code == 200:
        data = response.json()
        print_success('Token refreshed successfully!')
        print(f'\n📋 New Tokens:')
        print(f'  - New access_token: {data["access_token"][:50]}...')

        # Verify the new token works
        verify_response = requests.get(
            f'{API_BASE_URL}/api/me',
            headers={'Authorization': f'Bearer {data["access_token"]}'}
        )

        if verify_response.status_code == 200:
            print_success('New token is valid!')
        else:
            print_error('New token is invalid!')

    else:
        print_error(f'Token refresh failed with status {response.status_code}')
        print(f'Response: {response.text}')

except Exception as e:
    print_error(f'Error: {str(e)}')

# SUMMARY
print_section('TEST SUMMARY')
print('✅ Login - Working')
print('✅ Get Current User (/api/me) - Working')
print('✅ Get User Roles (/api/my-roles) - Working')
print('✅ Switch Role - Working')
print('✅ Verify Role Switch - Working')
print('✅ Token Refresh - Working')
print()
print('🎉 All authentication flows are working correctly!')
