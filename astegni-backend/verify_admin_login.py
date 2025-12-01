import os
import requests
import json

API_BASE_URL = 'http://localhost:8000'

# Test login
print("Testing admin login...")
print("=" * 60)

response = requests.post(
    f'{API_BASE_URL}/api/admin/login',
    json={
        'email': 'admin@astegni.com',
        'password': 'Admin2025!'
    }
)

print(f"Status Code: {response.status_code}")
print(f"\nResponse:")
print(json.dumps(response.json(), indent=2))

if response.status_code == 200:
    data = response.json()
    print("\n" + "=" * 60)
    print("LOGIN SUCCESS")
    print("=" * 60)
    print(f"Admin ID: {data.get('admin_id')}")
    print(f"Name: {data.get('name')}")
    print(f"Email: {data.get('email')}")
    print(f"Departments: {data.get('departments')}")
    print(f"Departments type: {type(data.get('departments'))}")

    # Simulate frontend logic
    departments = data.get('departments', [])
    first_dept = departments[0] if departments else 'manage-system-settings'

    print(f"\nFirst department (what frontend uses): {first_dept}")

    # Check access
    department_access = {
        'manage-system-settings': [
            'manage-campaigns.html',
            'manage-schools.html',
            'manage-courses.html',
            'manage-tutors.html',
            'manage-customers.html',
            'manage-contents.html',
            'manage-system-settings.html'
        ]
    }

    allowed_pages = department_access.get(first_dept, [])
    print(f"\nAllowed pages for '{first_dept}':")
    for page in allowed_pages:
        print(f"  - {page}")

    test_page = 'manage-system-settings.html'
    has_access = test_page in allowed_pages
    print(f"\nCan access '{test_page}': {has_access}")
else:
    print("\n" + "=" * 60)
    print("LOGIN FAILED")
    print("=" * 60)
