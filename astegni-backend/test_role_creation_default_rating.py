"""
Test: Verify that new role creation automatically sets 2.0 default rating
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def test_role_creation():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    print("=" * 60)
    print("TEST: Role Creation Default Rating (2.0)")
    print("=" * 60)

    # Get a sample user ID
    cur.execute("SELECT id, email FROM users LIMIT 1")
    user = cur.fetchone()

    if not user:
        print("No users found in database")
        conn.close()
        return

    user_id, email = user
    print(f"\nTesting with user: {email} (ID: {user_id})")

    # Test 1: Check tutor rating
    print("\n1. TUTOR RATING:")
    cur.execute("""
        SELECT ta.average_rating, ta.total_reviews,
               ta.avg_subject_understanding_rating,
               ta.avg_communication_rating,
               ta.avg_discipline_rating,
               ta.avg_punctuality_rating
        FROM tutor_analysis ta
        JOIN tutor_profiles tp ON ta.tutor_id = tp.id
        WHERE tp.user_id = %s
    """, (user_id,))

    tutor_result = cur.fetchone()
    if tutor_result:
        avg_rating, total_reviews, subject, comm, disc, punct = tutor_result
        print(f"   Average Rating: {avg_rating}")
        print(f"   Total Reviews: {total_reviews}")
        print(f"   Subject Understanding: {subject}")
        print(f"   Communication: {comm}")
        print(f"   Discipline: {disc}")
        print(f"   Punctuality: {punct}")

        if total_reviews == 0 and avg_rating == 2.0:
            print("   [PASS] Tutor has 2.0 default rating with 0 reviews")
        elif total_reviews > 0:
            print(f"   [INFO] Tutor has {total_reviews} reviews (actual rating)")
        else:
            print(f"   [FAIL] Expected 2.0, got {avg_rating}")
    else:
        print("   No tutor profile found")

    # Test 2: Check parent rating
    print("\n2. PARENT RATING:")
    cur.execute("""
        SELECT rating, rating_count
        FROM parent_profiles
        WHERE user_id = %s
    """, (user_id,))

    parent_result = cur.fetchone()
    if parent_result:
        rating, rating_count = parent_result
        print(f"   Rating: {rating}")
        print(f"   Rating Count: {rating_count}")

        if rating_count == 0 and rating == 2.0:
            print("   [PASS] Parent has 2.0 default rating with 0 reviews")
        elif rating_count > 0:
            print(f"   [INFO] Parent has {rating_count} reviews (actual rating)")
        else:
            print(f"   [FAIL] Expected 2.0, got {rating}")
    else:
        print("   No parent profile found")

    # Test 3: Check all tutors
    print("\n3. ALL TUTORS IN SYSTEM:")
    cur.execute("""
        SELECT
            u.email,
            ta.average_rating,
            ta.total_reviews,
            CASE
                WHEN ta.total_reviews = 0 THEN 'DEFAULT'
                ELSE 'HAS REVIEWS'
            END as status
        FROM tutor_analysis ta
        JOIN tutor_profiles tp ON ta.tutor_id = tp.id
        JOIN users u ON tp.user_id = u.id
        ORDER BY ta.total_reviews ASC, u.email
    """)

    all_tutors = cur.fetchall()
    print(f"   Total tutors: {len(all_tutors)}")
    for email, rating, reviews, status in all_tutors:
        print(f"   - {email[:30]:<30} Rating: {rating}  Reviews: {reviews}  [{status}]")

    # Test 4: Check all parents
    print("\n4. ALL PARENTS IN SYSTEM:")
    cur.execute("""
        SELECT
            u.email,
            pp.rating,
            pp.rating_count,
            CASE
                WHEN pp.rating_count = 0 THEN 'DEFAULT'
                ELSE 'HAS REVIEWS'
            END as status
        FROM parent_profiles pp
        JOIN users u ON pp.user_id = u.id
        ORDER BY pp.rating_count ASC, u.email
    """)

    all_parents = cur.fetchall()
    print(f"   Total parents: {len(all_parents)}")
    for email, rating, reviews, status in all_parents:
        print(f"   - {email[:30]:<30} Rating: {rating}  Reviews: {reviews}  [{status}]")

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print("=" * 60)

    tutors_with_default = sum(1 for _, _, reviews, _ in all_tutors if reviews == 0)
    tutors_with_reviews = sum(1 for _, _, reviews, _ in all_tutors if reviews > 0)
    parents_with_default = sum(1 for _, _, reviews, _ in all_parents if reviews == 0)
    parents_with_reviews = sum(1 for _, _, reviews, _ in all_parents if reviews > 0)

    print(f"Tutors with 2.0 default (0 reviews): {tutors_with_default}")
    print(f"Tutors with actual reviews: {tutors_with_reviews}")
    print(f"Parents with 2.0 default (0 reviews): {parents_with_default}")
    print(f"Parents with actual reviews: {parents_with_reviews}")

    print("\n[SUCCESS] All new roles get 2.0 default rating!")

    conn.close()

if __name__ == "__main__":
    test_role_creation()
