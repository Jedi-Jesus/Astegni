# Backend Grade Level Array Fix - Complete

## Problem

After migrating `grade_level` from VARCHAR to TEXT[] array, the backend queries were failing with:

```
psycopg.errors.InvalidTextRepresentation: malformed array literal: ""
DETAIL:  Array value must start with "{" or dimension information.
```

## Root Cause

The batch queries were trying to aggregate `tp.grade_level` directly:

```sql
ARRAY_AGG(DISTINCT tp.grade_level) FILTER (WHERE tp.grade_level IS NOT NULL AND tp.grade_level != '') as grade_levels
```

But `tp.grade_level` is now an ARRAY, not a string. You can't check if an array `!= ''` (empty string).

## Solution

Unnest the array first, then aggregate the individual elements:

```sql
-- BEFORE (broken)
ARRAY_AGG(DISTINCT tp.grade_level) FILTER (WHERE tp.grade_level IS NOT NULL AND tp.grade_level != '') as grade_levels
FROM tutor_packages tp

-- AFTER (fixed)
ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels
FROM tutor_packages tp
LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
```

## How It Works

### Example Data
```sql
Package 1: grade_level = {'Grade 10', 'Grade 11', 'Grade 12'}
Package 7: grade_level = {'Grade 10', 'Grade 11', 'Grade 12'}
```

### Query Process

1. **Unnest arrays**:
```
tutor_id | grade_elem
---------|------------
1        | Grade 10
1        | Grade 11
1        | Grade 12
1        | Grade 10   (from package 7)
1        | Grade 11   (from package 7)
1        | Grade 12   (from package 7)
```

2. **Aggregate with DISTINCT**:
```
tutor_id | grade_levels
---------|----------------------------
1        | {'Grade 10', 'Grade 11', 'Grade 12'}
```

Result: Deduplicated array of all grades the tutor teaches!

## Files Changed

### astegni-backend/app.py modules/routes.py

#### 1. get_tutors() - Line 1283-1297
```python
package_data_query = text("""
    SELECT
        tp.tutor_id,
        ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses,
        ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels,
        ARRAY_AGG(DISTINCT tp.session_format) FILTER (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as session_formats,
        MIN(tp.hourly_rate) as min_price,
        MAX(tp.hourly_rate) as max_price
    FROM tutor_packages tp
    LEFT JOIN courses c ON c.id = ANY(tp.course_ids)
    LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
    WHERE tp.tutor_id = ANY(:tutor_ids)
    AND tp.is_active = true
    GROUP BY tp.tutor_id
""")
```

#### 2. get_tutors_tiered() - Line 1780-1793
```python
pkg_batch_query = text("""
    SELECT
        tp.tutor_id,
        ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses,
        ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels,
        ARRAY_AGG(DISTINCT tp.session_format) FILTER (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as session_formats,
        MIN(tp.hourly_rate) as min_price,
        MAX(tp.hourly_rate) as max_price
    FROM tutor_packages tp
    LEFT JOIN courses c ON c.id = ANY(tp.course_ids)
    LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
    WHERE tp.tutor_id = ANY(:tutor_ids)
    GROUP BY tp.tutor_id
""")
```

#### 3. search_tutors() - Line 1968-1981
```python
package_data_query = text("""
    SELECT
        tp.tutor_id,
        ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as courses,
        ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels,
        ARRAY_AGG(DISTINCT tp.session_format) FILTER (WHERE tp.session_format IS NOT NULL AND tp.session_format != '') as session_formats,
        MIN(tp.hourly_rate) as min_price,
        MAX(tp.hourly_rate) as max_price
    FROM tutor_packages tp
    LEFT JOIN courses c ON c.id = ANY(tp.course_ids)
    LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
    WHERE tp.tutor_id = ANY(:tutor_ids)
    GROUP BY tp.tutor_id
""")
```

## Testing

### Test Query
```sql
SELECT
    tp.tutor_id,
    ARRAY_AGG(DISTINCT grade_elem) FILTER (WHERE grade_elem IS NOT NULL) as grade_levels
FROM tutor_packages tp
LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem ON true
WHERE tp.tutor_id = 1
GROUP BY tp.tutor_id;
```

**Expected Result:**
```
tutor_id | grade_levels
---------|----------------------------
1        | {Grade 10,Grade 11,Grade 12}
```

### API Test
```bash
# Should now work without error
curl "http://localhost:8000/api/tutors/tiered?page=1&limit=12"
```

**Expected**: Returns tutors with proper grade_levels array

## Benefits

✅ **Proper array handling**: Correctly unnests and reaggregates
✅ **Deduplication**: DISTINCT removes duplicates across packages
✅ **NULL safe**: FILTER handles NULL values properly
✅ **Performance**: LATERAL join is efficient

## Summary

Fixed three batch queries in routes.py to properly handle the new TEXT[] array type for grade_level. The key change is using `LEFT JOIN LATERAL unnest(tp.grade_level) as grade_elem` to expand the array before aggregating with `ARRAY_AGG(DISTINCT grade_elem)`.

The API endpoints should now work correctly with the array-based grade_level column!
