# Backend Restart Required - 422 Error Still Showing

## The Problem
The backend code has been updated, but **uvicorn's auto-reload is not detecting the changes**. This is why you're still seeing the 422 error.

## Solution: Manual Restart

### Step 1: Stop Current Backend
In the terminal where the backend is running:
1. Press **Ctrl + C**
2. Wait for it to shut down completely

### Step 2: Restart Backend
Run one of these commands:

**Option A (Recommended):**
```bash
cd astegni-backend
uvicorn app:app --reload
```

**Option B (Alternative):**
```bash
cd astegni-backend
python app.py
```

### Step 3: Verify Fix
After restart, you should see:
```
INFO: Application startup complete.
```

Then navigate to schedule panel in browser and check the backend logs.

---

## Expected Results After Restart

### ✅ GOOD - Backend Logs Should Show:
```
INFO: GET /api/tutor/schedules HTTP/1.1" 200 OK
```

### ❌ BAD - If You Still See:
```
INFO: GET /api/tutor/schedules HTTP/1.1" 422 Unprocessable Content
```

If you still see 422 after restart, run this test:
```bash
cd astegni-backend
python test_schedule_endpoint.py
```

---

## Quick Verification

### Check Changes Are Saved
```bash
cd astegni-backend
grep "tutor_teaching_schedules" tutor_schedule_endpoints.py
```

Should show multiple lines with `tutor_teaching_schedules` (our new table name).

### Check Table Exists
```bash
python -c "
import psycopg
conn = psycopg.connect(host='localhost', port=5432, dbname='astegni_db', user='astegni_user', password='Astegni2025')
with conn.cursor() as cur:
    cur.execute('SELECT COUNT(*) FROM tutor_teaching_schedules;')
    print(f'Table exists! Records: {cur.fetchone()[0]}')
conn.close()
"
```

Should print: `Table exists! Records: 0`

---

## Why This Happened

**uvicorn --reload** watches for file changes, but sometimes:
- Windows file system events are missed
- Changes are too quick in succession
- File is modified while reload is in progress

**Solution**: Always manually restart when making database-related changes.

---

## After Restart Works

1. Navigate to: `http://localhost:8080/profile-pages/tutor-profile.html`
2. Click "Schedule" in sidebar
3. You should see either:
   - "No schedules created yet" (empty state) ✅
   - OR your schedules in a table ✅
   - NOT a loading spinner forever ❌

4. Click "Create Schedule"
5. Fill form and submit
6. Schedule should appear immediately in the table ✅

---

## Still Not Working?

If after restart you still see 422:

### 1. Check if changes were actually saved
```bash
cd astegni-backend
head -20 tutor_schedule_endpoints.py
```

Line 4 should say: `Uses tutor_teaching_schedules table (not tutor_schedules)`

### 2. Check if you're running the right server
```bash
# Make sure no other backend process is running
tasklist | findstr python
```

Only ONE python process should be your backend.

### 3. Force reload by touching a file
```bash
cd astegni-backend
echo # >> tutor_schedule_endpoints.py
```

This adds a blank line to force reload.

---

## Need More Help?

1. Check backend terminal for errors during startup
2. Check browser console for JavaScript errors
3. Run the test script: `python astegni-backend/test_schedule_endpoint.py`
4. Check [DATABASE-TABLE-FIX-COMPLETE.md](DATABASE-TABLE-FIX-COMPLETE.md) for detailed info

---

## Summary

**Current Status**: Code is fixed, table is created, just need manual backend restart

**Action Required**: Press Ctrl+C, then run `uvicorn app:app --reload`

**Expected Result**: 200 OK instead of 422 error

🎯 **Goal**: See schedules load successfully or "No schedules created yet" message
