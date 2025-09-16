# check_and_fix_tutors.py
from app import SessionLocal, User
from tutor_models import TutorProfile

db = SessionLocal()

# Get ALL users and check their roles manually
all_users = db.query(User).all()
tutor_users = []

for user in all_users:
    if user.roles and 'tutor' in user.roles:
        tutor_users.append(user)
        print(f"Found tutor: {user.first_name} {user.last_name} - Roles: {user.roles}")

print(f"\nTotal tutors found: {len(tutor_users)}")

# Check existing profiles
for user in tutor_users:
    profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
    if profile:
        print(f"Profile exists for {user.first_name}: Complete={profile.profile_complete}, Active={profile.is_active}")
        
        # Force update to make visible
        if not profile.profile_complete:
            profile.profile_complete = True
            profile.is_active = True
            print(f"  -> Updated to complete and active")

db.commit()
db.close()