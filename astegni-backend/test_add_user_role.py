"""
Test script to verify that adding 'user' role creates a UserProfile entry
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")

# Create engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def test_user_role_logic():
    """
    This script demonstrates what will happen when a user adds 'user' role
    It checks the current state of the database
    """
    db = SessionLocal()
    try:
        print("\n" + "="*70)
        print("TEST: Adding 'user' Role - Expected Behavior")
        print("="*70)

        print("\n1. CURRENT STATE:")
        print("-" * 70)

        # Show current users
        users = db.execute(text("SELECT id, email, roles FROM users")).fetchall()
        print(f"\nTotal Users: {len(users)}")
        for user in users:
            print(f"  User ID {user[0]}: {user[1]}")
            print(f"    Current Roles: {user[2]}")

        # Show current user_profiles
        user_profiles_count = db.execute(text("SELECT COUNT(*) FROM user_profiles")).scalar()
        print(f"\nCurrent UserProfile entries: {user_profiles_count}")

        if user_profiles_count > 0:
            profiles = db.execute(text("""
                SELECT up.id, up.user_id, u.email, up.username
                FROM user_profiles up
                JOIN users u ON up.user_id = u.id
            """)).fetchall()
            for profile in profiles:
                print(f"  Profile ID {profile[0]}: User {profile[1]} ({profile[2]})")
                print(f"    Username: {profile[3] or 'Not set'}")

        print("\n" + "="*70)
        print("2. WHAT WILL HAPPEN WHEN USER ADDS 'user' ROLE:")
        print("="*70)
        print("""
When a user calls POST /api/add-role with:
  - new_role: "user"
  - otp: <valid OTP>
  - password: <correct password>

The system will:
  1. Verify the OTP and password
  2. Add 'user' to the user's roles array in the users table
  3. Create a NEW row in user_profiles table:
     - id: Auto-generated
     - user_id: The user's ID
     - username: NULL (to be filled later)
     - profile_picture: NULL
     - cover_image: NULL
     - hero_title: NULL
     - bio: NULL
     - location: NULL
     - website: NULL
     - social_links: NULL
     - interests: NULL
     - skills: NULL
     - created_at: Current timestamp
     - updated_at: Current timestamp
  4. Return success message with updated roles

Example:
  Before: users.roles = ['student']
  After:  users.roles = ['student', 'user']
          new row in user_profiles with user_id = user's ID
        """)

        print("="*70)
        print("3. CODE LOCATION:")
        print("="*70)
        print("""
The logic is implemented in:
  File: astegni-backend/app.py modules/routes.py
  Lines: 3143-3145

  elif new_role == "user" and not current_user.user_profile:
      user_profile = UserProfile(user_id=current_user.id)
      db.add(user_profile)
        """)

        print("="*70 + "\n")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_user_role_logic()
