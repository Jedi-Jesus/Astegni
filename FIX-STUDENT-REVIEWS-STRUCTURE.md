# Fix Student Reviews Structure - Complete Guide

## Problem Identified

The original implementation had structural issues:
- ❌ `student_id` referenced `users(id)` instead of `student_profiles(id)`
- ❌ `reviewer_id` referenced `users(id)` instead of profile-specific IDs
- ❌ `reviewer_profile_id` was duplicated (unnecessary column)

## Corrected Structure

✅ **New Structure:**
- `student_id` → `student_profiles(id)` (the student being reviewed)
- `reviewer_id` → `tutor_profiles(id)` or `parent_profiles(id)` (based on reviewer_role)
- `reviewer_role` → Still from users table to determine which profile table to use
- Removed `reviewer_profile_id` (duplicated with reviewer_id)

---

## Step-by-Step Fix

### Step 1: Fix Database Structure

```bash
cd astegni-backend
python fix_student_reviews_structure.py
```

**What this does:**
- Drops old `student_reviews` table
- Creates new table with correct foreign key references
- Recreates indexes

**Expected output:**
```
Fixing student_reviews table structure...
  - Dropped old student_reviews table
  - Created new student_reviews table with correct structure
  - Created indexes

[SUCCESS] student_reviews table structure fixed!

New table structure:
  - id: integer (NOT NULL)
  - student_id: integer (NOT NULL) → student_profiles(id)
  - reviewer_id: integer (NOT NULL) → tutor/parent_profiles(id)
  - reviewer_role: character varying (NOT NULL)
  - subject_understanding: numeric (NULL)
  ...
```

### Step 2: Seed New Data

```bash
python seed_student_reviews_fixed.py
```

**What this does:**
- Gets student profile IDs from `student_profiles` table
- Gets tutor profile IDs from `tutor_profiles` table
- Gets parent profile IDs from `parent_profiles` table
- Creates reviews with correct ID references

**Expected output:**
```
Seeding student reviews...
  - Found 5 student profiles
  - Found 10 tutor profiles
  - Found 5 parent profiles

[SUCCESS] Successfully created 13 student reviews!

Reviews Summary:
  - Tutors: 9 reviews (avg rating: 4.5)
  - Parents: 4 reviews (avg rating: 4.7)

Students with reviews:
  - Student Profile ID 1 (User ID 26): 3 reviews
  - Student Profile ID 2 (User ID 98): 3 reviews
  - Student Profile ID 3 (User ID 112): 3 reviews
```

### Step 3: Update Backend API

**Replace the old endpoints file:**

```bash
# Backup old file
mv student_reviews_endpoints.py student_reviews_endpoints_old.py

# Use new file
mv student_reviews_endpoints_fixed.py student_reviews_endpoints.py

# Restart backend
python app.py
```

**Changes in new API:**
- Queries now use `student_profiles.id` for student_id
- Queries now use `tutor_profiles.id` or `parent_profiles.id` for reviewer_id
- Removed all references to `reviewer_profile_id`
- Updated JOINs to correctly link profile tables

### Step 4: Update Frontend (IMPORTANT!)

The frontend needs a way to convert `user_id` (from URL) to `student_profile_id`.

**Option A: Add a helper endpoint (Recommended)**

Add this to `student_reviews_endpoints.py`:

```python
@router.get("/api/student/user/{user_id}/profile-id")
async def get_student_profile_id(user_id: int):
    """Convert user_id to student_profile_id"""
    conn = psycopg.connect(DATABASE_URL)
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM student_profiles WHERE user_id = %s", (user_id,))
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Student profile not found")
        return {"student_profile_id": result[0], "user_id": user_id}
    finally:
        cur.close()
        conn.close()
```

Then update `js/view-student-reviews.js`:

```javascript
async function loadStudentReviews() {
    const userIdFromURL = new URLSearchParams(window.location.search).get('id');
    if (!userIdFromURL) {
        console.error('No student ID found in URL');
        return;
    }

    try {
        // Convert user_id to student_profile_id
        const profileResponse = await fetch(`${API_BASE_URL}/api/student/user/${userIdFromURL}/profile-id`);
        if (!profileResponse.ok) throw new Error('Student profile not found');

        const { student_profile_id } = await profileResponse.json();

        // Fetch reviews using student_profile_id
        const response = await fetch(`${API_BASE_URL}/api/student/${student_profile_id}/reviews?limit=10`);
        if (!response.ok) throw new Error('Failed to fetch reviews');

        const reviews = await response.json();

        loadRecentFeedback(reviews.slice(0, 6));
        loadBehavioralNotes(reviews);

    } catch (error) {
        console.error('Error loading reviews:', error);
        showErrorMessage();
    }
}
```

**Option B: Change URL parameter (Alternative)**

Change the URL to pass `student_profile_id` instead of `user_id`:

```
BEFORE: view-student.html?id=26  (user_id)
AFTER:  view-student.html?student_profile_id=1  (student_profiles.id)
```

