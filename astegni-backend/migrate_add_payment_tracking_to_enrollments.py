"""
Add payment tracking fields to enrolled_students table and update user_investments

Changes:
1. Add package_id to enrolled_students (link to tutor_packages)
2. Add agreed_price to enrolled_students (price agreed upon enrollment)
3. Add payment_status to enrolled_students
4. Update user_investments to reference enrolled_students correctly OR use separate booking_payment_id
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("ADD PAYMENT TRACKING TO ENROLLED_STUDENTS")
print("=" * 80)

with engine.connect() as conn:

    # Step 1: Add package_id to enrolled_students
    print("\n1. Adding package_id to enrolled_students...")

    add_package_id_query = text("""
        ALTER TABLE enrolled_students
        ADD COLUMN IF NOT EXISTS package_id INTEGER;

        -- Add foreign key to tutor_packages
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints
                WHERE constraint_name = 'enrolled_students_package_id_fkey'
                AND table_name = 'enrolled_students'
            ) THEN
                ALTER TABLE enrolled_students
                ADD CONSTRAINT enrolled_students_package_id_fkey
                FOREIGN KEY (package_id) REFERENCES tutor_packages(id) ON DELETE SET NULL;
            END IF;
        END $$;

        CREATE INDEX IF NOT EXISTS idx_enrolled_students_package_id
        ON enrolled_students(package_id);

        COMMENT ON COLUMN enrolled_students.package_id IS
        'References tutor_packages.id - the package this enrollment is for';
    """)

    try:
        conn.execute(add_package_id_query)
        conn.commit()
        print("[OK] Added package_id")
    except Exception as e:
        print(f"[SKIP] package_id might already exist: {e}")
        conn.rollback()

    # Step 2: Add agreed_price to enrolled_students
    print("\n2. Adding agreed_price to enrolled_students...")

    add_agreed_price_query = text("""
        ALTER TABLE enrolled_students
        ADD COLUMN IF NOT EXISTS agreed_price DECIMAL(12, 2);

        COMMENT ON COLUMN enrolled_students.agreed_price IS
        'Price agreed upon enrollment - may differ from package price due to bargaining';
    """)

    try:
        conn.execute(add_agreed_price_query)
        conn.commit()
        print("[OK] Added agreed_price")
    except Exception as e:
        print(f"[SKIP] agreed_price might already exist: {e}")
        conn.rollback()

    # Step 3: Add payment tracking fields to enrolled_students
    print("\n3. Adding payment tracking fields to enrolled_students...")

    add_payment_fields_query = text("""
        ALTER TABLE enrolled_students
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS payment_due_date DATE,
        ADD COLUMN IF NOT EXISTS payment_received_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS completed_sessions INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cancelled_sessions INTEGER DEFAULT 0;

        CREATE INDEX IF NOT EXISTS idx_enrolled_students_payment_status
        ON enrolled_students(payment_status);

        CREATE INDEX IF NOT EXISTS idx_enrolled_students_payment_due_date
        ON enrolled_students(payment_due_date);

        COMMENT ON COLUMN enrolled_students.payment_status IS
        'Payment status: pending, paid, partially_paid, late, refunded';

        COMMENT ON COLUMN enrolled_students.payment_due_date IS
        'When full payment is due for this enrollment';

        COMMENT ON COLUMN enrolled_students.payment_received_date IS
        'When payment was received';

        COMMENT ON COLUMN enrolled_students.total_sessions IS
        'Total number of sessions in this enrollment';

        COMMENT ON COLUMN enrolled_students.completed_sessions IS
        'Number of completed sessions';

        COMMENT ON COLUMN enrolled_students.cancelled_sessions IS
        'Number of cancelled sessions';
    """)

    try:
        conn.execute(add_payment_fields_query)
        conn.commit()
        print("[OK] Added payment tracking fields")
    except Exception as e:
        print(f"[SKIP] Payment fields might already exist: {e}")
        conn.rollback()

    # Step 4: Add student_payment_id to user_investments (instead of enrolled_student_id)
    print("\n4. Adding student_payment_id to user_investments...")

    # First, check if enrolled_student_id exists and rename it
    check_and_rename_query = text("""
        DO $$
        BEGIN
            -- If enrolled_student_id exists, rename it to student_payment_id
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_investments'
                AND column_name = 'enrolled_student_id'
            ) THEN
                ALTER TABLE user_investments
                RENAME COLUMN enrolled_student_id TO student_payment_id;

                COMMENT ON COLUMN user_investments.student_payment_id IS
                'References enrolled_students.id - for booking/enrollment payments';
            -- If it doesn't exist, create student_payment_id
            ELSIF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'user_investments'
                AND column_name = 'student_payment_id'
            ) THEN
                ALTER TABLE user_investments
                ADD COLUMN student_payment_id INTEGER;

                ALTER TABLE user_investments
                ADD CONSTRAINT user_investments_student_payment_id_fkey
                FOREIGN KEY (student_payment_id) REFERENCES enrolled_students(id) ON DELETE SET NULL;

                CREATE INDEX IF NOT EXISTS idx_user_investments_student_payment_id
                ON user_investments(student_payment_id);

                COMMENT ON COLUMN user_investments.student_payment_id IS
                'References enrolled_students.id - for booking/enrollment payments';
            END IF;
        END $$;
    """)

    try:
        conn.execute(check_and_rename_query)
        conn.commit()
        print("[OK] Added/renamed student_payment_id")
    except Exception as e:
        print(f"[ERROR] Could not add student_payment_id: {e}")
        conn.rollback()

    # Step 5: Update table comments
    print("\n5. Updating table comments...")

    update_comments_query = text("""
        COMMENT ON TABLE enrolled_students IS
        'Student enrollments with package details and payment tracking. Tracks agreed price (after bargaining) and payment status.';
    """)

    conn.execute(update_comments_query)
    conn.commit()
    print("[OK] Updated table comments")

    # Step 6: Create view for enrollment payments
    print("\n6. Creating enrollment_payments view...")

    create_view_query = text("""
        CREATE OR REPLACE VIEW enrollment_payments AS
        SELECT
            es.id as enrollment_id,
            es.tutor_id,
            t.user_id as tutor_user_id,
            es.student_id,
            s.user_id as student_user_id,
            es.package_id,
            tp.name as package_name,
            tp.hourly_rate as package_hourly_rate,
            es.agreed_price,
            es.payment_status,
            es.payment_due_date,
            es.payment_received_date,
            es.total_sessions,
            es.completed_sessions,
            es.cancelled_sessions,
            es.enrolled_at,
            CASE
                WHEN es.payment_status = 'pending' AND es.payment_due_date < CURRENT_DATE THEN true
                ELSE false
            END as is_overdue,
            CASE
                WHEN es.payment_due_date IS NOT NULL THEN CURRENT_DATE - es.payment_due_date
                ELSE 0
            END as days_overdue
        FROM enrolled_students es
        LEFT JOIN tutor_profiles t ON t.id = es.tutor_id
        LEFT JOIN student_profiles s ON s.id = es.student_id
        LEFT JOIN tutor_packages tp ON tp.id = es.package_id
        WHERE es.payment_status IS NOT NULL;

        COMMENT ON VIEW enrollment_payments IS
        'Shows all enrollment payments with calculated overdue status';
    """)

    conn.execute(create_view_query)
    conn.commit()
    print("[OK] Created enrollment_payments view")

    # Step 7: Verify migration
    print("\n7. Verifying migration...")

    verify_query = text("""
        SELECT
            COUNT(*) as total_enrollments,
            COUNT(package_id) as enrollments_with_package,
            COUNT(agreed_price) as enrollments_with_price,
            COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_enrollments,
            COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_payments
        FROM enrolled_students;
    """)

    result = conn.execute(verify_query)
    row = result.fetchone()

    print(f"\n[OK] Migration verified:")
    print(f"    Total enrollments: {row.total_enrollments}")
    print(f"    With package_id: {row.enrollments_with_package}")
    print(f"    With agreed_price: {row.enrollments_with_price}")
    print(f"    Paid: {row.paid_enrollments}")
    print(f"    Pending: {row.pending_payments}")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE!")
print("=" * 80)

print("\n✅ Changes made to enrolled_students:")
print("  1. Added package_id (link to tutor_packages)")
print("  2. Added agreed_price (price after bargaining)")
print("  3. Added payment_status (pending, paid, late, etc.)")
print("  4. Added payment_due_date and payment_received_date")
print("  5. Added session tracking (total, completed, cancelled)")

print("\n✅ Changes made to user_investments:")
print("  1. Added/renamed student_payment_id (link to enrolled_students)")

print("\n📊 Payment Flow:")
print("  1. Student requests session → session_request table")
print("  2. Student/tutor bargain price → agreed_price in enrolled_students")
print("  3. Tutor accepts → enrolled_students record created")
print("  4. Payment tracked in enrolled_students.payment_status")
print("  5. Payment recorded in user_investments (investment_type='booking')")

print("\n🔄 Next Steps:")
print("  1. Update enrollment endpoints to set agreed_price")
print("  2. Update payment endpoints to sync enrolled_students and user_investments")
print("  3. Update tutor_scoring.py to check both subscription AND booking payments")

print("\n" + "=" * 80)
