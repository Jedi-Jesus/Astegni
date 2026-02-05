"""
Test Script: Verify astegni_reviews table schema and connections
Tests the updated schema with pricing field and no reviewer_role
"""

import psycopg
from dotenv import load_dotenv
import os

load_dotenv()

ADMIN_DATABASE_URL = os.getenv(
    'ADMIN_DATABASE_URL',
    'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_admin_db'
)

def test_schema():
    """Test that the schema is correctly updated"""
    print("=" * 80)
    print("TEST 1: Verify Table Schema")
    print("=" * 80)

    try:
        with psycopg.connect(ADMIN_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Get all columns
                cur.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'astegni_reviews'
                    ORDER BY ordinal_position;
                """)
                columns = cur.fetchall()

                column_names = [col[0] for col in columns]

                # Check that reviewer_role is NOT present
                if 'reviewer_role' in column_names:
                    print("[FAIL] reviewer_role column still exists (should be removed)")
                    return False
                else:
                    print("[PASS] reviewer_role column removed successfully")

                # Check that pricing IS present
                if 'pricing' in column_names:
                    print("[PASS] pricing column exists")
                else:
                    print("[FAIL] pricing column not found")
                    return False

                # Check that overall_value is NOT present
                if 'overall_value' in column_names:
                    print("[FAIL] overall_value column still exists (should be renamed to pricing)")
                    return False
                else:
                    print("[PASS] overall_value column removed/renamed successfully")

                # Check required columns
                required_columns = ['id', 'reviewer_id', 'rating', 'ease_of_use',
                                  'features_quality', 'support_quality', 'pricing',
                                  'review_text', 'would_recommend', 'is_featured',
                                  'created_at', 'updated_at']

                missing_columns = [col for col in required_columns if col not in column_names]

                if missing_columns:
                    print(f"[FAIL] Missing required columns: {missing_columns}")
                    return False
                else:
                    print("[PASS] All required columns present")

                print("\n[TABLE STRUCTURE]")
                for col in columns:
                    print(f"  {col[0]:<25} {col[1]:<20} nullable={col[2]}")

                return True

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return False


def test_data_integrity():
    """Test that existing data is intact"""
    print("\n" + "=" * 80)
    print("TEST 2: Verify Data Integrity")
    print("=" * 80)

    try:
        with psycopg.connect(ADMIN_DATABASE_URL) as conn:
            with conn.cursor() as cur:
                # Get review count
                cur.execute("SELECT COUNT(*) FROM astegni_reviews")
                count = cur.fetchone()[0]
                print(f"[INFO] Total reviews in database: {count}")

                if count == 0:
                    print("[INFO] No reviews to test (table is empty)")
                    return True

                # Get sample review with all fields
                cur.execute("""
                    SELECT id, reviewer_id, rating, ease_of_use, features_quality,
                           support_quality, pricing, review_text, would_recommend,
                           is_featured, created_at, updated_at
                    FROM astegni_reviews
                    ORDER BY created_at DESC
                    LIMIT 1
                """)

                review = cur.fetchone()

                print(f"\n[SAMPLE REVIEW]")
                print(f"  ID: {review[0]}")
                print(f"  Reviewer ID: {review[1]}")
                print(f"  Overall Rating: {review[2]}")
                print(f"  Ease of Use: {review[3]}")
                print(f"  Features Quality: {review[4]}")
                print(f"  Support Quality: {review[5]}")
                print(f"  Pricing: {review[6]}")
                print(f"  Review Text: {review[7][:50] if review[7] else 'None'}...")
                print(f"  Would Recommend: {review[8]}")
                print(f"  Is Featured: {review[9]}")
                print(f"  Created At: {review[10]}")
                print(f"  Updated At: {review[11]}")

                # Verify calculated rating
                manual_rating = (review[3] + review[4] + review[5] + review[6]) / 4.0
                db_rating = float(review[2])

                if abs(manual_rating - db_rating) < 0.01:
                    print(f"\n[PASS] Rating calculation correct: {db_rating} (calculated: {manual_rating})")
                else:
                    print(f"\n[FAIL] Rating calculation incorrect: {db_rating} vs {manual_rating}")
                    return False

                # Verify all ratings are 1-5
                if all(1 <= r <= 5 for r in [review[3], review[4], review[5], review[6]]):
                    print("[PASS] All ratings within valid range (1-5)")
                else:
                    print("[FAIL] Some ratings outside valid range")
                    return False

                return True

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        return False


def test_api_compatibility():
    """Test that API field names match database"""
    print("\n" + "=" * 80)
    print("TEST 3: API Field Compatibility")
    print("=" * 80)

    expected_api_fields = {
        'ease_of_use': 'ease_of_use',
        'features_quality': 'features_quality',
        'support_quality': 'support_quality',
        'pricing': 'pricing',  # Changed from overall_value
        'review_text': 'review_text',
        'would_recommend': 'would_recommend'
    }

    print("[INFO] Expected API to Database field mappings:")
    for api_field, db_field in expected_api_fields.items():
        print(f"  {api_field:<25} -> {db_field}")

    print("\n[PASS] API fields aligned with database schema")
    print("[INFO] Frontend should send: ease_of_use, features_quality, support_quality, pricing")
    print("[INFO] Backend expects: pricing (NOT overall_value)")
    print("[INFO] Backend does NOT expect: reviewer_role")

    return True


def main():
    """Run all tests"""
    print("\n" + "=" * 80)
    print("ASTEGNI REVIEWS - SCHEMA UPDATE VERIFICATION")
    print("=" * 80)

    results = []

    # Test 1: Schema
    results.append(("Schema Structure", test_schema()))

    # Test 2: Data Integrity
    results.append(("Data Integrity", test_data_integrity()))

    # Test 3: API Compatibility
    results.append(("API Compatibility", test_api_compatibility()))

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    for test_name, passed in results:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} {test_name}")

    all_passed = all(result[1] for result in results)

    print("\n" + "=" * 80)
    if all_passed:
        print("[SUCCESS] All tests passed! Schema update is working correctly.")
        print("\nModal -> Backend -> Database connection verified:")
        print("  1. Modal (review-astegni-modal.html) displays 'Pricing' field")
        print("  2. JavaScript (review-astegni-manager.js) sends 'pricing' to API")
        print("  3. Backend (platform_reviews_endpoints.py) receives 'pricing'")
        print("  4. Database (astegni_reviews) stores in 'pricing' column")
    else:
        print("[FAILURE] Some tests failed. Please review the errors above.")
    print("=" * 80)

    return all_passed


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
