"""
Test that SQLAlchemy models work correctly after subscription migration
"""
from app import SessionLocal
from sqlalchemy import select
import sys

print("\n" + "=" * 80)
print("TESTING SQLALCHEMY MODELS")
print("=" * 80)

try:
    db = SessionLocal()

    # Test 1: Import models
    print("\n1. Importing models...")
    try:
        import sys
        sys.path.insert(0, 'app.py modules')
        from models import User, TutorProfile, StudentProfile
        print("[OK] Models imported successfully")
    except Exception as e:
        print(f"[ERROR] Failed to import models: {e}")
        sys.exit(1)

    # Test 2: Query User model with subscription fields
    print("\n2. Testing User model with subscription fields...")
    try:
        users = db.query(User).filter(User.subscription_plan_id.isnot(None)).limit(3).all()
        if users:
            print(f"[OK] Found {len(users)} users with subscriptions:")
            for user in users:
                print(f"    User {user.id} ({user.email}): Plan {user.subscription_plan_id}")
        else:
            print("[WARNING] No users with subscriptions found")
    except Exception as e:
        print(f"[ERROR] Failed to query User model: {e}")
        sys.exit(1)

    # Test 3: Query TutorProfile model (should not have subscription fields)
    print("\n3. Testing TutorProfile model...")
    try:
        tutors = db.query(TutorProfile).limit(3).all()
        if tutors:
            print(f"[OK] Found {len(tutors)} tutor profiles:")
            for tutor in tutors:
                print(f"    Tutor {tutor.id} (user_id: {tutor.user_id})")
                # Check if subscription fields exist on the model
                if hasattr(tutor, 'subscription_plan_id'):
                    print(f"    [WARNING] TutorProfile still has subscription_plan_id attribute")
        else:
            print("[WARNING] No tutor profiles found")
    except Exception as e:
        print(f"[ERROR] Failed to query TutorProfile model: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Test 4: Query StudentProfile model (should not have subscription fields)
    print("\n4. Testing StudentProfile model...")
    try:
        students = db.query(StudentProfile).limit(3).all()
        if students:
            print(f"[OK] Found {len(students)} student profiles:")
            for student in students:
                print(f"    Student {student.id} (user_id: {student.user_id})")
                # Check if subscription fields exist on the model
                if hasattr(student, 'subscription_plan_id'):
                    print(f"    [WARNING] StudentProfile still has subscription_plan_id attribute")
        else:
            print("[INFO] No student profiles found")
    except Exception as e:
        print(f"[ERROR] Failed to query StudentProfile model: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Test 5: Join User and TutorProfile
    print("\n5. Testing join between User and TutorProfile...")
    try:
        results = db.query(User, TutorProfile).join(
            TutorProfile, User.id == TutorProfile.user_id
        ).filter(User.subscription_plan_id.isnot(None)).limit(3).all()

        if results:
            print(f"[OK] Successfully joined {len(results)} users with tutor profiles:")
            for user, tutor in results:
                print(f"    User {user.id} ({user.email}) -> Tutor {tutor.id}, Plan {user.subscription_plan_id}")
        else:
            print("[WARNING] No joined results found")
    except Exception as e:
        print(f"[ERROR] Failed to join models: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    db.close()
    print("\n" + "=" * 80)
    print("ALL TESTS PASSED!")
    print("=" * 80)

except Exception as e:
    print(f"\n[FATAL ERROR] {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
