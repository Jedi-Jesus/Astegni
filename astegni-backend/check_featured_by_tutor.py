"""
Check which tutors have featured reviews
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def check_featured_distribution():
    conn = psycopg.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # Check tutors with featured reviews
            cur.execute("""
                SELECT tutor_id, COUNT(*) as featured_count
                FROM tutor_reviews
                WHERE is_featured = TRUE
                GROUP BY tutor_id
                ORDER BY featured_count DESC
            """)

            featured_tutors = cur.fetchall()
            print(f"Tutors with featured reviews: {len(featured_tutors)}")
            print("\nTop tutors by featured review count:")
            for row in featured_tutors[:10]:
                print(f"  Tutor {row[0]}: {row[1]} featured reviews")

            # Check tutors with high-rated reviews but NO featured
            cur.execute("""
                SELECT tutor_id, COUNT(*) as high_rated_count
                FROM tutor_reviews
                WHERE rating >= 4 AND is_featured = FALSE
                GROUP BY tutor_id
                HAVING COUNT(*) > 0
                ORDER BY high_rated_count DESC
                LIMIT 10
            """)

            print("\n\nTutors with high-rated reviews (>=4) but NO featured:")
            for row in cur.fetchall():
                print(f"  Tutor {row[0]}: {row[1]} high-rated reviews (but 0 featured)")

            # Total tutors with reviews
            cur.execute("SELECT COUNT(DISTINCT tutor_id) FROM tutor_reviews")
            total_tutors = cur.fetchone()[0]
            print(f"\n\nTotal tutors with reviews: {total_tutors}")
            print(f"Tutors with featured reviews: {len(featured_tutors)}")
            print(f"Tutors WITHOUT featured reviews: {total_tutors - len(featured_tutors)}")

    finally:
        conn.close()

if __name__ == "__main__":
    check_featured_distribution()
