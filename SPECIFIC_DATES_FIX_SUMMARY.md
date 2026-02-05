# Specific Dates Schedule Fix

## Problem
When creating a schedule with specific dates, the system showed the error:
**"Please add at least one specific date"** even after adding dates.

## Root Cause
The code was storing dates as simple strings in the `selectedSpecificDates` array:
```javascript
selectedSpecificDates = ["2026-02-05", "2026-02-06", "2026-02-07"]
```

But then calling `convertDateRangesToFlatArray(selectedSpecificDates)` which expects objects:
```javascript
[
  { type: 'single', date: '2026-02-05' },
  { type: 'range', fromDate: '2026-02-05', toDate: '2026-02-07' }
]
```

This mismatch caused the function to return an empty array, triggering the validation error.

## Solution
Since `selectedSpecificDates` is already a flat array of date strings (which is what the backend expects), we removed the unnecessary conversion call.

### Files Fixed:

1. **js/student-profile/global-functions.js:2325**
   ```javascript
   // OLD (broken):
   scheduleData.specific_dates = convertDateRangesToFlatArray(selectedSpecificDates || []);

   // NEW (fixed):
   scheduleData.specific_dates = selectedSpecificDates || [];
   ```

2. **js/parent-profile/schedule-manager.js:924**
   ```javascript
   // OLD (broken):
   formData.specific_dates = convertDateRangesToFlatArray(selectedSpecificDates);

   // NEW (fixed):
   formData.specific_dates = selectedSpecificDates || [];
   ```

3. **profile-pages/student-profile.html:6017**
   - Updated script version to `?v=20260204-specificdates` for cache busting

## How It Works Now

1. User selects a date (e.g., 2026-02-05)
2. Date is added to `selectedSpecificDates` array as string: `["2026-02-05"]`
3. When saving, the array is sent directly to backend
4. Backend receives the correct format: `["2026-02-05"]`
5. Schedule is created successfully ✅

## Testing

After hard refresh (`Ctrl+Shift+R`):

1. Open Schedule Modal
2. Select "Specific Dates"
3. Choose a "From Date"
4. Optionally choose a "To Date" (adds all dates in range)
5. Click "Save Schedule"
6. Should save successfully without error

## Note

The `convertDateRangesToFlatArray()` function is still used in other contexts where the input format is different (e.g., editing schedules where dates might be stored as range objects). This fix only affects the save flow for new/edited specific date schedules.
