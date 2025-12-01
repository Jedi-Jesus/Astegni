"""
Test OTP Email Change Flow
Tests the complete two-step OTP verification process for email changes
"""

import sys
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_otp_email_change_flow():
    """Test the complete OTP email change flow"""

    print("=" * 80)
    print("TESTING OTP EMAIL CHANGE FLOW")
    print("=" * 80)

    # Step 0: Login to get token
    print("\n[STEP 0] Logging in to get authentication token...")
    login_response = requests.post(
        f"{API_BASE_URL}/api/admin/login",
        json={
            "email": "test1@example.com",
            "password": "password123"
        }
    )

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return

    login_data = login_response.json()
    token = login_data.get("access_token")
    print(f"✅ Login successful! Token: {token[:20]}...")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 1: Send OTP to current email
    print("\n[STEP 1] Sending OTP to current email (test1@example.com)...")
    current_email = "test1@example.com"

    send_current_otp_response = requests.post(
        f"{API_BASE_URL}/api/admin/send-otp-current-email",
        headers=headers,
        json={"current_email": current_email}
    )

    print(f"Status Code: {send_current_otp_response.status_code}")
    print(f"Response: {json.dumps(send_current_otp_response.json(), indent=2)}")

    if send_current_otp_response.status_code != 200:
        print("❌ Failed to send OTP to current email")
        return

    print("✅ OTP sent to current email!")

    # Step 2: Get the OTP from database (for testing purposes)
    print("\n[STEP 2] Retrieving OTP from database for testing...")
    import psycopg
    from dotenv import load_dotenv
    import os

    load_dotenv()
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cursor = conn.cursor()

    cursor.execute("""
        SELECT otp_code, otp_expires_at
        FROM admin_profile
        WHERE email = %s
    """, (current_email,))

    result = cursor.fetchone()
    if not result:
        print("❌ No OTP found in database")
        cursor.close()
        conn.close()
        return

    otp_code, otp_expires_at = result
    print(f"✅ OTP Code: {otp_code}")
    print(f"   Expires at: {otp_expires_at}")

    cursor.close()
    conn.close()

    # Step 3: Verify current email OTP
    print("\n[STEP 3] Verifying current email OTP...")

    verify_current_otp_response = requests.post(
        f"{API_BASE_URL}/api/admin/verify-otp-current-email",
        headers=headers,
        json={
            "current_email": current_email,
            "otp_code": otp_code
        }
    )

    print(f"Status Code: {verify_current_otp_response.status_code}")
    print(f"Response: {json.dumps(verify_current_otp_response.json(), indent=2)}")

    if verify_current_otp_response.status_code != 200:
        print("❌ Failed to verify current email OTP")
        return

    print("✅ Current email OTP verified!")

    # Step 4: Send OTP to new email
    print("\n[STEP 4] Sending OTP to new email (newemail@example.com)...")
    new_email = "newemail@example.com"

    send_new_otp_response = requests.post(
        f"{API_BASE_URL}/api/admin/send-otp-email-change",
        headers=headers,
        json={"new_email": new_email}
    )

    print(f"Status Code: {send_new_otp_response.status_code}")
    print(f"Response: {json.dumps(send_new_otp_response.json(), indent=2)}")

    if send_new_otp_response.status_code != 200:
        print("❌ Failed to send OTP to new email")
        return

    print("✅ OTP sent to new email!")

    # Step 5: Get new email OTP from database
    print("\n[STEP 5] Retrieving new email OTP from database...")
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    cursor = conn.cursor()

    cursor.execute("""
        SELECT otp_code, otp_expires_at
        FROM admin_profile
        WHERE email = %s
    """, (current_email,))  # Still stored under current email until verification

    result = cursor.fetchone()
    if not result:
        print("❌ No OTP found in database")
        cursor.close()
        conn.close()
        return

    new_otp_code, new_otp_expires_at = result
    print(f"✅ OTP Code: {new_otp_code}")
    print(f"   Expires at: {new_otp_expires_at}")

    cursor.close()
    conn.close()

    # Step 6: Verify new email OTP
    print("\n[STEP 6] Verifying new email OTP...")

    verify_new_otp_response = requests.post(
        f"{API_BASE_URL}/api/admin/verify-otp-email-change",
        headers=headers,
        json={
            "new_email": new_email,
            "otp_code": new_otp_code
        }
    )

    print(f"Status Code: {verify_new_otp_response.status_code}")
    print(f"Response: {json.dumps(verify_new_otp_response.json(), indent=2)}")

    if verify_new_otp_response.status_code != 200:
        print("❌ Failed to verify new email OTP")
        return

    print("✅ New email OTP verified!")

    # Step 7: Update email in database
    print("\n[STEP 7] Updating email in database...")

    # Get admin profile to get ID
    profile_response = requests.get(
        f"{API_BASE_URL}/api/admin/manage-courses-profile/by-email/{current_email}",
        headers=headers
    )

    if profile_response.status_code != 200:
        print(f"❌ Failed to fetch profile: {profile_response.status_code}")
        return

    profile = profile_response.json()
    admin_id = profile.get("id")

    print(f"Admin ID: {admin_id}")

    # Update email
    update_response = requests.put(
        f"{API_BASE_URL}/api/admin/profile/{admin_id}",
        headers=headers,
        json={"email": new_email}
    )

    print(f"Status Code: {update_response.status_code}")
    print(f"Response: {json.dumps(update_response.json(), indent=2)}")

    if update_response.status_code != 200:
        print("❌ Failed to update email in database")
        return

    print("✅ Email updated in database!")

    # Step 8: Verify email was updated
    print("\n[STEP 8] Verifying email was updated...")

    verify_response = requests.get(
        f"{API_BASE_URL}/api/admin/profile/{admin_id}",
        headers=headers
    )

    if verify_response.status_code == 200:
        updated_profile = verify_response.json()
        updated_email = updated_profile.get("email")
        print(f"Current email in database: {updated_email}")

        if updated_email == new_email:
            print("✅ Email successfully updated!")
        else:
            print(f"❌ Email mismatch - Expected: {new_email}, Got: {updated_email}")
    else:
        print(f"❌ Failed to verify updated email: {verify_response.status_code}")

    # Step 9: Restore original email
    print("\n[STEP 9] Restoring original email for future tests...")

    restore_response = requests.put(
        f"{API_BASE_URL}/api/admin/profile/{admin_id}",
        headers=headers,
        json={"email": current_email}
    )

    if restore_response.status_code == 200:
        print(f"✅ Email restored to {current_email}")
    else:
        print(f"⚠️  Failed to restore email: {restore_response.status_code}")

    print("\n" + "=" * 80)
    print("TEST COMPLETE!")
    print("=" * 80)

if __name__ == "__main__":
    test_otp_email_change_flow()
