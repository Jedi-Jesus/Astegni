import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User

db = SessionLocal()

# Get user
user = db.query(User).filter(User.email == 'jediael.s.abebe@gmail.com').first()

print(f"BEFORE FIX:")
print(f"User ID: {user.id}")
print(f"Email: {user.email}")
print(f"Active role: {user.active_role}")
print()

# Fix active_role to None
user.active_role = None
db.commit()

print(f"AFTER FIX:")
print(f"Active role: {user.active_role}")
print(f"✅ Fixed! User's active_role is now None")

db.close()
