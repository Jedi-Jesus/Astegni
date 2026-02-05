"""
Test Parent Dashboard Stats Endpoint

Run this to verify the dashboard stats endpoint is working correctly.
"""

import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Test user credentials (update with your test parent user)
TEST_EMAIL = "jediael.s.abebe@gmail.com"  # Parent user
TEST_PASSWORD = "@JesusJediael1234"

API_BASE_URL = "http://localhost:8000"

def login_and_get_token():
    """Login and get authentication token"""
    print("\n1. Logging in...")
    response = requests.post(f"{API_BASE_URL}/api/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })

    if response.status_code == 200:
        data = response.json()
        token = data.get("access_token")
        print(f"✓ Login successful!")
        return token
    else:
        print(f"✗ Login failed: {response.status_code} - {response.text}")
        return None

def test_dashboard_stats(token):
    """Test the dashboard stats endpoint"""
    print("\n2. Fetching dashboard stats...")

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(f"{API_BASE_URL}/api/parent/dashboard-stats", headers=headers)

    if response.status_code == 200:
        stats = response.json()
        print(f"✓ Dashboard stats retrieved successfully!")
        print("\n" + "=" * 60)
        print("DASHBOARD STATS:")
        print("=" * 60)
        print(f"Children Enrolled:    {stats.get('children_enrolled', 0)}")
        print(f"Active Tutors:        {stats.get('active_tutors', 0)}")
        print(f"Total Study Hours:    {stats.get('total_study_hours', 0)} hours")
        print(f"Sessions This Month:  {stats.get('sessions_this_month', 0)}")
        print(f"Tutor Satisfaction:   {stats.get('tutor_satisfaction', 0.0)}/5.0")
        print(f"Attendance Rate:      {stats.get('attendance_rate', 0.0)}%")
        print(f"Family Progress:      {stats.get('family_progress', 'Coming Soon')}")
        print(f"Monthly Investment:   {stats.get('monthly_investment', 'Coming Soon')}")
        print("=" * 60)
        return True
    else:
        print(f"✗ Failed to fetch dashboard stats: {response.status_code}")
        print(f"Response: {response.text}")
        return False

def main():
    print("=" * 60)
    print("TESTING PARENT DASHBOARD STATS ENDPOINT")
    print("=" * 60)

    # Step 1: Login
    token = login_and_get_token()
    if not token:
        print("\n✗ Test failed: Could not authenticate")
        return

    # Step 2: Test dashboard stats
    success = test_dashboard_stats(token)

    if success:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Tests failed")

if __name__ == "__main__":
    main()
