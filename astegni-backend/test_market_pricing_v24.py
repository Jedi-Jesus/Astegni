"""
Test Market Pricing Algorithm v2.4 - Grade Level & Location Integration
Tests the enhanced 9-factor similarity algorithm with location and grade level factors
"""

import requests
import json
from pprint import pprint

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_TOKEN = "your_jwt_token_here"  # Replace with actual token

def test_suggest_price():
    """
    Test the /api/market-pricing/suggest-price endpoint with v2.4 algorithm
    """
    print("\n" + "="*80)
    print("TEST 1: Market Price Suggestion (v2.4 Algorithm)")
    print("="*80)

    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "time_period_months": 3,
        "course_ids": [1, 2, 3],
        "grade_level": ["Grade 9", "Grade 10", "Grade 11"],
        "session_format": "Online"
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/market-pricing/suggest-price",
            headers=headers,
            json=payload
        )

        if response.status_code == 200:
            data = response.json()

            print(f"\n✅ SUCCESS - Status: {response.status_code}")
            print(f"\n📊 PRICE SUGGESTION:")
            print(f"   Suggested Price: {data['suggested_price']} ETB/hr")
            print(f"   Market Average: {data['market_average']} ETB/hr")
            print(f"   Confidence: {data['confidence_level']}")
            print(f"   Similar Tutors: {data['similar_tutors_count']} / {data['tutor_count']} total")

            factors = data['factors']
            print(f"\n👤 YOUR PROFILE (v2.4):")
            print(f"   Name: {factors.get('first_name', 'N/A')}")
            print(f"   Rating: {factors['tutor_rating']}⭐")
            print(f"   Completion Rate: {factors['completion_rate']*100:.1f}%")
            print(f"   Students: {factors['student_count']}")
            print(f"   📍 Location: {factors.get('location', 'Not set')}")
            print(f"   🌍 Country: {factors.get('country', 'Not set')}")
            print(f"   📚 Grade Levels: {factors.get('grade_levels', [])}")
            print(f"   📈 Grade Complexity: {factors.get('grade_complexity', 'N/A')}/14")
            print(f"   Experience: {factors['experience_years']} years")
            print(f"   Credentials: {factors['credentials_count']}")

            print(f"\n⚖️ ALGORITHM WEIGHTS (v2.4 - 9 Factors):")
            weights = factors['weights']
            for factor, weight in weights.items():
                emoji = {
                    'rating': '⭐', 'completion_rate': '✅', 'location': '📍',
                    'student_count': '👥', 'session_format': '💻', 'grade_level': '📚',
                    'experience': '📅', 'credentials': '🎓', 'account_age': '🕐'
                }.get(factor, '•')
                print(f"   {emoji} {factor.replace('_', ' ').title()}: {weight}")

            print(f"\n📈 PRICE RANGE:")
            price_range = data['price_range']
            print(f"   Market Min: {price_range['min']} ETB")
            print(f"   Market Max: {price_range['max']} ETB")
            print(f"   Suggested Range: {price_range['suggested_min']:.0f} - {price_range['suggested_max']:.0f} ETB")

            print(f"\n🔍 ALGORITHM INFO:")
            print(f"   Version: {factors['algorithm_version']}")
            print(f"   Time Period: {data['time_period_months']} months")

        else:
            print(f"\n❌ ERROR - Status: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")


