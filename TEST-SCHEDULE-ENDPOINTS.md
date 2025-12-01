# Testing Schedule Panel - Quick Guide

## Issues Fixed ✅

1. **Duplicate `allSchedules` declaration** - Removed from global-functions.js
2. **Backend endpoints** - Already exist (tutor_schedule_endpoints.py, tutor_sessions_endpoints.py)
3. **Frontend loading order** - schedule-tab-manager.js loads after global-functions.js

## How to Test

### 1. Start Backend (Terminal 1)
```bash
cd astegni-backend
python app.py
```

### 2. Start Frontend (Terminal 2)
```bash
cd c:\Users\zenna\Downloads\Astegni-v-1.1
python -m http.server 8080
```

### 3. Login to Test
1. Navigate to: http://localhost:8080/profile-pages/tutor-profile.html
2. Login with:
   - **Email**: jediael.s.abebe@gmail.com
   - **Password**: @JesusJediael1234

### 4. Click Schedule Panel
- Click "Schedule" in the left sidebar
- Should see the schedule panel open

### 5. Check Browser Console
Open DevTools (F12) and check for:
- ✅ No "already declared" errors
- ✅ "Schedule Tab Manager loaded successfully" message
- ✅ API calls to `/api/tutor/schedules` and `/api/tutor/sessions`

### 6. Test Tab Switching
- Click "All" tab → Should show combined view
- Click "Schedules" tab → Should show schedules only
- Click "Sessions" tab → Should show sessions only

### 7. Test Search
- Type in the search bar on each tab
- Results should filter in real-time

## Expected Data

Based on seed script:
- **15 Schedules**: 5 active, 10 draft
- **25 Sessions**: Various statuses (completed, scheduled, etc.)

## API Endpoints Being Used

1. `GET /api/tutor/schedules` - All schedules
2. `GET /api/tutor/sessions` - All sessions
3. `GET /api/tutor/sessions?status_filter=completed` - Filtered sessions
4. `GET /api/tutor/sessions/stats/summary` - Session statistics

## If Still Having Issues

### Check Backend is Running
```bash
curl http://localhost:8000/api/tutor/schedules -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Browser Console for Errors
Look for:
- 404 errors (endpoint not found)
- 401 errors (authentication issue)
- CORS errors
- JavaScript syntax errors

### Verify Data in Database
```bash
cd astegni-backend
python -c "
import psycopg
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv('DATABASE_URL')
conn = psycopg.connect(db_url)
cur = conn.cursor()

cur.execute('SELECT COUNT(*) FROM tutor_schedules WHERE tutor_id = 85')
print(f'Schedules: {cur.fetchone()[0]}')

cur.execute('SELECT COUNT(*) FROM tutor_sessions WHERE tutor_id = 85')
print(f'Sessions: {cur.fetchone()[0]}')

cur.close()
conn.close()
"
```

Should output:
```
Schedules: 15
Sessions: 25
```

## Success Criteria

✅ No JavaScript errors in console
✅ Tabs switch correctly
✅ Data loads from database
✅ Search bars work on all tabs
✅ Stats display correctly

---

**If everything works**: The schedule panel is fully functional!
**If not**: Check the specific error in browser console and report it.
