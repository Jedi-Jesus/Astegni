"""
Verify seeded subscription data
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

USER_DB_URL = os.getenv('DATABASE_URL')
ADMIN_DB_URL = os.getenv('ADMIN_DATABASE_URL')

if USER_DB_URL.startswith('postgresql://'):
    USER_DB_URL = USER_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)
if ADMIN_DB_URL.startswith('postgresql://'):
    ADMIN_DB_URL = ADMIN_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

user_engine = create_engine(USER_DB_URL)
admin_engine = create_engine(ADMIN_DB_URL)

print("\n" + "=" * 80)
print("TUTOR PROFILES WITH SUBSCRIPTIONS")
print("=" * 80)

# First get subscription plans from admin database
plans_dict = {}
with admin_engine.connect() as admin_conn:
    result = admin_conn.execute(text("SELECT id, package_title FROM subscription_plans"))
    for row in result:
        plans_dict[row.id] = row.package_title

with user_engine.connect() as conn:
    # Get tutor profiles with subscriptions
    result = conn.execute(text("""
        SELECT id, subscription_plan_id, subscription_started_at,
               subscription_expires_at
        FROM tutor_profiles
        WHERE subscription_plan_id IS NOT NULL
        ORDER BY id
    """))

    tutors = result.fetchall()

    for tutor in tutors:
        plan_name = plans_dict.get(tutor.subscription_plan_id, 'Unknown Plan')
        print(f"\nTutor ID: {tutor.id}")
        print(f"  Plan: {plan_name} (ID: {tutor.subscription_plan_id})")
        print(f"  Started: {tutor.subscription_started_at}")
        print(f"  Expires: {tutor.subscription_expires_at}")

print("\n" + "=" * 80)
print("TUTOR INVESTMENTS (SUBSCRIPTIONS)")
print("=" * 80)

with user_engine.connect() as conn:
    # Get investment records
    result = conn.execute(text("""
        SELECT tutor_profile_id, investment_name, amount, current_value,
               roi_percentage, status, investment_date, maturity_date, description
        FROM tutor_investments
        WHERE investment_type = 'subscription'
        ORDER BY tutor_profile_id, investment_date DESC
    """))

    investments = result.fetchall()

    current_tutor = None
    for inv in investments:
        if current_tutor != inv.tutor_profile_id:
            current_tutor = inv.tutor_profile_id
            print(f"\n--- Tutor Profile ID: {current_tutor} ---")

        print(f"\n  Investment: {inv.investment_name}")
        print(f"  Amount: {inv.amount:.2f} ETB")
        print(f"  Current Value: {inv.current_value:.2f} ETB")
        print(f"  ROI: {inv.roi_percentage:.2f}%")
        print(f"  Status: {inv.status}")
        print(f"  Date: {inv.investment_date} to {inv.maturity_date}")
        print(f"  Metrics: {inv.description}")

print("\n" + "=" * 80)
