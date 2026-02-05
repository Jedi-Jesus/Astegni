"""
Verify subscription metrics data
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

USER_DB_URL = os.getenv('DATABASE_URL')
if USER_DB_URL.startswith('postgresql://'):
    USER_DB_URL = USER_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

engine = create_engine(USER_DB_URL)

print("\n" + "=" * 80)
print("SUBSCRIPTION METRICS")
print("=" * 80)

with engine.connect() as conn:
    # Get all subscription metrics with investment details
    result = conn.execute(text("""
        SELECT
            sm.id,
            sm.tutor_profile_id,
            ti.investment_name,
            ti.amount,
            ti.status,
            sm.total_impressions,
            sm.profile_views,
            sm.clicks,
            sm.click_through_rate,
            sm.student_connections,
            sm.connection_rate,
            sm.cost_per_impression,
            sm.cost_per_click,
            sm.cost_per_connection,
            sm.period_start,
            sm.period_end
        FROM subscription_metrics sm
        JOIN tutor_investments ti ON sm.investment_id = ti.id
        ORDER BY sm.tutor_profile_id, sm.period_start DESC
    """))

    metrics = result.fetchall()

    if not metrics:
        print("\nNo metrics found in database.")
    else:
        current_tutor = None
        for metric in metrics:
            if current_tutor != metric.tutor_profile_id:
                current_tutor = metric.tutor_profile_id
                print(f"\n{'='*80}")
                print(f"TUTOR PROFILE ID: {current_tutor}")
                print(f"{'='*80}")

            print(f"\nSubscription: {metric.investment_name}")
            print(f"  Amount: {metric.amount:.2f} ETB")
            print(f"  Status: {metric.status}")
            print(f"  Period: {metric.period_start.date()} to {metric.period_end.date()}")
            print(f"\n  VISIBILITY METRICS:")
            print(f"    Total Impressions: {metric.total_impressions:,}")
            print(f"    Profile Views: {metric.profile_views:,}")
            print(f"\n  ENGAGEMENT METRICS:")
            print(f"    Clicks: {metric.clicks:,}")
            print(f"    Click-Through Rate: {metric.click_through_rate:.2f}%")
            print(f"\n  CONVERSION METRICS:")
            print(f"    Student Connections: {metric.student_connections}")
            print(f"    Connection Rate: {metric.connection_rate:.2f}%")
            print(f"\n  COST ANALYSIS:")
            print(f"    Cost Per Impression: {metric.cost_per_impression:.4f} ETB")
            print(f"    Cost Per Click: {metric.cost_per_click:.2f} ETB")
            print(f"    Cost Per Connection: {metric.cost_per_connection:.2f} ETB")

print("\n" + "=" * 80)
print("SUMMARY STATISTICS")
print("=" * 80)

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT
            COUNT(*) as total_metrics,
            COUNT(DISTINCT tutor_profile_id) as tutors_tracked,
            SUM(total_impressions) as total_impressions,
            SUM(clicks) as total_clicks,
            SUM(student_connections) as total_connections,
            AVG(click_through_rate) as avg_ctr,
            AVG(connection_rate) as avg_conversion,
            AVG(cost_per_impression) as avg_cpi,
            AVG(cost_per_click) as avg_cpc
        FROM subscription_metrics
    """))

    stats = result.fetchone()

    print(f"\n  Total Metrics Records: {stats.total_metrics}")
    print(f"  Tutors Tracked: {stats.tutors_tracked}")
    print(f"  Total Impressions: {stats.total_impressions:,}")
    print(f"  Total Clicks: {stats.total_clicks:,}")
    print(f"  Total Connections: {stats.total_connections}")
    print(f"  Average CTR: {stats.avg_ctr:.2f}%")
    print(f"  Average Conversion Rate: {stats.avg_conversion:.2f}%")
    print(f"  Average CPI: {stats.avg_cpi:.4f} ETB")
    print(f"  Average CPC: {stats.avg_cpc:.2f} ETB")

print("\n" + "=" * 80)
