# Course Request Status Tracking Implementation

## Overview
This document describes the implementation of **Option 1 (Status Column)** with **Interpretation 1 (Admin Actively Reviewing)** for the course management system.

## Database Changes

### Migration: `migrate_add_status_to_course_requests.py`

Added three new columns to `course_requests` table:

```sql
ALTER TABLE course_requests
ADD COLUMN status VARCHAR(20) DEFAULT 'new'
CHECK (status IN ('new', 'under_review'));

ALTER TABLE course_requests
ADD COLUMN reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE course_requests
ADD COLUMN review_started_at TIMESTAMP;

CREATE INDEX idx_course_requests_status ON course_requests(status);
```

### Column Definitions

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `status` | VARCHAR(20) | `'new'` | Request status: `'new'` or `'under_review'` |
| `reviewed_by` | INTEGER | NULL | Foreign key to user who is reviewing |
| `review_started_at` | TIMESTAMP | NULL | When admin first viewed the request |

## Status Flow

```
┌─────────────────┐
│  Request Created │
│  status = 'new'  │
└────────┬─────────┘
         │
         │ Admin clicks "View Details"
         │ (GET /api/course-management/requests/{request_id})
         ↓
┌──────────────────────┐
│   Under Review        │
│  status = 'under_    │
│  review'              │
│  review_started_at =  │
│  NOW()                │
└──────┬──────┬─────────┘
       │      │
       │      │ Admin rejects
       ↓      ↓
  ┌────────┐  ┌────────────┐
  │Approved│  │  Rejected   │
  │(active_│  │(rejected_   │
  │courses)│  │courses)     │
  └────────┘  └────────────┘
```

## Backend Implementation

### 1. Updated Endpoints

#### `GET /api/course-management/requests`
Returns all course requests with status information:
```json
{
  "courses": [
    {
      "request_id": "REQ-CRS-001",
      "title": "Advanced Calculus",
      "status": "new",
      "reviewed_by": null,
      "review_started_at": null,
      ...
    }
  ],
  "count": 10
}
```

#### `GET /api/course-management/requests/{request_id}` ⭐ AUTO-UPDATES STATUS
**Automatically marks request as 'under_review' on first view!**

When an admin views a request for the first time:
1. Check if `status == 'new'`
2. If yes, update to `'under_review'` and set `review_started_at`
3. Return updated request data

```python
# Auto-mark as "under_review" if still "new"
if current_status == "new":
    cursor.execute("""
        UPDATE course_requests
        SET status = 'under_review',
            review_started_at = NOW(),
            updated_at = NOW()
        WHERE request_id = %s
    """, (request_id,))
```

#### `POST /api/course-management/requests` ⭐ NEW REQUESTS START AS 'new'
Creates new requests with `status = 'new'` by default:
```python
cursor.execute("""
    INSERT INTO course_requests
    (request_id, title, category, level, description,
     requested_by, status, created_at)
    VALUES (%s, %s, %s, %s, %s, %s, 'new', NOW())
""", ...)
```

#### `GET /api/course-management/requests/stats/by-status` ⭐ NEW ENDPOINT
Returns statistics grouped by status:
```json
{
  "new": 5,               // status = 'new'
  "under_review": 3,      // status = 'under_review'
  "total": 8,             // Total in course_requests table
  "approved_today": 2,    // Approved in last 24 hours
  "rejected_total": 12    // Total in rejected_courses table
}
```

### 2. Database Queries

**Count New Requests:**
```sql
SELECT COUNT(*) FROM course_requests WHERE status = 'new';
```

**Count Under Review:**
```sql
SELECT COUNT(*) FROM course_requests WHERE status = 'under_review';
```

**Count Approved Today:**
```sql
SELECT COUNT(*) FROM active_courses
WHERE approved_at >= NOW() - INTERVAL '24 hours';
```

**Count Total Rejected:**
```sql
SELECT COUNT(*) FROM rejected_courses;
```

## Frontend Implementation

### Updated Files

#### `js/admin-pages/manage-courses-dashboard-loader.js`

Added new function `loadRequestedPanelStats()` that:
1. Fetches from `/api/course-management/requests/stats/by-status`
2. Updates the 4 stat cards in the Requested Courses panel
3. Uses smooth animation for value updates

```javascript
async function loadRequestedPanelStats() {
    const response = await fetch(`${API_BASE_URL}/api/course-management/requests/stats/by-status`);
    const stats = await response.json();

    // Update stat cards:
    // 1. New Requests = stats.new
    // 2. Under Review = stats.under_review
    // 3. Approved Today = stats.approved_today
    // 4. Rejected = stats.rejected_total
}
```

#### `admin-pages/manage-courses.html`

Updated Requested Courses Panel stats section:
```html
<div class="dashboard-grid mb-8">
    <div class="card p-4">
        <h3>New Requests</h3>
        <p class="text-2xl font-bold text-yellow-600">...</p>
        <span class="text-sm text-gray-500">Not yet reviewed</span>
    </div>
    <div class="card p-4">
        <h3>Under Review</h3>
        <p class="text-2xl font-bold text-blue-600">...</p>
        <span class="text-sm text-gray-500">Being processed</span>
    </div>
    <div class="card p-4">
        <h3>Approved Today</h3>
        <p class="text-2xl font-bold text-green-600">...</p>
        <span class="text-sm text-gray-500">Last 24 hours</span>
    </div>
    <div class="card p-4">
        <h3>Rejected</h3>
        <p class="text-2xl font-bold text-red-600">...</p>
        <span class="text-sm text-gray-500">Total rejected</span>
    </div>
</div>
```

