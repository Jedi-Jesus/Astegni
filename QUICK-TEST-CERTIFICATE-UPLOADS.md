# Quick Test: Certificate Uploads

## Ready to Test Now!

### 1. Start Backend (if not running)
```bash
cd astegni-backend
python app.py
```

### 2. Start Frontend (if not running)
```bash
# From project root (new terminal)
python -m http.server 8080
```

### 3. Test Achievement Certificate Upload

1. **Open:** http://localhost:8080/profile-pages/tutor-profile.html
2. **Login** as a tutor user
3. **Scroll down** to "Achievements" section
4. **Click** "Add Achievement" button
5. **Verify:**
   - ✅ Form opens
   - ✅ "Upload Certificate/Proof *" field visible
   - ✅ Helper text shows "Accepted formats: JPG, PNG, PDF (Max 5MB)"

6. **Test Validation:**
   - Try clicking "Add Achievement" without selecting file
   - **Expected:** Alert "Please upload a certificate file."

7. **Test Invalid File Type:**
   - Select a .txt or .doc file
   - Click "Add Achievement"
   - **Expected:** Alert "Invalid file type. Please upload JPG, PNG, or PDF only."

8. **Test Valid Upload:**
   - Fill in all fields:
     - Title: "Test Achievement"
     - Category: Award
     - Icon: 🏆
     - Color: Gold
     - Year: 2024
   - Select a valid PDF or JPG file (under 5MB)
   - Click "Add Achievement"
   - **Expected:**
     - ✅ Alert "Achievement added successfully!"
     - ✅ Modal closes
     - ✅ Achievement appears in list

9. **Check Backend Logs:**
   - Should see upload to Backblaze B2
   - Should see database insert

10. **Check Database:**
```bash
# In PostgreSQL
SELECT id, title, certificate_url FROM tutor_achievements ORDER BY created_at DESC LIMIT 1;
```
   - **Expected:** certificate_url contains Backblaze URL

---

### 4. Test Experience Certificate Upload

1. **Scroll down** to "Work Experience" section
2. **Click** "Add Experience" button
3. **Verify:**
   - ✅ Form opens
   - ✅ "Upload Certificate/Letter of Employment *" field visible
   - ✅ Helper text shows "Accepted formats: JPG, PNG, PDF (Max 5MB)"

4. **Test Validation:**
   - Try clicking "Add Experience" without selecting file
   - **Expected:** Alert "Please upload a certificate or letter of employment."

5. **Test Valid Upload:**
   - Fill in all fields:
     - Job Title: "Mathematics Teacher"
     - Institution: "Addis Ababa University"
     - Start Date: 2024-01-01
     - Employment Type: Full-time
   - Select a valid PDF or JPG file (under 5MB)
   - Click "Add Experience"
   - **Expected:**
     - ✅ Alert "Experience added successfully!"
     - ✅ Modal closes
     - ✅ Experience appears in timeline

6. **Check Database:**
```bash
# In PostgreSQL
SELECT id, job_title, certificate_url FROM tutor_experience ORDER BY created_at DESC LIMIT 1;
```
   - **Expected:** certificate_url contains Backblaze URL

---

### 5. API Testing (Optional)

**Test Achievement Endpoint:**
```bash
# Get your auth token first (from browser localStorage or login)
TOKEN="your_token_here"

# Test with a sample PDF
curl -X POST http://localhost:8000/api/tutor/achievements \
  -H "Authorization: Bearer $TOKEN" \
  -F "title=API Test Achievement" \
  -F "category=award" \
  -F "icon=🏆" \
  -F "color=gold" \
  -F "year=2024" \
  -F "certificate_file=@test.pdf"
```

**Expected Response:**
```json
{
  "message": "Achievement added successfully",
  "achievement": {
    "id": 123,
    "title": "API Test Achievement",
    "category": "award",
    "date_achieved": null,
    "certificate_url": "https://s3.eu-central-003.backblazeb2.com/astegni-media/documents/certificates/user_1/..."
  }
}
```

**Test Experience Endpoint:**
```bash
curl -X POST http://localhost:8000/api/tutor/experience \
  -H "Authorization: Bearer $TOKEN" \
  -F "job_title=API Test Job" \
  -F "institution=Test University" \
  -F "start_date=2024-01-01" \
  -F "employment_type=full-time" \
  -F "certificate_file=@letter.pdf"
```

---

## What to Look For

### ✅ Success Indicators:
- Form validation works (prevents invalid files)
- File size validation works (rejects files > 5MB)
- Files upload to Backblaze B2
- Certificate URLs saved to database
- Success messages shown
- Lists refresh with new entries
- Browser console shows no errors
- Backend logs show successful uploads

### ❌ Potential Issues:

**Issue:** "Failed to upload certificate"
- Check `.env` has Backblaze credentials
- Check `backblaze_service.py` is working

**Issue:** Field not visible
- Hard refresh browser (Ctrl+Shift+R)
- Check tutor-profile.html was updated

**Issue:** FormData doesn't include file
- Check input has `name="certificate_file"`
- Check form submission handler

**Issue:** Backend returns 400
- Check backend logs for validation error
- Verify file type and size

---

## Quick Verification Queries

```sql
-- Check achievements with certificates
SELECT
    ta.id,
    ta.title,
    ta.certificate_url,
    u.username
FROM tutor_achievements ta
JOIN tutor_profiles tp ON ta.tutor_id = tp.id
JOIN users u ON tp.user_id = u.id
WHERE ta.certificate_url IS NOT NULL
ORDER BY ta.created_at DESC
LIMIT 5;

-- Check experiences with certificates
SELECT
    te.id,
    te.job_title,
    te.institution,
    te.certificate_url,
    u.username
FROM tutor_experience te
JOIN tutor_profiles tp ON te.tutor_id = tp.id
JOIN users u ON tp.user_id = u.id
WHERE te.certificate_url IS NOT NULL
ORDER BY te.created_at DESC
LIMIT 5;
```

---

## Files to Check

### Frontend:
- `profile-pages/tutor-profile.html` - Upload fields added
- `js/tutor-profile/profile-extensions-manager.js` - Validation added

### Backend:
- `astegni-backend/tutor_profile_extensions_endpoints.py` - Endpoints updated
- `astegni-backend/backblaze_service.py` - Upload service

### Database:
- `tutor_achievements` table - Has `certificate_url` column
- `tutor_experience` table - Has `certificate_url` column

---

## Test Status Checklist

- [ ] Backend server running
- [ ] Frontend server running
- [ ] Logged in as tutor user
- [ ] Achievement modal opens
- [ ] Achievement upload field visible
- [ ] Achievement validation works
- [ ] Achievement upload succeeds
- [ ] Achievement shows in list
- [ ] Experience modal opens
- [ ] Experience upload field visible
- [ ] Experience validation works
- [ ] Experience upload succeeds
- [ ] Experience shows in timeline
- [ ] Files visible in Backblaze B2
- [ ] Database has certificate URLs
- [ ] No console errors

---

## Success!

If all checks pass, the certificate upload feature is working correctly! 🎉

**Next Steps:**
- Use feature in production
- Add more achievements/experiences
- Monitor Backblaze B2 storage usage
- Consider adding file preview feature
