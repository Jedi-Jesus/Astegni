# Credential Types Simplified

## Summary
Simplified the credentials system from 4 types to 3 clearer types.

## Old System (Before)
1. 🎓 Academic Certificate
2. 🏆 Achievement
3. 🎯 Extracurricular Activity
4. 💼 Experience/Work History

## New System (After)
1. 🎓 **Academic Credentials** - Degrees, certificates, diplomas
2. 🏆 **Awards and Honors** - Competition wins, recognitions, achievements
3. 💼 **Experience** - Work history, teaching positions (with years field)

## Changes Made

### 1. Frontend - Modal
**File:** `modals/common-modals/upload-document-modal.html`
- Removed "Extracurricular Activity" option
- Updated labels to new names
- 3 options instead of 4

### 2. Frontend - Tutor Profile
**File:** `profile-pages/tutor-profile.html`
- Updated credentials panel cards (lines 2375-2412)
- Changed "Achievements" → "Awards and Honors"
- Changed "Academic" → "Academic Credentials"
- Updated descriptions for clarity

### 3. Frontend - Student Profile
**File:** `profile-pages/student-profile.html`
- Removed extracurricular card entirely (students don't need it)
- Updated to 2 cards only: Awards and Honors, Academic Credentials
- Changed section IDs from `cred-card-academics` → `cred-card-academic`
- Updated grid IDs and empty states

### 4. Backend - Validation
**File:** `astegni-backend/credentials_endpoints.py`

Updated in 6 locations:
- Line 5: Module docstring
- Line 40: Pydantic model description
- Line 234: Upload endpoint docstring
- Line 248: Upload validation array → `['academic', 'achievement', 'experience']`
- Line 358: Get documents docstring
- Line 374: Get documents validation array
- Line 1462: Unified documents docstring
- Line 1474-1475: Unified validation arrays:
  - Students: `['achievement', 'academic']`
  - Tutors: `['academic', 'achievement', 'experience']`

## Database
**No migration needed!** The `credentials` table already uses `document_type VARCHAR(255)`, so it accepts any string. The validation happens at the application layer (backend endpoints).

## Testing

### Before Testing
**CRITICAL:** Restart backend server:
```bash
cd astegni-backend
python app.py
```

### Test Steps
1. Go to tutor-profile → Credentials panel
2. Click "Upload Credential"
3. Try each type:
   - 🎓 Academic Credentials (e.g., "Bachelor's Degree")
   - 🏆 Awards and Honors (e.g., "Best Teacher Award")
   - 💼 Experience (e.g., "5 years at ABC School")
4. Verify upload succeeds
5. Check credentials panel shows correct category cards

### For Students
1. Go to student-profile → Credentials panel
2. Should see only 2 cards:
   - 🏆 Awards and Honors
   - 🎓 Academic Credentials
3. No "Experience" option in modal (hidden by role-based filtering)

## Benefits
1. **Clearer names** - "Academic Credentials" vs vague "Academic"
2. **Less confusion** - Removed "Extracurricular" (students don't need separate category)
3. **Simpler system** - 3 types instead of 4
4. **Better semantics** - "Awards and Honors" is more professional than "Achievement"

## Next Steps
✅ Backend validation updated
✅ Frontend modal updated
✅ Profile panels updated
⏳ **Restart backend server** ← DO THIS NOW
⏳ Test credential uploads
