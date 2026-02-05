# Student Subscription System

## Overview
Complete system for tracking student subscriptions and investment history.

---

## Database Structure

### A. Student Subscription Records Storage

Student subscriptions are stored in **TWO locations**:

#### 1. **student_profiles** table (Current Subscription)
Stores the **current active subscription** for each student:

```sql
-- New fields added:
subscription_plan_id INTEGER          -- References subscription_plans.id in admin_db
subscription_started_at TIMESTAMP     -- When current subscription started
subscription_expires_at TIMESTAMP     -- When current subscription expires
```

**Purpose**: Quick access to current subscription status

**Note**: `subscription_plan_id` references `subscription_plans.id` in the admin database (documented via column comment, no FK constraint since it's cross-database)

#### 2. **student_investments** table (Full Investment History)
Stores **ALL student investments** including subscription history:

```sql
CREATE TABLE student_investments (
    id SERIAL PRIMARY KEY,
    student_profile_id INTEGER NOT NULL,    -- FK to student_profiles.id

    -- Investment Details
    investment_type VARCHAR(50) NOT NULL,    -- 'subscription', 'course', 'material', etc.
    investment_name VARCHAR(255) NOT NULL,   -- Name of what was purchased

    -- Financial
    amount NUMERIC(10, 2) NOT NULL,          -- Amount paid
    current_value NUMERIC(10, 2) DEFAULT 0,  -- Current estimated value
    roi_percentage NUMERIC(5, 2) DEFAULT 0,  -- ROI (-999.99 to 999.99)

    -- Dates
    investment_date DATE NOT NULL,           -- Purchase/start date
    maturity_date DATE,                      -- End/expiry date

    -- Status
    status VARCHAR(50) DEFAULT 'active',     -- 'active', 'expired', 'completed', 'cancelled'

    -- Additional Info
    description TEXT,                        -- Additional details
    payment_method VARCHAR(100),             -- How they paid
    transaction_id VARCHAR(255),             -- Transaction reference

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
- `idx_student_investments_student_profile_id` - Fast lookup by student
- `idx_student_investments_investment_type` - Fast filtering by type
- `idx_student_investments_status` - Fast status queries
- `idx_student_investments_dates` - Fast date range queries

**Auto-update Trigger**: `updated_at` automatically updates on row modification

---

## Why No subscription_metrics for Students?

**Students don't need performance metrics** because:

1. **Students are consumers, not promoters**
   - Tutors need metrics (impressions, CTR, connections) because they're being promoted
   - Students just consume services (access to tutors, resources)

2. **Different value proposition**
   - Tutors: ROI = (connections generated) / (subscription cost)
   - Students: ROI = (educational value) / (subscription cost)

3. **Simpler tracking**
   - Students track: payment history, active subscriptions, access duration
   - No need for: impressions, clicks, profile views, CTR, etc.

---

## Comparison: Tutors vs Students

| Aspect | Tutors | Students |
|--------|--------|----------|
| **Profile Table** | tutor_profiles | student_profiles |
| **Investment Table** | tutor_investments | student_investments |
| **Metrics Table** | subscription_metrics | ❌ Not needed |
| **Subscription Fields** | ✅ Yes (in tutor_profiles) | ✅ Yes (in student_profiles) |
| **Performance Tracking** | CTR, CPI, connections | Simple access tracking |
| **ROI Calculation** | Based on connections | Based on educational value |

---

## Data Seeding

### Script: `seed_student_subscriptions.py`

**Features**:
- Reads subscription plans from `astegni_admin_db`
- Updates `student_profiles` with current subscription
- Creates investment records in `student_investments`
- Generates realistic payment methods and transaction IDs
- Calculates ROI based on educational value (50 ETB/month of access)

**Usage**:
```bash
# Clear existing and reseed
python seed_student_subscriptions.py --clear

# Keep existing, add more
python seed_student_subscriptions.py --no-clear

# Interactive mode
python seed_student_subscriptions.py
```

**What it creates**:
- 50% of students get subscriptions (random)
- 1-3 subscriptions per student (historical + current)
- Mix of active/expired subscriptions
- Payment methods: Chapa Pay, Telebirr, CBE Birr, Credit Card
- Transaction IDs: STD-XXXXXXXXX format

**ROI Calculation**:
```python
months = plan.duration_days / 30
estimated_value = months * 50  # 50 ETB value per month
roi = ((estimated_value - price) / price * 100)
```

---

## Verification Scripts

### `verify_student_subscriptions.py`
Shows student profiles and investment records with full details.

**Run**:
```bash
python verify_student_subscriptions.py
```

**Output Example**:
```
Student ID: 1
  Plan: Standard + (ID: 8)
  Started: 2026-01-14
  Expires: 2026-03-09

--- Student Profile ID: 1 ---
  Investment: Standard +
  Amount: 2800.00 ETB
  Current Value: 833.33 ETB
  ROI: -70.24%
  Status: active
  Date: 2026-01-14 to 2026-03-09
  Payment: CBE Birr (Txn: STD-429005771)
  Description: Premium access to tutors and learning resources for 500 days
```

---

## Migration Files

### `migrate_add_student_subscriptions.py`
- Adds subscription fields to `student_profiles` table
- Creates `student_investments` table with indexes and triggers
- Run once to set up the structure

---

## Investment Types

The `student_investments` table supports multiple investment types:

| Type | Description | Example |
|------|-------------|---------|
| `subscription` | Platform subscription | Premium plan, Basic plan |
| `course` | Course purchases | Python course, Math tutoring |
| `material` | Learning materials | Textbooks, study guides |
| `tutoring` | Tutoring packages | 10-session package |

Currently only `subscription` is implemented, but the structure supports future expansion.

---

## Frontend Integration

Students can view their subscription history in the investments tab:

1. **Current Subscription Status**: Shown in student profile
2. **Subscription History**: All past and current subscriptions
3. **Payment History**: Transaction IDs and payment methods
4. **ROI Tracking**: Value received vs cost paid

**Data Flow**:
```
Frontend → API → Database
         ↓
  student_investments table
  (subscription history)
         ↓
  student_profiles table
  (current subscription)
```

---

## Summary

### Storage Locations:

| Data Type | Table | Purpose |
|-----------|-------|---------|
| Current subscription | `student_profiles` | Quick status lookup |
| Investment history | `student_investments` | All purchases & subscriptions |

### Key Differences from Tutor System:

| Feature | Tutors | Students |
|---------|--------|----------|
| Metrics tracking | ✅ Yes (subscription_metrics) | ❌ No |
| Performance data | CTR, CPI, connections | Simple duration |
| ROI basis | Connections generated | Educational value |
| Complexity | High (3 tables) | Simple (2 tables) |

### Benefits:

✅ **Simpler structure** - Students don't need complex metrics
✅ **Flexible** - Supports multiple investment types
✅ **Complete history** - Track all purchases and subscriptions
✅ **Transaction tracking** - Payment method and transaction ID
✅ **ROI calculation** - Based on educational value

---

## Database Stats (After Seeding)

```
Students with Subscriptions: 3
Total Investment Records: 8
Active Subscriptions: 3
Expired Subscriptions: 5
Total Amount Invested: 17,500.00 ETB
Total Current Value: 5,380.02 ETB
Average ROI: -72.69%
```

**Note**: Negative ROI is expected because educational value (50 ETB/month) is typically lower than subscription cost in the short term. Long-term value comes from improved learning outcomes, not immediate financial return.

---

## Next Steps (Optional Enhancements)

1. **Usage tracking** - Track which tutors students connect with
2. **Learning progress** - Track course completion and achievements
3. **Value metrics** - Track grades, test scores improvement
4. **Recommendation system** - Suggest tutors based on subscription level
5. **Auto-renewal** - Automatic subscription renewal system
