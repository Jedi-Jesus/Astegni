# Smart Ranking System for Find-Tutors

## Overview
This document describes the sophisticated tutor ranking algorithm implemented in the find-tutors feature, prioritizing basic tutors, search history relevance, and new tutors while providing variety through intelligent shuffling.

---

## Ranking Algorithm

### Priority Hierarchy (Highest to Lowest)

1. **🏆 New + Basic + Search History** (Score: ~450+ points)
   - Tutors created within 30 days
   - Have basic status (`is_basic = true`)
   - Match user's search history
   - **Combo Bonus**: +150 points

2. **🥇 Basic + Search History** (Score: ~330+ points)
   - Have basic status
   - Match user's search history
   - **Combo Bonus**: +80 points

3. **🥈 New + Search History** (Score: ~230+ points)
   - Created within 30 days
   - Match user's search history
   - **Combo Bonus**: +60 points

4. **🥉 Search History Match** (Score: ~200+ points)
   - Previously viewed by user
   - Recorded in localStorage search history
   - **Base Bonus**: +50 points

5. **⭐ Basic Tutors** (Score: ~200+ points)
   - Have basic status
   - **Base Bonus**: +100 points

6. **🆕 New Tutors** (Score: ~130+ points)
   - Created within 30 days
   - **Base Bonus**: +30 points
   - Very new (≤7 days): +20 additional points

7. **📚 Regular Tutors** (Score: 0-100 points)
   - Sorted by rating, experience, and verification

---

## Scoring Breakdown

### Base Scores
- **Rating Score**: 0-50 points (rating × 10)
  - 5.0★ = 50 points
  - 4.5★ = 45 points
  - 4.0★ = 40 points

- **Search History**: +50 points
- **Basic Status**: +100 points
- **New Tutor (≤30 days)**: +30 points
- **Very New (≤7 days)**: +20 additional points

### Additional Bonuses
- **Experience**: 0-20 points (years × 2, capped at 20)
  - 10+ years = 20 points
  - 5 years = 10 points

- **Student Count**: 0-15 points (students ÷ 10, capped at 15)
  - 150+ students = 15 points
  - 100 students = 10 points

- **Verification**: +25 points

### Combo Multipliers
- **Triple Combo** (New + Basic + History): +150 points
- **Basic + History**: +80 points
- **New + History**: +60 points
- **New + Basic**: +50 points

---

## Shuffling Mechanism

### Page Load Shuffling (80% Probability)

**Purpose**: Provide variety while maintaining quality ranking

**How it Works**:
1. Only applies to **first page** (page = 1)
2. Triggers with **80% probability** per page load
3. Shuffles within **tier groups** (not complete randomization)

**Tier Structure**:
- **Tier 1** (Top 20%): Basic + Search History matches
  - Shuffled internally
  - Always stays on top

- **Tier 2** (Next 30%): Basic OR Search History
  - Shuffled internally
  - Stays in middle section

- **Tier 3** (Bottom 50%): Regular tutors
  - Shuffled internally
  - Stays at bottom

**Example**:
```
Before Shuffle:          After Shuffle (Tier-based):
┌─────────────────┐      ┌─────────────────┐
│ Basic + History│      │ Basic + History│
│ Basic + History│  →   │ Basic + History│ } Tier 1 (shuffled)
│ Basic + History│      │ Basic + History│
├─────────────────┤      ├─────────────────┤
│ Basic Only    │      │ Search History  │
│ Search History  │  →   │ Basic Only    │ } Tier 2 (shuffled)
│ Search History  │      │ Search History  │
├─────────────────┤      ├─────────────────┤
│ Regular Tutor   │      │ Regular Tutor   │
│ Regular Tutor   │  →   │ Regular Tutor   │ } Tier 3 (shuffled)
│ Regular Tutor   │      │ Regular Tutor   │
└─────────────────┘      └─────────────────┘
```

---

## Search History Recording

