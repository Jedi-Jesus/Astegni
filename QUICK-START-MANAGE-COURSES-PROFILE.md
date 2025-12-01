# Quick Start: Manage Courses Profile System

## ⚡ Quick Setup (5 Minutes)

### 1. Start Backend Server
```bash
cd astegni-backend
python app.py
```
✅ Server should start on http://localhost:8000

### 2. Start Frontend Server
```bash
# From project root (new terminal)
python -m http.server 8080
```
✅ Frontend available at http://localhost:8080

### 3. Access Admin Page
Open browser: http://localhost:8080/admin-pages/manage-courses.html

---

## 🧪 Quick Test

### Test 1: Profile Loading
1. Open http://localhost:8080/admin-pages/manage-courses.html
2. ✅ Profile header should load with admin data
3. ✅ Email and phone should be visible
4. ✅ Rating stars and badges should display

### Test 2: Edit Profile
1. Click "Edit Profile" button
2. ✅ Modal opens with populated fields
3. ✅ Email field is readonly with "Change Email" button
4. Make a change to bio
5. Click "Save Changes"
6. ✅ Changes saved to database

### Test 3: Change Email (OTP Flow)
1. In Edit Profile modal, click "Change Email"
2. ✅ OTP modal opens
3. Click "Send OTP to Current Email"
4. ✅ Check browser console for OTP code (development mode)
5. Enter the 6-digit OTP
6. Click "Verify OTP"
7. ✅ Step 2 appears
8. Enter new email (e.g., newemail@example.com)
9. Click "Send OTP to New Email"
10. ✅ Check console for new OTP
11. Enter the 6-digit OTP
12. Click "Verify & Update Email"
13. ✅ Success message appears
14. ✅ Email updated in profile header

---

## 📝 Test Admin Account

**Email:** test1@example.com
**Password:** password123
**Department:** manage-system-settings

If login fails, run:
```bash
cd astegni-backend
python verify_test_admin.py
python set_test_admin_password.py
```

---

## 🔍 Verify Everything Works

### Backend Endpoints Test
```bash
cd astegni-backend
python test_otp_email_change.py
```

**Expected Output:**
```
================================================================================
TESTING OTP EMAIL CHANGE FLOW
================================================================================

[STEP 0] Logging in to get authentication token...
✅ Login successful!

[STEP 1] Sending OTP to current email...
✅ OTP sent to current email!

[STEP 3] Verifying current email OTP...
✅ Current email OTP verified!

[STEP 4] Sending OTP to new email...
✅ OTP sent to new email!

[STEP 6] Verifying new email OTP...
✅ New email OTP verified!

[STEP 7] Updating email in database...
✅ Email updated in database!

[STEP 8] Verifying email was updated...
✅ Email successfully updated!

================================================================================
TEST COMPLETE!
================================================================================
```

---

## 🐛 Troubleshooting

### Backend not starting?
```bash
# Check if port 8000 is already in use
netstat -ano | findstr :8000

# If needed, kill the process
taskkill /F /PID <process_id>

# Restart
python app.py
```

### Profile not loading?
**Check browser console (F12):**
- Look for 404 errors → Backend not running
- Look for CORS errors → Check API_BASE_URL
- Look for 401 errors → Authentication issue

**Fix:**
```javascript
// Check API_BASE_URL in browser console
console.log(API_BASE_URL);
// Should be: http://localhost:8000

// Check authentication token
console.log(localStorage.getItem('access_token'));
// Should have a value
```

### OTP emails not working?
**Development Mode:** OTP codes appear in API response (check browser Network tab or backend logs)

**Production Mode:** Configure SMTP in `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@astegni.com
```

### Email not updating?
1. ✅ Completed both OTP verifications?
2. ✅ Email not already in use?
3. ✅ AdminProfileUpdate model has email field? (it does now)
4. ✅ Backend endpoint supports email? (it does now)

---

## 📚 Documentation Quick Links

**User Guide:**
- [OTP Email Change User Guide](OTP-EMAIL-CHANGE-USER-GUIDE.md) - Step-by-step instructions

**Technical Docs:**
- [Complete Summary](MANAGE-COURSES-PROFILE-COMPLETE-SUMMARY.md) - Full system overview
- [OTP Testing](OTP-EMAIL-CHANGE-TESTING-COMPLETE.md) - Test results and details
- [Cross-Department Access](CROSS-DEPARTMENT-ACCESS-MANAGE-COURSES.md) - Access control
- [Email-Based Loading](EMAIL-BASED-PROFILE-LOADING.md) - Authentication details

---

## ✅ Feature Checklist

- [x] Profile header reads from database
- [x] Email and phone labels visible
- [x] Cross-department access (system admins can view)
- [x] Email-based profile loading (no hardcoded admin_id)
- [x] Edit profile modal populated from database
- [x] OTP email verification (two-step)
- [x] 5-minute OTP expiration with countdown timer
- [x] Single-use OTPs
- [x] Email uniqueness validation
- [x] Comprehensive error handling
- [x] Automated test suite
- [x] User documentation
- [x] Technical documentation

---

## 🚀 Next Steps

### For Development
1. Implement similar system for other admin pages
2. Add profile picture upload (B2 storage)
3. Add SMS OTP as alternative to email
4. Implement activity logging

### For Production
1. Configure SMTP email service
2. Set `ENVIRONMENT=production` in `.env`
3. Update `API_BASE_URL` for production domain
4. Set up rate limiting for OTP requests
5. Configure monitoring and logging

---

## 📞 Support

**Backend Issues:** Check [astegni-backend/README.md](astegni-backend/README.md)
**Frontend Issues:** Check browser console (F12)
**Database Issues:** Check PostgreSQL connection

**Test Scripts:**
- `astegni-backend/test_otp_email_change.py` - OTP flow test
- `astegni-backend/verify_test_admin.py` - Verify admin account
- `astegni-backend/set_test_admin_password.py` - Set test password

---

## 💡 Pro Tips

1. **Development Mode OTP Codes:**
   - OTPs appear in API response
   - Check browser Network tab → Response
   - Or check backend terminal logs

2. **Email Extraction Priority:**
   - AuthManager (best)
   - localStorage currentUser
   - JWT token payload
   - Fallback: test1@example.com

3. **Cross-Department Testing:**
   - System admins: See "System Administrator (Viewing)" badge
   - Course managers: See actual statistics
   - Other departments: View-only access

4. **OTP Timer:**
   - 5 minutes = 300 seconds
   - Shown as "OTP expires in 4:58"
   - Automatically turns red when expired

5. **Error Messages:**
   - Green = Success
   - Red = Error
   - Blue = Info
   - All have ✓ or ✗ icons

---

## 🎯 Quick Command Reference

```bash
# Start backend
cd astegni-backend && python app.py

# Start frontend
python -m http.server 8080

# Test OTP flow
cd astegni-backend && python test_otp_email_change.py

# Setup test admin
cd astegni-backend && python verify_test_admin.py && python set_test_admin_password.py

# Check backend server
netstat -ano | findstr :8000

# Kill backend process (if needed)
taskkill /F /PID <process_id>
```

---

**Status:** ✅ ALL SYSTEMS OPERATIONAL

**Last Updated:** October 18, 2025
