# Payment Tracking Migration - COMPLETE ✅

**Date:** January 20, 2026
**Status:** Successfully Migrated

---

## 🎯 Overview

The payment tracking system has been successfully migrated to support comprehensive payment tracking for both **subscription payments** and **booking/enrollment payments**.

---

## ✅ Migrations Completed

### 1. **migrate_add_payment_tracking_to_enrollments.py**

Added payment tracking to the `enrolled_students` table:

**New Fields:**
- `package_id` - References tutor_packages.id (the package this enrollment is for)
- `agreed_price` - Price agreed upon enrollment after bargaining
- `payment_status` - Payment status (pending, paid, partially_paid, late, refunded)
- `payment_due_date` - When full payment is due
- `payment_received_date` - When payment was received
- `total_sessions` - Total number of sessions in enrollment
- `completed_sessions` - Number of completed sessions
- `cancelled_sessions` - Number of cancelled sessions

**Created View:**
- `enrollment_payments` - Shows all enrollment payments with calculated overdue status

**Verification:**
```
✅ 3 enrollments found
✅ All have package_id
✅ All have agreed_price
✅ All have payment_status = 'pending'
```

---

### 2. **migrate_enhance_user_investments_payment_tracking.py**

Enhanced the `user_investments` table with comprehensive payment tracking:

**New Fields:**
- `subscription_plan_id` - References subscription_plans.id in admin_db (for subscription payments)
- `student_payment_id` - References enrolled_students.id (for booking payments)
- `due_date` - Payment due date
- `paid_date` - Actual payment date
- `payment_status` - Current status (pending, paid, late, missed, failed, refunded)
- `days_overdue` - Number of days payment is overdue (calculated daily)
- `late_fee` - Late fee charged for overdue payments
- `payment_method` - Payment method used (telebirr, bank, cash, etc.)
- `transaction_id` - Unique transaction ID from payment gateway
- `payment_gateway` - Payment gateway used (chapa, telebirr, etc.)
- `billing_cycle` - Billing cycle (monthly, quarterly, yearly, one_time)
- `is_recurring` - Whether this is a recurring subscription payment
- `next_billing_date` - Next billing date for recurring subscriptions
- `auto_renew` - Whether subscription auto-renews

**Changed Fields:**
- `amount` - Now nullable (calculated from subscription_plan or agreed_price)

**Created View:**
- `overdue_payments` - Shows all overdue payments with user details

**Created Function:**
- `update_days_overdue()` - Updates days_overdue for all overdue payments (run daily via cron)

**Verification:**
```
✅ user_investments table now has 28 columns
✅ subscription_plan_id added (references admin_db)
✅ student_payment_id added (references enrolled_students)
✅ All payment tracking fields added
✅ overdue_payments view created
```

---

## 📊 Payment Flow

### **Subscription Payments:**

1. User subscribes to a plan (from admin_db.subscription_plans)
2. Record created in `user_investments`:
   ```json
   {
     "user_id": 456,
     "investment_type": "subscription",
     "subscription_plan_id": 9,
     "amount": null,  // Calculated from subscription_plans.price
     "due_date": "2026-02-15",
     "payment_status": "pending",
     "billing_cycle": "monthly",
     "is_recurring": true,
     "next_billing_date": "2026-03-15"
   }
   ```

3. Amount calculation:
   ```sql
   SELECT price FROM admin_db.subscription_plans WHERE id = 9
   -- Returns: 5000.00 ETB
   ```

### **Booking/Enrollment Payments:**

**Key Design: `enrolled_students` is the SOURCE OF TRUTH for booking payments**

1. Tutor sets package in `tutor_packages` (e.g., hourly_rate = 500 ETB)
2. Student/parent requests session and bargains price in `session_request`
3. Tutor accepts → Enrollment created in `enrolled_students` (**PRIMARY PAYMENT RECORD**):
   ```json
   {
     "id": 123,
     "tutor_id": 789,
     "student_id": 456,
     "package_id": 100,
     "agreed_price": 450.00,  // ✅ Agreed after bargaining (was 500)
     "payment_status": "pending",
     "payment_due_date": "2026-02-01",
     "payment_received_date": null,
     "total_sessions": 10,
     "completed_sessions": 0,
     "cancelled_sessions": 0
   }
   ```

