# Admin Reviews - Quick Test Guide

## What Was Fixed

The manage-courses page had 500 errors when loading admin performance reviews. The issue was a table schema conflict that has now been resolved.

## Quick Test (30 seconds)

1. **Open the page**:
   ```
   http://localhost:8080/admin-pages/manage-courses.html
   ```

2. **Open Browser Console** (F12)

3. **Check for these success messages**:
   ```
   ✅ Reviews module initialized
   ✅ Reviews & Ratings Module initialized
   ```

4. **Verify NO 500 errors**:
   - Should NOT see: `Failed to load resource: 500 (Internal Server Error)`
   - From: `/api/admin-reviews/stats`
   - From: `/api/admin-reviews/recent?limit=5`

## What You Should See

### In Console (Success)
```
manage-courses-reviews.js:387 Reviews module initialized
```

### In Network Tab (Success)
```
GET /api/admin-reviews/stats          200 OK
GET /api/admin-reviews/recent?limit=5 200 OK
```

### On Page (If reviews are displayed)
- Average rating: **4.7 stars**
- Total reviews: **8 reviews**
- Recent reviews from Marketing Director, Sales Team, etc.

## Test API Directly

### Test Stats Endpoint
```bash
curl http://localhost:8000/api/admin-reviews/stats
```

**Expected Output**:
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

### Test Recent Reviews
```bash
curl http://localhost:8000/api/admin-reviews/recent?limit=5
```

**Expected Output**: JSON array with 5 reviews containing:
- review_id (e.g., "REV-ADM-001")
- admin_name ("Course Management")
- reviewer_name (e.g., "Marketing Director")
- rating (4.2 to 5.0)
- response_time_rating
- accuracy_rating
- comment (detailed feedback)

## Sample Data Added

8 performance reviews with:
- Ratings: 4.2★ to 5.0★
- Types: performance, efficiency, quality, instructor_feedback
- Reviewers: Marketing Director, Sales Team, Finance, QA, etc.
- Ethiopian context: Dr. Alemayehu Bekele, Prof. Tigist Haile

## If Something Goes Wrong

### Still seeing 500 errors?

1. **Check backend is running**:
   ```bash
   curl http://localhost:8000/api/admin-reviews/stats
   ```

2. **Check table exists**:
   ```bash
   cd astegni-backend
   psql postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db -c "\d admin_reviews"
   ```

3. **Re-run migration**:
   ```bash
   cd astegni-backend
   python fix_admin_reviews_conflict.py
   ```

4. **Restart backend**:
   ```bash
   cd astegni-backend
   python app.py
   ```

### Table not found?

Run the migration:
```bash
cd astegni-backend
python fix_admin_reviews_conflict.py
```

### Wrong schema?

The correct schema should have:
- `response_time_rating` (DECIMAL)
- `accuracy_rating` (DECIMAL)
- `comment` (TEXT)
- `review_type` (VARCHAR)
- `metrics` (JSONB)

If you see `review_text`, `admin_username`, `reviewer_username` instead, the migration didn't run.

## Success Criteria

✅ No 500 errors in console
✅ Stats endpoint returns 200 OK
✅ Recent endpoint returns 200 OK
✅ Reviews module initialized message
✅ 8 reviews in database

## Additional Endpoints Available

All these should work now:

```bash
# Get all reviews
GET /api/admin-reviews/?limit=50&offset=0

# Get reviews by rating
GET /api/admin-reviews/?min_rating=4.5

# Get reviews by type
GET /api/admin-reviews/?review_type=performance

# Get specific review
GET /api/admin-reviews/REV-ADM-001

# Create new review (POST)
POST /api/admin-reviews/
```

## Need Help?

See detailed explanation in: `ADMIN-REVIEWS-500-ERROR-FIX.md`
