# ✅ Attendance System Integration Checklist

## Quick Start: Add These Scripts to Your Profile Pages

To enable attendance features on any profile page, add these three lines:

```html
<!-- In the <head> or before closing </body> tag -->

<!-- 1. Attendance Modal CSS -->
<link rel="stylesheet" href="../css/common-modals/attendance-modals.css">

<!-- 2. Attendance Modal Manager (JavaScript) -->
<script src="../js/common-modals/attendance-modal-manager.js"></script>

<!-- 3. Ensure common-modal-loader.js is loaded (if not already) -->
<script src="../modals/common-modals/common-modal-loader.js"></script>
```

**That's it!** The attendance features will automatically work.

---

## Integration Status by Page

### ✅ **Tutor Profile** ([profile-pages/tutor-profile.html](profile-pages/tutor-profile.html))
**Status:** Ready (assuming scripts are added)

**Required Scripts:**
```html
<!-- Add these if not already present -->
<link rel="stylesheet" href="../css/common-modals/attendance-modals.css">
<script src="../js/common-modals/attendance-modal-manager.js"></script>
<script src="../modals/common-modals/common-modal-loader.js"></script>
```

**Features Enabled:**
- ✅ WebSocket attendance tracking (via whiteboard-manager.js)
- ✅ Attendance badges in sessions panel
- ✅ "Mark Attendance" button for completed sessions
- ✅ AI suggestion modal
- ✅ Manual marking modal

---

### ⚠️ **Student Profile** ([profile-pages/student-profile.html](profile-pages/student-profile.html))
**Status:** Needs verification

**Check if sessions-panel-manager.js is loaded:**
- If YES → Add attendance scripts (same as above)
- If NO → Attendance features won't be available (students typically don't mark attendance)

---

### ⚠️ **Parent Profile** ([profile-pages/parent-profile.html](profile-pages/parent-profile.html))
**Status:** Needs verification

**Check if sessions-panel-manager.js is loaded:**
- If YES → Add attendance scripts (same as above)
- If NO → Parents view attendance but don't mark it

---

## Testing After Integration

### **Step 1: Verify Scripts Loaded**
Open browser console on tutor profile page:
```javascript
// Check if attendance modal manager is loaded
console.log(typeof openAttendanceSuggestionModal); // Should be "function"
console.log(typeof openManualAttendanceModal); // Should be "function"
```

### **Step 2: Test WebSocket Tracking**
1. Open whiteboard from tutor profile
2. Check console for:
   ```
   📊 Tracking attendance connect for tutor
   ✅ Attendance connect tracked
   💓 Attendance heartbeat sent (appears every 15s)
   ```
3. Close whiteboard
4. Check console for:
   ```
   📊 Tracking attendance disconnect for tutor
   ✅ Attendance disconnect tracked
   ```

### **Step 3: Test Attendance Modals**
1. Go to Sessions panel in tutor profile
2. Find a completed session
3. Click "Mark Attendance" button (clipboard icon)
4. Suggestion modal should appear with metrics
5. Try both options:
   - Click "Apply Suggestion" → should save
   - Click "Override Manually" → manual modal should appear
6. In manual modal:
   - Select statuses
   - Add notes
   - Click "Save Attendance"
7. Refresh sessions panel → badges should update

---

## Common Issues & Solutions

### **Issue 1: "openAttendanceSuggestionModal is not defined"**
**Solution:** Add attendance-modal-manager.js script to the page
```html
<script src="../js/common-modals/attendance-modal-manager.js"></script>
```

### **Issue 2: Attendance modals don't appear**
**Solution:** Ensure common-modal-loader.js is loaded and modals are preloaded
```javascript
// Check in console
console.log(document.getElementById('attendance-suggestion-modal')); // Should not be null
```

### **Issue 3: "Mark Attendance" button doesn't appear**
**Cause:** Session status is not 'completed'
**Solution:** Only completed sessions show the button. Check session.status in database.

### **Issue 4: WebSocket tracking not working**
**Cause:** whiteboard-manager.js not detecting currentSession
**Solution:** Ensure whiteboard session is properly initialized with session ID

### **Issue 5: 401 Unauthorized errors**
**Cause:** No auth token in localStorage
**Solution:** Ensure user is logged in and token exists
```javascript
// Check token
console.log(localStorage.getItem('token') || localStorage.getItem('access_token'));
```

---

## File Paths Reference

All paths are relative to the profile page location (`profile-pages/`):

```
profile-pages/tutor-profile.html
  ├── ../css/common-modals/attendance-modals.css
  ├── ../js/common-modals/attendance-modal-manager.js
  ├── ../modals/common-modals/common-modal-loader.js
  ├── ../modals/common-modals/attendance-suggestion-modal.html (auto-loaded)
  └── ../modals/common-modals/mark-attendance-modal.html (auto-loaded)
```

If your page is in a different location, adjust paths accordingly.

---

## Backend Requirements

Ensure backend is running with:
- ✅ Database migrations completed
- ✅ 6 attendance endpoints registered in app.py
- ✅ Backend accessible at `http://localhost:8000` (or API_BASE_URL)

To verify backend:
```bash
curl http://localhost:8000/docs
# Should show attendance endpoints in API docs
```

---

## Summary

**Minimum Integration Steps:**
1. Add 3 script tags to profile page
2. Restart backend (if not already running)
3. Clear browser cache
4. Test attendance features

**Estimated Time:** 5 minutes per profile page

**Zero Breaking Changes:** All features are additive, no existing functionality affected.

---

## Quick Copy-Paste for Tutor Profile

Add this before closing `</body>` tag in `profile-pages/tutor-profile.html`:

```html
<!-- Attendance System -->
<link rel="stylesheet" href="../css/common-modals/attendance-modals.css">
<script src="../js/common-modals/attendance-modal-manager.js"></script>
```

That's it! The attendance system will work automatically with the existing sessions-panel-manager.js.
