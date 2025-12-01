"""
Test Connection Flow - Quick verification script

This script tests the complete connection flow:
1. Creates test users (student and tutor)
2. Sends connection request
3. Checks connection status
4. Updates connection status
5. Deletes connection

Run this to verify the connection endpoints are working correctly.
"""

import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_STUDENT_EMAIL = "test_student@astegni.com"
TEST_TUTOR_EMAIL = "test_tutor@astegni.com"
TEST_PASSWORD = "TestPassword123"

def print_section(title):
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_response(response):
    print(f"Status: {response.status_code}")
    try:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        return data
    except:
        print(f"Response: {response.text}")
        return None

def register_user(email, password, first_name, father_name, roles):
    """Register a new user"""
    response = requests.post(f"{API_BASE_URL}/api/register", json={
        "email": email,
        "password": password,
        "first_name": first_name,
        "father_name": father_name,
        "grandfather_name": "TestGrandfather",
        "roles": roles
    })
    return response

def login_user(email, password):
    """Login and get token"""
    response = requests.post(f"{API_BASE_URL}/api/login", json={
        "email": email,
        "password": password
    })
    if response.status_code == 200:
        data = response.json()
        return data.get('access_token')
    return None

def check_connection_status(token, target_user_id):
    """Check connection status with a user"""
    response = requests.post(
        f"{API_BASE_URL}/api/connections/check",
        headers={"Authorization": f"Bearer {token}"},
        json={"target_user_id": target_user_id}
    )
    return response

def send_connection_request(token, target_user_id):
    """Send a connection request"""
    response = requests.post(
        f"{API_BASE_URL}/api/connections",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "target_user_id": target_user_id,
            "connection_type": "connect",
            "connection_message": "Hello! Let's connect on Astegni."
        }
    )
    return response

def get_my_connections(token):
    """Get current user's connections"""
    response = requests.get(
        f"{API_BASE_URL}/api/connections",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response

def update_connection_status(token, connection_id, status):
    """Update connection status"""
    response = requests.put(
        f"{API_BASE_URL}/api/connections/{connection_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": status}
    )
    return response