def test_market_tutors():
    """
    Test the /api/market-pricing/market-tutors endpoint with v2.4 algorithm
    """
    print("\n" + "="*80)
    print("TEST 2: Market Tutors Data (v2.4 Algorithm)")
    print("="*80)

    headers = {
        "Authorization": f"Bearer {TEST_TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "time_period_months": 3,
        "session_format": "Online"
    }

    try:
        response = requests.post(
            f"{API_BASE_URL}/api/market-pricing/market-tutors",
            headers=headers,
            json=payload
        )

        if response.status_code == 200:
            data = response.json()

            print(f"\n✅ SUCCESS - Status: {response.status_code}")
            print(f"\n📊 MARKET DATA:")
            print(f"   Similar Tutors: {data['count']}")
            print(f"   Total Market Tutors: {data['total_market_tutors']}")
            print(f"   Algorithm Version: {data.get('algorithm_version', 'N/A')}")

            requester = data['requester_profile']
            print(f"\n👤 YOUR PROFILE:")
            print(f"   Rating: {requester['rating']}⭐")
            print(f"   Completion Rate: {requester['completion_rate']*100:.1f}%")
            print(f"   Students: {requester['student_count']}")
            print(f"   📍 Location: {requester.get('location', 'Not set')}")
            print(f"   🌍 Country: {requester.get('country', 'Not set')}")
            print(f"   📚 Grade Levels: {requester.get('grade_levels', [])}")
            print(f"   📈 Grade Complexity: {requester.get('grade_complexity', 'N/A')}/14")

            if data['count'] > 0:
                print(f"\n👥 TOP 3 SIMILAR TUTORS:")
                for i, tutor in enumerate(data['tutors'][:3], 1):
                    print(f"\n   {i}. Tutor #{tutor['id']}")
                    print(f"      Similarity: {tutor['similarity_score']*100:.1f}%")
                    print(f"      Rating: {tutor['rating']}⭐")
                    print(f"      Price: {tutor['price_per_hour']} ETB/hr")
                    print(f"      📍 Location: {tutor.get('location', 'Not set')}")
                    print(f"      🌍 Country: {tutor.get('country', 'Not set')}")
                    print(f"      📚 Grade Levels: {tutor.get('grade_levels', [])}")
                    print(f"      📈 Grade Complexity: {tutor.get('grade_complexity', 'N/A')}/14")
                    print(f"      Students: {tutor['student_count']}")

        else:
            print(f"\n❌ ERROR - Status: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"\n❌ EXCEPTION: {str(e)}")


def test_location_impact():
    """
    Test to verify location similarity is working (15% weight)
    """
    print("\n" + "="*80)
    print("TEST 3: Location Impact Verification")
    print("="*80)

    print("\n📍 TESTING LOCATION SIMILARITY (15% weight)")
    print("   If working correctly:")
    print("   ✅ Ethiopian tutors should get ~Ethiopian prices")
    print("   ✅ Kenyan tutors should get ~Kenyan prices")
    print("   ✅ Different countries should have low similarity scores")

    # This would require manual testing with actual tutor accounts
    print("\n⚠️  Manual test required - Use test accounts with different locations:")
    print("   1. Ethiopian tutor (Addis Ababa, Ethiopia)")
    print("   2. Kenyan tutor (Nairobi, Kenya)")
    print("   3. Mexican tutor (Mexico City, Mexico)")
    print("   Compare suggested prices - should reflect local markets!")


def test_grade_level_impact():
    """
    Test to verify grade level similarity is working (10% weight)
    """
    print("\n" + "="*80)
    print("TEST 4: Grade Level Impact Verification")
    print("="*80)

    print("\n📚 TESTING GRADE LEVEL SIMILARITY (10% weight)")
    print("   If working correctly:")
    print("   ✅ Elementary tutors (Grades 1-3) should get ~lower prices")
    print("   ✅ High school tutors (Grades 10-12) should get ~medium prices")
    print("   ✅ University tutors should get ~higher prices")
    print("   ✅ Different grade levels should have lower similarity scores")

    grade_complexity_map = {
        "Elementary (Grades 1-3)": 2.0,
        "Middle School (Grades 7-9)": 8.0,
        "High School (Grades 10-12)": 11.0,
        "University": 13.0,
        "Certification": 14.0
    }

    print("\n📈 GRADE COMPLEXITY SCALE:")
    for level, complexity in grade_complexity_map.items():
        print(f"   {level}: {complexity}/14")


def run_all_tests():
    """
    Run all test cases
    """
    print("\n" + "🧪"*40)
    print("   MARKET PRICING ALGORITHM v2.4 TEST SUITE")
    print("   Grade Level & Location Integration")
    print("🧪"*40)

    print("\n⚠️  IMPORTANT: Update TEST_TOKEN with your actual JWT token!")
    print("   Get token by logging in via /api/login endpoint")

    if TEST_TOKEN == "your_jwt_token_here":
        print("\n❌ ERROR: TEST_TOKEN not set!")
        print("   1. Login to get JWT token:")
        print("      POST http://localhost:8000/api/login")
        print('      {"email": "your@email.com", "password": "yourpassword"}')
        print("   2. Copy access_token from response")
        print("   3. Update TEST_TOKEN in this script")
        print("   4. Run again: python test_market_pricing_v24.py")
        return

    # Run tests
    test_suggest_price()
    test_market_tutors()
    test_location_impact()
    test_grade_level_impact()

    print("\n" + "="*80)
    print("✅ TEST SUITE COMPLETE")
    print("="*80)
    print("\nNEXT STEPS:")
    print("1. Verify algorithm version shows: 2.4_grade_location")
    print("2. Check that location and grade_levels are included in factors")
    print("3. Verify weights sum to 100% (9 factors)")
    print("4. Test with tutors in different countries")
    print("5. Test with tutors teaching different grade levels")
    print("6. Compare prices - should reflect local markets!")


if __name__ == "__main__":
    run_all_tests()
