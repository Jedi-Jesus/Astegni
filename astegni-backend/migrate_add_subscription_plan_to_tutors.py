"""
Migration: Add subscription_plan_id to tutor_profiles table
============================================================

This migration:
1. Adds subscription_plan_id column to tutor_profiles (references subscription_plans in admin_db)
2. Adds subscription_started_at and subscription_expires_at columns
3. Populates all verified tutors with the Free plan (id=16) by default

Run: python migrate_add_subscription_plan_to_tutors.py
"""

import psycopg2
from datetime import datetime, timedelta

# Database connection settings
USER_DB_CONFIG = {
    'host': 'localhost',
    'database': 'astegni_user_db',
    'user': 'astegni_user',
    'password': 'Astegni2025'
}

ADMIN_DB_CONFIG = {
    'host': 'localhost',
    'database': 'astegni_admin_db',
    'user': 'astegni_user',
    'password': 'Astegni2025'
}

def run_migration():
    print("=" * 60)
    print("Migration: Add subscription_plan_id to tutor_profiles")
    print("=" * 60)

    # Connect to user database
    user_conn = psycopg2.connect(**USER_DB_CONFIG)
    user_cursor = user_conn.cursor()

    # Connect to admin database to get Free plan ID
    admin_conn = psycopg2.connect(**ADMIN_DB_CONFIG)
    admin_cursor = admin_conn.cursor()

    try:
        # Step 1: Get the Free plan ID from admin database
        print("\n[1/4] Getting Free plan ID from admin database...")
        admin_cursor.execute("""
            SELECT id, package_title, duration_days
            FROM subscription_plans
            WHERE package_title = 'Free' AND subscription_type = 'tutor' AND is_active = true
            LIMIT 1
        """)
        free_plan = admin_cursor.fetchone()

        if not free_plan:
            print("ERROR: Free plan not found in subscription_plans table!")
            return

        free_plan_id = free_plan[0]
        free_plan_title = free_plan[1]
        free_plan_duration = free_plan[2] or 365  # Default 1 year for free plan
        print(f"   Found Free plan: ID={free_plan_id}, Title='{free_plan_title}', Duration={free_plan_duration} days")

        # Step 2: Add columns to tutor_profiles if they don't exist
        print("\n[2/4] Adding subscription columns to tutor_profiles...")

        # Check if column exists
        user_cursor.execute("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'tutor_profiles' AND column_name = 'subscription_plan_id'
        """)

        if user_cursor.fetchone():
            print("   Column 'subscription_plan_id' already exists, skipping...")
        else:
            user_cursor.execute("""
                ALTER TABLE tutor_profiles
                ADD COLUMN subscription_plan_id INTEGER DEFAULT NULL,
                ADD COLUMN subscription_started_at TIMESTAMP DEFAULT NULL,
                ADD COLUMN subscription_expires_at TIMESTAMP DEFAULT NULL
            """)
            user_conn.commit()
            print("   Added columns: subscription_plan_id, subscription_started_at, subscription_expires_at")

        # Step 3: Count verified tutors without a subscription plan
        print("\n[3/4] Counting verified tutors without subscription plan...")
        user_cursor.execute("""
            SELECT COUNT(*) FROM tutor_profiles
            WHERE is_verified = true AND is_active = true
            AND (subscription_plan_id IS NULL OR subscription_plan_id = 0)
        """)
        tutors_to_update = user_cursor.fetchone()[0]
        print(f"   Found {tutors_to_update} verified tutors without subscription plan")

        # Step 4: Assign Free plan to all verified tutors
        if tutors_to_update > 0:
            print("\n[4/4] Assigning Free plan to verified tutors...")
            now = datetime.utcnow()
            expires_at = now + timedelta(days=free_plan_duration)

            user_cursor.execute("""
                UPDATE tutor_profiles
                SET
                    subscription_plan_id = %s,
                    subscription_started_at = %s,
                    subscription_expires_at = %s
                WHERE is_verified = true AND is_active = true
                AND (subscription_plan_id IS NULL OR subscription_plan_id = 0)
            """, (free_plan_id, now, expires_at))

            updated_count = user_cursor.rowcount
            user_conn.commit()
            print(f"   Updated {updated_count} tutors with Free plan (expires: {expires_at.date()})")
        else:
            print("\n[4/4] No tutors to update, skipping...")

        # Verify results
        print("\n" + "=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)

        user_cursor.execute("""
            SELECT subscription_plan_id, COUNT(*) as count
            FROM tutor_profiles
            WHERE is_verified = true AND is_active = true
            GROUP BY subscription_plan_id
            ORDER BY subscription_plan_id
        """)
        results = user_cursor.fetchall()
        print("\nVerified tutors by subscription plan:")
        for plan_id, count in results:
            print(f"   Plan ID {plan_id}: {count} tutors")

    except Exception as e:
        print(f"\nERROR: {e}")
        user_conn.rollback()
        raise
    finally:
        user_cursor.close()
        user_conn.close()
        admin_cursor.close()
        admin_conn.close()

if __name__ == "__main__":
    run_migration()
