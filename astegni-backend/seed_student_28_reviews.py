"""
Seed Script: Add realistic reviews for student_id 28

Adds 15 diverse reviews from different tutors with realistic behavioral scores.
"""

import psycopg
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
import random

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Sample review comments
REVIEW_COMMENTS = [
    "Excellent student who consistently participates in class discussions and demonstrates strong understanding of the material.",
    "Very focused and disciplined student. Always completes assignments on time and shows great interest in learning.",
    "Shows good progress in understanding complex concepts. Active participation in class activities makes the learning environment better.",
    "Punctual and well-prepared for every session. Communication skills have improved significantly over the semester.",
    "Outstanding subject knowledge and excellent class participation. A pleasure to teach!",
    "Demonstrates strong discipline and time management skills. Consistently prepared for classes.",
    "Active learner who asks thoughtful questions and engages well with course material.",
    "Good understanding of core concepts. Could improve on class participation and interaction.",
    "Reliable student with consistent attendance and good work ethic. Shows steady improvement.",
    "Very communicative and articulate. Excels in group discussions and collaborative activities.",
    "Strong technical skills and excellent problem-solving abilities. Actively contributes to class activities.",
    "Well-organized student with good study habits. Punctuality is exemplary.",
    "Shows great enthusiasm for learning. Communication skills are a strong point.",
    "Dedicated student who takes initiative in class. Discipline and focus are commendable.",
    "Excellent participation in class activities. Always eager to learn and help peers."
]

def seed_reviews():
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("=" * 60)
        print("SEED SCRIPT: Add Reviews for Student ID 28")
        print("=" * 60)

        # Check if student 28 exists
        print("\n1. Verifying student profile exists...")
        cur.execute("SELECT id, user_id FROM student_profiles WHERE id = 28;")
        student = cur.fetchone()

        if not student:
            print("   [ERROR] Student profile with id=28 not found!")
            return

        print(f"   [OK] Student found: id={student[0]}, user_id={student[1]}")

        # Get some tutor IDs to use as reviewers
        print("\n2. Fetching tutor IDs for reviewers...")
        cur.execute("SELECT user_id FROM tutor_profiles LIMIT 20;")
        tutor_ids = [row[0] for row in cur.fetchall()]

        if len(tutor_ids) < 10:
            print(f"   [WARNING] Only {len(tutor_ids)} tutors found. Reviews will have duplicate reviewers.")

        print(f"   [OK] Found {len(tutor_ids)} tutors to use as reviewers")

        # Check if student 28 already has reviews
        print("\n3. Checking existing reviews for student 28...")
        cur.execute("SELECT COUNT(*) FROM student_reviews WHERE student_id = 28;")
        existing_count = cur.fetchone()[0]

        if existing_count > 0:
            print(f"   [WARNING] Student 28 already has {existing_count} reviews")
            response = input("   Do you want to add more reviews? (yes/no): ")
            if response.lower() != 'yes':
                print("   [CANCELLED] Seeding cancelled by user")
                return

        # Create 15 diverse reviews
        print("\n4. Creating 15 reviews for student 28...")
        reviews_to_add = 15
        reviews_added = 0

        for i in range(reviews_to_add):
            # Select a random tutor
            reviewer_id = random.choice(tutor_ids)

            # Generate realistic scores (3.0-5.0 range with variation)
            # Most scores should be in 3.8-4.8 range (good student)
            subject_matter = round(random.uniform(3.8, 5.0), 1)
            communication = round(random.uniform(3.5, 4.8), 1)
            discipline = round(random.uniform(4.0, 5.0), 1)  # Student 28 is disciplined
            punctuality = round(random.uniform(4.2, 5.0), 1)  # Very punctual
            class_activity = round(random.uniform(3.7, 4.9), 1)

            # Calculate rating as average of 5 categories
            rating = round((subject_matter + communication + discipline + punctuality + class_activity) / 5.0, 1)

            # Random date in the past 6 months
            days_ago = random.randint(1, 180)
            created_at = datetime.now() - timedelta(days=days_ago)

            # Random review comment
            review_text = random.choice(REVIEW_COMMENTS)

            # Insert review
            cur.execute("""
                INSERT INTO student_reviews (
                    student_id, reviewer_id, reviewer_role,
                    subject_matter_expertise, communication_skills,
                    discipline, punctuality, class_activity,
                    rating, review_text, created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                )
            """, (
                28, reviewer_id, 'tutor',
                subject_matter, communication,
                discipline, punctuality, class_activity,
                rating, review_text, created_at
            ))

            reviews_added += 1
            print(f"   Review {i+1}: SME={subject_matter}, Comm={communication}, Disc={discipline}, Punct={punctuality}, Activity={class_activity} -> Rating={rating}")

        conn.commit()
        print(f"\n   [SUCCESS] Added {reviews_added} reviews for student 28")

        # Show statistics
        print("\n5. Review statistics for student 28:")
        cur.execute("""
            SELECT
                COUNT(*) as total_reviews,
                ROUND(AVG(rating), 1) as overall_rating,
                ROUND(AVG(subject_matter_expertise), 1) as avg_sme,
                ROUND(AVG(communication_skills), 1) as avg_comm,
                ROUND(AVG(discipline), 1) as avg_disc,
                ROUND(AVG(punctuality), 1) as avg_punct,
                ROUND(AVG(class_activity), 1) as avg_activity
            FROM student_reviews
            WHERE student_id = 28;
        """)
        stats = cur.fetchone()

        print(f"   Total Reviews: {stats[0]}")
        print(f"   Overall Rating: {stats[1]} / 5.0")
        print(f"   Subject Matter Expertise: {stats[2]} / 5.0")
        print(f"   Communication Skills: {stats[3]} / 5.0")
        print(f"   Discipline: {stats[4]} / 5.0")
        print(f"   Punctuality: {stats[5]} / 5.0")
        print(f"   Class Activity: {stats[6]} / 5.0")

        print("\n" + "=" * 60)
        print("[SUCCESS] SEEDING COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nStudent 28 now has realistic reviews!")
        print("Test at: http://localhost:8080/view-profiles/view-student.html?id=28")

    except Exception as e:
        print(f"\n[ERROR] ERROR during seeding: {e}")
        print("\nRolling back changes...")
        conn.rollback()
        print("[SUCCESS] Rollback completed")

    finally:
        cur.close()
        conn.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    seed_reviews()