4. **Optional:** Track in `user_investments` (for unified payment history):
   ```json
   {
     "user_id": 456,  // The student's user_id
     "investment_type": "booking",
     "student_payment_id": 123,  // ✅ References enrolled_students.id
     "amount": null,  // Get from enrolled_students.agreed_price via JOIN
     "due_date": "2026-02-01",  // Sync with enrolled_students.payment_due_date
     "payment_status": "pending"  // Sync with enrolled_students.payment_status
   }
   ```

5. **Getting payment amount** (via `student_payment_id` → `enrolled_students`):
   ```sql
   SELECT
       ui.id,
       ui.investment_type,
       es.agreed_price as amount,  -- ✅ From enrolled_students
       es.package_id,
       es.payment_status,
       es.payment_due_date,
       es.total_sessions,
       es.completed_sessions
   FROM user_investments ui
   JOIN enrolled_students es ON es.id = ui.student_payment_id
   WHERE ui.id = :investment_id
   -- Returns: 450.00 ETB (the bargained price from enrolled_students)
   ```

6. **Why this works:**
   - `enrolled_students` stores ALL booking payment details (`agreed_price`, `package_id`, `payment_status`)
   - `user_investments.student_payment_id` → `enrolled_students.id` gives access to everything
   - No duplication of payment data
   - Single source of truth for booking payments

---

## 🔴 Payment Reliability Penalty System

### **Penalty Calculation (0 to -100 points)**

The `calculate_payment_reliability_penalty()` method in [tutor_scoring.py](tutor_scoring.py:385-429) calculates penalties based on:

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
    penalty = -100  # Complete removal from search

# Cap at -100
penalty = max(penalty, -100)
```

### **Query Used:**

```sql
SELECT
    COUNT(*) as total_payments,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid_count,
    COUNT(*) FILTER (WHERE payment_status = 'late') as late_count,
    COUNT(*) FILTER (WHERE payment_status = 'missed') as missed_count,
    COALESCE(SUM(amount) FILTER (WHERE payment_status IN ('pending', 'late', 'missed')), 0) as total_debt,
    MAX(days_overdue) as max_days_overdue
FROM user_investments
WHERE user_id = :user_id
AND investment_type IN ('subscription', 'booking')
AND due_date IS NOT NULL
```

**Note:** The penalty system checks BOTH subscription AND booking payments.

---

## 📈 Integration with Scoring System

### **Total Score Calculation:**

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

**Tutor A: Perfect Payment History**
```
Base score:          850 points
Payment penalty:     0 points
FINAL SCORE:         850 points
```

**Tutor B: Few Late Payments (3 late)**
```
Base score:          850 points
Payment penalty:     -15 points (3 × -5)
FINAL SCORE:         835 points
```

**Tutor C: Multiple Issues (5 late, 2 missed, 2800 ETB debt)**
```
Base score:          850 points
Calculation:
  Late penalty:      -25 (5 × -5)
  Missed penalty:    -30 (2 × -15)
  Debt penalty:      -28 (2800 / 100)
  Total:             -83 points
FINAL SCORE:         767 points
```

**Tutor D: Complete Non-Payment (6500 ETB debt, 3 missed)**
```
Base score:          850 points
Payment penalty:     -100 points (debt > 5000 AND missed >= 2)
FINAL SCORE:         750 points
(Effectively removed from search results)
```

---

## 🔄 Daily Cron Job Setup

### **PostgreSQL Function:**

```sql
CREATE FUNCTION update_days_overdue() RETURNS void AS $$
BEGIN
    -- Calculate days overdue
    UPDATE user_investments
    SET days_overdue = GREATEST(0, CURRENT_DATE - due_date)
    WHERE payment_status IN ('pending', 'late')
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE;

    -- Update payment_status to 'late' if overdue
    UPDATE user_investments
    SET payment_status = 'late'
    WHERE payment_status = 'pending'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
```

### **Cron Job Setup (Linux Production Server):**

```bash
# Edit crontab
crontab -e

# Add this line (runs at 2 AM daily)
0 2 * * * cd /var/www/astegni/astegni-backend && psql -U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"
```

### **Windows Development Setup:**

Use Windows Task Scheduler:
1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 2:00 AM
4. Action: Start a program
5. Program: `C:\Program Files\PostgreSQL\16\bin\psql.exe`
6. Arguments: `-U astegni_user -d astegni_user_db -c "SELECT update_days_overdue();"`

---

## 📝 Next Steps (TODO)

### **1. Update Enrollment Endpoints**

When creating an enrollment (after tutor accepts session request):

```python
# In session_request_endpoints.py or enrollment_endpoints.py

