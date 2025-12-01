"""
Test the my-students endpoint to debug the 422 error
"""
import requests

BASE_URL = "http://localhost:8000"

# Login as user 115
print("Testing /api/session-requests/tutor/my-students endpoint\n")
print("=" * 70)

login_data = {
    "username": "jediael.s.abebe@gmail.com",
    "password": "TestPassword123"
}

# Login
response = requests.post(f"{BASE_URL}/api/login", data=login_data)
if response.status_code == 200:
    token = response.json().get("access_token")
    print(f"Login successful! Token: {token[:30]}...\n")

    # Test my-students endpoint
    print("Testing: GET /api/session-requests/tutor/my-students")
    print("-" * 70)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/session-requests/tutor/my-students", headers=headers)

    print(f"Status Code: {response.status_code}")
    print(f"Response:\n{response.text}\n")

    if response.status_code == 200:
        students = response.json()
        print(f"SUCCESS! Found {len(students)} students")
        if students:
            print("\nFirst student:")
            import json
            print(json.dumps(students[0], indent=2))
    else:
        print("ERROR!")

else:
    print(f"Login failed: {response.status_code}")
    print(response.text)

print("=" * 70)
