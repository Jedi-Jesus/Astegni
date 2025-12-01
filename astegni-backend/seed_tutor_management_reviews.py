"""
Seed sample reviews for Tutor Management department
This adds reviews specifically for the manage-tutors department
"""

import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime, timezone, timedelta
import random

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')

def get_db_connection():
    # Parse DATABASE_URL
    if DATABASE_URL.startswith("postgresql://"):
        database_url = DATABASE_URL.replace("postgresql://", "")
    else:
        database_url = DATABASE_URL

    auth, host_db = database_url.split("@")
    user, password = auth.split(":")
    host_port, db_part = host_db.split("/")
    db_name = db_part.split("?")[0]

    if ":" in host_port:
        host, port = host_port.split(":")
    else:
        host = host_port
        port = "5432"

    return psycopg.connect(
        dbname=db_name,
        user=user,
        password=password,
        host=host,
        port=port
    )

def seed_tutor_reviews():
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        print("=" * 80)
        print("Seeding Tutor Management Reviews")
        print("=" * 80)

        # Get admin ID for jediael.s.abebe@gmail.com
        cursor.execute("SELECT id, username, email FROM admin_profile WHERE email = 'jediael.s.abebe@gmail.com' LIMIT 1")
        admin = cursor.fetchone()

        if not admin:
            print("\n[WARNING] Admin with email 'jediael.s.abebe@gmail.com' not found.")
            print("Creating test reviews for admin_id = 1 instead...")
            admin_id = 1
            admin_name = "Test Admin"
        else:
            admin_id = admin[0]
            admin_name = admin[1] or admin[2]
            print(f"\n[OK] Found admin: {admin_name} (ID: {admin_id})")

        # Sample reviews for Tutor Management department
        reviews = [
            {
                'review_id': 'REV-TUT-001',
                'reviewer_name': 'Dr. Alemayehu Bekele',
                'reviewer_role': 'Senior Tutor',
                'rating': 5.0,
                'response_time_rating': 5.0,
                'accuracy_rating': 5.0,
                'comment': 'My tutor verification was processed incredibly fast! The feedback on my documents was very helpful and professional.',
                'review_type': 'tutor_verification',
            },
            {
                'review_id': 'REV-TUT-002',
                'reviewer_name': 'Tigist Haile',
                'reviewer_role': 'Mathematics Tutor',
                'rating': 4.8,
                'response_time_rating': 4.7,
                'accuracy_rating': 5.0,
                'comment': 'Excellent support during the verification process. Very thorough document review.',
                'review_type': 'tutor_verification',
            },
            {
                'review_id': 'REV-TUT-003',
                'reviewer_name': 'Habtamu Tesfaye',
                'reviewer_role': 'Science Tutor',
                'rating': 4.5,
                'response_time_rating': 4.3,
                'accuracy_rating': 4.7,
                'comment': 'Good attention to detail. The verification guidelines were clear and easy to follow.',
                'review_type': 'general',
            },
            {
                'review_id': 'REV-TUT-004',
                'reviewer_name': 'Sarah Johnson',
                'reviewer_role': 'Department Head',
                'rating': 4.9,
                'response_time_rating': 5.0,
                'accuracy_rating': 4.8,
                'comment': 'Outstanding performance in managing tutor verifications. Approval times have improved significantly.',
                'review_type': 'performance',
            },
            {
                'review_id': 'REV-TUT-005',
                'reviewer_name': 'Alem Gebre',
                'reviewer_role': 'Language Tutor',
                'rating': 4.7,
                'response_time_rating': 4.5,
                'accuracy_rating': 4.9,
                'comment': 'Very professional handling of my tutor application. Clear communication throughout the process.',
                'review_type': 'tutor_verification',
            },
            {
                'review_id': 'REV-TUT-006',
                'reviewer_name': 'Michael Chen',
                'reviewer_role': 'Quality Assurance',
                'rating': 4.6,
                'response_time_rating': 4.4,
                'accuracy_rating': 4.8,
                'comment': 'Consistent quality in tutor verification. Rejection reasons are always well-documented.',
                'review_type': 'quality',
            },
            {
                'review_id': 'REV-TUT-007',
                'reviewer_name': 'Yohannes Tadesse',
                'reviewer_role': 'Chemistry Tutor',
                'rating': 5.0,
                'response_time_rating': 5.0,
                'accuracy_rating': 5.0,
                'comment': 'Phenomenal service! My documents were approved within hours. Very impressed with the efficiency.',
                'review_type': 'tutor_verification',
            },
        ]

        print(f"\n[INFO] Adding {len(reviews)} reviews for {admin_name}...")

        for review in reviews:
            # Random date within last 30 days
            days_ago = random.randint(1, 30)
            created_at = datetime.now(timezone.utc) - timedelta(days=days_ago)

            cursor.execute("""
                INSERT INTO admin_reviews
                (review_id, admin_id, admin_name, reviewer_name, reviewer_role,
                 rating, response_time_rating, accuracy_rating, comment,
                 review_type, department, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (review_id) DO UPDATE SET
                    admin_id = EXCLUDED.admin_id,
                    department = EXCLUDED.department
            """, (
                review['review_id'],
                admin_id,
                admin_name,
                review['reviewer_name'],
                review['reviewer_role'],
                review['rating'],
                review['response_time_rating'],
                review['accuracy_rating'],
                review['comment'],
                review['review_type'],
                'manage-tutors',  # Department
                created_at
            ))

        conn.commit()

        # Verify
        cursor.execute("""
            SELECT COUNT(*) FROM admin_reviews
            WHERE admin_id = %s AND department = 'manage-tutors'
        """, (admin_id,))
        count = cursor.fetchone()[0]

        print(f"\n[OK] Added {len(reviews)} reviews")
        print(f"[OK] Total reviews for admin_id={admin_id} in 'manage-tutors': {count}")

        # Show sample
        cursor.execute("""
            SELECT review_id, reviewer_name, rating, comment
            FROM admin_reviews
            WHERE admin_id = %s AND department = 'manage-tutors'
            ORDER BY created_at DESC
            LIMIT 3
        """, (admin_id,))

        print("\n[SAMPLE] Latest 3 reviews:")
        for row in cursor.fetchall():
            print(f"  • {row[0]}: {row[1]} - {row[2]}★ - {row[3][:50]}...")

        print("\n" + "=" * 80)
        print("[SUCCESS] Tutor Management reviews seeded!")
        print("=" * 80)

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] {e}")
        raise

    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    seed_tutor_reviews()