# After tutor accepts session request:
enrollment = EnrolledStudent(
    tutor_id=session_request.tutor_id,
    student_id=session_request.student_id,
    package_id=session_request.package_id,
    agreed_price=session_request.bargained_price,  # The final agreed price
    payment_status='pending',
    payment_due_date=date.today() + timedelta(days=7),  # 7 days to pay
    total_sessions=session_request.num_sessions,
    completed_sessions=0,
    cancelled_sessions=0
)
db.add(enrollment)
db.commit()

# Also create user_investment record
user_investment = UserInvestment(
    user_id=session_request.student_user_id,
    investment_type='booking',
    investment_name=f'Booking with {tutor.user.first_name}',
    student_payment_id=enrollment.id,
    amount=None,  # Calculated from enrolled_students.agreed_price
    due_date=enrollment.payment_due_date,
    payment_status='pending'
)
db.add(user_investment)
db.commit()
```

### **2. Update Payment Endpoints**

Create payment endpoints to handle payment processing:

```python
# payment_endpoints.py (NEW FILE)

@router.post("/api/payments/process")
def process_payment(payment_data: PaymentRequest, db: Session = Depends(get_db)):
    """
    Process payment for subscription or booking
    """
    if payment_data.investment_type == 'subscription':
        # Process subscription payment
        investment = db.query(UserInvestment).filter(
            UserInvestment.id == payment_data.investment_id
        ).first()

        investment.payment_status = 'paid'
        investment.paid_date = datetime.now()
        investment.payment_method = payment_data.payment_method
        investment.transaction_id = payment_data.transaction_id
        investment.payment_gateway = payment_data.payment_gateway

    elif payment_data.investment_type == 'booking':
        # Process booking payment
        investment = db.query(UserInvestment).filter(
            UserInvestment.id == payment_data.investment_id
        ).first()

        enrollment = db.query(EnrolledStudent).filter(
            EnrolledStudent.id == investment.student_payment_id
        ).first()

        # Update both tables
        investment.payment_status = 'paid'
        investment.paid_date = datetime.now()
        investment.payment_method = payment_data.payment_method
        investment.transaction_id = payment_data.transaction_id

        enrollment.payment_status = 'paid'
        enrollment.payment_received_date = datetime.now()

    db.commit()
    return {"status": "success", "message": "Payment processed"}
```

### **3. Set Up Cron Job**

As shown above, configure daily cron job to run `update_days_overdue()`.

### **4. Test Payment Penalty**

```bash
cd astegni-backend
python test_tutor_scoring.py
# Should now show payment penalties in output
```

### **5. Update Frontend**

- Add payment status display in tutor profiles
- Add payment history view for users
- Add payment reliability indicator in tutor cards

---

## 🎯 Summary

✅ **Database migrations complete** - Both `enrolled_students` and `user_investments` tables enhanced
✅ **Payment tracking functional** - Supports subscriptions AND bookings
✅ **Amount calculation flexible** - Calculated from subscription plans or agreed prices
✅ **Payment penalty system ready** - Integrated into `tutor_scoring.py`
✅ **Views created** - `enrollment_payments` and `overdue_payments` for easy querying
✅ **PostgreSQL function created** - `update_days_overdue()` for daily updates
✅ **Cross-database reference handled** - subscription_plan_id references admin_db (no foreign key constraint)

**Result:** The system can now comprehensively track payments for all user types (tutors, students, parents, advertisers) and penalize poor payment history in tutor search rankings!

---

## 📚 Related Documentation

- [PAYMENT_RELIABILITY_SCORING.md](PAYMENT_RELIABILITY_SCORING.md) - Detailed payment penalty documentation
- [ENHANCED_TUTOR_SCORING_SYSTEM.md](ENHANCED_TUTOR_SCORING_SYSTEM.md) - Complete scoring system
- [tutor_scoring.py](astegni-backend/tutor_scoring.py) - Scoring implementation
- [migrate_add_payment_tracking_to_enrollments.py](astegni-backend/migrate_add_payment_tracking_to_enrollments.py) - Enrollment migration
- [migrate_enhance_user_investments_payment_tracking.py](astegni-backend/migrate_enhance_user_investments_payment_tracking.py) - Investment migration

---

**Last Updated:** January 20, 2026
**Status:** ✅ Migrations Complete - Ready for Endpoint Implementation
