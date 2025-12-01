"""
Test OTP endpoints for add-role functionality
"""

import requests
import json

API_BASE = "http://localhost:8000"

def test_otp_flow():
    """Test the complete OTP flow for adding a role"""

    print("\n=== Testing OTP Add Role Flow ===\n")

    # Step 1: Register/Login to get a token
    print("Step 1: Logging in...")
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }

    response = requests.post(f"{API_BASE}/api/login", json=login_data)

    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        print("Please create a test user first using /api/register")
        return

    token = response.json().get("access_token")
    print(f"Login successful! Token: {token[:20]}...")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Get current user roles
    print("\nStep 2: Getting current user roles...")
    response = requests.get(f"{API_BASE}/api/my-roles", headers=headers)

    if response.status_code == 200:
        roles_data = response.json()
        print(f"Current roles: {roles_data.get('user_roles')}")
        print(f"Active role: {roles_data.get('active_role')}")
    else:
        print(f"Failed to get roles: {response.text}")

    # Step 3: Send OTP
    print("\nStep 3: Sending OTP...")
    send_to = input("Send OTP to (email/phone) [default: email]: ").strip().lower() or "email"

    otp_request = {
        "purpose": "add_role",
        "send_to": send_to
    }

    response = requests.post(f"{API_BASE}/api/send-otp", json=otp_request, headers=headers)

    if response.status_code != 200:
        print(f"Failed to send OTP: {response.text}")
        return

    otp_data = response.json()
    otp_code = otp_data.get("otp")
    print(f"OTP sent successfully!")
    print(f"OTP Code (for development): {otp_code}")
    print(f"Destination: {otp_data.get('destination')}")
    print(f"Expires in: {otp_data.get('expires_in')} seconds")

    # Step 4: Add new role with OTP
    print("\nStep 4: Adding new role with OTP verification...")
    add_role_data = {
        "otp": otp_code,
        "new_role": "tutor",
        "password": "password123"
    }

    response = requests.post(f"{API_BASE}/api/add-role", json=add_role_data, headers=headers)

    if response.status_code == 200:
        result = response.json()
        print(f"Success! {result.get('message')}")
        print(f"Updated roles: {result.get('user_roles')}")
        print(f"Active role: {result.get('active_role')}")
    else:
        print(f"Failed to add role: {response.text}")

    # Step 5: Verify role was added
    print("\nStep 5: Verifying role was added...")
    response = requests.get(f"{API_BASE}/api/my-roles", headers=headers)

    if response.status_code == 200:
        roles_data = response.json()
        print(f"Final roles: {roles_data.get('user_roles')}")
        print(f"Active role: {roles_data.get('active_role')}")
    else:
        print(f"Failed to verify roles: {response.text}")

    print("\n=== Test Complete ===\n")

if __name__ == "__main__":
    test_otp_flow()
