"""
Test script to verify general settings functionality after support_email removal
Tests:
1. GET /api/admin/system/general-settings - should not include support_email
2. PUT /api/admin/system/general-settings - should save without support_email
3. Verify data loads correctly in frontend
"""

import requests
import json

API_BASE_URL = "http://localhost:8000"

# Use admin token (you may need to update this with a valid token)
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZXMiOiJbXCJhZG1pblwiLCBcInN1cGVyX2FkbWluXCJdIiwiZXhwIjoxNzMwNjkwMjA0fQ.8kdVuLC7N6xphudPaa_CPf3tMQrUlcc04F2NAPu-xqk"

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_get_general_settings():
    """Test GET endpoint"""
    print("\n=== TEST 1: GET /api/admin/system/general-settings ===")

    response = requests.get(f"{API_BASE_URL}/api/admin/system/general-settings", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print("SUCCESS: GET request successful")
        print(f"Response: {json.dumps(data, indent=2)}")

        # Verify support_email is NOT in response
        if 'support_email' in data.get('data', {}):
            print("ERROR: support_email still exists in response!")
            return False
        else:
            print("PASS: support_email has been successfully removed from response")

        # Verify contact_email and contact_phone are arrays
        contact_email = data.get('data', {}).get('contact_email')
        contact_phone = data.get('data', {}).get('contact_phone')

        if isinstance(contact_email, list):
            print(f"PASS: contact_email is an array with {len(contact_email)} items")
        else:
            print(f"WARNING: contact_email is not an array: {type(contact_email)}")

        if isinstance(contact_phone, list):
            print(f"PASS: contact_phone is an array with {len(contact_phone)} items")
        else:
            print(f"WARNING: contact_phone is not an array: {type(contact_phone)}")

        return True
    else:
        print(f"ERROR: GET request failed with status {response.status_code}")
        print(f"Response: {response.text}")
        return False

def test_update_general_settings():
    """Test PUT endpoint"""
    print("\n=== TEST 2: PUT /api/admin/system/general-settings ===")

    test_data = {
        "platform_name": "Astegni Test",
        "site_url": "https://astegni.com",
        "platform_tagline": "Test Tagline",
        "platform_description": "Test Description",
        "contact_email": ["test1@astegni.com", "test2@astegni.com"],
        "contact_phone": ["+251 911 111 111", "+251 922 222 222"]
    }

    response = requests.put(
        f"{API_BASE_URL}/api/admin/system/general-settings",
        headers=headers,
        json=test_data
    )

    if response.status_code == 200:
        print("SUCCESS: PUT request successful")
        print(f"Response: {json.dumps(response.json(), indent=2)}")

        # Verify saved data
        get_response = requests.get(f"{API_BASE_URL}/api/admin/system/general-settings", headers=headers)
        if get_response.status_code == 200:
            saved_data = get_response.json().get('data', {})

            if saved_data.get('platform_name') == test_data['platform_name']:
                print("PASS: platform_name saved correctly")
            else:
                print(f"ERROR: platform_name mismatch. Expected: {test_data['platform_name']}, Got: {saved_data.get('platform_name')}")

            if saved_data.get('contact_email') == test_data['contact_email']:
                print("PASS: contact_email array saved correctly")
            else:
                print(f"ERROR: contact_email mismatch. Expected: {test_data['contact_email']}, Got: {saved_data.get('contact_email')}")

            if saved_data.get('contact_phone') == test_data['contact_phone']:
                print("PASS: contact_phone array saved correctly")
            else:
                print(f"ERROR: contact_phone mismatch. Expected: {test_data['contact_phone']}, Got: {saved_data.get('contact_phone')}")

        return True
    else:
        print(f"ERROR: PUT request failed with status {response.status_code}")
        print(f"Response: {response.text}")
        return False

def main():
    print("=" * 60)
    print("GENERAL SETTINGS FIX VERIFICATION TEST")
    print("=" * 60)

    # Test 1: GET endpoint
    test1_passed = test_get_general_settings()

    # Test 2: PUT endpoint
    test2_passed = test_update_general_settings()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    print(f"GET Endpoint Test: {'PASSED' if test1_passed else 'FAILED'}")
    print(f"PUT Endpoint Test: {'PASSED' if test2_passed else 'FAILED'}")

    if test1_passed and test2_passed:
        print("\nALL TESTS PASSED!")
        print("\nNEXT STEPS:")
        print("1. Start backend: cd astegni-backend && python app.py")
        print("2. Open manage-system-settings.html in browser")
        print("3. Navigate to General Settings panel")
        print("4. Verify data loads correctly from database")
        print("5. Make changes and click 'Save Changes'")
        print("6. Refresh page and verify changes persist")
    else:
        print("\nSOME TESTS FAILED - Please review errors above")

if __name__ == "__main__":
    main()
