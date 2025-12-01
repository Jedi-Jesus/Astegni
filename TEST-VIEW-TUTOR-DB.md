# Quick Test Guide: View-Tutor Database Integration

## Quick Start (5 minutes)

### Step 1: Start Backend
```bash
cd astegni-backend
python app.py
```

**Expected output:**
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start Frontend (NEW Terminal)
```bash
cd c:\Users\zenna\Downloads\Astegni-v-1.1
python -m http.server 8080
```

**Expected output:**
```
Serving HTTP on :: port 8080 (http://[::]:8080/) ...
```

### Step 3: Open Browser
```
http://localhost:8080/view-profiles/view-tutor.html?id=1
```

---

## What You Should See

### 1. Hero Section
- ✅ Custom hero title (from database)
- ✅ Custom subtitle (from database)

### 2. Profile Header
- ✅ Tutor full name (Ethiopian 3-part name)
- ✅ Profile picture (if uploaded)
- ✅ Cover image (if uploaded)
- ✅ Star rating with count
- ✅ Location and teaches-at info
- ✅ Contact info (email, phone, experience)
- ✅ Profile grid (teaches at, course type, languages, grade level)
- ✅ Bio paragraph
- ✅ Quote (if available)
- ✅ Social media links (if available)

### 3. Quick Stats (8 Cards)
- ✅ Response Time
- ✅ Completion Rate
- ✅ Active Students
- ✅ Session Format
- ✅ Students Taught
- ✅ Total Sessions
- ✅ Success Rate
- ✅ Connections

### 4. Success Stories Section
- ✅ 4 featured reviews with colored borders
- ✅ Student names and grades
- ✅ 5-star ratings
- ✅ Review text
- ✅ Time posted (relative)

### 5. Reviews Panel (Tab)
- ✅ Review cards with avatars
- ✅ Reviewer names
- ✅ Star ratings
- ✅ Review titles (if available)
- ✅ Review text
- ✅ Verified badges
- ✅ Posted dates

### 6. Certifications Panel (Tab)
- ✅ Certificate cards with colored borders
- ✅ Certificate names (e.g., "PhD in Mathematics")
- ✅ Issuing organizations
- ✅ Descriptions
- ✅ Year ranges (2020-2024)
- ✅ Verified badges

### 7. Experience Panel (Tab)
- ✅ Timeline format
- ✅ Job titles
- ✅ Institutions
- ✅ Locations
- ✅ Date ranges with duration
- ✅ Current position indicator
- ✅ Job descriptions

### 8. Achievements Panel (Tab)
- ✅ Achievement cards in grid
- ✅ Icons (emoji or icon class)
- ✅ Titles (e.g., "Best Tutor Award 2023")
- ✅ Descriptions
- ✅ Years
- ✅ Colored backgrounds

### 9. Videos Panel (Tab)
- ✅ Video grid
- ✅ Thumbnails
- ✅ Video titles
- ✅ Descriptions
- ✅ Duration displays
- ✅ View counts
- ✅ Like counts
- ✅ Play buttons

### 10. Packages Panel (Tab)
- ✅ Package cards
- ✅ Package names
- ✅ Prices in ETB
- ✅ Descriptions
- ✅ Feature lists
- ✅ Select buttons

### 11. Right Sidebar Widgets

#### Success Stories Ticker
- ✅ Rotating success stories
- ✅ Auto-scroll animation
- ✅ From featured reviews

#### Subjects Widget
- ✅ Rotating subjects
- ✅ From tutor courses
- ✅ Auto-scroll animation

#### Pricing Widget
- ✅ Price range (ETB 200-500)
- ✅ Green gradient background
- ✅ "View Packages" button

#### Availability Widget
- ✅ 7 day schedule (Mon-Sun)
- ✅ Status indicators:
  - 🟢 Green = Available
  - 🟠 Amber = Limited
  - 🔴 Red = Booked
  - ⚪ Gray = Unavailable

#### Achievements Widget
- ✅ 3 featured achievements
- ✅ Large icons
- ✅ Titles
- ✅ Years
- ✅ "View All Achievements" button

---

## Browser Console Check

### Open DevTools (F12 → Console Tab)

**Expected Console Output:**
```
🚀 Initializing View Tutor DB Loader for tutor ID: 1
🔄 Loading tutor profile from database...
✓ Profile loaded: {id: 1, full_name: "...", ...}
✓ Loaded 3 reviews
✓ Loaded 6 achievements
✓ Loaded 3 certificates
✓ Loaded 3 experience records
✓ Loaded 3 videos
✓ Loaded 0 packages
✓ Loaded week availability
✅ All data loaded successfully! {profile: {...}, stats: {...}, ...}
```

**No Errors Should Appear!**

---

## Network Tab Check

### Open DevTools (F12 → Network Tab)

**Expected API Calls (8 total):**
1. `GET /api/view-tutor/1` → Status: 200
2. `GET /api/view-tutor/1/reviews?limit=10` → Status: 200
3. `GET /api/view-tutor/1/achievements` → Status: 200
4. `GET /api/view-tutor/1/certificates` → Status: 200
5. `GET /api/view-tutor/1/experience` → Status: 200
6. `GET /api/view-tutor/1/videos` → Status: 200
7. `GET /api/view-tutor/1/packages` → Status: 200
8. `GET /api/view-tutor/1/availability/week` → Status: 200

**All should return 200 OK!**

---

## Test Different Tutors

Try different tutor IDs to see varied data:

