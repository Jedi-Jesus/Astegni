"""
Seed Script: Add sample reviews for manage-contents department
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def seed_reviews():
    """Add sample reviews for manage-contents admin"""
    with engine.connect() as conn:
        # Get admin_id for test admin
        get_admin_query = text("""
            SELECT id as admin_id FROM admin_profile WHERE email = 'test1@example.com'
        """)

        result = conn.execute(get_admin_query).fetchone()
        if not result:
            print("[ERROR] Test admin not found. Please create admin first.")
            return

        admin_id = result.admin_id
        print(f"[OK] Found admin with ID: {admin_id}")

        # Sample reviews for content management
        reviews = [
            {
                "reviewer_name": "Marketing Director",
                "reviewer_role": "Marketing Department",
                "rating": 5,
                "review_text": "Outstanding content management! The approval process is quick and efficient. Our content quality has significantly improved.",
                "days_ago": 3
            },
            {
                "reviewer_name": "Sales Team Lead",
                "reviewer_role": "Sales Department",
                "rating": 5,
                "review_text": "Content approvals are processed within hours. Great communication and feedback on rejected content helps us improve.",
                "days_ago": 5
            },
            {
                "reviewer_name": "Finance Department",
                "reviewer_role": "Finance Team",
                "rating": 4,
                "review_text": "Excellent storage management and organization. The system runs smoothly and efficiently.",
                "days_ago": 7
            },
            {
                "reviewer_name": "Content Creator",
                "reviewer_role": "Media Team",
                "rating": 5,
                "review_text": "Very responsive to flagged content. Clear guidelines and helpful feedback make the upload process seamless.",
                "days_ago": 10
            },
            {
                "reviewer_name": "Educational Director",
                "reviewer_role": "Education Department",
                "rating": 5,
                "review_text": "Professional handling of educational content. Quality control is top-notch and maintains platform standards.",
                "days_ago": 12
            },
            {
                "reviewer_name": "Technical Support",
                "reviewer_role": "IT Department",
                "rating": 4,
                "review_text": "Efficient content moderation system. Storage analytics are helpful for capacity planning.",
                "days_ago": 15
            },
            {
                "reviewer_name": "User Experience Team",
                "reviewer_role": "UX Department",
                "rating": 5,
                "review_text": "User satisfaction with content quality is at an all-time high. Great work maintaining platform integrity!",
                "days_ago": 18
            },
            {
                "reviewer_name": "Compliance Officer",
                "reviewer_role": "Legal Department",
                "rating": 5,
                "review_text": "Excellent adherence to content policy. Flagging system works perfectly and prevents policy violations.",
                "days_ago": 21
            }
        ]

        # Insert reviews
        for review in reviews:
            review_date = datetime.now() - timedelta(days=review['days_ago'])

            insert_query = text("""
                INSERT INTO admin_reviews (
                    admin_id,
                    admin_name,
                    department,
                    reviewer_name,
                    reviewer_role,
                    rating,
                    comment,
                    created_at,
                    review_id
                )
                VALUES (
                    :admin_id,
                    'Content Manager',
                    'manage-contents',
                    :reviewer_name,
                    :reviewer_role,
                    :rating,
                    :comment,
                    :created_at,
                    :review_id
                )
            """)

            # Generate unique review_id
            review_id = f"REV-CNT-{admin_id}-{review['days_ago']}"

            conn.execute(insert_query, {
                "admin_id": admin_id,
                "reviewer_name": review['reviewer_name'],
                "reviewer_role": review['reviewer_role'],
                "rating": review['rating'],
                "comment": review['review_text'],
                "created_at": review_date,
                "review_id": review_id
            })

            print(f"[OK] Added review from {review['reviewer_name']}")

        conn.commit()
        print(f"\n[SUCCESS] Successfully seeded {len(reviews)} reviews for manage-contents department")

if __name__ == "__main__":
    try:
        seed_reviews()
    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")
        raise
