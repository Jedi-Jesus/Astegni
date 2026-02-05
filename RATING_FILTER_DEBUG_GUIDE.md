# Rating Filter Comprehensive Debug Guide

## How to Use This Debug System

### 1. Open Browser Console
1. Open http://localhost:8081/branch/find-tutors.html
2. Press F12 or Right-click → Inspect → Console tab
3. Clear console (Ctrl+L or click 🚫 icon)

### 2. Set a Rating Filter
1. In the sidebar, find the "Rating" section
2. Type a value in the "Min" input (e.g., `4.0`)
3. Watch the console as you type

### 3. Expected Console Output

```
=== STEP 1: UI LAYER ===
[UI] minRating filter changed: 4
[UI] Input element: <input type="number" placeholder="Min" min="0" max="5" step="0.1" class="rating-input" name="minRating">
[UI] Raw value (not trimmed): 4

=== STEP 2: STATE LAYER ===
[State] updateFilter called: minRating = 4 (type: string)
[State] Previous value:
[State] New value stored: 4
[State] Complete filters object: {search: '', subject: '', minRating: '4', ...}

=== STEP 3: CONTROLLER LAYER ===
[Controller] === LOAD TUTORS START ===
[Controller] Current state filters: {minRating: '4', tiered: true, sortBy: 'smart'}
[Controller] Params BEFORE cleanup: {page: 1, limit: 12, minRating: '4', ...}
[Controller] Params AFTER cleanup: {page: 1, limit: 12, minRating: '4', ...}
[Controller] === Calling FindTutorsAPI.getTutors ===

=== STEP 4: API LAYER ===
[API] Building backend params from: {page: 1, limit: 12, minRating: '4', tiered: true}
[API] === RATING FILTER CHECK ===
[API] params.minRating: 4 type: string
[API] params.maxRating:  type: string
[API] minRating !== undefined: true
[API] minRating !== "": true
[API] ✅ ADDED min_rating to backendParams: 4
[API] ❌ SKIPPED max_rating - condition failed

[API] === FINAL API CALL ===
[API] Mode: TIERED
[API] Backend params object: {page: 1, limit: 12, min_rating: '4'}
[API] Query string: page=1&limit=12&min_rating=4
[API] Full URL will be: http://localhost:8000/api/tutors/tiered?page=1&limit=12&min_rating=4
[API] Fetching from: /tutors/tiered?page=1&limit=12&min_rating=4
```

### 4. Backend Console Output (Terminal)

Check your terminal where `python app.py` is running:

```
[Tiered Tutors] === REQUEST PARAMETERS ===
  search: None
  subject: None
  gender: None
  min_grade_level: None
  max_grade_level: None
  sessionFormat: None
  min_price: None
  max_price: None
  min_rating: 4.0          ← SHOULD SEE YOUR VALUE HERE
  max_rating: None
  sort_by: None
  page: 1, limit: 12

[Tiered Tutors] Applying interest/hobby matching for 150 tutors
[Tiered Tutors] Tier 1: 25 tutors (interests)
[Tiered Tutors] Tier 2: 18 tutors (hobbies)
[Tiered Tutors] Tier 3: 107 tutors (others)

[Post-Tiering Filters] Fetched data for 150 tutors
[Post-Tiering Filters] Package data: 145 tutors
[Post-Tiering Filters] Rating data: 120 tutors

[Rating Filter] Tutor 5 filtered out: rating 2.80 < min 4.0
[Rating Filter] Tutor 6 filtered out: rating 3.40 < min 4.0
[Rating Filter] Tutor 12 filtered out: rating 3.20 < min 4.0
... (more filtered tutors)

[Post-Tiering Filters] === FILTER RESULTS ===
  Initial tutors (after tiering): 150
  After all filters: 45
  Filtered out: 105
  Rating filter removed: 105 tutors
```

## Debugging Scenarios

### Scenario 1: Value Not Reaching State
**Symptom**: `[State] New value stored:` shows empty value

**Check**:
```javascript
// Look at UI layer output
[UI] minRating filter changed: 4      // ← Is this showing?
[UI] Raw value (not trimmed): 4       // ← Is this showing?
```

**Solution**: Check if event listener is attached correctly
```javascript
// In browser console, run:
document.querySelector('input[name="minRating"]')
// Should return the input element, not null
```

### Scenario 2: Value Not Reaching API
**Symptom**: `[Controller] Params AFTER cleanup` doesn't include minRating

**Check**:
```javascript
[Controller] Removing empty param: minRating =
```

**Problem**: Value is empty string, getting removed by cleanup logic

**Solution**: Value should be non-empty string like '4', not ''

### Scenario 3: Value Not Added to Backend Params
**Symptom**: `[API] ❌ SKIPPED min_rating - condition failed`

**Check the conditions**:
```javascript
[API] params.minRating: undefined type: undefined     // ← PROBLEM
// OR
[API] params.minRating:  type: string                 // ← Empty string PROBLEM
```

