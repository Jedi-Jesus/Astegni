"""
Seed student subscriptions using student_profiles and student_investments tables
"""
import sys
import os
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

USER_DB_URL = os.getenv('DATABASE_URL')
ADMIN_DB_URL = os.getenv('ADMIN_DATABASE_URL')

if not USER_DB_URL or not ADMIN_DB_URL:
    print("ERROR: DATABASE_URL or ADMIN_DATABASE_URL not found in .env")
    sys.exit(1)

if USER_DB_URL.startswith('postgresql://'):
    USER_DB_URL = USER_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
if ADMIN_DB_URL.startswith('postgresql://'):
    ADMIN_DB_URL = ADMIN_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

user_engine = create_engine(USER_DB_URL)
admin_engine = create_engine(ADMIN_DB_URL)

UserSession = sessionmaker(bind=user_engine)
AdminSession = sessionmaker(bind=admin_engine)

def seed_student_subscriptions():
    """Seed subscription data for students"""
    user_db = UserSession()
    admin_db = AdminSession()

    try:
        print("\nStarting student subscription seeding...")

        # Get all subscription plans from admin database
        plans_query = text("""
            SELECT id, package_title as name, features::text as description,
                   package_price as price, duration_days
            FROM subscription_plans
            WHERE is_active = true AND package_price > 0
            ORDER BY package_price ASC
        """)
        plans_result = admin_db.execute(plans_query)
        plans = plans_result.fetchall()

        if not plans:
            print("ERROR: No active subscription plans found")
            return

        print(f"Found {len(plans)} subscription plans")
        for plan in plans:
            print(f"   - {plan.name}: {plan.price} ETB for {plan.duration_days} days")

        # Get all student profiles
        students_query = text("""
            SELECT id, user_id
            FROM student_profiles
            ORDER BY id ASC
            LIMIT 100
        """)
        students_result = user_db.execute(students_query)
        students = students_result.fetchall()

        if not students:
            print("ERROR: No student profiles found")
            return

        print(f"SUCCESS: Found {len(students)} student profiles")

        investments_created = 0
        students_with_subscriptions = 0

        for student in students:
            # Randomly decide if this student has subscriptions (50% chance)
            if random.random() > 0.5:
                continue

            students_with_subscriptions += 1

            # Number of historical subscriptions (1-3)
            num_subscriptions = random.randint(1, 3)
            selected_plans = random.sample(plans, min(num_subscriptions, len(plans)))

            # Set current subscription (most recent one)
            current_plan = selected_plans[0]
            is_active = random.random() > 0.3  # 70% chance of being active

            if is_active:
                start_date = datetime.now() - timedelta(days=random.randint(5, 30))
                end_date = datetime.now() + timedelta(days=random.randint(10, 60))
            else:
                days_ago = random.randint(60, 180)
                start_date = datetime.now() - timedelta(days=days_ago)
                end_date = start_date + timedelta(days=current_plan.duration_days)

            # Update student_profiles with current subscription
            update_student = text("""
                UPDATE student_profiles
                SET subscription_plan_id = :plan_id,
                    subscription_started_at = :start_date,
                    subscription_expires_at = :end_date
                WHERE id = :student_id
            """)
            user_db.execute(update_student, {
                'plan_id': current_plan.id,
                'start_date': start_date,
                'end_date': end_date,
                'student_id': student.id
            })

            # Create investment records for all subscriptions
            for i, plan in enumerate(selected_plans):
                if i == 0:
                    # Current subscription
                    inv_start = start_date
                    inv_end = end_date
                    inv_status = 'active' if is_active else 'expired'
                else:
                    # Historical subscriptions
                    days_ago = random.randint(90 + (i * 30), 180 + (i * 30))
                    inv_start = datetime.now() - timedelta(days=days_ago)
                    inv_end = inv_start + timedelta(days=plan.duration_days)
                    inv_status = 'expired'

                # Payment method
                payment_method = random.choice(['Chapa Pay', 'Telebirr', 'CBE Birr', 'Credit Card'])

                # Transaction ID
                transaction_id = f'STD-{random.randint(100000000, 999999999)}'

                # Calculate estimated value (students get access to tutors and resources)
                # Assume 50 ETB value per month of access
                months = plan.duration_days / 30
                estimated_value = months * 50

                # Calculate ROI
                roi = ((estimated_value - float(plan.price)) / float(plan.price) * 100) if plan.price > 0 else 0
                roi = min(max(roi, -999.99), 999.99)  # Cap between -999.99 and 999.99

                # Create investment record
                insert_investment = text("""
                    INSERT INTO student_investments
                    (student_profile_id, investment_type, investment_name, amount, current_value,
                     roi_percentage, investment_date, maturity_date, status, description,
                     payment_method, transaction_id)
                    VALUES
                    (:student_id, 'subscription', :plan_name, :amount, :current_value,
                     :roi, :start_date, :end_date, :status, :description,
                     :payment_method, :transaction_id)
                """)
                user_db.execute(insert_investment, {
                    'student_id': student.id,
                    'plan_name': plan.name,
                    'amount': float(plan.price),
                    'current_value': float(estimated_value),
                    'roi': float(roi),
                    'start_date': inv_start.date(),
                    'end_date': inv_end.date(),
                    'status': inv_status,
                    'description': f"Premium access to tutors and learning resources for {plan.duration_days} days",
                    'payment_method': payment_method,
                    'transaction_id': transaction_id
                })

                investments_created += 1

                if investments_created % 10 == 0:
                    print(f"   Created {investments_created} investment records...")

        user_db.commit()

        print(f"\nSUCCESS: Created {investments_created} investment records for {students_with_subscriptions} students")

        # Show summary statistics
        print("\nSTATS: Summary Statistics:")

        stats_query = text("""
            SELECT
                COUNT(DISTINCT student_profile_id) as students_with_investments,
                COUNT(*) as total_investments,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_investments,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_investments,
                SUM(amount) as total_invested,
                SUM(current_value) as total_current_value,
                AVG(roi_percentage) as avg_roi
            FROM student_investments
            WHERE investment_type = 'subscription'
        """)

        stats_result = user_db.execute(stats_query)
        stats = stats_result.fetchone()

        print(f"   Students with Subscriptions: {stats.students_with_investments}")
        print(f"   Total Investment Records: {stats.total_investments}")
        print(f"   Active Subscriptions: {stats.active_investments}")
        print(f"   Expired Subscriptions: {stats.expired_investments}")
        print(f"   Total Amount Invested: {stats.total_invested:.2f} ETB")
        print(f"   Total Current Value: {stats.total_current_value:.2f} ETB")
        print(f"   Average ROI: {stats.avg_roi:.2f}%")

        # Show student_profiles with active subscriptions
        active_subs_query = text("""
            SELECT COUNT(*) as active_students
            FROM student_profiles
            WHERE subscription_plan_id IS NOT NULL
              AND subscription_expires_at > NOW()
        """)
        active_result = user_db.execute(active_subs_query)
        active_count = active_result.fetchone()
        print(f"   Students with Active Subscriptions (in profiles): {active_count.active_students}")

    except Exception as e:
        user_db.rollback()
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        user_db.close()
        admin_db.close()

