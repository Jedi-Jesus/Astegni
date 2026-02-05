# Grade Level Filter Display Integration

## Summary

Added grade_level filter information to the market pricing UI to show when price suggestions are filtered by specific grade levels.

## Implementation Approach

**Note:** Grade level is implemented as a **filter** rather than a **similarity factor** because:

1. **Package-specific**: Grade level is stored per package, not per tutor profile
2. **Multiple values**: Each tutor can teach multiple grade levels across different packages
3. **Already filtered**: The API already filters market data by grade_level before calculating similarity
4. **Not comparable**: Unlike experience or credentials, grade level isn't a metric you can compare between tutors

## What Changed

### Price Breakdown Display

Added conditional display of grade level filter in the price suggestion breakdown:

```javascript
${data.factors.filters_applied?.grade_level ?
  `<li>Grade level filter: <strong style="color: var(--primary-color);">
    ${data.factors.filters_applied.grade_level}
  </strong> (prices from tutors teaching this level)</li>`
: ''}
```

**Example output:**
- "Grade level filter: **Grade 10** (prices from tutors teaching this level)"
- "Grade level filter: **University** (prices from tutors teaching this level)"

### When It Displays

The grade level filter information appears when:
1. User has a package with a specific grade_level set
2. The API filters market tutors by this grade level
3. The price suggestion is calculated from tutors teaching that grade level

### Backend Support

Grade level is already supported in the backend:

```python
# In MarketPriceRequest
grade_level: Optional[str] = Field(default=None, description="Filter by grade level")

# In query filtering
if request.grade_level:
    query_filters.append("%s = ANY(pkg.grade_level)")
    query_params.append(request.grade_level)
```

## Files Modified

### [market-trend-functions.js](js/tutor-profile/market-trend-functions.js)

**Line 927**: Added grade level filter display in price breakdown

```javascript
// Show grade level if filtered
${data.factors.filters_applied?.grade_level ?
  `<li>Grade level filter: <strong>${data.factors.filters_applied.grade_level}</strong>
   (prices from tutors teaching this level)</li>`
: ''}
```

## Visual Result

### Before:
```
📊 Price Breakdown:
- Market average: 150.00 ETB
- Price range in market: 100 - 250 ETB
...
- Session format filter: Online only (prices based on online market)
- Suggested price range: 140 - 170 ETB
```

### After (with grade level filter):
```
📊 Price Breakdown:
- Market average: 150.00 ETB
- Price range in market: 100 - 250 ETB
...
- Grade level filter: Grade 10 (prices from tutors teaching this level)
- Session format filter: Online only (prices based on online market)
- Suggested price range: 140 - 170 ETB
```

## Why Not a Similarity Factor?

Grade level was **NOT** added as a similarity factor (like experience or credentials) because:

### 1. **Data Structure Issue**
```sql
-- Grade level is an ARRAY per package
pkg.grade_level = ['Grade 9', 'Grade 10', 'Grade 11']

-- Not a single value per tutor
tutor.experience_years = 5  -- Single value, can compare
```

### 2. **Already Filtered**
The API already filters by grade level BEFORE calculating similarity:
```sql
WHERE %s = ANY(pkg.grade_level)  -- Pre-filters the data
```

So tutors are already matched by grade level - adding it as a similarity factor would be redundant.

### 3. **Comparison Complexity**
```javascript
// Easy to compare:
experience_diff = abs(tutor1.experience_years - tutor2.experience_years)

// Complex to compare:
grade_diff = ??? // How do you compare ['Grade 9', 'Grade 10'] vs ['Grade 10', 'Grade 11']?
```

### 4. **Use Case**
- **Experience/Credentials**: "Tutors with similar experience charge similar prices"
- **Grade Level**: "Show me prices for Grade 10 tutors" (filter, not comparison)

## Alternative: Course-Level Filtering

If you want more granular filtering, consider:
- **Course IDs**: Already supported (`request.course_ids`)
- **Subject areas**: Could be added as filter
- **Difficulty level**: Could be calculated from course complexity

## Testing

To test grade level filter display:

1. **With grade level filter:**
```javascript
// Package has grade_level set
const requestBody = {
    time_period_months: 3,
    grade_level: "Grade 10",  // This triggers the filter display
    session_format: "online"
};
```

2. **Without grade level filter:**
```javascript
// No grade level specified
const requestBody = {
    time_period_months: 3,
    session_format: "online"  // Only session format shows
};
```

3. **Expected results:**
- With filter: Shows "Grade level filter: Grade 10..." in breakdown
- Without filter: Grade level line doesn't appear
- Filter is always applied before similarity calculation

## Future Enhancements

If you want to add grade level as a similarity factor, you would need to:

1. **Aggregate to tutor level:**
```sql
-- Calculate "primary grade level" per tutor
SELECT tutor_id,
  mode() WITHIN GROUP (ORDER BY unnest(grade_level)) as primary_grade
```

2. **Create categorical mapping:**
```javascript
const gradeLevels = {
  'Grade 1-6': 1,
  'Grade 7-9': 2,
  'Grade 10-12': 3,
  'University': 4
};
```

3. **Calculate categorical similarity:**
```javascript
const grade_diff = abs(gradeMap[tutor1.grade] - gradeMap[tutor2.grade]);
const grade_similarity = 1 - (grade_diff / max_grade_diff);
```

But this adds significant complexity for limited benefit since filtering already handles it.

---

**Last Updated**: 2026-01-22
**Version**: 2.3
**Related**:
- [MARKET_PRICE_V2.3_SEPARATED_SCORES.md](MARKET_PRICE_V2.3_SEPARATED_SCORES.md)
- [MARKET_GRAPH_METRICS_V2.3_UPDATE.md](MARKET_GRAPH_METRICS_V2.3_UPDATE.md)
