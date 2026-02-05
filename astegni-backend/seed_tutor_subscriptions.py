"""
Seed tutor subscriptions for testing
Creates subscription records for all tutors using plans from admin database
"""
import sys
import os
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database URLs
USER_DB_URL = os.getenv('DATABASE_URL')
ADMIN_DB_URL = os.getenv('ADMIN_DATABASE_URL')

if not USER_DB_URL or not ADMIN_DB_URL:
    print("ERROR: Error: DATABASE_URL or ADMIN_DATABASE_URL not found in .env")
    sys.exit(1)

# Convert postgresql:// to postgresql+psycopg://
if USER_DB_URL.startswith('postgresql://'):
    USER_DB_URL = USER_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
if ADMIN_DB_URL.startswith('postgresql://'):
    ADMIN_DB_URL = ADMIN_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

print(f"User DB URL: {USER_DB_URL}")
print(f"Admin DB URL: {ADMIN_DB_URL}")

# Create engines
user_engine = create_engine(USER_DB_URL)
admin_engine = create_engine(ADMIN_DB_URL)

# Create sessions
UserSession = sessionmaker(bind=user_engine)
AdminSession = sessionmaker(bind=admin_engine)

def seed_tutor_subscriptions():
    """Seed subscriptions for all tutors"""
    user_db = UserSession()
    admin_db = AdminSession()

    try:
        print("\nStarting tutor subscription seeding...")

        # Get all subscription plans from admin database
        plans_query = text("""
            SELECT id, package_title as name, features::text as description,
                   package_price as price, duration_days
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY package_price ASC
        """)
        plans_result = admin_db.execute(plans_query)
        plans = plans_result.fetchall()

        if not plans:
            print("ERROR: No active subscription plans found in admin database")
            return

        print(f"Found {len(plans)} subscription plans")
        for plan in plans:
            print(f"   - {plan.name}: {plan.price} ETB for {plan.duration_days} days")

        # Get all users with tutor role (roles is JSONB containing array)
        tutors_query = text("""
            SELECT u.id as user_id, u.email, u.first_name, u.last_name
            FROM users u
            WHERE u.roles::jsonb ? 'tutor'
               OR u.roles::text LIKE '%tutor%'
            ORDER BY u.id ASC
            LIMIT 100
        """)
        tutors_result = user_db.execute(tutors_query)
        tutors = tutors_result.fetchall()

        if not tutors:
            print("ERROR: No tutors found in user database")
            return

        print(f"SUCCESS: Found {len(tutors)} tutors")

        # Create subscriptions
        subscriptions_created = 0

        for tutor in tutors:
            # Randomly decide how many subscriptions this tutor has (0-3)
            num_subscriptions = random.randint(1, 3)

            # Select random plans for this tutor
            selected_plans = random.sample(plans, min(num_subscriptions, len(plans)))

            for i, plan in enumerate(selected_plans):
                # Generate dates
                # Most recent subscription is active, older ones are expired
                if i == 0:
                    # Active subscription
                    start_date = datetime.now() - timedelta(days=random.randint(5, 20))
                    end_date = datetime.now() + timedelta(days=random.randint(10, 30))
                    status = 'active'
                else:
                    # Expired subscription
                    days_ago = random.randint(60, 180)
                    start_date = datetime.now() - timedelta(days=days_ago)
                    end_date = start_date + timedelta(days=plan.duration_days)
                    status = 'expired'

                # Generate metrics
                total_impressions = random.randint(1000, 50000) if status == 'active' else random.randint(500, 20000)
                clicks = int(total_impressions * random.uniform(0.01, 0.05))  # 1-5% CTR
                profile_views = int(clicks * random.uniform(0.5, 0.9))  # 50-90% of clicks become views
                student_connections = int(profile_views * random.uniform(0.05, 0.15))  # 5-15% conversion

                # Insert subscription
                insert_query = text("""
                    INSERT INTO student_subscriptions
                    (user_id, plan_name, description, amount, status, start_date, end_date,
                     payment_method, transaction_id, total_impressions, clicks, profile_views,
                     student_connections, created_at, updated_at)
                    VALUES
                    (:user_id, :plan_name, :description, :amount, :status, :start_date, :end_date,
                     :payment_method, :transaction_id, :total_impressions, :clicks, :profile_views,
                     :student_connections, :created_at, :updated_at)
                """)

                user_db.execute(insert_query, {
                    'user_id': tutor.user_id,
                    'plan_name': plan.name,
                    'description': plan.description,
                    'amount': float(plan.price),
                    'status': status,
                    'start_date': start_date,
                    'end_date': end_date,
                    'payment_method': random.choice(['Chapa Pay', 'Telebirr', 'CBE Birr']),
                    'transaction_id': f'TXN-{random.randint(100000000, 999999999)}',
                    'total_impressions': total_impressions,
                    'clicks': clicks,
                    'profile_views': profile_views,
                    'student_connections': student_connections,
                    'created_at': start_date,
                    'updated_at': datetime.now()
                })

                subscriptions_created += 1

                if subscriptions_created % 10 == 0:
                    print(f"   Created {subscriptions_created} subscriptions...")

        user_db.commit()

        print(f"\nSUCCESS: Successfully created {subscriptions_created} subscriptions for {len(tutors)} tutors")

        # Show summary statistics
        print("\nSTATS: Summary Statistics:")

        stats_query = text("""
            SELECT
                COUNT(*) as total_subscriptions,
                COUNT(DISTINCT user_id) as tutors_with_subscriptions,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
                COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_subscriptions,
                SUM(amount) as total_revenue,
                AVG(amount) as avg_subscription_price,
                SUM(total_impressions) as total_impressions,
                SUM(clicks) as total_clicks,
                SUM(student_connections) as total_connections
            FROM student_subscriptions
        """)

        stats_result = user_db.execute(stats_query)
        stats = stats_result.fetchone()

        print(f"   Total Subscriptions: {stats.total_subscriptions}")
        print(f"   Tutors with Subscriptions: {stats.tutors_with_subscriptions}")
        print(f"   Active Subscriptions: {stats.active_subscriptions}")
        print(f"   Expired Subscriptions: {stats.expired_subscriptions}")
        print(f"   Total Revenue: {stats.total_revenue:.2f} ETB")
        print(f"   Average Subscription Price: {stats.avg_subscription_price:.2f} ETB")
        print(f"   Total Impressions: {stats.total_impressions:,}")
        print(f"   Total Clicks: {stats.total_clicks:,}")
        print(f"   Total Student Connections: {stats.total_connections:,}")

    except Exception as e:
        user_db.rollback()
        print(f"\nERROR: Error seeding subscriptions: {e}")
        import traceback
        traceback.print_exc()
    finally:
        user_db.close()
        admin_db.close()

def clear_existing_subscriptions():
    """Clear all existing subscriptions (for re-seeding)"""
    user_db = UserSession()

    try:
        print("\nCLEAR:  Clearing existing subscriptions...")

        delete_query = text("DELETE FROM student_subscriptions")
        result = user_db.execute(delete_query)
        user_db.commit()

        print(f"SUCCESS: Deleted {result.rowcount} existing subscriptions")

    except Exception as e:
        user_db.rollback()
        print(f"ERROR: Error clearing subscriptions: {e}")
    finally:
        user_db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("Seed Tutor Subscriptions Script")
    print("=" * 60)

    # Ask if user wants to clear existing subscriptions
    response = input("\nClear existing subscriptions before seeding? (y/N): ").strip().lower()

    if response == 'y':
        clear_existing_subscriptions()

    seed_tutor_subscriptions()

    print("\nSeeding complete!")
    print("=" * 60)
