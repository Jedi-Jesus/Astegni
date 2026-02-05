"""
Test script to check the role removal endpoint response
"""
import requests
import json

# IMPORTANT: Update these with your actual values
API_BASE_URL = "http://localhost:8000"
ACCESS_TOKEN = "your_access_token_here"  # Get from browser localStorage
ROLE_TO_REMOVE = "student"  # Change as needed
PASSWORD = "your_password_here"
OTP = "123456"  # Get OTP from email/phone

def test_role_remove():
    """Test the role removal endpoint"""

    url = f"{API_BASE_URL}/api/role/remove"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }

    payload = {
        "role": ROLE_TO_REMOVE,
        "password": PASSWORD,
        "otp": OTP
    }

    print(f"Testing role removal endpoint: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("\nSending request...")

    try:
        response = requests.delete(url, headers=headers, json=payload)

        print(f"\nResponse Status Code: {response.status_code}")
        print(f"Response OK: {response.ok}")
        print(f"\nResponse Headers:")
        for key, value in response.headers.items():
            print(f"  {key}: {value}")

        print(f"\nResponse Body:")
        try:
            data = response.json()
            print(json.dumps(data, indent=2))

            # Check for success field
            if 'success' in data:
                print(f"\n✓ 'success' field found: {data['success']}")
            else:
                print(f"\n✗ 'success' field NOT found in response!")

        except Exception as e:
            print(f"Could not parse JSON: {e}")
            print(f"Raw response text: {response.text}")

    except Exception as e:
        print(f"\nError making request: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("Role Removal Endpoint Response Tester")
    print("=" * 60)
    print("\nIMPORTANT: Update the script with your actual credentials!")
    print("- ACCESS_TOKEN from browser localStorage.getItem('access_token')")
    print("- PASSWORD for your account")
    print("- OTP from the verification email/SMS\n")

    test_role_remove()
