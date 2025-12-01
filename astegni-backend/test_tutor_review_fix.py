"""
Test script to verify the tutor review endpoint fix
This tests that admin authentication works correctly
"""
import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_tutor_review():
    print("=" * 60)
    print("Testing Tutor Review Endpoint with Admin Authentication")
    print("=" * 60)

    # Step 1: Admin Login
    print("\n[STEP 1] Admin Login...")
    login_response = requests.post(
        f"{API_BASE_URL}/api/admin/login",
        json={
            "email": "jediael.s.abebe@gmail.com",
            "password": "astegni2025"  # Update with your actual password
        }
    )

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return

    login_data = login_response.json()
    token = login_data.get("access_token")
    print(f"✅ Login successful")
    print(f"   Admin: {login_data.get('name')}")
    print(f"   Email: {login_data.get('email')}")
    print(f"   Token: {token[:50]}...")

    # Step 2: Test Review Endpoint
    print("\n[STEP 2] Testing Review Endpoint...")
    tutor_id = 71  # Use the tutor ID from your error logs

    review_response = requests.get(
        f"{API_BASE_URL}/api/admin/tutor/{tutor_id}/review",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    print(f"   Status Code: {review_response.status_code}")

    if review_response.status_code == 200:
        print("✅ Review endpoint working correctly!")
        tutor_data = review_response.json()
        print(f"\n   Tutor Details:")
        print(f"   - ID: {tutor_data.get('id')}")
        print(f"   - Name: {tutor_data.get('name')}")
        print(f"   - Email: {tutor_data.get('email')}")
        print(f"   - Status: {tutor_data.get('verification_status')}")
    elif review_response.status_code == 401:
        print("❌ Still getting 401 Unauthorized")
        print(f"   Response: {review_response.text}")
    elif review_response.status_code == 404:
        print(f"⚠️  Tutor {tutor_id} not found - try a different tutor_id")
    else:
        print(f"❌ Unexpected error: {review_response.status_code}")
        print(f"   Response: {review_response.text}")

    # Step 3: Test Verify Endpoint
    print("\n[STEP 3] Testing Verify Endpoint (dry run)...")
    verify_response = requests.options(
        f"{API_BASE_URL}/api/admin/tutor/{tutor_id}/verify",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    print(f"   Verify endpoint accessible: {verify_response.status_code == 200}")

    # Step 4: Test Reject Endpoint
    print("\n[STEP 4] Testing Reject Endpoint (dry run)...")
    reject_response = requests.options(
        f"{API_BASE_URL}/api/admin/tutor/{tutor_id}/reject",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )
    print(f"   Reject endpoint accessible: {reject_response.status_code == 200}")

    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    test_tutor_review()
