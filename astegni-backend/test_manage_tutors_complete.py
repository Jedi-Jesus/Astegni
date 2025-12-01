#!/usr/bin/env python3
"""
Complete test script for manage-tutors.html database integration
Tests all panels, statistics, and tables
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_manage_tutors_integration():
    """Test the complete manage-tutors page integration"""

    # First, login as admin
    login_data = {
        "username": "admin",  # Update with your admin username
        "password": "admin123"  # Update with your admin password
    }

    print("=" * 60)
    print("MANAGE TUTORS - COMPLETE DATABASE INTEGRATION TEST")
    print("=" * 60)

    print("\n1. Testing login...")
    response = requests.post(f"{BASE_URL}/api/login", json=login_data)

    if response.status_code != 200:
        print(f"✗ Login failed: {response.status_code}")
        print(f"Response: {response.text}")
        print("\nPlease ensure:")
        print("  - Backend is running on http://localhost:8000")
        print("  - Admin user exists with correct credentials")
        print("  - Update the username/password in this script")
        return

    token_data = response.json()
    token = token_data.get("access_token")

    if not token:
        print("✗ No token received")
        return

    print("✓ Login successful")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Test Statistics Endpoint
    print("\n2. Testing Dashboard Statistics...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/statistics", headers=headers)

    if response.status_code == 200:
        stats = response.json()
        print("✓ Statistics endpoint working")
        print(f"\n   Dashboard Stats:")
        print(f"   ├─ Pending: {stats.get('pending', 0)}")
        print(f"   ├─ Verified: {stats.get('verified', 0)}")
        print(f"   ├─ Rejected: {stats.get('rejected', 0)}")
        print(f"   ├─ Suspended: {stats.get('suspended', 0)}")
        print(f"   ├─ Archived: {stats.get('archived', 0)}")
        print(f"   ├─ Total Tutors: {stats.get('totalTutors', 0)}")
        print(f"   ├─ Approval Rate: {stats.get('approvalRate', 0)}%")
        print(f"   ├─ Avg Processing Time: {stats.get('avgProcessingTime', '-')}")
        print(f"   └─ Client Satisfaction: {stats.get('clientSatisfaction', 0)}%")
    else:
        print(f"✗ Statistics endpoint failed: {response.status_code}")

    # Test Pending Tutors Panel
    print("\n3. Testing Pending Tutors Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/pending?limit=5", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Pending tutors endpoint working")
        print(f"   └─ Found {data.get('total', 0)} pending tutors")
        if data.get('tutors'):
            print(f"\n   Sample Pending Tutors:")
            for i, tutor in enumerate(data['tutors'][:3], 1):
                print(f"   {i}. {tutor.get('name', 'Unknown')} - {tutor.get('location', 'N/A')}")
    else:
        print(f"✗ Pending tutors endpoint failed: {response.status_code}")

    # Test Verified Tutors Panel
    print("\n4. Testing Verified Tutors Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/verified?limit=5", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Verified tutors endpoint working")
        print(f"   └─ Found {data.get('total', 0)} verified tutors")
        if data.get('tutors'):
            print(f"\n   Sample Verified Tutors:")
            for i, tutor in enumerate(data['tutors'][:3], 1):
                rating = tutor.get('rating', 0)
                print(f"   {i}. {tutor.get('name', 'Unknown')} - Rating: {rating}/5")
    else:
        print(f"✗ Verified tutors endpoint failed: {response.status_code}")

    # Test Rejected Tutors Panel
    print("\n5. Testing Rejected Tutors Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/rejected?limit=5", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Rejected tutors endpoint working")
        print(f"   └─ Found {data.get('total', 0)} rejected tutors")
        if data.get('tutors'):
            print(f"\n   Sample Rejected Tutors:")
            for i, tutor in enumerate(data['tutors'][:3], 1):
                reason = tutor.get('rejection_reason', 'No reason')
                print(f"   {i}. {tutor.get('name', 'Unknown')} - Reason: {reason}")
    else:
        print(f"✗ Rejected tutors endpoint failed: {response.status_code}")

    # Test Suspended Tutors Panel
    print("\n6. Testing Suspended Tutors Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/suspended?limit=5", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Suspended tutors endpoint working")
        print(f"   └─ Found {data.get('total', 0)} suspended tutors")
        if data.get('tutors'):
            print(f"\n   Sample Suspended Tutors:")
            for i, tutor in enumerate(data['tutors'][:3], 1):
                reason = tutor.get('suspension_reason', 'Policy violation')
                print(f"   {i}. {tutor.get('name', 'Unknown')} - Reason: {reason}")
    else:
        print(f"✗ Suspended tutors endpoint failed: {response.status_code}")

    # Test Recent Activity (Live Widget)
    print("\n7. Testing Live Tutor Requests Widget...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/recent-activity?limit=5", headers=headers)

    if response.status_code == 200:
        data = response.json()
        print(f"✓ Recent activity endpoint working")
        print(f"   └─ Found {data.get('total', 0)} recent activities")
        if data.get('activities') or data.get('tutors'):
            activities = data.get('activities') or data.get('tutors')
            print(f"\n   Recent Activities (for live widget):")
            for i, activity in enumerate(activities[:3], 1):
                status = activity.get('verification_status', 'pending')
                print(f"   {i}. {activity.get('name', 'Unknown')} - Status: {status}")
    else:
        print(f"✗ Recent activity endpoint failed: {response.status_code}")

    print("\n" + "=" * 60)
    print("FRONTEND TESTING CHECKLIST")
    print("=" * 60)
    print("\n✅ To test the frontend:")
    print("1. Open http://localhost:8080/admin-pages/manage-tutors.html")
    print("2. Check the following:")
    print("")
    print("   DASHBOARD PANEL:")
    print("   ☐ All 8 statistics cards show data (not hardcoded)")
    print("   ☐ Live Tutor Requests widget scrolls with real data")
    print("   ☐ Daily Quota widget shows actual counts")
    print("")
    print("   VERIFIED TUTORS PANEL:")
    print("   ☐ Statistics cards show: Total, Full-time, Part-time, Rating")
    print("   ☐ Table loads verified tutors from database")
    print("   ☐ Search and filters work")
    print("")
    print("   PENDING REQUESTS PANEL:")
    print("   ☐ Statistics cards show: Pending, Under Review, Today's Approvals")
    print("   ☐ Table loads pending tutors from database")
    print("   ☐ Review button opens modal with tutor details")
    print("")
    print("   REJECTED PANEL:")
    print("   ☐ Statistics cards show: Total, This Month, Reconsidered")
    print("   ☐ Table loads rejected tutors from database")
    print("")
    print("   SUSPENDED PANEL:")
    print("   ☐ Statistics cards show: Current, Policy Violations, Under Investigation")
    print("   ☐ Table loads suspended tutors from database")
    print("")
    print("   AUTO-REFRESH:")
    print("   ☐ Live widget updates every 30 seconds")
    print("   ☐ Stats refresh every 60 seconds")
    print("")
    print("If no data shows, run: python seed_tutor_data.py")

if __name__ == "__main__":
    test_manage_tutors_integration()