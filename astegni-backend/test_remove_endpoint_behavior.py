"""
Test the actual behavior of the role removal endpoint
This simulates what happens when you call DELETE /api/role/remove
"""
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'app.py modules'))

from models import SessionLocal, User, StudentProfile, TutorProfile, ParentProfile, AdvertiserProfile, UserProfile, OTP
import bcrypt
from datetime import datetime, timedelta

def test_role_removal_logic(user_email, role_to_remove, password):
    """
    Test exactly what the remove_role endpoint does
    WITHOUT actually executing it
    """

    db = SessionLocal()

    print("=" * 80)
    print("Testing Role Removal Logic")
    print("=" * 80)
    print()

    try:
        # Step 1: Get user
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            print(f"[ERROR] User not found: {user_email}")
            return

        print(f"User: {user.email}")
        print(f"User ID: {user.id}")
        print(f"Roles: {user.roles}")
        print(f"Active Role: {user.active_role}")
        print()

        # Step 2: Verify password (just check, don't fail)
        password_match = bcrypt.checkpw(
            password.encode('utf-8'),
            user.password_hash.encode('utf-8')
        )
        print(f"Password Match: {password_match}")
        if not password_match:
            print("[ERROR] Password doesn't match!")
            return
        print()

        # Step 3: Check if user has this role
        if role_to_remove not in user.roles:
            print(f"[ERROR] User doesn't have '{role_to_remove}' role")
            print(f"Available roles: {user.roles}")
            return

        print(f"[OK] User has '{role_to_remove}' role")
        print()

        # Step 4: Find the profile
        print(f"Looking for {role_to_remove} profile...")
        role_model = None

        if role_to_remove == 'student':
            role_model = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        elif role_to_remove == 'tutor':
            role_model = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
        elif role_to_remove == 'parent':
            role_model = db.query(ParentProfile).filter(ParentProfile.user_id == user.id).first()
        elif role_to_remove == 'advertiser':
            role_model = db.query(AdvertiserProfile).filter(AdvertiserProfile.user_id == user.id).first()
        elif role_to_remove == 'user':
            role_model = db.query(UserProfile).filter(UserProfile.user_id == user.id).first()

        if not role_model:
            print(f"[ERROR] Profile not found!")
            return

        print(f"[OK] Found profile (ID: {role_model.id})")
        print(f"  Current is_active: {role_model.is_active}")
        print(f"  Current scheduled_deletion_at: {role_model.scheduled_deletion_at}")
        print()

        # Step 5: Simulate what SHOULD happen
        print("What SHOULD happen according to role_management_endpoints.py:")
        print(f"  1. Set is_active = False")
        print(f"  2. Set scheduled_deletion_at = NOW() + 90 days")

        scheduled_time = datetime.utcnow() + timedelta(days=90)
        print(f"     (Would be: {scheduled_time})")

        print(f"  3. Keep role in users.roles array (for restoration)")
        print(f"  4. Clear active_role if it was '{role_to_remove}'")
        print(f"  5. Return success=True with 90-day message")
        print()

        # Step 6: Check if column exists
        from sqlalchemy import inspect
        inspector = inspect(db.bind)
        columns = [col['name'] for col in inspector.get_columns(f'{role_to_remove}_profiles')]

        if 'scheduled_deletion_at' in columns:
            print(f"[OK] scheduled_deletion_at column exists in {role_to_remove}_profiles")
        else:
            print(f"[ERROR] scheduled_deletion_at column MISSING from {role_to_remove}_profiles")
            print("       This would cause a database error!")

        print()
        print("=" * 80)
        print("CONCLUSION:")
        print("=" * 80)
        print()
        print("If you're seeing 'Removal failed' but data is deleted, possible causes:")
        print()
        print("1. Backend is returning an error (response.ok = false)")
        print("   - Maybe OTP is invalid")
        print("   - Maybe some other validation failed")
        print("   - Check backend terminal for errors")
        print()
        print("2. Frontend condition is wrong")
        print("   - Check if data.success exists in response")
        print("   - Look at browser console debug logs")
        print()
        print("3. Different endpoint is being called")
        print("   - Check Network tab in DevTools")
        print("   - Verify URL is DELETE /api/role/remove")
        print()
        print("4. There's old/conflicting code")
        print("   - Search for custom role deletion code")
        print()

    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print()
    print("This script tests the role removal logic WITHOUT actually deleting anything")
    print()

    # UPDATE THESE VALUES
    test_email = "jediael.s.abebe@gmail.com"
    test_role = "student"
    test_password = "@JesusJediael1234"

    print(f"Test User: {test_email}")
    print(f"Test Role: {test_role}")
    print()

    response = input("Continue? (y/n): ")
    if response.lower() == 'y':
        test_role_removal_logic(test_email, test_role, test_password)
    else:
        print("Cancelled")
