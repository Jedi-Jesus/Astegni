# Tutor Management System - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- PostgreSQL running
- Python 3.x installed
- Backend dependencies installed (`pip install -r requirements.txt`)

---

## Step-by-Step Setup

### 1. Database Migration (30 seconds)

Add verification fields to database:

```bash
cd astegni-backend
python migrate_tutor_verification.py
```

✅ **Expected:** Migration completes with all checkmarks

---

### 2. Seed Test Data (1 minute)

Create 40 tutors across all statuses:

```bash
python seed_tutor_statuses.py
```

✅ **Expected:** Creates 12 pending, 15 verified, 8 rejected, 5 suspended tutors

---

### 3. Add Admin Role to Your User (30 seconds)

```sql
-- Connect to PostgreSQL
psql -d astegni_db

-- Add admin role (replace YOUR_USER_ID)
UPDATE users SET roles = '["admin"]' WHERE id = 1;

-- Verify
SELECT id, username, roles FROM users WHERE id = 1;
```

✅ **Expected:** roles column shows `["admin"]`

---

### 4. Start Backend (10 seconds)

```bash
# Still in astegni-backend directory
python app.py
```

✅ **Expected:** Server starts on `http://localhost:8000`

---

### 5. Start Frontend (10 seconds)

**New terminal:**

```bash
# From project root
cd ..
python -m http.server 8080
```

✅ **Expected:** Server starts on `http://localhost:8080`

---

### 6. Access Admin Panel (10 seconds)

**In your browser:**

1. Go to `http://localhost:8080/admin-pages/manage-tutors.html`
2. Login with your admin credentials
3. You should see the dashboard

---

## ✅ Verification Checklist

### Dashboard Panel
- [ ] Shows statistics for all tutor types
- [ ] Pending count shows 12
- [ ] Verified count shows 15
- [ ] Rejected count shows 8
- [ ] Suspended count shows 5

### Tutor Requests Panel
- [ ] Click "Tutor Requests" in sidebar
- [ ] See 12 tutors in table
- [ ] Each has a "Review" button
- [ ] Click "Review" opens modal

### Review Modal
- [ ] Shows tutor name and details
- [ ] Shows profile picture (or placeholder)
- [ ] Shows ID document section
- [ ] Has "Approve" and "Reject" buttons

### Approval Flow
- [ ] Click "Approve" on a tutor
- [ ] Confirmation dialog appears
- [ ] After confirming, success message shows
- [ ] Tutor removed from pending list

### Rejection Flow
- [ ] Click "Review" on another tutor
- [ ] Click "Reject" button
- [ ] Textarea appears for reason
- [ ] Enter reason: "Test rejection"
- [ ] Click "Confirm Rejection"
- [ ] Success message shows
- [ ] Tutor removed from pending list

### Verified Tutors Panel
- [ ] Click "Verified Tutors" in sidebar
- [ ] See 15 tutors (16 after approval above)
- [ ] Each shows rating stars
- [ ] Profile pictures display

### Rejected Tutors Panel
- [ ] Click "Rejected Tutors" in sidebar
- [ ] See 8 tutors (9 after rejection above)
- [ ] Rejection reasons shown
- [ ] Hover to see full reason

### Suspended Tutors Panel
- [ ] Click "Suspended Tutors" in sidebar
- [ ] See 5 tutors
- [ ] Suspension reasons shown
- [ ] "Reinstate" button available

---

## 🎯 Key Features to Test

### 1. Review Modal (Most Important)
```javascript
// Open any pending tutor
reviewTutorRequest(TUTOR_ID);

// Modal should show:
✓ Profile picture
✓ Name
✓ Institution (teaches_at)
✓ Location
✓ ID document (if uploaded)
✓ Email & Phone
✓ Experience & Education
✓ Subjects & Languages
✓ Bio
```

### 2. Approve Tutor
```javascript
// In modal, click "Approve"
// Confirms: "Are you sure?"
// Result: Tutor verified in database
```

### 3. Reject Tutor
```javascript
// In modal, click "Reject"
// Shows: Rejection reason textarea
// Enter reason and confirm
// Result: Tutor rejected with reason saved
```

---

## 🔍 Troubleshooting

### Problem: "No tutors showing"
**Solution:**
```bash
# Re-seed database
cd astegni-backend
python seed_tutor_statuses.py
```

### Problem: "Admin access required"
**Solution:**
```sql
-- Add admin role
UPDATE users SET roles = '["admin"]' WHERE username = 'YOUR_USERNAME';
```

