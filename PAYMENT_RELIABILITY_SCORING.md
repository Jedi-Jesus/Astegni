# Payment Reliability Scoring System

## Overview

The Payment Reliability Scoring System **penalizes tutors** (and other users) who have poor payment history. This ensures that users with outstanding debts or late payment patterns receive lower visibility in search results.

---

## 🎯 How It Works

### **Penalty Range: 0 to -100 points**

- **Perfect payment history**: 0 penalty (no impact on score)
- **Few late payments**: -5 to -25 penalty
- **Multiple late/missed payments**: -30 to -75 penalty
- **Complete non-payment**: -100 penalty (effectively removes tutor from search)

---

## 📊 Enhanced user_investments Table

### **New Fields Added:**

| Field | Type | Purpose |
|-------|------|---------|
| `subscription_plan_id` | INTEGER | References subscription plan (for subscriptions) |
| `enrolled_student_id` | INTEGER | References enrollment (for bookings) |
| `due_date` | DATE | When payment is expected |
| `paid_date` | TIMESTAMP | When payment was actually received |
| `payment_status` | VARCHAR(20) | Current status of payment |
| `days_overdue` | INTEGER | Number of days payment is overdue |
| `late_fee` | DECIMAL | Late fee charged |
| `payment_method` | VARCHAR(50) | How payment was made |
| `transaction_id` | VARCHAR(100) | Unique transaction ID |
| `payment_gateway` | VARCHAR(50) | Payment gateway used |
| `billing_cycle` | VARCHAR(20) | monthly, quarterly, yearly |
| `is_recurring` | BOOLEAN | Is this a recurring payment? |
| `next_billing_date` | DATE | Next billing date |
| `auto_renew` | BOOLEAN | Auto-renewal enabled? |

### **Payment Status Values:**

- `pending` - Payment not yet received (before due date)
- `paid` - Payment received on time
- `late` - Payment received after due date
- `missed` - Payment not received and significantly overdue
- `failed` - Payment attempt failed
- `refunded` - Payment was refunded

---

## 💰 Investment Type Examples

### 1. **Subscription Payment:**
```json
{
  "user_id": 456,
  "investment_type": "subscription",
  "subscription_plan_id": 9,  // Premium plan
  "amount": null,  // Calculated from subscription_plans.price
  "due_date": "2026-02-15",
  "payment_status": "pending",
  "billing_cycle": "monthly",
  "is_recurring": true,
  "next_billing_date": "2026-03-15"
}
```

**Amount Calculation:**
```sql
SELECT price FROM subscription_plans WHERE id = 9;
-- Returns: 5000.00 ETB
```

### 2. **Student Enrollment/Booking Payment:**
```json
{
  "user_id": 789,
  "investment_type": "booking",
  "enrolled_student_id": 123,  // Reference to enrolled_students
  "amount": null,  // Calculated from tutor_packages.hourly_rate
  "due_date": "2026-02-01",
  "payment_status": "paid",
  "paid_date": "2026-01-30 14:30:00",
  "payment_method": "telebirr",
  "transaction_id": "TXN-20260130-1234"
}
```

**Amount Calculation:**
```sql
SELECT tp.hourly_rate, tp.session_duration
FROM enrolled_students es
JOIN tutor_packages tp ON tp.id = es.package_id
WHERE es.id = 123;

-- Calculate: hourly_rate * (session_duration / 60) * num_sessions
```

---

## 🔴 Penalty Calculation

### **Formula:**

```python
penalty = 0

# 1. Late Payment Penalty
penalty += (late_count * -5)  # -5 points per late payment (max -50)

# 2. Missed Payment Penalty
penalty += (missed_count * -15)  # -15 points per missed payment (max -50)

# 3. Accumulated Debt Penalty
penalty += (total_debt / 100) * -1  # -1 point per 100 ETB owed (max -50)

# 4. Severe Overdue Penalty
if max_days_overdue > 60:
    penalty += -30

# 5. Complete Non-Payment
if total_debt > 5000 and missed_count >= 2:
    penalty = -100  # Complete removal

# Cap at -100
penalty = max(penalty, -100)
```

---

## 📉 Penalty Examples

### Example 1: **Perfect Payment History**
```
Total payments: 12
Paid on time: 12
Late payments: 0
Missed payments: 0
Total debt: 0 ETB

Penalty: 0 points
Impact: None - full score maintained
```

### Example 2: **Few Late Payments**
```
Total payments: 10
Paid on time: 7
Late payments: 3
Missed payments: 0
Total debt: 0 ETB

Calculation:
  Late penalty: 3 × -5 = -15

Penalty: -15 points
Impact: Minor reduction in visibility
```

### Example 3: **Multiple Late + Missed Payments**
```
Total payments: 15
Paid on time: 8
Late payments: 5
Missed payments: 2
Total debt: 2,800 ETB

Calculation:
  Late penalty: 5 × -5 = -25
  Missed penalty: 2 × -15 = -30
  Debt penalty: 2800 / 100 = -28
  Total: -25 + -30 + -28 = -83

Penalty: -83 points
Impact: Significant reduction in visibility
```

### Example 4: **Complete Non-Payment (Worst Case)**
```
Total payments: 8
Paid on time: 4
Late payments: 1
Missed payments: 3
Total debt: 6,500 ETB
Max days overdue: 120 days

Calculation:
  Total debt > 5000 AND missed >= 2
  → Complete non-payment

Penalty: -100 points
Impact: Effectively removed from search results
```

---

## 🔄 How Payment Status Updates

### **Daily Cron Job:**

Run this function daily to update overdue payments:

```sql
SELECT update_days_overdue();
```

