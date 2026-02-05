"""
Test that the subscription model changes work correctly
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("TESTING SUBSCRIPTION MODEL CHANGES")
print("=" * 80)

with engine.connect() as conn:
    # Test 1: Query users table for subscriptions
    print("\n1. Testing users table subscription fields...")
    users_query = text("""
        SELECT id, email, subscription_plan_id, subscription_started_at, subscription_expires_at
        FROM users
        WHERE subscription_plan_id IS NOT NULL
        LIMIT 5
    """)

    result = conn.execute(users_query)
    rows = result.fetchall()

    if rows:
        print(f"[OK] Found {len(rows)} users with subscriptions:")
        for row in rows:
            print(f"    User {row.id} ({row.email}): Plan {row.subscription_plan_id}")
    else:
        print("[WARNING] No users with subscriptions found")

    # Test 2: Verify tutor_profiles no longer has subscription fields
    print("\n2. Verifying tutor_profiles table schema...")
    tutor_columns_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tutor_profiles'
        AND column_name LIKE '%subscription%'
    """)

    result = conn.execute(tutor_columns_query)
    tutor_sub_columns = result.fetchall()

    if tutor_sub_columns:
        print(f"[ERROR] tutor_profiles still has subscription columns: {[col[0] for col in tutor_sub_columns]}")
    else:
        print("[OK] tutor_profiles has no subscription columns")

    # Test 3: Verify student_profiles no longer has subscription fields
    print("\n3. Verifying student_profiles table schema...")
    student_columns_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'student_profiles'
        AND column_name LIKE '%subscription%'
    """)

    result = conn.execute(student_columns_query)
    student_sub_columns = result.fetchall()

    if student_sub_columns:
        print(f"[ERROR] student_profiles still has subscription columns: {[col[0] for col in student_sub_columns]}")
    else:
        print("[OK] student_profiles has no subscription columns")

    # Test 4: Test joining users with tutor_profiles
    print("\n4. Testing join between users and tutor_profiles...")
    join_query = text("""
        SELECT
            u.id as user_id,
            u.email,
            u.subscription_plan_id,
            tp.id as tutor_profile_id
        FROM users u
        JOIN tutor_profiles tp ON u.id = tp.user_id
        WHERE u.subscription_plan_id IS NOT NULL
        LIMIT 3
    """)

    result = conn.execute(join_query)
    rows = result.fetchall()

    if rows:
        print(f"[OK] Successfully joined users and tutor_profiles:")
        for row in rows:
            print(f"    User {row.user_id} -> Tutor Profile {row.tutor_profile_id}, Plan {row.subscription_plan_id}")
    else:
        print("[WARNING] No tutor users with subscriptions found")

print("\n" + "=" * 80)
print("TEST COMPLETE!")
print("=" * 80)