**Also removed "Archived Courses" card from dashboard** (lines 278-282 removed)

## How It Works

### Workflow Example

1. **Student submits course request "Advanced Python"**
   - Inserted into `course_requests` with `status = 'new'`
   - **"New Requests"** stat increments from 4 to 5

2. **Admin opens manage-courses.html**
   - Dashboard shows: "New Requests: 5"

3. **Admin clicks "Review" button on "Advanced Python"**
   - Frontend calls `GET /api/course-management/requests/REQ-CRS-042`
   - Backend automatically updates:
     ```sql
     UPDATE course_requests
     SET status = 'under_review',
         review_started_at = NOW()
     WHERE request_id = 'REQ-CRS-042'
     ```
   - **"New Requests"** decrements: 5 → 4
   - **"Under Review"** increments: 2 → 3

4. **Admin approves the course**
   - Request moves from `course_requests` to `active_courses`
   - **"Under Review"** decrements: 3 → 2
   - **"Approved Today"** increments: 1 → 2

5. **Stats now show:**
   ```
   New Requests: 4
   Under Review: 2
   Approved Today: 2
   Rejected: 12
   ```

## Testing Steps

### 1. Run Migration
```bash
cd astegni-backend
python migrate_add_status_to_course_requests.py
```

Expected output:
```
============================================================
ADD STATUS TRACKING TO COURSE_REQUESTS TABLE
============================================================
🔄 Connecting to localhost:5432/astegni_db

📋 Adding status tracking to course_requests table...
  Adding 'status' column...
  ✅ 'status' column added
  Adding 'reviewed_by' column...
  ✅ 'reviewed_by' column added
  Adding 'review_started_at' column...
  ✅ 'review_started_at' column added

📊 Creating index on status column...
  ✅ Index created

✅ Migration completed successfully!

📊 Current course requests status distribution:
  new: 15 requests
  under_review: 0 requests

  Total course requests: 15
```

### 2. Restart Backend
```bash
cd astegni-backend
python app.py
```

### 3. Test Frontend
1. Open `http://localhost:8080/admin-pages/manage-courses.html`
2. Navigate to **Course Requests** panel
3. Observe the 4 stats:
   - New Requests (yellow)
   - Under Review (blue)
   - Approved Today (green)
   - Rejected (red)

### 4. Test Status Transition
1. Click "Review" on any course request with status 'new'
2. Backend auto-updates to 'under_review'
3. Refresh the Requested Courses panel
4. **"New Requests"** should decrease by 1
5. **"Under Review"** should increase by 1

### 5. Test API Directly
```bash
# Get status statistics
curl http://localhost:8000/api/course-management/requests/stats/by-status

# Expected response:
{
  "new": 5,
  "under_review": 3,
  "total": 8,
  "approved_today": 2,
  "rejected_total": 12
}
```

## Key Features

✅ **Automatic Status Tracking** - No manual "Start Review" button needed
✅ **First-View Detection** - Status changes automatically when admin opens request
✅ **Real-Time Stats** - Panel stats update based on actual database status
✅ **Backward Compatible** - Existing requests default to 'new' status
✅ **Performance Optimized** - Index on status column for fast queries
✅ **Clean Architecture** - Separation of concerns between new/under_review requests

## Status Definitions (Final)

| Stat | Database Query | Meaning |
|------|---------------|---------|
| **New Requests** | `COUNT(*) WHERE status = 'new'` | Requests never viewed by admin |
| **Under Review** | `COUNT(*) WHERE status = 'under_review'` | Admin has opened/is reviewing |
| **Approved Today** | `COUNT(*) FROM active_courses WHERE approved_at >= NOW() - 24h` | Moved to active in last 24 hours |
| **Rejected** | `COUNT(*) FROM rejected_courses` | Total rejected requests |

## Troubleshooting

### Stats not updating after migration
**Solution:** Restart the backend server to load updated endpoints

### All requests show as "new" even after viewing
**Solution:** Check that `GET /requests/{id}` endpoint includes status update logic

### Status column doesn't exist error
**Solution:** Run the migration script: `python migrate_add_status_to_course_requests.py`

## Files Changed

### Backend
- ✅ `astegni-backend/migrate_add_status_to_course_requests.py` (NEW)
- ✅ `astegni-backend/course_management_endpoints.py` (MODIFIED)
  - Updated `GET /requests` to include status fields
  - Updated `GET /requests/{id}` to auto-mark as under_review
  - Updated `POST /requests` to set status = 'new'
  - Added `GET /requests/stats/by-status` endpoint

### Frontend
- ✅ `admin-pages/manage-courses.html` (MODIFIED)
  - Removed "Archived Courses" card from dashboard
  - Updated Requested Courses panel stats (4 cards with descriptions)
- ✅ `js/admin-pages/manage-courses-dashboard-loader.js` (MODIFIED)
  - Added `loadRequestedPanelStats()` function
  - Added `animateStatUpdate()` helper
  - Special handling for 'requested' panel in `loadPanelStatistics()`

## Next Steps

1. Run migration: `python migrate_add_status_to_course_requests.py`
2. Restart backend: `python app.py`
3. Test in browser at: `http://localhost:8080/admin-pages/manage-courses.html`
4. Verify stats update correctly when viewing requests
