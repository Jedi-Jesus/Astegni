# Schedule System - Complete Database Analysis

## Database Schema (schedules table)

### Table Structure (22 columns)
```sql
CREATE TABLE schedules (
    id                      SERIAL PRIMARY KEY,
    scheduler_id            INTEGER NOT NULL,           -- User who created schedule
    scheduler_role          VARCHAR NOT NULL,           -- 'tutor', 'student', 'parent'
    title                   VARCHAR NOT NULL,
    description             TEXT,
    year                    INTEGER NOT NULL,           -- Single year only
    schedule_type           VARCHAR DEFAULT 'recurring', -- 'recurring' or 'specific'
    months                  TEXT[],                     -- Array: ['January', 'June', ...]
    days                    TEXT[],                     -- Array: ['Monday', 'Friday', ...]
    specific_dates          TEXT[],                     -- Array: ['2026-01-29', '2026-01-31', ...]
    start_time              TIME NOT NULL,
    end_time                TIME NOT NULL,
    notes                   TEXT,
    priority_level          VARCHAR DEFAULT 'medium',   -- 'low', 'medium', 'high', 'important', 'urgent'
    status                  VARCHAR DEFAULT 'active',   -- 'active' or 'draft'
    alarm_enabled           BOOLEAN DEFAULT false,
    alarm_before_minutes    INTEGER,
    notification_browser    BOOLEAN DEFAULT false,
    notification_sound      BOOLEAN DEFAULT false,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP,
    is_featured             BOOLEAN DEFAULT false
);
```

### Key Findings

#### ✅ Working Features
1. **Single Year Support** - Only `year` column exists (NOT `year_to`)
2. **Priority Levels** - 5 levels supported: low, medium, high, important, urgent
3. **Schedule Types** - recurring (with months/days) OR specific (with dates array)
4. **Role-Based** - Uses `scheduler_id` + `scheduler_role` for ownership
5. **Alarm System** - Full alarm/notification support built-in

