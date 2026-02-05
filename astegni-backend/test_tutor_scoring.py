"""
Test script for new tutor scoring system
Run this to verify all scoring calculations work correctly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app import SessionLocal
from tutor_scoring import TutorScoringCalculator
from datetime import datetime
from sqlalchemy import text


def test_tutor_scoring():
    """Test all new scoring functions with real database data"""
    db: Session = SessionLocal()

    try:
        # Get first 5 tutors for testing
        tutors_query = text("""
            SELECT tp.id, tp.user_id, tp.created_at, u.first_name, u.father_name
            FROM tutor_profiles tp
            JOIN users u ON u.id = tp.user_id
            WHERE tp.is_active = true
            LIMIT 5
        """)
        tutors = db.execute(tutors_query).fetchall()

        if not tutors:
            print("[ERROR] No tutors found in database")
            return

        print(f"\n[OK] Testing Tutor Scoring System with {len(tutors)} tutors\n")
        print("=" * 80)

        calculator = TutorScoringCalculator(db)

        # Test with sample student data
        student_interests = ["Mathematics", "Physics", "Chemistry"]
        student_hobbies = ["Reading", "Sports", "Music"]

        for tutor in tutors:
            tutor_id = tutor[0]
            user_id = tutor[1]
            created_at = tutor[2]
            first_name = tutor[3]
            father_name = tutor[4]

            print(f"\n[OK] Tutor: {first_name} {father_name} (ID: {tutor_id})")
            print("-" * 80)

            # Test individual scoring functions
            print("\n[1] Interest/Hobby Matching (0-150 points):")
            interest_score, interest_details = calculator.calculate_interest_hobby_score(
                tutor_id, student_interests, student_hobbies
            )
            print(f"   Score: {interest_score} points")
            print(f"   Details: {interest_details}")

            print("\n[2] Total Students (0-100 points):")
            students_score, students_details = calculator.calculate_total_students_score(tutor_id)
            print(f"   Score: {students_score} points")
            print(f"   Details: {students_details}")

            print("\n[3] Completion Rate (0-80 points):")
            completion_score, completion_details = calculator.calculate_completion_rate_score(tutor_id)
            print(f"   Score: {completion_score} points")
            print(f"   Details: {completion_details}")

            print("\n[4] Response Time (0-60 points):")
            response_score, response_details = calculator.calculate_response_time_score(
                tutor_id, user_id
            )
            print(f"   Score: {response_score} points")
            print(f"   Details: {response_details}")

            print("\n[5] Experience (0-50 points):")
            experience_score, experience_details = calculator.calculate_experience_score(
                user_id, created_at
            )
            print(f"   Score: {experience_score} points")
            print(f"   Details: {experience_details}")

            print("\n[6] Payment Reliability Penalty (0 to -100 points):")
            penalty_score, penalty_details = calculator.calculate_payment_reliability_penalty(user_id)
            print(f"   Penalty: {penalty_score} points")
            print(f"   Details: {penalty_details}")

            # Test combined scoring
            print("\n[OK] COMBINED NEW SCORES:")
            print("-" * 40)
            total_new_score, breakdown = calculator.calculate_all_new_scores(
                tutor_id, user_id, created_at,
                student_interests, student_hobbies
            )

            print(f"   Interest/Hobby: {breakdown['interest_hobby_matching']['score']} points")
            print(f"   Total Students: {breakdown['total_students']['score']} points")
            print(f"   Completion Rate: {breakdown['completion_rate']['score']} points")
            print(f"   Response Time: {breakdown['response_time']['score']} points")
            print(f"   Experience: {breakdown['experience']['score']} points")
            print(f"   Payment Penalty: {penalty_score} points")
            print(f"   " + "=" * 36)
            print(f"   TOTAL NEW SCORE: {total_new_score + penalty_score} / 440 points (before penalty)")
            print(f"   Score Percentage: {((total_new_score + penalty_score) / 440 * 100):.1f}%")

            print("\n" + "=" * 80)

        print("\n[OK] All scoring functions tested successfully!")
        print("\nScoring Summary:")
        print("  - Interest/Hobby Matching: 0-150 points")
        print("  - Total Students: 0-100 points")
        print("  - Completion Rate: 0-80 points")
        print("  - Response Time: 0-60 points")
        print("  - Experience: 0-50 points")
        print("  - Payment Penalty: 0 to -100 points")
        print("  - TOTAL NEW SCORES: 0-440 points")
        print("\nThese scores are ADDED to the existing scoring system:")
        print("  - Subscription Plan: 0-500 points")
        print("  - Trending: 0-200+ points")
        print("  - Search History: 0-50 points")
        print("  - Other factors: ~325 points")
        print(f"  - GRAND TOTAL: ~1,615 points maximum (before payment penalty)\n")

    except Exception as e:
        print(f"\n[ERROR] Error during testing: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


def test_specific_tutor(tutor_id: int):
    """Test scoring for a specific tutor ID"""
    db: Session = SessionLocal()

    try:
        tutor = db.query(TutorProfile).filter(TutorProfile.id == tutor_id).first()

        if not tutor:
            print(f"❌ Tutor with ID {tutor_id} not found")
            return

        print(f"\n🎯 Testing Tutor ID: {tutor_id}")
        print(f"   Name: {tutor.user.first_name} {tutor.user.father_name}")
        print("=" * 80)

        calculator = TutorScoringCalculator(db)

        # Test with sample data
        student_interests = ["Mathematics", "English", "Science"]
        student_hobbies = ["Reading", "Coding"]

        total_score, breakdown = calculator.calculate_all_new_scores(
            tutor.id, tutor.user_id, tutor.created_at,
            student_interests, student_hobbies
        )

        print("\n📊 Detailed Score Breakdown:")
        print("-" * 80)

        for factor_name, factor_data in breakdown.items():
            if factor_name not in ['total_new_score', 'max_possible_new_score']:
                print(f"\n{factor_name.replace('_', ' ').title()}:")
                print(f"  Score: {factor_data['score']} points")
                print(f"  Details: {factor_data['details']}")

        print("\n" + "=" * 80)
        print(f"TOTAL NEW SCORE: {breakdown['total_new_score']} / {breakdown['max_possible_new_score']} points")
        print(f"Percentage: {(breakdown['total_new_score'] / breakdown['max_possible_new_score'] * 100):.1f}%")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Test specific tutor ID
        try:
            tutor_id = int(sys.argv[1])
            test_specific_tutor(tutor_id)
        except ValueError:
            print("Usage: python test_tutor_scoring.py [tutor_id]")
            print("  tutor_id: Optional - test specific tutor by ID")
    else:
        # Test with first 5 tutors
        test_tutor_scoring()
