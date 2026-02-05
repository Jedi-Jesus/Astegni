# Payment Punctuality Calculation System

## Overview

The archive system enables **accurate payment punctuality calculations** by maintaining historical payment data. This guide explains how to calculate and use payment punctuality scores for parents.

## How Payment Punctuality is Calculated

### Data Sources

1. **`enrolled_students` table** - Primary payment records
   - `payment_status`: 'paid', 'pending', 'overdue', 'cancelled'
   - `payment_due_date`: When payment is due
   - `payment_received_date`: When payment was actually received
   - `is_archived`: Include/exclude historical records

2. **`user_investments` table** - Enhanced payment tracking
   - `days_overdue`: Calculated days overdue
   - `late_fee`: Late fees charged
   - `payment_method`: How payment was made

### Calculation Formula

```
Punctuality Score (0-5 scale) =
  (paid_on_time × 5.0 + paid_late × 3.0 + overdue × 1.0)
  ÷
  (paid_on_time + paid_late + overdue)

Punctuality Percentage (0-100%) = (Score ÷ 5.0) × 100
```

**Scoring:**
- ✅ **Paid On Time**: 5.0 points (payment_received_date ≤ payment_due_date)
- ⚠️ **Paid Late**: 3.0 points (payment_received_date > payment_due_date)
- ❌ **Overdue**: 1.0 points (payment_status = 'pending' AND today > payment_due_date)
- ⏳ **Still Pending**: Not counted (payment_status = 'pending' AND today ≤ payment_due_date)

### Example Calculation

**Parent Payment History:**
- 10 payments paid on time = 10 × 5.0 = 50 points
- 2 payments paid late = 2 × 3.0 = 6 points
- 1 payment overdue = 1 × 1.0 = 1 point
- Total: 57 points ÷ 13 payments = **4.38/5.0** or **88%**

## Setup & Installation

### 1. Run Migration (Add Archive Columns)
```bash
cd astegni-backend
python migrate_add_payment_archive_columns.py
```

### 2. Add Payment Punctuality Endpoints to Backend
```python
# In app.py, add:
from payment_punctuality_endpoints import router as punctuality_router
app.include_router(punctuality_router)
```

### 3. Test Calculation
```bash
# Calculate for specific parent
python calculate_payment_punctuality.py 1

# Calculate for all parents
python calculate_payment_punctuality.py --all

# Update parent reviews with calculated score
python calculate_payment_punctuality.py --update 1
```

## API Endpoints

### 1. Get Parent Payment Punctuality (Detailed)
```
GET /api/parent/{parent_id}/payment-punctuality?include_archived=true
```

**Response:**
```json
{
  "parent_id": 1,
  "total_payments": 15,
  "paid_on_time": 12,
  "paid_late": 2,
  "still_pending": 0,
  "overdue": 1,
  "punctuality_score": 4.47,
  "punctuality_percentage": 89,
  "avg_days_late": 3.7,
  "total_late_fees": 25.50,
  "on_time_rate": 80.0,
  "include_archived": true
}
```

### 2. Get Payment Punctuality for Widget (Simplified)
```
GET /api/parent/{parent_id}/payment-punctuality/widget
```

**Response:**
```json
{
  "punctuality_percentage": 89,
  "paid_on_time": 12,
  "total_payments": 15,
  "late_payments": 2,
  "overdue_payments": 1
}
```

### 3. Get All Parents Punctuality Statistics (Admin)
```
GET /api/parent/payment-punctuality/stats
```

**Response:**
```json
{
  "total_parents": 50,
  "parents_with_payments": 45,
  "average_punctuality_score": 4.2,
  "average_punctuality_percentage": 84,
  "parents_with_perfect_score": 12,
  "parents_with_late_payments": 18,
  "highest_score": 5.0,
  "lowest_score": 2.3
}
```

## Frontend Integration

### Parent Overview Widget

The widget now fetches **REAL payment data** from the API:

```javascript
// js/view-parent/view-parent-widgets.js

async updatePaymentPunctualityWidget() {
    const response = await fetch(
        `${API_BASE_URL}/api/parent/${this.parentData.id}/payment-punctuality/widget`
    );

    const punctuality = await response.json();

    // Update widget with real data
    updateCircularProgress(punctuality.punctuality_percentage);
    updateOnTimeText(`${punctuality.paid_on_time}/${punctuality.total_payments}`);
    updateLateText(punctuality.late_payments + punctuality.overdue_payments);
}
```

### Example Widget Display

```
┌─────────────────────────────────┐
│  💰 Payment Punctuality         │
│                                  │
│         ┌───────┐                │
│         │  89%  │  Circular      │
│         └───────┘  Progress      │
│                                  │
│  ✅ Paid on Time: 12/15          │
│  ⚠️  Late Payments: 3            │
└─────────────────────────────────┘
```

## Using Archived Data

### Include Historical Payments (Default)
```javascript
// Include all payment history (last 10+ years)
const response = await fetch(
    `/api/parent/${parentId}/payment-punctuality?include_archived=true`
);
```

