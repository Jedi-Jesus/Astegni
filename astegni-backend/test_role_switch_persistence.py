"""
Test script to verify role switch persistence fix

This script simulates the role reversion bug by:
1. Authenticating a user
2. Switching their role
3. Calling /api/me multiple times to verify the role persists

Run this after starting the backend server to verify the fix works.
"""

import requests
import time
import json

API_BASE_URL = "http://localhost:8000"

def test_role_switch_persistence():
    print("=" * 60)
    print("ROLE SWITCH PERSISTENCE TEST")
    print("=" * 60)

    # Step 1: Login
    print("\n[1] Logging in...")
    login_response = requests.post(f"{API_BASE_URL}/api/login", json={
        "email": "jediael.s.abebe@gmail.com",
        "password": "@JesusJediael1234"
    })

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return

    login_data = login_response.json()
    token = login_data["access_token"]
    initial_role = login_data["user"]["role"]

    print(f"✅ Logged in successfully")
    print(f"   Initial role: {initial_role}")
    print(f"   Available roles: {login_data['user'].get('roles', [])}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 2: Get initial user data
    print("\n[2] Fetching initial user data from /api/me...")
    me_response_1 = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
    me_data_1 = me_response_1.json()
    print(f"   active_role: {me_data_1.get('active_role', me_data_1.get('role'))}")

    # Step 3: Determine target role for switch
    available_roles = login_data['user'].get('roles', [])
    if len(available_roles) < 2:
        print(f"\n⚠️ User only has {len(available_roles)} role(s). Cannot test role switching.")
        print("   Please use a multi-role account for this test.")
        return

    target_role = None
    for role in available_roles:
        if role != initial_role:
            target_role = role
            break

    if not target_role:
        print(f"\n⚠️ Could not find a different role to switch to")
        return

    print(f"\n[3] Switching role: {initial_role} → {target_role}")
    switch_response = requests.post(
        f"{API_BASE_URL}/api/switch-role",
        headers=headers,
        json={"role": target_role}
    )

    if switch_response.status_code != 200:
        print(f"❌ Role switch failed: {switch_response.status_code}")
        print(switch_response.text)
        return

    switch_data = switch_response.json()
    print(f"✅ Role switch API call succeeded")
    print(f"   New active_role: {switch_data.get('active_role', 'N/A')}")

    # Update token with new one from role switch
    if "access_token" in switch_data:
        token = switch_data["access_token"]
        headers["Authorization"] = f"Bearer {token}"
        print(f"   New JWT token received")

    # Step 4: Immediately call /api/me (should have new role)
    print(f"\n[4] Calling /api/me immediately after switch...")
    me_response_2 = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
    me_data_2 = me_response_2.json()
    me_role_2 = me_data_2.get('active_role', me_data_2.get('role'))

    if me_role_2 == target_role:
        print(f"✅ /api/me returned correct role: {me_role_2}")
    else:
        print(f"❌ /api/me returned WRONG role: {me_role_2} (expected {target_role})")

    # Step 5: Wait and call /api/me again (simulate grace period expiry)
    print(f"\n[5] Waiting 3 seconds then calling /api/me again...")
    time.sleep(3)

    me_response_3 = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
    me_data_3 = me_response_3.json()
    me_role_3 = me_data_3.get('active_role', me_data_3.get('role'))

    if me_role_3 == target_role:
        print(f"✅ /api/me STILL returned correct role: {me_role_3}")
    else:
        print(f"❌ /api/me reverted to WRONG role: {me_role_3} (expected {target_role})")
        print(f"   THIS IS THE BUG - role reverted after grace period!")

    # Step 6: Call /api/me multiple times rapidly
    print(f"\n[6] Calling /api/me 5 times rapidly (stress test)...")
    all_correct = True
    for i in range(5):
        me_response = requests.get(f"{API_BASE_URL}/api/me", headers=headers)
        me_data = me_response.json()
        me_role = me_data.get('active_role', me_data.get('role'))

        if me_role == target_role:
            print(f"   Call {i+1}/5: ✅ {me_role}")
        else:
            print(f"   Call {i+1}/5: ❌ {me_role} (expected {target_role})")
            all_correct = False

        time.sleep(0.5)

    # Final summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    if me_role_2 == target_role and me_role_3 == target_role and all_correct:
        print("✅ ALL TESTS PASSED")
        print("   Role switch persists correctly")
        print("   No role reversion detected")
        print("   The fix is working!")
    else:
        print("❌ SOME TESTS FAILED")
        if me_role_2 != target_role:
            print("   - Immediate /api/me call returned wrong role")
        if me_role_3 != target_role:
            print("   - /api/me after delay returned wrong role (REVERSION BUG)")
        if not all_correct:
            print("   - Some rapid /api/me calls returned wrong role")

    print("\n")

if __name__ == "__main__":
    try:
        test_role_switch_persistence()
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        print("   Make sure the backend is running at http://localhost:8000")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
