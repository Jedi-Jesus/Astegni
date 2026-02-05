"""
Remove features column from subscription_plans table
Features are now managed in subscription_features table
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')
admin_engine = create_engine(ADMIN_DATABASE_URL)

print("\n" + "=" * 80)
print("REMOVING FEATURES COLUMN FROM SUBSCRIPTION_PLANS")
print("=" * 80)

with admin_engine.connect() as conn:
    # Step 1: Check if features column exists and show sample data
    print("\n1. Checking current features data...")

    check_query = text("""
        SELECT id, package_title, features
        FROM subscription_plans
        WHERE features IS NOT NULL
        LIMIT 3
    """)

    result = conn.execute(check_query)
    rows = result.fetchall()

    if rows:
        print(f"[INFO] Found {len(rows)} plans with features data:")
        for row in rows:
            print(f"  - Plan {row.id} ({row.package_title}): {row.features}")
        print("[INFO] This data will be lost. Ensure subscription_features table has all needed features.")
    else:
        print("[OK] No features data found in subscription_plans")

    # Step 2: Remove features column
    print("\n2. Removing features column from subscription_plans...")

    drop_column_query = text("""
        ALTER TABLE subscription_plans
        DROP COLUMN IF EXISTS features;
    """)

    conn.execute(drop_column_query)
    conn.commit()
    print("[OK] Features column removed")

    # Step 3: Verify column is removed
    print("\n3. Verifying column removal...")

    verify_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'subscription_plans'
          AND column_name = 'features'
    """)

    result = conn.execute(verify_query)
    rows = result.fetchall()

    if rows:
        print("[ERROR] Features column still exists!")
    else:
        print("[OK] Features column successfully removed")

    # Step 4: Show remaining columns
    print("\n4. Current columns in subscription_plans:")

    columns_query = text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'subscription_plans'
        ORDER BY ordinal_position
    """)

    result = conn.execute(columns_query)
    for row in result.fetchall():
        print(f"  - {row.column_name}: {row.data_type}")

    # Step 5: Verify subscription_features table has data
    print("\n5. Verifying subscription_features table...")

    features_query = text("""
        SELECT
            COUNT(*) as total_features,
            COUNT(DISTINCT subscription_plan_id) as plans_with_features,
            COUNT(DISTINCT user_role) as unique_roles
        FROM subscription_features
    """)

    result = conn.execute(features_query)
    row = result.fetchone()

    print(f"[OK] subscription_features table:")
    print(f"  - Total features: {row.total_features}")
    print(f"  - Plans with features: {row.plans_with_features}")
    print(f"  - Unique roles: {row.unique_roles}")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE!")
print("=" * 80)
print("\nChanges made:")
print("  1. Removed 'features' column from subscription_plans")
print("  2. Features now managed exclusively in subscription_features table")
print("\nFeature Management:")
print("  - Use subscription_features table for all feature operations")
print("  - Features are role-specific and plan-specific")
print("  - API: GET /api/subscription/features")
print("  - API: GET /api/subscription/features/check/{feature_name}")
print("\n" + "=" * 80)
