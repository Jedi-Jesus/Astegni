# Payment Tracking System - Complete Examples

**Date:** January 20, 2026

This document provides complete examples of how the payment tracking system works for both subscription and booking payments.

---

## 🎯 Key Design Principle

**`enrolled_students` is the SOURCE OF TRUTH for booking payments**

- Subscription payments: Tracked in `user_investments` (references `subscription_plans` in admin_db)
- Booking payments: Tracked in `enrolled_students` (with `agreed_price`, `package_id`, `payment_status`)
- `user_investments.student_payment_id` → `enrolled_students.id` provides access to all booking payment details

---

## 📊 Example 1: Subscription Payment Flow

### Scenario:
Tutor Abebe subscribes to the "Premium" plan (5000 ETB/month)

### Step 1: Create subscription in user_investments

```python
# When tutor subscribes
from datetime import date, timedelta

user_investment = UserInvestment(
    user_id=456,  # Abebe's user_id
    investment_type='subscription',
    investment_name='Premium Tutor Plan',
    subscription_plan_id=9,  # References admin_db.subscription_plans
    amount=None,  # Will be calculated from subscription_plans.price
    due_date=date.today() + timedelta(days=30),
    payment_status='pending',
    billing_cycle='monthly',
    is_recurring=True,
    next_billing_date=date.today() + timedelta(days=60),
    auto_renew=True
)
db.add(user_investment)
db.commit()
```

### Step 2: Get amount when needed

```sql
-- Query to get subscription payment amount
SELECT
    ui.id,
    ui.user_id,
    u.first_name,
    ui.investment_type,
    sp.price as amount,  -- From subscription_plans in admin_db
    sp.name as plan_name,
    ui.due_date,
    ui.payment_status
FROM user_investments ui
JOIN users u ON u.id = ui.user_id
LEFT JOIN admin_db.subscription_plans sp ON sp.id = ui.subscription_plan_id
WHERE ui.id = 123;

-- Returns:
-- id: 123
-- user_id: 456
-- first_name: Abebe
-- investment_type: subscription
-- amount: 5000.00
-- plan_name: Premium Tutor Plan
-- due_date: 2026-02-19
-- payment_status: pending
```

### Step 3: Process payment (when user pays)

```python
# When payment is received
investment = db.query(UserInvestment).filter(UserInvestment.id == 123).first()

investment.payment_status = 'paid'
investment.paid_date = datetime.now()
investment.payment_method = 'telebirr'
investment.transaction_id = 'TXN-20260120-5678'
investment.payment_gateway = 'telebirr'

db.commit()
```

---

## 📊 Example 2: Booking Payment Flow

### Scenario:
Student Tigist books 10 sessions with Tutor Abebe
- Tutor's package: 500 ETB/hour
- After bargaining: Agreed on 450 ETB/hour
- Total: 10 sessions × 450 = 4500 ETB

### Step 1: Create enrollment in enrolled_students (SOURCE OF TRUTH)

```python
# After tutor accepts session request
from datetime import date, timedelta

enrollment = EnrolledStudent(
    tutor_id=789,  # Abebe's tutor_profile.id
    student_id=456,  # Tigist's student_profile.id
    package_id=100,  # References tutor_packages
    agreed_price=4500.00,  # ✅ Bargained price (was 5000)
    payment_status='pending',
    payment_due_date=date.today() + timedelta(days=7),  # 7 days to pay
    payment_received_date=None,
    total_sessions=10,
    completed_sessions=0,
    cancelled_sessions=0
)
db.add(enrollment)
db.commit()
```

### Step 2: Optionally create user_investment record (for unified payment history)

```python
# Link to enrolled_students for payment tracking
user_investment = UserInvestment(
    user_id=456,  # Tigist's user_id
    investment_type='booking',
    investment_name='10 sessions with Abebe',
    student_payment_id=enrollment.id,  # ✅ References enrolled_students.id
    amount=None,  # Get from enrolled_students.agreed_price
    due_date=enrollment.payment_due_date,
    payment_status='pending'
)
db.add(user_investment)
db.commit()
```

### Step 3: Query payment details (amount comes from enrolled_students)

```sql
-- Get booking payment details
SELECT
    ui.id as investment_id,
    ui.user_id,
    u.first_name as student_name,
    ui.investment_type,
    es.agreed_price as amount,  -- ✅ From enrolled_students
    es.package_id,
    tp.name as package_name,
    tp.hourly_rate as original_hourly_rate,
    es.total_sessions,
    es.completed_sessions,
    es.payment_status,
    es.payment_due_date,
    es.payment_received_date
FROM user_investments ui
JOIN users u ON u.id = ui.user_id
JOIN enrolled_students es ON es.id = ui.student_payment_id  -- ✅ JOIN to get payment details
LEFT JOIN tutor_packages tp ON tp.id = es.package_id
WHERE ui.id = 124;

-- Returns:
-- investment_id: 124
-- user_id: 456
-- student_name: Tigist
-- investment_type: booking
-- amount: 4500.00  (from enrolled_students.agreed_price)
-- package_id: 100
-- package_name: "Math Tutoring - 10 Sessions"
-- original_hourly_rate: 500.00
-- total_sessions: 10
-- completed_sessions: 0
-- payment_status: pending
-- payment_due_date: 2026-01-27
-- payment_received_date: NULL
```

### Step 4: Process booking payment (update BOTH tables)

