"""
Test Campaign Management Access Control
Tests that only admins with correct departments can access the endpoints
"""

import requests
import sys

API_BASE_URL = "http://localhost:8000"

# Set console encoding for Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

def test_access_control():
    """Test access control for campaign management endpoints"""

    print("="*60)
    print("TESTING CAMPAIGN MANAGEMENT ACCESS CONTROL")
    print("="*60)
    print()

    # Test 1: Admin WITH correct department (Campaign Management)
    print("Test 1: Admin with 'Campaign Management' department")
    print("-" * 60)
    admin_id_allowed = 7  # This admin has Campaign Management
    response = requests.get(f"{API_BASE_URL}/api/manage-campaigns/profile/{admin_id_allowed}")

    if response.status_code == 200:
        print("✓ PASS: Access granted (200 OK)")
        data = response.json()
        print(f"  Admin: {data['first_name']} {data['father_name']}")
        print(f"  Departments: {data['departments']}")
    else:
        print(f"✗ FAIL: Expected 200, got {response.status_code}")
        print(f"  Response: {response.json()}")

    print()

    # Test 2: Create a test admin WITHOUT the required departments
    print("Test 2: Admin WITHOUT 'Campaign Management' or 'System Settings'")
    print("-" * 60)

    # First, create a test admin with different departments
    import psycopg
    from dotenv import load_dotenv
    import os

    load_dotenv()
    DATABASE_URL = os.getenv('DATABASE_URL')

    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    # Check if test admin exists
    cursor.execute("SELECT id FROM admin_profile WHERE email = %s", ('test_no_access@astegni.et',))
    existing = cursor.fetchone()

    if existing:
        test_admin_id = existing[0]
        print(f"  Using existing test admin (ID: {test_admin_id})")
    else:
        # Create test admin with DIFFERENT departments
        cursor.execute("""
            INSERT INTO admin_profile
            (email, password_hash, first_name, father_name, departments, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (
            'test_no_access@astegni.et',
            '$2b$12$test',
            'Test',
            'NoAccess',
            ['manage-contents', 'manage-users']  # NOT manage-campaigns or manage-system-settings
        ))
        test_admin_id = cursor.fetchone()[0]
        conn.commit()
        print(f"  Created test admin (ID: {test_admin_id})")

    cursor.close()
    conn.close()

    # Try to access with this admin
    response = requests.get(f"{API_BASE_URL}/api/manage-campaigns/profile/{test_admin_id}")

    if response.status_code == 403:
        print("✓ PASS: Access denied (403 Forbidden)")
        error = response.json()
        print(f"  Message: {error['detail']}")
    else:
        print(f"✗ FAIL: Expected 403, got {response.status_code}")
        print(f"  Response: {response.json()}")

    print()

    # Test 3: Test stats endpoint access control
    print("Test 3: Stats endpoint with correct admin")
    print("-" * 60)
    response = requests.get(f"{API_BASE_URL}/api/manage-campaigns/stats/{admin_id_allowed}")

    if response.status_code == 200:
        print("✓ PASS: Stats access granted (200 OK)")
    else:
        print(f"✗ FAIL: Expected 200, got {response.status_code}")

    print()

    # Test 4: Test stats endpoint access denied
    print("Test 4: Stats endpoint with unauthorized admin")
    print("-" * 60)
    response = requests.get(f"{API_BASE_URL}/api/manage-campaigns/stats/{test_admin_id}")

    if response.status_code == 403:
        print("✓ PASS: Stats access denied (403 Forbidden)")
    else:
        print(f"✗ FAIL: Expected 403, got {response.status_code}")

    print()

    # Test 5: Admin with System Settings department (should also have access)
    print("Test 5: Admin with 'System Settings' department")
    print("-" * 60)

    # Create/check admin with System Settings
    conn = psycopg.connect(DATABASE_URL)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM admin_profile WHERE email = %s", ('system_settings@astegni.et',))
    existing = cursor.fetchone()

    if existing:
        sys_admin_id = existing[0]
        print(f"  Using existing system settings admin (ID: {sys_admin_id})")
    else:
        cursor.execute("""
            INSERT INTO admin_profile
            (email, password_hash, first_name, father_name, departments, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            RETURNING id
        """, (
            'system_settings@astegni.et',
            '$2b$12$test',
            'System',
            'Admin',
            ['manage-system-settings']  # manage-system-settings is allowed
        ))
        sys_admin_id = cursor.fetchone()[0]
        conn.commit()
        print(f"  Created system settings admin (ID: {sys_admin_id})")

    cursor.close()
    conn.close()

    # Try to access with System Settings admin
    response = requests.get(f"{API_BASE_URL}/api/manage-campaigns/profile/{sys_admin_id}")

    if response.status_code == 200:
        print("✓ PASS: System Settings admin has access (200 OK)")
    elif response.status_code == 404:
        print("⚠ WARNING: Admin found but no campaign profile (404) - This is OK")
        print("  Note: System Settings admins can access but may not have campaign profile")
    else:
        print(f"✗ FAIL: Expected 200 or 404, got {response.status_code}")
        print(f"  Response: {response.json()}")

    print()
    print("="*60)
    print("ACCESS CONTROL TESTING COMPLETE")
    print("="*60)

if __name__ == "__main__":
    try:
        test_access_control()
    except Exception as e:
        print(f"\n❌ Error running tests: {e}")
        import traceback
        traceback.print_exc()
