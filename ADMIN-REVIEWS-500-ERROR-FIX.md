# Admin Reviews 500 Error Fix

## Problem

The manage-courses.html page was showing 500 Internal Server Errors when trying to load:
- `GET /api/admin-reviews/stats` - Failed with 500 error
- `GET /api/admin-reviews/recent?limit=5` - Failed with 500 error

## Root Cause

There was a **table schema conflict**. Two different features were trying to use the same `admin_reviews` table name:

### 1. Old Table (Astegni Platform Reviews)
Reviews **OF** the Astegni platform written **BY** admins:
```sql
- admin_username VARCHAR(100)
- reviewer_username VARCHAR(100)
- reviewer_role VARCHAR(50)
- rating INTEGER
- review_text TEXT
- is_featured BOOLEAN
- helpful_count INTEGER
```

### 2. New Table (Admin Performance Reviews)
Reviews **OF** admin performance written **BY** supervisors/peers:
```sql
- review_id VARCHAR(50)
- admin_name VARCHAR(255)
- reviewer_name VARCHAR(255)
- rating DECIMAL(2,1)
- response_time_rating DECIMAL(2,1)
- accuracy_rating DECIMAL(2,1)
- comment TEXT
- review_type VARCHAR(50)
- metrics JSONB
```

The `admin_review_endpoints.py` expected the new schema, but the database had the old schema.

## Solution

Created and ran `fix_admin_reviews_conflict.py` which:

1. **Renamed old table**: `admin_reviews` → `astegni_platform_reviews`
   - Preserves existing Astegni platform reviews data
   - Available for future use if needed

2. **Created new table**: `admin_reviews` (admin performance reviews)
   - Proper schema with `response_time_rating`, `accuracy_rating`, `comment`
   - Indexes on `admin_id`, `rating`, `created_at`

3. **Seeded sample data**: 8 performance reviews
   - Various review types: performance, efficiency, quality, instructor_feedback
   - Ratings from 4.2 to 5.0
   - Sample metrics in JSONB format

4. **Fixed type conversion bug**:
   - Added explicit float conversion in `/stats` endpoint
   - Fixed `Decimal + float` error when calculating trends

## Verification

All endpoints now work correctly:

### `/api/admin-reviews/stats`
```json
{
  "total_reviews": 8,
  "average_rating": 4.7,
  "average_response_time_rating": 4.62,
  "average_accuracy_rating": 4.78,
  "rating_distribution": {
    "4_stars": 6,
    "5_stars": 2
  },
  "recent_trend": "stable"
}
```

### `/api/admin-reviews/recent?limit=5`
Returns 5 most recent performance reviews with full details:
- review_id, admin_name, reviewer_name, reviewer_role
- rating, response_time_rating, accuracy_rating
- comment, review_type, related_course_id
- metrics (JSONB), created_at

## Impact

The manage-courses.html page will now:
- ✅ Load admin performance statistics without errors
- ✅ Display recent reviews in the dashboard
- ✅ Show rating distributions and trends
- ✅ Work with the Reviews & Ratings module

## Files Modified

1. **Created**: `astegni-backend/fix_admin_reviews_conflict.py`
   - Migration script to resolve table conflict

2. **Modified**: `astegni-backend/admin_review_endpoints.py`
   - Fixed Decimal to float conversion in `/stats` endpoint (line 214-224)

3. **Database Changes**:
   - Renamed: `admin_reviews` → `astegni_platform_reviews`
   - Created: New `admin_reviews` table with correct schema
   - Seeded: 8 sample performance reviews

## Testing

```bash
# Test stats endpoint
curl http://localhost:8000/api/admin-reviews/stats

# Test recent reviews
curl http://localhost:8000/api/admin-reviews/recent?limit=5

# Verify page loads without errors
# Open: http://localhost:8080/admin-pages/manage-courses.html
# Check console - should see no 500 errors
```

## Sample Review Data

The following sample reviews were added:

1. **Marketing Director** - 4.8★ Performance Review
2. **Sales Team** - 5.0★ Efficiency Review
3. **Finance Department** - 4.2★ Financial Review
4. **Dr. Alemayehu Bekele** - 4.9★ Instructor Feedback
5. **Quality Assurance Team** - 4.7★ Quality Review
6. **Student Services** - 4.6★ Student Impact Review
7. **Technology Department** - 4.4★ Operational Review
8. **Prof. Tigist Haile** - 5.0★ Instructor Feedback

All reviews include:
- Realistic Ethiopian names and contexts
- Performance metrics in JSONB format
- Various review types and perspectives
- Created timestamps spread over 30 days

## Future Considerations

If you need the old **Astegni Platform Reviews** feature:
- Data is preserved in `astegni_platform_reviews` table
- Create new endpoints like `/api/platform-reviews/*`
- These are different from admin performance reviews
