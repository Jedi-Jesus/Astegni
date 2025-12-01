"""
Test Course Creation API
Quick test script to verify course management endpoints
"""

import sys
import requests
import json

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

API_BASE_URL = 'http://localhost:8000'

def test_create_course():
    """Test creating a new course request"""
    print("=" * 60)
    print("Testing Course Creation API")
    print("=" * 60)

    course_data = {
        "title": "Introduction to Ethiopian History",
        "category": "Social Studies",
        "level": "Grade 9-10",
        "description": "Comprehensive course covering Ethiopian history from ancient times to modern era",
        "requested_by": "Test Admin"
    }

    print("\nSending POST request to create course...")
    print(f"Data: {json.dumps(course_data, indent=2)}")

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/course-management/requests",
            json=course_data,
            headers={"Content-Type": "application/json"}
        )

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"SUCCESS: Course created!")
            print(f"Request ID: {result.get('request_id')}")
            print(f"Database ID: {result.get('id')}")
            print(f"Message: {result.get('message')}")
            return True
        else:
            print(f"FAILED: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("\nERROR: Cannot connect to backend server!")
        print("Make sure the server is running: cd astegni-backend && python app.py")
        return False
    except Exception as e:
        print(f"\nERROR: {e}")
        return False

def test_get_course_requests():
    """Test fetching all course requests"""
    print("\n" + "=" * 60)
    print("Testing Get Course Requests API")
    print("=" * 60)

    try:
        response = requests.get(f"{API_BASE_URL}/api/course-management/requests")

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"SUCCESS: Found {result.get('count')} course requests")

            for course in result.get('courses', [])[:3]:  # Show first 3
                print(f"\n  - {course.get('request_id')}: {course.get('title')}")
                print(f"    Category: {course.get('category')}, Level: {course.get('level')}")

            return True
        else:
            print(f"FAILED: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("\nERROR: Cannot connect to backend server!")
        return False
    except Exception as e:
        print(f"\nERROR: {e}")
        return False

def test_get_active_courses():
    """Test fetching all active courses"""
    print("\n" + "=" * 60)
    print("Testing Get Active Courses API")
    print("=" * 60)

    try:
        response = requests.get(f"{API_BASE_URL}/api/course-management/active")

        print(f"\nStatus Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"SUCCESS: Found {result.get('count')} active courses")

            for course in result.get('courses', [])[:3]:  # Show first 3
                print(f"\n  - {course.get('course_id')}: {course.get('title')}")
                print(f"    Category: {course.get('category')}")
                print(f"    Students: {course.get('enrolled_students')}, Rating: {course.get('rating')}")
                print(f"    Notification Sent: {course.get('notification_sent')}")

            return True
        else:
            print(f"FAILED: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("\nERROR: Cannot connect to backend server!")
        return False
    except Exception as e:
        print(f"\nERROR: {e}")
        return False

if __name__ == "__main__":
    print("\nStarting Course Management API Tests...")
    print(f"Backend URL: {API_BASE_URL}\n")

    # Run tests
    results = []
    results.append(("Create Course", test_create_course()))
    results.append(("Get Course Requests", test_get_course_requests()))
    results.append(("Get Active Courses", test_get_active_courses()))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    for test_name, passed in results:
        status = "PASS" if passed else "FAIL"
        symbol = "✓" if passed else "✗"
        print(f"{symbol} {test_name}: {status}")

    total = len(results)
    passed = sum(1 for _, p in results if p)
    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\nAll tests passed! Backend API is working correctly.")
    else:
        print("\nSome tests failed. Check the server logs for details.")
