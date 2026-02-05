"""
Migrate subscription fields from profile tables to users table
Making subscriptions user-based instead of role-based
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("MIGRATING SUBSCRIPTION FIELDS TO USERS TABLE")
print("=" * 80)

with engine.connect() as conn:
    # Step 1: Add subscription fields to users table
    print("\n1. Adding subscription fields to users table...")

    add_fields_query = text("""
        -- Add subscription fields to users table
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER,
        ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

        -- Add comment to document the relationship
        COMMENT ON COLUMN users.subscription_plan_id IS 'References subscription_plans.id in admin database';

        -- Create indexes for faster queries
        CREATE INDEX IF NOT EXISTS idx_users_subscription_plan
            ON users(subscription_plan_id);

        CREATE INDEX IF NOT EXISTS idx_users_subscription_expires
            ON users(subscription_expires_at);
    """)

    conn.execute(add_fields_query)
    conn.commit()
    print("[OK] Added subscription fields to users table")

    # Step 2: Migrate data from tutor_profiles to users
    print("\n2. Migrating subscription data from tutor_profiles to users...")

    migrate_tutor_query = text("""
        UPDATE users u
        SET
            subscription_plan_id = tp.subscription_plan_id,
            subscription_started_at = tp.subscription_started_at,
            subscription_expires_at = tp.subscription_expires_at
        FROM tutor_profiles tp
        WHERE u.id = tp.user_id
          AND tp.subscription_plan_id IS NOT NULL;
    """)

    result = conn.execute(migrate_tutor_query)
    conn.commit()
    print(f"[OK] Migrated {result.rowcount} tutor subscription records to users table")

    # Step 3: Migrate data from student_profiles to users
    print("\n3. Migrating subscription data from student_profiles to users...")

    migrate_student_query = text("""
        UPDATE users u
        SET
            subscription_plan_id = sp.subscription_plan_id,
            subscription_started_at = sp.subscription_started_at,
            subscription_expires_at = sp.subscription_expires_at
        FROM student_profiles sp
        WHERE u.id = sp.user_id
          AND sp.subscription_plan_id IS NOT NULL
          AND u.subscription_plan_id IS NULL;  -- Don't overwrite if already set from tutor
    """)

    result = conn.execute(migrate_student_query)
    conn.commit()
    print(f"[OK] Migrated {result.rowcount} student subscription records to users table")

    # Step 4: Drop subscription fields from tutor_profiles
    print("\n4. Dropping subscription fields from tutor_profiles...")

    drop_tutor_fields_query = text("""
        ALTER TABLE tutor_profiles
        DROP COLUMN IF EXISTS subscription_plan_id,
        DROP COLUMN IF EXISTS subscription_started_at,
        DROP COLUMN IF EXISTS subscription_expires_at;
    """)

    conn.execute(drop_tutor_fields_query)
    conn.commit()
    print("[OK] Dropped subscription fields from tutor_profiles")

    # Step 5: Drop subscription fields from student_profiles
    print("\n5. Dropping subscription fields from student_profiles...")

    drop_student_fields_query = text("""
        ALTER TABLE student_profiles
        DROP COLUMN IF EXISTS subscription_plan_id,
        DROP COLUMN IF EXISTS subscription_started_at,
        DROP COLUMN IF EXISTS subscription_expires_at;
    """)

    conn.execute(drop_student_fields_query)
    conn.commit()
    print("[OK] Dropped subscription fields from student_profiles")

    # Step 6: Verify migration
    print("\n6. Verifying migration...")

    verify_query = text("""
        SELECT
            COUNT(*) as total_users,
            COUNT(subscription_plan_id) as users_with_subscription
        FROM users;
    """)

    result = conn.execute(verify_query)
    row = result.fetchone()

    print(f"\n[OK] Verification complete:")
    print(f"    Total users: {row.total_users}")
    print(f"    Users with subscription: {row.users_with_subscription}")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE!")
print("=" * 80)
print("\nSubscription fields are now in the users table:")
print("  - subscription_plan_id")
print("  - subscription_started_at")
print("  - subscription_expires_at")
print("\n" + "=" * 80)
