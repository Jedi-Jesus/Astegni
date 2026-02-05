"""
Test script for role-optional registration
Tests that users can register without providing a role
"""

import requests
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_EMAIL = f"test_no_role_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"
TEST_PASSWORD = "TestPassword123!"

def test_register_without_role():
    """Test registering a new user WITHOUT providing a role"""
    print("=" * 80)
    print("TEST 1: Register user WITHOUT role")
    print("=" * 80)

    payload = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        # NO role field provided
    }

    print(f"\nRequest payload:")
    print(json.dumps(payload, indent=2))

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/register",
            json=payload
        )

        print(f"\nResponse status: {response.status_code}")
        print(f"Response body:")
        print(json.dumps(response.json(), indent=2))

        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})

            print(f"\n[OK] SUCCESS: User registered without role")
            print(f"   User ID: {user.get('id')}")
            print(f"   Email: {user.get('email')}")
            print(f"   Roles: {user.get('roles')}")
            print(f"   Active Role: {user.get('active_role')}")

            # Verify roles is None/null
            if user.get('roles') is None and user.get('active_role') is None:
                print(f"\n[OK] VERIFIED: User has no roles (NULL)")
                return True
            else:
                print(f"\n[ERROR] FAILED: User should have NULL roles, but has:")
                print(f"   Roles: {user.get('roles')}")
                print(f"   Active Role: {user.get('active_role')}")
                return False
        else:
            print(f"\n[ERROR] FAILED: Registration failed")
            return False

    except Exception as e:
        print(f"\n[ERROR] ERROR: {str(e)}")
        return False


def test_register_with_role():
    """Test registering a new user WITH a role (backward compatibility)"""
    print("\n" + "=" * 80)
    print("TEST 2: Register user WITH role (backward compatibility)")
    print("=" * 80)

    test_email_with_role = f"test_with_role_{datetime.now().strftime('%Y%m%d_%H%M%S')}@example.com"

    payload = {
        "email": test_email_with_role,
        "password": TEST_PASSWORD,
        "role": "student"  # Role provided
    }

    print(f"\nRequest payload:")
    print(json.dumps(payload, indent=2))

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/register",
            json=payload
        )

        print(f"\nResponse status: {response.status_code}")
        print(f"Response body:")
        print(json.dumps(response.json(), indent=2))

        if response.status_code == 200:
            data = response.json()
            user = data.get("user", {})

            print(f"\n[OK] SUCCESS: User registered with role")
            print(f"   User ID: {user.get('id')}")
            print(f"   Email: {user.get('email')}")
            print(f"   Roles: {user.get('roles')}")
            print(f"   Active Role: {user.get('active_role')}")

            # Verify roles contains 'student'
            if user.get('roles') == ['student'] and user.get('active_role') == 'student':
                print(f"\n[OK] VERIFIED: User has correct role")
                return True
            else:
                print(f"\n[ERROR] FAILED: User should have student role")
                return False
        else:
            print(f"\n[ERROR] FAILED: Registration failed")
            return False

    except Exception as e:
        print(f"\n[ERROR] ERROR: {str(e)}")
        return False


def main():
    print("\nTesting Role-Optional Registration System\n")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Test Email: {TEST_EMAIL}")
    print()

    # Check if backend is running
    try:
        response = requests.get(f"{API_BASE_URL}/docs")
        if response.status_code != 200:
            print("[ERROR] Backend is not running! Start it with: cd astegni-backend && python app.py")
            return
    except Exception:
        print("[ERROR] Backend is not running! Start it with: cd astegni-backend && python app.py")
        return

    print("[OK] Backend is running\n")

    # Run tests
    test1_passed = test_register_without_role()
    test2_passed = test_register_with_role()

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Test 1 (Register without role): {'[PASSED]' if test1_passed else '[FAILED]'}")
    print(f"Test 2 (Register with role):    {'[PASSED]' if test2_passed else '[FAILED]'}")
    print()

    if test1_passed and test2_passed:
        print("[SUCCESS] ALL TESTS PASSED!")
        print("\nRole-optional registration is working correctly:")
        print("  - Users can register WITHOUT roles (roles = NULL)")
        print("  - Users can still register WITH roles (backward compatible)")
        print("  - Ready for production deployment")
    else:
        print("[WARNING] SOME TESTS FAILED - Review the errors above")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    main()
