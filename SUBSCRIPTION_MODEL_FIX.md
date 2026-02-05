# Subscription Model Fix

## Problem

After migrating subscription fields from profile tables (tutor_profiles, student_profiles) to the users table, the backend was crashing with:

```
sqlalchemy.exc.ProgrammingError: (psycopg.errors.UndefinedColumn) column tutor_profiles.subscription_plan_id does not exist
```

**Root Cause**: The database schema was updated (columns removed from tutor_profiles and student_profiles) but the SQLAlchemy ORM models still had these columns defined. When SQLAlchemy tried to query these models, it attempted to SELECT the removed columns.

---

## Solution

Updated the SQLAlchemy model definitions in [app.py modules/models.py](astegni-backend/app.py modules/models.py) to align with the database schema:

### 1. Added Subscription Fields to User Model

**Location**: Lines 101-105

```python
# Subscription (User-based, not role-based)
# References subscription_plans.id in admin database
subscription_plan_id = Column(Integer, nullable=True)  # ID from subscription_plans table in admin_db
subscription_started_at = Column(DateTime, nullable=True)  # When subscription started
subscription_expires_at = Column(DateTime, nullable=True)  # When subscription expires
```

### 2. Removed Subscription Fields from TutorProfile Model

**Location**: Lines 183-184

```python
# NOTE: Subscription fields moved to users table (users.subscription_plan_id, etc.)
# Subscriptions are now user-based, not role-based
```

**Removed fields**:
- `subscription_plan_id`
- `subscription_started_at`
- `subscription_expires_at`

### 3. Removed Subscription Fields from UserProfile Model

**Location**: Lines 265-266

```python
# NOTE: Subscription fields moved to users table (users.subscription_plan_id, etc.)
# Subscriptions are now user-based, not role-based
```

**Removed fields**:
- `subscription_plan_id`
- `subscription_started_at`
- `subscription_expires_at`

---

## Verification

Created and ran test scripts to verify the changes:

### Database Schema Test ([test_subscription_models.py](astegni-backend/test_subscription_models.py))

```
✅ Found 3 users with subscriptions in users table
✅ tutor_profiles has no subscription columns
✅ student_profiles has no subscription columns
✅ Successfully joined users and tutor_profiles
```

### SQLAlchemy Models Test ([test_sqlalchemy_models.py](astegni-backend/test_sqlalchemy_models.py))

```
✅ Models imported successfully
✅ User model works with subscription fields
✅ TutorProfile model works without subscription fields
✅ StudentProfile model works without subscription fields
✅ Successfully joined User and TutorProfile models
```

### API Endpoint Test ([test_tutor_subscriptions_endpoint.py](astegni-backend/test_tutor_subscriptions_endpoint.py))

```
✅ Found 3 subscription investments with plan_id from users table
✅ Current subscription query works correctly
✅ All subscription data displays properly
```

---

## What Changed

### Database (Already Done)
- ✅ Added subscription fields to `users` table
- ✅ Migrated data from `tutor_profiles` to `users`
- ✅ Migrated data from `student_profiles` to `users`
- ✅ Dropped subscription fields from `tutor_profiles`
- ✅ Dropped subscription fields from `student_profiles`

### SQLAlchemy Models (This Fix)
- ✅ Added subscription fields to `User` model
- ✅ Removed subscription fields from `TutorProfile` model
- ✅ Removed subscription fields from `UserProfile` model
- ✅ Added documentation comments explaining the change

### API Endpoints (Updated)
- ✅ [tutor_subscription_endpoints.py](astegni-backend/tutor_subscription_endpoints.py)
  - `/subscriptions/current` - Reads from users table
  - `/subscriptions` - Fixed JOIN to get plan_id from users table instead of tutor_profiles
- ✅ [student_subscription_endpoints.py](astegni-backend/student_subscription_endpoints.py) - Reads from users table

### Seeding Scripts (Already Updated)
- ✅ [seed_tutor_subscriptions_v2.py](astegni-backend/seed_tutor_subscriptions_v2.py) - Writes to users table

---

## Impact

### What Works Now
1. ✅ Backend starts without errors
2. ✅ User model can query subscription data
3. ✅ Profile models don't reference removed columns
4. ✅ Joins between users and profile tables work correctly
5. ✅ Subscription endpoints can read from users table
6. ✅ Seeding scripts can write to users table

### Architecture Benefits
1. **User-based subscriptions**: One subscription per user, not per role
2. **Cleaner data model**: Single source of truth for subscriptions
3. **Role-based features**: Features can still differ by role even with shared subscription
4. **Simpler queries**: No need to check multiple tables for subscription status

---

## Related Files

### Modified
- `astegni-backend/app.py modules/models.py` - Updated model definitions

### Already Updated (Previous Work)
- `astegni-backend/migrate_subscriptions_to_users.py` - Migration script
- `astegni-backend/tutor_subscription_endpoints.py` - Updated endpoints
- `astegni-backend/student_subscription_endpoints.py` - Updated endpoints
- `astegni-backend/seed_tutor_subscriptions_v2.py` - Updated seeding

### Documentation
- [SUBSCRIPTION_MIGRATION_SUMMARY.md](SUBSCRIPTION_MIGRATION_SUMMARY.md) - Full migration documentation

---

## Status

✅ **Complete** - All model definitions aligned with database schema
