# Quick Start: Testing Reviews Integration

## Step 1: Start the Backend
```bash
cd astegni-backend
python app.py
```

**Expected output:**
```
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## Step 2: Verify Backend Endpoint
Open a browser or use curl to test:
```bash
# Test without admin_id (should return all reviews)
curl http://localhost:8000/api/admin-reviews/

# Test with admin_id (should return filtered reviews)
curl http://localhost:8000/api/admin-reviews/?admin_id=1

# Test stats
curl http://localhost:8000/api/admin-reviews/stats?admin_id=1
```

## Step 3: Open Test Page
1. Open browser to: `http://localhost:8080/test-tutor-documents-reviews.html`
2. Enter admin ID (e.g., `1`)
3. Click "Set Admin ID"
4. Click each test button to verify endpoints work

**Expected Results:**
- If no reviews exist: `{"reviews": [], "count": 0}`
- If reviews exist: JSON array with review objects
- Stats should show calculated averages

## Step 4: Test in Actual Page

### Option A: With Existing Admin Session
1. Make sure you're logged in as an admin
2. Navigate to: `http://localhost:8080/admin-pages/manage-tutor-documents.html`
3. Check dashboard - should see "Loading reviews..." then either reviews or "No reviews yet"
4. Click "My Reviews" in sidebar
5. Should see stats cards and full reviews list

### Option B: Set Admin ID Manually (for testing)
1. Open browser console (F12)
2. Run: `localStorage.setItem('adminId', '1')`
3. Navigate to: `http://localhost:8080/admin-pages/manage-tutor-documents.html`
4. Reviews should load for admin_id = 1

## Step 5: Add Test Data (If No Reviews Exist)

### Using Python
```python
# Run this in astegni-backend directory
import psycopg
from datetime import datetime, timezone

conn = psycopg.connect("postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db")
cursor = conn.cursor()

# Check which admin IDs exist
cursor.execute("SELECT id, username, email FROM admins LIMIT 5")
print("Available admins:")
for row in cursor.fetchall():
    print(f"  ID: {row[0]}, Username: {row[1]}, Email: {row[2]}")

# Add test reviews for admin_id = 1
test_reviews = [
    (1, 'REV-TEST-001', 'Excellent Work!', 'Sarah Johnson', 'Department Head', 5.0, 5.0, 5.0, 'Outstanding performance on tutor verification. Always thorough and professional.', 'tutor_management'),
    (1, 'REV-TEST-002', 'Great Response Time', 'Michael Chen', 'Senior Admin', 4.7, 5.0, 4.5, 'Very quick to process tutor documents. Good attention to detail.', 'tutor_management'),
    (1, 'REV-TEST-003', 'Solid Performance', 'Alem Tesfaye', 'Supervisor', 4.5, 4.3, 4.7, 'Consistent and reliable. Handles high volume of documents efficiently.', 'general'),
]

for admin_id, review_id, title, reviewer, role, rating, resp_time, accuracy, comment, rev_type in test_reviews:
    cursor.execute("""
        INSERT INTO admin_reviews
        (review_id, admin_id, admin_name, reviewer_name, reviewer_role,
         rating, response_time_rating, accuracy_rating, comment, review_type, created_at)
        VALUES (%s, %s,
                (SELECT COALESCE(username, email) FROM admins WHERE id = %s),
                %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (review_id) DO NOTHING
    """, (review_id, admin_id, admin_id, reviewer, role, rating, resp_time, accuracy, comment, rev_type, datetime.now(timezone.utc)))

conn.commit()
print(f"\n✅ Added {len(test_reviews)} test reviews")

# Verify they were added
cursor.execute("SELECT COUNT(*) FROM admin_reviews WHERE admin_id = 1")
count = cursor.fetchone()[0]
print(f"✅ Total reviews for admin_id=1: {count}")

cursor.close()
conn.close()
```

### Using SQL Directly
```sql
-- Connect to database
psql -U astegni_user -d astegni_db

-- Check existing admins
SELECT id, username, email FROM admins LIMIT 5;

-- Add test reviews (change admin_id as needed)
INSERT INTO admin_reviews
(review_id, admin_id, admin_name, reviewer_name, reviewer_role,
 rating, response_time_rating, accuracy_rating, comment, review_type, created_at)
VALUES
('REV-TEST-001', 1, 'Test Admin', 'Sarah Johnson', 'Department Head',
 5.0, 5.0, 5.0, 'Outstanding performance on tutor verification!',
 'tutor_management', NOW()),

('REV-TEST-002', 1, 'Test Admin', 'Michael Chen', 'Senior Admin',
 4.7, 5.0, 4.5, 'Very quick response time on document processing.',
 'tutor_management', NOW()),

('REV-TEST-003', 1, 'Test Admin', 'Alem Tesfaye', 'Supervisor',
 4.5, 4.3, 4.7, 'Consistent and reliable work ethic.',
 'general', NOW());

-- Verify
SELECT review_id, reviewer_name, rating, comment
FROM admin_reviews
WHERE admin_id = 1;
```

