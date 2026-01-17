"""
Auto-Assign Expertise Badges to Tutors

This script automatically calculates and assigns expertise badges (Expert, Intermediate, Beginner, Tutor)
based on a comprehensive scoring system that considers:
1. Teaching experience (years)
2. Average rating from student reviews
3. Total students taught
4. Total hours taught
5. Courses created
6. Verification status

Scoring System:
- Expert Educator: Score >= 70 points (Exceptional tutors with proven track record)
- Intermediate Educator: Score >= 40 points (Experienced tutors with good performance)
- Beginner Educator: Score >= 15 points (New tutors building their reputation)
- Tutor: Score < 15 points (Entry-level tutors)
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

def calculate_expertise_score(tutor_data):
    """
    Calculate expertise score based on multiple factors

    Scoring Breakdown:
    - Experience: 0-30 points (3 points per year, max 10 years)
    - Rating: 0-30 points (6 points per star, max 5 stars)
    - Review Count: 0-20 points (0.5 points per review, max 40 reviews)
    - Courses Created: 0-15 points (3 points per course, max 5 courses)
    - Verification Status: +5 bonus points if verified

    Total possible: 100 points
    """
    score = 0

    # 1. Experience Points (0-30 points)
    experience_years = tutor_data['experience'] or 0
    experience_points = min(experience_years * 3, 30)
    score += experience_points

    # 2. Rating Points (0-30 points)
    rating = tutor_data['rating'] or 0
    rating_points = rating * 6  # 6 points per star
    score += rating_points

    # 3. Review Count Points (0-20 points) - Proxy for students taught
    review_count = tutor_data['review_count'] or 0
    review_points = min(review_count * 0.5, 20)
    score += review_points

    # 4. Courses Created Points (0-15 points)
    courses_created = tutor_data['courses_created'] or 0
    courses_points = min(courses_created * 3, 15)
    score += courses_points

    # 5. Verification Bonus (+5 points)
    is_verified = tutor_data['is_verified'] or False
    if is_verified:
        score += 5

    return round(score, 2)

def get_expertise_badge(score):
    """
    Determine expertise badge based on score

    Thresholds:
    - Expert Educator: 70+ points (Top 10-15% of tutors)
    - Intermediate Educator: 40-69 points (Top 40-50% of tutors)
    - Beginner Educator: 15-39 points (Developing tutors)
    - Tutor: 0-14 points (New tutors)
    """
    if score >= 70:
        return "Expert Educator"
    elif score >= 40:
        return "Intermediate Educator"
    elif score >= 15:
        return "Beginner Educator"
    else:
        return "Tutor"

def calculate_and_assign_badges(dry_run=True):
    """
    Calculate expertise scores for all tutors and assign badges

    Args:
        dry_run: If True, only show what would be changed without updating database
    """
    db = SessionLocal()

    try:
        print("=" * 100)
        print("EXPERTISE BADGE AUTO-ASSIGNMENT SYSTEM")
        print("=" * 100)
        print(f"Mode: {'DRY RUN (no changes will be made)' if dry_run else 'LIVE (database will be updated)'}")
        print()

        # Fetch all tutors with their metrics
        query = text("""
            SELECT
                tp.id,
                tp.user_id,
                u.email,
                tp.username,
                tp.experience,
                tp.courses_created,
                u.is_verified,
                tp.expertise_badge as current_badge,
                COALESCE(AVG(tr.rating), 0) as rating,
                COUNT(tr.id) as review_count
            FROM tutor_profiles tp
            JOIN users u ON tp.user_id = u.id
            LEFT JOIN tutor_reviews tr ON tp.id = tr.tutor_id
            GROUP BY tp.id, tp.user_id, u.email, tp.username, tp.experience,
                     tp.courses_created, u.is_verified, tp.expertise_badge
            ORDER BY tp.id
        """)

        tutors = db.execute(query).fetchall()

        print(f"Found {len(tutors)} tutors to process\n")
        print("=" * 100)

        # Statistics
        badge_changes = {
            "Expert Educator": 0,
            "Intermediate Educator": 0,
            "Beginner Educator": 0,
            "Tutor": 0
        }
        total_changes = 0

        # Process each tutor
        for tutor in tutors:
            tutor_data = {
                'id': tutor[0],
                'user_id': tutor[1],
                'email': tutor[2],
                'username': tutor[3],
                'experience': tutor[4],
                'courses_created': tutor[5],
                'is_verified': tutor[6],
                'current_badge': tutor[7],
                'rating': float(tutor[8]) if tutor[8] else 0,
                'review_count': tutor[9]
            }

            # Calculate score
            score = calculate_expertise_score(tutor_data)
            new_badge = get_expertise_badge(score)

            # Check if badge changed
            changed = tutor_data['current_badge'] != new_badge
            if changed:
                total_changes += 1
                badge_changes[new_badge] += 1

            # Print tutor details
            status_icon = "[CHANGE]" if changed else "[SAME]"
            print(f"{status_icon} | Tutor ID: {tutor_data['id']} | Email: {tutor_data['email']}")
            print(f"   Username: {tutor_data['username'] or 'Not set'}")
            print(f"   Score: {score}/100 points")
            print(f"   Breakdown:")
            print(f"     * Experience: {tutor_data['experience']} years -> {min(tutor_data['experience'] * 3, 30):.1f} pts")
            print(f"     * Rating: {tutor_data['rating']:.1f}/5.0 ({tutor_data['review_count']} reviews) -> {tutor_data['rating'] * 6:.1f} pts")
            print(f"     * Review Count: {tutor_data['review_count']} reviews -> {min(tutor_data['review_count'] * 0.5, 20):.1f} pts")
            print(f"     * Courses: {tutor_data['courses_created']} -> {min(tutor_data['courses_created'] * 3, 15):.1f} pts")
            print(f"     * Verified: {'Yes (+5 pts)' if tutor_data['is_verified'] else 'No (0 pts)'}")
            print(f"   Current Badge: {tutor_data['current_badge']}")
            print(f"   New Badge: {new_badge}")

            # Update database if not dry run
            if not dry_run and changed:
                update_query = text("""
                    UPDATE tutor_profiles
                    SET expertise_badge = :new_badge
                    WHERE id = :tutor_id
                """)
                db.execute(update_query, {"new_badge": new_badge, "tutor_id": tutor_data['id']})
                print(f"   [OK] Database updated!")

            print("-" * 100)

        # Commit changes if not dry_run
        if not dry_run:
            db.commit()
            print("\n[OK] All changes committed to database!")

        # Print summary
        print("\n" + "=" * 100)
        print("SUMMARY")
        print("=" * 100)
        print(f"Total tutors processed: {len(tutors)}")
        print(f"Total badge changes: {total_changes}")
        print()
        print("Badge Distribution (after assignment):")
        for badge, count in badge_changes.items():
            print(f"  * {badge}: {count} tutors")
        print("=" * 100)

        if dry_run:
            print("\n[WARNING] This was a DRY RUN. No changes were made to the database.")
            print("To apply changes, run: python auto_assign_expertise_badges.py --live")
        else:
            print("\n[SUCCESS] LIVE RUN COMPLETED. Database has been updated.")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import sys

    # Check if --live flag is provided
    live_mode = "--live" in sys.argv

    print("\n")
    if live_mode:
        confirm = input("[WARNING] You are about to UPDATE the database. Continue? (yes/no): ")
        if confirm.lower() != "yes":
            print("Aborted.")
            sys.exit(0)

    calculate_and_assign_badges(dry_run=not live_mode)