```python
# When payment is received
investment = db.query(UserInvestment).filter(UserInvestment.id == 124).first()
enrollment = db.query(EnrolledStudent).filter(EnrolledStudent.id == investment.student_payment_id).first()

# Update user_investments
investment.payment_status = 'paid'
investment.paid_date = datetime.now()
investment.payment_method = 'chapa'
investment.transaction_id = 'CHAPA-20260122-9876'
investment.payment_gateway = 'chapa'

# Update enrolled_students (source of truth)
enrollment.payment_status = 'paid'
enrollment.payment_received_date = datetime.now()

db.commit()
```

---

## 📊 Example 3: Payment Reliability Penalty Calculation

### Scenario:
Calculate payment penalty for Tutor Abebe who has:
- 3 subscription payments (2 paid on time, 1 late)
- 2 booking payments (1 paid, 1 missed with 2500 ETB debt)

### Query used by `calculate_payment_reliability_penalty()`:

```sql
SELECT
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE ui.payment_status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE ui.payment_status = 'late') as late_count,
    COUNT(*) FILTER (WHERE ui.payment_status = 'missed') as missed_count,
    COALESCE(
        SUM(
            CASE
                -- For bookings, get amount from enrolled_students.agreed_price
                WHEN ui.investment_type = 'booking' THEN es.agreed_price
                -- For subscriptions, use ui.amount (or get from subscription_plans)
                ELSE ui.amount
            END
        ) FILTER (WHERE ui.payment_status IN ('pending', 'late', 'missed')),
        0
    ) as total_debt,
    COALESCE(SUM(ui.late_fee), 0) as total_late_fees,
    MAX(ui.days_overdue) as max_days_overdue
FROM user_investments ui
LEFT JOIN enrolled_students es ON es.id = ui.student_payment_id
WHERE ui.user_id = 456  -- Abebe's user_id
AND ui.investment_type IN ('subscription', 'booking')
AND ui.due_date IS NOT NULL
```

### Results:

```
total_payments: 5
paid_count: 3
late_count: 1
missed_count: 1
total_debt: 2500.00  (from the missed booking)
total_late_fees: 125.00
max_days_overdue: 15
```

### Penalty Calculation:

```python
penalty = 0

# 1. Late payments: 1 × -5 = -5
penalty += (1 * -5)

# 2. Missed payments: 1 × -15 = -15
penalty += (1 * -15)

# 3. Accumulated debt: 2500 / 100 = -25
penalty += (2500 / 100) * -1

# Total penalty: -45 points
penalty = -45
```

### Impact on tutor score:

```
Base score:          850 points
Payment penalty:     -45 points
FINAL SCORE:         805 points
```

---

## 📊 Example 4: Viewing All Overdue Payments

### Query the `overdue_payments` view:

```sql
SELECT * FROM overdue_payments;
```

### Returns:

```
id  | user_id | first_name | roles      | investment_type | subscription_plan_id | student_payment_id | amount   | due_date   | payment_status | days_overdue | late_fee | actual_days_overdue
----|---------|------------|------------|-----------------|----------------------|--------------------|----------|------------|----------------|--------------|----------|--------------------
125 | 456     | Abebe      | ["tutor"]  | subscription    | 9                    | NULL               | 5000.00  | 2026-01-10 | late           | 10           | 250.00   | 10
126 | 789     | Marta      | ["tutor"]  | booking         | NULL                 | 45                 | 3200.00  | 2026-01-05 | late           | 15           | 480.00   | 15
```

**Note:** For booking payments, the `amount` shown is from `enrolled_students.agreed_price` (requires JOIN in the view or when querying)

---

## 📊 Example 5: Viewing All Enrollment Payments

### Query the `enrollment_payments` view:

```sql
SELECT * FROM enrollment_payments WHERE is_overdue = true;
```

### Returns:

```
enrollment_id | tutor_id | student_id | package_id | package_name              | package_hourly_rate | agreed_price | payment_status | payment_due_date | is_overdue | days_overdue
--------------|----------|------------|------------|---------------------------|---------------------|--------------|----------------|------------------|------------|-------------
123           | 789      | 456        | 100        | Math Tutoring - 10 Sessions | 500.00              | 4500.00      | pending        | 2026-01-15       | true       | 5
124           | 789      | 567        | 101        | Science Tutoring          | 600.00              | 5400.00      | late           | 2026-01-12       | true       | 8
```

---

## 🔄 Daily Cron Job: Update Overdue Payments

### PostgreSQL Function:

```sql
-- Already created by migration
SELECT update_days_overdue();
```

### What it does:

1. Updates `user_investments.days_overdue` for all overdue payments
2. Changes `payment_status` from 'pending' to 'late' if past due date

### Setup Cron (Linux):

```bash
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * cd /var/www/astegni/astegni-backend && psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"
```

---

## 📝 Summary

### For Subscription Payments:
1. Create record in `user_investments` with `subscription_plan_id`
2. Amount calculated from `admin_db.subscription_plans.price`
3. Track payment status, due dates, and billing cycles in `user_investments`

### For Booking Payments:
1. Create record in `enrolled_students` with `agreed_price`, `package_id`, `payment_status` (**PRIMARY**)
2. Optionally create record in `user_investments` with `student_payment_id` for unified payment history
3. Amount retrieved from `enrolled_students.agreed_price` via JOIN
4. `enrolled_students` is the single source of truth

### Payment Reliability Penalty:
- Checks BOTH subscription AND booking payments
- For bookings, gets amount from `enrolled_students.agreed_price` via JOIN
- Calculates penalty based on late payments, missed payments, and accumulated debt
- Ranges from 0 to -100 points

---

**Last Updated:** January 20, 2026
**Status:** ✅ Complete - Ready for Implementation
