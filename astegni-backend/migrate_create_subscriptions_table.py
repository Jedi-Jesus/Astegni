"""
Create student_subscriptions table for testing
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
CREATE TABLE IF NOT EXISTS student_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    plan_name VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    payment_method VARCHAR(100),
    transaction_id VARCHAR(255),
    total_impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    profile_views INTEGER DEFAULT 0,
    student_connections INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_user_id ON student_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status ON student_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_dates ON student_subscriptions(start_date, end_date);
"""

print("Creating student_subscriptions table...")
with engine.connect() as conn:
    conn.execute(text(create_table_sql))
    conn.commit()
    print("SUCCESS: Table created successfully!")