## Step 6: Verify Everything Works

### Dashboard Panel
1. Navigate to manage-tutor-documents.html
2. Scroll to "Recent Reviews" section
3. **Expected:** 3 most recent reviews displayed with:
   - Color-coded left border (green/blue/yellow based on rating)
   - Star ratings
   - Reviewer name and role
   - Comment text
   - Relative time ("3 days ago")

### Reviews Panel
1. Click "My Reviews" in sidebar
2. **Expected Stats Cards:**
   - Total Reviews: Shows count
   - Average Rating: Shows decimal (e.g., 4.7)
   - Response Time: Shows average
   - Accuracy: Shows average

3. **Expected Reviews List:**
   - All reviews for the admin
   - Detailed view with sub-ratings
   - Sorted by date (newest first)

### Empty State
1. Test with admin_id that has no reviews
2. **Expected:**
   - "No reviews yet" message with star icon
   - Stats show 0 values
   - No errors in console

## Common Issues

### ❌ Issue: "Loading reviews..." stays forever
**Fix:**
```javascript
// In browser console:
console.log('Admin ID:', localStorage.getItem('adminId'));
console.log('Token:', localStorage.getItem('token'));
// Make sure both are set
```

### ❌ Issue: Backend returns 500 error
**Fix:**
```bash
# Check if admin_reviews table exists
psql -U astegni_user -d astegni_db -c "\d admin_reviews"

# If not, run migration:
cd astegni-backend
python migrate_admin_reviews.py
```

### ❌ Issue: Reviews show but stats are 0
**Fix:**
```sql
-- Make sure admin_id column has values
SELECT id, admin_id, review_id FROM admin_reviews LIMIT 10;

-- If admin_id is NULL, update it:
UPDATE admin_reviews
SET admin_id = 1
WHERE admin_name = 'YourAdminName';
```

## Success Checklist

- [ ] Backend runs on port 8000
- [ ] Test page loads without errors
- [ ] API endpoints return JSON (even if empty)
- [ ] Dashboard shows reviews or "No reviews yet"
- [ ] Reviews panel sidebar link exists
- [ ] Clicking "My Reviews" loads the panel
- [ ] Stats cards populate with data
- [ ] Reviews display with proper formatting
- [ ] Star ratings render correctly
- [ ] Color-coded borders show based on rating
- [ ] Relative timestamps display ("3 days ago")

## Quick Verification Script

Save as `verify_reviews.py` in astegni-backend:

```python
import psycopg
import requests
from dotenv import load_dotenv
import os

load_dotenv()

# Test database connection
try:
    conn = psycopg.connect(os.getenv("DATABASE_URL", "postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db"))
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM admin_reviews")
    total = cursor.fetchone()[0]
    print(f"✅ Database: {total} total reviews in admin_reviews table")

    cursor.execute("SELECT admin_id, COUNT(*) FROM admin_reviews GROUP BY admin_id ORDER BY admin_id")
    print("\n📊 Reviews per admin:")
    for row in cursor.fetchall():
        print(f"   Admin ID {row[0]}: {row[1]} reviews")

    cursor.close()
    conn.close()
except Exception as e:
    print(f"❌ Database error: {e}")

# Test API endpoints
print("\n🌐 Testing API endpoints...")
try:
    # Test all reviews
    r = requests.get("http://localhost:8000/api/admin-reviews/")
    if r.status_code == 200:
        data = r.json()
        print(f"✅ GET /api/admin-reviews/ - Returns {data['total_count']} reviews")
    else:
        print(f"❌ GET /api/admin-reviews/ - Status {r.status_code}")

    # Test with admin_id filter
    r = requests.get("http://localhost:8000/api/admin-reviews/?admin_id=1")
    if r.status_code == 200:
        data = r.json()
        print(f"✅ GET /api/admin-reviews/?admin_id=1 - Returns {len(data['reviews'])} reviews")
    else:
        print(f"❌ GET /api/admin-reviews/?admin_id=1 - Status {r.status_code}")

    # Test stats
    r = requests.get("http://localhost:8000/api/admin-reviews/stats?admin_id=1")
    if r.status_code == 200:
        data = r.json()
        print(f"✅ GET /api/admin-reviews/stats - Avg rating: {data['average_rating']}")
    else:
        print(f"❌ GET /api/admin-reviews/stats - Status {r.status_code}")

except Exception as e:
    print(f"❌ API error: {e}")
    print("   Make sure backend is running on port 8000")

print("\n✨ Verification complete!")
```

Run with:
```bash
cd astegni-backend
pip install requests  # if not installed
python verify_reviews.py
```

## Next Steps

Once everything works:
1. ✅ Reviews feature is production-ready
2. Consider adding more test data for different scenarios
3. Test with different admin IDs
4. Test empty state (admin with no reviews)
5. Review the full documentation in `MANAGE-TUTOR-DOCUMENTS-REVIEWS-IMPLEMENTATION.md`