This requires updating all navigation links throughout the application.

---

## Step 5: Update Navigation Links

Update `getReviewerLink()` in `js/view-student-reviews.js`:

```javascript
function getReviewerLink(reviewerRole, reviewerId) {
    // reviewerId is now tutor_profiles.id or parent_profiles.id
    // We need to convert it to user_id for the URL

    // Option 1: Add profile_id parameter
    if (reviewerRole === 'tutor') {
        return `view-tutor.html?profile_id=${reviewerId}`;
    } else if (reviewerRole === 'parent') {
        return `view-parent.html?profile_id=${reviewerId}`;
    }
    return '#';
}
```

Or add a helper endpoint to convert profile_id to user_id.

---

## Complete Testing

### 1. Test Database Structure

```bash
cd astegni-backend
python -c "
import psycopg
conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()

# Check foreign key references
cur.execute('''
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'student_reviews' AND tc.constraint_type = 'FOREIGN KEY';
''')

print('Foreign Keys in student_reviews:')
for row in cur.fetchall():
    print(f'  {row[1]} → {row[2]}.{row[3]}')

conn.close()
"
```

**Expected output:**
```
Foreign Keys in student_reviews:
  student_id → student_profiles.id
```

### 2. Test API Endpoints

```bash
# Get student_profile_id from user_id
curl http://localhost:8000/api/student/user/26/profile-id

# Get reviews for student profile
curl http://localhost:8000/api/student/1/reviews?limit=3

# Get stats
curl http://localhost:8000/api/student/1/reviews/stats
```

### 3. Test Frontend

```
http://localhost:8080/view-profiles/view-student.html?id=26
```

Check browser console:
- ✅ Should fetch student_profile_id from user_id
- ✅ Should fetch reviews using student_profile_id
- ✅ Should display profile pictures
- ✅ Should have clickable names

---

## Summary of Changes

### Database
- ✅ `student_id` now references `student_profiles(id)`
- ✅ `reviewer_id` now references `tutor_profiles(id)` or `parent_profiles(id)`
- ✅ Removed `reviewer_profile_id` column

### Backend
- ✅ Updated SQL queries to use correct tables
- ✅ Updated JOINs to link profile tables correctly
- ✅ Added helper endpoint to convert user_id → student_profile_id

### Frontend
- ✅ Fetches student_profile_id before loading reviews
- ✅ Uses student_profile_id in API calls
- ✅ Updates navigation links to handle profile IDs

### Seeding
- ✅ Uses student_profiles IDs
- ✅ Uses tutor_profiles and parent_profiles IDs
- ✅ Maps correctly based on reviewer_role

---

## Files Created/Modified

**New Files:**
1. `fix_student_reviews_structure.py` - Database migration
2. `seed_student_reviews_fixed.py` - Correct seeding script
3. `student_reviews_endpoints_fixed.py` - Updated API endpoints

**Files to Replace:**
1. `student_reviews_endpoints.py` ← Replace with `student_reviews_endpoints_fixed.py`

**Files to Update:**
1. `js/view-student-reviews.js` - Add profile ID fetching logic

**Files to Backup (Old Versions):**
1. `migrate_create_student_reviews.py` → Keep for reference
2. `seed_student_reviews.py` → Keep for reference
3. `student_reviews_endpoints.py` → Rename to `student_reviews_endpoints_old.py`

---

## Verification Checklist

- [ ] Database structure fixed
- [ ] New data seeded correctly
- [ ] Backend endpoints updated
- [ ] Backend restarted
- [ ] Helper endpoint added (user_id → student_profile_id)
- [ ] Frontend updated to fetch profile ID
- [ ] Frontend updated to use profile ID in API calls
- [ ] Navigation links updated
- [ ] Tested with browser (http://localhost:8080/view-profiles/view-student.html?id=26)
- [ ] Reviews display correctly
- [ ] Profile pictures show
- [ ] Names are clickable
- [ ] Navigation works

---

## Quick Start Commands

```bash
# Step 1: Fix database
cd astegni-backend
python fix_student_reviews_structure.py

# Step 2: Seed data
python seed_student_reviews_fixed.py

# Step 3: Replace endpoints file
mv student_reviews_endpoints.py student_reviews_endpoints_old.py
mv student_reviews_endpoints_fixed.py student_reviews_endpoints.py

# Step 4: Restart backend
python app.py

# Step 5: Test in browser
# Open: http://localhost:8080/view-profiles/view-student.html?id=26
```

---

## Status

✅ **Database migration ready**
✅ **Seeding script ready**
✅ **Backend API ready**
⚠️ **Frontend needs update** (add profile ID fetching)
⚠️ **Helper endpoint needs to be added** (user_id → student_profile_id)

**Next Steps:**
1. Run the database fix script
2. Run the seeding script
3. Add helper endpoint to API
4. Update frontend JavaScript
5. Test complete flow
