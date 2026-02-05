# Grade Level Range Filter Implementation

## Summary

Implemented a grade level range filter with **two dropdown selectors** (FROM-TO format) in the universal filters, allowing users to filter market data by a range of grade levels. The range is automatically expanded into an array and sent to the backend.

## Implementation

### 1. HTML - Two Dropdown Selectors

File: [modals/tutor-profile/package-management-modal.html](modals/tutor-profile/package-management-modal.html:170-210)

```html
<!-- Grade Level Filter (v2.3) - Range Selector -->
<div class="grade-level-filter" style="display: flex; align-items: center; gap: 0.5rem;">
    <label class="filter-label">Grade Level:</label>

    <!-- FROM dropdown -->
    <select id="universalGradeLevelFrom" onchange="handleUniversalFilterChange()"
        style="padding: 0.5rem 1rem; border: 2px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; background: white; cursor: pointer; min-width: 130px;">
        <option value="">All Levels</option>
        <option value="Grade 1">Grade 1</option>
        <!-- ... Grade 2-12 ... -->
        <option value="University">University</option>
        <option value="Adult Education">Adult Education</option>
    </select>

    <span style="color: var(--text-secondary); font-size: 0.9rem;">to</span>

    <!-- TO dropdown -->
    <select id="universalGradeLevelTo" onchange="handleUniversalFilterChange()"
        style="padding: 0.5rem 1rem; border: 2px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; background: white; cursor: pointer; min-width: 130px;">
        <option value="">All Levels</option>
        <option value="Grade 1">Grade 1</option>
        <!-- ... Grade 2-12 ... -->
        <option value="University">University</option>
        <option value="Adult Education">Adult Education</option>
    </select>
</div>
```

### 2. Frontend JavaScript - Range Expansion

File: [js/tutor-profile/market-trend-functions.js](js/tutor-profile/market-trend-functions.js)

#### Helper Function (lines 1369-1409)

```javascript
/**
 * Get the current universal grade level range selection
 * Returns an array of grade levels in the range, or null if both are empty
 */
function getUniversalGradeLevelRange() {
    const fromSelect = document.getElementById('universalGradeLevelFrom');
    const toSelect = document.getElementById('universalGradeLevelTo');

    const from = fromSelect && fromSelect.value ? fromSelect.value : null;
    const to = toSelect && toSelect.value ? toSelect.value : null;

    // If both are empty, return null
    if (!from && !to) return null;

    // Define grade level order for range expansion
    const gradeLevels = [
        'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
        'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12',
        'University', 'Adult Education'
    ];

    // If only one is selected, return single value array
    if (from && !to) return [from];
    if (!from && to) return [to];

    // Both are selected - expand the range
    const fromIndex = gradeLevels.indexOf(from);
    const toIndex = gradeLevels.indexOf(to);

    // Ensure from comes before to (swap if needed)
    const startIndex = Math.min(fromIndex, toIndex);
    const endIndex = Math.max(fromIndex, toIndex);

    // Return array of grade levels in range (inclusive)
    return gradeLevels.slice(startIndex, endIndex + 1);
}
```

#### Updated API Functions

**fetchMarketTutorData()** - Line 22:
```javascript
async function fetchMarketTutorData(timePeriodMonths, sessionFormat = null, gradeLevelRange = null) {
    // ...
    if (gradeLevelRange) {
        requestBody.grade_level = gradeLevelRange;  // Send array to backend
    }
}
```

**updateMarketGraph()** - Lines 319-324:
```javascript
const sessionFormat = getUniversalSessionFormat();
const gradeLevelRange = getUniversalGradeLevelRange();
const marketData = await fetchMarketTutorData(currentMarketTimePeriod, sessionFormat, gradeLevelRange);
```

**populateMarketTable()** - Lines 673-678:
```javascript
const sessionFormat = getUniversalSessionFormat();
const gradeLevelRange = getUniversalGradeLevelRange();
const marketData = await fetchMarketTutorData(currentMarketTimePeriod, sessionFormat, gradeLevelRange);
```

**suggestMarketPrice()** - Lines 793-809:
```javascript
const sessionFormat = getUniversalSessionFormat();
const universalGradeLevelRange = getUniversalGradeLevelRange();

const requestBody = {
    time_period_months: currentMarketTimePeriod,
    course_ids: currentPackage?.courses?.map(c => c.id) || null,
    grade_level: universalGradeLevelRange || (currentPackage?.gradeLevel ? [currentPackage.gradeLevel] : null),
    session_format: sessionFormat
};
```

### 3. Backend Updates

File: [astegni-backend/market_pricing_endpoints.py](astegni-backend/market_pricing_endpoints.py)

#### Updated Imports (line 9)
```python
from typing import Optional, List, Dict, Any, Union
```

#### Updated Pydantic Model (lines 219-223)
```python
class MarketPriceRequest(BaseModel):
    time_period_months: int = Field(default=3, ge=1, le=12, description="Time period in months (1-12)")
    course_ids: Optional[List[int]] = Field(default=None, description="Filter by specific courses")
    grade_level: Optional[Union[str, List[str]]] = Field(default=None, description="Filter by grade level (single value or array for range)")
    session_format: Optional[str] = Field(default=None, description="Filter by session format")
```

#### Updated SQL Filtering (lines 341-350 & 874-882)

**In both `/suggest-price` and `/market-tutors` endpoints:**

```python
# Grade level filter (grade_level is an array in database)
if request.grade_level:
    if isinstance(request.grade_level, list):
        # Range: Match packages that have ANY of the requested grade levels
        query_filters.append("pkg.grade_level && %s")
        query_params.append(request.grade_level)
    else:
        # Single value: Match packages that contain this grade level
        query_filters.append("%s = ANY(pkg.grade_level)")
        query_params.append(request.grade_level)
```

