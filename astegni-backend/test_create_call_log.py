"""
Test creating a call log directly via API
"""
import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8000"

# Test credentials - using the test user from CLAUDE.md
EMAIL = "jediael.s.abebe@gmail.com"
PASSWORD = "@JesusJediael1234"

print("=" * 60)
print("TESTING CALL LOG CREATION")
print("=" * 60)

# Step 1: Login to get token
print("\n1. Logging in...")
login_response = requests.post(
    f"{API_BASE_URL}/api/login",
    data={"username": EMAIL, "password": PASSWORD}
)

if login_response.status_code != 200:
    print(f"[FAIL] Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

login_data = login_response.json()
token = login_data.get("access_token")
user_id = login_data.get("user", {}).get("id")
print(f"[OK] Logged in successfully. User ID: {user_id}")

# Step 2: Get user's conversations
print("\n2. Getting conversations...")
conv_response = requests.get(
    f"{API_BASE_URL}/api/chat/conversations?profile_id=1&profile_type=tutor&user_id={user_id}",
    headers={"Authorization": f"Bearer {token}"}
)

if conv_response.status_code != 200:
    print(f"[FAIL] Failed to get conversations: {conv_response.status_code}")
    print(conv_response.text)
    exit(1)

conversations = conv_response.json().get("conversations", [])
if not conversations:
    print("[FAIL] No conversations found. Create a conversation first.")
    exit(1)

conversation_id = conversations[0]["id"]
print(f"[OK] Found conversation: {conversation_id}")

# Step 3: Create call log
print("\n3. Creating call log...")
call_log_data = {
    "conversation_id": conversation_id,
    "caller_profile_id": 1,
    "caller_profile_type": "tutor",
    "call_type": "voice",
    "status": "initiated",
    "started_at": "2026-01-16T14:00:00.000Z"
}

print(f"Request data: {json.dumps(call_log_data, indent=2)}")

call_response = requests.post(
    f"{API_BASE_URL}/api/call-logs?profile_id=1&profile_type=tutor&user_id={user_id}",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json=call_log_data
)

print(f"\nResponse status: {call_response.status_code}")
print(f"Response body: {call_response.text}")

if call_response.status_code == 200:
    print("\n[SUCCESS] Call log created.")
    result = call_response.json()
    print(f"Call log ID: {result.get('call_log_id')}")
else:
    print(f"\n[FAILED] Status {call_response.status_code}")
    try:
        error_data = call_response.json()
        print(f"Error detail: {error_data.get('detail')}")
    except:
        print(f"Raw error: {call_response.text}")

print("\n" + "=" * 60)