**Solution**:
- If `undefined`: Value didn't reach API layer
- If empty string: Input was cleared or trimmed to empty

### Scenario 4: Backend Not Receiving Parameter
**Symptom**: Backend logs show `min_rating: None`

**Check**:
1. Frontend URL should show: `?min_rating=4`
2. If missing from URL: Check Step 3 output
3. If in URL but backend shows None: Backend parameter naming issue

**Verify parameter names match**:
- Frontend sends: `min_rating` (snake_case)
- Backend expects: `min_rating` (snake_case)

### Scenario 5: Backend Receives But Doesn't Filter
**Symptom**: Backend shows `min_rating: 4.0` but no tutors filtered

**Check**:
```
[Post-Tiering Filters] Rating data: 0 tutors    // ← NO RATING DATA
```

**Problem**: No tutors have reviews in database

**Solution**: Verify tutor_reviews table has data:
```sql
SELECT COUNT(*) FROM tutor_reviews;
SELECT tutor_id, AVG((subject_understanding_rating + communication_rating + discipline_rating + punctuality_rating) / 4.0) as rating
FROM tutor_reviews
GROUP BY tutor_id;
```

## Common Issues & Solutions

### Issue 1: "Type mismatch - expected number, got string"

**Symptom**: Backend receives `"4"` (string) instead of `4.0` (float)

**Fix**: Backend automatically converts with `min_rating: Optional[float]`

### Issue 2: Value resets after page change

**Symptom**: Rating filter works on page 1, but resets on page 2

**Check**: State persistence
```javascript
console.log('[Pagination] Current filters:', FindTutorsState.filters);
// Should show minRating even after page change
```

### Issue 3: Debounce delay confusion

**Symptom**: "I typed 4 but nothing happened"

**Wait**: There's a 300ms debounce delay
```javascript
// In UI-management-new.js:81
this.debounce(this.handleFilterChange.bind(this, 'minRating'), 300)
```

Console should show messages after 300ms of no typing.

### Issue 4: Multiple values triggering multiple calls

**Symptom**: Console shows duplicate API calls

**Expected**: Debounce prevents this, but rapid typing might show:
```
[UI] minRating filter changed: 4
[UI] minRating filter changed: 4.
[UI] minRating filter changed: 4.5
```

Only the last one should trigger API call (after 300ms delay).

## Quick Diagnostic Checklist

Run through this checklist if rating filter isn't working:

```javascript
// === 1. Check Input Element Exists ===
document.querySelector('input[name="minRating"]')
// Should return: <input> element

// === 2. Check Event Listener Attached ===
// Type in the rating input, should see console logs immediately

// === 3. Check State Updates ===
FindTutorsState.filters
// Should show: {minRating: 'your-value', ...}

// === 4. Check API Call ===
// Look for "[API] Full URL will be:" in console
// Should include: min_rating=your-value

// === 5. Check Backend Logs ===
// Terminal should show: min_rating: your-value
```

## Test Commands

### Frontend Test (Browser Console)
```javascript
// Manually trigger rating filter
FindTutorsState.updateFilter('minRating', '4.5');
FindTutorsController.loadTutors();

// Check current filters
console.log('Current filters:', FindTutorsState.filters);

// Manually call API
FindTutorsAPI.getTutors({minRating: '4.5', page: 1, limit: 12, tiered: true})
    .then(response => console.log('Response:', response));
```

### Backend Test (Python)
```python
# Test endpoint directly
curl "http://localhost:8000/api/tutors/tiered?min_rating=4.0&page=1&limit=12"
```

## Expected vs Actual Comparison

### ✅ Working Example:

**Frontend Console:**
```
[UI] minRating filter changed: 4.5
[State] updateFilter called: minRating = 4.5 (type: string)
[API] ✅ ADDED min_rating to backendParams: 4.5
[API] Query string: page=1&limit=12&min_rating=4.5
```

**Backend Console:**
```
[Tiered Tutors] min_rating: 4.5
[Rating Filter] Tutor 5 filtered out: rating 2.80 < min 4.5
[Post-Tiering Filters] After all filters: 32
```

### ❌ Broken Example:

**Frontend Console:**
```
[UI] minRating filter changed:
[State] updateFilter called: minRating =  (type: string)
[Controller] Removing empty param: minRating =
[API] ❌ SKIPPED min_rating - condition failed
[API] Query string: page=1&limit=12
```

**Backend Console:**
```
[Tiered Tutors] min_rating: None
[Post-Tiering Filters] After all filters: 150  ← No filtering!
```

## Next Steps

If you still see issues after reviewing this guide:

1. **Copy full console output** (Ctrl+A in console, Ctrl+C)
2. **Copy backend terminal output** for the same request
3. **Note specific symptoms**:
   - At which step does the value disappear?
   - What's the exact value you're entering?
   - Does it work for other filters (price, grade level)?

4. **Share the copied logs** for detailed analysis
