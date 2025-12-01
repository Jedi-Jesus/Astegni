"""
Direct test of session request API to debug 422 error
"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("=" * 70)
print("TESTING SESSION REQUEST API - Debugging 422 Error")
print("=" * 70)

# Step 1: Login as user 115 (tutor)
print("\nStep 1: Login as tutor (user 115)...")
print("-" * 70)

login_data = {
    "username": "jediael.s.abebe@gmail.com",  # OAuth2 form uses 'username' field for email
    "password": "TestPassword123"
}

try:
    response = requests.post(f"{BASE_URL}/api/login", data=login_data)  # Use data, not json for OAuth2
    print(f"Login Status Code: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"Success! Got token: {token[:50]}...")

        # Step 2: Test the problematic endpoint
        print("\nStep 2: Testing /api/session-requests/tutor?status=pending...")
        print("-" * 70)

        headers = {"Authorization": f"Bearer {token}"}
        url = f"{BASE_URL}/api/session-requests/tutor?status=pending"

        print(f"URL: {url}")
        print(f"Headers: Authorization: Bearer {token[:20]}...")

        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            requests_data = response.json()
            print(f"SUCCESS! Found {len(requests_data)} pending requests")
            if requests_data:
                print("\nFirst request:")
                print(json.dumps(requests_data[0], indent=2))
        else:
            print(f"ERROR! Response:")
            print(response.text)

        # Step 3: Test without status parameter
        print("\nStep 3: Testing /api/session-requests/tutor (no status)...")
        print("-" * 70)

        url = f"{BASE_URL}/api/session-requests/tutor"
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            requests_data = response.json()
            print(f"SUCCESS! Found {len(requests_data)} total requests")
        else:
            print(f"ERROR! Response:")
            print(response.text)

    else:
        print(f"Login failed!")
        print(f"Response: {response.text}")

except Exception as e:
    print(f"Exception occurred: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 70)
