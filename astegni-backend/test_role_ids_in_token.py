"""
Test script to verify role-specific IDs are included in JWT tokens

Run this after starting the backend server to test the new token structure.
"""

import requests
import jwt
import json
from dotenv import load_dotenv
import os

load_dotenv()

API_BASE_URL = "http://localhost:8000"
SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key_here')


def decode_token(token):
    """Decode JWT token to see payload (without verification for testing)"""
    try:
        # Decode without verification (just to see contents)
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        print(f"Error decoding token: {e}")
        return None


def test_login_token_structure():
    """Test that login returns tokens with role_ids"""
    print("\n" + "="*60)
    print("TEST 1: Login Token Structure")
    print("="*60)

    # You'll need to replace this with a real user's credentials
    login_data = {
        "username": "test@example.com",  # Replace with real email
        "password": "testpassword123"     # Replace with real password
    }

    print(f"\nAttempting login for: {login_data['username']}")

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/login",
            data=login_data
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Login successful!")

            # Decode and inspect access token
            access_token = data.get('access_token')
            print(f"\n📝 Access Token (first 50 chars): {access_token[:50]}...")

            payload = decode_token(access_token)
            print("\n🔍 Token Payload:")
            print(json.dumps(payload, indent=2))

            # Verify required fields
            print("\n✅ Verification:")

            if 'sub' in payload:
                print(f"  ✓ User ID (sub): {payload['sub']}")
            else:
                print("  ✗ Missing 'sub' field")

            if 'role' in payload:
                print(f"  ✓ Active Role: {payload['role']}")
            else:
                print("  ✗ Missing 'role' field")

            if 'role_ids' in payload:
                print(f"  ✓ Role IDs present: {payload['role_ids']}")

                # Check structure
                role_ids = payload['role_ids']
                if isinstance(role_ids, dict):
                    print("    ✓ role_ids is a dictionary")

                    for role, role_id in role_ids.items():
                        if role_id:
                            print(f"    ✓ {role}: {role_id}")
                        else:
                            print(f"    - {role}: None (user doesn't have this role)")
                else:
                    print("    ✗ role_ids is not a dictionary")
            else:
                print("  ✗ Missing 'role_ids' field (OLD TOKEN FORMAT)")

            # User data
            user = data.get('user', {})
            print(f"\n👤 User Info:")
            print(f"  ID: {user.get('id')}")
            print(f"  Name: {user.get('first_name')} {user.get('father_name')}")
            print(f"  Roles: {user.get('roles')}")
            print(f"  Active Role: {user.get('active_role')}")

        elif response.status_code == 401:
            print("❌ Login failed: Invalid credentials")
            print("Please update the test credentials in this script")
        else:
            print(f"❌ Login failed with status: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("Make sure the backend is running: python app.py")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_register_token_structure():
    """Test that registration returns tokens with role_ids"""
    print("\n" + "="*60)
    print("TEST 2: Register Token Structure")
    print("="*60)

    # Generate unique email for testing
    import time
    timestamp = int(time.time())

    register_data = {
        "first_name": "Test",
        "father_name": "User",
        "grandfather_name": "Testing",
        "email": f"test{timestamp}@example.com",
        "phone": f"+2519{timestamp % 100000000:08d}",
        "password": "testpassword123",
        "role": "student"
    }

    print(f"\nRegistering new user: {register_data['email']}")

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/register",
            json=register_data
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Registration successful!")

            # Decode and inspect access token
            access_token = data.get('access_token')
            payload = decode_token(access_token)

            print("\n🔍 Token Payload:")
            print(json.dumps(payload, indent=2))

            # Verify role_ids structure
            if 'role_ids' in payload:
                print("\n✅ role_ids field present in token!")
                role_ids = payload['role_ids']

                # For a new student, should have student ID but no others
                if role_ids.get('student'):
                    print(f"  ✓ Student ID: {role_ids['student']}")
                else:
                    print("  ✗ Student ID missing (should be created)")

            else:
                print("\n❌ role_ids field missing from token")

        else:
            print(f"❌ Registration failed with status: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")


def test_me_endpoint():
    """Test /api/me endpoint to verify user object has role_ids"""
    print("\n" + "="*60)
    print("TEST 3: /api/me Endpoint")
    print("="*60)

    # First login
    login_data = {
        "username": "test@example.com",  # Replace with real email
        "password": "testpassword123"
    }

    try:
        response = requests.post(f"{API_BASE_URL}/api/login", data=login_data)

        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')

            # Test /api/me endpoint
            headers = {"Authorization": f"Bearer {token}"}
            me_response = requests.get(f"{API_BASE_URL}/api/me", headers=headers)

            if me_response.status_code == 200:
                me_data = me_response.json()
                print("✅ /api/me successful!")
                print(json.dumps(me_data, indent=2))
            else:
                print(f"❌ /api/me failed: {me_response.status_code}")
        else:
            print("❌ Login failed - cannot test /api/me")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════╗
║   Role-Specific ID Token Testing                         ║
║   Tests JWT tokens include role_ids field                ║
╚══════════════════════════════════════════════════════════╝
    """)

    print("\n⚠️  IMPORTANT: Before running these tests:")
    print("1. Start the backend server: cd astegni-backend && python app.py")
    print("2. Update test credentials in this script with a real user")
    print("3. Make sure you have users in the database")

    input("\nPress Enter to start tests...")

    # Run tests
    test_login_token_structure()

    print("\n" + "-"*60)
    input("\nPress Enter to test registration (creates a new user)...")
    test_register_token_structure()

    print("\n" + "-"*60)
    input("\nPress Enter to test /api/me endpoint...")
    test_me_endpoint()

    print("\n" + "="*60)
    print("Testing Complete!")
    print("="*60)
    print("\nNext steps:")
    print("1. Verify role_ids field is present in all token payloads")
    print("2. Test frontend: authManager.getRoleIds()")
    print("3. Update frontend pages to use role-specific IDs")
