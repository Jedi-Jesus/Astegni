"""
Test the trending system
"""
import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_tracking():
    """Test tracking tutor views"""
    print("=" * 60)
    print("TEST: Track Tutor Views")
    print("=" * 60)

    # First, login to get a token
    login_data = {
        "username": "jediael.s.abebe@gmail.com",
        "password": "@JesusJediael1234"
    }

    login_response = requests.post(f"{API_BASE_URL}/api/login", json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(login_response.text)
        return

    token = login_response.json().get("access_token")
    print(f"✓ Logged in successfully")

    # Track some tutors
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    track_data = {
        "tutor_ids": [1, 2, 3, 1, 1]  # Tutor 1 gets 3 views
    }

    track_response = requests.post(
        f"{API_BASE_URL}/api/tutors/track-views",
        headers=headers,
        json=track_data
    )

    print(f"\nTracking Response ({track_response.status_code}):")
    print(json.dumps(track_response.json(), indent=2))

def test_trending():
    """Test getting trending tutors"""
    print("\n" + "=" * 60)
    print("TEST: Get Trending Tutors")
    print("=" * 60)

    response = requests.get(f"{API_BASE_URL}/api/tutors/trending?limit=10&min_searches=1")

    print(f"\nTrending Tutors ({response.status_code}):")
    if response.status_code == 200:
        data = response.json()
        print(f"Total trending tutors: {data.get('total')}")
        print("\nTop Trending Tutors:")
        for tutor in data.get('trending_tutors', [])[:10]:
            print(f"  - {tutor.get('first_name')} {tutor.get('father_name')}: "
                  f"{tutor.get('search_count')} searches, "
                  f"score={tutor.get('trending_score'):.2f}")
    else:
        print(response.text)

def test_stats():
    """Test getting search statistics"""
    print("\n" + "=" * 60)
    print("TEST: Get Search Statistics")
    print("=" * 60)

    response = requests.get(f"{API_BASE_URL}/api/tutors/search-stats")

    print(f"\nSearch Statistics ({response.status_code}):")
    if response.status_code == 200:
        data = response.json()
        print(f"  Total searches: {data.get('total_searches')}")
        print(f"  Average searches per tutor: {data.get('average_searches'):.2f}")
        print(f"  Total tutors: {data.get('total_tutors')}")
        print(f"\n  Top 10 Most Searched:")
        for i, tutor in enumerate(data.get('top_10_most_searched', []), 1):
            print(f"    {i}. {tutor.get('first_name')} {tutor.get('father_name')}: "
                  f"{tutor.get('search_count')} searches")
    else:
        print(response.text)

if __name__ == "__main__":
    print("\n🧪 Testing Trending System\n")

    try:
        test_tracking()
        test_trending()
        test_stats()

        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60 + "\n")

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to backend at", API_BASE_URL)
        print("Make sure the backend is running: python app.py\n")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
