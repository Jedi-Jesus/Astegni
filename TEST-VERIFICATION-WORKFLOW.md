# Quick Test Guide: Verification Workflow

## Prerequisites
1. Backend running: `cd astegni-backend && python app.py`
2. Frontend running: `python -m http.server 8080`
3. Logged in as a tutor user

## Quick Test (5 minutes)

### Test Achievement Flow
```
1. Open: http://localhost:8080/profile-pages/tutor-profile.html
2. Click: "Add Achievement" card
3. Fill form:
   - Title: "Test Achievement"
   - Category: Award
   - Upload: Any image/PDF file
4. Click: "Add Achievement" button

✅ EXPECTED: verificationFeeModal appears with "50 ETB" fee

5. Click: "Confirm & Pay 50 ETB" button

✅ EXPECTED:
   - Fee modal closes
   - verificationModal appears
   - Shows "achievement" in text
   - Shows "Pending Verification" status
   - Shows 3-step timeline

6. Click: "Got it, Thanks!" button

✅ EXPECTED: Modal closes, page shows new achievement with pending badge
```

### Verify in Database
```sql
-- Check achievement was saved with pending status
SELECT
    title,
    verification_status,
    is_verified,
    created_at
FROM tutor_achievements
WHERE tutor_id = (
    SELECT id FROM tutor_profiles WHERE user_id = [your_user_id]
)
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**:
```
title: "Test Achievement"
verification_status: "pending"
is_verified: false
created_at: [current timestamp]
```

### Test Certification Flow (Quick)
```
1. Click: "Upload Certification"
2. Fill: Name + Organization + Upload file
3. Click: "Upload Certification"
4. Verify: Same modal flow as achievement
5. Click: "Confirm & Pay"
6. Verify: Success modal shows "certification"
```

### Test Experience Flow (Quick)
```
1. Click: "Add Work Experience"
2. Fill: Job Title + Institution + Dates + Upload file
3. Click: "Add Experience"
4. Verify: Same modal flow as achievement
5. Click: "Confirm & Pay"
6. Verify: Success modal shows "experience"
```

## Console Commands for Testing

### Check if functions are loaded
```javascript
// Open browser console (F12)
console.log(typeof window.confirmAndPayVerificationFee); // Should output: "function"
console.log(typeof window.openVerificationFeeModal); // Should output: "function"
console.log(typeof window.openVerificationSuccessModal); // Should output: "function"
```

### Manually trigger modal (debugging)
```javascript
// Test fee modal
window.openVerificationFeeModal();

// Test success modal
window.openVerificationSuccessModal('achievement');

// Check pending data
console.log(window.pendingVerificationData);
```

## Common Issues & Solutions

### Issue: Modal doesn't appear
**Solution**: Check console for errors, ensure modal IDs match:
- `verificationFeeModal`
- `verificationModal`

### Issue: "No pending verification data" error
**Solution**: Form submission didn't store data properly. Check:
```javascript
console.log(window.pendingVerificationData);
// Should show: {type: 'achievement', formData: FormData}
```

### Issue: Backend returns 401 error
**Solution**: Token expired, login again:
```javascript
localStorage.getItem('token'); // Check if exists
// If null, logout and login again
```

### Issue: File upload fails
**Solution**: Check file size (5MB max) and type (JPG, PNG, PDF only)

## Success Checklist

- [ ] Achievement modal flow works end-to-end
- [ ] Certification modal flow works end-to-end
- [ ] Experience modal flow works end-to-end
- [ ] Fee modal displays correctly (50 ETB)
- [ ] Success modal displays with correct item type
- [ ] Database saves with `verification_status='pending'`
- [ ] Cancel button clears pending data
- [ ] File validation works (type + size)
- [ ] Error messages display properly
- [ ] No console errors

## Next Steps After Testing

1. **If tests pass**:
   - Document any bugs found
   - Test with different file types/sizes
   - Test with slow network (throttling)

2. **If tests fail**:
   - Check browser console for errors
   - Check network tab for failed requests
   - Check backend logs for errors
   - Verify database migrations ran successfully

3. **Production deployment**:
   - Set up real payment gateway
   - Configure email notifications
   - Create admin review dashboard
   - Add audit logging

## Visual Flow Reference

```
[Form Modal]
    ↓ Submit button
[Verification Fee Modal - 50 ETB]
    ↓ Confirm & Pay
[Loading... Processing payment]
    ↓ Backend save (pending status)
[Success Modal - Pending Verification]
    ↓ Got it, Thanks!
[Back to profile - Item shown with pending badge]
```

## Database Queries for Verification

### Check all pending items for a tutor
```sql
-- Achievements
SELECT 'achievement' as type, title as name, verification_status, created_at
FROM tutor_achievements
WHERE tutor_id = [tutor_id] AND verification_status = 'pending'

UNION ALL

-- Certifications
SELECT 'certification' as type, name, verification_status, created_at
FROM tutor_certificates
WHERE tutor_id = [tutor_id] AND verification_status = 'pending'

UNION ALL

-- Experience
SELECT 'experience' as type, job_title as name, verification_status, created_at
FROM tutor_experience
WHERE tutor_id = [tutor_id] AND verification_status = 'pending'

ORDER BY created_at DESC;
```

### Count pending items
```sql
SELECT
    (SELECT COUNT(*) FROM tutor_achievements WHERE tutor_id = [tutor_id] AND verification_status = 'pending') as pending_achievements,
    (SELECT COUNT(*) FROM tutor_certificates WHERE tutor_id = [tutor_id] AND verification_status = 'pending') as pending_certifications,
    (SELECT COUNT(*) FROM tutor_experience WHERE tutor_id = [tutor_id] AND verification_status = 'pending') as pending_experiences;
```

## Contact for Issues
- Check VERIFICATION-WORKFLOW-COMPLETE.md for detailed implementation
- Review code comments in global-functions.js and profile-controller.js
- Test with sample data first before production use
