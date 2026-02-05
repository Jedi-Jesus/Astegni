"""
Rename tutor_investments to user_investments
Make investments user-based instead of role-based
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("MIGRATING TUTOR_INVESTMENTS TO USER_INVESTMENTS")
print("=" * 80)

with engine.connect() as conn:
    # Step 1: Rename tutor_investments to user_investments
    print("\n1. Renaming tutor_investments table to user_investments...")

    rename_table_query = text("""
        ALTER TABLE tutor_investments RENAME TO user_investments;
    """)

    conn.execute(rename_table_query)
    conn.commit()
    print("[OK] Table renamed to user_investments")

    # Step 2: Rename tutor_profile_id column to user_id
    print("\n2. Renaming tutor_profile_id column to user_id...")

    # First, get all tutor_profile_id values and their corresponding user_id
    # We'll need to update the column with user_ids before changing the column name

    # Add temporary user_id column
    add_user_id_query = text("""
        ALTER TABLE user_investments
        ADD COLUMN IF NOT EXISTS user_id INTEGER;
    """)

    conn.execute(add_user_id_query)
    conn.commit()
    print("[OK] Added temporary user_id column")

    # Populate user_id from tutor_profiles
    print("\n3. Populating user_id from tutor_profiles...")

    populate_user_id_query = text("""
        UPDATE user_investments ui
        SET user_id = tp.user_id
        FROM tutor_profiles tp
        WHERE ui.tutor_profile_id = tp.id;
    """)

    result = conn.execute(populate_user_id_query)
    conn.commit()
    print(f"[OK] Updated {result.rowcount} records with user_id")

    # Drop the old tutor_profile_id column
    print("\n4. Dropping tutor_profile_id column...")

    drop_old_column_query = text("""
        ALTER TABLE user_investments
        DROP COLUMN IF EXISTS tutor_profile_id;
    """)

    conn.execute(drop_old_column_query)
    conn.commit()
    print("[OK] Dropped tutor_profile_id column")

    # Make user_id NOT NULL and add foreign key
    print("\n5. Adding constraints to user_id...")

    add_constraints_query = text("""
        -- Make user_id NOT NULL
        ALTER TABLE user_investments
        ALTER COLUMN user_id SET NOT NULL;

        -- Add foreign key constraint
        ALTER TABLE user_investments
        ADD CONSTRAINT user_investments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

        -- Create index on user_id
        CREATE INDEX IF NOT EXISTS idx_user_investments_user_id
        ON user_investments(user_id);
    """)

    conn.execute(add_constraints_query)
    conn.commit()
    print("[OK] Added constraints and index")

    # Update subscription_metrics foreign key
    print("\n6. Updating subscription_metrics to reference user_investments...")

    # Note: The foreign key constraint name might be different
    # Let's try to drop and recreate it
    update_metrics_fk_query = text("""
        -- Drop old foreign key if exists
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'subscription_metrics_investment_id_fkey'
                AND table_name = 'subscription_metrics'
            ) THEN
                ALTER TABLE subscription_metrics
                DROP CONSTRAINT subscription_metrics_investment_id_fkey;
            END IF;
        END $$;

        -- Add new foreign key
        ALTER TABLE subscription_metrics
        ADD CONSTRAINT subscription_metrics_investment_id_fkey
        FOREIGN KEY (investment_id) REFERENCES user_investments(id) ON DELETE CASCADE;
    """)

    conn.execute(update_metrics_fk_query)
    conn.commit()
    print("[OK] Updated subscription_metrics foreign key")

    # Add table comment
    print("\n7. Adding table comments...")

    comment_query = text("""
        COMMENT ON TABLE user_investments IS 'User investment history - user-based subscription and investment tracking';
        COMMENT ON COLUMN user_investments.user_id IS 'References users.id - the user who made this investment';
    """)

    conn.execute(comment_query)
    conn.commit()
    print("[OK] Added table comments")

    # Verify migration
    print("\n8. Verifying migration...")

    verify_query = text("""
        SELECT
            COUNT(*) as total_investments,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(CASE WHEN investment_type = 'subscription' THEN 1 END) as subscriptions
        FROM user_investments;
    """)

    result = conn.execute(verify_query)
    row = result.fetchone()

    print(f"\n[OK] Migration verified:")
    print(f"    Total investments: {row.total_investments}")
    print(f"    Unique users: {row.unique_users}")
    print(f"    Subscription investments: {row.subscriptions}")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE!")
print("=" * 80)
print("\nChanges made:")
print("  1. ✅ Renamed tutor_investments → user_investments")
print("  2. ✅ Changed tutor_profile_id → user_id")
print("  3. ✅ Updated foreign keys to reference users table")
print("  4. ✅ Updated subscription_metrics foreign key")
print("\nNext steps:")
print("  - Update tutor_subscription_endpoints.py to query user_investments with user_id")
print("  - Update student_subscription_endpoints.py to query user_investments with user_id")
print("  - Update seeding scripts to use user_id instead of tutor_profile_id")
print("  - student_investments table remains for student-specific purchases")
print("\n" + "=" * 80)
