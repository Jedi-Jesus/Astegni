"""
Test the course and school trending system
"""
import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_tracking():
    """Test tracking course and school views"""
    print("=" * 60)
    print("TEST: Track Course and School Views")
    print("=" * 60)

    # Track some courses and schools
    track_data = {
        "course_ids": [1, 2, 3, 1, 1],  # Course 1 gets 3 views
        "school_ids": [7, 8, 9, 7]  # School 7 gets 2 views
    }

    track_response = requests.post(
        f"{API_BASE_URL}/api/courses-schools/track-views",
        json=track_data
    )

    print(f"\nTracking Response ({track_response.status_code}):")
    print(json.dumps(track_response.json(), indent=2))

def test_trending_courses():
    """Test getting trending courses"""
    print("\n" + "=" * 60)
    print("TEST: Get Trending Courses")
    print("=" * 60)

    response = requests.get(f"{API_BASE_URL}/api/courses/trending?limit=10&min_searches=1")

    print(f"\nTrending Courses ({response.status_code}):")
    if response.status_code == 200:
        data = response.json()
        print(f"Total trending courses: {data.get('total')}")
        print("\nTop Trending Courses:")
        for course in data.get('trending_courses', [])[:10]:
            print(f"  - {course.get('course_name')}: "
                  f"{course.get('search_count')} searches, "
                  f"score={course.get('trending_score'):.2f}, "
                  f"rating={course.get('rating'):.1f}")
    else:
        print(response.text)

def test_trending_schools():
    """Test getting trending schools"""
    print("\n" + "=" * 60)
    print("TEST: Get Trending Schools")
    print("=" * 60)

    response = requests.get(f"{API_BASE_URL}/api/schools/trending?limit=10&min_searches=1")

    print(f"\nTrending Schools ({response.status_code}):")
    if response.status_code == 200:
        data = response.json()
        print(f"Total trending schools: {data.get('total')}")
        print("\nTop Trending Schools:")
        for school in data.get('trending_schools', [])[:10]:
            print(f"  - {school.get('name')}: "
                  f"{school.get('search_count')} searches, "
                  f"score={school.get('trending_score'):.2f}, "
                  f"students={school.get('student_count')}")
    else:
        print(response.text)

def test_stats():
    """Test getting search statistics"""
    print("\n" + "=" * 60)
    print("TEST: Get Search Statistics")
    print("=" * 60)

    response = requests.get(f"{API_BASE_URL}/api/courses-schools/search-stats")

    print(f"\nSearch Statistics ({response.status_code}):")
    if response.status_code == 200:
        data = response.json()

        # Course stats
        course_stats = data.get('courses', {})
        print(f"\n📚 COURSES:")
        print(f"  Total courses: {course_stats.get('total_courses')}")
        print(f"  Total searches: {course_stats.get('total_searches')}")
        print(f"  Average searches: {course_stats.get('average_searches'):.2f}")
        print(f"\n  Top 5 Most Searched:")
        for i, course in enumerate(course_stats.get('top_10', [])[:5], 1):
            print(f"    {i}. {course.get('name')}: {course.get('search_count')} searches")

        # School stats
        school_stats = data.get('schools', {})
        print(f"\n🏫 SCHOOLS:")
        print(f"  Total schools: {school_stats.get('total_schools')}")
        print(f"  Total searches: {school_stats.get('total_searches')}")
        print(f"  Average searches: {school_stats.get('average_searches'):.2f}")
        print(f"\n  Top 5 Most Searched:")
        for i, school in enumerate(school_stats.get('top_10', [])[:5], 1):
            print(f"    {i}. {school.get('name')}: {school.get('search_count')} searches")
    else:
        print(response.text)

if __name__ == "__main__":
    print("\n🧪 Testing Course & School Trending System\n")

    try:
        test_tracking()
        test_trending_courses()
        test_trending_schools()
        test_stats()

        print("\n" + "=" * 60)
        print("✅ All tests completed!")
        print("=" * 60 + "\n")

    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Could not connect to backend at", API_BASE_URL)
        print("Make sure the backend is running: python app.py\n")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}\n")
