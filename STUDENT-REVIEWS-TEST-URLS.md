# Student Reviews - Test URLs

## ✅ Students with Reviews (Use These!)

These student users have reviews and will work correctly:

### User ID 96 (Michael) - 4 reviews
**URL:** http://localhost:8080/view-profiles/view-student.html?id=96

**Details:**
- User ID: 96
- Email: michael@example.com
- Student Profile ID: 24
- Total Reviews: 4 (3 from tutors, 1 from parent)

### User ID 95 (Helen) - 4 reviews
**URL:** http://localhost:8080/view-profiles/view-student.html?id=95

**Details:**
- User ID: 95
- Email: helen@example.com
- Student Profile ID: 23
- Total Reviews: 4 (3 from tutors, 1 from parent)

### User ID 97 (Ruth) - 3 reviews
**URL:** http://localhost:8080/view-profiles/view-student.html?id=97

**Details:**
- User ID: 97
- Email: ruth@example.com
- Student Profile ID: 25
- Total Reviews: 3 (3 from tutors)

---

## Other Students (No Reviews Yet)

These students exist but don't have reviews:

- User ID 93 (tigist@example.com) - Student Profile ID 21
- User ID 94 (dawit@example.com) - Student Profile ID 22
- User ID 98 (student@example.com) - Student Profile ID 26
- User ID 112 (admin_test@astegni.com) - Student Profile ID 27
- User ID 115 (jediael.s.abebe@gmail.com) - Student Profile ID 28

---

## Testing Flow

### Step 1: Open a Student Profile
```
http://localhost:8080/view-profiles/view-student.html?id=96
```

### Step 2: Browser Console Should Show
```
Converted user_id 96 to student_profile_id 24
Loaded 4 reviews for student profile 24
```

### Step 3: Verify Dashboard
- ✅ See "Recent Feedback from Tutors & Parents" section
- ✅ 2-column grid with review cards
- ✅ Profile pictures visible
- ✅ Clickable names (blue/colored links)
- ✅ Star ratings (★★★★★)
- ✅ Rating badges (Understanding, Discipline, etc.)

### Step 4: Verify Behavioral Notes Panel
- ✅ Click "Behavioral Notes" in sidebar
- ✅ See "Subject Understanding" category
- ✅ See review cards with profile pictures
- ✅ Clickable names

---

## API Testing

### Convert User ID to Student Profile ID
```bash
curl http://localhost:8000/api/student/user/96/profile-id
```

**Expected:**
```json
{
  "student_profile_id": 24,
  "user_id": 96
}
```

### Get Reviews for Student
```bash
curl http://localhost:8000/api/student/24/reviews?limit=5
```

**Expected:** Array of reviews with reviewer info

---

## Review Sample Data

### Sample Review Structure
```json
{
  "id": 4,
  "student_id": 24,
  "reviewer_id": 65,
  "reviewer_role": "tutor",
  "reviewer_name": "Tewodros Kidane",
  "reviewer_profile_picture": null,
  "subject_understanding": 5.0,
  "discipline": 4.5,
  "punctuality": 5.0,
  "participation": 5.0,
  "attendance": 5.0,
  "overall_rating": 4.9,
  "review_title": "Outstanding Participation in Class",
  "review_text": "Always engaged and asks thoughtful...",
  "review_type": "positive",
  "created_at": "2025-10-20T23:51:36.669531",
  "is_featured": true,
  "helpful_count": 16
}
```

---

## Database Quick Check

### Check which students have reviews
```bash
cd astegni-backend
python -c "
import psycopg
conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db')
cur = conn.cursor()
cur.execute('''
    SELECT sr.student_id, sp.user_id, COUNT(*) as review_count
    FROM student_reviews sr
    JOIN student_profiles sp ON sr.student_id = sp.id
    GROUP BY sr.student_id, sp.user_id
    ORDER BY review_count DESC
''')
print('Students with reviews:')
for row in cur.fetchall():
    print(f'  Student Profile ID {row[0]} (User ID {row[1]}): {row[2]} reviews')
conn.close()
"
```

---

## Common Issues

### Issue 1: "Student profile not found" (404 error)
**Cause:** The user ID doesn't have a student profile
**Solution:** Use one of the working user IDs: 96, 95, or 97

### Issue 2: No reviews showing
**Cause:** Student doesn't have reviews yet
**Solution:** Use user ID 96, 95, or 97 (these have reviews seeded)

### Issue 3: Schedule error (500 error)
**Cause:** Unrelated issue with tutor_schedules table
**Impact:** Doesn't affect student reviews feature
**Note:** Schedule feature uses different table structure

---

## Quick Reference

**Working Test URLs:**
```
✅ http://localhost:8080/view-profiles/view-student.html?id=96  (4 reviews)
✅ http://localhost:8080/view-profiles/view-student.html?id=95  (4 reviews)
✅ http://localhost:8080/view-profiles/view-student.html?id=97  (3 reviews)
```

**Not Working:**
```
❌ http://localhost:8080/view-profiles/view-student.html?id=26  (user doesn't exist)
❌ http://localhost:8080/view-profiles/view-student.html?id=98  (no reviews)
```

---

## Status

✅ **Student Reviews System: Working**
- Database structure: ✅ Fixed
- API endpoints: ✅ Working
- Frontend: ✅ Updated
- Sample data: ✅ Seeded

⚠️ **Unrelated Issue: Schedule Feature**
- `tutor_schedules` table structure different
- Not related to student reviews
- Can be addressed separately

---

**Use User IDs 96, 95, or 97 for testing!** 🎉
