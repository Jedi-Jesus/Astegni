# Debug Guide: Specific Schedule Not Saving

## Issue
When trying to save a schedule with "Specific Dates" type, the schedule is not being created.

## Debugging Steps

### Step 1: Check Browser Console
1. Open tutor-profile.html
2. Open Browser DevTools (F12)
3. Go to Console tab
4. Try to create a specific schedule
5. Look for these console messages:

```
🔧 Initialized selectedSpecificDates array: []
🔄 updateSelectedDatesList called
Current selectedSpecificDates: [...]
=== FORM VALUES DEBUG ===
specificDates: [...]
specificDates.length: X
```

**Expected:** `specificDates.length` should be > 0
**If 0:** The dates are not being added to the `selectedSpecificDates` array

### Step 2: Verify Date Selection Works
1. In the schedule modal, select "Specific Dates" radio button
2. Select a "From Date"
3. Check console for: `🔄 updateSelectedDatesList called`
4. Check if the date appears in the "Selected Dates" list below the date picker

**If date doesn't appear:**
- The `handleFromDateChange()` function is not being called
- OR `selectedSpecificDates` array is not being updated

### Step 3: Check Network Request
1. Open Network tab in DevTools
2. Try to save a specific schedule
3. Look for POST request to `/api/schedules`
4. Click on the request → Preview tab
5. Check the `specific_dates` field in the request payload

**Expected payload:**
```json
{
  "title": "Test Schedule",
  "schedule_type": "specific",
  "specific_dates": ["2026-02-05", "2026-02-06"],
  "months": [],
  "days": [],
  ...
}
```

### Step 4: Check Backend Response
If the request is sent, check the response:
- Status 200/201 = Success
- Status 400 = Validation error
- Status 500 = Server error

## Common Issues & Fixes

### Issue 1: `selectedSpecificDates` is always empty
**Cause:** The date input handlers are not being triggered

**Fix:** Check if these elements exist in schedule-modal.html:
```html
<input type="date" id="schedule-date-from" onchange="handleFromDateChange()">
<input type="date" id="schedule-date-to" onchange="handleToDateChange()">
```

### Issue 2: Validation error "Please add at least one specific date"
**Cause:** `specificDates.length === 0` at save time

**Fix:** Make sure dates are actually being added when you select them. Add this temporary debug code to `handleFromDateChange()`:

```javascript
function handleFromDateChange() {
    console.log('🔍 handleFromDateChange CALLED');
    console.log('selectedSpecificDates BEFORE:', selectedSpecificDates);

    // ... existing code ...

    console.log('selectedSpecificDates AFTER:', selectedSpecificDates);
}
```

### Issue 3: Backend returns 500 error
**Cause:** Database constraint or data type mismatch

**Check backend logs:**
```bash
# In backend terminal, look for errors like:
Database error: ...
```

**Fix:** Make sure the `schedules` table has these columns:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'schedules'
AND column_name IN ('specific_dates', 'schedule_type', 'months', 'days');
```

## Quick Test Script

Add this to your browser console to test the date selection:

```javascript
// Test 1: Check if selectedSpecificDates exists
console.log('selectedSpecificDates:', window.selectedSpecificDates || selectedSpecificDates);

// Test 2: Manually add a date
if (typeof selectedSpecificDates !== 'undefined') {
    selectedSpecificDates.push('2026-02-10');
    updateSelectedDatesList();
    console.log('Added test date, check UI');
}

// Test 3: Check form state
const scheduleType = document.querySelector('input[name="schedule-type"]:checked')?.value;
console.log('Current schedule type:', scheduleType);

// Test 4: Check if specific section is visible
const specificSection = document.getElementById('specific-dates-section');
console.log('Specific section display:', specificSection?.style.display);
```

## Most Likely Issue

Based on the code review, the most likely issue is:

**The `addAnotherDateRange()` button is the only way to add dates, but users expect clicking "From Date" to add the date immediately.**

The current flow:
1. User selects "Specific Dates" radio
2. User selects "From Date" → Date is added via `handleFromDateChange()`  ✅ This should work
3. User optionally selects "To Date" → Range is expanded via `handleToDateChange()` ✅ This should work

**However**, check if the modal HTML actually has the `onchange` handlers:
- Look at modals/common-modals/schedule-modal.html lines 321-332
- Verify `onchange="handleFromDateChange()"` is present

## Fix Recommendation

If dates are not being added, add this debugging version to global-functions.js:

```javascript
// Add BEFORE handleFromDateChange function
console.log('🔍 SCHEDULE DEBUG: Checking if functions are defined');
console.log('handleFromDateChange defined:', typeof handleFromDateChange);
console.log('selectedSpecificDates defined:', typeof selectedSpecificDates);
console.log('updateSelectedDatesList defined:', typeof updateSelectedDatesList);
```

Then reload and check console immediately when page loads.
