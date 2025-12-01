# Manage Tutor Documents - Reviews Integration

## Overview
Added a comprehensive reviews system to the **manage-tutor-documents.html** page that integrates with the `admin_reviews` table. Reviews are filtered by `admin_id` and display both in the dashboard panel and a dedicated reviews panel.

## What Was Added

### 1. Sidebar Navigation
- Added "My Reviews" link in the sidebar with a ⭐ icon
- Located after "Suspended documents Tutors" section
- Uses `switchPanel('reviews')` to navigate to the reviews panel

### 2. Reviews Panel
A complete panel displaying:
- **Statistics Cards:**
  - Total Reviews count
  - Average Rating (out of 5.0)
  - Average Response Time rating
  - Average Accuracy rating

- **Reviews List:**
  - All reviews for the logged-in admin
  - Color-coded border based on rating (green for 4.5+, blue for 4.0+, etc.)
  - Star ratings visualization
  - Reviewer name and role
  - Review comment/feedback
  - Response time and accuracy sub-ratings
  - Relative timestamps ("3 days ago", "1 week ago")

### 3. Dashboard Panel Integration
- Replaced hardcoded reviews section with database-driven implementation
- Shows 3 most recent reviews
- Uses same styling and formatting as the full reviews panel

## Files Modified

### HTML
**File:** [manage-tutor-documents.html](admin-pages/manage-tutor-documents.html)

**Changes:**
1. Added reviews sidebar link (line ~105)
2. Created reviews panel with stats and reviews list (lines ~713-753)
3. Replaced hardcoded dashboard reviews with dynamic container (lines ~331-339)

### JavaScript
**New File:** [js/admin-pages/manage-tutor-documents-reviews.js](js/admin-pages/manage-tutor-documents-reviews.js)

**Features:**
- `loadDashboardReviews()` - Loads 3 recent reviews for dashboard
- `loadAllReviews()` - Loads all reviews for the reviews panel
- `renderDashboardReviews()` - Renders dashboard reviews with color-coded styling
- `renderAllReviews()` - Renders full reviews list with detailed information
- `updateReviewsStats()` - Updates statistics cards
- `displayNoReviews()` - Shows "No reviews yet" message when empty
- Star rating generator
- Date formatter (relative times)
- XSS protection with HTML escaping

### Backend
**File:** [astegni-backend/admin_review_endpoints.py](astegni-backend/admin_review_endpoints.py)

**Changes:**
- Added `admin_id` parameter to `GET /api/admin-reviews/` endpoint (line 98)
- Filters reviews by admin_id when provided
- Already had admin_id filtering in `/recent` and `/stats` endpoints

## Database Schema

