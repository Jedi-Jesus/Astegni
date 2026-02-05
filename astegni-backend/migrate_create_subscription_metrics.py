"""
Create subscription_metrics table for structured performance data
"""
import sys
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

USER_DB_URL = os.getenv('DATABASE_URL')
if USER_DB_URL.startswith('postgresql://'):
    USER_DB_URL = USER_DB_URL.replace('postgresql://', 'postgresql+psycopg://', 1)

engine = create_engine(USER_DB_URL)

create_table_sql = """
CREATE TABLE IF NOT EXISTS subscription_metrics (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER NOT NULL REFERENCES tutor_investments(id) ON DELETE CASCADE,
    tutor_profile_id INTEGER NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,

    -- Visibility Metrics
    total_impressions INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,

    -- Engagement Metrics
    clicks INTEGER DEFAULT 0,
    click_through_rate DECIMAL(5, 2) DEFAULT 0.00,

    -- Conversion Metrics
    student_connections INTEGER DEFAULT 0,
    connection_rate DECIMAL(5, 2) DEFAULT 0.00,

    -- Cost Metrics
    cost_per_impression DECIMAL(10, 4) DEFAULT 0.0000,
    cost_per_click DECIMAL(10, 2) DEFAULT 0.00,
    cost_per_connection DECIMAL(10, 2) DEFAULT 0.00,

    -- Time Period
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP,

    -- Tracking
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_metrics_investment_id
    ON subscription_metrics(investment_id);

CREATE INDEX IF NOT EXISTS idx_subscription_metrics_tutor_profile_id
    ON subscription_metrics(tutor_profile_id);

CREATE INDEX IF NOT EXISTS idx_subscription_metrics_period
    ON subscription_metrics(period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_subscription_metrics_recorded_at
    ON subscription_metrics(recorded_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_metrics_updated_at
    ON subscription_metrics;

CREATE TRIGGER trigger_update_subscription_metrics_updated_at
    BEFORE UPDATE ON subscription_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_metrics_updated_at();
"""

print("\n" + "=" * 80)
print("Creating subscription_metrics table...")
print("=" * 80)

with engine.connect() as conn:
    conn.execute(text(create_table_sql))
    conn.commit()
    print("SUCCESS: Table created successfully!")

print("\nTable structure:")
print("  - id (PRIMARY KEY)")
print("  - investment_id (FK to tutor_investments)")
print("  - tutor_profile_id (FK to tutor_profiles)")
print("  - Visibility: total_impressions, profile_views")
print("  - Engagement: clicks, click_through_rate")
print("  - Conversion: student_connections, connection_rate")
print("  - Cost Analysis: cost_per_impression, cost_per_click, cost_per_connection")
print("  - Time Period: period_start, period_end")
print("  - Tracking: recorded_at, updated_at")
print("\n" + "=" * 80)
