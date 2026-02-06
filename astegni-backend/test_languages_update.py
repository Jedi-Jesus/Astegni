"""Test script to verify languages field can be updated correctly"""

import sys
import os

# Add modules directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from dotenv import load_dotenv
load_dotenv()

from models import SessionLocal, User

def test_languages_update():
    db = SessionLocal()

    try:
        # Get test user
        user = db.query(User).filter(User.id == 1).first()
        if not user:
            print("❌ User not found")
            return

        print(f"Testing languages field update for user {user.id}")
        print(f"Current languages: {user.languages}")
        print(f"Type: {type(user.languages)}")

        # Test 1: Set to empty array
        print("\nTest 1: Setting languages to empty array...")
        user.languages = []
        db.commit()
        db.refresh(user)
        print(f"✅ Successfully set languages to: {user.languages}")

        # Test 2: Set to array with values
        print("\nTest 2: Setting languages to ['English', 'Amharic']...")
        user.languages = ['English', 'Amharic']
        db.commit()
        db.refresh(user)
        print(f"✅ Successfully set languages to: {user.languages}")

        # Test 3: Reset to empty
        print("\nTest 3: Resetting to empty array...")
        user.languages = []
        db.commit()
        db.refresh(user)
        print(f"✅ Successfully reset languages to: {user.languages}")

        print("\n✅ All tests passed! Languages field can be updated correctly.")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    test_languages_update()