### When is Search History Recorded?

1. **On Search with Results**
   - User types in search bar
   - Gets results (tutors.length > 0)
   - Search term + tutor IDs saved to localStorage

2. **On Tutor Profile View**
   - User clicks on tutor card
   - Tutor ID added to that search term's history
   - Timestamp updated

### Data Structure
```javascript
localStorage.searchHistory = [
  {
    searchTerm: "mathematics",
    tutorIds: [12, 5, 18, 3],
    timestamp: "2025-01-15T10:30:00Z",
    lastViewed: "2025-01-15T11:45:00Z"
  },
  {
    searchTerm: "physics online",
    tutorIds: [7, 22, 15],
    timestamp: "2025-01-14T09:15:00Z"
  }
]
```

### Storage Limit
- **Maximum**: 20 most recent searches
- Oldest searches automatically removed

---

## Implementation Details

### Backend (FastAPI)

**File**: `astegni-backend/app.py modules/routes.py`

**Endpoint**: `GET /api/tutors`

**New Parameters**:
- `sort_by` (default: `"smart"`)
- `search_history_ids` (comma-separated tutor IDs)

**Key Functions**:
- `calculate_tutor_score(tutor)`: Computes ranking score
- Tier-based shuffling with 80% probability
- Traditional sorting fallback

### Frontend (JavaScript)

**Files Modified**:
1. `js/find-tutors/api-config-&-util.js`
   - Sends search history IDs to backend
   - Default `sortBy: 'smart'`

2. `js/find-tutors/main-controller.js`
   - Records search history on successful searches
   - Logs search recording activity

3. `js/find-tutors/preference-Management.js`
   - Already had search history management
   - `getSearchHistoryTutorIds()` extracts IDs

4. `branch/find-tutors.html`
   - Added "🎯 Smart Ranking (Recommended)" option
   - Set as default in dropdown

---

## User Experience

### What Users See

1. **Initial Page Load (80% of the time)**
   - Basic tutors appear first (shuffled)
   - Tutors from search history mixed in top results
   - New tutors get visibility boost
   - Variety on each page refresh

2. **After Searching**
   - Results match search query
   - Smart ranking still applies
   - Basic tutors matching search appear first
   - Search recorded for future visits

3. **Manual Sorting**
   - User can override with dropdown
   - Options: rating, price, experience, name, newest
   - Smart ranking disabled when explicit sort selected

### Example Scenario

**User Journey**:
1. User searches "mathematics tutor"
2. Gets 20 results, views top 3 tutors
3. Search history records: `["mathematics tutor", [12, 5, 18]]`
4. Next visit (no search):
   - Tutor #12, #5, #18 boosted (+50 points each)
   - Basic tutors still prioritized
   - Results shuffled for variety

---

## Testing the System

### Setup Test Data

```sql
-- Create basic tutors
UPDATE tutor_profiles SET is_basic = true WHERE id IN (1, 3, 5, 7);

-- Create new tutors (within 30 days)
UPDATE tutor_profiles SET created_at = NOW() - INTERVAL '10 days' WHERE id IN (2, 4, 6);

-- Create very new tutors (within 7 days)
UPDATE tutor_profiles SET created_at = NOW() - INTERVAL '3 days' WHERE id IN (8, 9);
```

### Test Cases

1. **Test Smart Ranking (Default)**
   ```
   Visit: http://localhost:8080/branch/find-tutors.html
   Expected: Basic tutors appear first, shuffled on each reload
   ```

2. **Test Search History**
   ```
   1. Search "mathematics"
   2. Click on 3 tutors
   3. Clear search
   4. Reload page
   Expected: Those 3 tutors appear higher in results
   ```

3. **Test Manual Sorting**
   ```
   Select: "Highest Rating" from dropdown
   Expected: Smart ranking disabled, strict rating sort
   ```

