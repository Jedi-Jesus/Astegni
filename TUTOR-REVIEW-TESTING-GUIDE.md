# Tutor Review System - Testing Guide

## Quick Start Testing

### Step 1: Run Database Migration

```bash
cd astegni-backend
python migrate_tutor_verification.py
```

**Expected Output:**
```
Adding verification fields to tutor_profiles table...
✓ Added verification_status column
✓ Added rejection_reason column
✓ Added verified_at column
✓ Added verified_by column
✓ Added id_document_url column
✓ Updated existing verified tutors

✅ Migration completed successfully!
```

### Step 2: Start Backend Server

```bash
cd astegni-backend
python app.py
```

Server should start on `http://localhost:8000`

### Step 3: Start Frontend Server

```bash
# From project root (new terminal)
python -m http.server 8080
```

Frontend accessible at `http://localhost:8080`

### Step 4: Login as Admin

1. Navigate to `http://localhost:8080/admin-pages/manage-tutors.html`
2. Ensure you're logged in with an admin account
3. If not admin, update user roles in database:

```sql
-- Add admin role to your user
UPDATE users SET roles = '["admin"]' WHERE id = YOUR_USER_ID;
```

### Step 5: Test the Review Flow

#### A. Open Review Modal
1. Click on "Tutor Requests" in sidebar
2. Click "Review" button on any pending tutor
3. **Expected:** Modal opens with tutor details

#### B. Verify Modal Content Shows:
- ✅ Profile picture (or placeholder)
- ✅ Tutor name
- ✅ Teaches at institution
- ✅ Location
- ✅ ID document (or "not uploaded" message)
- ✅ Email and phone
- ✅ Experience and education
- ✅ Subjects/courses
- ✅ Languages
- ✅ Bio

#### C. Test Approval Flow
1. Click **"Approve"** button
2. **Expected:** Confirmation dialog appears
3. Confirm approval
4. **Expected:**
   - Success notification
   - Modal closes
   - Tutor removed from pending list

**Verify in Database:**
```sql
SELECT id, is_verified, verification_status, verified_at, verified_by
FROM tutor_profiles
WHERE id = TUTOR_ID;
```

Should show:
- `is_verified` = `true`
- `verification_status` = `'verified'`
- `verified_at` = timestamp
- `verified_by` = your admin user ID

#### D. Test Rejection Flow
1. Click **"Review"** on another pending tutor
2. Click **"Reject"** button
3. **Expected:**
   - Textarea appears for rejection reason
   - "Reject" button becomes "Confirm Rejection"
4. Enter rejection reason (e.g., "ID document not clear")
5. Click **"Confirm Rejection"**
6. **Expected:** Confirmation dialog
7. Confirm rejection
8. **Expected:**
   - Info notification
   - Modal closes
   - Tutor removed from pending list

**Verify in Database:**
```sql
SELECT id, is_verified, verification_status, rejection_reason, verified_by
FROM tutor_profiles
WHERE id = TUTOR_ID;
```

Should show:
- `is_verified` = `false`
- `verification_status` = `'rejected'`
- `rejection_reason` = your entered reason
- `verified_by` = your admin user ID

#### E. Test Validation
1. Click **"Review"** on a tutor
2. Click **"Reject"**
3. **Don't enter any reason**
4. Click **"Confirm Rejection"**
5. **Expected:** Error notification "Please provide a reason for rejection"

#### F. Test Modal Close
1. Open review modal
2. Press **ESC** key
3. **Expected:** Modal closes

---

## API Testing with cURL

### 1. Get Auth Token First

```bash
# Login to get token
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_admin_username",
    "password": "your_password"
  }'
```

Copy the `access_token` from response.

### 2. Get Pending Tutors

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/admin/tutors/pending
```

**Expected Response:**
```json
{
  "tutors": [...],
  "total": 8,
  "page": 1,
  "limit": 15,
  "total_pages": 1
}
```

### 3. Get Tutor Review Details

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/admin/tutor/5/review
```

**Expected Response:** Full tutor object with all fields.

### 4. Approve Tutor

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/admin/tutor/5/verify
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tutor verified successfully",
  "tutor_id": 5,
  "verification_status": "verified"
}
```

### 5. Reject Tutor

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test rejection reason"}' \
  http://localhost:8000/api/admin/tutor/6/reject
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tutor rejected",
  "tutor_id": 6,
  "verification_status": "rejected",
  "rejection_reason": "Test rejection reason"
}
```

