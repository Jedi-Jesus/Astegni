"""
Mark top-rated reviews as featured
"""
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def mark_featured():
    conn = psycopg.connect(DATABASE_URL)
    try:
        with conn.cursor() as cur:
            # Mark top 30 high-rated reviews as featured (about 15% of total)
            cur.execute("""
                UPDATE tutor_reviews
                SET is_featured = TRUE
                WHERE id IN (
                    SELECT id
                    FROM tutor_reviews
                    WHERE rating >= 4.5
                    ORDER BY rating DESC, helpful_count DESC, created_at DESC
                    LIMIT 30
                )
            """)

            affected = cur.rowcount
            conn.commit()
            print(f"Marked {affected} reviews as featured")

            # Verify
            cur.execute("SELECT COUNT(*) FROM tutor_reviews WHERE is_featured = TRUE")
            featured_count = cur.fetchone()[0]
            print(f"Total featured reviews: {featured_count}")

            # Show sample featured reviews
            cur.execute("""
                SELECT tr.tutor_id, tr.rating, tr.title, u.first_name, u.father_name
                FROM tutor_reviews tr
                JOIN users u ON tr.student_id = u.id
                WHERE tr.is_featured = TRUE
                LIMIT 5
            """)
            print("\nSample featured reviews:")
            for row in cur.fetchall():
                print(f"  Tutor {row[0]}: {row[1]} stars - '{row[2]}' by {row[3]} {row[4]}")

    finally:
        conn.close()

if __name__ == "__main__":
    mark_featured()
