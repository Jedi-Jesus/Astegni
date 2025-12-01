# Profile Header Testing Guide 🧪

## Quick Test (2 minutes)

### Step 1: Start Backend
```bash
cd astegni-backend
python app.py
```

Wait for: `Uvicorn running on http://localhost:8000`

### Step 2: Open Admin Page
Navigate to: `http://localhost:8080/admin-pages/manage-system-settings.html`

### Step 3: Open DevTools
Press `F12` → Go to **Console** tab

### Step 4: Check Console Output
You should see:
```
System Settings page loaded
Updating profile display with data: {first_name: "Abebe", ...}
✅ Admin profile loaded from database successfully
✅ Profile display updated successfully
```

### Step 5: Verify Profile Display
Check the profile header shows:
- **Name:** "Abebe Kebede Tesfa" ✅ (NOT "admin_username" or "Loading...")
- **Badges:** "✔ Admin", "⚙️ System Control", "🔒 Limited Access" ✅
- **Quote:** "Empowering tutors to deliver excellence in education." ✅
- **Location:** "manage-tutors | Tutor Verification & Management" ✅
- **Access Level:** "Admin" ✅
- **Employee ID:** "ADM-2024-001" ✅
- **Rating Count:** "(Admin)" ✅

---

## Detailed Test Scenarios

### Scenario 1: Normal Load (API Working) ✅

**Steps:**
1. Backend running on port 8000
2. Navigate to admin page
3. Wait 1-2 seconds

**Expected Result:**
- Profile shows "Loading..." briefly
- Then displays real data from database
- Console shows: `✅ Admin profile loaded from database successfully`

---

### Scenario 2: API Failure (Backend Down) ⚠️

**Steps:**
1. Stop backend server (`Ctrl+C`)
2. Refresh admin page
3. Check profile header

**Expected Result:**
- Profile shows "Loading..." briefly
- Then displays fallback data:
  - Name: "System Administrator"
  - Username: "admin"
  - Department: "System Administration"
  - Employee ID: "SYS-ADMIN-001"
  - Access Level: "Root Administrator"
- Console shows:
  - `❌ Error loading admin profile: Failed to fetch`
  - `📦 Fallback profile data loaded`
  - `✅ Profile display updated successfully`

---

### Scenario 3: Badge Display Based on Access Level

**Test Root Administrator:**
```javascript
// In DevTools Console, manually test badge generation
const testProfile = {
    access_level: 'Root Administrator',
    first_name: 'Super',
    father_name: 'Admin',
    admin_username: 'superadmin'
};
updateProfileDisplay(testProfile);
```

**Expected Result:**
- Badge 1: "✔ Super Admin"
- Badge 2: "⚙️ System Control"
- Badge 3: "🛡️ Full Access"

**Test Regular Admin:**
```javascript
const testProfile = {
    access_level: 'Admin',
    first_name: 'Regular',
    father_name: 'Admin',
    admin_username: 'admin'
};
updateProfileDisplay(testProfile);
```

**Expected Result:**
- Badge 1: "✔ Admin"
- Badge 2: "⚙️ System Control"
- Badge 3: "🔒 Limited Access"

---

### Scenario 4: Ethiopian Name Display

**Test Full Name:**
```javascript
const testProfile = {
    first_name: 'Abebe',
    father_name: 'Kebede',
    grandfather_name: 'Tesfa',
    admin_username: 'abebe_kebede',
    access_level: 'Admin'
};
updateProfileDisplay(testProfile);
```

**Expected:** Profile shows "Abebe Kebede Tesfa"

**Test Partial Name:**
```javascript
const testProfile = {
    first_name: 'Abebe',
    father_name: 'Kebede',
    grandfather_name: null,  // Missing
    admin_username: 'abebe_kebede',
    access_level: 'Admin'
};
updateProfileDisplay(testProfile);
```

**Expected:** Profile shows "Abebe Kebede" (without grandfather name)

**Test No Name:**
```javascript
const testProfile = {
    first_name: null,
    father_name: null,
    grandfather_name: null,
    admin_username: 'admin',
    access_level: 'Admin'
};
updateProfileDisplay(testProfile);
```

**Expected:** Profile shows "admin" (fallback to username)

---

### Scenario 5: Profile Data in Console

**Steps:**
1. Open DevTools Console
2. Type: `window.currentAdminProfile`
3. Press Enter

