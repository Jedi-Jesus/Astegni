# Grade Level Universal Filter Implementation

## Summary

Added grade level as a universal filter (dropdown select) in the market pricing system, allowing users to filter market data by specific grade levels across all views (graphs, tables, and price calculations).

## Implementation

### 1. HTML Dropdown (modals/tutor-profile/package-management-modal.html)

Added a dropdown select in the universal-filters-container (lines 170-191):

```html
<div class="grade-level-filter">
    <label class="filter-label">Grade Level:</label>
    <select id="universalGradeLevel" onchange="handleUniversalFilterChange()"
        style="padding: 0.5rem 1rem; border: 2px solid var(--border-color); border-radius: 6px; font-size: 0.9rem; background: white; cursor: pointer; min-width: 150px;">
        <option value="">All Levels</option>
        <option value="Grade 1">Grade 1</option>
        <option value="Grade 2">Grade 2</option>
        <!-- ... through Grade 12 -->
        <option value="University">University</option>
        <option value="Adult Education">Adult Education</option>
    </select>
</div>
```

### 2. JavaScript Helper Function (js/tutor-profile/market-trend-functions.js)

Added `getUniversalGradeLevel()` helper function (lines 1361-1367):

```javascript
/**
 * Get the current universal grade level selection
 */
function getUniversalGradeLevel() {
    const gradeLevelSelect = document.getElementById('universalGradeLevel');
    return gradeLevelSelect && gradeLevelSelect.value ? gradeLevelSelect.value : null;
}
```

### 3. Updated Universal Filter Handler (lines 1393-1402)

```javascript
window.handleUniversalFilterChange = function() {
    const sessionFormat = getUniversalSessionFormat();
    const timePeriod = getUniversalTimePeriod();
    const gradeLevel = getUniversalGradeLevel();

    console.log('📊 Universal filters changed - Format:', sessionFormat, 'Period:', timePeriod, 'months', 'Grade:', gradeLevel || 'All');
    // ... rest of handler
}
```

### 4. Updated API Functions

#### fetchMarketTutorData() - Line 22
```javascript
async function fetchMarketTutorData(timePeriodMonths, sessionFormat = null, gradeLevel = null) {
    // ...
    const requestBody = {
        time_period_months: timePeriodMonths
    };

    if (sessionFormat) {
        requestBody.session_format = sessionFormat;
    }

    if (gradeLevel) {
        requestBody.grade_level = gradeLevel;
    }
    // ... rest of function
}
```

#### updateMarketGraph() - Lines 319-324
```javascript
// Get filters from universal filter
const sessionFormat = getUniversalSessionFormat();
const gradeLevel = getUniversalGradeLevel();

// Fetch ONLY similar tutors from API
const marketData = await fetchMarketTutorData(currentMarketTimePeriod, sessionFormat, gradeLevel);
```

#### populateMarketTable() - Lines 673-678
```javascript
// Get filters from universal filter (v2.2)
const sessionFormat = getUniversalSessionFormat();
const gradeLevel = getUniversalGradeLevel();

// Fetch real market data from API with filters (v2.3)
const marketData = await fetchMarketTutorData(currentMarketTimePeriod, sessionFormat, gradeLevel);
```

#### suggestMarketPrice() - Lines 793-809
```javascript
// Get filters from universal filter (v2.3)
const sessionFormat = getUniversalSessionFormat();
const universalGradeLevel = getUniversalGradeLevel();

// Get current package data for filters (if available)
let currentPackage = null;
if (window.packageManagerClean && typeof window.packageManagerClean.getCurrentPackage === 'function') {
    currentPackage = window.packageManagerClean.getCurrentPackage();
}

const requestBody = {
    time_period_months: currentMarketTimePeriod,
    course_ids: currentPackage?.courses?.map(c => c.id) || null,
    grade_level: universalGradeLevel || currentPackage?.gradeLevel || null,  // Prioritize universal filter
    session_format: sessionFormat
};
```

## How It Works

1. **User Selection**: User selects a grade level from the dropdown (or leaves it as "All Levels")
2. **Auto-Update**: The `onchange="handleUniversalFilterChange()"` event triggers when selection changes
3. **Filter Application**: The selected grade level is passed to all API calls via `getUniversalGradeLevel()`
4. **Backend Filtering**: Backend filters market data to only include tutors teaching that grade level
5. **Display Update**: All views (graph, table, price) automatically update with filtered data

## Priority Logic

The price calculation uses this priority for grade level:
1. **Universal filter grade level** (from dropdown) - Highest priority
2. **Package grade level** (from current package) - Fallback
3. **null** (all grade levels) - If neither is set

This allows the universal filter to override the package's grade level when specified.

## Backend Support

Grade level is already supported in the backend (market_pricing_endpoints.py):

```python
# In MarketPriceRequest model
grade_level: Optional[str] = Field(default=None, description="Filter by grade level")

# In SQL query filtering
if request.grade_level:
    query_filters.append("%s = ANY(pkg.grade_level)")
    query_params.append(request.grade_level)
```

The backend filters packages where the requested grade level exists in the `grade_level` array.

## Files Modified

### [modals/tutor-profile/package-management-modal.html](modals/tutor-profile/package-management-modal.html)
- Lines 170-191: Added grade level dropdown in universal-filters-container

### [js/tutor-profile/market-trend-functions.js](js/tutor-profile/market-trend-functions.js)
- Line 22: Updated `fetchMarketTutorData()` to accept gradeLevel parameter
- Lines 35-39: Added gradeLevel to request body
- Lines 319-324: Updated `updateMarketGraph()` to use grade level filter
- Lines 673-678: Updated `populateMarketTable()` to use grade level filter
- Lines 793-809: Updated `suggestMarketPrice()` to use grade level filter with priority logic
- Lines 1361-1367: Added `getUniversalGradeLevel()` helper function
- Lines 1393-1402: Updated `handleUniversalFilterChange()` to include grade level

## Testing

To test the grade level universal filter:

1. **Start servers:**
```bash
cd astegni-backend
python app.py

# New terminal
python dev-server.py  # Port 8081
```

2. **Test in browser:**
- Go to http://localhost:8081
- Login as tutor
- Open Package Management Modal → Pricing Trends
- Select a grade level from the dropdown (e.g., "Grade 10")
- Observe that all views (graph, table, price) now show only tutors teaching Grade 10

3. **Expected behavior:**
- Grade level dropdown defaults to "All Levels"
- When changed, automatically updates the current view
- Price calculation uses universal filter's grade level over package grade level
- Console shows: `📊 Universal filters changed - Format: Online Period: 3 months Grade: Grade 10`

## Dropdown Format

The grade level filter is implemented as a **dropdown select** (not radio buttons) to match the consistent pattern of the universal filters. This provides:
- Compact UI (doesn't take much space)
- Easy scanning of all options
- Consistent with professional filter patterns
- Better UX for 15+ grade level options

---

**Last Updated**: 2026-01-22
**Version**: 2.3
**Status**: Complete ✅
**Related**:
- [GRADE_LEVEL_FILTER_DISPLAY.md](GRADE_LEVEL_FILTER_DISPLAY.md)
- [MARKET_PRICE_V2.3_SEPARATED_SCORES.md](MARKET_PRICE_V2.3_SEPARATED_SCORES.md)
