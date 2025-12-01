# Schedule Creation Debug Guide

## Issue Identified

When you try to create a schedule in [tutor-profile.html](profile-pages/tutor-profile.html), the `saveSchedule()` function starts but appears to stop execution without showing error messages.

## Root Cause

Based on the console logs, the function reaches the debug section but then stops. This indicates **the validation is failing silently** - most likely the notification system (`TutorProfileUI.showNotification`) is not working or displaying properly.

## Debug Steps

### Step 1: Check What Fields Are Being Read

Add this temporary debug code to [js/tutor-profile/global-functions.js:2585](js/tutor-profile/global-functions.js#L2585) (right before validation):

```javascript
// DEBUG: Log all form values
console.log('=== FORM VALUES DEBUG ===');
console.log('title:', title);
console.log('subject:', subject);
console.log('grade:', grade);
console.log('year:', year);
console.log('scheduleType:', scheduleType);
console.log('startTime:', startTime);
console.log('endTime:', endTime);
console.log('status:', status);
console.log('selectedMonths:', selectedMonths);
console.log('selectedDays:', selectedDays);
console.log('=== END DEBUG ===');
```

### Step 2: Test With Test Page

1. Open [test-schedule-creation.html](test-schedule-creation.html) in your browser
2. Click "Test Create Schedule" button
3. Check if the API call works directly

### Step 3: Common Issues & Solutions

#### Issue 1: Missing Required Fields
**Symptom:** Validation fails at line 2587
**Solution:** Make sure ALL these fields have values:
- Title
- Subject
- Grade Level
- Year
- Start Time
- End Time

#### Issue 2: No Months/Days Selected (Recurring)
**Symptom:** Validation fails at lines 2618-2634
**Solution:** For "Recurring Schedule" type, you must:
- Select at least ONE month
- Select at least ONE day

#### Issue 3: No Specific Dates (Specific)
**Symptom:** Validation fails at lines 2636-2643
**Solution:** For "Specific Dates" schedule type:
- Add at least ONE specific date using the date picker

#### Issue 4: Invalid Time Range
**Symptom:** Validation fails at line 2647
**Solution:** End time must be AFTER start time

#### Issue 5: TutorProfileUI Not Available
**Symptom:** `TutorProfileUI.showNotification` fails silently
**Solution:** Check browser console for any module loading errors

## Quick Fix: Add Alert Fallback

If notifications aren't showing, temporarily replace the notification code with alerts to see errors.

In [js/tutor-profile/global-functions.js](js/tutor-profile/global-functions.js), find this pattern:

```javascript
if (typeof TutorProfileUI !== 'undefined') {
    TutorProfileUI.showNotification('Error message', 'error');
} else {
    alert('Error message');
}
```

Change to:

```javascript
alert('Error message');  // Force alert for debugging
```

## Testing Checklist

Before clicking "Create Schedule", verify:

- [ ] Schedule Title is filled
- [ ] Subject is selected (not empty)
- [ ] Grade Level is selected (not empty)
- [ ] Year is selected (not empty)
- [ ] Schedule Type is selected (Recurring or Specific)
- [ ] If Recurring: At least 1 month AND 1 day checked
- [ ] If Specific: At least 1 date added to list
- [ ] Start Time is set
- [ ] End Time is set AND is after Start Time
- [ ] Status is selected (Active/Paused)

## Expected Console Output

When working correctly, you should see:

```
🔍 === SAVE SCHEDULE DEBUG ===
Hidden input element: <input type="hidden" id="editing-schedule-id" value>
Hidden input value:
📋 Schedule ID from hidden input:
📅 Creating new schedule
Schedule data: {title: "...", subject: "...", ...}
✅ Schedule created: {id: 123, ...}
```

## API Endpoint Info

- **URL:** `http://localhost:8000/api/tutor/schedules`
- **Method:** POST
- **Auth:** Bearer token (from localStorage)
- **Content-Type:** application/json

## Backend Verification

Check if backend is running:

```bash
cd astegni-backend
# Backend should be running on port 8000
# Check with:
curl http://localhost:8000/docs
```

## Database Verification

Check if table exists:

```bash
cd astegni-backend
python -c "import psycopg; conn = psycopg.connect('DATABASE_URL'); cur = conn.cursor(); cur.execute('SELECT COUNT(*) FROM tutor_teaching_schedules'); print('Table exists, rows:', cur.fetchone()[0])"
```

## Next Steps

1. Add the debug console.log code from Step 1
2. Fill out the schedule form completely
3. Click "Create Schedule"
4. Check console output
5. Report which validation is failing

## Files to Check

- Frontend: [profile-pages/tutor-profile.html](profile-pages/tutor-profile.html)
- JavaScript: [js/tutor-profile/global-functions.js](js/tutor-profile/global-functions.js)
- Backend: [astegni-backend/tutor_schedule_endpoints.py](astegni-backend/tutor_schedule_endpoints.py)
- Database Migration: [astegni-backend/migrate_create_whiteboard_tables.py](astegni-backend/migrate_create_whiteboard_tables.py)
