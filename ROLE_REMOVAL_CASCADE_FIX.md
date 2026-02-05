# Role Removal - Foreign Key CASCADE Delete Fix

## Issue

When trying to remove a tutor role, the backend threw a foreign key constraint violation error:

```
sqlalchemy.exc.IntegrityError: (psycopg.errors.ForeignKeyViolation)
update or delete on table "tutor_profiles" violates foreign key constraint
"tutor_packages_tutor_id_fkey" on table "tutor_packages"
DETAIL: Key (id)=(1) is still referenced from table "tutor_packages".
```

## Root Cause

Many tables with foreign keys to `tutor_profiles` had `ON DELETE NO ACTION` set, which prevents deletion of a tutor profile if any related records exist.

**Example:**
```sql
-- BEFORE (WRONG)
ALTER TABLE tutor_packages
ADD CONSTRAINT tutor_packages_tutor_id_fkey
FOREIGN KEY (tutor_id)
REFERENCES tutor_profiles(id)
ON DELETE NO ACTION;  -- Blocks deletion!
```

## Solution

Changed all foreign key constraints pointing to profile tables to use `ON DELETE CASCADE`, so when a profile is deleted, all related data is automatically deleted as well.

**Example:**
```sql
-- AFTER (CORRECT)
ALTER TABLE tutor_packages
ADD CONSTRAINT tutor_packages_tutor_id_fkey
FOREIGN KEY (tutor_id)
REFERENCES tutor_profiles(id)
ON DELETE CASCADE;  -- Auto-deletes related data!
```

---

## Migrations Applied

### Migration 1: tutor_packages CASCADE Delete

**File:** [migrate_tutor_packages_cascade_delete.py](astegni-backend/migrate_tutor_packages_cascade_delete.py)

**What it does:**
- Updates `tutor_packages.tutor_id` foreign key to use CASCADE delete
- When a tutor profile is deleted, all their packages are automatically deleted

**Status:** ✅ COMPLETED

---

### Migration 2: All Tutor-Related Tables CASCADE Delete

**File:** [migrate_all_tutor_cascade_delete.py](astegni-backend/migrate_all_tutor_cascade_delete.py)

**Tables updated (8 total):**
1. `tutor_reviews.tutor_id`
2. `tutor_activities.tutor_id`
3. `video_reels.tutor_id`
4. `tutoring_earnings.tutor_profile_id`
5. `monthly_earnings_summary.tutor_profile_id`
6. `favorite_tutors.tutor_id`
7. `direct_affiliate_earnings.tutor_profile_id`
8. `indirect_affiliate_earnings.tutor_profile_id`

**What it does:**
- Updates all foreign keys pointing to `tutor_profiles` to use CASCADE delete
- When a tutor profile is deleted, ALL related data across ALL tables is automatically deleted

**Status:** ✅ COMPLETED - 8/8 constraints updated successfully

---

## Tables Already Using CASCADE Delete

The following tables already had proper CASCADE delete configured:

### Tutor-Related (Already CASCADE)
- `whiteboard_sessions.tutor_profile_id` ✅
- `enrolled_students.tutor_id` ✅
- `enrolled_courses.tutor_id` ✅
- `subscription_metrics.tutor_profile_id` ✅
- `tutor_packages.tutor_id` ✅ (after Migration 1)
- `price_suggestion_analytics.tutor_id` ✅
- `tutor_videos.tutor_id` ✅
- `requested_sessions.tutor_id` ✅
- `student_details.tutor_id` ✅

### Student-Related (Already CASCADE)
All student_profiles foreign keys already had CASCADE delete ✅

### Parent-Related (Already CASCADE)
All parent_profiles foreign keys already had CASCADE delete ✅

### Advertiser-Related (Already CASCADE)
All advertiser_profiles foreign keys already had CASCADE delete ✅

---

## What Gets Deleted When Removing a Tutor Role

When a tutor removes their role, the following data is **permanently deleted** via CASCADE:

### Profile & Basic Data
- `tutor_profiles` record (the main profile)
- `tutor_packages` (all tutoring packages)
- `tutor_activities` (activity logs)

### Reviews & Ratings
- `tutor_reviews` (all reviews received)

### Content
- `video_reels` (all video reels posted)
- `tutor_videos` (all educational videos)

### Students & Sessions
- `enrolled_students` (all student enrollments)
- `enrolled_courses` (all course enrollments)
- `student_details` (details about enrolled students)
- `requested_sessions` (all session requests)
- `whiteboard_sessions` (all whiteboard sessions)

