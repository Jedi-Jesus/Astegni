# Quick Test Guide - All Changes

## 5-Minute Testing Checklist ✅

### Prerequisites
```bash
# 1. Start backend (Terminal 1)
cd astegni-backend
python app.py

# 2. Serve frontend (Terminal 2 - from project root)
python -m http.server 8080
```

---

## Test 1: Database Migration (30 seconds)

```bash
cd astegni-backend
python migrate_update_tutor_reviews.py
```

**Expected Output:**
```
Starting tutor_reviews table migration...
1. Renaming subject_matter_rating to subject_understanding_rating...
   [OK] Column renamed successfully
2. Removing retention_rating column...
   [OK] Column removed successfully

[SUCCESS] Migration completed successfully!
```

✅ **Pass:** Migration runs without errors

---

## Test 2: Gender Field (1 minute)

1. Open http://localhost:8080/profile-pages/tutor-profile.html
2. Click "Settings" card
3. Click "Verify Personal Info" card
4. ✅ **Look for:** Gender dropdown (Male/Female)
5. Select "Male"
6. Click "Submit for Verification"
7. Reload page
8. Open modal again
9. ✅ **Verify:** Gender is still "Male"

---

## Test 3: Grade Level Multi-Select (1 minute)

1. On tutor-profile.html, click "Edit Profile" button
2. ✅ **Look for:** "Grade Levels" section with "+ Add Grade Level" button
3. Click "+ Add Grade Level" 3 times
4. ✅ **Verify:** 3 dropdowns appear
5. Select:
   - Dropdown 1: "Elementary"
   - Dropdown 2: "Grade 9-10"
   - Dropdown 3: "University Level"
6. Click delete button (🗑️) on Dropdown 2
7. ✅ **Verify:** Only 2 dropdowns remain
8. Click "Save Changes"
9. ✅ **Look for:** "Profile updated successfully!" alert
10. Page reloads
11. Click "Edit Profile" again
12. ✅ **Verify:** "Elementary" and "University Level" are still selected

---

## Test 4: Profile Header (1 minute)

1. Open tutor-profile.html
2. Press F12 (open DevTools Console)
3. ✅ **Look for these logs:**
   ```
   ✅ Profile data loaded: {...}
   ✅ Profile header updated from database
   ```
4. Look at profile name at top
5. ✅ **Verify:** Shows full name (First Father Grandfather)
6. ✅ **Verify:** Shows username as @username

---

## Test 5: Rating Display (1 minute)

1. Still on tutor-profile.html
2. In DevTools Console, ✅ **look for:**
   ```
   ✅ Tutor data loaded for ratings: {...}
   ✅ Rating display updated with 4-factor system
   ```
3. Find the rating section (stars and number)
4. Hover over the stars
5. ✅ **Verify:** Tooltip appears with 4 metrics:
   - Subject Understanding ✅
   - Communication Skills ✅
   - Discipline ✅
   - Punctuality ✅
6. ✅ **Verify:** NO "Retention" rating
7. ✅ **Verify:** Each metric shows a score and progress bar

---

## Test 6: Languages, Locations, Courses (Optional - 1 minute)

1. Click "Edit Profile"
2. ✅ **Test Languages:**
   - Click "+ Add Language"
   - Select "Amharic"
   - Click "+ Add Language" again
   - Select "English"
   - Click delete on one
   - ✅ Verify: Works correctly

3. ✅ **Test Locations:**
   - Click "+ Add Location"
   - Type "Addis Ababa"
   - Click "+ Add Location"
   - Type "Bahir Dar"
   - Click delete on one
   - ✅ Verify: Works correctly

4. ✅ **Test Courses:**
   - Click "+ Add Course"
   - Type "Mathematics"
   - Click "+ Add Course"
   - Type "Physics"
   - Click delete on one
   - ✅ Verify: Works correctly

5. Click "Save Changes"
6. ✅ Verify: All data persists

---

## Visual Checklist

### Edit Profile Modal Should Have:
- [ ] Username field
- [ ] Grade Levels section with + button
- [ ] Languages section with + button
- [ ] Locations section with + button
- [ ] Courses section with + button
- [ ] Course Type dropdown
- [ ] Teaching Method checkboxes
- [ ] Quote textarea
- [ ] About Us textarea
- [ ] Hero Title input
- [ ] Hero Subtitle input
- [ ] Cancel button
- [ ] Save Changes button

### Personal Info Modal Should Have:
- [ ] First Name
- [ ] Father Name
- [ ] Grandfather Name
- [ ] Email
- [ ] Phone Number
- [ ] **Gender dropdown** ← NEW!
- [ ] Teaches At section with + button
- [ ] Cancel button
- [ ] Submit button

### Rating Tooltip Should Have:
- [ ] "Rating Breakdown" header
- [ ] Subject Understanding (NOT Subject Matter) ← CHANGED!
- [ ] Communication Skills
- [ ] Discipline
- [ ] Punctuality
- [ ] NO Retention rating ← REMOVED!

---

## Browser Console Logs (Full Test)

When you open tutor-profile.html and everything works, you should see:

```javascript
✅ Verify Personal Info Modal: JavaScript loaded
✅ openVerifyPersonalInfoModal function available: function
✅ Edit Profile Modal: JavaScript loaded
✅ Profile Header Data Loading: JavaScript loaded
✅ Rating Display Update (4-Factor System): JavaScript loaded

// After page loads:
✅ Profile data loaded: {first_name: "...", ...}
✅ Profile header updated from database
✅ Tutor data loaded for ratings: {avg_metrics: {...}, ...}
✅ Rating display updated with 4-factor system
```

---

## Quick API Test

Test the backend endpoints directly:

```bash
# Get your token (after login)
TOKEN="your_jwt_token_here"

# Test tutor profile endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/tutor/profile

# Response should include:
# {
#   "first_name": "...",
#   "father_name": "...",
#   "grandfather_name": "...",
#   "username": "...",
#   "gender": "male" or "female",
#   "avg_metrics": {
#     "subject_understanding": 4.5,
#     "communication": 4.7,
#     "discipline": 4.8,
#     "punctuality": 4.6
#   },
#   "rating": 4.7,
#   "review_count": 15
# }
```

---

## Troubleshooting

### No logs in console?
- Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear cache and reload

### Gender dropdown not visible?
- Check you're in "Verify Personal Info" modal, NOT "Edit Profile" modal
- Scroll down in the modal

### Grade levels not loading?
- Check console for errors
- Verify user data in localStorage has grade_levels or grades array

### Ratings showing 0.0?
- Tutor needs reviews in tutor_reviews table
- Run seed script to add sample reviews if needed

### Migration already ran error?
- That's OK! It means the migration already completed successfully
- Columns were already renamed/removed

---

## Success Criteria

✅ All tests pass
✅ No errors in browser console
✅ No errors in backend terminal
✅ Data persists after page reload
✅ Rating tooltip shows 4 factors (not 5)
✅ Gender field is in personal-info-modal
✅ Grade levels support multi-select

**Total Testing Time:** ~5-7 minutes

If all tests pass, the implementation is 100% complete and ready for production! 🎉
