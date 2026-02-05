# Tiered Tutor Matching System

## Overview
Implemented a 3-tier tutor ranking system that prioritizes tutors based on student learning interests and hobbies for more personalized tutor discovery.

## Implementation Date
January 20, 2026

## Tier System

### Tier 1: Learning Interests Match (Highest Priority)
- Matches against student's `interested_in` field from `student_profiles` table
- Compares interests with tutor's courses (from `tutor_packages` → `courses`)
- Checks: `course_name`, `tags`, `course_category`
- **Example**: Student interested in "Mathematics" → Tutors teaching Math courses appear first

### Tier 2: Hobbies Match (Medium Priority)
- Matches against student's `hobbies` field from `users` table
- Compares with tutor's `hobbies` field from `users` table
- Direct string comparison (case-insensitive)
- **Example**: Student with hobby "Chess" → Tutors with hobby "Chess" appear second

### Tier 3: All Other Tutors (Standard Priority)
- All remaining tutors sorted by smart ranking
- Includes subscription tier, trending score, and newness factors

## Backend Changes

### New Endpoint: `GET /api/tutors/tiered`

**Location**: `astegni-backend/app.py modules/routes.py` (lines 1467-1775)

**Features**:
- Requires user authentication (optional dependency)
- Only works for students with profile data
- Returns standard tutor format + tier information
- Includes smart ranking within each tier
- 80% shuffle probability for variety

**Response Format**:
```json
{
  "tutors": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "pages": 10,
  "tier_counts": {
    "tier1": 5,
    "tier2": 10,
    "tier3": 85
  }
}
```

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- All standard filters still apply (search, gender, etc.)

### Algorithm Flow

1. **Fetch Student Data**:
   - Get `interested_in` from `student_profiles.interested_in` (ARRAY)
   - Get `hobbies` from `users.hobbies` (ARRAY)

2. **Match Tier 1 (Interests)**:
   ```sql
   SELECT DISTINCT c.course_name, c.tags, c.course_category
   FROM tutor_packages tp
   JOIN courses c ON c.id = ANY(tp.course_ids)
   WHERE tp.tutor_id = :tutor_id AND c.status = 'verified'
   ```
   - Check if any interest appears in course data

3. **Match Tier 2 (Hobbies)**:
   - Direct comparison between student and tutor hobbies arrays
   - Only for tutors not already in Tier 1

4. **Smart Ranking Within Tiers**:
   - Subscription visibility: 0-500 points
   - Trending score: 0-200 points
   - New tutor bonus: 30-50 points

5. **Shuffle & Combine**:
   - 80% chance to shuffle within each tier (page 1 only)
   - Combine: Tier 1 → Tier 2 → Tier 3
   - Apply pagination

## Frontend Changes

### 1. API Configuration (`js/find-tutors/api-config-&-util.js`)

**Changes**:
- Line 72-73: Added `useTieredMode` flag detection
- Line 96-101: Conditional search history (disabled for tiered mode)
- Line 110: Dynamic endpoint selection
- Line 114-115: Endpoint routing to `/tutors/tiered` or `/tutors`

**State Addition** (line 954):
```javascript
tiered: false  // Enable interest/hobby-based tiered matching
```

### 2. UI Toggle (`branch/find-tutors.html`)

**Location**: Lines 417-438

**New Filter Section**:
```html
<div class="filter-section">
    <h3 class="filter-title">Smart Matching</h3>
    <label class="filter-checkbox">
        <input type="checkbox" name="tiered" value="true" id="tieredModeToggle">
        <span>Match by my interests</span>
    </label>
    <p class="text-xs">Prioritizes tutors matching your profile interests and hobbies</p>
</div>
```

### 3. Event Handling (`js/find-tutors/UI-management-new.js`)

**Changes**:
- Line 103: Added `input[name="tiered"]` to checkbox selector
- Lines 164-168: Handle tiered checkbox with boolean value
- Line 167: Console log for debugging

## Database Schema Requirements

### Student Profiles Table
```sql
CREATE TABLE student_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    interested_in TEXT[],  -- ARRAY of learning interests
    ...
);
```

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    hobbies TEXT[],  -- ARRAY of hobbies
    ...
);
```

### Tutor Packages & Courses
```sql
CREATE TABLE tutor_packages (
    id SERIAL PRIMARY KEY,
    tutor_id INTEGER,
    course_ids INTEGER[],  -- ARRAY of course IDs
    ...
);

CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    course_name VARCHAR(255),
    tags JSONB,
    course_category VARCHAR(100),
    status VARCHAR(50),
    ...
);
```

## Usage Examples

### Enable Tiered Mode (Frontend)
1. Navigate to Find Tutors page
2. Open sidebar filters
3. Check "Match by my interests" under "Smart Matching"
4. Tutors will be reordered based on your profile

### API Call (Direct)
```javascript
// Standard mode
const response = await fetch('/api/tutors?page=1&limit=10');

// Tiered mode
const response = await fetch('/api/tutors/tiered?page=1&limit=10');
```

### Backend Logs
```
[Tiered Tutors] Student interests: ['Mathematics', 'Physics', 'Programming']
[Tiered Tutors] Student hobbies: ['Chess', 'Reading', 'Coding']
[Tiered Tutors] Applying interest/hobby matching for 250 tutors
   [Tier 1] Tutor 15 matches interest 'Mathematics' via course 'Calculus I'
   [Tier 1] Tutor 42 matches interest 'Programming' via course 'Python Basics'
   [Tier 2] Tutor 89 matches hobby 'Chess'
