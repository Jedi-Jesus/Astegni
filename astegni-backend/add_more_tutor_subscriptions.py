"""
Add more subscription investment records for jediael.s.abebe@gmail.com
"""
from sqlalchemy import create_engine, text
import os
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

# Database connections
DATABASE_URL = os.getenv('DATABASE_URL')
ADMIN_DATABASE_URL = os.getenv('ADMIN_DATABASE_URL')

user_engine = create_engine(DATABASE_URL)
admin_engine = create_engine(ADMIN_DATABASE_URL)

print("\n" + "=" * 80)
print("ADDING MORE SUBSCRIPTIONS FOR jediael.s.abebe@gmail.com")
print("=" * 80)

# Get subscription plans from admin database
with admin_engine.connect() as admin_db:
    plans_query = text("SELECT id, package_title, package_price, duration_days FROM subscription_plans ORDER BY id")
    plans_result = admin_db.execute(plans_query)
    plans = [dict(zip(['id', 'name', 'price', 'duration_days'], row)) for row in plans_result.fetchall()]
    print(f"\nFound {len(plans)} subscription plans")

# Get user and tutor profile
with user_engine.connect() as user_db:
    # Get user ID
    user_query = text("SELECT id FROM users WHERE email = :email")
    user_result = user_db.execute(user_query, {'email': 'jediael.s.abebe@gmail.com'})
    user = user_result.fetchone()

    if not user:
        print("[ERROR] User not found!")
        exit(1)

    # Get tutor profile
    tutor_query = text("SELECT id FROM tutor_profiles WHERE user_id = :user_id")
    tutor_result = user_db.execute(tutor_query, {'user_id': user.id})
    tutor = tutor_result.fetchone()

    if not tutor:
        print("[ERROR] Tutor profile not found!")
        exit(1)

    print(f"[OK] Found tutor profile ID: {tutor.id}")

    # Add 2 more historical subscriptions
    num_new = 2
    selected_plans = random.sample(plans, min(num_new, len(plans)))

    for plan in selected_plans:
        # Generate dates in the past
        days_ago = random.randint(150, 400)
        start_date = datetime.now() - timedelta(days=days_ago)
        end_date = start_date + timedelta(days=int(plan['duration_days']))

        # Status
        status = 'expired' if end_date < datetime.now() else 'active'

        # Generate performance metrics
        total_impressions = random.randint(1500, 8000)
        clicks = int(total_impressions * random.uniform(0.02, 0.06))
        profile_views = int(clicks * random.uniform(0.5, 0.9))
        student_connections = int(profile_views * random.uniform(0.05, 0.25))

        # Calculate metrics
        ctr = (clicks / total_impressions * 100) if total_impressions > 0 else 0
        connection_rate = (student_connections / profile_views * 100) if profile_views > 0 else 0
        cpi = float(plan['price']) / total_impressions if total_impressions > 0 else 0
        cpc = float(plan['price']) / clicks if clicks > 0 else 0
        cost_per_connection = float(plan['price']) / student_connections if student_connections > 0 else 0

        # ROI calculation (100 ETB per connection)
        estimated_value = student_connections * 100
        roi = ((estimated_value - float(plan['price'])) / float(plan['price']) * 100) if plan['price'] > 0 else 0
        roi = min(max(roi, -999.99), 999.99)

        description = f"{total_impressions:,} impressions, {clicks} clicks, {student_connections} connections"

        # Create investment record
        insert_investment = text("""
            INSERT INTO tutor_investments
            (tutor_profile_id, investment_type, investment_name, amount, current_value,
             roi_percentage, investment_date, maturity_date, status, description, created_at)
            VALUES
            (:tutor_id, 'subscription', :plan_name, :amount, :current_value,
             :roi, :start_date, :end_date, :status, :description, :created_at)
            RETURNING id
        """)

        result = user_db.execute(insert_investment, {
            'tutor_id': tutor.id,
            'plan_name': plan['name'],
            'amount': float(plan['price']),
            'current_value': estimated_value,
            'roi': roi,
            'start_date': start_date,
            'end_date': end_date,
            'status': status,
            'description': description,
            'created_at': datetime.now()
        })
        investment_id = result.fetchone()[0]

        # Create subscription metrics record
        insert_metrics = text("""
            INSERT INTO subscription_metrics
            (investment_id, tutor_profile_id, total_impressions, profile_views,
             clicks, click_through_rate, student_connections, connection_rate,
             cost_per_impression, cost_per_click, cost_per_connection,
             period_start, period_end, recorded_at)
            VALUES
            (:investment_id, :tutor_id, :impressions, :views,
             :clicks, :ctr, :connections, :conn_rate,
             :cpi, :cpc, :cost_conn,
             :start_date, :end_date, :recorded_at)
        """)

        user_db.execute(insert_metrics, {
            'investment_id': investment_id,
            'tutor_id': tutor.id,
            'impressions': total_impressions,
            'views': profile_views,
            'clicks': clicks,
            'ctr': round(ctr, 2),
            'connections': student_connections,
            'conn_rate': round(connection_rate, 2),
            'cpi': round(cpi, 4),
            'cpc': round(cpc, 2),
            'cost_conn': round(cost_per_connection, 2),
            'start_date': start_date,
            'end_date': end_date,
            'recorded_at': datetime.now()
        })

        print(f"\n[OK] Created subscription: {plan['name']}")
        print(f"    Investment ID: {investment_id}")
        print(f"    Amount: {plan['price']} ETB")
        print(f"    Impressions: {total_impressions:,}")
        print(f"    Clicks: {clicks}")
        print(f"    Connections: {student_connections}")
        print(f"    ROI: {roi:.2f}%")
        print(f"    Status: {status}")
        print(f"    Period: {start_date.date()} to {end_date.date()}")

    user_db.commit()
    print(f"\n[OK] Successfully added {num_new} subscription records!")

print("\n" + "=" * 80)
