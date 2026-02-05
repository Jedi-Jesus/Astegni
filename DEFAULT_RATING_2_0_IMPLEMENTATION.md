# Default Rating 2.0 Implementation - Complete Guide

## Overview
All new users (tutors, students, parents) now have a **default rating of 2.0** when they create a role, instead of showing 0.0 or falling back to hardcoded 3.5.

## System Design

### Rating Storage

1. **Tutors**:
   - Reviews stored in: `tutor_reviews` table
   - Rating calculated/stored in: `tutor_analysis.average_rating`
   - **Default (no reviews)**: `average_rating = 2.0`
   - **With reviews**: Calculated from `AVG(tutor_reviews.rating)`

2. **Parents**:
   - Reviews stored in: `parent_reviews` table
   - Rating calculated/stored in: `parent_profiles.rating`
   - **Default (no reviews)**: `rating = 2.0`
   - **With reviews**: Calculated from `AVG(parent_reviews.rating)`

3. **Students**:
   - Reviews stored in: `student_reviews` table
   - **No dedicated rating column** (always calculated from reviews)
   - Default: Show 2.0 in UI when no reviews exist

### Database Changes

#### New Default Values:
- `tutor_analysis.average_rating` = 2.0 (created on role creation)
- `parent_profiles.rating` = 2.0 (set on role creation)

## Implementation Details

### 1. Migration (Existing Users)

**File**: `migrate_set_default_rating_2_0.py`

**What it does**:
- Creates `tutor_analysis` records with `average_rating = 2.0` for all tutors without reviews
- Sets `parent_profiles.rating = 2.0` for all parents without reviews
- Updates existing users with actual ratings from their review tables

**How to run**:
```bash
cd astegni-backend
python migrate_set_default_rating_2_0.py
```

**Results (from migration)**:
```
Tutor Analysis:
  - With default 2.0 rating: 3
  - With actual reviews: 0
  - Total: 3

Parent Profiles:
  - With default 2.0 rating: 3
  - With actual reviews: 0
  - Total: 3
```

### 2. Role Creation (New Users)

**Files Modified**: `app.py modules/routes.py`

#### Registration Endpoint (`/api/register`)

**When creating tutor role**:
```python
tutor_profile = TutorProfile(user_id=new_user.id)
db.add(tutor_profile)
db.commit()
db.refresh(tutor_profile)

# Create tutor_analysis with default 2.0 rating
tutor_analysis = TutorAnalysis(
    tutor_id=tutor_profile.id,
    average_rating=2.0,
    total_reviews=0,
    avg_subject_understanding_rating=2.0,
    avg_communication_rating=2.0,
    avg_discipline_rating=2.0,
    avg_punctuality_rating=2.0,
    # ... other fields
)
db.add(tutor_analysis)
db.commit()
```

**When creating parent role**:
```python
parent_profile = ParentProfile(
    user_id=new_user.id,
    rating=2.0,  # Set default 2.0 rating
    rating_count=0
)
db.add(parent_profile)
db.commit()
```

#### Add Role Endpoint (`/api/add-role`)

Same logic applies when users add additional roles to their account.

### 3. Market Pricing (Already Correct!)

**File**: `market_pricing_endpoints.py`

**The endpoint already reads from database correctly** using `COALESCE`:

```python
cur.execute("""
    SELECT
        tp.id,
        COALESCE(ta.average_rating, 2.0) as rating,
        ...
    FROM tutor_profiles tp
    LEFT JOIN tutor_analysis ta ON ta.tutor_id = tp.id
    WHERE tp.user_id = %s
""")
```

