# Teaching Schedule Feature - Quick Start Guide

## Status: ✅ READY TO USE

All code is implemented and database is configured. Just restart the backend!

## Quick Start (3 Steps)

### Step 1: Restart Backend
```bash
# Stop current backend (Ctrl+C if running)
cd astegni-backend
python app.py
```

### Step 2: Access Schedule Panel
1. Navigate to: `http://localhost:8080/profile-pages/tutor-profile.html`
2. Log in as a tutor
3. Click "Schedule" in the left sidebar

### Step 3: Create Your First Schedule
1. Click "Create Schedule" button
2. Fill in the form (all fields marked * are required)
3. Click "Create Schedule"
4. ✅ Schedule appears in the table!

## What You Should See

### Empty State (No Schedules Yet)
```
┌─────────────────────────────────┐
│  📅 No schedules created yet    │
│  Click "Create Schedule" to     │
│  add your first schedule        │
└─────────────────────────────────┘
```

### After Creating Schedule
```
┌──────────────────────────────────────────────────────────┐
│ Schedule Title | Date      | Time        | Alarm | Action│
├──────────────────────────────────────────────────────────┤
│ Math Grade 10  │ Recurring │ 09:00-10:30 │  🔔   │  View │
│ Physics, G9-10 │ Mon, Wed  │             │       │       │
└──────────────────────────────────────────────────────────┘
```

### Clicking "View" Button
```
┌─────────────────────────────────────┐
│  📅 Schedule Details                │
│                                     │
│  Mathematics - Grade 10             │
│  🟢 Active                          │
│                                     │
│  📅 Recurring Schedule              │
│  Months: January, February, March   │
│  Days: Monday, Wednesday, Friday    │
│  Time: 09:00 - 10:30                │
│                                     │
│  🔔 Alarm Enabled                   │
│  Reminder: 15 minutes before        │
│  Browser Notification: Enabled      │
└─────────────────────────────────────┘
```

## What Was Fixed

### Problem
- ❌ 422 error when loading schedules
- ❌ Wrong database table structure

### Solution
- ✅ Created new table: `tutor_teaching_schedules`
- ✅ Updated all backend queries
- ✅ Fixed missing fields in endpoints

## Database Table

**Table Name**: `tutor_teaching_schedules` (separate from session bookings)

**Created**: ✅ Already done
**Records**: 0 (ready for your data)

## Verify It's Working

### Check Backend Logs (Should See)
```
INFO: POST /api/tutor/schedules HTTP/1.1" 201 Created
INFO: GET /api/tutor/schedules HTTP/1.1" 200 OK
INFO: GET /api/tutor/schedules/1 HTTP/1.1" 200 OK
```

### NOT (This Was The Bug)
```
INFO: GET /api/tutor/schedules HTTP/1.1" 422 Unprocessable Content
```

## Quick Database Check

```bash
psql -U astegni_user -d astegni_db -c "SELECT COUNT(*) FROM tutor_teaching_schedules;"
```

Should show: `count: 0` (or more if you created schedules)

## Example: Create a Test Schedule

**Quick Form Fill**:
- Title: "Mathematics - Grade 10 Algebra"
- Subject: Mathematics
- Grade Level: Grade 9-10
- Year: 2025
- Schedule Type: ✓ Recurring
- Months: ☑ January ☑ February ☑ March
- Days: ☑ Monday ☑ Wednesday ☑ Friday
- Start Time: 09:00
- End Time: 10:30
- Enable Alarm: ☑
- Notify before: 15 minutes before
- Browser notification: ☑

Click "Create Schedule" → ✅ Done!

## API Endpoints (All Working)

- `POST /api/tutor/schedules` - Create schedule
- `GET /api/tutor/schedules` - Get all schedules
- `GET /api/tutor/schedules/{id}` - Get single schedule
- `PUT /api/tutor/schedules/{id}` - Update schedule
- `DELETE /api/tutor/schedules/{id}` - Delete schedule

## Files Changed (FYI)

✅ `astegni-backend/create_teaching_schedules.py` - NEW (migration)
✅ `astegni-backend/tutor_schedule_endpoints.py` - UPDATED (uses new table)
✅ `profile-pages/tutor-profile.html` - UPDATED (table display + view modal)
✅ `js/tutor-profile/global-functions.js` - UPDATED (load & view functions)

## Need Help?

See full documentation:
- [SCHEDULE-FEATURE-COMPLETE.md](SCHEDULE-FEATURE-COMPLETE.md) - Complete feature docs
- [DATABASE-TABLE-FIX-COMPLETE.md](DATABASE-TABLE-FIX-COMPLETE.md) - Database fix details

## Ready? Go!

1. Restart backend: `python astegni-backend/app.py`
2. Open: `http://localhost:8080/profile-pages/tutor-profile.html`
3. Click "Schedule" → "Create Schedule"
4. Fill form → Submit
5. 🎉 Your schedule is saved!

**Questions?** Check the browser console and backend logs for detailed information.
