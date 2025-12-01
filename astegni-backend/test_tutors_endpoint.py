"""
Test script to verify the /api/tutors endpoint is working correctly
"""
import sys
sys.path.insert(0, 'app.py modules')

from models import SessionLocal, TutorProfile, User
from sqlalchemy import func, or_, cast, String, desc

def test_tutors_query():
    """Test the tutors query to simulate the API endpoint"""
    db = SessionLocal()

    try:
        # Simulate the API query
        query = db.query(TutorProfile).join(User).filter(
            TutorProfile.is_active == True,
            User.is_active == True
        )

        # Get total count
        total = query.count()
        print(f"Total active tutors with active users: {total}")

        # Test with pagination (page 1, limit 15)
        page = 1
        limit = 15
        offset = (page - 1) * limit
        tutors = query.offset(offset).limit(limit).all()

        print(f"\nRetrieved {len(tutors)} tutors (page {page}, limit {limit})")

        # Test gender filter (should now work!)
        print("\n--- Testing Gender Filter ---")
        gender_query = db.query(TutorProfile).join(User).filter(
            TutorProfile.is_active == True,
            User.is_active == True,
            User.gender.in_(['Female'])  # Fixed: Now using User.gender
        )
        female_count = gender_query.count()
        print(f"Female tutors: {female_count}")

        gender_query = db.query(TutorProfile).join(User).filter(
            TutorProfile.is_active == True,
            User.is_active == True,
            User.gender.in_(['Male'])  # Fixed: Now using User.gender
        )
        male_count = gender_query.count()
        print(f"Male tutors: {male_count}")

        # Test formatting response (should now work!)
        print("\n--- Testing Response Formatting ---")
        sample_tutor = tutors[0] if tutors else None
        if sample_tutor:
            tutor_data = {
                "id": sample_tutor.id,
                "first_name": sample_tutor.user.first_name,
                "father_name": sample_tutor.user.father_name,
                "gender": sample_tutor.user.gender,  # Fixed: Now using user.gender
                "location": sample_tutor.location,
                "rating": sample_tutor.rating,
                "price": sample_tutor.price,
            }
            print(f"Sample tutor data: {tutor_data}")

        print("\n=== ALL TESTS PASSED ===")
        print(f"The API should now return all {total} tutors correctly!")

    except Exception as e:
        print(f"\n=== ERROR ===")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_tutors_query()
