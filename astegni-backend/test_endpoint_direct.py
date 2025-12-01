"""
Test the admin endpoint directly to see the error
"""
import sys
import os
import traceback

# Add the modules directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import User, TutorProfile, Base
from utils import get_current_user
from config import DATABASE_URL

# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_admin_endpoint():
    """Test the failing query"""
    db = SessionLocal()

    try:
        print("Testing query that's failing in the endpoint...")

        # Try the exact query from the endpoint
        query = db.query(TutorProfile).join(User).filter(
            TutorProfile.verification_status == "pending"
        ).order_by(TutorProfile.created_at.desc())

        print(f"Query: {query}")

        total_count = query.count()
        print(f"Total count: {total_count}")

        tutors = query.limit(5).all()
        print(f"Found {len(tutors)} tutors")

        # Try to build the response like the endpoint does
        for tutor_profile in tutors:
            user = db.query(User).filter(User.id == tutor_profile.user_id).first()
            if user:
                name = f"{user.first_name} {user.father_name}"
                print(f"  - Tutor: {name}")

    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    test_admin_endpoint()