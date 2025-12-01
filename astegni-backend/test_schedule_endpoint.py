"""
Quick test to verify the schedule endpoint is working
Run this after backend is running
"""

import requests
import json

# Configuration
API_BASE = "http://localhost:8000"
TOKEN = None  # Will be set if you have one

def test_get_schedules():
    """Test GET /api/tutor/schedules endpoint"""
    print("=" * 60)
    print("Testing GET /api/tutor/schedules")
    print("=" * 60)

    headers = {}
    if TOKEN:
        headers['Authorization'] = f'Bearer {TOKEN}'

    try:
        response = requests.get(f"{API_BASE}/api/tutor/schedules", headers=headers)

        print(f"\nStatus Code: {response.status_code}")
        print(f"Status: {'✓ SUCCESS' if response.status_code == 200 else '✗ FAILED'}")

        if response.status_code == 200:
            schedules = response.json()
            print(f"\nSchedules found: {len(schedules)}")
            if schedules:
                print("\nFirst schedule:")
                print(json.dumps(schedules[0], indent=2, default=str))
            else:
                print("\nNo schedules in database yet (this is OK)")
        elif response.status_code == 401:
            print("\nError: Not authenticated")
            print("You need to log in first and get a token")
        elif response.status_code == 422:
            print("\n✗ ERROR 422: Unprocessable Content")
            print("This means the backend is still using old code!")
            print("\nSOLUTION:")
            print("1. Press Ctrl+C in the backend terminal")
            print("2. Restart: uvicorn app:app --reload")
            print("\nResponse details:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"\nError: {response.status_code}")
            print(response.text)

    except requests.exceptions.ConnectionError:
        print("\n✗ ERROR: Cannot connect to backend")
        print("Make sure the backend is running on http://localhost:8000")
    except Exception as e:
        print(f"\n✗ ERROR: {e}")

if __name__ == "__main__":
    print("\nTutor Schedule Endpoint Test")
    print("\nNote: This will return 401 if not authenticated")
    print("That's normal - the important thing is NO 422 error!\n")

    test_get_schedules()

    print("\n" + "=" * 60)
    print("Test Complete")
    print("=" * 60)
    print("\nExpected results:")
    print("  ✓ 200 OK - Endpoint working perfectly!")
    print("  ✓ 401 Unauthorized - Normal (need to log in)")
    print("  ✗ 422 Unprocessable - Backend needs restart!")
    print("\nIf you see 422, restart backend:")
    print("  cd astegni-backend")
    print("  uvicorn app:app --reload")