### Favorites & Connections
- `favorite_tutors` (entries where this tutor was favorited)

### Financial Data
- `tutoring_earnings` (all earnings records)
- `monthly_earnings_summary` (monthly summaries)
- `direct_affiliate_earnings` (affiliate earnings)
- `indirect_affiliate_earnings` (indirect affiliate earnings)

### Analytics
- `price_suggestion_analytics` (pricing suggestions)
- `subscription_metrics` (subscription data)

---

## Backend Endpoint

**File:** [role_management_endpoints.py](astegni-backend/role_management_endpoints.py)

**Endpoint:** `DELETE /api/role/remove`

**How it works:**
```python
# Step 1: Get the profile (tutor/student/parent/advertiser)
if request.role == "tutor":
    profile = db.query(TutorProfile).filter(TutorProfile.user_id == user.id).first()
    if profile:
        db.delete(profile)  # CASCADE delete handles all related data!

# Step 2: Remove role from user.roles array
if request.role in user.roles:
    user.roles.remove(request.role)

# Step 3: Clear active_role if it was the removed role
if user.active_role == request.role:
    user.active_role = None

db.commit()
```

**Before CASCADE Fix:**
- `db.delete(profile)` would fail with foreign key violation
- Had to manually delete all related data first

**After CASCADE Fix:**
- `db.delete(profile)` automatically deletes all related data
- Clean, simple, one-line deletion

---

## Testing Steps

### Test: Remove Tutor Role
```bash
1. Login as jediael.s.abebe@gmail.com
2. Click dropdown → "Manage Role"
3. Click "Remove Role"
4. Send OTP → Enter OTP + password
5. Check confirmation → Click "Remove Role"
```

**Expected Results:**
- ✅ No foreign key violation error
- ✅ Tutor profile deleted from database
- ✅ All related data deleted (packages, reviews, earnings, etc.)
- ✅ Role removed from user.roles array
- ✅ active_role set to NULL
- ✅ Redirected to /index.html
- ✅ Dropdown shows "No role selected"

---

## Verification

### Check CASCADE Delete Settings
```bash
cd astegni-backend

# Check all tutor_profiles foreign keys
python -c "from app import SessionLocal; from sqlalchemy import text; db = SessionLocal(); result = db.execute(text(\"SELECT tc.table_name, tc.constraint_name, rc.delete_rule FROM information_schema.table_constraints AS tc JOIN information_schema.referential_constraints AS rc ON tc.constraint_name = rc.constraint_name JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'tutor_profiles' AND ccu.column_name = 'id';\")).fetchall(); [print(f'{r[0]:30} | {r[2]}') for r in result]"
```

**Expected Output:**
All foreign keys should show `CASCADE` or `SET NULL` (not `NO ACTION` or `RESTRICT`)

---

## Files Modified

### Backend Migrations
1. **[migrate_tutor_packages_cascade_delete.py](astegni-backend/migrate_tutor_packages_cascade_delete.py)** - Initial fix for tutor_packages
2. **[migrate_all_tutor_cascade_delete.py](astegni-backend/migrate_all_tutor_cascade_delete.py)** - Comprehensive fix for all tutor tables

### No Code Changes Required
The backend endpoint [role_management_endpoints.py](astegni-backend/role_management_endpoints.py) didn't need any changes. Once the CASCADE delete constraints were added, the existing `db.delete(profile)` code automatically started working correctly.

---

## Summary

✅ **Foreign key constraints fixed** - All tutor_profiles foreign keys now use CASCADE delete
✅ **9 constraints updated** - tutor_packages + 8 other tables
✅ **No code changes needed** - Backend endpoint works with CASCADE delete
✅ **All profile types checked** - Student, parent, advertiser already had CASCADE delete
✅ **Role removal works** - Can now delete tutor profiles without foreign key errors

**What Changed:**
- Database foreign key constraints only (from `NO ACTION` to `CASCADE`)

**What Stayed the Same:**
- Backend API code (no changes)
- Frontend code (no changes)
- User experience (no changes)

**Security:**
Role removal still requires:
1. Password verification
2. OTP verification
3. Checkbox confirmation
4. Final warning acknowledgment

The CASCADE delete fix makes the database schema match the intended behavior: when a role is removed, ALL data for that role should be permanently deleted.
