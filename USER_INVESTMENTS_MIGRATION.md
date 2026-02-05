# User Investments Migration - Complete

## Overview

Migrated from role-based investments (`tutor_investments`) to user-based investments (`user_investments`). This ensures subscriptions made by any user appear regardless of which role they're currently using.

---

## Database Changes

### Migration: tutor_investments → user_investments

**File**: [migrate_tutor_investments_to_user_investments.py](astegni-backend/migrate_tutor_investments_to_user_investments.py)

**Changes**:
1. ✅ Renamed table: `tutor_investments` → `user_investments`
2. ✅ Changed column: `tutor_profile_id` → `user_id`
3. ✅ Updated foreign key: References `users.id` instead of `tutor_profiles.id`
4. ✅ Updated `subscription_metrics` foreign key to reference `user_investments`
5. ✅ Created index on `user_id`

**Migration Results**:
- Total investments migrated: 15
- Unique users: 3
- Subscription investments: 15

### Schema Comparison

**BEFORE**:
```sql
CREATE TABLE tutor_investments (
    id SERIAL PRIMARY KEY,
    tutor_profile_id INTEGER REFERENCES tutor_profiles(id),  -- ROLE-BASED
    investment_type VARCHAR(50),
    investment_name VARCHAR(255),
    amount NUMERIC(10, 2),
    ...
);
```

**AFTER**:
```sql
CREATE TABLE user_investments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- USER-BASED
    investment_type VARCHAR(50),
    investment_name VARCHAR(255),
    amount NUMERIC(10, 2),
    ...
);
```

---

## Backend Endpoint Updates

### 1. Tutor Subscription Endpoint

**File**: [tutor_subscription_endpoints.py:112-123](astegni-backend/tutor_subscription_endpoints.py#L112-L123)

**Changed Query**:
```python
# OLD
FROM tutor_investments ti
JOIN tutor_profiles tp ON ti.tutor_profile_id = tp.id
WHERE ti.tutor_profile_id = :tutor_id

# NEW
FROM user_investments ui
JOIN users u ON ui.user_id = u.id
WHERE ui.user_id = :user_id
```

### 2. Student Subscription Endpoint

**File**: [student_subscription_endpoints.py:85-87](astegni-backend/student_subscription_endpoints.py#L85-L87)

**Changed Query**:
```python
# OLD
FROM tutor_investments ti
WHERE ti.investment_type = 'subscription'

# NEW
FROM user_investments ui
WHERE ui.user_id = :user_id
  AND ui.investment_type = 'subscription'
```

---

## How It Works Now

### Subscription Storage

1. **Current Subscription**: Stored in `users` table
   - `users.subscription_plan_id`
   - `users.subscription_started_at`
   - `users.subscription_expires_at`

2. **Subscription History**: Stored in `user_investments` table
   - All past and current subscription purchases
   - User-based (linked to `user_id`, not role-specific profile)
   - Performance metrics stored separately in `subscription_metrics`

### User Journey Examples

**Example 1: User subscribes as tutor**
```
User logs in as tutor
  ↓
Purchases subscription
  ↓
Record created in user_investments (user_id = X)
  ↓
users.subscription_plan_id updated
  ↓
Switch to student role
  ↓
Still sees the subscription in investments tab!
```

**Example 2: User subscribes as student**
```
User logs in as student
  ↓
Purchases subscription
  ↓
Record created in user_investments (user_id = X)
  ↓
users.subscription_plan_id updated
  ↓
Switch to tutor role
  ↓
Still sees the subscription in investments tab!
```

---

## Tables Structure

### user_investments (USER-BASED)
**Purpose**: Track all user subscription investments
**Key**: `user_id` (references users.id)
**Contains**:
- Subscriptions (investment_type = 'subscription')
- Other user investments

### student_investments (ROLE-SPECIFIC)
**Purpose**: Track student-specific purchases
**Key**: `student_profile_id` (references student_profiles.id)
**Contains**:
- Tutoring packages
- Course purchases
- Educational materials
- NOT subscriptions (those are in user_investments)

### subscription_metrics (TUTOR FEATURE)
**Purpose**: Performance analytics for subscriptions
**Key**: `investment_id` (references user_investments.id)
**Contains**:
- Impressions, clicks, CTR
- Cost per impression, cost per click
- Student connections
- ROI data

---

## API Behavior

### GET /api/tutor/subscriptions
- Queries `user_investments` WHERE `user_id = current_user.id`
- Returns all subscriptions made by this user
- Includes performance metrics from `subscription_metrics`

### GET /api/student/subscriptions
- Queries `user_investments` WHERE `user_id = current_user.id`
- Returns **same subscriptions** as tutor endpoint
- Does NOT include performance metrics (students don't advertise)

### GET /api/tutor/subscriptions/current
- Queries `users` table for current active subscription
- Returns current plan, start date, expiry date

### GET /api/student/subscriptions/current
- Queries `users` table for current active subscription
- Returns **same data** as tutor endpoint (user-based)

---

## Frontend Impact

**No Breaking Changes**:
- API response format remains the same
- Frontend already uses role-based UI rendering
- Tutors see: Performance Metrics button
- Students see: View Details button

**Data Consistency**:
- Same subscription appears in both tutor and student profiles
- Features differ by role (metrics for tutors, basic info for students)
- Invoice download available for both roles

---

## Benefits

1. ✅ **User-Based Subscriptions**: One subscription per user, not per role
2. ✅ **Role-Agnostic Purchases**: Subscribe as tutor or student, data follows user
3. ✅ **Cleaner Architecture**: Single source of truth for subscription history
4. ✅ **Feature Separation**: Investments vs. subscriptions clearly separated
5. ✅ **Scalability**: Easy to add new investment types for any user

---

## Files Modified

### Backend
1. [migrate_tutor_investments_to_user_investments.py](astegni-backend/migrate_tutor_investments_to_user_investments.py) - Migration script (NEW)
2. [tutor_subscription_endpoints.py](astegni-backend/tutor_subscription_endpoints.py) - Updated to query user_investments
3. [student_subscription_endpoints.py](astegni-backend/student_subscription_endpoints.py) - Updated to query user_investments

### Database
1. `user_investments` table - Renamed from tutor_investments, now user-based
2. `subscription_metrics` table - Foreign key updated to reference user_investments
3. `student_investments` table - Remains for student-specific purchases

---

## Summary

**Before**:
- Subscriptions stored in `tutor_investments` (role-based)
- Only tutors could make subscriptions
- Students couldn't see tutor subscriptions

**After**:
- Subscriptions stored in `user_investments` (user-based)
- Any user can make subscriptions from any role
- Subscriptions appear in all roles for the same user
- Features remain role-specific (tutors get analytics)

**Migration Status**: ✅ Complete
**Data Integrity**: ✅ All 15 investments migrated
**API Compatibility**: ✅ No breaking changes
**Frontend**: ✅ Works with existing code

The system now correctly implements user-based subscription storage!
