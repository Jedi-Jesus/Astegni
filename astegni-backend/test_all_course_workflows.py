"""
Comprehensive Course Management Workflow Tests
Tests all API endpoints: Create, Approve, Reject, Suspend, Reinstate, Notify, Delete
"""

import sys
import requests
import json
import time

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

API_BASE_URL = 'http://localhost:8000'

# Test counters
tests_passed = 0
tests_failed = 0

def print_header(title):
    """Print section header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_result(test_name, passed, message=""):
    """Print test result"""
    global tests_passed, tests_failed
    if passed:
        tests_passed += 1
        print(f"✓ {test_name}: PASS")
        if message:
            print(f"  → {message}")
    else:
        tests_failed += 1
        print(f"✗ {test_name}: FAIL")
        if message:
            print(f"  → ERROR: {message}")

def test_create_course():
    """Test 1: Create a new course request"""
    print_header("Test 1: Create Course Request")

    course_data = {
        "title": "Test Course - Advanced Physics",
        "category": "Science",
        "level": "Grade 11-12",
        "description": "Test course for workflow validation",
        "requested_by": "Test Admin"
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/requests",
            json=course_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            request_id = result.get('request_id')
            test_result("Create Course", True, f"Created: {request_id}")
            return request_id
        else:
            test_result("Create Course", False, f"Status {response.status_code}: {response.text}")
            return None

    except Exception as e:
        test_result("Create Course", False, str(e))
        return None

def test_approve_course(request_id):
    """Test 2: Approve a course request"""
    print_header("Test 2: Approve Course Request")

    if not request_id:
        test_result("Approve Course", False, "No request_id to approve")
        return None

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/{request_id}/approve",
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            course_id = result.get('course_id')
            test_result("Approve Course", True, f"{request_id} → {course_id}")
            return course_id
        else:
            test_result("Approve Course", False, f"Status {response.status_code}: {response.text}")
            return None

    except Exception as e:
        test_result("Approve Course", False, str(e))
        return None

def test_send_notification(course_id):
    """Test 3: Send notification to tutors"""
    print_header("Test 3: Send Course Notification")

    if not course_id:
        test_result("Send Notification", False, "No course_id to notify")
        return False

    notification_data = {
        "message": "Test notification: This course is in high demand!",
        "target_audience": "Science Tutors"
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/{course_id}/notify",
            json=notification_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            test_result("Send Notification", True, f"Sent to {result.get('target_audience')}")
            return True
        else:
            test_result("Send Notification", False, f"Status {response.status_code}: {response.text}")
            return False

    except Exception as e:
        test_result("Send Notification", False, str(e))
        return False

def test_suspend_course(course_id):
    """Test 4: Suspend an active course"""
    print_header("Test 4: Suspend Active Course")

    if not course_id:
        test_result("Suspend Course", False, "No course_id to suspend")
        return None

    suspend_data = {
        "reason": "Test suspension for workflow validation"
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/{course_id}/suspend",
            json=suspend_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            suspended_id = result.get('suspended_id')
            test_result("Suspend Course", True, f"{course_id} → {suspended_id}")
            return suspended_id
        else:
            test_result("Suspend Course", False, f"Status {response.status_code}: {response.text}")
            return None

    except Exception as e:
        test_result("Suspend Course", False, str(e))
        return None

def test_reinstate_course(suspended_id):
    """Test 5: Reinstate a suspended course"""
    print_header("Test 5: Reinstate Suspended Course")

    if not suspended_id:
        test_result("Reinstate Course", False, "No suspended_id to reinstate")
        return None

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/{suspended_id}/reinstate",
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            new_course_id = result.get('course_id')
            test_result("Reinstate Course", True, f"{suspended_id} → {new_course_id}")
            return new_course_id
        else:
            test_result("Reinstate Course", False, f"Status {response.status_code}: {response.text}")
            return None

    except Exception as e:
        test_result("Reinstate Course", False, str(e))
        return None

def test_delete_course(course_id):
    """Test 6: Delete an active course"""
    print_header("Test 6: Delete Active Course")

    if not course_id:
        test_result("Delete Course", False, "No course_id to delete")
        return False

    try:
        response = requests.delete(
            f"{API_BASE_URL}/api/course-management/active/{course_id}",
            headers={"Content-Type": "application/json"}
        )

        if response.status_code == 200:
            result = response.json()
            test_result("Delete Course", True, f"{course_id} permanently deleted")
            return True
        else:
            test_result("Delete Course", False, f"Status {response.status_code}: {response.text}")
            return False

    except Exception as e:
        test_result("Delete Course", False, str(e))
        return False

def test_reject_workflow():
    """Test 7: Create → Reject → Reconsider workflow"""
    print_header("Test 7: Reject & Reconsider Workflow")

    # Create course
    course_data = {
        "title": "Test Course - To Be Rejected",
        "category": "Mathematics",
        "level": "Grade 9-10",
        "description": "This course will be rejected",
        "requested_by": "Test Admin"
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/requests",
            json=course_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 200:
            test_result("Reject Workflow - Create", False, "Failed to create course")
            return False

        request_id = response.json().get('request_id')
        test_result("Reject Workflow - Create", True, f"Created: {request_id}")

        # Reject course
        reject_data = {"reason": "Content needs improvement"}
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/{request_id}/reject",
            json=reject_data,
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 200:
            test_result("Reject Workflow - Reject", False, "Failed to reject course")
            return False

        rejected_id = response.json().get('rejected_id')
        test_result("Reject Workflow - Reject", True, f"{request_id} → {rejected_id}")

        # Reconsider course
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/{rejected_id}/reconsider",
            headers={"Content-Type": "application/json"}
        )

        if response.status_code != 200:
            test_result("Reject Workflow - Reconsider", False, "Failed to reconsider course")
            return False

        new_request_id = response.json().get('request_id')
        test_result("Reject Workflow - Reconsider", True, f"{rejected_id} → {new_request_id}")

        # Clean up - delete the reconsidered request
        requests.delete(f"{API_BASE_URL}/api/course-management/requests/{new_request_id}")

        return True

    except Exception as e:
        test_result("Reject Workflow", False, str(e))
        return False

def test_list_endpoints():
    """Test 8: List all courses from each endpoint"""
    print_header("Test 8: List All Courses")

    endpoints = [
        ("Course Requests", "/api/course-management/requests"),
        ("Active Courses", "/api/course-management/active"),
        ("Rejected Courses", "/api/course-management/rejected"),
        ("Suspended Courses", "/api/course-management/suspended")
    ]

    for name, endpoint in endpoints:
        try:
            response = requests.get(f"{API_BASE_URL}{endpoint}")
            if response.status_code == 200:
                result = response.json()
                count = result.get('count', 0)
                test_result(f"List {name}", True, f"Found {count} courses")
            else:
                test_result(f"List {name}", False, f"Status {response.status_code}")
        except Exception as e:
            test_result(f"List {name}", False, str(e))

def main():
    """Run all tests"""
    print("\n" + "=" * 70)
    print("  COURSE MANAGEMENT WORKFLOW TEST SUITE")
    print("=" * 70)
    print(f"Backend URL: {API_BASE_URL}")
    print("Testing all endpoints: Create, Approve, Reject, Suspend, Reinstate, Notify, Delete\n")

    # Full approval workflow
    request_id = test_create_course()
    time.sleep(0.5)  # Small delay between requests

    course_id = test_approve_course(request_id)
    time.sleep(0.5)

    if course_id:
        test_send_notification(course_id)
        time.sleep(0.5)

        suspended_id = test_suspend_course(course_id)
        time.sleep(0.5)

        if suspended_id:
            reinstated_id = test_reinstate_course(suspended_id)
            time.sleep(0.5)

            if reinstated_id:
                test_delete_course(reinstated_id)
                time.sleep(0.5)

    # Reject workflow
    test_reject_workflow()
    time.sleep(0.5)

    # List endpoints
    test_list_endpoints()

    # Final summary
    print("\n" + "=" * 70)
    print("  TEST SUMMARY")
    print("=" * 70)

    total = tests_passed + tests_failed
    print(f"✓ Passed: {tests_passed}/{total}")
    print(f"✗ Failed: {tests_failed}/{total}")

    if tests_failed == 0:
        print("\n🎉 ALL TESTS PASSED! Course management system is fully functional.")
        return 0
    else:
        print(f"\n⚠️  {tests_failed} test(s) failed. Check the errors above.")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend server!")
        print("Make sure the server is running: cd astegni-backend && python app.py")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Tests interrupted by user")
        sys.exit(1)
