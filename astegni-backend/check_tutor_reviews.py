"""
Quick script to check if tutor_reviews table has data
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def check_reviews():
    conn = psycopg.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # Check total reviews
            cur.execute("SELECT COUNT(*) FROM tutor_reviews")
            total = cur.fetchone()[0]
            print(f"Total reviews in database: {total}")

            # Check reviews by tutor
            cur.execute("""
                SELECT tutor_id, COUNT(*) as review_count
                FROM tutor_reviews
                GROUP BY tutor_id
                ORDER BY review_count DESC
                LIMIT 10
            """)
            print("\nTop 10 tutors by review count:")
            for row in cur.fetchall():
                print(f"   Tutor ID {row[0]}: {row[1]} reviews")

            # Check featured reviews
            cur.execute("SELECT COUNT(*) FROM tutor_reviews WHERE is_featured = TRUE")
            featured = cur.fetchone()[0]
            print(f"\nFeatured reviews: {featured}")

            # Check high-rated reviews
            cur.execute("SELECT COUNT(*) FROM tutor_reviews WHERE rating >= 4")
            high_rated = cur.fetchone()[0]
            print(f"High-rated reviews (>=4 stars): {high_rated}")

            # Sample review
            cur.execute("""
                SELECT tr.id, tr.tutor_id, tr.rating, tr.title, tr.is_featured,
                       u.first_name, u.father_name
                FROM tutor_reviews tr
                JOIN users u ON tr.student_id = u.id
                LIMIT 1
            """)
            sample = cur.fetchone()
            if sample:
                print(f"\nSample review:")
                print(f"   ID: {sample[0]}, Tutor ID: {sample[1]}, Rating: {sample[2]} stars")
                print(f"   Title: {sample[3]}")
                print(f"   Featured: {sample[4]}")
                print(f"   Reviewer: {sample[5]} {sample[6]}")

    finally:
        conn.close()

if __name__ == "__main__":
    check_reviews()
