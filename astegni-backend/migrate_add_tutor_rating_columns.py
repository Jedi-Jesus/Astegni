"""
Migration: Add rating columns back to tutor_profiles table

These columns were removed but the codebase extensively depends on them.
This migration adds them back and populates them from tutor_reviews.
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        # Begin transaction
        trans = conn.begin()

        try:
            print("=" * 60)
            print("MIGRATION: Add rating columns to tutor_profiles")
            print("=" * 60)

            # 1. Add rating column (overall average rating)
            print("\n1. Adding rating column...")
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS rating FLOAT DEFAULT 0.0
            """))
            print("   ✅ rating column added")

            # 2. Add rating_count column (number of reviews)
            print("\n2. Adding rating_count column...")
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0
            """))
            print("   ✅ rating_count column added")

            # 3. Add rating_breakdown column (JSON with 4-factor breakdown)
            print("\n3. Adding rating_breakdown column...")
            conn.execute(text("""
                ALTER TABLE tutor_profiles
                ADD COLUMN IF NOT EXISTS rating_breakdown JSON DEFAULT '{}'::json
            """))
            print("   ✅ rating_breakdown column added")

            # 4. Calculate and populate ratings from tutor_reviews
            print("\n4. Calculating ratings from tutor_reviews...")
            conn.execute(text("""
                UPDATE tutor_profiles AS tp
                SET
                    rating = COALESCE(r.avg_rating, 0.0),
                    rating_count = COALESCE(r.review_count, 0),
                    rating_breakdown = COALESCE(
                        jsonb_build_object(
                            'subject_understanding', ROUND(CAST(r.avg_subject AS NUMERIC), 1),
                            'communication', ROUND(CAST(r.avg_communication AS NUMERIC), 1),
                            'discipline', ROUND(CAST(r.avg_discipline AS NUMERIC), 1),
                            'punctuality', ROUND(CAST(r.avg_punctuality AS NUMERIC), 1)
                        )::json,
                        '{}'::json
                    )
                FROM (
                    SELECT
                        tutor_id,
                        ROUND(CAST(AVG(rating) AS NUMERIC), 1) as avg_rating,
                        COUNT(*) as review_count,
                        AVG(subject_understanding_rating) as avg_subject,
                        AVG(communication_rating) as avg_communication,
                        AVG(discipline_rating) as avg_discipline,
                        AVG(punctuality_rating) as avg_punctuality
                    FROM tutor_reviews
                    GROUP BY tutor_id
                ) AS r
                WHERE tp.id = r.tutor_id
            """))
            print("   ✅ Ratings calculated and populated from reviews")

            # 5. Show sample data
            print("\n5. Sample tutor ratings:")
            result = conn.execute(text("""
                SELECT
                    tp.id,
                    u.first_name,
                    u.father_name,
                    tp.rating,
                    tp.rating_count,
                    tp.rating_breakdown
                FROM tutor_profiles tp
                JOIN users u ON tp.user_id = u.id
                WHERE tp.rating_count > 0
                ORDER BY tp.rating DESC
                LIMIT 5
            """))

            for row in result:
                print(f"   Tutor #{row[0]}: {row[1]} {row[2]} - ★{row[3]} ({row[4]} reviews)")
                if row[5]:
                    breakdown = row[5]
                    print(f"      Subject: {breakdown.get('subject_understanding', 0)}, "
                          f"Comm: {breakdown.get('communication', 0)}, "
                          f"Discipline: {breakdown.get('discipline', 0)}, "
                          f"Punctuality: {breakdown.get('punctuality', 0)}")

            # Commit transaction
            trans.commit()

            print("\n" + "=" * 60)
            print("✅ MIGRATION COMPLETED SUCCESSFULLY")
            print("=" * 60)
            print("\nRating columns added to tutor_profiles:")
            print("  - rating (FLOAT): Overall average rating from reviews")
            print("  - rating_count (INTEGER): Total number of reviews")
            print("  - rating_breakdown (JSON): 4-factor rating breakdown")
            print("\nNext steps:")
            print("  1. Restart the backend server: Ctrl+C then 'python app.py'")
            print("  2. Test tutor-profile.html in the browser")

        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            trans.rollback()
            raise

if __name__ == "__main__":
    migrate()
