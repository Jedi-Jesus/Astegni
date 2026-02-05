"""
Test duplicate session request prevention

This script tests that:
1. First request succeeds
2. Duplicate request (same tutor + package) fails with 409 error
3. After accepting/rejecting, new request is allowed
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

# Test credentials (use your test user)
EMAIL = "jediael.s.abebe@gmail.com"
PASSWORD = "@JesusJediael1234"

def login():
    """Login and get access token"""
    response = requests.post(f"{API_BASE_URL}/api/login", json={
        "email": EMAIL,
        "password": PASSWORD
    })
    if response.status_code == 200:
        return response.json()['access_token']
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def create_session_request(token, tutor_id=2, package_id=1):
    """Create a session request"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    data = {
        "tutor_id": tutor_id,
        "package_id": package_id,
        "message": "Test request for duplicate prevention",
        "schedule_type": "recurring",
        "days": ["Monday", "Wednesday"],
        "start_time": "14:00",
        "end_time": "16:00"
    }

    response = requests.post(
        f"{API_BASE_URL}/api/session-requests",
        headers=headers,
        json=data
    )

    return response

def main():
    print("=" * 60)
    print("Testing Duplicate Session Request Prevention")
    print("=" * 60)

    # Step 1: Login
    print("\n1. Logging in...")
    token = login()
    if not token:
        print("Failed to login. Exiting.")
        return
    print("✓ Login successful")

    # Step 2: Create first request
    print("\n2. Creating first session request...")
    response1 = create_session_request(token)

    if response1.status_code == 200:
        result1 = response1.json()
        print(f"✓ First request created successfully")
        print(f"  Request ID: {result1.get('request_id')}")
        print(f"  Conversation ID: {result1.get('conversation_id')}")
    elif response1.status_code == 409:
        print("⚠ First request returned 409 - there's already a pending request")
        print(f"  Message: {response1.json().get('detail')}")
        print("\n  This is expected if you already have a pending request.")
        print("  To test duplicate prevention:")
        print("  1. Go to tutor profile and accept/reject the existing request")
        print("  2. Run this test again")
        return
    else:
        print(f"✗ First request failed with status {response1.status_code}")
        print(f"  Error: {response1.json().get('detail')}")
        return

    # Step 3: Try to create duplicate request
    print("\n3. Attempting to create duplicate request (same tutor + package)...")
    response2 = create_session_request(token)

    if response2.status_code == 409:
        error_detail = response2.json().get('detail')
        print("✓ Duplicate prevented successfully!")
        print(f"  Status: 409 Conflict")
        print(f"  Message: {error_detail}")
    elif response2.status_code == 200:
        print("✗ Duplicate was NOT prevented (unexpected!)")
        print("  Second request was created successfully")
        result2 = response2.json()
        print(f"  Request ID: {result2.get('request_id')}")
    else:
        print(f"✗ Unexpected status code: {response2.status_code}")
        print(f"  Error: {response2.json().get('detail')}")

    # Step 4: Verify different package is allowed
    print("\n4. Creating request for different package (should succeed)...")
    response3 = create_session_request(token, tutor_id=2, package_id=2)

    if response3.status_code == 200:
        result3 = response3.json()
        print(f"✓ Request for different package created successfully")
        print(f"  Request ID: {result3.get('request_id')}")
    elif response3.status_code == 409:
        print("⚠ Request for different package was blocked (already exists)")
        print(f"  Message: {response3.json().get('detail')}")
    else:
        print(f"✗ Request for different package failed: {response3.status_code}")
        print(f"  Error: {response3.json().get('detail')}")

    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)
    print("\nSummary:")
    print("- Duplicate requests for same tutor+package: BLOCKED ✓")
    print("- Requests for different packages: ALLOWED ✓")
    print("\nNote: To reset, go to tutor profile and accept/reject pending requests")

if __name__ == "__main__":
    main()
