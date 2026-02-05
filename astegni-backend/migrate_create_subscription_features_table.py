"""
Create subscription_features table in admin database
Remove obsolete columns from subscription_plans
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')
admin_engine = create_engine(ADMIN_DATABASE_URL)

print("\n" + "=" * 80)
print("CREATING SUBSCRIPTION_FEATURES TABLE")
print("=" * 80)

with admin_engine.connect() as conn:
    # Step 1: Create subscription_features table
    print("\n1. Creating subscription_features table...")

    create_table_query = text("""
        CREATE TABLE IF NOT EXISTS subscription_features (
            id SERIAL PRIMARY KEY,
            subscription_plan_id INTEGER NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
            user_role VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent', 'advertiser'
            feature_name VARCHAR(255) NOT NULL,
            feature_description TEXT,
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            feature_value TEXT,  -- Optional value for configurable features (e.g., "max_students: 100")
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            -- Unique constraint: one feature per plan per role
            CONSTRAINT unique_plan_role_feature UNIQUE (subscription_plan_id, user_role, feature_name)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_subscription_features_plan_id
            ON subscription_features(subscription_plan_id);

        CREATE INDEX IF NOT EXISTS idx_subscription_features_user_role
            ON subscription_features(user_role);

        CREATE INDEX IF NOT EXISTS idx_subscription_features_plan_role
            ON subscription_features(subscription_plan_id, user_role);

        -- Add comments
        COMMENT ON TABLE subscription_features IS 'Features available for each subscription plan, role-specific';
        COMMENT ON COLUMN subscription_features.subscription_plan_id IS 'References subscription_plans.id';
        COMMENT ON COLUMN subscription_features.user_role IS 'Role this feature applies to: tutor, student, parent, advertiser';
        COMMENT ON COLUMN subscription_features.feature_name IS 'Name of the feature (e.g., profile_boost, priority_support, advanced_analytics)';
        COMMENT ON COLUMN subscription_features.feature_value IS 'Optional configuration value for the feature';
    """)

    conn.execute(create_table_query)
    conn.commit()
    print("[OK] subscription_features table created")

    # Step 2: Remove obsolete columns from subscription_plans
    print("\n2. Removing obsolete columns from subscription_plans...")

    drop_columns_query = text("""
        -- Drop astegni_features column if exists
        ALTER TABLE subscription_plans
        DROP COLUMN IF EXISTS astegni_features;

        -- Drop subscription_type column if exists
        ALTER TABLE subscription_plans
        DROP COLUMN IF EXISTS subscription_type;
    """)

    conn.execute(drop_columns_query)
    conn.commit()
    print("[OK] Removed astegni_features and subscription_type columns")

    # Step 3: Seed example features for different roles
    print("\n3. Seeding example subscription features...")

    # Get existing subscription plans
    get_plans_query = text("SELECT id, package_title FROM subscription_plans LIMIT 3")
    result = conn.execute(get_plans_query)
    plans = result.fetchall()

    if plans:
        for plan in plans:
            plan_id, plan_name = plan.id, plan.package_title

            # Tutor features
            tutor_features = [
                ('profile_boost', 'Boost profile visibility in search results', True, None),
                ('performance_analytics', 'Access to detailed performance metrics', True, None),
                ('student_connections', 'Connect with unlimited students', True, 'unlimited'),
                ('priority_support', 'Priority customer support', True, None),
            ]

            # Student features
            student_features = [
                ('premium_content', 'Access to premium learning content', True, None),
                ('unlimited_tutors', 'Connect with unlimited tutors', True, 'unlimited'),
                ('progress_tracking', 'Advanced progress tracking tools', True, None),
                ('priority_support', 'Priority customer support', True, None),
            ]

            # Parent features
            parent_features = [
                ('child_monitoring', 'Monitor multiple children progress', True, None),
                ('detailed_reports', 'Detailed performance reports', True, None),
                ('priority_support', 'Priority customer support', True, None),
            ]

            # Insert features for each role
            for role, features_list in [
                ('tutor', tutor_features),
                ('student', student_features),
                ('parent', parent_features)
            ]:
                for feature_name, description, enabled, value in features_list:
                    insert_query = text("""
                        INSERT INTO subscription_features
                        (subscription_plan_id, user_role, feature_name, feature_description, is_enabled, feature_value)
                        VALUES (:plan_id, :role, :feature_name, :description, :enabled, :value)
                        ON CONFLICT (subscription_plan_id, user_role, feature_name) DO NOTHING
                    """)

                    conn.execute(insert_query, {
                        'plan_id': plan_id,
                        'role': role,
                        'feature_name': feature_name,
                        'description': description,
                        'enabled': enabled,
                        'value': value
                    })

            print(f"[OK] Seeded features for plan: {plan_name}")

        conn.commit()

    # Step 4: Verify migration
    print("\n4. Verifying migration...")

    verify_query = text("""
        SELECT
            COUNT(*) as total_features,
            COUNT(DISTINCT subscription_plan_id) as plans_with_features,
            COUNT(DISTINCT user_role) as unique_roles
        FROM subscription_features;
    """)

    result = conn.execute(verify_query)
    row = result.fetchone()

    print(f"\n[OK] Verification complete:")
    print(f"    Total features: {row.total_features}")
    print(f"    Plans with features: {row.plans_with_features}")
    print(f"    Unique roles: {row.unique_roles}")

    # Show features by role
    print("\n5. Features by role:")

    roles_query = text("""
        SELECT
            user_role,
            COUNT(*) as feature_count,
            STRING_AGG(feature_name, ', ' ORDER BY feature_name) as features
        FROM subscription_features
        GROUP BY user_role
        ORDER BY user_role;
    """)

    result = conn.execute(roles_query)
    for row in result.fetchall():
        print(f"    {row.user_role}: {row.feature_count} features")
        print(f"      -> {row.features}")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE!")
print("=" * 80)
print("\nChanges made:")
print("  1. Created subscription_features table")
print("  2. Removed astegni_features column from subscription_plans")
print("  3. Removed subscription_type column from subscription_plans")
print("  4. Seeded example features for tutor, student, and parent roles")
print("\nFeature Management:")
print("  - Features are now role-specific and plan-specific")
print("  - Same subscription plan can have different features for different roles")
print("  - Features can be enabled/disabled per plan per role")
print("  - Feature values can be configured (e.g., limits, quotas)")
print("\n" + "=" * 80)
