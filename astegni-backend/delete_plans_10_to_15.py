"""
Delete subscription plans with IDs 10-15
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')
admin_engine = create_engine(ADMIN_DATABASE_URL)

print("\n" + "=" * 80)
print("DELETING SUBSCRIPTION PLANS (IDs 10-15)")
print("=" * 80)

with admin_engine.connect() as conn:
    # Step 1: Check which plans will be deleted
    print("\n1. Checking plans to be deleted...")

    check_query = text("""
        SELECT id, package_title, package_price, is_active
        FROM subscription_plans
        WHERE id BETWEEN 10 AND 15
        ORDER BY id
    """)

    result = conn.execute(check_query)
    plans_to_delete = result.fetchall()

    if not plans_to_delete:
        print("   [!] No plans found with IDs 10-15")
    else:
        print(f"   Found {len(plans_to_delete)} plans to delete:")
        for plan in plans_to_delete:
            print(f"   - ID {plan.id}: {plan.package_title} (Price: {plan.package_price} ETB, Active: {plan.is_active})")

    # Step 2: Check if any of these plans have features
    print("\n2. Checking for associated features...")

    features_query = text("""
        SELECT subscription_plan_id, COUNT(*) as feature_count
        FROM subscription_features
        WHERE subscription_plan_id BETWEEN 10 AND 15
        GROUP BY subscription_plan_id
        ORDER BY subscription_plan_id
    """)

    result = conn.execute(features_query)
    features_data = result.fetchall()

    if not features_data:
        print("   [OK] No features associated with these plans")
    else:
        total_features = sum(f.feature_count for f in features_data)
        print(f"   [INFO] Found {total_features} features that will be auto-deleted (CASCADE):")
        for f in features_data:
            print(f"   - Plan {f.subscription_plan_id}: {f.feature_count} features")

    # Step 3: Delete the plans
    if plans_to_delete:
        print("\n3. Deleting plans...")

        delete_query = text("""
            DELETE FROM subscription_plans
            WHERE id BETWEEN 10 AND 15
        """)

        result = conn.execute(delete_query)
        conn.commit()

        print(f"   [OK] Deleted {result.rowcount} plans")
        print("   [OK] Associated features auto-deleted via CASCADE")

    # Step 4: Verify deletion
    print("\n4. Verifying deletion...")

    verify_query = text("""
        SELECT id FROM subscription_plans
        WHERE id BETWEEN 10 AND 15
    """)

    result = conn.execute(verify_query)
    remaining = result.fetchall()

    if remaining:
        print(f"   [ERROR] {len(remaining)} plans still exist!")
    else:
        print("   [OK] All plans successfully deleted")

    # Step 5: Show remaining plans
    print("\n5. Remaining active plans:")

    remaining_query = text("""
        SELECT id, package_title, package_price
        FROM subscription_plans
        WHERE is_active = TRUE
        ORDER BY display_order ASC, id ASC
    """)

    result = conn.execute(remaining_query)
    remaining_plans = result.fetchall()

    print(f"   Total active plans: {len(remaining_plans)}")
    for plan in remaining_plans:
        print(f"   - ID {plan.id}: {plan.package_title} ({plan.package_price} ETB)")

print("\n" + "=" * 80)
print("DELETION COMPLETE!")
print("=" * 80)
print("\nSummary:")
print(f"  - Plans deleted: {len(plans_to_delete) if plans_to_delete else 0}")
print(f"  - Features auto-deleted: {total_features if features_data else 0}")
print(f"  - Remaining active plans: {len(remaining_plans)}")
print("\n" + "=" * 80)