def clear_existing_data():
    """Clear existing student subscription data"""
    user_db = UserSession()

    try:
        print("\nCLEAR: Clearing existing student subscription data...")

        # Clear student_investments with subscription type
        delete_investments = text("DELETE FROM student_investments WHERE investment_type = 'subscription'")
        result1 = user_db.execute(delete_investments)

        # Clear subscription fields from student_profiles
        clear_profiles = text("""
            UPDATE student_profiles
            SET subscription_plan_id = NULL,
                subscription_started_at = NULL,
                subscription_expires_at = NULL
        """)
        result2 = user_db.execute(clear_profiles)

        user_db.commit()

        print(f"SUCCESS: Deleted {result1.rowcount} investment records")
        print(f"SUCCESS: Cleared {result2.rowcount} student profile subscriptions")

    except Exception as e:
        user_db.rollback()
        print(f"ERROR: {e}")
    finally:
        user_db.close()

if __name__ == "__main__":
    import sys

    print("=" * 60)
    print("Seed Student Subscriptions Script")
    print("=" * 60)

    # Check for command line argument
    clear_first = False
    if len(sys.argv) > 1 and sys.argv[1].lower() in ['--clear', '-c', 'clear']:
        clear_first = True
    elif len(sys.argv) > 1 and sys.argv[1].lower() in ['--no-clear', '-n', 'no']:
        clear_first = False
    else:
        # Try to get input, but default to 'n' if not available (non-interactive)
        try:
            response = input("\nClear existing subscription data before seeding? (y/N): ").strip().lower()
            clear_first = (response == 'y')
        except (EOFError, KeyboardInterrupt):
            print("\nNon-interactive mode: keeping existing data")
            clear_first = False

    if clear_first:
        clear_existing_data()

    seed_student_subscriptions()

    print("\nSeeding complete!")
    print("=" * 60)
