"""
Debug script to test authentication token for schedule creation
"""
import requests
import json

# Get login credentials for testing
API_BASE = "http://localhost:8000"

# Try to login as user 115 (Dr. Abele Tsegaye)
print("=" * 60)
print("TESTING AUTHENTICATION FOR SCHEDULE CREATION")
print("=" * 60)

# Step 1: Login
print("\n1. Attempting login...")
# Try different login formats
login_data_json = {
    "identifier": "drabeletsegaye",
    "password": "Astegni2025"
}
login_data_form = {
    "username": "drabeletsegaye",
    "password": "Astegni2025"
}

try:
    # Try JSON format first
    login_response = requests.post(f"{API_BASE}/api/login", json=login_data_json)
    print(f"   Login Status (JSON format): {login_response.status_code}")

    # If failed, try form data
    if login_response.status_code != 200:
        print(f"   JSON login failed, trying form data...")
        login_response = requests.post(f"{API_BASE}/api/login", data=login_data_form)
        print(f"   Login Status (form data): {login_response.status_code}")

    if login_response.status_code == 200:
        login_result = login_response.json()
        token = login_result.get('access_token')
        print(f"   [OK] Login successful!")
        print(f"   Token (first 50 chars): {token[:50]}...")

        # Step 2: Test schedule creation
        print("\n2. Testing schedule creation...")
        schedule_data = {
            "title": "Test Schedule - Auth Debug",
            "description": "Testing authentication",
            "subject": "Mathematics",
            "subject_type": "Mathematics",
            "grade_level": "Grade 9-10",
            "year": 2025,
            "schedule_type": "specific",
            "start_time": "14:00",
            "end_time": "15:00",
            "selected_months": [],
            "selected_days": [],
            "specific_dates": ["2025-10-25"]
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        schedule_response = requests.post(
            f"{API_BASE}/api/tutor/schedules",
            json=schedule_data,
            headers=headers
        )

        print(f"   Schedule Creation Status: {schedule_response.status_code}")

        if schedule_response.status_code == 200 or schedule_response.status_code == 201:
            print(f"   [OK] Schedule created successfully!")
            print(f"   Response: {json.dumps(schedule_response.json(), indent=2)}")
        else:
            print(f"   [FAIL] Schedule creation failed!")
            print(f"   Error: {schedule_response.text}")

        # Step 3: Test token validation with /api/me
        print("\n3. Testing token with /api/me endpoint...")
        me_response = requests.get(f"{API_BASE}/api/me", headers=headers)
        print(f"   /api/me Status: {me_response.status_code}")

        if me_response.status_code == 200:
            user_data = me_response.json()
            print(f"   [OK] Token is valid!")
            print(f"   User: {user_data.get('username')} (ID: {user_data.get('id')})")
            print(f"   Active Role: {user_data.get('active_role')}")
            print(f"   Roles: {user_data.get('roles')}")
        else:
            print(f"   [FAIL] Token validation failed!")
            print(f"   Error: {me_response.text}")

    else:
        print(f"   [FAIL] Login failed!")
        print(f"   Error: {login_response.text}")

except Exception as e:
    print(f"   [ERROR] {e}")

print("\n" + "=" * 60)
print("RECOMMENDED ACTIONS:")
print("=" * 60)
print("1. Make sure backend server is running: python app.py")
print("2. Check that user 'drabeletsegaye' exists with password 'Astegni2025'")
print("3. Verify the user has 'tutor' role")
print("4. Check browser console for the actual token being sent")
print("5. Try refreshing the browser page to get a new token")
print("=" * 60)
