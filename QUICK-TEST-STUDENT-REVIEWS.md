# Quick Test Guide - Student Reviews System

## Setup (One-Time)

### 1. Run Database Migration
```bash
cd astegni-backend
python migrate_create_student_reviews.py
```

**Expected output:**
```
Creating student_reviews table...
[SUCCESS] student_reviews table created successfully!

Table structure:
  - id: integer
  - student_id: integer
  - reviewer_id: integer
  ...
```

### 2. Seed Sample Data
```bash
python seed_student_reviews.py
```

**Expected output:**
```
Seeding student reviews...
[SUCCESS] Successfully created 11 student reviews!

Reviews Summary:
  - Parents: 2 reviews (avg rating: 4.8)
  - Tutors: 9 reviews (avg rating: 4.2)
```

## Testing

### Start Backend Server
```bash
cd astegni-backend
python app.py
```

**Expected:** Server starts on `http://localhost:8000`

### Start Frontend Server
```bash
# From project root (new terminal)
python -m http.server 8080
```

**Expected:** Server starts on `http://localhost:8080`

## Test the Features

### 1. View Student Profile
**URL:** `http://localhost:8080/view-profiles/view-student.html?student_id=1`

**What to Test:**

✅ **Dashboard Panel (Recent Feedback Section):**
- Should see 2-column grid layout
- Should display up to 6 feedback cards
- Each card should have:
  - Reviewer profile picture (left side)
  - Review title and overall star rating
  - Reviewer name as clickable link (tutor or parent)
  - Rating badges (Understanding, Discipline, etc.)
  - Review text
  - Relative timestamp ("3 days ago")

✅ **Behavioral Notes Panel:**
- Navigate to "Behavioral Notes" panel
- Check "Behavior Categories" section:
  - Should see "Subject Understanding" (NOT Cooperation/Respect/Leadership)
  - Should show 94% with Excellent badge
- Scroll to "Recent Notes from Tutors & Parents" section
- Should see behavioral note cards with:
  - Reviewer profile picture (top left)
  - Note title and type badge (Positive, Improvement, etc.)
  - Reviewer name as clickable link
  - Star rating (if provided)
  - Note text
  - Timestamp

### 2. Test Profile Picture Display
**Check:**
- ✅ Profile pictures load correctly
- ✅ Pictures are circular (50% border-radius)
- ✅ Pictures have colored borders matching card theme
- ✅ Hover effect: image scales slightly (transform: scale(1.05))
- ✅ If no picture, shows default placeholder

### 3. Test Clickable Names
**Test tutor review:**
- Click on tutor name (should be blue/colored link)
- Should navigate to: `view-tutor.html?id={tutor_profile_id}`
- Should load tutor's profile page

**Test parent review:**
- Click on parent name
- Should navigate to: `view-parent.html?id={parent_profile_id}`
- Should load parent's profile page

### 4. Test Rating Displays
**Check star ratings:**
- ✅ 5-star reviews show: ★★★★★
- ✅ 4-star reviews show: ★★★★☆
- ✅ Partial ratings display correctly

**Check rating badges:**
- ✅ Subject Understanding badge (indigo color)
- ✅ Discipline badge (green color)
- ✅ Punctuality badge (blue color)
- ✅ Participation badge (teal color)
- ✅ Attendance badge (purple color)
- ✅ Each badge shows rating value (e.g., "4.5")

### 5. Test Review Types Color Coding
**Check card colors:**
- ✅ Positive reviews: Green border/accents (#22c55e)
- ✅ Improvement reviews: Blue border/accents (#3b82f6)
- ✅ Neutral reviews: Purple border/accents (#8b5cf6)
- ✅ Concern reviews: Orange border/accents (#f59e0b)

### 6. Test API Endpoints Directly

**Get all reviews for student:**
```bash
curl http://localhost:8000/api/student/1/reviews
```

**Expected:** JSON array of reviews with reviewer info

**Get review statistics:**
```bash
curl http://localhost:8000/api/student/1/reviews/stats
```

**Expected:**
```json
{
  "total_reviews": 11,
  "avg_rating": 4.3,
  "avg_subject_understanding": 4.5,
  "avg_discipline": 4.6,
  ...
  "tutor_reviews": 9,
  "parent_reviews": 2
}
```

**Filter by reviewer role:**
```bash
curl "http://localhost:8000/api/student/1/reviews?reviewer_role=tutor"
```

**Filter by review type:**
```bash
curl "http://localhost:8000/api/student/1/reviews?review_type=positive"
```

## Common Issues & Solutions

### Issue: No reviews loading
**Check:**
1. Backend server running? (`http://localhost:8000`)
2. Student ID in URL? (`?student_id=1`)
3. Browser console for errors (F12)
4. Network tab shows API call? (200 status?)

**Fix:** Check browser console for error messages

### Issue: Profile pictures not showing
**Check:**
1. Image paths correct? (check browser console)
2. Fallback image exists? (`../uploads/system_images/system_profile_pictures/man-user.png`)

**Fix:** Verify reviewer profile pictures in database

### Issue: Links not working
**Check:**
1. Reviewer profile IDs exist in database
2. URLs generated correctly (check browser console log)
3. Target profile pages exist (view-tutor.html, view-parent.html)

**Fix:** Verify reviewer_profile_id in student_reviews table

### Issue: "Loading feedback..." never disappears
**Possible causes:**
1. API endpoint not responding
2. JavaScript error (check console)
3. Student ID not found in database

**Fix:**
```bash
# Check if student exists
psql -U astegni_user -d astegni_db
SELECT id FROM users WHERE id = 1;
```

## Quick Database Checks

**View all reviews:**
```sql
SELECT r.id, r.review_title, r.review_type, r.overall_rating,
       u.email as reviewer_email, r.reviewer_role
FROM student_reviews r
JOIN users u ON r.reviewer_id = u.id
ORDER BY r.created_at DESC;
```

**View reviews for specific student:**
```sql
SELECT * FROM student_reviews WHERE student_id = 1;
```

**Check reviewer profile data:**
```sql
-- Tutor reviews
SELECT sr.*, tp.full_name, tp.profile_picture
FROM student_reviews sr
JOIN tutor_profiles tp ON sr.reviewer_profile_id = tp.id
WHERE sr.reviewer_role = 'tutor';

-- Parent reviews
SELECT sr.*, pp.full_name, pp.profile_picture
FROM student_reviews sr
JOIN parent_profiles pp ON sr.reviewer_profile_id = pp.id
WHERE sr.reviewer_role = 'parent';
```

## Success Criteria

✅ **All features working:**
- [x] Dashboard shows 2-column feedback grid
- [x] Behavioral notes panel shows all reviews
- [x] Profile pictures display correctly
- [x] Reviewer names are clickable links
- [x] Links navigate to correct profile pages
- [x] Star ratings display correctly
- [x] Rating badges show with correct values
- [x] Review types have correct colors
- [x] Timestamps show relative format
- [x] Behavioral categories show "Subject Understanding"
- [x] API endpoints return correct data

## Next Steps After Testing

If all tests pass:
1. ✅ Feature is production-ready
2. ✅ Can be integrated into main workflow
3. ✅ Can add more sample reviews for testing
4. ✅ Can implement optional enhancements (see STUDENT-REVIEWS-IMPLEMENTATION-COMPLETE.md)

If tests fail:
1. Check this guide's troubleshooting section
2. Review browser console errors
3. Check backend logs
4. Verify database data integrity
5. Review STUDENT-REVIEWS-IMPLEMENTATION-COMPLETE.md for configuration details
