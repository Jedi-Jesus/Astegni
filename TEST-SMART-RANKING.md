# Quick Test Guide: Smart Ranking System

## Quick Start (5 Minutes)

### Step 1: Restart Backend
```bash
cd astegni-backend
python app.py
```

### Step 2: Open Find-Tutors Page
```
http://localhost:8080/branch/find-tutors.html
```

### Step 3: Observe Smart Ranking

**What You Should See**:
1. Tutors appear in smart order (not just by rating)
2. Sort dropdown shows "🎯 Smart Ranking (Recommended)" selected
3. Results shuffle slightly on each page reload (80% of the time)

---

## Test Scenarios

### Test 1: Default Smart Ranking ✅

**Steps**:
1. Open find-tutors page (no search)
2. Reload page 5 times
3. Observe tutor order changes slightly each time

**Expected**:
- Basic tutors stay near top
- Order varies between reloads
- Quality tutors always visible

**Console Output**:
```
API call params: {sort_by: 'smart', search_history_ids: ''}
Showing 12 tutors after client-side filtering
```

---

### Test 2: Search History Recording ✅

**Steps**:
1. Search "mathematics"
2. Click on 2-3 tutor cards
3. Open DevTools → Console
4. Check: `localStorage.getItem('searchHistory')`

**Expected**:
```json
[
  {
    "searchTerm": "mathematics",
    "tutorIds": [1, 5, 12],
    "timestamp": "2025-01-15T10:30:00.000Z"
  }
]
```

---

### Test 3: Search History Boost ✅

**Steps**:
1. Search "physics"
2. View tutors: #3, #7, #12
3. Clear search bar (delete text)
4. Press Enter or click outside
5. Observe: Tutors #3, #7, #12 appear higher in results

**Expected**:
- Previously viewed tutors boosted
- Backend receives: `search_history_ids: '3,7,12'`
- Those tutors get +50 points each

---

### Test 4: Basic Tutor Priority ✅

**Setup** (run in PostgreSQL):
```sql
-- Mark tutors as basic
UPDATE tutor_profiles SET is_basic = true WHERE id IN (2, 5, 8);
```

**Steps**:
1. Reload find-tutors page
2. Check first page results

**Expected**:
- Tutors #2, #5, #8 appear in top 5 results
- Basic badge/indicator visible (if implemented in UI)

---

### Test 5: New Tutor Boost ✅

**Setup** (run in PostgreSQL):
```sql
-- Make tutors appear new
UPDATE tutor_profiles
SET created_at = NOW() - INTERVAL '5 days'
WHERE id IN (1, 4, 9);
```

**Steps**:
1. Reload find-tutors page
2. Check results

**Expected**:
- Tutors #1, #4, #9 boosted in rankings
- Appear in top 8 results (even if not basic)

---

### Test 6: Triple Combo (Highest Priority) ✅

**Setup** (run in PostgreSQL):
```sql
-- Create super-boosted tutor
UPDATE tutor_profiles
SET is_basic = true,
    created_at = NOW() - INTERVAL '3 days',
    rating = 4.8
WHERE id = 1;
```

