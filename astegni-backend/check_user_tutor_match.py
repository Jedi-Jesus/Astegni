from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
engine = create_engine(os.getenv('DATABASE_URL'))

with engine.connect() as conn:
    # Get user_id for jediael.s.abebe@gmail.com
    result = conn.execute(text("""
        SELECT id, first_name, father_name, email, roles, active_role
        FROM users
        WHERE email = 'jediael.s.abebe@gmail.com'
    """))

    user_row = result.fetchone()
    if user_row:
        user_id = user_row[0]
        print(f"\n[OK] User found:")
        print(f"   user_id: {user_id}")
        print(f"   name: {user_row[1]} {user_row[2]}")
        print(f"   email: {user_row[3]}")
        print(f"   roles: {user_row[4]}")
        print(f"   active_role: {user_row[5]}")

        # Check if user has tutor profile
        result = conn.execute(text("""
            SELECT id, user_id, is_active
            FROM tutor_profiles
            WHERE user_id = :user_id
        """), {"user_id": user_id})

        tutor_row = result.fetchone()
        if tutor_row:
            print(f"\n[OK] Tutor profile found:")
            print(f"   tutor_profile.id: {tutor_row[0]}")
            print(f"   tutor_profile.user_id: {tutor_row[1]}")
            print(f"   is_active: {tutor_row[2]}")

            if tutor_row[1] == user_id:
                print(f"\n[OK] MATCH: tutor_profile.user_id ({tutor_row[1]}) == users.id ({user_id})")
                print(f"\n[TEST] Testing filter: TutorProfile.user_id != {user_id}")
                print(f"   This tutor SHOULD be excluded from results when exclude_user_id={user_id}")
            else:
                print(f"\n[ERROR] MISMATCH: tutor_profile.user_id ({tutor_row[1]}) != users.id ({user_id})")
        else:
            print(f"\n[ERROR] No tutor profile found for user_id={user_id}")
    else:
        print("\n[ERROR] User not found")