[Tiered Tutors] Tier 1: 12 tutors (interests)
[Tiered Tutors] Tier 2: 8 tutors (hobbies)
[Tiered Tutors] Tier 3: 230 tutors (others)
[Tiered Tutors] Shuffled within tiers
```

## Performance Considerations

### Optimization Strategies
1. **Batch Queries**: Fetch courses for all tutors in single query
2. **Early Exit**: Stop checking once tier is assigned
3. **Case-Insensitive Comparison**: Use `.lower()` for matching
4. **Partial Matches**: Use `in` operator for substring matching

### Expected Performance
- **Small Dataset (<100 tutors)**: <100ms
- **Medium Dataset (100-1000 tutors)**: <500ms
- **Large Dataset (>1000 tutors)**: <2s

### Future Optimizations
- Add database indexes on `interested_in` and `hobbies` (GIN indexes for arrays)
- Cache tier calculations for popular interest combinations
- Pre-compute tier assignments during off-peak hours
- Use materialized views for frequently accessed data

## Testing Checklist

### Backend Tests
- [ ] Test with student having no interests/hobbies → All Tier 3
- [ ] Test with student having interests only → Tier 1 + Tier 3
- [ ] Test with student having hobbies only → Tier 2 + Tier 3
- [ ] Test with student having both → All 3 tiers populated
- [ ] Test with non-student user → All Tier 3
- [ ] Test with unauthenticated user → All Tier 3
- [ ] Verify tier_counts in response
- [ ] Verify tutors have `tier` field in response

### Frontend Tests
- [ ] Toggle tiered mode on → API calls `/tutors/tiered`
- [ ] Toggle tiered mode off → API calls `/tutors`
- [ ] Clear filters resets tiered mode
- [ ] Console logs show "TIERED mode" when enabled
- [ ] UI checkbox persists across searches
- [ ] Tier information displays correctly (if shown)

### Integration Tests
- [ ] Create test student with interests: ["Math", "Science"]
- [ ] Create test student with hobbies: ["Chess", "Reading"]
- [ ] Create tutors with matching courses
- [ ] Create tutors with matching hobbies
- [ ] Verify correct tier assignment
- [ ] Verify ordering: Tier 1 → Tier 2 → Tier 3

## Known Limitations

1. **Requires Student Profile**: Only works for logged-in students with profile data
2. **Exact/Substring Matching**: Simple string matching may miss semantic similarities
3. **No Fuzzy Matching**: "Maths" won't match "Mathematics"
4. **Performance**: May be slow with >1000 tutors (needs optimization)
5. **No Weighting**: All interests treated equally (no priority ranking)

## Future Enhancements

### Short-term
1. Add "Why this match?" badges on tutor cards
2. Show tier information in UI
3. Add analytics tracking for tier performance
4. Allow students to prioritize interests

### Long-term
1. **Semantic Matching**: Use NLP to match similar interests (Math → Mathematics)
2. **Machine Learning**: Learn from student-tutor interactions
3. **Collaborative Filtering**: "Students like you also liked..."
4. **Multi-factor Scoring**: Combine interests, hobbies, location, price, etc.
5. **Real-time Updates**: Update tiers as student profile changes
6. **A/B Testing**: Compare tiered vs standard matching effectiveness

## Rollback Plan

### If Issues Arise
1. **Frontend**: Remove checkbox or hide with CSS
2. **Backend**: Endpoint remains but unused (no breaking changes)
3. **Database**: No schema changes required

### Quick Disable
```javascript
// In js/find-tutors/api-config-&-util.js, line 73
const useTieredMode = false; // Force disable
```

## Maintenance

### Regular Tasks
- Monitor tier distribution (aim for 10-20% in Tier 1/2)
- Review interest/hobby matching accuracy
- Update course tags for better matching
- Collect student feedback on match quality

### Monitoring Metrics
- Average tier distribution per page load
- Conversion rate by tier (Tier 1 vs Tier 3)
- Student engagement with matched tutors
- Performance metrics (query time, memory usage)

## Support & Troubleshooting

### Common Issues

**Issue**: All tutors in Tier 3
- **Cause**: Student has no interests/hobbies in profile
- **Solution**: Prompt student to complete profile

**Issue**: Too many tutors in Tier 1
- **Cause**: Very generic interests (e.g., "Education")
- **Solution**: Encourage specific interests, filter by course category

**Issue**: Slow performance
- **Cause**: Large tutor dataset, many interest checks
- **Solution**: Add pagination, cache results, optimize queries

### Debug Commands
```python
# Check student profile
python -c "
from models import SessionLocal, StudentProfile, User
db = SessionLocal()
student = db.query(StudentProfile).filter_by(user_id=1).first()
user = db.query(User).filter_by(id=1).first()
print(f'Interests: {student.interested_in}')
print(f'Hobbies: {user.hobbies}')
"
```

## Credits
- **Implementation**: Claude Sonnet 4.5
- **Date**: January 20, 2026
- **Version**: 1.0