**Use Case:** Comprehensive payment history for credit scoring, disputes, audits

### Active Payments Only
```javascript
// Only non-archived payments
const response = await fetch(
    `/api/parent/${parentId}/payment-punctuality?include_archived=false`
);
```

**Use Case:** Current payment behavior for widgets, recent performance

## Benefits of Archive System for Punctuality

### 1. **Long-Term Tracking**
- Calculate punctuality over 10+ years
- Track payment behavior trends
- Identify consistent vs improving parents

### 2. **Accurate Scoring**
```python
# Without archives: Limited data (last 1-2 years)
recent_punctuality = calculate_punctuality(include_archived=False)
# Result: 4.5/5.0 (based on 8 payments)

# With archives: Complete history
full_punctuality = calculate_punctuality(include_archived=True)
# Result: 4.2/5.0 (based on 45 payments) ← More accurate!
```

### 3. **Compliance & Auditing**
- Maintain payment records for tax compliance
- Resolve payment disputes with historical proof
- Generate financial reports for any time period

### 4. **Performance Optimization**
```sql
-- Fast query: Active payments only (for widgets)
SELECT * FROM enrolled_students
WHERE parent_id = ? AND (is_archived = FALSE OR is_archived IS NULL)
LIMIT 20;

-- Comprehensive query: Full history (when needed)
SELECT * FROM enrolled_students
WHERE parent_id = ?;
```

## Payment Punctuality Use Cases

### 1. **Parent Rating Widget**
Display payment punctuality on view-parent.html:
- ✅ Real-time calculation
- ✅ Historical data included
- ✅ Updates automatically

### 2. **Tutor Decision Making**
Help tutors decide whether to accept a parent's session request:
```javascript
if (punctuality.punctuality_percentage >= 80 && punctuality.overdue === 0) {
    showBadge("Reliable Payer 🌟");
}
```

### 3. **Admin Dashboard**
Monitor platform-wide payment health:
```javascript
// Show parents with poor punctuality
if (punctuality.punctuality_percentage < 50) {
    flagForReview(parentId);
}
```

### 4. **Automated Reminders**
Send payment reminders based on history:
```python
if parent.punctuality_score < 3.0:
    send_early_reminder(days_before=7)  # Send reminder 1 week early
else:
    send_normal_reminder(days_before=3)  # Send reminder 3 days before
```

## Best Practices

### 1. **Always Include Archived for Accuracy**
```python
# ✅ Good: Use full history for scoring
punctuality = calculate_punctuality(parent_id, include_archived=True)

# ❌ Bad: Limited data gives inaccurate score
punctuality = calculate_punctuality(parent_id, include_archived=False)
```

### 2. **Cache Punctuality Scores**
```python
# Update parent_profiles table with cached score
UPDATE parent_profiles
SET payment_punctuality_score = 4.38
WHERE id = ?;

# Recalculate monthly via cron job
```

### 3. **Blend with Manual Reviews**
```python
# Calculated score from payment data
calculated_score = 4.38

# Average from tutor reviews
review_avg = 4.10

# Final score: 70% calculated + 30% reviews
final_score = (calculated_score * 0.7) + (review_avg * 0.3)
# Result: 4.29
```

### 4. **Set Thresholds for Actions**
```python
PUNCTUALITY_THRESHOLDS = {
    "excellent": 4.5,  # 90%+ - Auto-approve sessions
    "good": 3.5,       # 70%+ - Normal approval
    "fair": 2.5,       # 50%+ - Require deposit
    "poor": 0.0        # <50% - Manual review required
}
```

## Cron Job for Automated Updates

Update all parent punctuality scores monthly:

```python
# cron_update_parent_punctuality.py
from calculate_payment_punctuality import calculate_parent_payment_punctuality
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('DATABASE_URL'))

with engine.begin() as conn:
    parents = conn.execute(text("SELECT id FROM parent_profiles WHERE total_children > 0"))

    for parent in parents:
        punctuality = calculate_parent_payment_punctuality(parent[0], include_archived=True)

        # Cache the score in parent_profiles
        conn.execute(text("""
            UPDATE parent_profiles
            SET payment_punctuality_score = :score,
                payment_punctuality_updated_at = NOW()
            WHERE id = :id
        """), {"score": punctuality["punctuality_score"], "id": parent[0]})

print("✅ All parent punctuality scores updated!")
```

```bash
# Add to crontab: Run on 1st of every month at 3 AM
0 3 1 * * cd /var/www/astegni/astegni-backend && python cron_update_parent_punctuality.py
```

## Summary

✅ **Archive system enables accurate punctuality calculations** by maintaining 10+ years of payment history
✅ **Punctuality score** (0-5) is calculated from actual payment behavior
✅ **API endpoints** provide real-time punctuality data
✅ **Frontend widgets** now display real payment data instead of estimates
✅ **Blend calculated scores with tutor reviews** for comprehensive rating
✅ **Automate calculations** with cron jobs for up-to-date scores

The archive system transforms payment punctuality from **estimated** to **precisely calculated** based on real historical data! 🎯
