"""
Helper Script: Update Ratings from Reviews
This script recalculates all ratings from their respective review tables
Run this whenever you want to sync ratings with actual reviews
"""

import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def update_all_ratings():
    """
    Update all tutor_analysis and parent_profiles ratings based on actual reviews
    Sets 2.0 default for users without reviews
    """
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("UPDATING ALL RATINGS FROM REVIEW TABLES")
        print("=" * 60)

        # ============================================================
        # 1. UPDATE TUTOR_ANALYSIS FROM TUTOR_REVIEWS
        # ============================================================
        print("\n1. Updating tutor_analysis from tutor_reviews...")

        # Update tutors WITH reviews
        cur.execute("""
            UPDATE tutor_analysis ta
            SET
                average_rating = subquery.avg_rating,
                total_reviews = subquery.review_count,
                avg_subject_understanding_rating = subquery.avg_subject,
                avg_communication_rating = subquery.avg_comm,
                avg_discipline_rating = subquery.avg_disc,
                avg_punctuality_rating = subquery.avg_punct,
                updated_at = NOW()
            FROM (
                SELECT
                    tutor_id,
                    AVG(rating) as avg_rating,
                    COUNT(*) as review_count,
                    AVG(subject_understanding_rating) as avg_subject,
                    AVG(communication_rating) as avg_comm,
                    AVG(discipline_rating) as avg_disc,
                    AVG(punctuality_rating) as avg_punct
                FROM tutor_reviews
                GROUP BY tutor_id
            ) as subquery
            WHERE ta.tutor_id = subquery.tutor_id
        """)

        tutors_with_reviews = cur.rowcount
        print(f"   ✓ Updated {tutors_with_reviews} tutors with actual review ratings")

        # Set default 2.0 for tutors WITHOUT reviews
        cur.execute("""
            UPDATE tutor_analysis ta
            SET
                average_rating = 2.0,
                total_reviews = 0,
                avg_subject_understanding_rating = 2.0,
                avg_communication_rating = 2.0,
                avg_discipline_rating = 2.0,
                avg_punctuality_rating = 2.0,
                updated_at = NOW()
            WHERE NOT EXISTS (
                SELECT 1 FROM tutor_reviews tr WHERE tr.tutor_id = ta.tutor_id
            )
        """)

        tutors_default = cur.rowcount
        print(f"   ✓ Set default 2.0 for {tutors_default} tutors without reviews")

        # ============================================================
        # 2. UPDATE PARENT_PROFILES FROM PARENT_REVIEWS
        # ============================================================
        print("\n2. Updating parent_profiles from parent_reviews...")

        # Update parents WITH reviews
        cur.execute("""
            UPDATE parent_profiles pp
            SET
                rating = subquery.avg_rating,
                rating_count = subquery.review_count
            FROM (
                SELECT
                    parent_id,
                    AVG(rating) as avg_rating,
                    COUNT(*) as review_count
                FROM parent_reviews
                GROUP BY parent_id
            ) as subquery
            WHERE pp.id = subquery.parent_id
        """)

        parents_with_reviews = cur.rowcount
        print(f"   ✓ Updated {parents_with_reviews} parents with actual review ratings")

        # Set default 2.0 for parents WITHOUT reviews
        cur.execute("""
            UPDATE parent_profiles pp
            SET
                rating = 2.0,
                rating_count = 0
            WHERE NOT EXISTS (
                SELECT 1 FROM parent_reviews pr WHERE pr.parent_id = pp.id
            )
        """)

        parents_default = cur.rowcount
        print(f"   ✓ Set default 2.0 for {parents_default} parents without reviews")

        # ============================================================
        # 3. VERIFICATION
        # ============================================================
        print("\n3. Verification:")

        # Check tutor_analysis
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE total_reviews = 0 AND average_rating = 2.0) as no_reviews,
                COUNT(*) FILTER (WHERE total_reviews > 0) as with_reviews,
                AVG(average_rating) FILTER (WHERE total_reviews > 0) as avg_rating_with_reviews,
                COUNT(*) as total
            FROM tutor_analysis
        """)
        no_rev, with_rev, avg_rev, total = cur.fetchone()
        print(f"\n   Tutor Analysis:")
        print(f"     - Without reviews (2.0 default): {no_rev}")
        print(f"     - With reviews: {with_rev}")
        if with_rev > 0:
            print(f"     - Average rating (with reviews): {float(avg_rev):.2f}")
        print(f"     - Total: {total}")

        # Check parent_profiles
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE rating_count = 0 AND rating = 2.0) as no_reviews,
                COUNT(*) FILTER (WHERE rating_count > 0) as with_reviews,
                AVG(rating) FILTER (WHERE rating_count > 0) as avg_rating_with_reviews,
                COUNT(*) as total
            FROM parent_profiles
        """)
        no_rev, with_rev, avg_rev, total = cur.fetchone()
        print(f"\n   Parent Profiles:")
        print(f"     - Without reviews (2.0 default): {no_rev}")
        print(f"     - With reviews: {with_rev}")
        if with_rev > 0:
            print(f"     - Average rating (with reviews): {float(avg_rev):.2f}")
        print(f"     - Total: {total}")

        # Commit the transaction
        conn.commit()

        print("\n" + "=" * 60)
        print("✓ ALL RATINGS UPDATED SUCCESSFULLY")
        print("=" * 60)
        print("\nSummary:")
        print(f"  - Tutors updated from reviews: {tutors_with_reviews}")
        print(f"  - Tutors set to 2.0 default: {tutors_default}")
        print(f"  - Parents updated from reviews: {parents_with_reviews}")
        print(f"  - Parents set to 2.0 default: {parents_default}")

    except Exception as e:
        conn.rollback()
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    update_all_ratings()
