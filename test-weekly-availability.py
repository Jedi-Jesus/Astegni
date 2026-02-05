"""
Test script to verify weekly availability endpoint after restart
"""
import requests
import json
from datetime import datetime, timedelta

API_BASE_URL = "http://localhost:8000"

def test_weekly_availability():
    print("=" * 60)
    print("Testing Weekly Availability Endpoint")
    print("=" * 60)

    # Calculate current week
    today = datetime.now()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    print(f"\nCurrent Week:")
    print(f"  Today: {today.date()}")
    print(f"  Week Start (Monday): {week_start.date()}")
    print(f"  Week End (Sunday): {week_end.date()}")
    print()

    # Test endpoint
    user_id = 1  # Jediael
    url = f"{API_BASE_URL}/api/view-tutor/{user_id}/availability/featured?by_user_id=true"

    print(f"Testing: {url}")
    print()

    try:
        response = requests.get(url)

        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(f"Detail: {response.json()}")
            return

        data = response.json()

        print("✅ Success!")
        print()
        print(f"Week Range: {data.get('week_start')} to {data.get('week_end')}")
        print(f"Total Count: {data.get('total_count')}")
        print()

        # Display schedules
        schedules = data.get('schedules', [])
        print(f"📅 Schedules ({len(schedules)}):")
        for s in schedules:
            print(f"\n  Schedule #{s['id']}: {s.get('title', 'Untitled')}")
            print(f"    Days: {s.get('days', [])}")
            print(f"    Specific Dates: {s.get('specific_dates', [])}")
            print(f"    ✅ Relevant Days: {s.get('relevant_days', [])}")
            print(f"    ✅ Relevant Dates: {s.get('relevant_dates', [])}")
            print(f"    Time: {s.get('start_time')} - {s.get('end_time')}")
            print(f"    Featured: {s.get('is_featured')}, Status: {s.get('status')}")

        # Display sessions
        sessions = data.get('sessions', [])
        print(f"\n📝 Sessions ({len(sessions)}):")
        if sessions:
            for s in sessions:
                print(f"\n  Session #{s['id']}")
                print(f"    Date: {s.get('session_date')}")
                print(f"    Time: {s.get('start_time')} - {s.get('end_time')}")
                print(f"    Featured: {s.get('is_featured')}, Status: {s.get('status')}")
        else:
            print("  No featured sessions this week")

        print("\n" + "=" * 60)
        print("Verification:")
        print("=" * 60)

        # Verify all items are within current week
        all_valid = True

        for s in schedules:
            # Check if has relevant days or dates
            has_relevant = s.get('relevant_days') or s.get('relevant_dates')
            if not has_relevant:
                print(f"❌ Schedule #{s['id']} has no relevant days/dates for this week!")
                all_valid = False
            else:
                print(f"✅ Schedule #{s['id']} is relevant to this week")

        for s in sessions:
            session_date = datetime.strptime(s['session_date'], '%Y-%m-%d').date()
            if not (week_start.date() <= session_date <= week_end.date()):
                print(f"❌ Session #{s['id']} date {session_date} is outside this week!")
                all_valid = False
            else:
                print(f"✅ Session #{s['id']} is within this week")

        if all_valid:
            print("\n🎉 All items are correctly filtered for current week!")
        else:
            print("\n⚠️ Some items are not properly filtered!")

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Is it running?")
        print("   Run: cd astegni-backend && python app.py")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_weekly_availability()