---

## Error Testing

### 1. Non-Admin Access
Try accessing endpoints without admin role.

**Expected:** `403 Forbidden` with message "Admin access required"

### 2. Invalid Tutor ID
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/admin/tutor/99999/review
```

**Expected:** `404 Not Found` with message "Tutor not found"

### 3. Rejection Without Reason
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"reason": ""}' \
  http://localhost:8000/api/admin/tutor/6/reject
```

**Expected:** `400 Bad Request` with message "Rejection reason is required"

### 4. No Authentication
```bash
curl http://localhost:8000/api/admin/tutors/pending
```

**Expected:** `401 Unauthorized`

---

## Browser Console Testing

Open browser DevTools (F12) and run:

```javascript
// Test review modal opening
reviewTutorRequest(5);

// Test approval (must have modal open)
approveTutor();

// Test rejection flow
showRejectReason();
document.getElementById('rejection-reason-input').value = "Test reason";
confirmRejectTutor();

// Test modal close
closeTutorReviewModal();
```

---

## Database Verification Queries

### Check verification status distribution
```sql
SELECT verification_status, COUNT(*) as count
FROM tutor_profiles
GROUP BY verification_status;
```

### See recent verifications
```sql
SELECT
  tp.id,
  u.first_name || ' ' || u.father_name as name,
  tp.verification_status,
  tp.verified_at,
  tp.verified_by
FROM tutor_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.verified_at IS NOT NULL
ORDER BY tp.verified_at DESC
LIMIT 10;
```

### Check rejected tutors with reasons
```sql
SELECT
  tp.id,
  u.first_name || ' ' || u.father_name as name,
  tp.rejection_reason,
  tp.verified_by
FROM tutor_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.verification_status = 'rejected';
```

---

## Performance Testing

### Load Test - Multiple Tutors
Create test data with multiple pending tutors and verify:
- Modal loads quickly (< 500ms)
- Approval/rejection completes in < 1 second
- No memory leaks when opening/closing modal multiple times

### Pagination Test
If you have 20+ pending tutors:
- Test pagination works correctly
- Verify `page` and `limit` parameters work
- Check `total_pages` calculation

---

## Common Issues & Solutions

### Issue: "Admin access required"
**Fix:** Add admin role to user
```sql
UPDATE users SET roles = '["admin"]' WHERE id = YOUR_ID;
```

### Issue: Modal doesn't open
**Check:**
1. Is `tutor-review.js` loaded? (Check Network tab)
2. Any console errors?
3. Is tutor ID valid?

### Issue: Profile picture not showing
**Check:** Tutor has uploaded profile_picture to their profile

### Issue: ID document not showing
**Expected:** Many tutors won't have ID uploaded yet. System shows placeholder.

### Issue: Changes not reflected
**Fix:** Clear browser cache or do hard refresh (Ctrl+Shift+R)

---

## Checklist for Production

Before deploying to production:

- [ ] Database migration completed successfully
- [ ] All API endpoints tested with Postman/cURL
- [ ] Modal UI displays correctly on different screen sizes
- [ ] Approval flow works end-to-end
- [ ] Rejection flow works with validation
- [ ] Error messages are user-friendly
- [ ] ESC key closes modal
- [ ] Confirmation dialogs prevent accidental actions
- [ ] Notifications appear and disappear correctly
- [ ] Admin role checking works properly
- [ ] Database queries return correct data
- [ ] No console errors in browser
- [ ] Server logs show no errors

---

## Success Criteria

✅ **Complete Success** when:
1. Admin can view all pending tutors
2. Review modal opens with complete tutor information
3. Approve button verifies tutor in database
4. Reject button requires reason and updates status
5. Modal closes properly after actions
6. Database shows correct verification_status values
7. No errors in console or server logs

---

## Next Steps After Testing

If all tests pass:
1. ✅ Mark feature as production-ready
2. 📝 Document any discovered edge cases
3. 🎓 Train admin users on the workflow
4. 📧 Consider adding email notifications (future enhancement)
5. 📊 Set up monitoring for verification metrics

**Feature is ready for production use!** 🎉
