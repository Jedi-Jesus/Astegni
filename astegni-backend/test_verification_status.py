#!/usr/bin/env python3
"""
Test script to verify correct verification status filtering in all panels
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_verification_filtering():
    """Test that each panel shows only the correct verification statuses"""

    # First, login as admin
    login_data = {
        "username": "admin",  # Update with your admin username
        "password": "admin123"  # Update with your admin password
    }

    print("=" * 70)
    print("VERIFICATION STATUS FILTERING TEST")
    print("=" * 70)

    print("\n1. Logging in as admin...")
    response = requests.post(f"{BASE_URL}/api/login", json=login_data)

    if response.status_code != 200:
        print(f"✗ Login failed: {response.status_code}")
        print("Please update credentials in this script")
        return

    token = response.json().get("access_token")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    print("✓ Login successful")

    # Test each panel
    test_results = []

    # Test Pending Panel
    print("\n2. Testing PENDING TUTORS Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/pending?limit=100", headers=headers)
    if response.status_code == 200:
        data = response.json()
        tutors = data.get('tutors', [])

        # Check all tutors have pending status
        non_pending = [t for t in tutors if t.get('verification_status') != 'pending']

        if non_pending:
            print(f"✗ Found {len(non_pending)} non-pending tutors in pending panel!")
            for t in non_pending[:3]:
                print(f"  - {t.get('name')}: {t.get('verification_status')}")
        else:
            print(f"✓ All {len(tutors)} tutors have 'pending' status")
            test_results.append(('Pending Panel', True, len(tutors)))
    else:
        print(f"✗ Failed to load pending tutors: {response.status_code}")
        test_results.append(('Pending Panel', False, 0))

    # Test Verified Panel
    print("\n3. Testing VERIFIED TUTORS Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/verified?limit=100", headers=headers)
    if response.status_code == 200:
        data = response.json()
        tutors = data.get('tutors', [])

        # Check all tutors have verified status
        non_verified = [t for t in tutors if t.get('verification_status') != 'verified']

        if non_verified:
            print(f"✗ Found {len(non_verified)} non-verified tutors in verified panel!")
            for t in non_verified[:3]:
                print(f"  - {t.get('name')}: {t.get('verification_status')}")
        else:
            print(f"✓ All {len(tutors)} tutors have 'verified' status")
            test_results.append(('Verified Panel', True, len(tutors)))
    else:
        print(f"✗ Failed to load verified tutors: {response.status_code}")
        test_results.append(('Verified Panel', False, 0))

    # Test Rejected Panel
    print("\n4. Testing REJECTED TUTORS Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/rejected?limit=100", headers=headers)
    if response.status_code == 200:
        data = response.json()
        tutors = data.get('tutors', [])

        # Check all tutors have rejected status
        non_rejected = [t for t in tutors if t.get('verification_status') != 'rejected']

        if non_rejected:
            print(f"✗ Found {len(non_rejected)} non-rejected tutors in rejected panel!")
            for t in non_rejected[:3]:
                print(f"  - {t.get('name')}: {t.get('verification_status')}")
        else:
            print(f"✓ All {len(tutors)} tutors have 'rejected' status")
            test_results.append(('Rejected Panel', True, len(tutors)))
    else:
        print(f"✗ Failed to load rejected tutors: {response.status_code}")
        test_results.append(('Rejected Panel', False, 0))

    # Test Suspended Panel
    print("\n5. Testing SUSPENDED TUTORS Panel...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/suspended?limit=100", headers=headers)
    if response.status_code == 200:
        data = response.json()
        tutors = data.get('tutors', [])

        # Check all tutors have suspended status
        non_suspended = [t for t in tutors if t.get('verification_status') != 'suspended']

        if non_suspended:
            print(f"✗ Found {len(non_suspended)} non-suspended tutors in suspended panel!")
            for t in non_suspended[:3]:
                print(f"  - {t.get('name')}: {t.get('verification_status')}")
        else:
            print(f"✓ All {len(tutors)} tutors have 'suspended' status")
            test_results.append(('Suspended Panel', True, len(tutors)))
    else:
        print(f"✗ Failed to load suspended tutors: {response.status_code}")
        test_results.append(('Suspended Panel', False, 0))

    # Test Recent Activity (Live Widget)
    print("\n6. Testing LIVE WIDGET (Recent Activity)...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/recent-activity?limit=100", headers=headers)
    if response.status_code == 200:
        data = response.json()
        activities = data.get('activities', data.get('tutors', []))

        # Check no tutors have not_verified status
        not_verified = [a for a in activities if a.get('verification_status') == 'not_verified']

        if not_verified:
            print(f"✗ Found {len(not_verified)} 'not_verified' tutors in live widget!")
            for t in not_verified[:3]:
                print(f"  - {t.get('name')}: {t.get('verification_status')}")
        else:
            print(f"✓ No 'not_verified' tutors in live widget ({len(activities)} total)")

            # Show status distribution
            status_counts = {}
            for a in activities:
                status = a.get('verification_status', 'unknown')
                status_counts[status] = status_counts.get(status, 0) + 1

            if status_counts:
                print("  Status distribution in live widget:")
                for status, count in sorted(status_counts.items()):
                    print(f"    - {status}: {count}")

            test_results.append(('Live Widget', True, len(activities)))
    else:
        print(f"✗ Failed to load recent activity: {response.status_code}")
        test_results.append(('Live Widget', False, 0))

    # Test Statistics
    print("\n7. Testing STATISTICS Endpoint...")
    response = requests.get(f"{BASE_URL}/api/admin/tutors/statistics", headers=headers)
    if response.status_code == 200:
        stats = response.json()
        print("✓ Statistics loaded successfully:")
        print(f"  - Pending: {stats.get('pending', 0)}")
        print(f"  - Verified: {stats.get('verified', 0)}")
        print(f"  - Rejected: {stats.get('rejected', 0)}")
        print(f"  - Suspended: {stats.get('suspended', 0)}")
        print(f"  - Total (excluding not_verified): {stats.get('totalTutors', 0)}")
        test_results.append(('Statistics', True, stats.get('totalTutors', 0)))
    else:
        print(f"✗ Failed to load statistics: {response.status_code}")
        test_results.append(('Statistics', False, 0))

    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    all_passed = True
    for panel, passed, count in test_results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{panel:20} {status:10} ({count} records)")
        if not passed:
            all_passed = False

    print("\n" + "=" * 70)
    if all_passed:
        print("✅ ALL TESTS PASSED! Verification status filtering is working correctly.")
    else:
        print("❌ SOME TESTS FAILED! Check the issues above.")

    print("\nNOTE: 'not_verified' tutors should NEVER appear in any admin panel.")
    print("They are tutors who registered but haven't requested verification.")

if __name__ == "__main__":
    test_verification_filtering()