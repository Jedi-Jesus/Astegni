# Quick Test Guide: Schedule & Session Enhancements

## 🚀 Quick Start Testing (5 minutes)

### Prerequisites:
1. Backend server running: `cd astegni-backend && python app.py`
2. Frontend server running: `python -m http.server 8080`
3. Logged in as a tutor

---

## Test 1: Schedule Panel Loading (30 seconds)

**Steps:**
1. Open http://localhost:8080/profile-pages/tutor-profile.html
2. Click "Schedule" in the left sidebar
3. **Expected**: Schedules table loads immediately with existing schedules

**✅ Pass Criteria:**
- Table loads without clicking any tabs
- No need to refresh or click around
- Console shows: "📋 Schedule panel opening - loading schedules..."

---

## Test 2: Add Schedule & Auto Reload (1 minute)

**Steps:**
1. In Schedule panel, click "Schedules" tab
2. Click "Add New Schedule" button
3. Fill in:
   - Day: Monday
   - Start Time: 09:00
   - End Time: 10:00
   - Duration: 60
   - Format: Online
4. Click "Save Schedule"
5. **Expected**: Modal closes, table reloads, new schedule appears

**✅ Pass Criteria:**
- No need to manually refresh
- New schedule appears at bottom of table
- Console shows: "✅ Schedule saved - reloading table..."

---

## Test 3: Subject Field Removed (30 seconds)

**Steps:**
1. Click "Add New Schedule" again
2. Look for "Subject" field in the modal
3. **Expected**: No subject dropdown field visible

**✅ Pass Criteria:**
- Subject field completely removed
- Modal only shows: Day, Start Time, End Time, Duration, Session Format
- No "Other Subject" field appears

---

## Test 4: Schedule Table Pagination (1 minute)

**Steps:**
1. In Schedules tab, scroll to bottom of table
2. Check pagination controls
3. Click "Next" button (if more than 10 schedules)
4. Click page number "1" to go back
5. **Expected**: Navigation works smoothly

**✅ Pass Criteria:**
- Shows max 10 schedules per page
- Previous/Next buttons enabled/disabled correctly
- Page numbers display and work
- Current page highlighted in blue

---

## Test 5: Schedule Toggle Icons (2 minutes)

**Steps:**
1. In Schedules tab, find any schedule row
2. Click the **bell icon** (Notification column)
   - **Expected**: Icon turns blue, tooltip says "Notification Enabled"
3. Click the **clock icon** (Alarm column)
   - **Expected**: Icon turns orange, tooltip says "Alarm Enabled"
4. Click the **star icon** (Featured column)
   - **Expected**: Icon turns yellow, tooltip says "Featured"
5. Click each icon again to toggle off
   - **Expected**: Icons turn gray, tooltips update

**✅ Pass Criteria:**
- All three icons clickable
- Color changes: gray → blue/orange/yellow
- Table reloads after each click
- Changes persist after reload

---

## Test 6: Session Table Combined Column (30 seconds)

**Steps:**
1. Click "Sessions" tab
2. Look at the "Subject & Topic" column
3. **Expected**: Subject appears as title, topic as subtitle in same column

**✅ Pass Criteria:**
- Subject in bold, larger font
- Topic in smaller, gray font below
- Both values visible in single column
- No separate Topic column

---

## Test 7: Session Toggle Icons (2 minutes)

**Steps:**
1. In Sessions tab, find any session row
2. Click the **bell icon** (Notification column)
   - **Expected**: Icon turns blue
3. Click the **clock icon** (Alarm column)
   - **Expected**: Icon turns orange
4. Click the **star icon** (Featured column)
   - **Expected**: Icon turns yellow
5. Toggle each off again
   - **Expected**: Icons turn gray

**✅ Pass Criteria:**
- All three icons clickable and responsive
- Color feedback immediate
- Table reloads preserving current page
- Console shows success messages

---

## Test 8: Session Table Pagination (1 minute)

**Steps:**
1. In Sessions tab, scroll to bottom
2. Check pagination controls
3. Click through pages if multiple pages exist
4. **Expected**: Same pagination behavior as schedules

**✅ Pass Criteria:**
- 10 sessions per page
- Navigation buttons work
- Page numbers accurate
- Current page maintained after toggle operations

---

## 🔍 Backend API Testing (Optional - Advanced)

### Test Toggle Endpoints Directly:

**1. Test Session Notification Toggle:**
```bash
curl -X PATCH http://localhost:8000/api/tutor/sessions/1/toggle-notification \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"notification_enabled": true}'
```

**Expected Response:**
```json
{
  "message": "Notification enabled",
  "session_id": 1,
  "notification_enabled": true
}
```

**2. Test Schedule Featured Toggle:**
```bash
curl -X PATCH http://localhost:8000/api/tutor/schedules/1/toggle-featured \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"is_featured": true}'
```

**Expected Response:**
```json
{
  "message": "Schedule featured",
  "schedule_id": 1,
  "is_featured": true
}
```

### Get Your Token:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `localStorage.getItem('token')`
4. Copy the token value

---

## 🐛 Troubleshooting

### Problem: Schedules don't load when clicking Schedule panel
**Solution**:
- Check browser console for errors
- Verify `loadSchedules()` function exists in global-functions.js
- Ensure backend is running on port 8000

### Problem: Toggle icons don't change color
**Solution**:
- Check network tab - API call should succeed
- Verify token in localStorage is valid
- Check backend logs for errors
- Ensure migration ran successfully

### Problem: Pagination shows wrong number of items
**Solution**:
- Check `scheduleItemsPerPage` and `sessionItemsPerPage` variables
- Verify total count calculation in code
- Check if filters are affecting results

### Problem: Subject field still appears
**Solution**:
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Verify tutor-profile.html was updated correctly

### Problem: Table doesn't reload after toggle
**Solution**:
- Check console for JavaScript errors
- Verify `loadSchedules()` or `loadSessions()` is called in toggle functions
- Check if page state variables are defined

---

## ✅ Complete Test Results

Mark each test as you complete it:

- [ ] Test 1: Schedule Panel Loading
- [ ] Test 2: Add Schedule & Auto Reload
- [ ] Test 3: Subject Field Removed
- [ ] Test 4: Schedule Table Pagination
- [ ] Test 5: Schedule Toggle Icons
- [ ] Test 6: Session Table Combined Column
- [ ] Test 7: Session Toggle Icons
- [ ] Test 8: Session Table Pagination

**All tests passing?** ✅ Implementation is production-ready!

---

## 📊 Database Verification (Optional)

Check database directly to verify toggles are saving:

```sql
-- Check session toggle fields
SELECT id, subject, topic, notification_enabled, alarm_enabled, is_featured
FROM tutoring_sessions
WHERE tutor_id = YOUR_TUTOR_ID
LIMIT 5;

-- Check schedule toggle fields
SELECT id, day_of_week, notification_browser, alarm_browser, is_featured
FROM tutor_teaching_schedules
WHERE tutor_id = YOUR_TUTOR_ID
LIMIT 5;
```

Expected: Boolean values (true/false) match your toggle states in the UI.

---

**Testing Time**: ~10 minutes for complete walkthrough
**Last Updated**: 2025-11-17