**What it does:**
1. Calculates `days_overdue` for all pending/late payments
2. Updates `payment_status` from 'pending' to 'late' if past due date
3. Can be run via cron job or scheduled task

**Setup Cron (Linux):**
```bash
# Run at 2 AM daily
0 2 * * * cd /var/www/astegni/astegni-backend && psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"
```

---

## 📊 Querying Overdue Payments

### **View All Overdue Payments:**
```sql
SELECT * FROM overdue_payments;
```

Returns:
```
id | user_id | first_name | roles      | investment_type | amount   | due_date   | days_overdue | late_fee
---|---------|------------|------------|-----------------|----------|------------|--------------|----------
1  | 456     | Abebe      | ["tutor"]  | subscription    | 5000.00  | 2026-01-10 | 10           | 250.00
2  | 789     | Tigist     | ["tutor"]  | subscription    | 2800.00  | 2026-01-05 | 15           | 420.00
```

### **Get Payment Reliability for Specific User:**
```sql
SELECT
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as on_time_payments,
    COUNT(*) FILTER (WHERE payment_status = 'late') as late_payments,
    COUNT(*) FILTER (WHERE payment_status = 'missed') as missed_payments,
    SUM(amount) FILTER (WHERE payment_status IN ('pending', 'late', 'missed')) as total_debt,
    ROUND(
        COUNT(*) FILTER (WHERE payment_status = 'paid')::numeric /
        COUNT(*)::numeric * 100,
        1
    ) as on_time_percentage
FROM user_investments
WHERE user_id = 456
AND investment_type = 'subscription'
AND due_date IS NOT NULL;
```

---

## 🎯 Integration with Scoring System

### **Updated Total Score:**

```
MAX POSSIBLE SCORE: ~1,615 points
MAX PENALTY: -100 points

EFFECTIVE RANGE: 0 to 1,615 points

Components:
  Subscription Plan:       0-500 points
  Trending:                0-200+ points
  Interest/Hobby:          0-150 points
  Total Students:          0-100 points
  Completion Rate:         0-80 points
  Response Time:           0-60 points
  Experience:              0-50 points
  Search History:          0-50 points
  Other bonuses:           0-325 points
  ─────────────────────────────────────
  Payment Penalty:         0 to -100 points ⚠️
  ═════════════════════════════════════
  NET TOTAL:               0 to 1,615 points
```

### **Example Tutor Scores:**

#### **Tutor A: Perfect Payment History**
```
Base score:          850 points
Payment penalty:     0 points
FINAL SCORE:         850 points
```

#### **Tutor B: Few Late Payments**
```
Base score:          850 points
Payment penalty:     -15 points
FINAL SCORE:         835 points
```

#### **Tutor C: Major Payment Issues**
```
Base score:          850 points
Payment penalty:     -75 points
FINAL SCORE:         775 points
```

#### **Tutor D: Complete Non-Payment**
```
Base score:          850 points
Payment penalty:     -100 points
FINAL SCORE:         750 points
(Likely hidden from most search results)
```

---

## 🛠️ Setup Instructions

### **1. Run Migrations (COMPLETED ✅):**
```bash
cd astegni-backend
python migrate_add_payment_tracking_to_enrollments.py      # ✅ DONE
python migrate_enhance_user_investments_payment_tracking.py # ✅ DONE
```

**What was migrated:**
- ✅ Added `package_id`, `agreed_price`, payment tracking fields to `enrolled_students`
- ✅ Added `subscription_plan_id`, `student_payment_id`, payment tracking fields to `user_investments`
- ✅ Created `enrollment_payments` view (3 enrollments found)
- ✅ Created `overdue_payments` view
- ✅ Created `update_days_overdue()` PostgreSQL function

### **2. Update Scoring (Already Done):**
The `tutor_scoring.py` file now includes `calculate_payment_reliability_penalty()` method.

### **3. Set Up Daily Cron Job:**
```bash
# Option 1: Linux cron
crontab -e
# Add: 0 2 * * * cd /path/to/astegni-backend && psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"

# Option 2: Python scheduled task (run continuously)
# Create: scheduled_payment_updater.py
```

### **4. Test Payment Penalty:**
```bash
python test_tutor_scoring.py
# Will now show payment penalties in output
```

---

## 📝 Creating Payment Records

### **When User Subscribes:**
```python
# Create investment record with due date
user_investment = {
    "user_id": 456,
    "investment_type": "subscription",
    "subscription_plan_id": 9,
    "amount": None,  # Will be calculated
    "due_date": date.today() + timedelta(days=30),
    "payment_status": "pending",
    "billing_cycle": "monthly",
    "is_recurring": True,
    "next_billing_date": date.today() + timedelta(days=60)
}
```

### **When Payment is Received:**
```python
# Update payment record
UPDATE user_investments
SET
    payment_status = 'paid',
    paid_date = CURRENT_TIMESTAMP,
    payment_method = 'telebirr',
    transaction_id = 'TXN-20260120-5678'
WHERE id = 123;
```

### **When Payment is Late:**
```python
# Handled automatically by update_days_overdue() function
# Runs daily at 2 AM
```

---

## 🎓 Summary

✅ **Enhanced `user_investments` table** with payment tracking fields
✅ **Payment penalty system** (0 to -100 points)
✅ **Automatic payment status updates** via daily cron job
✅ **Support for subscriptions AND bookings**
✅ **Amount calculated from plan or package** (not hardcoded)
✅ **Works for all user roles** (tutor, student, parent, advertiser)
✅ **Integrated into tutor scoring system**

**Result:** Tutors with poor payment history get lower visibility, encouraging timely payments!

---

**Last Updated**: January 20, 2026
**Status**: ✅ Ready for Testing
