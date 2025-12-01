# Test Manage Contents Integration

## Quick Test Checklist

### ✅ Test 1: Profile Header Loads from Database

**Expected:**
- Profile picture and cover image load (or placeholders)
- Admin name shows (not hardcoded "Content Management")
- Badges display correctly
- Rating shows with stars
- Employee ID and joined date display

**How to verify:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for: `"Profile header loaded from database:"` message
4. Should show profile data object

**What to check:**
- `admin_id`, `email`, `username` present
- `contents_profile` object present with stats

### ✅ Test 2: Edit Profile Modal Opens (NOT ALERT)

**Expected:**
- Clicking "Edit Profile" button opens modal (not alert)
- Modal shows form with fields pre-populated
- Fields include: First Name, Father Name, Grandfather Name, Username, Email, Phone, Bio, Quote

**How to verify:**
1. Click "✏️ Edit Profile" button in profile header
2. Modal should appear with form
3. Form fields should have current data

**If alert appears:**
- Check browser console for errors
- Verify `manage-contents-profile-loader.js` loaded before `manage-contents.js`
- Check that placeholder functions were removed from `manage-contents.js`

### ✅ Test 3: Statistics Load from Database

**Expected:**
- Verified Contents: 1,245 (not hardcoded)
- Requested Contents: 48
- Rejected Contents: 87
- Flagged Contents: 12
- Total Storage: 470 GB
- Approval Rate: 93%
- Avg Processing: < 2hrs
- User Satisfaction: 96%

**How to verify:**
1. Open browser DevTools Console
2. Look for database-loaded values in console logs
3. Check if stats match database values

**Database check:**
```sql
SELECT * FROM manage_contents_profile WHERE admin_id = 1;
```

### ✅ Test 4: Reviews Load from Database

**Expected:**
- Shows 8 reviews in "Recent Reviews" section
- Each review has:
  - Reviewer name (e.g., "Marketing Director")
  - Reviewer role (e.g., "Marketing Department")
  - Star rating (★★★★★)
  - Review text
  - Time ago (e.g., "3 days ago")

**How to verify:**
1. Scroll to "Recent Reviews" section in dashboard
2. Should see 8 reviews (not 3 hardcoded ones)
3. Check console for: `"Reviews loaded from database:"`

**Database check:**
```sql
SELECT reviewer_name, rating, comment, created_at
FROM admin_reviews
WHERE admin_id = 1 AND department = 'manage-contents'
ORDER BY created_at DESC;
```

### ✅ Test 5: Reviews Filtered by Department

**Expected:**
- Only shows reviews where `department = 'manage-contents'`
- Does NOT show reviews from other departments

**How to verify:**
1. Check console logs for reviews data
2. Each review should be for manage-contents department

**Add test review with different department:**
```sql
INSERT INTO admin_reviews (
    admin_id, admin_name, department, reviewer_name, reviewer_role,
    rating, comment, created_at, review_id
)
VALUES (
    1, 'Content Manager', 'manage-tutors', 'Test Reviewer', 'Test Role',
    5, 'This should NOT appear on manage-contents page', NOW(), 'TEST-REV-999'
);
```

After adding, refresh page - the test review should NOT appear.

### ✅ Test 6: Edit Profile Updates Database

**Expected:**
- Changes to profile save to database
- Profile header updates after save
- Success alert appears

**How to test:**
1. Click "Edit Profile"
2. Change "First Name" to "TestUpdate"
3. Click "Update Profile"
4. Should see success alert
5. Profile header should update with new name
6. Refresh page - changes should persist

**Database check:**
```sql
SELECT first_name FROM admin_profile WHERE id = 1;
-- Should show "TestUpdate"
```

### ✅ Test 7: Department Access Control

**Expected:**
- Admin with `manage-contents` department: ✅ Access granted
- Admin with `manage-system-settings` department: ✅ Access granted
- Admin without either department: ❌ 403 Error

**How to test:**
1. Remove departments temporarily:
```sql
UPDATE admin_profile
SET departments = ARRAY['some-other-department']
WHERE email = 'test1@example.com';
```

2. Refresh page - should see 403 error in console

3. Restore access:
```sql
UPDATE admin_profile
SET departments = ARRAY['manage-contents', 'manage-system-settings']
WHERE email = 'test1@example.com';
```

## Common Issues & Fixes

### Issue 1: Alert "This will open the profile editing modal" appears

**Problem:** Placeholder function not removed from `manage-contents.js`

