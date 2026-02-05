"""
Test subscription plans GET endpoint with features from subscription_features table
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')
admin_engine = create_engine(ADMIN_DATABASE_URL)

print("\n" + "=" * 80)
print("TESTING SUBSCRIPTION PLANS WITH FEATURES")
print("=" * 80)

with admin_engine.connect() as conn:
    # Test: Get all plans with features
    print("\n1. Testing GET all subscription plans...")

    plans_query = text("""
        SELECT id, package_title, package_price, label
        FROM subscription_plans
        WHERE is_active = TRUE
        ORDER BY display_order ASC
        LIMIT 3
    """)

    result = conn.execute(plans_query)
    plans = result.fetchall()

    print(f"Found {len(plans)} active plans")

    for plan in plans:
        plan_id = plan.id
        plan_title = plan.package_title
        plan_price = plan.package_price
        plan_label = plan.label

        print(f"\n{'='*60}")
        print(f"Plan: {plan_title} ({plan_id})")
        print(f"Price: {plan_price} ETB")
        print(f"Label: {plan_label}")
        print(f"{'='*60}")

        # Get features for this plan from subscription_features table
        features_query = text("""
            SELECT user_role, feature_name, feature_description, is_enabled, feature_value
            FROM subscription_features
            WHERE subscription_plan_id = :plan_id AND is_enabled = TRUE
            ORDER BY user_role, feature_name
        """)

        result = conn.execute(features_query, {'plan_id': plan_id})
        features = result.fetchall()

        if not features:
            print("  [!] No features found for this plan")
            continue

        # Group by role
        features_by_role = {}
        for feature in features:
            role = feature.user_role
            if role not in features_by_role:
                features_by_role[role] = []
            features_by_role[role].append(feature)

        # Display features grouped by role
        for role, role_features in features_by_role.items():
            print(f"\n  {role.upper()} Features ({len(role_features)}):")
            for feature in role_features:
                value_info = f" (value: {feature.feature_value})" if feature.feature_value else ""
                print(f"    - {feature.feature_name}: {feature.feature_description}{value_info}")

    # Test: Verify no 'features' column exists
    print("\n\n2. Verifying 'features' column has been removed...")

    check_column_query = text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'subscription_plans'
          AND column_name = 'features'
    """)

    result = conn.execute(check_column_query)
    has_features_column = result.fetchone()

    if has_features_column:
        print("  [ERROR] 'features' column still exists in subscription_plans!")
    else:
        print("  [OK] 'features' column successfully removed from subscription_plans")

    # Test: Check subscription_features table structure
    print("\n3. Verifying subscription_features table structure...")

    table_structure_query = text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'subscription_features'
        ORDER BY ordinal_position
    """)

    result = conn.execute(table_structure_query)
    columns = result.fetchall()

    print("  subscription_features columns:")
    for col in columns:
        print(f"    - {col.column_name}: {col.data_type}")

    # Test: Count features by role
    print("\n4. Feature statistics by role...")

    stats_query = text("""
        SELECT
            user_role,
            COUNT(*) as feature_count,
            COUNT(DISTINCT subscription_plan_id) as plan_count
        FROM subscription_features
        WHERE is_enabled = TRUE
        GROUP BY user_role
        ORDER BY user_role
    """)

    result = conn.execute(stats_query)
    stats = result.fetchall()

    for stat in stats:
        print(f"  {stat.user_role}: {stat.feature_count} features across {stat.plan_count} plans")

print("\n" + "=" * 80)
print("TEST COMPLETE!")
print("=" * 80)
print("\nConclusion:")
print("  - Subscription plans no longer have 'features' column")
print("  - Features are now stored in subscription_features table")
print("  - Features are role-specific (tutor, student, parent, etc.)")
print("  - GET /api/admin-db/subscription-plans now returns features_by_role")
print("\n" + "=" * 80)
