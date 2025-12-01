"""
Test reviews display for different tutor scenarios
"""
import requests

API_BASE_URL = "http://localhost:8000"

def test_tutor_reviews(tutor_id):
    """Test a specific tutor's reviews"""
    print(f"\n{'='*60}")
    print(f"TESTING TUTOR #{tutor_id}")
    print(f"{'='*60}")

    # Get reviews
    response = requests.get(f"{API_BASE_URL}/api/view-tutor/{tutor_id}/reviews?limit=20")

    if response.status_code != 200:
        print(f"ERROR: API returned {response.status_code}")
        return

    data = response.json()
    all_reviews = data.get('reviews', [])
    total = data.get('total', 0)

    print(f"\nTotal reviews: {total}")

    if total == 0:
        print("  - No reviews for this tutor")
        return

    # Count by type
    featured_reviews = [r for r in all_reviews if r.get('is_featured')]
    high_rated_reviews = [r for r in all_reviews if r.get('rating', 0) >= 4]

    print(f"Featured reviews: {len(featured_reviews)}")
    print(f"High-rated reviews (>=4 stars): {len(high_rated_reviews)}")

    # What will be displayed
    print(f"\n--- WHAT WILL BE DISPLAYED ---")

    # Success Stories Section (with fallback logic)
    if featured_reviews:
        display_reviews = featured_reviews[:4]
        print(f"SUCCESS - Success Stories Section: {len(display_reviews)} featured reviews")
        for i, r in enumerate(display_reviews, 1):
            print(f"    {i}. {r.get('title')} - {r.get('rating')} stars (Featured)")
    elif high_rated_reviews:
        display_reviews = high_rated_reviews[:4]
        print(f"SUCCESS - Success Stories Section: {len(display_reviews)} high-rated reviews (FALLBACK)")
        for i, r in enumerate(display_reviews, 1):
            print(f"    {i}. {r.get('title')} - {r.get('rating')} stars (High-rated)")
    else:
        print(f"EMPTY - Success Stories Section: 'No reviews yet'")

    # Success Widget (sidebar)
    widget_reviews = high_rated_reviews[:6]
    if widget_reviews:
        print(f"\nSUCCESS - Success Widget (Sidebar): {len(widget_reviews)} high-rated reviews")
        for i, r in enumerate(widget_reviews[:3], 1):
            print(f"    {i}. {r.get('title')} - {r.get('rating')} stars")
    else:
        print(f"\nEMPTY - Success Widget (Sidebar): 'No reviews yet'")

    # Reviews Panel
    print(f"\nSUCCESS - Reviews Panel: All {min(total, 10)} reviews (first 10)")

    # Rating distribution
    ratings_dist = {}
    for r in all_reviews:
        rating = int(r.get('rating', 0))
        ratings_dist[rating] = ratings_dist.get(rating, 0) + 1

    print(f"\n--- RATING DISTRIBUTION ---")
    for rating in sorted(ratings_dist.keys(), reverse=True):
        print(f"  {rating} stars: {ratings_dist[rating]} reviews")


def run_tests():
    print("="*60)
    print("TUTOR REVIEWS DISPLAY TEST")
    print("="*60)

    # Test scenarios
    test_cases = [
        82,  # Has 3 featured reviews (best case)
        73,  # Has high-rated but NO featured (fallback case)
        83,  # Has 7 high-rated but NO featured (fallback case)
        1,   # Might have no reviews (edge case)
    ]

    for tutor_id in test_cases:
        try:
            test_tutor_reviews(tutor_id)
        except requests.exceptions.ConnectionError:
            print(f"\nERROR: Cannot connect to API at {API_BASE_URL}")
            print("Make sure backend is running: cd astegni-backend && python app.py")
            break
        except Exception as e:
            print(f"\nERROR testing tutor {tutor_id}: {e}")

    print(f"\n{'='*60}")
    print("TESTS COMPLETED")
    print(f"{'='*60}")


if __name__ == "__main__":
    run_tests()