**Fix:** The placeholder functions have been removed. Clear browser cache and hard refresh (Ctrl+Shift+R).

**Verify:**
- Check `js/admin-pages/manage-contents.js`
- Should NOT have `openEditProfileModal()` function with alert
- Check browser console - should see real modal opening

### Issue 2: Profile shows hardcoded data

**Problem:** Profile loader not running or API failing

**Fix:**
1. Check browser console for errors
2. Look for API call: `GET /api/admin/manage-contents-profile/by-email/...`
3. Check response status (should be 200)
4. Verify backend is running: http://localhost:8000/docs

**Database check:**
```sql
-- Verify profile exists
SELECT * FROM manage_contents_profile WHERE admin_id = 1;

-- If empty, re-run migration
cd astegni-backend
python migrate_manage_contents_profile.py
```

### Issue 3: Reviews show hardcoded data (only 3 reviews)

**Problem:** Reviews not loading from database

**Fix:**
1. Check console for: `"Reviews loaded from database:"`
2. Check API call: `GET /api/admin/manage-contents-reviews/1`
3. Verify response has 8 reviews

**Database check:**
```sql
SELECT COUNT(*) FROM admin_reviews
WHERE admin_id = 1 AND department = 'manage-contents';
-- Should return 8

-- If 0, re-run seed script
cd astegni-backend
python seed_manage_contents_reviews.py
```

### Issue 4: Statistics show hardcoded numbers

**Problem:** Statistics not updating from database

**Fix:**
1. Check console logs for stats update
2. Verify `updateStatistics()` function is called
3. Check profile API response includes `contents_profile` object

**Database check:**
```sql
SELECT verified_contents, requested_contents, rejected_contents
FROM manage_contents_profile
WHERE admin_id = 1;
```

### Issue 5: 403 Access Denied error

**Problem:** Admin doesn't have required department

**Fix:**
```sql
-- Check current departments
SELECT departments FROM admin_profile WHERE email = 'test1@example.com';

-- Add manage-contents department
UPDATE admin_profile
SET departments = array_append(departments, 'manage-contents')
WHERE email = 'test1@example.com';
```

## Browser Console Commands

### Check if profile loader is loaded:
```javascript
typeof window.openEditProfileModal
// Should return "function"
```

### Check admin ID:
```javascript
console.log(window.currentAdminId);
// Should show: 1
```

### Check admin email:
```javascript
console.log(window.currentAdminEmail);
// Should show: "test1@example.com"
```

### Manually trigger profile load:
```javascript
// Open browser console and run:
fetch('http://localhost:8000/api/admin/manage-contents-profile/by-email/test1@example.com')
    .then(r => r.json())
    .then(d => console.log(d));
```

### Manually trigger reviews load:
```javascript
fetch('http://localhost:8000/api/admin/manage-contents-reviews/1')
    .then(r => r.json())
    .then(d => console.log(d));
```

## Success Criteria

All of these should be ✅:
- [ ] Profile header loads from database (check console)
- [ ] Edit Profile button opens modal (not alert)
- [ ] Modal pre-populates with current data
- [ ] Statistics show database values (1,245, 48, 87, 12, etc.)
- [ ] Reviews section shows 8 reviews from database
- [ ] Reviews filtered by `department = 'manage-contents'`
- [ ] Saving profile updates database and refreshes UI
- [ ] No JavaScript errors in console
- [ ] No 403 errors in network tab
- [ ] Changes persist after page refresh

## Test Script Output

When page loads, you should see in console:
```
Manage Contents Profile Loader initialized
Loading profile for admin: test1@example.com
Profile header loaded from database: {admin_id: 1, email: "test1@example.com", ...}
Reviews loaded from database: [{reviewer_name: "Marketing Director", ...}, ...]
```

## Final Verification

Run this comprehensive check:

```bash
# Backend running?
curl http://localhost:8000/

# Profile endpoint working?
curl http://localhost:8000/api/admin/manage-contents-profile/by-email/test1@example.com

# Reviews endpoint working?
curl http://localhost:8000/api/admin/manage-contents-reviews/1

# Database has data?
psql -U astegni_user -d astegni_db -c "SELECT * FROM manage_contents_profile WHERE admin_id = 1;"
psql -U astegni_user -d astegni_db -c "SELECT COUNT(*) FROM admin_reviews WHERE admin_id = 1 AND department = 'manage-contents';"
```

All checks should pass with valid data!
