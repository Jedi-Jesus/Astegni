# Subscription Metrics System

## Overview
Complete system for tracking tutor subscriptions and their performance metrics with structured, queryable data.

---

## Database Structure

### A. Subscription Records Storage

Subscriptions are stored in **TWO locations**:

#### 1. **tutor_profiles** table (Current/Active Subscription)
Stores the **current subscription** for each tutor:

```sql
-- Fields:
subscription_plan_id INTEGER      -- FK to subscription_plans.id in admin_db
subscription_started_at TIMESTAMP -- When current subscription started
subscription_expires_at TIMESTAMP -- When current subscription expires
```

**Purpose**: Quick access to current subscription status

#### 2. **tutor_investments** table (Full Subscription History)
Stores **ALL subscription history** as investment records:

```sql
-- Fields:
id SERIAL PRIMARY KEY
tutor_profile_id INTEGER         -- FK to tutor_profiles.id
investment_type VARCHAR          -- Always 'subscription' for subscriptions
investment_name VARCHAR          -- Plan name (e.g., "Premium", "Basic +")
amount NUMERIC(10,2)            -- Subscription cost
current_value NUMERIC(10,2)     -- Estimated value based on connections
roi_percentage NUMERIC(5,2)     -- Return on Investment (-999.99 to 999.99)
investment_date DATE            -- Start date
maturity_date DATE              -- End date
status VARCHAR                  -- 'active' or 'expired'
description TEXT                -- Summary text: "X impressions, Y clicks, Z connections"
```

**Purpose**: Complete historical record with ROI tracking

---

### B. Performance Metrics Storage

#### **subscription_metrics** table (Structured Performance Data)
Stores **detailed, queryable metrics** for each subscription:

```sql
CREATE TABLE subscription_metrics (
    id SERIAL PRIMARY KEY,
    investment_id INTEGER NOT NULL,              -- FK to tutor_investments.id
    tutor_profile_id INTEGER NOT NULL,           -- FK to tutor_profiles.id

    -- VISIBILITY METRICS
    total_impressions INTEGER DEFAULT 0,         -- How many times shown
    profile_views INTEGER DEFAULT 0,             -- Profile page visits

    -- ENGAGEMENT METRICS
    clicks INTEGER DEFAULT 0,                    -- Total clicks
    click_through_rate DECIMAL(5,2) DEFAULT 0,   -- CTR percentage

    -- CONVERSION METRICS
    student_connections INTEGER DEFAULT 0,       -- Successful connections
    connection_rate DECIMAL(5,2) DEFAULT 0,      -- Conversion percentage

    -- COST ANALYSIS
    cost_per_impression DECIMAL(10,4),           -- CPI (4 decimal places)
    cost_per_click DECIMAL(10,2),                -- CPC
    cost_per_connection DECIMAL(10,2),           -- Cost per connection

    -- TIME PERIOD
    period_start TIMESTAMP NOT NULL,             -- Metrics start date
    period_end TIMESTAMP,                        -- Metrics end date

    -- TRACKING
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes for Performance**:
- `idx_subscription_metrics_investment_id` - Fast lookup by investment
- `idx_subscription_metrics_tutor_profile_id` - Fast lookup by tutor
- `idx_subscription_metrics_period` - Fast time-based queries
- `idx_subscription_metrics_recorded_at` - Fast chronological queries

**Auto-update Trigger**: `updated_at` automatically updates on row modification

---

## Benefits of Structured Metrics

### ✅ Advantages

1. **Queryable Data**: Filter/search by any metric
   ```sql
   -- Find high-performing subscriptions
   SELECT * FROM subscription_metrics
   WHERE click_through_rate > 5.0
   AND student_connections > 50;
   ```

2. **Analytics Ready**: Easy aggregations and reporting
   ```sql
   -- Average CTR by tutor
   SELECT tutor_profile_id, AVG(click_through_rate)
   FROM subscription_metrics
   GROUP BY tutor_profile_id;
   ```

3. **Scalable**: Add new metrics fields easily
4. **Data Integrity**: Type-safe with proper constraints
5. **Historical Tracking**: Track metric changes over time

### ❌ Old Approach (Text in description field)
```
description: "11,613 impressions, 160 clicks, 8 connections"
```
- Cannot query or filter
- Parsing required
- Fragile (typos, format changes)

---

## API Endpoints

### 1. Get All Subscriptions for a Tutor
```
GET /api/subscriptions/tutor/{tutor_profile_id}?include_metrics=true
```

**Response**:
```json
[
  {
    "id": 1,
    "tutor_profile_id": 2,
    "plan_id": 8,
    "plan_name": "Premium",
    "amount": 5000.00,
    "current_value": 8200.00,
    "roi_percentage": 64.00,
    "status": "active",
    "start_date": "2025-07-13T00:00:00",
    "end_date": "2028-04-08T00:00:00",
    "description": "15,516 impressions, 669 clicks, 82 connections",
    "metrics": {
      "total_impressions": 15516,
      "profile_views": 415,
      "clicks": 669,
      "click_through_rate": 4.31,
      "student_connections": 82,
      "connection_rate": 19.76,
      "cost_per_impression": 0.3222,
      "cost_per_click": 7.47,
      "cost_per_connection": 60.98
    }
  }
]
```

### 2. Get Current Active Subscription
```
GET /api/subscriptions/current?tutor_profile_id=2
```

Returns only the active subscription with metrics.

### 3. Get Detailed Metrics
```
GET /api/subscriptions/metrics/{investment_id}
```

Returns comprehensive metrics for a specific subscription investment.

---

## Data Seeding

### Script: `seed_tutor_subscriptions_v2.py`

**Features**:
- Reads subscription plans from `astegni_admin_db`
- Updates `tutor_profiles` with current subscription
- Creates investment records in `tutor_investments`
- Generates realistic metrics in `subscription_metrics`
- Calculates: CTR, conversion rates, CPI, CPC, ROI

**Usage**:
```bash
# Clear existing and reseed
python seed_tutor_subscriptions_v2.py --clear

