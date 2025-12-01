import psycopg
import os
from dotenv import load_dotenv
import random

load_dotenv()

def seed_astegni_reviews():
    """Seed sample reviews for Astegni platform"""

    # Sample reviews by rating
    reviews_data = {
        5: [
            "Astegni has completely transformed my learning experience! The tutors are professional and the platform is easy to use.",
            "Outstanding platform! I found the perfect tutor for my child within minutes. Highly recommend!",
            "Best educational platform in Ethiopia! The quality of tutors and resources is exceptional.",
            "Amazing service! The admin team is very responsive and helpful. Five stars!",
            "Excellent platform for finding qualified tutors. The verification process ensures quality.",
        ],
        4: [
            "Great platform overall. The interface could be more intuitive, but the tutors are excellent.",
            "Very good service. Found a great tutor quickly. Just wish there were more payment options.",
            "Solid platform for education. Good selection of tutors and reasonable prices.",
            "Really helpful platform. The search filters make it easy to find the right tutor.",
            "Good experience so far. The admin support team responds quickly to queries.",
        ],
        3: [
            "Decent platform. Works well but could use some improvements in the user interface.",
            "Average experience. Found a tutor eventually but the search took longer than expected.",
            "It's okay. The platform works but needs more tutors in certain subjects.",
            "Fair service. Good for basic needs but lacks some advanced features.",
            "The platform is functional but could benefit from better mobile optimization.",
        ],
        2: [
            "The platform has potential but needs significant improvements in several areas.",
            "Not very satisfied. Had some technical issues and the support response was slow.",
            "Below expectations. The search function doesn't always return accurate results.",
            "Disappointing experience. The platform needs better quality control for tutors.",
            "Could be better. Had issues with the payment system and verification process.",
        ],
        1: [
            "Very poor experience. Multiple technical issues and unhelpful support.",
            "Not recommended. The platform crashed several times during important sessions.",
            "Terrible service. Couldn't find reliable tutors and had payment issues.",
            "Extremely disappointed. The platform doesn't deliver on its promises.",
            "Worst experience. Technical problems and very slow customer support.",
        ]
    }

    # Get database URL
    db_url = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

    try:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                # Get users with different roles
                cur.execute("""
                    SELECT id, roles FROM users
                    WHERE roles IS NOT NULL
                    LIMIT 50;
                """)
                users = cur.fetchall()

                if not users:
                    print("No users found. Please seed user data first.")
                    return

                # Clear existing reviews
                cur.execute("DELETE FROM astegni_reviews;")
                print("Cleared existing reviews")

                # Insert reviews
                reviews_inserted = 0
                for user_id, roles in users:
                    # Each user gives 1-2 reviews
                    num_reviews = random.randint(1, 2)
                    for _ in range(num_reviews):
                        rating = random.choices([5, 4, 3, 2, 1], weights=[40, 30, 15, 10, 5])[0]
                        review = random.choice(reviews_data[rating])

                        cur.execute("""
                            INSERT INTO astegni_reviews (reviewer_id, review, rating, review_type)
                            VALUES (%s, %s, %s, %s);
                        """, (user_id, review, rating, 'platform'))
                        reviews_inserted += 1

                conn.commit()
                print(f"SUCCESS: Inserted {reviews_inserted} reviews")

                # Display statistics
                cur.execute("""
                    SELECT rating, COUNT(*) as count
                    FROM astegni_reviews
                    GROUP BY rating
                    ORDER BY rating DESC;
                """)

                print("\nReviews by rating:")
                for row in cur.fetchall():
                    print(f"  {row[0]} stars: {row[1]} reviews")

                # Display role distribution
                cur.execute("""
                    SELECT
                        CASE
                            WHEN u.roles::text LIKE '%student%' THEN 'student'
                            WHEN u.roles::text LIKE '%tutor%' THEN 'tutor'
                            WHEN u.roles::text LIKE '%parent%' THEN 'parent'
                            WHEN u.roles::text LIKE '%advertiser%' THEN 'advertiser'
                            ELSE 'other'
                        END as role,
                        COUNT(*) as count
                    FROM astegni_reviews ar
                    JOIN users u ON ar.reviewer_id = u.id
                    GROUP BY role
                    ORDER BY count DESC;
                """)

                print("\nReviews by user role:")
                for row in cur.fetchall():
                    print(f"  {row[0]}: {row[1]} reviews")

    except Exception as e:
        print(f"ERROR: {e}")
        raise

if __name__ == "__main__":
    seed_astegni_reviews()
