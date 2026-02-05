"""
Create user_subscriptions table for user-based subscription history
Separates subscriptions from role-specific investments
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("CREATING USER_SUBSCRIPTIONS TABLE")
print("=" * 80)

with engine.connect() as conn:
    # Create user_subscriptions table
    print("\n1. Creating user_subscriptions table...")

    create_table_query = text("""
        CREATE TABLE IF NOT EXISTS user_subscriptions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subscription_plan_id INTEGER,  -- References subscription_plans.id in admin_db
            plan_name VARCHAR(255) NOT NULL,
            description TEXT,
            amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
            status VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active', 'expired', 'cancelled'
            started_at TIMESTAMP NOT NULL,
            expires_at TIMESTAMP,
            payment_method VARCHAR(100),  -- 'credit_card', 'paypal', 'bank_transfer', etc.
            transaction_id VARCHAR(255),
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            -- Indexes
            CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
        CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON user_subscriptions(expires_at);

        -- Add comments
        COMMENT ON TABLE user_subscriptions IS 'User subscription history - user-based, not role-based';
        COMMENT ON COLUMN user_subscriptions.subscription_plan_id IS 'References subscription_plans.id in admin database';
        COMMENT ON COLUMN user_subscriptions.user_id IS 'The user who owns this subscription';
    """)

    conn.execute(create_table_query)
    conn.commit()
    print("[OK] user_subscriptions table created")

    # Migrate existing subscription data from tutor_investments
    print("\n2. Migrating existing subscriptions from tutor_investments...")

    migrate_query = text("""
        INSERT INTO user_subscriptions (
            user_id,
            subscription_plan_id,
            plan_name,
            description,
            amount,
            status,
            started_at,
            expires_at,
            created_at
        )
        SELECT
            tp.user_id,
            u.subscription_plan_id,
            ti.investment_name,
            ti.description,
            ti.amount,
            ti.status,
            ti.investment_date,
            ti.maturity_date,
            ti.created_at
        FROM tutor_investments ti
        JOIN tutor_profiles tp ON ti.tutor_profile_id = tp.id
        JOIN users u ON tp.user_id = u.id
        WHERE ti.investment_type = 'subscription'
        ON CONFLICT DO NOTHING;
    """)

    result = conn.execute(migrate_query)
    conn.commit()
    print(f"[OK] Migrated {result.rowcount} subscriptions from tutor_investments")

    # Verify migration
    print("\n3. Verifying migration...")

    verify_query = text("""
        SELECT COUNT(*) as total_subscriptions
        FROM user_subscriptions;
    """)

    result = conn.execute(verify_query)
    row = result.fetchone()

    print(f"[OK] Total subscriptions in user_subscriptions: {row.total_subscriptions}")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE!")
print("=" * 80)
print("\nNext steps:")
print("1. Update tutor_subscription_endpoints.py to query user_subscriptions")
print("2. Update student_subscription_endpoints.py to query user_subscriptions")
print("3. Keep tutor_investments for tutor-specific advertising investments")
print("4. Keep student_investments for student-specific purchases (courses, packages)")
print("\n" + "=" * 80)