### Problem: "Modal doesn't open"
**Check:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for JavaScript errors
4. Check if `tutor-review.js` is loaded (Network tab)

### Problem: "API returns 401 Unauthorized"
**Solution:**
- Login again to get fresh token
- Check token in localStorage (DevTools → Application → Local Storage)

---

## 📊 Quick Data Queries

### Check tutor counts
```sql
SELECT verification_status, COUNT(*)
FROM tutor_profiles
GROUP BY verification_status;
```

**Expected:**
```
 verification_status | count
---------------------+-------
 pending             |    12
 verified            |    20
 rejected            |     8
```

### See pending tutors
```sql
SELECT tp.id, u.first_name, u.father_name, tp.teaches_at
FROM tutor_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.verification_status = 'pending'
LIMIT 5;
```

### See rejection reasons
```sql
SELECT u.first_name, tp.rejection_reason
FROM tutor_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.verification_status = 'rejected'
LIMIT 3;
```

---

## 🎓 Tutorial: Approve Your First Tutor

### Step 1: Navigate to Requests
1. Open admin panel: `http://localhost:8080/admin-pages/manage-tutors.html`
2. Click "**Tutor Requests**" in left sidebar

### Step 2: Review Application
1. You'll see 12 pending tutors
2. Click "**Review**" on the first tutor
3. Modal opens with all details

### Step 3: Verify Information
Check these fields:
- ✓ Name looks valid
- ✓ Teaches at a real institution
- ✓ Subjects are appropriate
- ✓ Experience seems reasonable

### Step 4: Approve
1. Click green "**Approve**" button
2. Confirm in dialog: "Yes, approve"
3. Success! Tutor is now verified

### Step 5: Verify in Database
```sql
SELECT is_verified, verification_status, verified_at
FROM tutor_profiles
WHERE id = YOUR_TUTOR_ID;
```

Should show:
- `is_verified`: `true`
- `verification_status`: `verified`
- `verified_at`: Recent timestamp

---

## 📋 API Testing with cURL

### Get your auth token
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "YOUR_USERNAME", "password": "YOUR_PASSWORD"}'
```

Copy the `access_token` from response.

### Test pending tutors endpoint
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/admin/tutors/pending
```

### Test tutor review details
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/admin/tutor/1/review
```

### Approve a tutor
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/admin/tutor/1/verify
```

### Reject a tutor
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test rejection reason"}' \
  http://localhost:8000/api/admin/tutor/2/reject
```

---

## 🎉 Success Criteria

You've successfully set up the system when:

✅ Dashboard shows correct tutor counts
✅ All 4 status panels load data from database
✅ Review modal opens and shows tutor details
✅ You can approve a tutor (moves to Verified panel)
✅ You can reject a tutor (moves to Rejected panel)
✅ Database reflects all changes
✅ No errors in browser console
✅ No errors in backend logs

---

## 📚 Next Steps

### Learn More
- Read [TUTOR-VERIFICATION-SYSTEM.md](TUTOR-VERIFICATION-SYSTEM.md) for complete documentation
- Read [TUTOR-STATUS-PANELS-COMPLETE.md](TUTOR-STATUS-PANELS-COMPLETE.md) for panel details
- Read [TUTOR-REVIEW-TESTING-GUIDE.md](TUTOR-REVIEW-TESTING-GUIDE.md) for comprehensive testing

### Customize
1. Add your own rejection reasons in seed script
2. Modify table columns in `manage-tutors-data.js`
3. Adjust styling in `manage-tutors.html`
4. Add custom filters to API endpoints

### Deploy
1. Update `API_BASE_URL` in JavaScript files
2. Set production environment variables
3. Configure CORS for your domain
4. Set up SSL/HTTPS
5. Deploy backend to cloud server
6. Deploy frontend to CDN/hosting

---

## 🆘 Get Help

### Check These First
1. Backend logs - Look for errors in terminal
2. Browser console - Check for JavaScript errors
3. Network tab - Verify API calls returning 200
4. Database - Run verification queries

### Common Issues
| Problem | Solution |
|---------|----------|
| No data showing | Re-run seed script |
| 401 errors | Login again |
| 403 errors | Add admin role to user |
| Modal won't open | Check browser console for errors |
| Empty tables | Verify API endpoints return data |

---

## ✨ You're Ready!

The complete tutor management system is now set up and running:

- ✅ **40 test tutors** across all statuses
- ✅ **7 API endpoints** for tutor management
- ✅ **Full review workflow** with approval/rejection
- ✅ **4 status panels** with real database data
- ✅ **Production-ready code** with error handling

**Start managing tutors now!** 🎊
