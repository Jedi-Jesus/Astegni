"""
Seed reviews for admin_id 4 (jediael.s.abebe@gmail.com)
"""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

def seed_reviews():
    """Add sample reviews for admin_id 4"""
    with engine.connect() as conn:
        admin_id = 4

        reviews = [
            {
                "reviewer_name": "Chief Technology Officer",
                "reviewer_role": "Executive Team",
                "rating": 5,
                "review_text": "Exceptional content quality control. Our platform standards have never been higher. Jediael's attention to detail is outstanding.",
                "days_ago": 2
            },
            {
                "reviewer_name": "Head of Marketing",
                "reviewer_role": "Marketing Department",
                "rating": 5,
                "review_text": "Fast turnaround on content approvals. The efficiency has significantly improved our campaign launches.",
                "days_ago": 4
            },
            {
                "reviewer_name": "Education Director",
                "reviewer_role": "Educational Services",
                "rating": 5,
                "review_text": "Outstanding management of educational content. Quality standards are consistently maintained.",
                "days_ago": 6
            },
            {
                "reviewer_name": "Product Manager",
                "reviewer_role": "Product Team",
                "rating": 5,
                "review_text": "Great collaboration on content strategy. Very responsive to feedback and suggestions.",
                "days_ago": 9
            },
            {
                "reviewer_name": "Content Creator Lead",
                "reviewer_role": "Creative Team",
                "rating": 4,
                "review_text": "Clear guidelines and helpful feedback. The content approval process is smooth and efficient.",
                "days_ago": 11
            },
            {
                "reviewer_name": "Student Services",
                "reviewer_role": "Support Department",
                "rating": 5,
                "review_text": "User complaints about inappropriate content have dropped to near zero. Excellent moderation!",
                "days_ago": 14
            },
            {
                "reviewer_name": "Legal Compliance",
                "reviewer_role": "Legal Department",
                "rating": 5,
                "review_text": "Perfect adherence to content policy and copyright guidelines. Zero legal issues since joining.",
                "days_ago": 16
            },
            {
                "reviewer_name": "Platform Analytics",
                "reviewer_role": "Data Team",
                "rating": 5,
                "review_text": "Storage optimization strategies have saved us significant costs. Very data-driven approach.",
                "days_ago": 20
            },
            {
                "reviewer_name": "Community Manager",
                "reviewer_role": "Community Team",
                "rating": 5,
                "review_text": "User engagement with content has increased by 40%. Great understanding of what our community needs.",
                "days_ago": 23
            },
            {
                "reviewer_name": "CEO",
                "reviewer_role": "Executive Leadership",
                "rating": 5,
                "review_text": "Top-tier content management. Platform quality has improved dramatically under this leadership.",
                "days_ago": 25
            }
        ]

        # Insert reviews
        for review in reviews:
            review_date = datetime.now() - timedelta(days=review['days_ago'])
            review_id = f"REV-CNT-{admin_id}-{review['days_ago']}"

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
                    'Jediael Abebe',
                    'manage-contents',
                    :reviewer_name,
                    :reviewer_role,
                    :rating,
                    :comment,
                    :created_at,
                    :review_id
                )
                ON CONFLICT (review_id) DO NOTHING
            """)

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
        print(f"\n[SUCCESS] Successfully seeded {len(reviews)} reviews for admin_id {admin_id}")

if __name__ == "__main__":
    try:
        seed_reviews()
    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")
        raise
