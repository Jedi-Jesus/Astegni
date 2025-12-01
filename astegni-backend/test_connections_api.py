"""
Test the new connections API endpoints
"""

import requests
import json

BASE_URL = "http://localhost:8000"

# You'll need a valid token - get it by logging in first
# For testing, we'll use the student account
def get_auth_token():
    """Login and get auth token"""
    response = requests.post(f"{BASE_URL}/api/login", json={
        "email": "student@example.com",
        "password": "Student123!"  # Update with actual password
    })

    if response.status_code == 200:
        data = response.json()
        return data['access_token']
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return None

def test_get_my_connections(token):
    """Test GET /api/connections"""
    print("\n" + "="*60)
    print("TEST: Get My Connections")
    print("="*60)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/connections", headers=headers)

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data)} connections")
        for conn in data:
            print(f"  - Connection #{conn['id']}: {conn['user_1_name']} -> {conn['user_2_name']}")
            print(f"    Type: {conn['connection_type']}, Status: {conn['status']}")
    else:
        print(f"Error: {response.text}")

def test_get_connection_stats(token):
    """Test GET /api/connections/stats"""
    print("\n" + "="*60)
    print("TEST: Get Connection Stats")
    print("="*60)

    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/connections/stats", headers=headers)

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        stats = response.json()
        print(json.dumps(stats, indent=2))
    else:
        print(f"Error: {response.text}")

def test_check_connection_status(token, target_user_id):
    """Test POST /api/connections/check"""
    print("\n" + "="*60)
    print(f"TEST: Check Connection Status with user {target_user_id}")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        f"{BASE_URL}/api/connections/check",
        headers=headers,
        json={"target_user_id": target_user_id}
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(json.dumps(data, indent=2))
    else:
        print(f"Error: {response.text}")

def test_create_connection(token, target_user_id, connection_type="follow"):
    """Test POST /api/connections"""
    print("\n" + "="*60)
    print(f"TEST: Create Connection (follow user {target_user_id})")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.post(
        f"{BASE_URL}/api/connections",
        headers=headers,
        json={
            "target_user_id": target_user_id,
            "connection_type": connection_type,
            "connection_message": "Hi! I'd like to connect"
        }
    )

    print(f"Status: {response.status_code}")
    if response.status_code == 201:
        data = response.json()
        print("Connection created successfully!")
        print(json.dumps(data, indent=2))
        return data['id']
    else:
        print(f"Error: {response.text}")
        return None

def test_get_user_connections(user_id):
    """Test GET /api/users/{user_id}/connections (public endpoint)"""
    print("\n" + "="*60)
    print(f"TEST: Get Public Connections for user {user_id}")
    print("="*60)

    response = requests.get(f"{BASE_URL}/api/users/{user_id}/connections")

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Found {len(data)} public connections")
        for conn in data:
            print(f"  - {conn['user_1_name']} <-> {conn['user_2_name']} ({conn['connection_type']})")
    else:
        print(f"Error: {response.text}")

def main():
    print("="*60)
    print("CONNECTIONS API TEST SUITE")
    print("="*60)

    # Get auth token
    print("\nLogging in...")
    token = get_auth_token()

    if not token:
        print("Failed to get auth token. Please check credentials.")
        return

    print("[OK] Logged in successfully")

    # Test endpoints
    test_get_my_connections(token)
    test_get_connection_stats(token)

    # Check connection status with a specific user (e.g., user ID 75 - a tutor)
    test_check_connection_status(token, 75)

    # Try to create a new connection (will fail if already exists)
    # Uncomment to test creating new connections
    # test_create_connection(token, 76, "follow")

    # Get public connections for current user (98)
    test_get_user_connections(98)

    print("\n" + "="*60)
    print("TESTS COMPLETE")
    print("="*60)
    print("\nNext steps:")
    print("1. Visit http://localhost:8000/docs to explore all endpoints")
    print("2. Test creating new connections")
    print("3. Test accepting/rejecting connections")
    print("4. Test deleting connections")

if __name__ == "__main__":
    main()