The `admin_reviews` table structure:
```sql
CREATE TABLE admin_reviews (
    id SERIAL PRIMARY KEY,
    review_id VARCHAR(50) UNIQUE,
    admin_id INTEGER REFERENCES admins(id),  -- IMPORTANT: Filters reviews per admin
    admin_name VARCHAR(255),
    reviewer_name VARCHAR(255),
    reviewer_role VARCHAR(100),
    rating DECIMAL(3,2),  -- Overall rating (1.0-5.0)
    response_time_rating DECIMAL(3,2),  -- Optional sub-rating
    accuracy_rating DECIMAL(3,2),  -- Optional sub-rating
    comment TEXT,
    review_type VARCHAR(50),  -- e.g., 'tutor_management', 'general'
    related_course_id VARCHAR(50),
    metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints Used

### 1. Get Recent Reviews (Dashboard)
```
GET /api/admin-reviews/recent?limit=3&admin_id={admin_id}
```

**Response:**
```json
{
  "reviews": [
    {
      "id": 1,
      "review_id": "REV-ADM-001",
      "admin_name": "Abebe Kebede",
      "reviewer_name": "System Admin",
      "reviewer_role": "Super Admin",
      "rating": 4.8,
      "response_time_rating": 4.5,
      "accuracy_rating": 5.0,
      "comment": "Excellent tutor management skills",
      "review_type": "tutor_management",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "count": 3
}
```

### 2. Get All Reviews (Reviews Panel)
```
GET /api/admin-reviews/?limit=100&admin_id={admin_id}
```

**Response:**
```json
{
  "reviews": [...],
  "total_count": 15,
  "limit": 100,
  "offset": 0
}
```

### 3. Get Statistics
```
GET /api/admin-reviews/stats?admin_id={admin_id}
```

**Response:**
```json
{
  "total_reviews": 15,
  "average_rating": 4.6,
  "average_response_time_rating": 4.3,
  "average_accuracy_rating": 4.7,
  "rating_distribution": {
    "5_stars": 8,
    "4_stars": 6,
    "3_stars": 1
  },
  "recent_trend": "improving"
}
```

## How It Works

### 1. Page Load
1. JavaScript initializes on `DOMContentLoaded`
2. `loadDashboardReviews()` is called immediately
3. Fetches 3 most recent reviews from API using stored `admin_id`
4. Displays reviews in dashboard panel with color-coded borders

### 2. Panel Switching
1. User clicks "My Reviews" in sidebar
2. `switchPanel('reviews')` is called
3. MutationObserver detects panel visibility change
4. `loadAllReviews()` is triggered
5. Fetches all reviews and statistics
6. Updates stats cards and reviews list

### 3. Empty State
- If no reviews exist: Shows friendly "No reviews yet" message
- Stats show 0 values
- Both dashboard and reviews panel handle empty state gracefully

## Testing

### Test File
Created [test-tutor-documents-reviews.html](test-tutor-documents-reviews.html) for testing:

**Features:**
1. Set admin ID in localStorage
2. Test recent reviews endpoint
3. Test all reviews endpoint
4. Test stats endpoint
5. View raw JSON responses

**Usage:**
```bash
# Open in browser
http://localhost:8080/test-tutor-documents-reviews.html

# Steps:
1. Enter admin ID (e.g., 1)
2. Click "Set Admin ID"
3. Click test buttons to verify endpoints
4. Check JSON responses
```

### Manual Testing Steps

1. **Start Backend:**
```bash
cd astegni-backend
python app.py
```

2. **Login as Admin:**
- Navigate to admin login page
- Login with admin credentials
- System will store `adminId` in localStorage

3. **Open Manage Tutor Documents:**
```
http://localhost:8080/admin-pages/manage-tutor-documents.html
```

4. **Verify Dashboard Reviews:**
- Should see "Loading reviews..." initially
- If reviews exist: Shows 3 recent reviews
- If no reviews: Shows "No reviews yet" message

5. **Navigate to Reviews Panel:**
- Click "My Reviews" in sidebar
- Should load all reviews and statistics
- Stats cards should populate with data

### Sample Data Creation

If you need to add test reviews to the database:

```python
# In Python console or script
import psycopg
from datetime import datetime, timezone

conn = psycopg.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
cursor = conn.cursor()

# Add a test review for admin_id = 1
cursor.execute("""
    INSERT INTO admin_reviews
    (review_id, admin_id, admin_name, reviewer_name, reviewer_role,
     rating, response_time_rating, accuracy_rating, comment, review_type, created_at)
    VALUES
    ('REV-ADM-TEST-001', 1, 'Test Admin', 'John Doe', 'Super Admin',
     4.8, 4.5, 5.0, 'Excellent work on tutor document verification!',
     'tutor_management', %s)
""", (datetime.now(timezone.utc),))

conn.commit()
cursor.close()
conn.close()
```

## Features Implemented

✅ **Database Integration:**
- Reads from `admin_reviews` table
- Filters by `admin_id` automatically
- No hardcoded data

✅ **Department-Based Reviews:**
- Reviews are specific to each admin
- Only shows reviews for the logged-in admin
- Separate review counts per admin

✅ **Empty State Handling:**
- Graceful "No reviews yet" message
- Clear visual feedback
- No errors when table is empty

✅ **Real-time Statistics:**
- Total review count
- Average ratings (overall, response time, accuracy)
- Auto-calculated from database

✅ **Responsive Design:**
- Works on mobile and desktop
- Consistent with existing admin page style
- Color-coded rating borders

✅ **Performance:**
- Lazy loading (reviews panel only loads when visible)
- Dashboard loads on page load
- Efficient database queries

## Next Steps (Optional Enhancements)

### 1. Add Review Filtering
Add filters to the reviews panel:
```html
<select id="review-type-filter">
    <option value="">All Types</option>
    <option value="tutor_management">Tutor Management</option>
    <option value="general">General</option>
</select>
```

### 2. Add Pagination
For admins with many reviews:
```javascript
function loadReviewsPage(page, limit = 20) {
    const offset = (page - 1) * limit;
    // Fetch with offset
}
```

### 3. Add Export Feature
Export reviews to CSV:
```javascript
function exportReviews() {
    // Generate CSV from reviews array
    // Download as file
}
```

### 4. Add Review Response
Allow admins to respond to reviews:
```sql
ALTER TABLE admin_reviews ADD COLUMN admin_response TEXT;
ALTER TABLE admin_reviews ADD COLUMN responded_at TIMESTAMP;
```

## Troubleshooting

### Issue: "Loading reviews..." never goes away
**Solution:**
1. Check browser console for errors
2. Verify `adminId` is set: `localStorage.getItem('adminId')`
3. Check backend is running on port 8000
4. Verify database connection

### Issue: "No reviews yet" when reviews exist
**Solution:**
1. Verify admin_id matches: Check `admin_reviews` table
2. SQL query: `SELECT * FROM admin_reviews WHERE admin_id = 1;`
3. Check browser console for API errors
4. Verify token is valid

### Issue: Stats showing 0 even with reviews
**Solution:**
1. Check `/api/admin-reviews/stats?admin_id=X` endpoint
2. Verify admin_id parameter is being sent
3. Check database has admin_id column populated

## Summary

This implementation provides a complete, production-ready reviews system for the manage-tutor-documents page with:
- **Database-driven** - No hardcoded data
- **Department-aware** - Reviews filtered by admin_id
- **User-friendly** - Clear empty states and error handling
- **Performant** - Lazy loading and efficient queries
- **Consistent** - Matches existing admin page design

The system is ready for production use and can be extended with additional features as needed.
