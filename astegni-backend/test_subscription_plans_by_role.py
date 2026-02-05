"""
Test subscription plans GET endpoint with role filtering
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')
admin_engine = create_engine(ADMIN_DATABASE_URL)

print("\n" + "=" * 80)
print("TESTING SUBSCRIPTION PLANS WITH ROLE FILTERING")
print("=" * 80)

with admin_engine.connect() as conn:
    # Test 1: Get all plans (no role filter)
    print("\n1. Getting ALL plans (no role filter)...")

    all_plans_query = text("""
        SELECT id, package_title, is_active
        FROM subscription_plans
        WHERE is_active = TRUE
        ORDER BY display_order ASC
    """)

    result = conn.execute(all_plans_query)
    all_plans = result.fetchall()
    print(f"   Found {len(all_plans)} active plans")
    for plan in all_plans:
        print(f"   - {plan.id}: {plan.package_title}")

    # Test 2: Get plans for TUTOR role
    print("\n2. Getting plans for TUTOR role...")

    tutor_plans_query = text("""
        SELECT DISTINCT sp.id, sp.package_title
        FROM subscription_plans sp
        INNER JOIN subscription_features sf ON sp.id = sf.subscription_plan_id
        WHERE sf.user_role = 'tutor'
          AND sf.is_enabled = TRUE
          AND sp.is_active = TRUE
        ORDER BY sp.display_order ASC
    """)

    result = conn.execute(tutor_plans_query)
    tutor_plans = result.fetchall()
    print(f"   Found {len(tutor_plans)} plans with tutor features")
    for plan in tutor_plans:
        # Get tutor features for this plan
        features_query = text("""
            SELECT feature_name
            FROM subscription_features
            WHERE subscription_plan_id = :plan_id
              AND user_role = 'tutor'
              AND is_enabled = TRUE
        """)
        result = conn.execute(features_query, {'plan_id': plan.id})
        features = result.fetchall()
        feature_names = [f.feature_name for f in features]
        print(f"   - {plan.id}: {plan.package_title} ({len(features)} features: {', '.join(feature_names)})")

    # Test 3: Get plans for STUDENT role
    print("\n3. Getting plans for STUDENT role...")

    student_plans_query = text("""
        SELECT DISTINCT sp.id, sp.package_title
        FROM subscription_plans sp
        INNER JOIN subscription_features sf ON sp.id = sf.subscription_plan_id
        WHERE sf.user_role = 'student'
          AND sf.is_enabled = TRUE
          AND sp.is_active = TRUE
        ORDER BY sp.display_order ASC
    """)

    result = conn.execute(student_plans_query)
    student_plans = result.fetchall()
    print(f"   Found {len(student_plans)} plans with student features")
    for plan in student_plans:
        # Get student features for this plan
        features_query = text("""
            SELECT feature_name
            FROM subscription_features
            WHERE subscription_plan_id = :plan_id
              AND user_role = 'student'
              AND is_enabled = TRUE
        """)
        result = conn.execute(features_query, {'plan_id': plan.id})
        features = result.fetchall()
        feature_names = [f.feature_name for f in features]
        print(f"   - {plan.id}: {plan.package_title} ({len(features)} features: {', '.join(feature_names)})")

    # Test 4: Check which roles exist
    print("\n4. Available roles in subscription_features...")

    roles_query = text("""
        SELECT DISTINCT user_role, COUNT(*) as feature_count
        FROM subscription_features
        WHERE is_enabled = TRUE
        GROUP BY user_role
        ORDER BY user_role
    """)

    result = conn.execute(roles_query)
    roles = result.fetchall()
    for role in roles:
        print(f"   - {role.user_role}: {role.feature_count} features")

print("\n" + "=" * 80)
print("TEST COMPLETE!")
print("=" * 80)
print("\nAPI Usage:")
print("  - GET /api/admin-db/subscription-plans (all plans)")
print("  - GET /api/admin-db/subscription-plans?subscription_type=tutor")
print("  - GET /api/admin-db/subscription-plans?subscription_type=student")
print("  - GET /api/admin-db/subscription-plans?subscription_type=parent")
print("\n" + "=" * 80)