# Keep existing, add more
python seed_tutor_subscriptions_v2.py --no-clear

# Interactive mode
python seed_tutor_subscriptions_v2.py
```

**What it creates**:
- 1-3 subscriptions per tutor (random)
- Mix of active/expired subscriptions
- Realistic metrics:
  - Impressions: 500-50,000
  - CTR: 1-5%
  - Conversion: 5-15%
  - ROI: -85% to 999%

---

## Verification Scripts

### 1. `verify_subscriptions.py`
Shows tutor profiles and investment records

### 2. `verify_subscription_metrics.py`
Shows detailed metrics breakdown with summary statistics

**Run**:
```bash
python verify_subscription_metrics.py
```

**Output Example**:
```
TUTOR PROFILE ID: 2
Subscription: Premium
  Amount: 5000.00 ETB
  Status: active

  VISIBILITY METRICS:
    Total Impressions: 15,516
    Profile Views: 415

  ENGAGEMENT METRICS:
    Clicks: 669
    Click-Through Rate: 4.31%

  CONVERSION METRICS:
    Student Connections: 82
    Connection Rate: 19.76%

  COST ANALYSIS:
    Cost Per Impression: 0.3222 ETB
    Cost Per Click: 7.47 ETB
    Cost Per Connection: 60.98 ETB
```

---

## Migration Files

1. **`migrate_create_subscription_metrics.py`**
   - Creates `subscription_metrics` table
   - Adds indexes and triggers
   - Run once to set up the structure

---

## Frontend Integration

The frontend (`earnings-investments-manager.js`) fetches subscription data with metrics from the API and displays:

1. **Subscription History Cards**: Shows all subscriptions with status badges
2. **Performance Metrics Modal**: Detailed analytics with sidebar navigation
3. **ROI Calculations**: Based on estimated value per connection (100 ETB)
4. **Cost Analysis**: CPI, CPC, cost per connection

**Data Flow**:
```
Frontend → API → Database
         ↓
  subscription_metrics table
  (structured, queryable data)
```

---

## Summary

### Storage Locations:

| Data Type | Table | Purpose |
|-----------|-------|---------|
| Current subscription | `tutor_profiles` | Quick status lookup |
| Subscription history | `tutor_investments` | Investment tracking |
| Performance metrics | `subscription_metrics` | Detailed analytics |

### Key Benefits:

✅ **Structured data** - No more text parsing
✅ **Queryable** - Filter, aggregate, analyze
✅ **Scalable** - Easy to add new metrics
✅ **Type-safe** - Database constraints
✅ **Fast** - Indexed for performance

---

## Next Steps (Optional Enhancements)

1. **Real-time metrics updates** - Background job to update metrics
2. **Metrics history** - Track metric changes over time
3. **Comparative analytics** - Compare performance across plans
4. **Predictive modeling** - Forecast ROI based on historical data
5. **Alerts** - Notify when metrics fall below thresholds