4. **Test New Tutor Boost**
   ```
   Check: Tutors created within 7 days
   Expected: Appear in top results (even without basic)
   ```

---

## Configuration

### Adjust Shuffling Probability

**File**: `astegni-backend/app.py modules/routes.py` (line 567)

```python
# Current: 80% shuffle probability
if page == 1 and random.random() < 0.8:

# Change to 100% (always shuffle):
if page == 1 and random.random() < 1.0:

# Change to 50% (half the time):
if page == 1 and random.random() < 0.5:

# Disable shuffling:
if False:  # Never shuffles
```

### Adjust "New Tutor" Threshold

**File**: `astegni-backend/app.py modules/routes.py` (line 527)

```python
# Current: 30 days
if days_old <= 30:

# Change to 60 days:
if days_old <= 60:

# Change to 14 days:
if days_old <= 14:
```

### Adjust Scoring Weights

**File**: `astegni-backend/app.py modules/routes.py` (lines 512-556)

```python
# Current weights
RATING_WEIGHT = 10        # (rating × 10)
SEARCH_HISTORY = 50
PREMIUM = 100
NEW_TUTOR = 30
EXPERIENCE_WEIGHT = 2     # (years × 2)
VERIFICATION = 25

# Combo bonuses
TRIPLE_COMBO = 150
PREMIUM_HISTORY = 80
NEW_HISTORY = 60
NEW_PREMIUM = 50
```

---

## Performance Considerations

### Database Impact
- Query retrieves all matching tutors (before pagination)
- Sorting happens in Python (not SQL)
- Trade-off: Flexibility vs. database efficiency

### Optimization for Large Datasets

If tutors > 10,000:
1. Limit smart ranking to first 500 results
2. Apply pagination in database
3. Cache scores for 5 minutes

```python
# Optimization (add to routes.py)
MAX_SMART_RANKING = 500
if len(all_tutors) > MAX_SMART_RANKING:
    all_tutors = all_tutors[:MAX_SMART_RANKING]
```

---

## Future Enhancements

### Planned Features
- [ ] **User Preference Learning**: Track click-through rate per tutor
- [ ] **Time-based Decay**: Older search history worth fewer points
- [ ] **Geographic Proximity**: Boost tutors near user location
- [ ] **Subject Matching**: Extra points for exact subject match
- [ ] **Peak Hours Boost**: Boost tutors available during user's preferred times

### Machine Learning Integration
- Collaborative filtering (tutors liked by similar users)
- A/B testing different ranking algorithms
- Personalized ranking per user

---

## Troubleshooting

### Issue: No shuffling happening
**Solution**: Check browser console for `random.random()` output

### Issue: Basic tutors not appearing first
**Solution**: Verify `is_basic = true` in database

### Issue: Search history not working
**Solution**: Check localStorage in browser DevTools → Application → Local Storage

### Issue: Same results every page load
**Solution**: You're in the 20% non-shuffle probability window, reload again

---

## API Response Example

```json
{
  "tutors": [
    {
      "id": 5,
      "first_name": "Abebe",
      "is_basic": true,
      "rating": 4.8,
      "created_at": "2025-01-10T10:00:00Z",
      "experience": 8,
      "is_verified": true
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 12,
  "pages": 13
}
```

**Score Calculation for Above Tutor**:
- Rating: 4.8 × 10 = **48 points**
- Basic: **+100 points**
- New (13 days old): **+30 points**
- Experience (8 years): 8 × 2 = **+16 points**
- Verified: **+25 points**
- **Total: 219 points**

---

## Summary

The smart ranking system provides:
✅ **Basic tutors get priority placement**
✅ **Search history creates personalized results**
✅ **New tutors get exposure**
✅ **Intelligent shuffling prevents staleness**
✅ **Quality maintained through tier-based shuffling**
✅ **Fallback to traditional sorting available**

This creates a fair, engaging, and profitable platform where basic tutors get value for their investment while users discover quality tutors tailored to their interests.
