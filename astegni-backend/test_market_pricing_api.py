"""
Test script for Market Pricing API
Tests the new real market data pricing suggestion system
"""

import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
API_BASE_URL = "http://localhost:8000"
TEST_EMAIL = "jediael.s.abebe@gmail.com"
TEST_PASSWORD = "@JesusJediael1234"

def test_login():
    """Test login and get auth token"""
    print("\n1. Testing login...")

    response = requests.post(
        f"{API_BASE_URL}/api/login",
        data={
            "username": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
    )

    if response.status_code == 200:
        data = response.json()
        token = data.get('access_token')
        print(f"   Login successful! Token: {token[:20]}...")
        return token
    else:
        print(f"   Login failed: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def test_market_price_suggestion(token):
    """Test market price suggestion endpoint"""
    print("\n2. Testing market price suggestion...")

    # Test with different scenarios
    test_cases = [
        {
            "name": "3-month analysis (no filters)",
            "data": {
                "time_period_months": 3
            }
        },
        {
            "name": "6-month analysis (no filters)",
            "data": {
                "time_period_months": 6
            }
        },
        {
            "name": "12-month analysis (no filters)",
            "data": {
                "time_period_months": 12
            }
        },
        {
            "name": "With grade level filter",
            "data": {
                "time_period_months": 3,
                "grade_level": "High School"
            }
        },
        {
            "name": "With session format filter",
            "data": {
                "time_period_months": 3,
                "session_format": "Online"
            }
        }
    ]

    for test_case in test_cases:
        print(f"\n   Testing: {test_case['name']}")

        response = requests.post(
            f"{API_BASE_URL}/api/market-pricing/suggest-price",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json=test_case['data']
        )

        if response.status_code == 200:
            data = response.json()
            print(f"   SUCCESS!")
            print(f"   - Suggested Price: {data['suggested_price']:.2f} ETB")
            print(f"   - Market Average: {data['market_average']:.2f} ETB")
            print(f"   - Price Range: {data['price_range']['min']:.0f} - {data['price_range']['max']:.0f} ETB")
            print(f"   - Tutors Analyzed: {data['tutor_count']}")
            print(f"   - Similar Tutors: {data['similar_tutors_count']}")
            print(f"   - Confidence: {data['confidence_level']}")
            print(f"   - Factors:")
            print(f"     * Rating: {data['factors'].get('tutor_rating', 'N/A')}")
            print(f"     * Experience: {data['factors'].get('experience_years', 0)} years")
            print(f"     * Students: {data['factors'].get('student_count', 0)}")
            print(f"     * Certifications: {data['factors'].get('certification_count', 0)}")
        else:
            print(f"   FAILED: {response.status_code}")
            print(f"   Response: {response.text}")

def test_log_suggestion(token):
    """Test logging price suggestion"""
    print("\n3. Testing suggestion logging...")

    response = requests.post(
        f"{API_BASE_URL}/api/market-pricing/log-suggestion",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "tutor_id": 1,
            "suggested_price": 250.0,
            "market_average": 230.0,
            "tutor_rating": 4.5,
            "tutor_experience_years": 5,
            "tutor_student_count": 20,
            "time_period_months": 3,
            "filters_applied": {"grade_level": "High School"}
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"   Suggestion logged successfully!")
        print(f"   - Suggestion ID: {data['suggestion_id']}")
        return data['suggestion_id']
    else:
        print(f"   Failed to log suggestion: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def test_log_acceptance(token, suggestion_id):
    """Test logging price acceptance"""
    print("\n4. Testing acceptance logging...")

    response = requests.post(
        f"{API_BASE_URL}/api/market-pricing/log-acceptance/{suggestion_id}?accepted_price=250.0",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"   Acceptance logged successfully!")
        print(f"   - Message: {data['message']}")
    else:
        print(f"   Failed to log acceptance: {response.status_code}")
        print(f"   Response: {response.text}")

def test_analytics_summary(token):
    """Test getting analytics summary"""
    print("\n5. Testing analytics summary...")

    response = requests.get(
        f"{API_BASE_URL}/api/market-pricing/analytics/summary",
        headers={
            "Authorization": f"Bearer {token}"
        }
    )

    if response.status_code == 200:
        data = response.json()
        print(f"   Analytics Summary:")
        print(f"   - Total Suggestions: {data['total_suggestions']}")
        print(f"   - Accepted Count: {data['accepted_count']}")
        print(f"   - Acceptance Rate: {data['acceptance_rate']}%")
        print(f"   - Avg Suggested Price: {data['avg_suggested_price']:.2f} ETB")
        print(f"   - Avg Accepted Price: {data['avg_accepted_price']:.2f} ETB")
        print(f"   - Avg Market Price: {data['avg_market_price']:.2f} ETB")
    else:
        print(f"   Failed to get analytics: {response.status_code}")
        print(f"   Response: {response.text}")

def main():
    print("=" * 80)
    print("MARKET PRICING API TEST SUITE")
    print("=" * 80)

    # Step 1: Login
    token = test_login()
    if not token:
        print("\nERROR: Could not authenticate. Stopping tests.")
        return

    # Step 2: Test price suggestion with different scenarios
    test_market_price_suggestion(token)

    # Step 3: Test logging a suggestion
    suggestion_id = test_log_suggestion(token)

    # Step 4: Test logging acceptance (if suggestion was logged)
    if suggestion_id:
        test_log_acceptance(token, suggestion_id)

    # Step 5: Test analytics summary
    test_analytics_summary(token)

    print("\n" + "=" * 80)
    print("TEST SUITE COMPLETED")
    print("=" * 80)

if __name__ == "__main__":
    main()
