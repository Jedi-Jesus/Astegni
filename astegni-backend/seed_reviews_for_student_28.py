"""
Seed student reviews for student_profile_id = 28 (User: Jediael)
"""

import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_reviews_for_student_28():
    """Seed reviews for student profile ID 28"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Seeding reviews for student profile ID 28...")

        # Get tutor profile IDs (excluding the student's own tutor profile if they have one)
        cur.execute("""
            SELECT id FROM tutor_profiles
            WHERE user_id != 115
            ORDER BY RANDOM()
            LIMIT 8
        """)
        tutor_profile_ids = [row[0] for row in cur.fetchall()]

        # Get parent profile IDs
        cur.execute("""
            SELECT id FROM parent_profiles
            ORDER BY RANDOM()
            LIMIT 3
        """)
        parent_profile_ids = [row[0] for row in cur.fetchall()]

        if not tutor_profile_ids:
            print("[WARNING] No tutor profiles found.")
            return

        if not parent_profile_ids:
            print("[WARNING] No parent profiles found.")

        print(f"  - Found {len(tutor_profile_ids)} tutor profiles")
        print(f"  - Found {len(parent_profile_ids)} parent profiles")

        # Sample reviews from tutors
        tutor_reviews = [
            {
                'title': 'Exceptional Academic Performance',
                'text': 'Jediael consistently demonstrates outstanding understanding of complex mathematical concepts. His analytical skills and problem-solving abilities are remarkable. Always prepared and engaged in class discussions.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 5.0,
                'punctuality': 5.0,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Outstanding Progress in Physics',
                'text': 'Shows exceptional grasp of physics principles. Excellent lab work and theoretical understanding. Actively participates in experiments and asks insightful questions.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 4.8,
                'punctuality': 5.0,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Excellent Chemistry Student',
                'text': 'Demonstrates strong understanding of chemical reactions and equations. Lab safety practices are exemplary. Shows genuine interest in scientific inquiry.',
                'type': 'positive',
                'subject_understanding': 4.8,
                'discipline': 5.0,
                'punctuality': 5.0,
                'participation': 4.8,
                'attendance': 5.0
            },
            {
                'title': 'Great Critical Thinking Skills',
                'text': 'Jediael excels in analyzing complex problems and developing innovative solutions. His presentations are well-researched and clearly articulated. A model student.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 5.0,
                'punctuality': 4.8,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Strong Work Ethic',
                'text': 'Consistently completes assignments on time with high quality. Shows dedication to learning and improvement. Helps other students understand difficult concepts.',
                'type': 'positive',
                'subject_understanding': 4.8,
                'discipline': 5.0,
                'punctuality': 5.0,
                'participation': 4.8,
                'attendance': 5.0
            },
            {
                'title': 'Room for Improvement in Time Management',
                'text': 'While academic performance is strong, occasionally rushes through assignments. Would benefit from better time management and starting projects earlier. Overall excellent student.',
                'type': 'improvement',
                'subject_understanding': 4.5,
                'discipline': 4.0,
                'punctuality': 4.5,
                'participation': 4.5,
                'attendance': 5.0
            },
            {
                'title': 'Excellent English Language Skills',
                'text': 'Demonstrates advanced reading comprehension and writing abilities. Participates actively in literature discussions. Essays are thoughtful and well-structured.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 4.8,
                'punctuality': 5.0,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Outstanding Computer Science Aptitude',
                'text': 'Shows exceptional programming skills and logical thinking. Quickly grasps new concepts and applies them effectively. Projects are innovative and well-executed.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 5.0,
                'punctuality': 4.8,
                'participation': 5.0,
                'attendance': 5.0
            }
        ]

        # Sample reviews from parents
        parent_reviews = [
            {
                'title': 'Wonderful Student to Tutor',
                'text': 'Jediael is respectful, attentive, and genuinely interested in learning. Parents are very supportive and maintain excellent communication. The learning environment at home is conducive to studying. Highly recommend!',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 5.0,
                'punctuality': 5.0,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Great Student with Excellent Attitude',
                'text': 'Always comes prepared to sessions with homework completed. Shows genuine curiosity and asks thoughtful questions. Parents are engaged and supportive of the learning process.',
                'type': 'positive',
                'subject_understanding': 4.8,
                'discipline': 5.0,
                'punctuality': 5.0,
                'participation': 4.8,
                'attendance': 5.0
            },
            {
                'title': 'Pleasure to Work With',
                'text': 'Jediael is a dedicated student who takes his education seriously. Family is very cooperative and ensures a good study environment. Would be happy to continue tutoring.',
                'type': 'positive',
                'subject_understanding': 4.8,
                'discipline': 4.8,
                'punctuality': 5.0,
                'participation': 5.0,
                'attendance': 5.0
            }
        ]

        reviews_created = 0

        # Insert tutor reviews
        for i, tutor_profile_id in enumerate(tutor_profile_ids):
            review = tutor_reviews[i] if i < len(tutor_reviews) else random.choice(tutor_reviews)

            # Calculate overall rating
            overall = (
                review['subject_understanding'] +
                review['discipline'] +
                review['punctuality'] +
                review['participation'] +
                review['attendance']
            ) / 5

            # Create review with timestamp offset (spread over last 60 days)
            days_ago = random.randint(1, 60)
            created_at = datetime.now() - timedelta(days=days_ago)

            cur.execute("""
                INSERT INTO student_reviews (
                    student_id, reviewer_id, reviewer_role,
                    subject_understanding, discipline, punctuality, participation, attendance,
                    overall_rating, review_title, review_text, review_type,
                    created_at, is_featured, helpful_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                28, tutor_profile_id, 'tutor',
                review['subject_understanding'], review['discipline'],
                review['punctuality'], review['participation'], review['attendance'],
                round(overall, 1), review['title'], review['text'], review['type'],
                created_at, i == 0, random.randint(5, 30)
            ))
            reviews_created += 1

        # Insert parent reviews
        for i, parent_profile_id in enumerate(parent_profile_ids):
            review = parent_reviews[i] if i < len(parent_reviews) else random.choice(parent_reviews)

            # Calculate overall rating
            overall = (
                review['subject_understanding'] +
                review['discipline'] +
                review['punctuality'] +
                review['participation'] +
                review['attendance']
            ) / 5

            # Create review with timestamp offset
            days_ago = random.randint(5, 45)
            created_at = datetime.now() - timedelta(days=days_ago)

            cur.execute("""
                INSERT INTO student_reviews (
                    student_id, reviewer_id, reviewer_role,
                    subject_understanding, discipline, punctuality, participation, attendance,
                    overall_rating, review_title, review_text, review_type,
                    created_at, is_featured, helpful_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                28, parent_profile_id, 'parent',
                review['subject_understanding'], review['discipline'],
                review['punctuality'], review['participation'], review['attendance'],
                round(overall, 1), review['title'], review['text'], review['type'],
                created_at, False, random.randint(3, 20)
            ))
            reviews_created += 1

        conn.commit()
        print(f"\n[SUCCESS] Successfully created {reviews_created} reviews for student profile ID 28!")

        # Show summary
        cur.execute("""
            SELECT reviewer_role, COUNT(*), AVG(overall_rating)
            FROM student_reviews
            WHERE student_id = 28
            GROUP BY reviewer_role
        """)

        print("\nReviews for Student Profile ID 28:")
        for row in cur.fetchall():
            print(f"  - {row[0].capitalize()}s: {row[1]} reviews (avg rating: {row[2]:.1f})")

        # Show total for this student
        cur.execute("SELECT COUNT(*), AVG(overall_rating) FROM student_reviews WHERE student_id = 28")
        total = cur.fetchone()
        print(f"\nTotal: {total[0]} reviews (avg rating: {total[1]:.1f})")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error seeding reviews: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_reviews_for_student_28()
