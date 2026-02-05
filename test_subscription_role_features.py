"""
Test that subscription plans endpoint returns role-specific features correctly
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import requests
import json

API_BASE_URL = "http://localhost:8000"

def test_subscription_plans_by_role():
    """Test that features are filtered by role"""

    roles = ['tutor', 'student', 'parent']

    print("=" * 80)
    print("Testing Subscription Plans API - Role-Specific Features")
    print("=" * 80)

    for role in roles:
        print(f"\n{'='*80}")
        print(f"TESTING ROLE: {role.upper()}")
        print(f"{'='*80}")

        # Call API with subscription_type parameter
        url = f"{API_BASE_URL}/api/admin-db/subscription-plans?subscription_type={role}&active_only=true"
        print(f"\nAPI Call: {url}")

        response = requests.get(url)

        if response.status_code != 200:
            print(f"❌ ERROR: {response.status_code}")
            print(response.text)
            continue

        data = response.json()

        if not data.get('success'):
            print(f"❌ API returned success=false")
            continue

        plans = data.get('plans', [])
        print(f"\n✅ Successfully retrieved {len(plans)} plans for {role}")

        # Check each plan
        for plan in plans:
            plan_id = plan.get('id')
            plan_name = plan.get('package_title')
            features = plan.get('features', [])
            features_by_role = plan.get('features_by_role', {})

            print(f"\n  📦 Plan: {plan_name} (ID: {plan_id})")
            print(f"     - Total features: {len(features)}")
            print(f"     - Features by role: {list(features_by_role.keys())}")

            # Show role-specific features
            if role in features_by_role:
                role_features = features_by_role[role]
                print(f"     - {role.upper()} features ({len(role_features)}):")
                for feat in role_features:
                    print(f"       • {feat['name']}: {feat['description']}")
            else:
                print(f"     - ⚠️  No features found for {role}")

            # Check if features from other roles are included
            other_roles = [r for r in features_by_role.keys() if r != role]
            if other_roles:
                print(f"     - ⚠️  WARNING: Also includes features for other roles: {other_roles}")
                print(f"       This might be intentional for display purposes")

def test_subscription_plans_no_role():
    """Test that without role filter, all roles' features are returned"""

    print(f"\n{'='*80}")
    print("TESTING WITHOUT ROLE FILTER (should return all features)")
    print(f"{'='*80}")

    url = f"{API_BASE_URL}/api/admin-db/subscription-plans?active_only=true"
    print(f"\nAPI Call: {url}")

    response = requests.get(url)

    if response.status_code != 200:
        print(f"❌ ERROR: {response.status_code}")
        print(response.text)
        return

    data = response.json()
    plans = data.get('plans', [])

    print(f"\n✅ Retrieved {len(plans)} plans")

    for plan in plans:
        plan_name = plan.get('package_title')
        features_by_role = plan.get('features_by_role', {})

        print(f"\n  📦 Plan: {plan_name}")
        print(f"     - Roles with features: {list(features_by_role.keys())}")

        for role, features in features_by_role.items():
            print(f"     - {role.upper()}: {len(features)} features")

if __name__ == "__main__":
    try:
        # Test 1: Role-specific feature filtering
        test_subscription_plans_by_role()

        # Test 2: No role filter
        test_subscription_plans_no_role()

        print("\n" + "="*80)
        print("✅ All tests completed!")
        print("="*80)

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
