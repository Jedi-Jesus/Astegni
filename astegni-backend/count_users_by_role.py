"""
Count users by role in the database
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

def count_users_by_role():
    """Count users by their role"""
    db = SessionLocal()
    try:
        # Get total users
        total_users = db.execute(text("SELECT COUNT(*) FROM users")).scalar()
        print(f"\n{'='*60}")
        print(f"TOTAL USERS: {total_users}")
        print(f"{'='*60}\n")

        # Count students
        students = db.execute(text("SELECT COUNT(*) FROM student_profiles")).scalar()
        print(f"Students: {students}")

        # Count tutors
        tutors = db.execute(text("SELECT COUNT(*) FROM tutor_profiles")).scalar()
        print(f"Tutors: {tutors}")

        # Count parents
        parents = db.execute(text("SELECT COUNT(*) FROM parent_profiles")).scalar()
        print(f"Parents: {parents}")

        # Count advertisers
        advertisers = db.execute(text("SELECT COUNT(*) FROM advertiser_profiles")).scalar()
        print(f"Advertisers: {advertisers}")

        # Count generic user profiles (users without specific roles)
        user_profiles = db.execute(text("SELECT COUNT(*) FROM user_profiles")).scalar()
        print(f"Generic User Profiles: {user_profiles}")

        print(f"\n{'='*60}")

        # Check for users without any role profile
        users_with_roles = students + tutors + parents + advertisers + user_profiles
        users_without_role = total_users - users_with_roles
        if users_without_role > 0:
            print(f"Users without any profile: {users_without_role}")

        # Note: Users can have multiple roles
        print(f"\nNote: Users can have multiple role profiles")
        print(f"(e.g., a user can be both a student and a tutor)")
        print(f"{'='*60}\n")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    count_users_by_role()