**Steps**:
1. Search "mathematics" (assuming tutor #1 teaches math)
2. View tutor #1
3. Clear search, reload page

**Expected**:
- Tutor #1 appears **#1 in results**
- Has all three boosts:
  - ✅ Basic (+100)
  - ✅ New (+30)
  - ✅ Search History (+50)
  - ✅ Triple Combo (+150)
  - **Total: ~400+ points**

---

### Test 7: Manual Sorting Override ✅

**Steps**:
1. Change sort dropdown to "Lowest Price"
2. Observe results

**Expected**:
- Smart ranking disabled
- Tutors sorted strictly by price (ascending)
- No shuffling on reload

**Console Output**:
```
API call params: {sort_by: 'price'}
```

---

### Test 8: Shuffling Probability ✅

**Steps**:
1. Open find-tutors page
2. Reload **10 times**
3. Count how many times order changes

**Expected**:
- ~8 out of 10 reloads shuffle (80%)
- ~2 out of 10 reloads same order (20%)
- Basic tutors stay in top tier always

---

## Verify in Browser Console

### Check Search History
```javascript
// View all search history
JSON.parse(localStorage.getItem('searchHistory'))

// Get tutor IDs from history
PreferencesManager.getSearchHistoryTutorIds()

// Clear search history (for testing)
localStorage.removeItem('searchHistory')
```

### Check API Calls
Open Network tab in DevTools:
```
Filter: tutors
Look for: /api/tutors?...&search_history_ids=1,5,12
```

---

## Debugging Tips

### Issue: Smart ranking not working

**Check**:
1. Backend console shows `sort_by='smart'`
2. No errors in browser console
3. Database has `is_basic` column

### Issue: Search history not sending

**Check**:
```javascript
// In browser console
PreferencesManager.getSearchHistoryTutorIds()
// Should return array: [1, 5, 12, ...]
```

### Issue: Same results every reload

**Possible Causes**:
- You're in the 20% non-shuffle window (reload again)
- Only 1-2 tutors in database (not enough to shuffle)
- Sort dropdown changed from "Smart Ranking"

---

## Expected Behavior Summary

| Feature | Behavior |
|---------|----------|
| Default Sort | "Smart Ranking" selected |
| Page Reload | 80% shuffle, 20% same order |
| Basic Tutors | Always in top tier |
| Search History | Boosts viewed tutors |
| New Tutors | Extra visibility for 30 days |
| Manual Sort | Disables smart ranking |
| Empty History | Smart ranking still works (uses basic + new) |

---

## Database Quick Setup

```sql
-- Create test basic tutors
UPDATE tutor_profiles SET is_basic = true WHERE id <= 5;

-- Create test new tutors
UPDATE tutor_profiles
SET created_at = NOW() - INTERVAL '7 days'
WHERE id BETWEEN 6 AND 10;

-- Verify
SELECT id, is_basic, created_at, rating
FROM tutor_profiles
WHERE is_active = true
ORDER BY id
LIMIT 20;
```

---

## Success Criteria

✅ **Smart ranking is working if**:
1. Basic tutors appear in top 30% of results
2. Search history boosts previously viewed tutors
3. Results shuffle on ~80% of page reloads
4. Manual sorting still works
5. No console errors

✅ **Search history is working if**:
1. Searches are recorded in localStorage
2. Tutor IDs sent to backend in `search_history_ids` param
3. Previously viewed tutors appear higher in results

✅ **New tutor boost is working if**:
1. Tutors created within 30 days ranked higher
2. Very new tutors (≤7 days) ranked even higher
3. Combined with basic for maximum boost

---

## Performance Check

Open browser DevTools → Network tab:

**Good Performance**:
- API response time: < 500ms
- Total tutors: < 1000 (for in-memory sorting)

**Needs Optimization** (if):
- Response time > 2 seconds
- Total tutors > 10,000
- Solution: Limit smart ranking to first 500 results

---

## Next Steps

After testing:
1. ✅ Confirm smart ranking works
2. ✅ Confirm search history recording works
3. ✅ Confirm shuffling happens
4. 📊 Monitor user engagement metrics
5. 🔧 Adjust scoring weights based on results
6. 💡 Consider A/B testing different shuffle percentages

---

## Questions to Ask

1. **Is 80% shuffle too much/little?**
   - Adjust in routes.py line 567: `random.random() < 0.8`

2. **Should basic boost be higher/lower?**
   - Adjust in routes.py line 522: `score += 100`

3. **Should new tutor period be shorter/longer?**
   - Adjust in routes.py line 528: `if days_old <= 30`

4. **Should shuffling only happen for anonymous users?**
   - Add condition: `and not current_user`

---

Enjoy the smart ranking system! 🎯✨
