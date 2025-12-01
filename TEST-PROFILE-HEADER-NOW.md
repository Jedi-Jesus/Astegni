# Quick Test Guide - Profile Header Fields

## 🚀 5-Minute Verification Test

### Step 1: Start Servers (2 terminals)

**Terminal 1 - Backend:**
```bash
cd astegni-backend
python app.py
```

**Terminal 2 - Frontend:**
```bash
# From project root
python -m http.server 8080
```

---

### Step 2: Open Tutor Profile

Navigate to:
```
http://localhost:8080/profile-pages/tutor-profile.html
```

---

### Step 3: Open Browser Console (F12)

Look for these ✅ success messages:

```
✅ Full name loaded: Jediael Kush Tesfaye
✅ Username loaded: @jediael_kush
✅ Expertise badge loaded: Expert Educator
✅ Location loaded: Addis Ababa, Ethiopia
✅ Gender loaded: Male
✅ Teaches at loaded: Addis Ababa University
✅ Languages loaded: English, Amharic, Oromo
✅ Teaching method loaded: Online, In-person
✅ Grade level(s) loaded: Grade 9-10, Grade 11-12, University Level
✅ Subjects loaded: Mathematics, Physics, Chemistry
✅ Course type loaded: Academic
```

---

### Step 4: Visual Verification Checklist

Check the profile header displays these fields correctly:

#### Profile Name Section
- [ ] **Full Name** displays: "Jediael Kush Tesfaye"
- [ ] **Username** displays: "@jediael_kush" (below name)
- [ ] **Expertise Badge** displays: "🎓 Expert Educator" (next to name)

#### Profile Header Info Section
- [ ] **Location** displays: "📍 Addis Ababa, Ethiopia"
- [ ] **Gender** displays: "👨 Male" (paired with location)
- [ ] **Teaches At** displays: "🏫 Addis Ababa University"
- [ ] **Languages** displays: "🌐 English, Amharic, Oromo" (paired with teaches at)
- [ ] **Teaching Method** displays: "💻 Online, In-person"
- [ ] **Grade Level** displays: "📚 Grade 9-10, Grade 11-12, University Level" (ALL grades, not just first!)
- [ ] **Subjects** displays: "📖 Mathematics, Physics, Chemistry"
- [ ] **Course Type** displays: "📚 Academic"

#### Rating Section
- [ ] **Overall Rating** displays: "4.8 ⭐" (or similar)
- [ ] **Rating Count** displays: "(25 reviews)" (or similar)
- [ ] **Rating Tooltip** shows breakdown when hovering:
  - Subject Matter: X.X/5.0
  - Communication: X.X/5.0
  - Discipline: X.X/5.0
  - Punctuality: X.X/5.0
  - Overall: X.X/5.0

---

### Step 5: Test Edit Modal

1. **Click "Edit Profile" button**
2. **Verify all fields are populated:**
   - [ ] Username field has value
   - [ ] Location field has value
   - [ ] Teaches At field has value
   - [ ] Course Type dropdown has selection
   - [ ] Teaching Method checkboxes are checked
   - [ ] About Us textarea has content
   - [ ] Grade Levels checkboxes are checked
   - [ ] Subjects checkboxes are checked
   - [ ] Languages checkboxes are checked

3. **Make a test change:**
   - Change username to: `test_tutor_123`
   - Change location to: `Test City, Test Country`
   - Click "Save Changes"

4. **Verify update worked:**
   - [ ] Profile header shows new username: "@test_tutor_123"
   - [ ] Profile header shows new location: "📍 Test City, Test Country"
   - [ ] Console shows: "✅ Profile updated successfully"

5. **Check database (optional):**
   ```sql
   SELECT username, location
   FROM tutor_profiles
   WHERE id = 85;
   ```
   Expected result:
   ```
   username: test_tutor_123
   location: Test City, Test Country
   ```

6. **Restore original values:**
   - Click "Edit Profile" again
   - Change username back to: `jediael_kush`
   - Change location back to: `Addis Ababa, Ethiopia`
   - Click "Save Changes"

---

### Step 6: Test Array Fields (Important!)

#### Test 1: Grade Level Shows ALL Grades
**Check the database:**
```sql
SELECT id, username, grades
FROM tutor_profiles
WHERE id = 85;
```

**Expected:** `["Grade 9-10", "Grade 11-12", "University Level"]`

**Profile Header Should Show:** "Grade 9-10, Grade 11-12, University Level"

**NOT:** "Grade 9-10" (only first element - this was the bug!)

#### Test 2: Subjects from Correct Field
**Check the database:**
```sql
SELECT id, username, courses
FROM tutor_profiles
WHERE id = 85;
```

**Expected:** `["Mathematics", "Physics", "Chemistry"]`

**Profile Header Should Show:** "Mathematics, Physics, Chemistry"

**Field Name:** The backend returns `courses`, not `subjects` (this was fixed!)

---

### Step 7: Test Field Mapping Fixes

These were the bugs that were fixed - verify they work now:

#### Bug 1: Teaching Method Field Name ✅ FIXED
**Before:** Edit modal sent `teaching_method` (wrong!)
**After:** Edit modal sends `sessionFormat` (correct!)

**Test:**
1. Edit profile
2. Change teaching method to: "Online only"
3. Save
4. Check database:
   ```sql
   SELECT sessionFormat FROM tutor_profiles WHERE id = 85;
   ```
   Expected: "Online only"

