"""
Seed sample student reviews from tutors and parents
FIXED: Uses student_profiles(id) for student_id and profile-specific IDs for reviewer_id
"""

import psycopg
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def seed_student_reviews():
    """Seed sample student reviews with correct ID references"""

    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()

    try:
        print("Seeding student reviews...")

        # Get student profile IDs (from student_profiles table)
        cur.execute("SELECT id FROM student_profiles LIMIT 5")
        student_profile_ids = [row[0] for row in cur.fetchall()]

        if not student_profile_ids:
            print("[ERROR] No student profiles found. Please create student profiles first.")
            return

        print(f"  - Found {len(student_profile_ids)} student profiles")

        # Get tutor profile IDs (from tutor_profiles table)
        cur.execute("SELECT id FROM tutor_profiles LIMIT 10")
        tutor_profile_ids = [row[0] for row in cur.fetchall()]

        # Get parent profile IDs (from parent_profiles table)
        cur.execute("SELECT id FROM parent_profiles LIMIT 5")
        parent_profile_ids = [row[0] for row in cur.fetchall()]

        if not tutor_profile_ids:
            print("[WARNING] No tutor profiles found. Creating tutor reviews will be skipped.")
        else:
            print(f"  - Found {len(tutor_profile_ids)} tutor profiles")

        if not parent_profile_ids:
            print("[WARNING] No parent profiles found. Creating parent reviews will be skipped.")
        else:
            print(f"  - Found {len(parent_profile_ids)} parent profiles")

        # Sample reviews from tutors
        tutor_reviews = [
            {
                'title': 'Excellent Progress in Mathematics',
                'text': 'Shows exceptional dedication and improvement in calculus. Has mastered complex problem-solving techniques and consistently demonstrates strong analytical thinking.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 5.0,
                'punctuality': 5.0,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Outstanding Participation in Class',
                'text': 'Always engaged and asks thoughtful questions. Great collaboration with classmates during lab work. Shows genuine curiosity and scientific thinking.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 4.5,
                'punctuality': 5.0,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Consistent Improvement',
                'text': 'Steady progress in understanding physics concepts. Keep up the good work with problem sets. Shows improvement in applying theoretical knowledge to practical problems.',
                'type': 'positive',
                'subject_understanding': 4.0,
                'discipline': 4.5,
                'punctuality': 4.0,
                'participation': 4.0,
                'attendance': 4.5
            },
            {
                'title': 'Exceptional Leadership',
                'text': 'Took initiative to help struggling classmates during group work. Demonstrated excellent patience and communication skills while explaining complex concepts.',
                'type': 'positive',
                'subject_understanding': 5.0,
                'discipline': 5.0,
                'punctuality': 4.5,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Outstanding Engagement',
                'text': 'Actively engaged in lab experiments and asked thoughtful questions. Curiosity and scientific approach to problem-solving are commendable.',
                'type': 'positive',
                'subject_understanding': 4.5,
                'discipline': 5.0,
                'punctuality': 4.5,
                'participation': 5.0,
                'attendance': 5.0
            },
            {
                'title': 'Improved Time Management',
                'text': 'Notable improvement in submitting assignments on time. Has been consistently meeting deadlines and showing better organization skills.',
                'type': 'improvement',
                'subject_understanding': 4.0,
                'discipline': 4.5,
                'punctuality': 4.5,
                'participation': 4.0,
                'attendance': 4.5
            },
            {
                'title': 'Needs Focus During Lessons',
                'text': 'Sometimes distracted during class. Encourage more concentration on the lesson material. Has potential but needs to stay focused.',
                'type': 'improvement',
                'subject_understanding': 3.5,
                'discipline': 3.0,
                'punctuality': 4.0,
                'participation': 3.5,
                'attendance': 4.0
            },
            {
                'title': 'Strong Work Ethic',
                'text': 'Consistently completes assignments and shows dedication to learning. Always prepared for sessions and asks relevant questions.',
                'type': 'positive',
                'subject_understanding': 4.5,
                'discipline': 4.8,
                'punctuality': 4.5,
                'participation': 4.5,
                'attendance': 4.8
            }
        ]

        # Sample reviews from parents
        parent_reviews = [
            {
                'title': 'Wonderful Student to Work With',
                'text': 'Great engagement from the parents. Shows genuine interest in the learning process and provides a conducive environment for studies. The student is disciplined and respectful.',
                'type': 'positive',
                'subject_understanding': 4.5,
                'discipline': 5.0,
                'punctuality': 5.0,
                'participation': 4.5,
                'attendance': 5.0
            },
            {
                'title': 'Pleasure to Teach',
                'text': 'Student comes prepared to sessions and completes homework regularly. Parents are supportive and responsive. Would definitely recommend!',
                'type': 'positive',
                'subject_understanding': 4.5,
                'discipline': 4.5,
                'punctuality': 5.0,
                'participation': 4.5,
                'attendance': 5.0
            },
            {
                'title': 'Consistent and Reliable',
                'text': 'Always shows up on time and ready to learn. Parents maintain good communication and ensure the student has all necessary materials.',
                'type': 'positive',
                'subject_understanding': 4.3,
                'discipline': 4.7,
                'punctuality': 5.0,
                'participation': 4.5,
                'attendance': 5.0
            }
        ]

        reviews_created = 0

        # Insert tutor reviews
        for student_profile_id in student_profile_ids[:3]:  # Review first 3 students
            if tutor_profile_ids:
                for i in range(min(3, len(tutor_profile_ids))):  # 3 reviews per student from different tutors
                    tutor_profile_id = tutor_profile_ids[i]
                    review = random.choice(tutor_reviews)

                    # Calculate overall rating
                    overall = (
                        review['subject_understanding'] +
                        review['discipline'] +
                        review['punctuality'] +
                        review['participation'] +
                        review['attendance']
                    ) / 5

                    # Create review with timestamp offset
                    days_ago = random.randint(1, 30)
                    created_at = datetime.now() - timedelta(days=days_ago)

                    cur.execute("""
                        INSERT INTO student_reviews (
                            student_id, reviewer_id, reviewer_role,
                            subject_understanding, discipline, punctuality, participation, attendance,
                            overall_rating, review_title, review_text, review_type,
                            created_at, is_featured, helpful_count
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        student_profile_id, tutor_profile_id, 'tutor',
                        review['subject_understanding'], review['discipline'],
                        review['punctuality'], review['participation'], review['attendance'],
                        round(overall, 1), review['title'], review['text'], review['type'],
                        created_at, i == 0, random.randint(0, 25)
                    ))
                    reviews_created += 1

        # Insert parent reviews
        for student_profile_id in student_profile_ids[:2]:  # Review first 2 students
            if parent_profile_ids:
                for i in range(min(2, len(parent_profile_ids))):  # 2 reviews per student from parents
                    parent_profile_id = parent_profile_ids[i]
                    review = random.choice(parent_reviews)

                    # Calculate overall rating
                    overall = (
                        review['subject_understanding'] +
                        review['discipline'] +
                        review['punctuality'] +
                        review['participation'] +
                        review['attendance']
                    ) / 5

                    # Create review with timestamp offset
                    days_ago = random.randint(1, 20)
                    created_at = datetime.now() - timedelta(days=days_ago)

                    cur.execute("""
                        INSERT INTO student_reviews (
                            student_id, reviewer_id, reviewer_role,
                            subject_understanding, discipline, punctuality, participation, attendance,
                            overall_rating, review_title, review_text, review_type,
                            created_at, is_featured, helpful_count
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        student_profile_id, parent_profile_id, 'parent',
                        review['subject_understanding'], review['discipline'],
                        review['punctuality'], review['participation'], review['attendance'],
                        round(overall, 1), review['title'], review['text'], review['type'],
                        created_at, False, random.randint(0, 15)
                    ))
                    reviews_created += 1

        conn.commit()
        print(f"\n[SUCCESS] Successfully created {reviews_created} student reviews!")

        # Show summary
        cur.execute("""
            SELECT reviewer_role, COUNT(*), AVG(overall_rating)
            FROM student_reviews
            GROUP BY reviewer_role
        """)

        print("\nReviews Summary:")
        for row in cur.fetchall():
            print(f"  - {row[0].capitalize()}s: {row[1]} reviews (avg rating: {row[2]:.1f})")

        # Show which students have reviews
        cur.execute("""
            SELECT sr.student_id, sp.user_id, COUNT(*) as review_count
            FROM student_reviews sr
            JOIN student_profiles sp ON sr.student_id = sp.id
            GROUP BY sr.student_id, sp.user_id
            ORDER BY review_count DESC
        """)

        print("\nStudents with reviews:")
        for row in cur.fetchall():
            print(f"  - Student Profile ID {row[0]} (User ID {row[1]}): {row[2]} reviews")

    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Error seeding student reviews: {e}")
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    seed_student_reviews()
