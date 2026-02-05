"""
Test the tutor subscriptions endpoint
"""
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

print("\n" + "=" * 80)
print("TESTING TUTOR SUBSCRIPTIONS QUERY")
print("=" * 80)

with engine.connect() as conn:
    # Get a tutor profile
    tutor_query = text("SELECT id, user_id FROM tutor_profiles LIMIT 1")
    result = conn.execute(tutor_query)
    tutor = result.fetchone()

    if not tutor:
        print("[ERROR] No tutor profiles found")
        exit(1)

    print(f"\nTesting with tutor_profile_id: {tutor.id}, user_id: {tutor.user_id}")

    # Test the updated query
    query = text("""
        SELECT
            ti.id,
            ti.tutor_profile_id,
            u.subscription_plan_id as plan_id,
            ti.investment_name as plan_name,
            ti.description,
            ti.amount,
            ti.current_value,
            ti.roi_percentage,
            ti.status,
            ti.investment_date as start_date,
            ti.maturity_date as end_date,
            ti.created_at,
            sm.total_impressions,
            sm.profile_views,
            sm.clicks,
            sm.click_through_rate,
            sm.student_connections,
            sm.connection_rate,
            sm.cost_per_impression,
            sm.cost_per_click,
            sm.cost_per_connection
        FROM tutor_investments ti
        JOIN tutor_profiles tp ON ti.tutor_profile_id = tp.id
        JOIN users u ON tp.user_id = u.id
        LEFT JOIN subscription_metrics sm ON ti.id = sm.investment_id
        WHERE ti.tutor_profile_id = :tutor_id
          AND ti.investment_type = 'subscription'
        ORDER BY ti.investment_date DESC
    """)

    result = conn.execute(query, {'tutor_id': tutor.id})
    rows = result.fetchall()

    if rows:
        print(f"\n[OK] Found {len(rows)} subscription investments:")
        for row in rows:
            print(f"\n  Investment ID: {row.id}")
            print(f"  Plan ID (from users table): {row.plan_id}")
            print(f"  Plan Name: {row.plan_name}")
            print(f"  Amount: {row.amount} ETB")
            print(f"  Status: {row.status}")
            print(f"  Impressions: {row.total_impressions or 0}")
            print(f"  Clicks: {row.clicks or 0}")
            print(f"  Connections: {row.student_connections or 0}")
    else:
        print("\n[INFO] No subscription investments found for this tutor")

    # Also test the current subscription query
    print("\n" + "-" * 80)
    print("Testing current subscription query...")

    current_sub_query = text("""
        SELECT subscription_plan_id, subscription_started_at, subscription_expires_at
        FROM users
        WHERE id = :user_id
    """)

    result = conn.execute(current_sub_query, {'user_id': tutor.user_id})
    user = result.fetchone()

    if user and user.subscription_plan_id:
        print(f"\n[OK] Current subscription found:")
        print(f"  Plan ID: {user.subscription_plan_id}")
        print(f"  Started: {user.subscription_started_at}")
        print(f"  Expires: {user.subscription_expires_at}")
    else:
        print("\n[INFO] No current subscription for this user")

print("\n" + "=" * 80)
print("TEST COMPLETE!")
print("=" * 80)
