# Quick Test: Verification Flow

## 🚀 Start Servers

```bash
# Terminal 1 - Backend
cd astegni-backend
python app.py

# Terminal 2 - Frontend
cd ..
python -m http.server 8080
```

## 🧪 Test All Three Forms

### 1. Access Tutor Profile
```
http://localhost:8080/profile-pages/tutor-profile.html
```

### 2. Login as Tutor
Use any tutor account from your database

### 3. Test Achievement Form

**Steps:**
1. Click "Achievements" panel
2. Click "Add Achievement" button
3. Fill out form:
   - Title: "Best Teacher Award 2024"
   - Category: "award"
   - Year: 2024
   - Issuer: "Addis Ababa University"
   - Upload certificate (JPG/PNG/PDF, max 5MB)
4. Click Submit
5. ✅ **Verify:** "Verification Fee Modal" appears (90 ETB)
6. Click "Confirm & Pay 90 ETB"
7. ✅ **Verify:** "Verification Success Modal" appears
8. ✅ **Verify:** Achievement appears in list with pending status

**Expected Console Log:**
```
Uploading achievement with verification fee paid...
Achievement added successfully: {verification_status: 'pending'}
```

### 4. Test Certification Form

**Steps:**
1. Click "Certifications" panel
2. Click "Upload Certification" button
3. Fill out form:
   - Name: "Mathematics Teaching License"
   - Issuing Organization: "Ethiopian Ministry of Education"
   - Field of Study: "Mathematics"
   - Issue Date: 2023-01-15
   - Upload certificate file
4. Click Submit
5. ✅ **Verify:** "Verification Fee Modal" appears (90 ETB)
6. Click "Confirm & Pay 90 ETB"
7. ✅ **Verify:** "Verification Success Modal" appears
8. ✅ **Verify:** Certification appears in list

**Expected Console Log:**
```
Uploading certification with verification fee paid...
certification added successfully: {verification_status: 'pending'}
```

### 5. Test Experience Form

**Steps:**
1. Click "Experience" panel
2. Click "Add Experience" button
3. Fill out form:
   - Job Title: "Senior Mathematics Teacher"
   - Institution: "Addis Ababa High School"
   - Location: "Addis Ababa, Ethiopia"
   - Start Date: 2020-09-01
   - Employment Type: "full-time"
   - Upload employment letter/certificate
4. Click Submit
5. ✅ **Verify:** "Verification Fee Modal" appears (90 ETB)
6. Click "Confirm & Pay 90 ETB"
7. ✅ **Verify:** "Verification Success Modal" appears
8. ✅ **Verify:** Experience appears in timeline

**Expected Console Log:**
```
Uploading experience with verification fee paid...
experience added successfully: {verification_status: 'pending'}
```

## 🔍 Verify Database

```sql
-- Check achievements
SELECT id, title, is_verified, verification_status
FROM tutor_achievements
WHERE verification_status = 'pending'
ORDER BY created_at DESC LIMIT 3;

-- Expected: is_verified=FALSE, verification_status='pending'

-- Check certifications
SELECT id, name, is_verified, verification_status
FROM tutor_certificates
WHERE verification_status = 'pending'
ORDER BY created_at DESC LIMIT 3;

-- Expected: is_verified=FALSE, verification_status='pending'

-- Check experience
SELECT id, job_title, is_verified, verification_status
FROM tutor_experience
WHERE verification_status = 'pending'
ORDER BY created_at DESC LIMIT 3;

-- Expected: is_verified=FALSE, verification_status='pending'
```

## ✅ Success Criteria

### All Three Forms Should:
- [x] Show verification fee modal (90 ETB) BEFORE saving
- [x] Submit to backend only after "Confirm & Pay" click
- [x] Save with `verification_status='pending'`
- [x] Save with `is_verified=FALSE`
- [x] Show verification success modal after save
- [x] Reload data and display new item
- [x] Display item with pending status indicator

### Modal Flow Should Be:
```
Submit Form → Verification Fee Modal → Confirm & Pay → Backend Save → Success Modal → Reload Data
```

## 🐛 Troubleshooting

### Issue: Modal doesn't appear
**Solution:** Check browser console for errors, verify modal IDs:
- `verificationFeeModal` (Line 6208)
- `verificationModal` (Line 6274)

### Issue: "No pending submission found"
**Solution:**
- Check that form data is being stored in global variables
- Verify `pendingAchievementFormData`, `pendingCertificationFormData`, `pendingExperienceFormData`

### Issue: Backend error on save
**Solution:**
- Check migration was run: `python migrate_add_verification_fields.py`
- Verify database has all 5 verification fields

### Issue: Database doesn't have verification fields
**Solution:**
```bash
cd astegni-backend
python migrate_add_verification_fields.py
```

## 📊 Expected API Responses

### POST /api/tutor/achievements
```json
{
  "message": "Achievement added successfully",
  "achievement": {
    "id": 123,
    "title": "Best Teacher Award 2024",
    "category": "award",
    "date_achieved": "2024-01-15",
    "certificate_url": "https://...",
    "verification_status": "pending"
  }
}
```

### POST /api/tutor/certifications
```json
{
  "message": "Certification added successfully",
  "certification": {
    "id": 456,
    "name": "Mathematics Teaching License",
    "issuing_organization": "Ethiopian Ministry of Education",
    "issue_date": "2023-01-15",
    "verification_status": "pending"
  }
}
```

### POST /api/tutor/experience
```json
{
  "message": "Experience added successfully",
  "experience": {
    "id": 789,
    "job_title": "Senior Mathematics Teacher",
    "institution": "Addis Ababa High School",
    "start_date": "2020-09-01",
    "certificate_url": "https://...",
    "verification_status": "pending"
  }
}
```

## 🎉 All Tests Pass?

If all three forms show the verification flow correctly, you're done! The verification system is now:
- ✅ Consistent across all three forms
- ✅ Properly integrated with backend
- ✅ Saving verification status correctly
- ✅ Ready for admin verification workflow
