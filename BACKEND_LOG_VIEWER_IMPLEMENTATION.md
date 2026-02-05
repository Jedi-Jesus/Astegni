# Backend Log Viewer Implementation

## What Was Added

The role-switch debugger now has the ability to fetch and display backend server logs in real-time, making it much easier to diagnose role switching issues.

## New Features

### 1. Backend Debug Endpoints

**File**: `astegni-backend/debug_endpoints.py`

Three new endpoints were added:

- `GET /api/debug/logs` - Get recent backend logs (last 500 lines)
  - Query params: `limit` (default 100), `filter` (keyword filter)

- `GET /api/debug/logs/role-switch` - Get logs related to role switching
  - Filters for keywords: `switch-role`, `get_current_user`, `/api/me`, `active_role`, `BEFORE update`, `AFTER update`, `COMMIT`, `VERIFIED`

- `DELETE /api/debug/logs` - Clear all stored logs

### 2. Log Capture System

The backend now captures all stdout/stderr output in memory (last 500 lines) with timestamps. This allows the frontend to fetch and display what's happening in the backend terminal.

### 3. Frontend Integration

**File**: `js/utils/role-switch-debugger.js`

Two new buttons added to the debug panel:

#### 🖥️ Backend Logs Button
- Fetches and displays recent backend logs related to role switching
- Shows logs with color coding:
  - 🔴 Red: Errors (ERROR, ❌, FAILED)
  - 🟢 Green: Success (SUCCESS, ✅, COMMIT)
  - 🟡 Yellow: Warnings (WARNING, ⚠️)
  - 🔵 Blue: Info (everything else)

#### ▶️ Auto-Refresh Button
- Starts automatic fetching of backend logs every 2 seconds
- Click again to stop (button changes to "⏸️ Stop Auto")
- Useful for monitoring backend in real-time during role switches

## How to Use

### 1. Restart Backend Server

**IMPORTANT**: The backend server must be restarted for the new endpoints to work.

```bash
cd astegni-backend
# Stop the server (Ctrl+C)
python app.py
```

### 2. Open Debug Panel in Browser

1. Navigate to any profile page
2. Press `Ctrl+Shift+D` to open the debug panel
3. Click "🖥️ Backend Logs" to fetch logs once
4. OR click "▶️ Auto-Refresh" to continuously fetch logs every 2 seconds

### 3. Test Role Switching

1. Start auto-refresh
2. Switch from one role to another (e.g., student → tutor)
3. Watch the debug panel fill with backend logs showing exactly what's happening:

**Expected logs**:
```
[switch-role] BEFORE update: user 1 active_role = student
[switch-role] AFTER update (before commit): user 1 active_role = tutor
[switch-role] ✅ COMMIT SUCCESSFUL
[switch-role] VERIFIED from DB (fresh query): user 1 active_role = tutor
[get_current_user] Refreshed user 1 from database - active_role: tutor
[/api/me] Called for user 1, current active_role in DB: tutor
```

## What This Solves

### Problem Before
- User had to constantly switch between browser and backend terminal
- Hard to correlate frontend events with backend logs
- Couldn't capture backend logs for debugging later
- No way to know if backend endpoint was actually being called

### Solution Now
- All backend logs visible in the browser debug panel
- Can see frontend + backend logs side-by-side in one place
- Can export combined logs for debugging
- Can verify if `/api/switch-role` is actually being called by the backend
- Auto-refresh shows real-time backend activity

## Debugging the Original Issue

With this new feature, we can now:

1. **Verify endpoint is being called**: If the frontend shows "API CALL: POST /api/switch-role" but backend logs show nothing, we know the request isn't reaching the backend

2. **See database updates**: The backend logs show BEFORE/AFTER state of `active_role` in the database

3. **Detect commit failures**: If "COMMIT SUCCESSFUL" doesn't appear, we know the transaction failed

4. **Verify database verification**: The backend queries the database after commit to verify the change persisted

## Files Modified

### Backend
- ✅ `astegni-backend/debug_endpoints.py` (NEW) - Debug endpoints with log capture
- ✅ `astegni-backend/app.py` (lines 273-275) - Import and register debug router

### Frontend
- ✅ `js/utils/role-switch-debugger.js` - Added backend log fetching methods and UI buttons

## Next Steps

1. **Restart the backend server** (CRITICAL - new endpoints won't work until restart)
2. **Test the backend log viewer** by switching roles
3. **Use auto-refresh** to monitor backend in real-time
4. **Verify if `/api/switch-role` is being called** when you click the switch button in the browser

If the backend logs show the endpoint IS being called and the database IS being updated, but the frontend still shows wrong role, then the issue is in the frontend.

If the backend logs show NO activity when you switch roles in the browser, then the browser is NOT actually calling the endpoint (cached response, fetch interception, or other issue).

## Security Note

⚠️ **WARNING**: The debug endpoints should be disabled in production as they expose internal server logs. Add environment-based disabling:

```python
# In debug_endpoints.py
import os

if os.getenv('ENVIRONMENT') == 'production':
    raise Exception("Debug endpoints are disabled in production")
```

For development, this is perfectly safe and extremely useful for debugging.
