"""Check users in database"""
import sys
sys.path.insert(0, 'app.py modules')

from models import SessionLocal, User

db = SessionLocal()
users = db.query(User).limit(10).all()

print("=" * 60)
print("USERS IN DATABASE")
print("=" * 60)

for u in users:
    print(f"  ID: {u.id}")
    print(f"  Email: {u.email}")
    print(f"  Roles: {u.roles}")
    print(f"  Name: {u.first_name} {u.father_name}")
    print(f"  Password hash: {u.password_hash[:30]}...")
    print("-" * 60)

db.close()
