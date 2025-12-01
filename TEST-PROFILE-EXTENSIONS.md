# Testing Tutor Profile Extensions

## Quick Start

### 1. Restart Backend Server

**Stop the current backend:**
```bash
# In the terminal running the backend, press Ctrl+C
# Or kill the Python process manually
```

**Start fresh backend:**
```bash
cd astegni-backend
python app.py
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
[OK] Connected to Backblaze B2 bucket: astegni-media
```

### 2. Verify Endpoints are Registered

Visit: http://localhost:8000/docs

You should see new endpoints:
- `/api/tutor/certifications` (GET, POST)
- `/api/tutor/certifications/{certification_id}` (DELETE)
- `/api/tutor/achievements` (GET, POST)
- `/api/tutor/achievements/{achievement_id}` (DELETE)
- `/api/tutor/experience` (GET, POST)
- `/api/tutor/experience/{experience_id}` (DELETE)

### 3. Test the UI

1. **Start Frontend Server** (if not running):
   ```bash
   python -m http.server 8080
   ```

2. **Login as Tutor**:
   - Go to http://localhost:8080
   - Click "Login"
   - Use tutor credentials (or register as tutor)

3. **Navigate to Tutor Profile**:
   - Click your profile picture
   - Or go directly to: http://localhost:8080/profile-pages/tutor-profile.html

4. **Test Certifications Panel**:
   - Click "🎓 Certifications" in sidebar
   - Click "📤 Upload Certification" button
   - Fill the form:
     ```
     Certification Name: Teaching English as a Foreign Language (TEFL)
     Issuing Organization: Cambridge Assessment English
     Issue Date: 2023-06-15
     Certificate Type: certification
     Field of Study: English Language Teaching
     Description: 120-hour TEFL certification
     ```
   - Click "Upload Certification"
   - You should see success message and certification appears in grid

5. **Test Achievements Panel**:
   - Click "🏆 Achievements" in sidebar
   - Click "➕ Add Achievement" button
   - Fill the form:
     ```
     Achievement Title: Teacher of the Year 2024
     Category: award
     Icon: 🏆 Trophy
     Color: gold
     Year: 2024
     Issuer: Addis Ababa University
     Description: Awarded for outstanding teaching performance
     ✓ Feature this achievement on my profile
     ```
   - Click "Add Achievement"
   - You should see achievement with gold border and ⭐ FEATURED badge

6. **Test Experience Panel**:
   - Click "💼 Experience" in sidebar
   - Click "➕ Add Experience" button
   - Fill the form:
     ```
     Job Title: Mathematics Teacher
     Institution: Addis Ababa University
     Location: Addis Ababa, Ethiopia
     Employment Type: Full-time
     Start Date: 2020-09-01
     ✓ I currently work here
     Description: Teaching undergraduate mathematics courses
     Key Responsibilities:
     - Lecture delivery for 300+ students
     - Course material development
     - Student assessment and grading
     Achievements:
     - Increased student pass rate by 25%
     - Developed innovative teaching methods
     ```
   - Click "Add Experience"
   - You should see experience with "Current" badge and blue left border

## Troubleshooting

### Issue: Endpoints not found (404)
**Solution:** Backend server needs restart to load new endpoints
```bash
cd astegni-backend
# Stop server (Ctrl+C)
python app.py
```

### Issue: "No token found" error
**Solution:** You need to login first
1. Go to http://localhost:8080
2. Click "Login"
3. Enter credentials or register
4. Return to tutor profile

### Issue: "Not authorized. Tutor role required"
**Solution:** You need tutor role
1. Register a new account
2. Select "Tutor" as role during registration
3. Or add tutor role to existing account via OTP system

### Issue: Modal doesn't open
**Solution:** Check browser console for JavaScript errors
- Press F12 to open DevTools
- Check Console tab for errors
- Verify `profile-extensions-manager.js` is loaded

### Issue: Form submission fails
**Solution:** Check network request
- Press F12 → Network tab
- Submit form
- Check if POST request is sent
- Look at response for error details

## Expected Database Structure

After adding items, verify in database:

```bash
cd astegni-backend
python -c "
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Check certifications
cur.execute('SELECT COUNT(*) FROM tutor_certificates')
print(f'Certifications: {cur.fetchone()[0]}')

# Check achievements
cur.execute('SELECT COUNT(*) FROM tutor_achievements')
print(f'Achievements: {cur.fetchone()[0]}')

# Check experience
cur.execute('SELECT COUNT(*) FROM tutor_experience')
print(f'Experience: {cur.fetchone()[0]}')

conn.close()
"
```

## Sample Data for Testing

### Certification Examples
1. **TEFL Certificate**
   - Name: Teaching English as a Foreign Language
   - Organization: Cambridge Assessment English
   - Type: certification
   - Field: English Language Teaching

2. **Bachelor's Degree**
   - Name: Bachelor of Science in Mathematics
   - Organization: Addis Ababa University
   - Type: degree
   - Field: Mathematics

3. **Teaching License**
   - Name: Professional Teaching License
   - Organization: Ethiopian Ministry of Education
   - Type: license
   - Field: Secondary Education

### Achievement Examples
1. **Award**
   - Title: Teacher of the Year 2024
   - Category: award
   - Icon: 🏆
   - Color: gold
   - Featured: ✓

2. **Milestone**
   - Title: 1000 Students Taught
   - Category: milestone
   - Icon: 🌟
   - Color: purple
   - Featured: ✓

3. **Honor**
   - Title: Dean's List
   - Category: honor
   - Icon: 🎓
   - Color: blue
   - Featured: ✗

### Experience Examples
1. **Current Position**
   - Title: Senior Mathematics Teacher
   - Institution: Addis Ababa University
   - Type: Full-time
   - Start: 2020-09-01
   - Current: ✓

2. **Past Position**
   - Title: Junior Physics Teacher
   - Institution: Jimma University
   - Type: Part-time
   - Start: 2018-01-15
   - End: 2020-08-31
   - Current: ✗

## API Testing with curl

### Get Certifications
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/tutor/certifications
```

### Add Certification
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=TEFL Certificate" \
  -F "issuing_organization=Cambridge" \
  -F "certificate_type=certification" \
  http://localhost:8000/api/tutor/certifications
```

### Get Achievements
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/tutor/achievements
```

### Add Achievement
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Teacher of the Year" \
  -F "category=award" \
  -F "icon=🏆" \
  -F "color=gold" \
  -F "is_featured=true" \
  http://localhost:8000/api/tutor/achievements
```

### Get Experience
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/tutor/experience
```

### Add Experience
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "job_title=Mathematics Teacher" \
  -F "institution=AAU" \
  -F "start_date=2020-09-01" \
  -F "is_current=true" \
  http://localhost:8000/api/tutor/experience
```

## Success Criteria

✅ Backend server starts without errors
✅ New endpoints visible in /docs
✅ Sidebar shows 3 new links (Certifications, Achievements, Experience)
✅ Clicking each link switches to correct panel
✅ Each panel has upload/add button
✅ Modals open when buttons clicked
✅ Forms submit successfully
✅ Items appear in panels after submission
✅ Delete buttons work with confirmation
✅ Data persists in database
✅ No console errors in browser

## Next Steps

After successful testing:
1. Add seed data for demo purposes
2. Implement edit functionality
3. Integrate Backblaze B2 for certificate image uploads
4. Add certifications/achievements to public tutor profile (view-tutor.html)
5. Add sorting/filtering options
6. Implement admin verification system