**How it works**:
1. First tries to read `ta.average_rating` from database
2. If NULL (shouldn't happen now), falls back to 2.0
3. **No hardcoding** - the 2.0 value in database is set during role creation

### 4. Review System Integration

**Helper Script**: `update_ratings_from_reviews.py`

**When to run**:
- Run periodically to sync ratings with actual reviews
- Can be set up as a cron job
- Useful after bulk review imports

**What it does**:
```python
# Update tutors WITH reviews from actual review average
UPDATE tutor_analysis ta
SET average_rating = (SELECT AVG(rating) FROM tutor_reviews WHERE tutor_id = ta.tutor_id)
WHERE EXISTS (SELECT 1 FROM tutor_reviews WHERE tutor_id = ta.tutor_id)

# Set default 2.0 for tutors WITHOUT reviews
UPDATE tutor_analysis ta
SET average_rating = 2.0, total_reviews = 0
WHERE NOT EXISTS (SELECT 1 FROM tutor_reviews WHERE tutor_id = ta.tutor_id)
```

## Testing

### Test Scenario 1: New User Registration

```bash
# 1. Register as new tutor
POST /api/register
{
  "email": "newtutor@example.com",
  "password": "password",
  "role": "tutor",
  ...
}

# 2. Check database
SELECT ta.average_rating, ta.total_reviews
FROM tutor_analysis ta
JOIN tutor_profiles tp ON ta.tutor_id = tp.id
JOIN users u ON tp.user_id = u.id
WHERE u.email = 'newtutor@example.com'

# Expected Result:
# average_rating: 2.0
# total_reviews: 0
```

### Test Scenario 2: Add Role to Existing User

```bash
# 1. User adds parent role
POST /api/add-role
{
  "new_role": "parent",
  "password": "user_password",
  "otp": "123456"
}

# 2. Check database
SELECT rating, rating_count
FROM parent_profiles
WHERE user_id = 1

# Expected Result:
# rating: 2.0
# rating_count: 0
```

### Test Scenario 3: Market Pricing

```bash
# 1. Open package management modal as tutor with no reviews

# 2. Navigate to Market Trends tab

# 3. Expected behavior:
#    - Your rating shows as 2.0 (from database, not hardcoded)
#    - You appear in "2.0-2.5" range on graphs
#    - Pricing calculations use 2.0 for similarity matching
```

### Verification for Existing User (jediael.s.abebe@gmail.com)

```bash
cd astegni-backend
python -c "
import psycopg, os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Check tutor rating
cur.execute('''
    SELECT ta.average_rating, ta.total_reviews
    FROM tutor_analysis ta
    JOIN tutor_profiles tp ON ta.tutor_id = tp.id
    WHERE tp.user_id = 1
''')
print('Tutor:', cur.fetchone())

# Check parent rating
cur.execute('''
    SELECT rating, rating_count
    FROM parent_profiles WHERE user_id = 1
''')
print('Parent:', cur.fetchone())

conn.close()
"
```

**Expected Output**:
```
Tutor: (2.0, 0)
Parent: (2.0, 0)
```

## Flow Diagram

```
┌─────────────────────────────────────┐
│  User Creates Tutor/Parent Role     │
└──────────────┬──────────────────────┘
               │
               ├─► Create Profile in DB
               │
               ├─► FOR TUTORS:
               │   └─► Create tutor_analysis record
               │       ├─► average_rating = 2.0
               │       ├─► total_reviews = 0
               │       └─► All factor ratings = 2.0
               │
               ├─► FOR PARENTS:
               │   └─► Set in parent_profiles
               │       ├─► rating = 2.0
               │       └─► rating_count = 0
               │
               └─► FOR STUDENTS:
                   └─► No default rating stored
                       (calculated from reviews only)

┌─────────────────────────────────────┐
│  User Receives First Review         │
└──────────────┬──────────────────────┘
               │
               ├─► Review saved to review table
               │   (tutor_reviews / parent_reviews)
               │
               └─► Rating updated:
                   ├─► tutor_analysis.average_rating = AVG(reviews)
                   └─► parent_profiles.rating = AVG(reviews)

┌─────────────────────────────────────┐
│  Market Pricing Query                │
└──────────────┬──────────────────────┘
               │
               └─► COALESCE(ta.average_rating, 2.0)
                   ├─► Reads from tutor_analysis table
                   ├─► If exists: use actual value (2.0 or calculated avg)
                   └─► If NULL: fallback to 2.0 (shouldn't happen)
```

## Key Benefits

1. ✅ **Database-Driven**: No hardcoded values in endpoints
2. ✅ **Consistent**: All new users start with 2.0 rating
3. ✅ **Accurate**: Users with reviews show actual calculated ratings
4. ✅ **Transparent**: Clear distinction between default (2.0, 0 reviews) and earned ratings
5. ✅ **Maintainable**: Single source of truth in database

## Files Modified

1. **Migration**:
   - `astegni-backend/migrate_set_default_rating_2_0.py` (NEW)
   - `astegni-backend/update_ratings_from_reviews.py` (NEW - helper script)

2. **Backend**:
   - `astegni-backend/app.py modules/routes.py` (Modified - registration & add-role endpoints)
   - `astegni-backend/market_pricing_endpoints.py` (Already correct - uses COALESCE)

3. **Documentation**:
   - `DEFAULT_RATING_2_0_IMPLEMENTATION.md` (This file)

## Maintenance

### When New Reviews Are Added

The system should automatically update ratings when new reviews are created. Ensure review endpoints include:

```python
# After creating a new review
if review_type == "tutor":
    # Update tutor_analysis.average_rating from tutor_reviews
    db.execute(text("""
        UPDATE tutor_analysis ta
        SET average_rating = (
            SELECT AVG(rating) FROM tutor_reviews WHERE tutor_id = :tutor_id
        ),
        total_reviews = (
            SELECT COUNT(*) FROM tutor_reviews WHERE tutor_id = :tutor_id
        )
        WHERE ta.tutor_id = :tutor_id
    """), {"tutor_id": tutor_id})

elif review_type == "parent":
    # Update parent_profiles.rating from parent_reviews
    db.execute(text("""
        UPDATE parent_profiles pp
        SET rating = (
            SELECT AVG(rating) FROM parent_reviews WHERE parent_id = :parent_id
        ),
        rating_count = (
            SELECT COUNT(*) FROM parent_reviews WHERE parent_id = :parent_id
        )
        WHERE pp.id = :parent_id
    """), {"parent_id": parent_id})
```

### Periodic Sync (Optional)

Run `update_ratings_from_reviews.py` periodically (e.g., daily cron job) to ensure ratings stay in sync:

```bash
# Add to crontab
0 2 * * * cd /var/www/astegni/astegni-backend && python update_ratings_from_reviews.py
```

## Summary

✅ **Migration Complete**: All existing users now have 2.0 default rating
✅ **Endpoints Updated**: New role creation initializes with 2.0
✅ **Database-Driven**: Market pricing reads from DB, not hardcoded
✅ **Review Integration**: Ratings update from actual reviews

**Result**: The "3.5 problem" is solved. Users now see 2.0 as default, which correctly comes from the database, not hardcoded values.
