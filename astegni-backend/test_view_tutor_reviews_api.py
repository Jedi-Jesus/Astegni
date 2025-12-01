"""
Test the view-tutor reviews API endpoint
"""
import requests

API_BASE_URL = "http://localhost:8000"

def test_reviews_endpoint():
    # Get a tutor with reviews
    tutor_id = 73  # From our check, this tutor has 7 reviews

    print(f"\n=== Testing /api/view-tutor/{tutor_id}/reviews ===")

    # Test regular reviews endpoint
    response = requests.get(f"{API_BASE_URL}/api/view-tutor/{tutor_id}/reviews?limit=10")

    if response.status_code == 200:
        data = response.json()
        print(f"Status: SUCCESS (200)")
        print(f"Reviews returned: {len(data.get('reviews', []))}")
        print(f"Total count: {data.get('total', 0)}")

        if data.get('reviews'):
            review = data['reviews'][0]
            print(f"\nSample review:")
            print(f"  Rating: {review.get('rating')} stars")
            print(f"  Title: {review.get('title')}")
            print(f"  Text: {review.get('review_text')[:100]}...")
            print(f"  Reviewer: {review.get('reviewer_name')}")
            print(f"  Featured: {review.get('is_featured')}")
    else:
        print(f"Status: FAILED ({response.status_code})")
        print(f"Error: {response.text}")

    # Test featured reviews
    print(f"\n=== Testing featured_only parameter ===")
    response = requests.get(f"{API_BASE_URL}/api/view-tutor/{tutor_id}/reviews?featured_only=true")

    if response.status_code == 200:
        data = response.json()
        featured_count = len(data.get('reviews', []))
        print(f"Featured reviews for tutor {tutor_id}: {featured_count}")

        if data.get('reviews'):
            for i, review in enumerate(data['reviews'][:3], 1):
                print(f"  {i}. {review.get('title')} - {review.get('rating')} stars (Featured: {review.get('is_featured')})")

if __name__ == "__main__":
    print("Make sure backend server is running on http://localhost:8000")
    print("Starting API tests...")

    try:
        test_reviews_endpoint()
        print("\nAPI tests completed!")
    except requests.exceptions.ConnectionError:
        print("\nERROR: Could not connect to backend. Make sure it's running:")
        print("  cd astegni-backend && python app.py")
