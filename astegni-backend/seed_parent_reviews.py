"""
Seed script for Parent Reviews
Creates sample reviews for testing the view-parent page
"""

import psycopg
from datetime import datetime, timedelta
import random

# Database connection
DB_URL = "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_user_db"

# Sample review data
REVIEW_TITLES = [
    "Excellent parent engagement",
    "Very supportive parent",
    "Great communication",
    "Highly responsible parent",
    "Wonderful to work with",
    "Dedicated to children's education",
    "Outstanding involvement",
    "Reliable and punctual",
    "Exceptional support",
    "Top-notch parent"
]

REVIEW_TEXTS = [
    "This parent is highly engaged with their children's education. They maintain excellent communication and ensure the children are always prepared for sessions.",
    "Very supportive and understanding parent. Always responsive to messages and follows up on children's progress regularly.",
    "One of the best parents I've worked with. They create a great learning environment at home and are punctual with payments.",
    "Exceptional parent engagement. They actively participate in their children's learning journey and provide valuable feedback.",
    "Outstanding communication and follow-up. This parent truly cares about their children's educational development.",
    "Reliable and punctual with all commitments. Children are well-prepared for each session thanks to parental support.",
    "Great to collaborate with. The parent shows genuine interest in the teaching methods and learning outcomes.",
    "Highly responsive and supportive. Creates an excellent home learning environment for the children.",
    "Professional approach to education partnership. Clear communication and timely payments.",
    "Dedicated parent who actively monitors progress and provides helpful feedback for improvement."
]


def seed_parent_reviews():
    """Seed sample reviews for parent profiles"""

    conn = psycopg.connect(DB_URL)
    cur = conn.cursor()

    try:
        # Get parent profiles
        cur.execute("SELECT id, user_id FROM parent_profiles")
        parents = cur.fetchall()

        if not parents:
            print("No parent profiles found. Please create parent profiles first.")
            return

        # Get tutor profiles for reviewers
        cur.execute("SELECT id FROM tutor_profiles LIMIT 10")
        tutors = cur.fetchall()

        if not tutors:
            print("No tutor profiles found. Creating sample reviews without tutor references...")
            tutors = [(None,)]

        # Check if reviews already exist
        cur.execute("SELECT COUNT(*) FROM parent_reviews")
        existing_count = cur.fetchone()[0]

        if existing_count > 0:
            print(f"Found {existing_count} existing reviews. Skipping seed...")
            return

        reviews_created = 0

        for parent_id, parent_user_id in parents:
            # Create 3-5 reviews per parent
            num_reviews = random.randint(3, 5)

            for i in range(num_reviews):
                # Select random tutor as reviewer
                reviewer_id = random.choice(tutors)[0] if tutors[0][0] else None

                # Generate random ratings (3.5 - 5.0 range for realistic data)
                engagement_tutor = round(random.uniform(3.5, 5.0), 1)
                engagement_child = round(random.uniform(3.5, 5.0), 1)
                responsiveness = round(random.uniform(3.5, 5.0), 1)
                payment_consistency = round(random.uniform(4.0, 5.0), 1)  # Payment usually higher

                # Calculate overall rating
                overall_rating = round(
                    (engagement_tutor + engagement_child + responsiveness + payment_consistency) / 4, 1
                )

                # Random date within last 6 months
                days_ago = random.randint(1, 180)
                created_at = datetime.now() - timedelta(days=days_ago)

                # Insert review
                cur.execute("""
                    INSERT INTO parent_reviews (
                        parent_id, reviewer_id, user_role, rating, title, review_text,
                        engagement_with_tutor_rating, engagement_with_child_rating,
                        responsiveness_rating, payment_consistency_rating,
                        is_verified, helpful_count, is_featured, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                """, (
                    parent_id,
                    reviewer_id,
                    'tutor',
                    overall_rating,
                    random.choice(REVIEW_TITLES),
                    random.choice(REVIEW_TEXTS),
                    engagement_tutor,
                    engagement_child,
                    responsiveness,
                    payment_consistency,
                    True,  # is_verified
                    random.randint(0, 15),  # helpful_count
                    i == 0,  # First review is featured
                    created_at,
                    created_at
                ))

                reviews_created += 1

            # Update parent's rating and rating_count
            cur.execute("""
                UPDATE parent_profiles
                SET rating = (
                    SELECT COALESCE(AVG(rating), 0) FROM parent_reviews WHERE parent_id = %s
                ),
                rating_count = (
                    SELECT COUNT(*) FROM parent_reviews WHERE parent_id = %s
                )
                WHERE id = %s
            """, (parent_id, parent_id, parent_id))

            print(f"Created {num_reviews} reviews for parent ID {parent_id}")

        conn.commit()
        print(f"\nTotal reviews created: {reviews_created}")

        # Display summary
        cur.execute("""
            SELECT pp.id, u.first_name, u.father_name, pp.rating, pp.rating_count
            FROM parent_profiles pp
            JOIN users u ON pp.user_id = u.id
        """)

        print("\nUpdated parent ratings:")
        for row in cur.fetchall():
            print(f"  Parent {row[0]} ({row[1]} {row[2]}): Rating {row[3]:.1f}, {row[4]} reviews")

    except Exception as e:
        print(f"Error seeding reviews: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    seed_parent_reviews()