#### Bug 2: Bio Field Name ✅ FIXED
**Before:** Edit modal sent `about` (wrong!)
**After:** Edit modal sends `bio` (correct!)

**Test:**
1. Edit profile
2. Fill "About Us" with: "Test bio content"
3. Save
4. Check database:
   ```sql
   SELECT bio FROM tutor_profiles WHERE id = 85;
   ```
   Expected: "Test bio content"

#### Bug 3: Location as Single Field ✅ FIXED
**Before:** Used `locations` array (wrong!)
**After:** Uses `location` single field (correct!)

**Test:**
1. Edit profile
2. Change location to: "New City"
3. Save
4. Check database:
   ```sql
   SELECT location FROM tutor_profiles WHERE id = 85;
   ```
   Expected: "New City" (not an array!)

---

## Expected Results Summary

### Console Output (All Green ✅)
```
✅ Full name loaded: Jediael Kush Tesfaye
✅ Username loaded: @jediael_kush
✅ Expertise badge loaded: Expert Educator
✅ Location loaded: Addis Ababa, Ethiopia
✅ Gender loaded: Male
✅ Teaches at loaded: Addis Ababa University
✅ Languages loaded: English, Amharic, Oromo
✅ Teaching method loaded: Online, In-person
✅ Grade level(s) loaded: Grade 9-10, Grade 11-12, University Level
✅ Subjects loaded: Mathematics, Physics, Chemistry
✅ Course type loaded: Academic
```

### No Error Messages
- ❌ **Should NOT see:** "Element #xyz not found"
- ❌ **Should NOT see:** "Field is empty in database" (unless data is actually empty)
- ❌ **Should NOT see:** Any 400/401/500 errors in Network tab

---

## If Something Doesn't Work

### Username Not Showing
- Check: `tutor_profiles.username` column exists in database
- Run: `SELECT username FROM tutor_profiles WHERE id = 85;`
- Element ID: Make sure `#tutorUsername` exists in HTML

### Expertise Badge Not Showing
- Check: `tutor_profiles.expertise_badge` column exists in database
- Run migration: `python migrate_add_expertise_badge_gender.py`
- Element ID: Make sure `#expertise-badge` exists in HTML

### Gender Not Showing
- Check: `users.gender` column has data (NOT in tutor_profiles!)
- Run: `SELECT gender FROM users WHERE id = (SELECT user_id FROM tutor_profiles WHERE id = 85);`
- Element IDs: Make sure `#tutor-gender` and `#gender-icon` exist

### Grade Level Only Shows First Element
- Check console: Should say "Grade level(s) loaded: X, Y, Z"
- If only shows one: The fix didn't apply - check line 11670 in tutor-profile.html
- Should use: `grades.join(', ')` NOT `grades[0]`

### Subjects Not Showing
- Check: Backend returns `courses` field, not `subjects`
- Console should show: "✅ Subjects loaded: ..."
- If empty: Check `tutor_profiles.courses` column has data

### Edit Modal Not Saving
- Check Network tab (F12) for the PUT request
- Look for 200 OK response
- Check payload sent matches backend expectations:
  - `sessionFormat` (not `teaching_method`)
  - `bio` (not `about`)
  - `location` (not `locations`)

---

## Database Quick Queries

**See all profile data:**
```sql
SELECT
    u.first_name,
    u.father_name,
    u.grandfather_name,
    u.gender,
    tp.username,
    tp.expertise_badge,
    tp.location,
    tp.teaches_at,
    tp.sessionFormat,
    tp.grades,
    tp.courses,
    tp.languages,
    tp.course_type,
    tp.bio
FROM users u
JOIN tutor_profiles tp ON tp.user_id = u.id
WHERE tp.id = 85;
```

**Check array columns:**
```sql
SELECT
    username,
    grades,
    jsonb_array_length(grades::jsonb) as grade_count,
    courses,
    jsonb_array_length(courses::jsonb) as course_count,
    languages,
    jsonb_array_length(languages::jsonb) as language_count
FROM tutor_profiles
WHERE id = 85;
```

**Check rating calculation:**
```sql
SELECT
    tp.username,
    ROUND(AVG(tr.rating), 1) as overall_rating,
    ROUND(AVG(tr.subject_understanding_rating), 1) as subject_understanding,
    ROUND(AVG(tr.communication_rating), 1) as communication,
    ROUND(AVG(tr.discipline_rating), 1) as discipline,
    ROUND(AVG(tr.punctuality_rating), 1) as punctuality,
    COUNT(tr.id) as total_reviews
FROM tutor_profiles tp
LEFT JOIN tutor_reviews tr ON tr.tutor_id = tp.id
WHERE tp.id = 85
GROUP BY tp.id, tp.username;
```

---

## Success Criteria

✅ **All 11 fields display correctly in profile header**
✅ **Console shows all green ✅ messages**
✅ **Edit modal populates all fields**
✅ **Edit modal saves successfully**
✅ **Database contains saved values**
✅ **No errors in browser console**
✅ **No errors in Network tab**
✅ **Grade level shows ALL grades (not just first)**
✅ **Subjects read from 'courses' field**
✅ **Teaching method saves as 'sessionFormat'**
✅ **Bio saves as 'bio' (not 'about')**
✅ **Location saves as single field (not array)**

---

**Test Time: ~5 minutes**
**All Tests Pass: Profile header is working correctly!** 🎉
