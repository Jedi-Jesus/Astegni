"""
Check tutor subscriptions for jediael.s.abebe@gmail.com
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("CHECKING TUTOR SUBSCRIPTIONS FOR jediael.s.abebe@gmail.com")
print("=" * 80)

with engine.connect() as conn:
    # Get user ID
    print("\n1. Finding user...")
    user_query = text("SELECT id, email FROM users WHERE email = :email")
    user_result = conn.execute(user_query, {'email': 'jediael.s.abebe@gmail.com'})
    user = user_result.fetchone()

    if not user:
        print("[ERROR] User not found!")
        exit(1)

    print(f"[OK] User found: ID={user.id}, Email={user.email}")

    # Get tutor profile
    print("\n2. Finding tutor profile...")
    tutor_query = text("SELECT id, subscription_plan_id, subscription_started_at, subscription_expires_at FROM tutor_profiles WHERE user_id = :user_id")
    tutor_result = conn.execute(tutor_query, {'user_id': user.id})
    tutor = tutor_result.fetchone()

    if not tutor:
        print("[ERROR] Tutor profile not found!")
        exit(1)

    print(f"[OK] Tutor profile found: ID={tutor.id}")
    print(f"   Current subscription_plan_id: {tutor.subscription_plan_id}")
    print(f"   Subscription started: {tutor.subscription_started_at}")
    print(f"   Subscription expires: {tutor.subscription_expires_at}")

    # Get tutor investments
    print("\n3. Finding tutor investments...")
    investments_query = text("""
        SELECT
            id,
            investment_type,
            investment_name,
            amount,
            current_value,
            roi_percentage,
            status,
            investment_date,
            maturity_date
        FROM tutor_investments
        WHERE tutor_profile_id = :tutor_id
        ORDER BY investment_date DESC
    """)
    investments_result = conn.execute(investments_query, {'tutor_id': tutor.id})
    investments = investments_result.fetchall()

    if not investments:
        print("[ERROR] No investments found!")
    else:
        print(f"[OK] Found {len(investments)} investment(s):")
        for inv in investments:
            print(f"\n   Investment ID: {inv.id}")
            print(f"   Type: {inv.investment_type}")
            print(f"   Name: {inv.investment_name}")
            print(f"   Amount: {inv.amount} ETB")
            print(f"   Current Value: {inv.current_value} ETB")
            print(f"   ROI: {inv.roi_percentage}%")
            print(f"   Status: {inv.status}")
            print(f"   Date: {inv.investment_date} to {inv.maturity_date}")

    # Get subscription metrics
    print("\n4. Finding subscription metrics...")
    metrics_query = text("""
        SELECT
            sm.*
        FROM subscription_metrics sm
        JOIN tutor_investments ti ON sm.investment_id = ti.id
        WHERE ti.tutor_profile_id = :tutor_id
        ORDER BY sm.recorded_at DESC
    """)
    metrics_result = conn.execute(metrics_query, {'tutor_id': tutor.id})
    metrics = metrics_result.fetchall()

    if not metrics:
        print("[ERROR] No subscription metrics found!")
    else:
        print(f"[OK] Found {len(metrics)} metric record(s):")
        for m in metrics:
            print(f"\n   Investment ID: {m.investment_id}")
            print(f"   Total Impressions: {m.total_impressions}")
            print(f"   Profile Views: {m.profile_views}")
            print(f"   Clicks: {m.clicks}")
            print(f"   CTR: {m.click_through_rate}%")
            print(f"   Connections: {m.student_connections}")
            print(f"   Connection Rate: {m.connection_rate}%")

print("\n" + "=" * 80)
