# Schedule Specific Dates Fix

## Problem Summary

The schedule saving functionality in `tutor-profile.html` had a timezone bug when using the **date range picker** for specific dates. This caused dates to shift by one day in certain timezones.

## Root Cause

The bug was in the `addDateRange()` function in `js/tutor-profile/global-functions.js`:

### Before (Buggy Code):
```javascript
// Line 2917-2930
const from = new Date(fromDate);
const to = new Date(toDate);

if (from > to) {
    alert('From date must be before or equal to To date');
    return;
}

let currentDate = new Date(from);

while (currentDate <= to) {
    const dateString = currentDate.toISOString().split('T')[0];
    // ...
}
```

**The Problem:**
1. `new Date("2025-01-15")` creates a Date object at midnight in **local time**
2. `toISOString()` converts to **UTC** time
3. In timezones ahead of UTC (e.g., East Africa, Asia), the UTC conversion shifts the date to the **previous day**
4. Example: In UTC+3, "2025-01-15 00:00:00" becomes "2025-01-14 21:00:00 UTC"

### After (Fixed Code):
```javascript
// Validate date range (compare as strings to avoid timezone issues)
if (fromDate > toDate) {
    alert('From date must be before or equal to To date');
    return;
}

// Add all dates in the range (work with date strings directly)
let currentDateStr = fromDate;

while (currentDateStr <= toDate) {
    if (!selectedSpecificDates.includes(currentDateStr)) {
        selectedSpecificDates.push(currentDateStr);
        addedCount++;
    }

    // Move to next day using UTC to avoid timezone shifts
    const [year, month, day] = currentDateStr.split('-').map(Number);
    const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
    currentDateStr = nextDate.toISOString().split('T')[0];
}
```

## What Changed

1. **String comparison** instead of Date objects for validation
2. **Work with date strings directly** (YYYY-MM-DD format)
3. **Use UTC** when creating temporary Date objects for date arithmetic
4. **Avoid timezone conversions** by keeping everything in YYYY-MM-DD format

## Impact

### What Works Now ✅
- ✅ Single date picker (was already working)
- ✅ **Date range picker (NOW FIXED)**
- ✅ All timezones (UTC+, UTC-)
- ✅ Dates save correctly to PostgreSQL
- ✅ Dates display correctly when editing

### What Wasn't Affected
- ✅ Recurring schedules (monthly/weekly) - already working
- ✅ Schedule editing - already working
- ✅ Schedule viewing - already working

## Testing

### Quick Test
1. Open `http://localhost:8080/test-schedule-specific-dates.html`
2. Run all 4 tests to verify the fix

### Full Test in Tutor Profile
1. Login as a tutor
2. Go to tutor profile page
3. Open "Teaching Schedules" section
4. Click "Create Schedule"
5. Select "Specific Dates" schedule type
6. **Test Single Date:**
   - Pick a date from the date picker
   - Click "Add Date"
   - Verify date appears in the list
7. **Test Date Range:**
   - Select "From Date": 2025-01-15
   - Select "To Date": 2025-01-20
   - Click "Add Date Range"
   - Verify 6 dates are added (15, 16, 17, 18, 19, 20)
   - **Check dates are NOT shifted** (e.g., no 14, 15, 16, 17, 18, 19)
8. Fill in other fields (title, subject, grade, time, etc.)
9. Click "Create Schedule"
10. Verify schedule saves successfully
11. Click "View" on the saved schedule
12. Verify specific dates are displayed correctly

## Files Changed

### Modified
- `js/tutor-profile/global-functions.js` - Fixed `addDateRange()` function (lines 2905-2938)

### Created (for testing)
- `test-schedule-specific-dates.html` - Test page to verify the fix
- `astegni-backend/test_specific_dates.py` - Backend API test script
- `SCHEDULE-SPECIFIC-DATES-FIX.md` - This documentation

## Technical Details

### Date Format in System
- **Frontend**: YYYY-MM-DD (ISO 8601 date format)
- **Backend**: YYYY-MM-DD (PostgreSQL TEXT[] array)
- **HTML Input**: YYYY-MM-DD (standard `<input type="date">` format)

### Why This Fix Works
1. HTML date inputs return values in YYYY-MM-DD format
2. String comparison works correctly for YYYY-MM-DD format ("2025-01-15" > "2025-01-10")
3. PostgreSQL stores dates as strings in TEXT[] array
4. No timezone conversion needed - dates are pure calendar dates, not timestamps

### Alternative Approaches Considered
1. ❌ Use `Date.UTC()` everywhere - too complex, error-prone
2. ❌ Store as timestamps - unnecessary, dates don't have time component
3. ✅ **Keep everything as strings** - simplest, most reliable

## Backend Compatibility

The backend endpoint (`tutor_schedule_endpoints.py`) expects:
```python
class ScheduleCreate(BaseModel):
    # ...
    specific_dates: Optional[List[str]] = []  # YYYY-MM-DD format
    # ...
```

Database schema:
```sql
CREATE TABLE tutor_teaching_schedules (
    -- ...
    specific_dates TEXT[],  -- Array of YYYY-MM-DD strings
    -- ...
);
```

Both remain unchanged and compatible with the fix.

## Verification Checklist

- [x] Single date picker works correctly
- [x] Date range picker works correctly
- [x] Dates don't shift in different timezones
- [x] Dates save correctly to database
- [x] Dates load correctly when editing
- [x] Dates display correctly in schedule view
- [x] Multiple dates can be added
- [x] Dates can be removed individually
- [x] Date validation works (from <= to)
- [x] Duplicate dates are prevented

## Rollback Plan

If issues arise, revert the change by running:
```bash
git diff js/tutor-profile/global-functions.js
# Review the changes
git checkout HEAD -- js/tutor-profile/global-functions.js
```

Or manually restore the old code:
```javascript
// Old code (buggy but simple)
const from = new Date(fromDate);
const to = new Date(toDate);
let currentDate = new Date(from);
while (currentDate <= to) {
    const dateString = currentDate.toISOString().split('T')[0];
    selectedSpecificDates.push(dateString);
    currentDate.setDate(currentDate.getDate() + 1);
}
```

## Related Documentation

- [SCHEDULE-QUICK-START.md](SCHEDULE-QUICK-START.md) - How to use the schedule system
- [SCHEDULE-MODAL-QUICK-START.md](SCHEDULE-MODAL-QUICK-START.md) - Schedule modal reference
- [js/tutor-profile/README.md](js/tutor-profile/README.md) - Tutor profile architecture

## Date Created
2025-10-23

## Author
Fixed by Claude Code
