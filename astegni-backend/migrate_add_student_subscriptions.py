"""
Add subscription fields to student_profiles and create student_investments table
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

print("\n" + "=" * 80)
print("STUDENT SUBSCRIPTION MIGRATION")
print("=" * 80)

# Step 1: Add subscription fields to student_profiles
print("\n1. Adding subscription fields to student_profiles table...")

alter_student_profiles = """
-- Add subscription fields (no FK since subscription_plans is in admin_db)
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS subscription_plan_id INTEGER,
ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;

-- Add comment to document the relationship
COMMENT ON COLUMN student_profiles.subscription_plan_id IS 'References subscription_plans.id in admin database';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_profiles_subscription_plan
    ON student_profiles(subscription_plan_id);

CREATE INDEX IF NOT EXISTS idx_student_profiles_subscription_expires
    ON student_profiles(subscription_expires_at);
"""

with engine.connect() as conn:
    conn.execute(text(alter_student_profiles))
    conn.commit()
    print("SUCCESS: Added subscription fields to student_profiles")

# Step 2: Create student_investments table
print("\n2. Creating student_investments table...")

create_student_investments = """
CREATE TABLE IF NOT EXISTS student_investments (
    id SERIAL PRIMARY KEY,
    student_profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,

    -- Investment Details
    investment_type VARCHAR(50) NOT NULL,           -- 'subscription', 'course', 'material', etc.
    investment_name VARCHAR(255) NOT NULL,          -- Name of what was purchased

    -- Financial
    amount NUMERIC(10, 2) NOT NULL,                 -- Amount paid
    current_value NUMERIC(10, 2) DEFAULT 0,         -- Current estimated value
    roi_percentage NUMERIC(5, 2) DEFAULT 0,         -- ROI (-999.99 to 999.99)

    -- Dates
    investment_date DATE NOT NULL,                  -- Purchase/start date
    maturity_date DATE,                             -- End/expiry date

    -- Status
    status VARCHAR(50) DEFAULT 'active',            -- 'active', 'expired', 'completed', 'cancelled'

    -- Additional Info
    description TEXT,                               -- Additional details
    payment_method VARCHAR(100),                    -- How they paid
    transaction_id VARCHAR(255),                    -- Transaction reference

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_investments_student_profile_id
    ON student_investments(student_profile_id);

CREATE INDEX IF NOT EXISTS idx_student_investments_investment_type
    ON student_investments(investment_type);

CREATE INDEX IF NOT EXISTS idx_student_investments_status
    ON student_investments(status);

CREATE INDEX IF NOT EXISTS idx_student_investments_dates
    ON student_investments(investment_date, maturity_date);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_investments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_student_investments_updated_at
    ON student_investments;

CREATE TRIGGER trigger_update_student_investments_updated_at
    BEFORE UPDATE ON student_investments
    FOR EACH ROW
    EXECUTE FUNCTION update_student_investments_updated_at();
"""

with engine.connect() as conn:
    conn.execute(text(create_student_investments))
    conn.commit()
    print("SUCCESS: Created student_investments table")

print("\n" + "=" * 80)
print("MIGRATION COMPLETE")
print("=" * 80)

print("\nChanges made:")
print("\n1. student_profiles table:")
print("   - subscription_plan_id (INTEGER, FK to subscription_plans)")
print("   - subscription_started_at (TIMESTAMP)")
print("   - subscription_expires_at (TIMESTAMP)")

print("\n2. student_investments table (NEW):")
print("   - id (PRIMARY KEY)")
print("   - student_profile_id (FK to student_profiles)")
print("   - investment_type ('subscription', 'course', 'material', etc.)")
print("   - investment_name (VARCHAR)")
print("   - amount, current_value, roi_percentage")
print("   - investment_date, maturity_date")
print("   - status ('active', 'expired', 'completed', 'cancelled')")
print("   - description, payment_method, transaction_id")
print("   - created_at, updated_at")

print("\n" + "=" * 80)
