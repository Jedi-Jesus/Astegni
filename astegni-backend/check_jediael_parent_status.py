import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User, ParentProfile

db = SessionLocal()

# Get user
user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()

print(f"User ID: {user.id}")
print(f"Email: {user.email}")
print(f"Roles array: {user.roles}")
print(f"Active role: {user.active_role}")
print()

# Get parent profile
parent = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()

if parent:
    print(f"Parent profile exists: YES")
    print(f"Parent profile is_active: {parent.is_active}")
else:
    print(f"Parent profile exists: NO")

db.close()