- **Tutor 1:** Math specialist (most complete data)
  ```
  http://localhost:8080/view-profiles/view-tutor.html?id=1
  ```

- **Tutor 2:** Physics specialist
  ```
  http://localhost:8080/view-profiles/view-tutor.html?id=2
  ```

- **Tutor 3:** Chemistry expert
  ```
  http://localhost:8080/view-profiles/view-tutor.html?id=3
  ```

- **Tutors 4-10:** Various subjects
  ```
  http://localhost:8080/view-profiles/view-tutor.html?id=4
  ```

---

## Common Issues & Solutions

### Issue 1: "Failed to load tutor profile"
**Cause:** Backend not running or wrong URL

**Solution:**
```bash
# Check backend is running
curl http://localhost:8000/api/view-tutor/1

# Should return JSON, not error
```

### Issue 2: Blank sections
**Cause:** Seed data not loaded

**Solution:**
```bash
cd astegni-backend
python seed_view_tutor_data.py
```

### Issue 3: CORS errors
**Cause:** Frontend and backend on different ports

**Solution:**
- Backend should be on http://localhost:8000
- Frontend should be on http://localhost:8080
- CORS is already configured in app.py

### Issue 4: 404 Not Found on API calls
**Cause:** Endpoints not registered

**Solution:**
```bash
# Restart backend to reload app.py
cd astegni-backend
# Stop with Ctrl+C
python app.py
```

---

## Manual API Testing (Optional)

### Test Endpoints Directly:

```bash
# 1. Main profile
curl http://localhost:8000/api/view-tutor/1

# 2. Reviews
curl http://localhost:8000/api/view-tutor/1/reviews

# 3. Achievements
curl http://localhost:8000/api/view-tutor/1/achievements

# 4. Certificates
curl http://localhost:8000/api/view-tutor/1/certificates

# 5. Experience
curl http://localhost:8000/api/view-tutor/1/experience

# 6. Videos
curl http://localhost:8000/api/view-tutor/1/videos

# 7. Packages
curl http://localhost:8000/api/view-tutor/1/packages

# 8. Week Availability
curl http://localhost:8000/api/view-tutor/1/availability/week
```

**All should return JSON data!**

---

## Database Verification (Optional)

```sql
-- Connect to database
psql postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db

-- Check tutor exists
SELECT id, username FROM tutor_profiles LIMIT 5;

-- Check achievements
SELECT COUNT(*) FROM tutor_achievements;

-- Check certificates
SELECT COUNT(*) FROM tutor_certificates;

-- Check experience
SELECT COUNT(*) FROM tutor_experience;

-- Check videos
SELECT COUNT(*) FROM tutor_videos;
```

**Expected counts:**
- Achievements: 20
- Certificates: 11
- Experience: 10
- Videos: 10

---

## Success Checklist

Use this checklist to verify everything is working:

- [ ] Backend started without errors
- [ ] Frontend server running
- [ ] Page loads without JavaScript errors
- [ ] Console shows "All data loaded successfully!"
- [ ] Hero section displays custom title
- [ ] Profile header shows tutor name
- [ ] Star rating displays correctly
- [ ] Quick stats show 8 cards with data
- [ ] Success stories section populated (4 stories)
- [ ] Reviews panel shows reviews when clicked
- [ ] Certifications panel shows certificates
- [ ] Experience panel shows timeline
- [ ] Achievements panel shows grid of achievements
- [ ] Videos panel shows video cards
- [ ] Packages panel shows pricing packages (if available)
- [ ] Right sidebar widgets populated:
  - [ ] Success stories ticker animating
  - [ ] Subjects ticker animating
  - [ ] Pricing widget shows price range
  - [ ] Availability widget shows 7 days
  - [ ] Achievements widget shows 3 featured
- [ ] All 8 API calls return 200 OK
- [ ] No network errors in console
- [ ] Can switch between different tutor IDs

---

## Next Steps After Testing

Once testing is successful:

1. **Add More Tutors:**
   - Modify seed script to add more tutors
   - Re-run: `python seed_view_tutor_data.py`

2. **Customize Data:**
   - Edit seed_view_tutor_data.py
   - Add your own achievements, certificates, etc.

3. **Add Real Tutor Data:**
   - Use admin panel to add real tutors
   - Upload actual videos and certificates

4. **Enhance UI:**
   - Add animations
   - Improve styling
   - Add modals for video playback

5. **Deploy to Production:**
   - Configure production database
   - Set up proper file storage (Backblaze B2)
   - Configure environment variables

---

## Quick Reference

**Backend URL:** http://localhost:8000
**Frontend URL:** http://localhost:8080
**View Tutor Page:** http://localhost:8080/view-profiles/view-tutor.html?id=1
**API Docs:** http://localhost:8000/docs

**Files Modified:**
- `view-profiles/view-tutor.html` (added script tag)
- `astegni-backend/app.py` (registered router)

**Files Created:**
- `migrate_create_tutor_extended_tables.py`
- `seed_view_tutor_data.py`
- `view_tutor_endpoints.py`
- `js/view-tutor/view-tutor-db-loader.js`

**Database Tables:**
- `tutor_achievements`
- `tutor_certificates`
- `tutor_experience`
- `tutor_videos`

---

## Support

If you encounter issues:

1. Check this guide first
2. Review the main documentation: `VIEW-TUTOR-DB-INTEGRATION-COMPLETE.md`
3. Check browser console for errors
4. Check backend logs for Python errors
5. Verify database has seeded data

**Happy Testing! 🎉**
