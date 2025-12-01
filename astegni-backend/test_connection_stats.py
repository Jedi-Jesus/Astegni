"""Test script to diagnose the /api/connections/stats 422 error"""
import sys
import os

# Add modules directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

# Test imports
try:
    from models import User, Connection, SessionLocal
    print("[OK] Successfully imported models")
except Exception as e:
    print(f"[ERROR] Failed to import models: {e}")
    sys.exit(1)

try:
    from utils import get_current_user
    print("[OK] Successfully imported get_current_user")
except Exception as e:
    print(f"[ERROR] Failed to import get_current_user: {e}")
    sys.exit(1)

# Test database connection
try:
    db = SessionLocal()
    # Try to query a user
    user = db.query(User).first()
    if user:
        print(f"[OK] Database connection successful. Found user: {user.email}")
        print(f"     User ID: {user.id}, Active: {user.is_active}")
    else:
        print("[WARN] Database connection successful but no users found")
    db.close()
except Exception as e:
    print(f"[ERROR] Database error: {e}")
    sys.exit(1)

print("\n[OK] All imports and database connection working correctly!")
print("The 422 error is likely related to authentication/token validation.")
