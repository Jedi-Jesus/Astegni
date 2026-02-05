# Schedule Modal Stuck on "Saving..." - Debug Guide

## Problem
The schedule modal shows "Saving..." but never completes or shows an error.

## Root Cause Analysis

The `is_featured` field was being **read from the form** (line 5148) and **included in the request** (line 5269), BUT the backend `ScheduleCreate` model didn't have this field until we just added it.

## What's Happening

1. ✅ Frontend reads `is_featured` checkbox (line 5148)
2. ✅ Frontend includes it in `scheduleData` (line 5269)
3. ✅ Backend now has `is_featured: bool = False` in ScheduleCreate model
4. ❓ **Backend might not be restarted with the new model**

## Quick Fixes

### 1. Check Backend is Running
```bash
# Open a NEW terminal
cd astegni-backend
python app.py
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

### 2. Check Browser Console for Errors

**Open DevTools:** Press F12 or Right-Click → Inspect

**Go to Console Tab** - Look for errors like:
- ❌ `Failed to fetch`
- ❌ `500 Internal Server Error`
- ❌ `CORS error`
- ❌ `Network request failed`

**Go to Network Tab:**
- Click "Create Schedule" button
- Look for `/api/schedules` request
- Check Status: Should be `201 Created` (not 500, 400, or failed)
- Click on the request → Preview → See the error message

### 3. Test the Backend Directly

```bash
# In a terminal
curl -X POST http://localhost:8000/api/schedules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test Schedule",
    "description": "Test",
    "priority_level": "medium",
    "year": 2025,
    "schedule_type": "recurring",
    "months": ["January"],
    "days": ["Monday"],
    "specific_dates": [],
    "start_time": "09:00",
    "end_time": "17:00",
    "notes": "",
    "status": "active",
    "is_featured": false,
    "alarm_enabled": false,
    "alarm_before_minutes": null,
    "notification_browser": false,
    "notification_sound": false
  }'
```

**Expected:** `{"id": 1, "title": "Test Schedule", ...}`

### 4. Common Issues & Solutions

#### Issue A: Backend Not Running
**Symptom:** Console shows `Failed to fetch` or `ERR_CONNECTION_REFUSED`

**Fix:**
```bash
cd astegni-backend
python app.py
```

#### Issue B: Backend Running Old Code
**Symptom:** Backend shows error about `is_featured` attribute

**Fix:**
```bash
# Stop backend (Ctrl+C)
# Start again
cd astegni-backend
python app.py
```

#### Issue C: Token Expired
**Symptom:** 401 Unauthorized error

**Fix:**
- Log out and log in again
- Check localStorage has valid token: `localStorage.getItem('token')`

#### Issue D: Validation Error
**Symptom:** 422 Unprocessable Entity

**Fix:**
- Check all required fields are filled
- Check console logs for which field is invalid
- Verify yearFrom is filled for recurring schedules

#### Issue E: CORS Error
**Symptom:** Console shows CORS policy error

**Fix:**
```python
# In astegni-backend/app.py - verify CORS is configured:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:8081"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Issue F: Frontend Stuck (Infinite Loading)
**Symptom:** Button shows "Saving..." forever with no console errors

**Possible Causes:**
1. Network request never completes (check Network tab)
2. Error handler not working (missing try-catch)
3. API response not in expected format

**Debug:**
```javascript
// Add this TEMPORARILY to global-functions.js after line 5301:
console.log('🌐 Sending request to:', url);
console.log('📦 Request body:', JSON.stringify(scheduleData, null, 2));

// After line 5309:
console.log('📥 Response status:', response.status);
console.log('📥 Response OK:', response.ok);

// After line 5315:
console.log('✅ Response data:', result);
```

## Step-by-Step Debugging

### Step 1: Verify Backend
```bash
cd astegni-backend
python -c "from schedule_endpoints import ScheduleCreate; import inspect; print(inspect.getsource(ScheduleCreate))"
```

**Should show:** `is_featured: bool = False` in the output

### Step 2: Restart Backend
```bash
cd astegni-backend
# Ctrl+C to stop if running
python app.py
```

### Step 3: Hard Refresh Browser
- Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### Step 4: Open Browser Console
- Press `F12`
- Go to Console tab
- Clear console (🚫 icon)

### Step 5: Try Creating Schedule
1. Fill in all fields:
   - Title: "Test Schedule"
   - Priority: Any
   - From Year: 2025
   - Schedule Type: Recurring
   - Select: January
   - Select: Monday
   - Start Time: 09:00
   - End Time: 17:00
2. Click "Create Schedule"
3. **Watch the console** for any errors

### Step 6: Check Network Tab
1. F12 → Network tab
2. Click "Create Schedule"
3. Look for request to `/api/schedules`
4. Check:
   - Status code (should be 201)
   - Response preview
   - Request payload

## Expected Behavior After Fix

### Success Flow:
```
1. User clicks "Create Schedule" button
   ↓
2. Button changes to "Saving..." (disabled)
   ↓
3. Frontend sends POST /api/schedules with is_featured field
   ↓
4. Backend validates with ScheduleCreate model (includes is_featured)
   ↓
5. Backend inserts into database
   ↓
6. Backend returns 201 Created with schedule data
   ↓
7. Frontend shows "Schedule created successfully!" notification
   ↓
8. Modal closes
   ↓
9. Schedule appears in table
```

### What You Should See:
- ✅ Button changes to "Saving..."
- ✅ Request appears in Network tab with Status 201
- ✅ Success notification shows
- ✅ Modal closes
- ✅ Schedule appears in schedule panel
- ✅ No errors in console

## Files Involved

1. **Frontend:** [js/tutor-profile/global-functions.js](js/tutor-profile/global-functions.js:5148)
   - Line 5148: Reads `is_featured` checkbox
   - Line 5269: Includes in scheduleData

2. **Backend:** [astegni-backend/schedule_endpoints.py](astegni-backend/schedule_endpoints.py:113)
   - Line 113: ScheduleCreate model with is_featured field

3. **Modal HTML:** [modals/common-modals/schedule-modal.html](modals/common-modals/schedule-modal.html:441)
   - Line 441: is_featured checkbox

## Still Stuck?

If you're still stuck after trying all the above:

1. **Check Backend Logs:**
   - Look at the terminal where `python app.py` is running
   - Any errors printed there?

2. **Share Console Output:**
   - Copy all errors from browser console
   - Copy backend terminal output
   - Share both for further debugging

3. **Test with curl:**
   - Get your token: `localStorage.getItem('token')`
   - Test API directly with curl (see Step 3 above)

---

**Fix Date:** 2026-01-29
**Status:** Frontend already has is_featured field - Need to verify backend restart
