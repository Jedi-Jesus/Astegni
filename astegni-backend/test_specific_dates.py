"""
Test specific dates schedule creation
"""
import requests
import json

# API base URL
API_BASE = "http://localhost:8000"

# Test credentials (use a real tutor account)
# You'll need to get a valid token first
def test_specific_dates_schedule():
    # First, login to get a token
    # Replace with actual credentials
    login_data = {
        "username": "test_tutor",  # Replace with actual tutor username
        "password": "password123"   # Replace with actual password
    }

    try:
        # Login
        response = requests.post(f"{API_BASE}/api/login", json=login_data)
        if response.status_code != 200:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return

        token = response.json().get("access_token")
        print(f"✅ Login successful, got token")

        # Create schedule with specific dates
        schedule_data = {
            "title": "Test Specific Dates Schedule",
            "description": "Testing specific dates functionality",
            "subject": "Mathematics",
            "subject_type": "Mathematics",
            "grade_level": "Grade 9-10",
            "year": 2025,
            "schedule_type": "specific",
            "months": [],
            "days": [],
            "specific_dates": ["2025-01-15", "2025-01-20", "2025-01-25"],
            "start_time": "09:00",
            "end_time": "10:00",
            "notes": "Test notes",
            "status": "active",
            "alarm_enabled": False,
            "alarm_before_minutes": None,
            "notification_browser": False,
            "notification_sound": False
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        print(f"\n📤 Sending schedule data:")
        print(json.dumps(schedule_data, indent=2))

        # Create schedule
        response = requests.post(
            f"{API_BASE}/api/tutor/schedules",
            json=schedule_data,
            headers=headers
        )

        print(f"\n📥 Response status: {response.status_code}")
        print(f"Response body:")
        print(json.dumps(response.json(), indent=2))

        if response.status_code == 201:
            print("\n✅ Schedule created successfully!")
            schedule_id = response.json().get("id")

            # Verify it was saved correctly
            verify_response = requests.get(
                f"{API_BASE}/api/tutor/schedules/{schedule_id}",
                headers=headers
            )

            if verify_response.status_code == 200:
                saved_schedule = verify_response.json()
                print("\n📋 Verified saved schedule:")
                print(f"ID: {saved_schedule.get('id')}")
                print(f"Title: {saved_schedule.get('title')}")
                print(f"Schedule Type: {saved_schedule.get('schedule_type')}")
                print(f"Specific Dates: {saved_schedule.get('specific_dates')}")

                if saved_schedule.get('specific_dates') == schedule_data['specific_dates']:
                    print("\n✅ Specific dates saved correctly!")
                else:
                    print("\n❌ Specific dates don't match!")
                    print(f"Expected: {schedule_data['specific_dates']}")
                    print(f"Got: {saved_schedule.get('specific_dates')}")
        else:
            print("\n❌ Schedule creation failed!")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🧪 Testing Specific Dates Schedule Creation\n")
    print("=" * 60)
    test_specific_dates_schedule()