## How It Works

### User Interaction Flow

1. **User selects FROM dropdown**: e.g., "Grade 9"
2. **User selects TO dropdown**: e.g., "Grade 12"
3. **`handleUniversalFilterChange()` is triggered**
4. **`getUniversalGradeLevelRange()` expands the range**:
   ```javascript
   // User selected: Grade 9 to Grade 12
   // Function returns: ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
   ```
5. **Array is sent to backend**:
   ```json
   {
     "grade_level": ["Grade 9", "Grade 10", "Grade 11", "Grade 12"]
   }
   ```
6. **Backend filters with array overlap operator (`&&`)**:
   ```sql
   pkg.grade_level && ARRAY['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
   ```
   This matches any package that teaches at least ONE of these grade levels.

### Range Expansion Examples

| FROM | TO | Expanded Array |
|------|-----|---------------|
| Grade 9 | Grade 12 | ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] |
| Grade 1 | Grade 3 | ['Grade 1', 'Grade 2', 'Grade 3'] |
| University | (empty) | ['University'] |
| (empty) | Grade 5 | ['Grade 5'] |
| (empty) | (empty) | null (no filter) |
| Grade 12 | Grade 9 | ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] (auto-swapped) |

### Backend Filtering Logic

**Single Value** (backward compatibility):
```sql
-- If grade_level = "Grade 10"
WHERE 'Grade 10' = ANY(pkg.grade_level)
-- Matches: ['Grade 10'], ['Grade 9', 'Grade 10'], etc.
```

**Array Range** (new feature):
```sql
-- If grade_level = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
WHERE pkg.grade_level && ARRAY['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
-- Matches packages that have ANY overlap with requested range
```

## UI Design

The filter uses a horizontal layout with clear visual hierarchy:

```
Grade Level:  [Grade 9 ▼]  to  [Grade 12 ▼]
```

- **Label**: "Grade Level:"
- **FROM dropdown**: Min-width 130px
- **"to" text**: Gray, lowercase
- **TO dropdown**: Min-width 130px
- **Auto-update**: Changes immediately trigger filter application

## Testing

### Start Servers
```bash
cd astegni-backend
python app.py

# New terminal
python dev-server.py  # Port 8081
```

### Test Scenarios

1. **Range Selection**:
   - Set FROM: Grade 9
   - Set TO: Grade 12
   - Expected: Shows tutors teaching any of Grade 9, 10, 11, or 12
   - Console: `📊 Universal filters changed - Grade: Grade 9 to Grade 12 (4 levels)`

2. **Single Selection**:
   - Set FROM: Grade 10
   - Leave TO: All Levels
   - Expected: Shows tutors teaching only Grade 10
   - Console: `📊 Universal filters changed - Grade: Grade 10`

3. **Reverse Range** (auto-corrected):
   - Set FROM: Grade 12
   - Set TO: Grade 9
   - Expected: Automatically treats as Grade 9 to 12 (swapped)
   - Result: Same as scenario 1

4. **No Selection**:
   - Leave both: All Levels
   - Expected: Shows tutors of all grade levels
   - Console: `📊 Universal filters changed - Grade: All`

5. **Integration with Other Filters**:
   - Grade: Grade 9 to 12
   - Session Format: Online
   - Time Period: 6 months
   - Expected: All filters apply together (AND logic)

## Visual Result

**Before (Single Dropdown)**:
```
Grade Level: [Grade 10 ▼]
```

**After (Range Selector)**:
```
Grade Level: [Grade 9 ▼] to [Grade 12 ▼]
```

User can now:
- Select a range of grade levels (e.g., middle school: Grade 6-8)
- Select a single level (set only FROM or only TO)
- See all levels (leave both empty)
- Filter market data across multiple grade levels simultaneously

## Benefits

1. **Better UX**: Natural "from-to" range selection instead of multi-select
2. **Broader Filtering**: See market prices across multiple adjacent grade levels
3. **Flexible**: Supports single value, range, or no filter
4. **Backward Compatible**: Backend still accepts single string values
5. **Auto-Expansion**: Frontend handles range expansion, backend just filters by array

## Files Modified

### Frontend
- [modals/tutor-profile/package-management-modal.html](modals/tutor-profile/package-management-modal.html:170-210)
  - Changed from single dropdown to two dropdown range selector

- [js/tutor-profile/market-trend-functions.js](js/tutor-profile/market-trend-functions.js)
  - Line 22: Updated `fetchMarketTutorData()` signature
  - Lines 1369-1409: Added `getUniversalGradeLevelRange()` with range expansion logic
  - Lines 1434-1442: Updated `handleUniversalFilterChange()` to use range array
  - Lines 319-324: Updated `updateMarketGraph()` to pass range
  - Lines 673-678: Updated `populateMarketTable()` to pass range
  - Lines 793-809: Updated `suggestMarketPrice()` to pass range

### Backend
- [astegni-backend/market_pricing_endpoints.py](astegni-backend/market_pricing_endpoints.py)
  - Line 9: Added `Union` import
  - Line 222: Updated `grade_level` field to accept `Union[str, List[str]]`
  - Lines 341-350: Updated `/suggest-price` grade level filtering
  - Lines 874-882: Updated `/market-tutors` grade level filtering

---

**Last Updated**: 2026-01-22
**Version**: 2.3
**Status**: Complete ✅
**Related**:
- [GRADE_LEVEL_FILTER_DISPLAY.md](GRADE_LEVEL_FILTER_DISPLAY.md)
- [MARKET_PRICE_V2.3_SEPARATED_SCORES.md](MARKET_PRICE_V2.3_SEPARATED_SCORES.md)
