#!/usr/bin/env python3
"""
Test script to verify the live tutor requests widget
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_recent_activity():
    """Test the recent activity endpoint"""

    # First, login as admin
    login_data = {
        "username": "admin",  # Update with your admin username
        "password": "admin123"  # Update with your admin password
    }

    print("1. Testing login...")
    response = requests.post(f"{BASE_URL}/api/login", json=login_data)

    if response.status_code != 200:
        print(f"Login failed: {response.status_code}")
        print(f"Response: {response.text}")
        print("\nPlease ensure:")
        print("  - Backend is running on http://localhost:8000")
        print("  - Admin user exists with correct credentials")
        print("  - Update the username/password in this script")
        return

    token_data = response.json()
    token = token_data.get("access_token")

    if not token:
        print("No token received")
        return

    print("✓ Login successful")

    # Test recent activity endpoint
    print("\n2. Testing recent activity endpoint...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.get(f"{BASE_URL}/api/admin/tutors/recent-activity?limit=10", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Recent activity endpoint working")
        print(f"  - Found {data.get('total', 0)} activities")

        if data.get('activities'):
            print("\n  Sample activities:")
            for i, activity in enumerate(data['activities'][:3], 1):
                print(f"    {i}. {activity.get('name', 'Unknown')} - {activity.get('verification_status', 'pending')}")
                print(f"       Courses: {', '.join(activity.get('courses', []))}")
                print(f"       Location: {activity.get('location', 'Not specified')}")
        else:
            print("  No activities found - run seed_tutor_data.py to create sample data")
    else:
        print(f"✗ Recent activity endpoint failed: {response.status_code}")
        print(f"  Response: {response.text}")

    # Test statistics endpoint
    print("\n3. Testing statistics endpoint...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/statistics", headers=headers)

    if response.status_code == 200:
        stats = response.json()
        print(f"✓ Statistics endpoint working")
        print(f"  - Pending: {stats.get('pending', 0)}")
        print(f"  - Verified: {stats.get('verified', 0)}")
        print(f"  - Rejected: {stats.get('rejected', 0)}")
        print(f"  - Suspended: {stats.get('suspended', 0)}")
        print(f"  - Total: {stats.get('totalTutors', 0)}")
    else:
        print(f"✗ Statistics endpoint failed: {response.status_code}")
        print(f"  Response: {response.text}")

if __name__ == "__main__":
    print("Testing Live Tutor Requests Widget Backend")
    print("=" * 50)
    test_recent_activity()
    print("\n" + "=" * 50)
    print("\nTo test the frontend:")
    print("1. Open http://localhost:8080/admin-pages/manage-tutors.html")
    print("2. Check the 'Live Tutor Requests' widget on the right side")
    print("3. It should show scrolling tutor requests")
    print("4. Widget auto-refreshes every 30 seconds")