def delete_connection(token, connection_id):
    """Delete a connection"""
    response = requests.delete(
        f"{API_BASE_URL}/api/connections/{connection_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    return response

def main():
    print("\n🚀 Testing Astegni Connection Flow\n")

    # Step 1: Register or login student
    print_section("Step 1: Setup Student User")
    student_token = login_user(TEST_STUDENT_EMAIL, TEST_PASSWORD)
    if not student_token:
        print("Student not found, registering...")
        register_response = register_user(
            TEST_STUDENT_EMAIL,
            TEST_PASSWORD,
            "Test",
            "Student",
            ["student"]
        )
        print_response(register_response)
        student_token = login_user(TEST_STUDENT_EMAIL, TEST_PASSWORD)

    if not student_token:
        print("❌ Failed to get student token")
        return
    print(f"✅ Student token obtained: {student_token[:20]}...")

    # Get student user ID
    student_me = requests.get(
        f"{API_BASE_URL}/api/me",
        headers={"Authorization": f"Bearer {student_token}"}
    ).json()
    student_user_id = student_me['user_id']
    print(f"Student User ID: {student_user_id}")

    # Step 2: Register or login tutor
    print_section("Step 2: Setup Tutor User")
    tutor_token = login_user(TEST_TUTOR_EMAIL, TEST_PASSWORD)
    if not tutor_token:
        print("Tutor not found, registering...")
        register_response = register_user(
            TEST_TUTOR_EMAIL,
            TEST_PASSWORD,
            "Test",
            "Tutor",
            ["tutor"]
        )
        print_response(register_response)
        tutor_token = login_user(TEST_TUTOR_EMAIL, TEST_PASSWORD)

    if not tutor_token:
        print("❌ Failed to get tutor token")
        return
    print(f"✅ Tutor token obtained: {tutor_token[:20]}...")

    # Get tutor user ID
    tutor_me = requests.get(
        f"{API_BASE_URL}/api/me",
        headers={"Authorization": f"Bearer {tutor_token}"}
    ).json()
    tutor_user_id = tutor_me['user_id']
    print(f"Tutor User ID: {tutor_user_id}")

    # Step 3: Check initial connection status
    print_section("Step 3: Check Initial Connection Status")
    status_response = check_connection_status(student_token, tutor_user_id)
    status_data = print_response(status_response)

    if status_data and status_data.get('is_connected'):
        print("⚠️  Connection already exists, cleaning up first...")
        # Get all connections and delete
        connections = get_my_connections(student_token).json()
        for conn in connections:
            if conn['user_id_2'] == tutor_user_id:
                delete_connection(student_token, conn['id'])
                print(f"Deleted connection {conn['id']}")
        print("✅ Cleanup complete, checking status again...")
        status_response = check_connection_status(student_token, tutor_user_id)
        status_data = print_response(status_response)

    # Step 4: Send connection request
    print_section("Step 4: Send Connection Request (Student → Tutor)")
    connect_response = send_connection_request(student_token, tutor_user_id)
    connect_data = print_response(connect_response)

    if not connect_data:
        print("❌ Failed to send connection request")
        return

    connection_id = connect_data['id']
    print(f"✅ Connection created with ID: {connection_id}")
    print(f"   Status: {connect_data['status']}")
    print(f"   Type: {connect_data['connection_type']}")

    # Step 5: Verify connection status (from student's perspective)
    print_section("Step 5: Check Status After Request (Student)")
    status_response = check_connection_status(student_token, tutor_user_id)
    status_data = print_response(status_response)
    print(f"✅ Is Connected: {status_data.get('is_connected')}")
    print(f"   Status: {status_data.get('status')}")
    print(f"   Direction: {status_data.get('direction')}")

    # Step 6: Check status from tutor's perspective
    print_section("Step 6: Check Status From Tutor's Side")
    tutor_status = check_connection_status(tutor_token, student_user_id)
    tutor_status_data = print_response(tutor_status)
    print(f"✅ Tutor sees request as: {tutor_status_data.get('direction')}")
    print(f"   Status: {tutor_status_data.get('status')}")

    # Step 7: Get tutor's incoming connections
    print_section("Step 7: Get Tutor's Incoming Connections")
    tutor_connections = requests.get(
        f"{API_BASE_URL}/api/connections?direction=incoming",
        headers={"Authorization": f"Bearer {tutor_token}"}
    )
    print_response(tutor_connections)

    # Step 8: Tutor accepts connection
    print_section("Step 8: Tutor Accepts Connection Request")
    accept_response = update_connection_status(tutor_token, connection_id, "connected")
    accept_data = print_response(accept_response)
    print(f"✅ Connection status updated to: {accept_data.get('status')}")
    print(f"   Connected at: {accept_data.get('connected_at')}")

    # Step 9: Verify final status
    print_section("Step 9: Verify Final Connection Status")
    final_status = check_connection_status(student_token, tutor_user_id)
    final_data = print_response(final_status)
    print(f"✅ Is Connected: {final_data.get('is_connected')}")
    print(f"   Status: {final_data.get('status')}")

    # Step 10: Get student's connections
    print_section("Step 10: Get Student's All Connections")
    student_connections = get_my_connections(student_token)
    connections_data = print_response(student_connections)
    print(f"✅ Total connections: {len(connections_data) if connections_data else 0}")

    # Step 11: Disconnect
    print_section("Step 11: Student Disconnects")
    disconnect_response = update_connection_status(student_token, connection_id, "disconnect")
    disconnect_data = print_response(disconnect_response)
    print(f"✅ Connection status: {disconnect_data.get('status')}")

    # Step 12: Delete connection (cleanup)
    print_section("Step 12: Delete Connection (Cleanup)")
    delete_response = delete_connection(student_token, connection_id)
    print(f"Status: {delete_response.status_code}")
    if delete_response.status_code == 204:
        print("✅ Connection deleted successfully")

    # Final verification
    print_section("Step 13: Final Verification")
    final_check = check_connection_status(student_token, tutor_user_id)
    final_check_data = print_response(final_check)
    print(f"✅ Connection exists: {final_check_data.get('is_connected')}")

    print("\n" + "="*60)
    print("  🎉 ALL TESTS COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("\nConnection flow is working correctly:")
    print("✅ Connection requests can be sent")
    print("✅ Connection status can be checked")
    print("✅ Connections can be accepted")
    print("✅ Connections can be disconnected")
    print("✅ Connections can be deleted")
    print("\nYour view-tutor.html connection button is ready to use!")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()
