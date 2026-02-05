"""
Migration: Set Default Rating to 2.0 for All New Users
Creates tutor_analysis records with 2.0 default rating for all tutors without reviews
Sets parent_profiles.rating to 2.0 for all parents without reviews
"""

import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("MIGRATION: Set Default Rating to 2.0 for All Users")
        print("=" * 60)

        # ============================================================
        # 1. CREATE TUTOR_ANALYSIS RECORDS WITH 2.0 DEFAULT RATING
        # ============================================================
        print("\n1. Creating tutor_analysis records for tutors without reviews...")

        # Get all tutors
        cur.execute("SELECT id FROM tutor_profiles")
        all_tutors = cur.fetchall()
        print(f"   Found {len(all_tutors)} total tutors")

        created_count = 0
        updated_count = 0

        for (tutor_id,) in all_tutors:
            # Check if tutor has any reviews
            cur.execute("""
                SELECT COUNT(*), AVG(rating),
                       AVG(subject_understanding_rating),
                       AVG(communication_rating),
                       AVG(discipline_rating),
                       AVG(punctuality_rating)
                FROM tutor_reviews
                WHERE tutor_id = %s
            """, (tutor_id,))

            review_count, avg_rating, avg_subject, avg_comm, avg_disc, avg_punct = cur.fetchone()

            # Check if tutor_analysis record exists
            cur.execute("SELECT id, average_rating FROM tutor_analysis WHERE tutor_id = %s", (tutor_id,))
            analysis = cur.fetchone()

            if review_count == 0:
                # No reviews - set default 2.0
                if analysis:
                    # Update existing record
                    cur.execute("""
                        UPDATE tutor_analysis
                        SET average_rating = 2.0,
                            total_reviews = 0,
                            avg_subject_understanding_rating = 2.0,
                            avg_communication_rating = 2.0,
                            avg_discipline_rating = 2.0,
                            avg_punctuality_rating = 2.0,
                            updated_at = %s
                        WHERE tutor_id = %s
                    """, (datetime.now(), tutor_id))
                    updated_count += 1
                else:
                    # Create new record with 2.0 default
                    cur.execute("""
                        INSERT INTO tutor_analysis (
                            tutor_id, average_rating, total_reviews,
                            avg_subject_understanding_rating,
                            avg_communication_rating,
                            avg_discipline_rating,
                            avg_punctuality_rating,
                            total_students, current_students, alumni_students,
                            success_rate, total_sessions_completed,
                            created_at, updated_at
                        ) VALUES (
                            %s, 2.0, 0, 2.0, 2.0, 2.0, 2.0, 0, 0, 0, 0.0, 0, %s, %s
                        )
                    """, (tutor_id, datetime.now(), datetime.now()))
                    created_count += 1
            else:
                # Has reviews - calculate actual average
                actual_rating = float(avg_rating) if avg_rating else 2.0
                actual_subject = float(avg_subject) if avg_subject else 2.0
                actual_comm = float(avg_comm) if avg_comm else 2.0
                actual_disc = float(avg_disc) if avg_disc else 2.0
                actual_punct = float(avg_punct) if avg_punct else 2.0

                if analysis:
                    # Update with actual ratings
                    cur.execute("""
                        UPDATE tutor_analysis
                        SET average_rating = %s,
                            total_reviews = %s,
                            avg_subject_understanding_rating = %s,
                            avg_communication_rating = %s,
                            avg_discipline_rating = %s,
                            avg_punctuality_rating = %s,
                            updated_at = %s
                        WHERE tutor_id = %s
                    """, (actual_rating, review_count, actual_subject, actual_comm,
                          actual_disc, actual_punct, datetime.now(), tutor_id))
                    updated_count += 1
                else:
                    # Create with actual ratings
                    cur.execute("""
                        INSERT INTO tutor_analysis (
                            tutor_id, average_rating, total_reviews,
                            avg_subject_understanding_rating,
                            avg_communication_rating,
                            avg_discipline_rating,
                            avg_punctuality_rating,
                            total_students, current_students, alumni_students,
                            success_rate, total_sessions_completed,
                            created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s, %s, 0, 0, 0, 0.0, 0, %s, %s
                        )
                    """, (tutor_id, actual_rating, review_count, actual_subject, actual_comm,
                          actual_disc, actual_punct, datetime.now(), datetime.now()))
                    created_count += 1

        print(f"   [OK] Created {created_count} new tutor_analysis records")
        print(f"   [OK] Updated {updated_count} existing tutor_analysis records")

        # ============================================================
        # 2. SET PARENT_PROFILES RATING TO 2.0 FOR PARENTS WITHOUT REVIEWS
        # ============================================================
        print("\n2. Setting parent_profiles rating to 2.0 for parents without reviews...")

        cur.execute("""
            UPDATE parent_profiles pp
            SET rating = 2.0, rating_count = 0
            WHERE NOT EXISTS (
                SELECT 1 FROM parent_reviews pr
                WHERE pr.parent_id = pp.id
            )
            AND (rating IS NULL OR rating = 0)
        """)

        parents_updated = cur.rowcount
        print(f"   [OK] Updated {parents_updated} parent profiles to 2.0 default rating")

        # ============================================================
        # 3. UPDATE PARENT_PROFILES WITH ACTUAL RATINGS WHERE REVIEWS EXIST
        # ============================================================
        print("\n3. Updating parent_profiles with actual ratings from reviews...")

        cur.execute("""
            UPDATE parent_profiles pp
            SET rating = subquery.avg_rating,
                rating_count = subquery.review_count
            FROM (
                SELECT parent_id,
                       AVG(rating) as avg_rating,
                       COUNT(*) as review_count
                FROM parent_reviews
                GROUP BY parent_id
            ) as subquery
            WHERE pp.id = subquery.parent_id
        """)

        parents_with_reviews = cur.rowcount
        print(f"   [OK] Updated {parents_with_reviews} parent profiles with actual ratings")

        # ============================================================
        # 4. VERIFICATION
        # ============================================================
        print("\n4. Verification:")

        # Check tutor_analysis
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE average_rating = 2.0 AND total_reviews = 0) as with_default,
                COUNT(*) FILTER (WHERE average_rating != 2.0 AND total_reviews > 0) as with_reviews,
                COUNT(*) as total
            FROM tutor_analysis
        """)
        default_tutors, reviewed_tutors, total_tutors = cur.fetchone()
        print(f"   Tutor Analysis:")
        print(f"     - With default 2.0 rating: {default_tutors}")
        print(f"     - With actual reviews: {reviewed_tutors}")
        print(f"     - Total: {total_tutors}")

        # Check parent_profiles
        cur.execute("""
            SELECT
                COUNT(*) FILTER (WHERE rating = 2.0 AND rating_count = 0) as with_default,
                COUNT(*) FILTER (WHERE rating != 2.0 AND rating_count > 0) as with_reviews,
                COUNT(*) as total
            FROM parent_profiles
        """)
        default_parents, reviewed_parents, total_parents = cur.fetchone()
        print(f"   Parent Profiles:")
        print(f"     - With default 2.0 rating: {default_parents}")
        print(f"     - With actual reviews: {reviewed_parents}")
        print(f"     - Total: {total_parents}")

        # Commit the transaction
        conn.commit()

        print("\n" + "=" * 60)
        print("[SUCCESS] MIGRATION COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print("\nSummary:")
        print(f"  - Tutor analysis records created/updated: {created_count + updated_count}")
        print(f"  - Parent profiles updated: {parents_updated + parents_with_reviews}")
        print(f"\nAll users without reviews now have a default rating of 2.0")
        print(f"Users with existing reviews retain their actual ratings")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate()