**Expected Result:**
```javascript
{
    id: 1,
    admin_id: 1,
    first_name: "Abebe",
    father_name: "Kebede",
    grandfather_name: "Tesfa",
    admin_username: "abebe_kebede",
    quote: "Empowering tutors to deliver excellence in education.",
    bio: "Experienced administrator specializing in tutor management...",
    phone_number: "+251911234567",
    email: "abebe.kebede@astegni.et",
    department: "manage-tutors",
    profile_picture_url: null,
    cover_picture_url: null,
    employee_id: "ADM-2024-001",
    access_level: "Admin",
    last_login: null,
    responsibilities: "Tutor Verification & Management"
}
```

---

## Debugging Tips

### Issue: Profile shows "Loading..." forever

**Diagnosis:**
1. Check if backend is running: `curl http://localhost:8000/api/admin/profile?admin_id=1`
2. Check browser console for errors
3. Check Network tab in DevTools for failed requests

**Common causes:**
- Backend not running
- CORS error (check backend CORS settings)
- Wrong API_BASE_URL in JavaScript

---

### Issue: Profile shows "admin_username" instead of full name

**Diagnosis:**
1. Check console: `window.currentAdminProfile`
2. Look at the `first_name`, `father_name`, `grandfather_name` fields
3. If all three are null, it will show `admin_username` (this is correct behavior)

**Solution:**
Update database with proper names:
```sql
UPDATE admin_profile
SET first_name = 'Abebe',
    father_name = 'Kebede',
    grandfather_name = 'Tesfa'
WHERE admin_id = 1;
```

---

### Issue: Badges not showing

**Diagnosis:**
1. Check console for: `✅ Profile display updated successfully`
2. Inspect element in DevTools, look for `.badges-row`
3. Check if badges are being created: `document.querySelectorAll('.profile-badge')`

**Common causes:**
- `access_level` field is null in database
- JavaScript error preventing badge creation
- CSS hiding badges

---

### Issue: Rating always shows "--"

**Diagnosis:**
This is expected! Rating updates to "5.0" only after `updateProfileDisplay()` runs.

**Check:**
1. Wait 1-2 seconds after page load
2. Rating should change from "--" to "5.0"
3. Stars should change from "☆☆☆☆☆" to "★★★★★"

---

## API Endpoint Testing

### Test via curl:
```bash
# Test profile endpoint
curl http://localhost:8000/api/admin/profile?admin_id=1

# Pretty print JSON
curl -s http://localhost:8000/api/admin/profile?admin_id=1 | python -m json.tool
```

### Test via browser:
Navigate to: `http://localhost:8000/api/admin/profile?admin_id=1`

### Test via FastAPI docs:
Navigate to: `http://localhost:8000/docs`
- Find `GET /api/admin/profile`
- Click "Try it out"
- Enter `admin_id: 1`
- Click "Execute"

---

## Success Criteria ✅

Profile header is working correctly if:

1. ✅ Profile shows real data from database (not "Loading..." or hardcoded values)
2. ✅ Console shows: `✅ Admin profile loaded from database successfully`
3. ✅ Full Ethiopian name displays correctly
4. ✅ Badges dynamically change based on access level
5. ✅ Quote, location, bio all display from database
6. ✅ Employee ID and access level display correctly
7. ✅ Fallback data loads when API fails (no crashes)
8. ✅ Rating count shows access level (not hardcoded "System Admin")

---

## Known Limitations

1. **Profile Header Visibility:**
   - Profile header only visible on "dashboard" panel
   - Hidden on other panels (general, media, etc.)
   - This is controlled by `js/page-structure/user-profile.js`
   - **Fix coming soon**

2. **Image Uploads:**
   - Profile picture upload not yet implemented
   - Cover image upload not yet implemented
   - Currently shows placeholder SVGs

3. **Last Login:**
   - Currently null in database (shows "Loading...")
   - Will update automatically once login tracking is implemented

---

## Quick Fix Commands

### Reset to default admin data:
```bash
cd astegni-backend
python seed_admin_profiles.py
```

### View current admin data:
```bash
curl -s http://localhost:8000/api/admin/profile?admin_id=1 | python -m json.tool
```

### Check if backend is running:
```bash
curl http://localhost:8000/docs
```

Should return HTML of FastAPI docs page.

---

**Happy Testing! 🎉**
