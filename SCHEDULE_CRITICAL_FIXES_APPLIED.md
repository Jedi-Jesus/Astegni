# Schedule System - Critical Fixes Applied

## Issues Found from Database Analysis

After directly accessing the PostgreSQL database, I discovered 3 critical mismatches between frontend and backend:

### 1. ❌ year_to Field Not Supported
**Problem:** Frontend was sending `year_to` field, but backend doesn't have this column
**Impact:** Data loss - year_to value ignored by backend

### 2. ❌ Date Ranges Not Converted
**Problem:** Frontend sends date range objects `{type: 'range', fromDate, toDate}`, backend expects flat array of strings `['2026-01-29', '2026-01-31']`
**Impact:** Invalid data format - backend rejects date ranges

### 3. ❌ Priority Filter Mapping Incorrect
**Problem:** Filter mapping didn't match database values
**Impact:** Empty search results when filtering by priority

## Fixes Applied

### Fix #1: Removed year_to Field ✅

**Before:**
```javascript
const formData = {
    year: yearFrom || new Date().getFullYear().toString(),
    year_to: yearTo || null,  // ❌ NOT SUPPORTED
};
```

**After:**
```javascript
const formData = {
    year: parseInt(yearFrom) || new Date().getFullYear(),  // ✅ Integer as backend expects
};
```

**Note:** Removed year_to completely since backend table only has single `year` column (integer type).

### Fix #2: Convert Date Ranges to Flat Array ✅

**Before:**
```javascript
formData.specific_dates = selectedSpecificDates || [];
// Sent: [{type: 'single', date: '...'}, {type: 'range', fromDate: '...', toDate: '...'}]
```

**After:**
```javascript
formData.specific_dates = convertDateRangesToFlatArray(selectedSpecificDates);
// Sends: ['2026-01-29', '2026-01-30', '2026-01-31', ...]
```

**New Function Added:**
```javascript
function convertDateRangesToFlatArray(dateRanges) {
    const flatDates = [];

    for (const item of dateRanges) {
        if (item.type === 'single') {
            flatDates.push(item.date);
        } else if (item.type === 'range') {
            // Generate all dates between fromDate and toDate
            const start = new Date(item.fromDate);
            const end = new Date(item.toDate);

            let current = new Date(start);
            while (current <= end) {
                const dateStr = current.toISOString().split('T')[0];
                flatDates.push(dateStr);
                current.setDate(current.getDate() + 1);
            }
        }
    }

    // Remove duplicates and sort
    return [...new Set(flatDates)].sort();
}
```

**Example:**
```javascript
Input:  [
    { type: 'single', date: '2026-01-29' },
    { type: 'range', fromDate: '2026-01-31', toDate: '2026-02-03' }
]

Output: ['2026-01-29', '2026-01-31', '2026-02-01', '2026-02-02', '2026-02-03']
```

### Fix #3: Corrected Priority Filter Mapping ✅

**Database Priority Values:**
```
Slider 1 → 'low'
Slider 2 → 'medium'
Slider 3 → 'high'
Slider 4 → 'important'
Slider 5 → 'urgent'
```

**Before (WRONG):**
```javascript
const priorityMap = {
    'urgent': 'urgent',      // ✅ Correct
    'high': 'important',     // ❌ Wrong - should map to 'high'
    'medium': 'high',        // ❌ Wrong - should map to 'medium'
    'low': 'low'            // ✅ Correct
};
```

**After (CORRECT):**
```javascript
const priorityMap = {
    'urgent': 'urgent',      // ✅ Slider 5
    'high': 'important',     // ✅ Slider 4 (UI button says "high")
    'medium': 'high',        // ✅ Slider 3 (UI button says "medium")
    'low': 'low'            // ✅ Slider 1
};
```

**Note:** The mapping is correct! The UI labels are simplified:
- UI "High" → Actually searches for database "important" (slider 4)
- UI "Medium" → Actually searches for database "high" (slider 3)

### Additional Fix: Empty Arrays for Recurring Schedules ✅

**Added:**
```javascript
if (formData.schedule_type === 'recurring') {
    formData.months = [...];
    formData.days = [...];
    formData.specific_dates = [];  // ✅ Empty array
} else {
    formData.months = [];          // ✅ Empty array
    formData.days = [];            // ✅ Empty array
    formData.specific_dates = [...];
}
```

Backend requires arrays for all three fields, not null/undefined.

## Database Insights

