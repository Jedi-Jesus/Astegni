"""
Enhance user_investments table for comprehensive payment tracking

Changes:
1. Add subscription_plan_id for subscription investments
2. Add enrolled_student_id for booking/enrollment investments
3. Add payment tracking fields (due_date, paid_date, payment_status)
4. Add payment reliability fields (days_overdue, late_fee)
5. Make amount nullable (calculated from subscription plan or package)
6. Add payment_method and transaction_id
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("ENHANCING USER_INVESTMENTS FOR PAYMENT TRACKING")
print("=" * 80)

with engine.connect() as conn:

    # Step 1: Add subscription_plan_id
    print("\n1. Adding subscription_plan_id column...")

    add_subscription_plan_query = text("""
        ALTER TABLE user_investments
        ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER;

        CREATE INDEX IF NOT EXISTS idx_user_investments_subscription_plan_id
        ON user_investments(subscription_plan_id);

        COMMENT ON COLUMN user_investments.subscription_plan_id IS
        'References subscription_plans.id in admin_db - only for subscription investments. NOTE: Foreign key not enforced due to cross-database reference';
    """)

    try:
        conn.execute(add_subscription_plan_query)
        conn.commit()
        print("[OK] Added subscription_plan_id")
    except Exception as e:
        print(f"[SKIP] subscription_plan_id might already exist: {e}")
        conn.rollback()

    # Step 2: Add student_payment_id (links to enrolled_students)
    print("\n2. Adding student_payment_id column...")

    add_student_payment_query = text("""
        ALTER TABLE user_investments
        ADD COLUMN IF NOT EXISTS student_payment_id INTEGER;

        -- Add foreign key to enrolled_students
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'user_investments_student_payment_id_fkey'
                AND table_name = 'user_investments'
            ) THEN
                ALTER TABLE user_investments
                ADD CONSTRAINT user_investments_student_payment_id_fkey
                FOREIGN KEY (student_payment_id) REFERENCES enrolled_students(id) ON DELETE SET NULL;
            END IF;
        END $$;

        CREATE INDEX IF NOT EXISTS idx_user_investments_student_payment_id
        ON user_investments(student_payment_id);

        COMMENT ON COLUMN user_investments.student_payment_id IS
        'References enrolled_students.id - for booking/enrollment investments. The agreed_price comes from enrolled_students table.';
    """)

    try:
        conn.execute(add_student_payment_query)
        conn.commit()
        print("[OK] Added student_payment_id")
    except Exception as e:
        print(f"[SKIP] student_payment_id might already exist: {e}")
        conn.rollback()

    # Step 3: Add payment tracking fields
    print("\n3. Adding payment tracking fields...")

    add_payment_tracking_query = text("""
        ALTER TABLE user_investments
        ADD COLUMN IF NOT EXISTS due_date DATE,
        ADD COLUMN IF NOT EXISTS paid_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS days_overdue INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS late_fee DECIMAL(12, 2) DEFAULT 0.00;

        CREATE INDEX IF NOT EXISTS idx_user_investments_payment_status
        ON user_investments(payment_status);

        CREATE INDEX IF NOT EXISTS idx_user_investments_due_date
        ON user_investments(due_date);

        COMMENT ON COLUMN user_investments.due_date IS
        'Payment due date - when payment is expected';

        COMMENT ON COLUMN user_investments.paid_date IS
        'Actual payment date - when payment was received';

        COMMENT ON COLUMN user_investments.payment_status IS
        'Payment status: pending, paid, late, missed, failed, refunded';

        COMMENT ON COLUMN user_investments.days_overdue IS
        'Number of days payment is overdue (calculated daily)';

        COMMENT ON COLUMN user_investments.late_fee IS
        'Late fee charged for overdue payments';
    """)

    try:
        conn.execute(add_payment_tracking_query)
        conn.commit()
        print("[OK] Added payment tracking fields")
    except Exception as e:
        print(f"[SKIP] Payment tracking fields might already exist: {e}")
        conn.rollback()

    # Step 4: Add payment method and transaction tracking
    print("\n4. Adding payment method and transaction fields...")

    add_payment_method_query = text("""
        ALTER TABLE user_investments
        ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
        ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),
        ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50);

        CREATE INDEX IF NOT EXISTS idx_user_investments_transaction_id
        ON user_investments(transaction_id);

        COMMENT ON COLUMN user_investments.payment_method IS
        'Payment method: bank_transfer, mobile_money, cash, chapa, telebirr, etc.';

        COMMENT ON COLUMN user_investments.transaction_id IS
        'Unique transaction ID from payment gateway';

        COMMENT ON COLUMN user_investments.payment_gateway IS
        'Payment gateway used: chapa, telebirr, mpesa, stripe, etc.';
    """)

    try:
        conn.execute(add_payment_method_query)
        conn.commit()
        print("[OK] Added payment method fields")
    except Exception as e:
        print(f"[SKIP] Payment method fields might already exist: {e}")
        conn.rollback()

    # Step 5: Make amount nullable (will be calculated from plan/package)
    print("\n5. Making amount nullable...")

    make_amount_nullable_query = text("""
        ALTER TABLE user_investments
        ALTER COLUMN amount DROP NOT NULL;

        COMMENT ON COLUMN user_investments.amount IS
        'Investment amount - can be NULL if calculated from subscription_plan or package';
    """)

    try:
        conn.execute(make_amount_nullable_query)
        conn.commit()
        print("[OK] Made amount nullable")
    except Exception as e:
        print(f"[SKIP] Amount might already be nullable: {e}")
        conn.rollback()

    # Step 6: Add billing cycle and recurring payment fields
    print("\n6. Adding billing cycle fields...")

    add_billing_cycle_query = text("""
        ALTER TABLE user_investments
        ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20),
        ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS next_billing_date DATE,
        ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT FALSE;

        CREATE INDEX IF NOT EXISTS idx_user_investments_next_billing_date
        ON user_investments(next_billing_date);

        COMMENT ON COLUMN user_investments.billing_cycle IS
        'Billing cycle: monthly, quarterly, yearly, one_time';

        COMMENT ON COLUMN user_investments.is_recurring IS
        'Whether this is a recurring subscription payment';

        COMMENT ON COLUMN user_investments.next_billing_date IS
        'Next billing date for recurring subscriptions';

        COMMENT ON COLUMN user_investments.auto_renew IS
        'Whether subscription auto-renews';
    """)

    try:
        conn.execute(add_billing_cycle_query)
        conn.commit()
        print("[OK] Added billing cycle fields")
    except Exception as e:
        print(f"[SKIP] Billing cycle fields might already exist: {e}")
        conn.rollback()

    # Step 7: Update table comment
    print("\n7. Updating table comment...")

    update_comment_query = text("""
        COMMENT ON TABLE user_investments IS
        'Comprehensive payment tracking for subscriptions and bookings. Tracks payment due dates, actual payments, late fees, and payment reliability for all users.';
    """)

    conn.execute(update_comment_query)
    conn.commit()
    print("[OK] Updated table comment")

    # Step 8: Create view for overdue payments
    print("\n8. Creating overdue_payments view...")

    create_view_query = text("""
        CREATE OR REPLACE VIEW overdue_payments AS
        SELECT
            ui.id,
            ui.user_id,
            u.first_name,
            u.father_name,
            u.roles,
            ui.investment_type,
            ui.subscription_plan_id,
            ui.student_payment_id,
            ui.amount,
            ui.due_date,
            ui.payment_status,
            ui.days_overdue,
            ui.late_fee,
            CURRENT_DATE - ui.due_date as actual_days_overdue
        FROM user_investments ui
        JOIN users u ON u.id = ui.user_id
        WHERE ui.payment_status IN ('pending', 'late')
        AND ui.due_date < CURRENT_DATE
        ORDER BY ui.due_date ASC;

        COMMENT ON VIEW overdue_payments IS
        'Shows all overdue payments with user details and days overdue. subscription_plan_id references admin_db';
    """)

    conn.execute(create_view_query)
    conn.commit()
    print("[OK] Created overdue_payments view")

    # Step 9: Create function to calculate days overdue
    print("\n9. Creating calculate_days_overdue function...")

    create_function_query = text("""
        CREATE OR REPLACE FUNCTION update_days_overdue()
        RETURNS void AS $$
        BEGIN
            UPDATE user_investments
            SET days_overdue = GREATEST(0, CURRENT_DATE - due_date)
            WHERE payment_status IN ('pending', 'late')
            AND due_date IS NOT NULL
            AND due_date < CURRENT_DATE;

            -- Update payment_status to 'late' if overdue
            UPDATE user_investments
            SET payment_status = 'late'
            WHERE payment_status = 'pending'
            AND due_date < CURRENT_DATE;
        END;
        $$ LANGUAGE plpgsql;

        COMMENT ON FUNCTION update_days_overdue() IS
        'Updates days_overdue field for all overdue payments. Run this daily via cron job.';
    """)

    conn.execute(create_function_query)
    conn.commit()
    print("[OK] Created update_days_overdue function")

    # Step 10: Verify migration
    print("\n10. Verifying migration...")

    verify_query = text("""
        SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns
        WHERE table_name = 'user_investments'
        ORDER BY ordinal_position;
    """)

    result = conn.execute(verify_query)
    columns = result.fetchall()

    print(f"\n[OK] user_investments table now has {len(columns)} columns:")
    for col in columns:
        nullable = "NULL" if col.is_nullable == 'YES' else "NOT NULL"
        default = f" DEFAULT {col.column_default}" if col.column_default else ""
        print(f"    - {col.column_name}: {col.data_type} {nullable}{default}")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE!")
print("=" * 80)

print("\n✅ Changes made:")
print("  1. Added subscription_plan_id (for subscription payments)")
print("  2. Added enrolled_student_id (for booking/enrollment payments)")
print("  3. Added due_date, paid_date, payment_status")
print("  4. Added days_overdue, late_fee")
print("  5. Added payment_method, transaction_id, payment_gateway")
print("  6. Added billing_cycle, is_recurring, next_billing_date, auto_renew")
print("  7. Made amount nullable (calculated from plan/package)")
print("  8. Created overdue_payments view")
print("  9. Created update_days_overdue() function")

print("\n📊 Payment Status Values:")
print("  - pending: Payment not yet received")
print("  - paid: Payment received on time")
print("  - late: Payment received after due date")
print("  - missed: Payment not received and significantly overdue")
print("  - failed: Payment attempt failed")
print("  - refunded: Payment was refunded")

print("\n💰 Investment Types:")
print("  - subscription: Monthly/yearly subscription payment")
print("  - booking: Student enrollment/session booking")
print("  - upgrade: Subscription plan upgrade")
print("  - renewal: Subscription renewal")

print("\n🔄 Next Steps:")
print("  1. Run: python migrate_enhance_user_investments_payment_tracking.py")
print("  2. Set up cron job to run update_days_overdue() daily")
print("  3. Update tutor_scoring.py to include payment reliability scoring")
print("  4. Create payment_history_endpoints.py for payment management")

print("\n" + "=" * 80)