#### ❌ Missing Features
1. **Year Range** - No `year_to` column (I suggested adding it but it doesn't exist)
2. **Backend doesn't support year ranges** - Only single year per schedule

## Current Database Data (5 Schedules)

### Schedule #1 - Tutor Recurring (High Priority)
```
ID: 1
Scheduler: User 3 (tutor role)
Title: "Debug Test Schedule"
Type: recurring
Year: 2026
Months: ['January']
Days: ['Monday']
Time: 09:00-10:00
Priority: high
Alarm: No
```

### Schedule #2 - Tutor Recurring (High Priority, Featured)
```
ID: 2
Scheduler: User 3 (tutor role)
Title: "Test schedule tutor recurring"
Type: recurring
Year: 2026
Months: ['January', 'June', 'July', 'November']
Days: ['Monday', 'Wednesday', 'Friday', 'Sunday']
Time: 04:04-05:04
Priority: high
Alarm: Yes (15 min before, browser notification)
Featured: Yes
```

### Schedule #3 - Parent Specific Dates (High Priority, Featured)
```
ID: 3
Scheduler: User 3 (parent role)
Title: "Test schedule parent specific"
Type: specific
Year: 2026
Specific Dates: ['2026-01-29', '2026-01-31', '2026-02-01', ..., '2026-02-07'] (9 dates)
Time: 05:26-07:26
Priority: high
Alarm: Yes (15 min before)
Featured: Yes
```

### Schedule #4 - Parent Specific Single Date (Urgent Priority, Featured)
```
ID: 4
Scheduler: User 3 (parent role)
Title: "Test schedule parent specific High priority"
Type: specific
Year: 2026
Specific Dates: ['2026-01-31'] (single date)
Time: 06:30-07:30
Priority: urgent
Alarm: Yes (15 min before)
Featured: Yes
```

### Schedule #5 - Parent Recurring (Low Priority, Featured)
```
ID: 5
Scheduler: User 3 (parent role)
Title: "Test schedule parent recurrsive"
Type: recurring
Year: 2026
Months: ['January', 'June', 'August', 'November']
Days: ['Monday', 'Wednesday', 'Friday', 'Sunday']
Time: 06:33-07:33
Priority: low
Alarm: Yes (15 min before)
Featured: Yes
```

## Backend API Structure

### Pydantic Models

#### ScheduleCreate
```python
class ScheduleCreate(BaseModel):
    title: str                              # REQUIRED
    description: Optional[str] = None
    year: int                               # REQUIRED - Single year only!
    schedule_type: str                      # 'recurring' or 'specific'
    months: List[str]                       # For recurring
    days: List[str]                         # For recurring
    specific_dates: Optional[List[str]] = []  # For specific
    start_time: str                         # REQUIRED
    end_time: str                           # REQUIRED
    notes: Optional[str] = None
    priority_level: str = "medium"
    status: str = "active"
    is_featured: bool = False
    alarm_enabled: bool = False
    alarm_before_minutes: Optional[int] = None
    notification_browser: bool = False
    notification_sound: bool = False
```

#### ScheduleResponse
Same fields as ScheduleCreate plus:
```python
id: int
scheduler_id: int
scheduler_role: str
created_at: datetime
updated_at: Optional[datetime]
```

## Frontend-Backend Mismatch

### ⚠️ Issue Found: year_to Field

**Frontend (schedule-manager.js):**
```javascript
const formData = {
    year: yearFrom || new Date().getFullYear().toString(),
    year_to: yearTo || null,  // ❌ NOT SUPPORTED BY BACKEND!
};
```

**Backend (schedule_endpoints.py):**
```python
year: int  # Only single year field
# year_to does NOT exist!
```

**HTML Modal:**
```html
<input id="schedule-year-from" required>  <!-- Used ✅ -->
<input id="schedule-year-to">             <!-- NOT USED BY BACKEND ❌ -->
```

### 🔧 Fix Required

The frontend is sending `year_to` but the backend ignores it! Two options:

#### Option 1: Remove year_to from Frontend (Quick Fix)
Remove the year_to field since backend doesn't support it.

#### Option 2: Add year_to to Backend (Feature Complete)
Add migration and backend support for year ranges.

## Priority Level Mapping

### Console Logs Show
```
Filtering by priority: medium (high), found 2 schedules
Filtering by priority: high (important), found 0 schedules
Filtering by priority: urgent (urgent), found 0 schedules
```

### Current Frontend Mapping
```javascript
const priorityMap = {
    'urgent': 'urgent',
    'high': 'important',
    'medium': 'high',
    'low': 'low'
};
```

### Database Values
- Schedule 1: `high`
- Schedule 2: `high`
- Schedule 3: `high`
- Schedule 4: `urgent`
- Schedule 5: `low`

### ⚠️ Mapping Issue
Frontend "medium" button → filters for backend "high" ✅ (finds 2)
Frontend "high" button → filters for backend "important" ❌ (finds 0, none exist)
Frontend "urgent" button → filters for backend "urgent" ✅ (would find 1)

**Problem:** No schedules have priority "important" - they use "high" instead!

## Specific Dates System

### How Backend Stores
```python
specific_dates: ['2026-01-29', '2026-01-31', '2026-02-01', ...]
```

### How Frontend Sends (with Date Ranges)
```javascript
selectedSpecificDates = [
    { type: 'single', date: '2024-03-15' },
    { type: 'range', fromDate: '2024-03-20', toDate: '2024-03-25' }
]
```

### ⚠️ Backend Doesn't Understand Date Ranges!

**Backend expects:** Flat array of date strings
**Frontend sends:** Array of objects with type/date/fromDate/toDate

### 🔧 Fix Required

Convert date ranges to flat array before sending:
```javascript
// Convert ranges to individual dates
const flatDates = [];
for (const item of selectedSpecificDates) {
    if (item.type === 'single') {
        flatDates.push(item.date);
    } else if (item.type === 'range') {
        // Generate all dates between fromDate and toDate
        let current = new Date(item.fromDate);
        const end = new Date(item.toDate);
        while (current <= end) {
            flatDates.push(current.toISOString().split('T')[0]);
            current.setDate(current.getDate() + 1);
        }
    }
}
```

## Required Fixes

### 1. Remove year_to from Frontend (Priority: HIGH)
```javascript
// In saveSchedule() - REMOVE this line:
year_to: yearTo || null,  // ❌ Backend doesn't support this
```

### 2. Fix Date Range to Flat Array Conversion (Priority: HIGH)
```javascript
// Convert date range objects to flat array
if (formData.schedule_type === 'specific') {
    const flatDates = convertDateRangesToFlat(selectedSpecificDates);
    formData.specific_dates = flatDates;
}
```

### 3. Fix Priority Mapping (Priority: MEDIUM)
The backend uses these values:
- 'low' (slider 1)
- 'medium' (slider 2)
- 'high' (slider 3)
- 'important' (slider 4)
- 'urgent' (slider 5)

But the filter mapping is incorrect. Should be:
```javascript
const priorityMap = {
    'urgent': 'urgent',    // Correct ✅
    'high': 'high',        // Fix: was 'important' ❌
    'medium': 'medium',    // Fix: was 'high' ❌
    'low': 'low'          // Correct ✅
};
```

## Summary

### ✅ What's Working
- Schedule creation (basic)
- Schedule viewing
- Schedule editing
- Schedule deletion
- Role-based filtering
- Search functionality
- Alarm settings
- Featured schedules

### ❌ What Needs Fixing
1. **year_to field** - Remove from frontend OR add to backend
2. **Date ranges** - Convert to flat array before sending
3. **Priority filter mapping** - Incorrect mapping causes empty results

### 📊 Database Statistics
- Total Schedules: 5
- By Role: 2 tutor, 3 parent, 0 student
- By Type: 3 recurring, 2 specific
- By Priority: 3 high, 1 urgent, 1 low
- Featured: 4 yes, 1 no
- With Alarms: 4 yes, 1 no

**Next Step:** Apply the 3 critical fixes to make the system fully functional!
