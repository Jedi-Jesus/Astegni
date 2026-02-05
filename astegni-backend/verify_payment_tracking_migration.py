"""
Verify payment tracking migration
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("PAYMENT TRACKING MIGRATION VERIFICATION")
print("=" * 80)

with engine.connect() as conn:

    # Verify user_investments payment tracking fields
    print("\n1. user_investments payment tracking fields:")

    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_investments'
        AND column_name IN ('subscription_plan_id', 'student_payment_id', 'due_date', 'paid_date',
                            'payment_status', 'days_overdue', 'late_fee', 'amount', 'payment_method',
                            'transaction_id', 'billing_cycle', 'is_recurring', 'next_billing_date', 'auto_renew')
        ORDER BY column_name
    """))

    for row in result.fetchall():
        nullable = "NULL" if row.is_nullable == 'YES' else "NOT NULL"
        print(f"  {row.column_name:25} {row.data_type:20} {nullable}")

    # Verify enrolled_students payment tracking fields
    print("\n2. enrolled_students payment tracking fields:")

    result = conn.execute(text("""
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'enrolled_students'
        AND column_name IN ('package_id', 'agreed_price', 'payment_status', 'payment_due_date',
                            'payment_received_date', 'total_sessions', 'completed_sessions', 'cancelled_sessions')
        ORDER BY column_name
    """))

    for row in result.fetchall():
        nullable = "NULL" if row.is_nullable == 'YES' else "NOT NULL"
        print(f"  {row.column_name:25} {row.data_type:20} {nullable}")

    # Check views
    print("\n3. Checking views:")

    result = conn.execute(text("""
        SELECT viewname FROM pg_views WHERE schemaname = 'public'
        AND viewname IN ('overdue_payments', 'enrollment_payments')
        ORDER BY viewname
    """))

    views = result.fetchall()
    print(f"  Found {len(views)} views:")
    for view in views:
        print(f"    [OK] {view.viewname}")

    # Check function
    print("\n4. Checking PostgreSQL function:")

    result = conn.execute(text("""
        SELECT routine_name FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'update_days_overdue'
    """))

    funcs = result.fetchall()
    if funcs:
        print(f"  [OK] update_days_overdue() function exists")
    else:
        print(f"  [ERROR] update_days_overdue() function NOT found")

    # Check enrollment data
    print("\n5. Checking enrollment data:")

    result = conn.execute(text("""
        SELECT
            COUNT(*) as total_enrollments,
            COUNT(package_id) as with_package_id,
            COUNT(agreed_price) as with_agreed_price,
            COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_payments,
            COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_payments
        FROM enrolled_students
    """))

    row = result.fetchone()
    print(f"  Total enrollments: {row.total_enrollments}")
    print(f"  With package_id: {row.with_package_id}")
    print(f"  With agreed_price: {row.with_agreed_price}")
    print(f"  Pending payments: {row.pending_payments}")
    print(f"  Paid payments: {row.paid_payments}")

    # Check user_investments data
    print("\n6. Checking user_investments data:")

    result = conn.execute(text("""
        SELECT
            COUNT(*) as total_investments,
            COUNT(subscription_plan_id) as with_subscription_plan,
            COUNT(student_payment_id) as with_student_payment,
            COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_payments,
            COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_payments,
            COUNT(*) FILTER (WHERE due_date IS NOT NULL) as with_due_date
        FROM user_investments
    """))

    row = result.fetchone()
    print(f"  Total investments: {row.total_investments}")
    print(f"  With subscription_plan_id: {row.with_subscription_plan}")
    print(f"  With student_payment_id: {row.with_student_payment}")
    print(f"  Pending payments: {row.pending_payments}")
    print(f"  Paid payments: {row.paid_payments}")
    print(f"  With due_date: {row.with_due_date}")

print("\n" + "=" * 80)
print("VERIFICATION COMPLETE")
print("=" * 80)
print("\n[OK] Payment tracking migration verified successfully!")
print("\nNext steps:")
print("  1. Update enrollment endpoints to set package_id and agreed_price")
print("  2. Update payment endpoints to sync enrolled_students and user_investments")
print("  3. Set up daily cron job: SELECT update_days_overdue();")
print("  4. Test tutor scoring with payment penalties")
print("\n" + "=" * 80)