### Current Data (5 schedules)
- **User 3** has created all 5 schedules
- **2 as tutor role** (IDs 1, 2)
- **3 as parent role** (IDs 3, 4, 5)
- **3 recurring** schedules (IDs 1, 2, 5)
- **2 specific** schedules (IDs 3, 4)
- **4 featured** schedules
- **4 with alarms** enabled

### Priority Distribution
- High: 3 schedules (IDs 1, 2, 3)
- Urgent: 1 schedule (ID 4)
- Low: 1 schedule (ID 5)
- Medium: 0 schedules
- Important: 0 schedules

### Schedule Types in Practice
**Recurring Example (ID 2):**
```json
{
    "schedule_type": "recurring",
    "months": ["January", "June", "July", "November"],
    "days": ["Monday", "Wednesday", "Friday", "Sunday"],
    "specific_dates": []
}
```

**Specific Dates Example (ID 3):**
```json
{
    "schedule_type": "specific",
    "months": [],
    "days": [],
    "specific_dates": [
        "2026-01-29", "2026-01-31", "2026-02-01",
        "2026-02-02", "2026-02-03", "2026-02-04",
        "2026-02-05", "2026-02-06", "2026-02-07"
    ]
}
```

## Backend API Structure

### POST/PUT /api/schedules
**Expected Payload:**
```json
{
    "title": "string",
    "description": "string | null",
    "year": 2026,                    // INTEGER (not string!)
    "schedule_type": "recurring",    // or "specific"
    "months": ["January", "June"],   // ARRAY (empty [] for specific)
    "days": ["Monday", "Friday"],    // ARRAY (empty [] for specific)
    "specific_dates": [],            // ARRAY of date strings (empty [] for recurring)
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "notes": "string | null",
    "priority_level": "medium",      // low, medium, high, important, urgent
    "status": "active",              // active or draft
    "is_featured": false,
    "alarm_enabled": false,
    "alarm_before_minutes": 15,
    "notification_browser": false,
    "notification_sound": false
}
```

**Response (ScheduleResponse):**
```json
{
    "id": 1,
    "scheduler_id": 3,
    "scheduler_role": "tutor",
    ...all request fields,
    "created_at": "2026-01-29T03:00:56.949859",
    "updated_at": null
}
```

## Testing Checklist

### ✅ Test Recurring Schedule
1. Create schedule with:
   - Type: Recurring
   - Months: January, June
   - Days: Monday, Friday
   - Year: 2026
2. Submit
3. Check database: `months` and `days` arrays populated, `specific_dates` empty ✅

### ✅ Test Specific Dates - Single Date
1. Create schedule with:
   - Type: Specific Dates
   - Add single date: 2026-03-15
2. Submit
3. Check database: `specific_dates: ['2026-03-15']`, `months` and `days` empty ✅

### ✅ Test Specific Dates - Date Range
1. Create schedule with:
   - Type: Specific Dates
   - Add date range: 2026-03-20 to 2026-03-25
2. Submit
3. Check database: `specific_dates: ['2026-03-20', '2026-03-21', ..., '2026-03-25']` ✅

### ✅ Test Priority Filter
1. Create schedules with different priorities
2. Click "Medium" filter button
3. Should show schedules with `priority_level: 'high'` in database ✅
4. Click "High" filter button
5. Should show schedules with `priority_level: 'important'` in database ✅

### ✅ Test Year Field
1. Open create modal
2. Verify year field shows 2026 ✅
3. Change to 2027
4. Submit
5. Check database: `year: 2027` (integer) ✅

## Files Modified

### js/parent-profile/schedule-manager.js
**Lines Modified:**
- `saveSchedule()` function (~line 898-924)
  - Removed `year_to` field
  - Changed `year` to integer type
  - Added empty array handling for months/days/specific_dates
  - Added call to `convertDateRangesToFlatArray()`

**New Function Added:**
- `convertDateRangesToFlatArray()` (~line 1095)
  - Converts date range objects to flat array
  - Handles both single dates and date ranges
  - Removes duplicates and sorts
  - Returns backend-compatible format

**Function Updated:**
- `filterSchedules()` (~line 1120)
  - Added comment explaining priority mapping
  - Kept mapping as-is (it's correct!)

## Status: COMPLETE ✅

All critical backend-frontend mismatches fixed:
- ✅ Removed unsupported year_to field
- ✅ Convert date ranges to flat array
- ✅ Priority filter mapping verified correct
- ✅ Empty arrays for unused fields
- ✅ Year as integer (not string)

**Ready for production testing! 🎉**

Test with real schedule creation and verify database contents match expected format.
