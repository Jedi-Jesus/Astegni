# Grade Level Filter - Complete Explanation

## Overview

The grade level filter allows users to find tutors who teach specific grade ranges. It uses a numeric system to handle all education levels from Nursery to University.

## How It Works

### Grade Level Numeric System

The filter converts all grade levels to numeric values for comparison:

| Grade Level | Numeric Value | Description |
|-------------|---------------|-------------|
| Nursery | 0.0 | Pre-school |
| KG (Kindergarten) | 0.5 | Kindergarten |
| Grade 1 | 1.0 | Elementary |
| Grade 2 | 2.0 | Elementary |
| Grade 3 | 3.0 | Elementary |
| Grade 4 | 4.0 | Elementary |
| Grade 5 | 5.0 | Elementary |
| Grade 6 | 6.0 | Middle School |
| Grade 7 | 7.0 | Middle School |
| Grade 8 | 8.0 | Middle School |
| Grade 9 | 9.0 | High School |
| Grade 10 | 10.0 | High School |
| Grade 11 | 11.0 | High School |
| Grade 12 | 12.0 | High School |
| University | 13.0 | College/University |

## Frontend Implementation

### HTML Dropdowns (find-tutors.html:467-505)

Two dropdown selects for range filtering:

```html
<!-- Minimum Grade Level -->
<select class="filter-select" name="minGradeLevel" id="minGradeLevel">
    <option value="">Any</option>
    <option value="0">Nursery</option>
    <option value="0.5">KG</option>
    <option value="1">Grade 1</option>
    <!-- ... up to ... -->
    <option value="13">University</option>
</select>

<!-- Maximum Grade Level -->
<select class="filter-select" name="maxGradeLevel" id="maxGradeLevel">
    <option value="">Any</option>
    <option value="0">Nursery</option>
    <option value="0.5">KG</option>
    <option value="1">Grade 1</option>
    <!-- ... up to ... -->
    <option value="13">University</option>
</select>
```

**Key Points:**
- Values are numeric strings: `"0"`, `"0.5"`, `"1"` to `"13"`
- Labels are human-readable: "Nursery", "KG", "Grade 1", etc.
- Both dropdowns have "Any" option (empty value) for no filtering

## Backend Implementation

### Filter Logic (routes.py:1826-1854)

```python
# Apply grade level filter
if min_grade_level is not None or max_grade_level is not None:
    # Check if tutor has package data with grade levels
    if not pkg_data or not pkg_data.grade_levels:
        continue  # Filter out tutors with no grade level info

    grade_match = False

    # Check each grade level the tutor teaches
    for grade in pkg_data.grade_levels:
        try:
            # Convert grade string to numeric value
            if grade.lower().startswith("grade"):
                # "Grade 10" -> 10.0
                grade_num = float(grade.lower().replace("grade", "").strip())
            elif grade.lower() == "university":
                grade_num = 13.0
            elif grade.lower() == "kg" or grade.lower() == "kindergarten":
                grade_num = 0.5
            elif grade.lower() == "nursery":
                grade_num = 0.0
            else:
                continue  # Skip unknown formats

            # Check if grade is within the requested range
            if min_grade_level is not None and grade_num < min_grade_level:
                continue  # Too low
            if max_grade_level is not None and grade_num > max_grade_level:
                continue  # Too high

            # Found a matching grade level
            grade_match = True
            break
        except:
            continue  # Skip on parsing error

    # Filter out tutor if no grade levels matched
    if not grade_match:
        continue
```

### How Parsing Works

The backend parses various grade level string formats stored in the database:

**Examples:**
- `"Grade 10"` → Extracts `10.0`
- `"Grade10"` → Extracts `10.0`
- `"grade 10"` → Extracts `10.0` (case-insensitive)
- `"University"` → Converts to `13.0`
- `"KG"` → Converts to `0.5`
- `"Kindergarten"` → Converts to `0.5`
- `"Nursery"` → Converts to `0.0`

## Filter Behavior Examples

### Example 1: Find Tutors for Grade 10-12

**User Selection:**
- From: Grade 10 (`value="10"`)
- To: Grade 12 (`value="12"`)

**API Call:**
```
GET /api/tutors/tiered?minGradeLevel=10&maxGradeLevel=12
```

**Matching Tutors:**
- ✅ Tutor with grades: `["Grade 10", "Grade 11", "Grade 12"]`
- ✅ Tutor with grades: `["Grade 11"]`
- ✅ Tutor with grades: `["Grade 9", "Grade 10"]` (has Grade 10)
- ✅ Tutor with grades: `["Grade 12", "University"]` (has Grade 12)
- ❌ Tutor with grades: `["Grade 8", "Grade 9"]` (no overlap)
- ❌ Tutor with grades: `["University"]` (too high)

### Example 2: Find Elementary School Tutors

**User Selection:**
- From: Grade 1 (`value="1"`)
- To: Grade 5 (`value="5"`)

**API Call:**
```
GET /api/tutors/tiered?minGradeLevel=1&maxGradeLevel=5
```

**Matching Tutors:**
- ✅ Tutor with grades: `["Grade 1", "Grade 2", "Grade 3"]`
- ✅ Tutor with grades: `["Grade 5", "Grade 6"]` (has Grade 5)
- ❌ Tutor with grades: `["Grade 6", "Grade 7"]` (no overlap)
- ❌ Tutor with grades: `["KG", "Nursery"]` (too low)

### Example 3: Find University Tutors Only

**User Selection:**
- From: University (`value="13"`)
- To: University (`value="13"`)

**API Call:**
```
GET /api/tutors/tiered?minGradeLevel=13&maxGradeLevel=13
```

**Matching Tutors:**
- ✅ Tutor with grades: `["University"]`
- ✅ Tutor with grades: `["Grade 12", "University"]` (has University)
- ❌ Tutor with grades: `["Grade 12"]` (no University)

### Example 4: Find Tutors for Any Grade 10 or Above

**User Selection:**
- From: Grade 10 (`value="10"`)
- To: Any (empty)

**API Call:**
```
GET /api/tutors/tiered?minGradeLevel=10
```

**Matching Tutors:**
- ✅ Tutor with grades: `["Grade 10", "Grade 11", "Grade 12"]`
- ✅ Tutor with grades: `["Grade 12", "University"]`
- ✅ Tutor with grades: `["University"]`
- ✅ Tutor with grades: `["Grade 9", "Grade 10"]` (has Grade 10)
- ❌ Tutor with grades: `["Grade 9"]` (too low)

### Example 5: Find Tutors for Grade 10 or Below

**User Selection:**
- From: Any (empty)
- To: Grade 10 (`value="10"`)

**API Call:**
```
GET /api/tutors/tiered?maxGradeLevel=10
```

**Matching Tutors:**
- ✅ Tutor with grades: `["Grade 1", "Grade 2"]`
- ✅ Tutor with grades: `["Grade 9", "Grade 10"]`
- ✅ Tutor with grades: `["Nursery", "KG"]`
- ❌ Tutor with grades: `["Grade 11", "Grade 12"]` (too high)
- ❌ Tutor with grades: `["Grade 10", "Grade 11"]` (has Grade 11 which is > 10)
  - **Wait, this SHOULD match!** Because the filter checks if ANY grade matches

**Important Note:** The filter uses **OR logic** - if the tutor teaches ANY grade within the range, they match. So a tutor with `["Grade 10", "Grade 11"]` WILL match a filter for `maxGradeLevel=10` because they teach Grade 10 (even though they also teach Grade 11).

## Important Filter Logic: OR vs AND

### Current Implementation: OR Logic

The filter uses **OR logic** - a tutor matches if they teach **ANY** grade within the specified range.

**Example:**
- User searches for: Grade 10-12
- Tutor teaches: Grade 9, 10, 11, 12, University
- **Result: ✅ Matches** (because they teach Grade 10, 11, and 12)

This means:
- A tutor teaching `["Grade 8", "Grade 9", "Grade 10"]` will match a search for `minGrade=10, maxGrade=12`
- Even though they also teach Grade 8 and 9 (outside the range)

### Why OR Logic?

**Pros:**
- More inclusive - shows tutors who CAN teach the requested level
- Student can discuss with tutor about focusing on specific grades
- Tutors often teach multiple adjacent grade levels
- Better search results (more tutors shown)

**Alternative: AND Logic (Not Implemented)**
- Would require ALL grades taught to be within range
- More restrictive
- Might filter out qualified tutors unnecessarily

## Database Storage

Grade levels are stored in `tutor_packages` table as strings:

```sql
-- Package data structure
tutor_packages:
  id: 1
  tutor_id: 5
  grade_level: "Grade 10-12"  -- String format
  -- OR --
  grade_level: "Grade 10"      -- Single grade
  -- OR --
  grade_level: "University"    -- Special level
```

### Batch Query (routes.py:~1760)

The backend fetches grade levels using a batch query:

```python
pkg_batch_query = text("""
    SELECT
        tp.tutor_id,
        ARRAY_AGG(DISTINCT tp.grade_level) FILTER
            (WHERE tp.grade_level IS NOT NULL AND tp.grade_level != '') as grade_levels
    FROM tutor_packages tp
    WHERE tp.tutor_id = ANY(:tutor_ids)
    GROUP BY tp.tutor_id
""")
```

**Result format:**
```python
{
    tutor_id: 5,
    grade_levels: ["Grade 10", "Grade 11", "Grade 12"]
}
```

## Edge Cases

### Edge Case 1: Tutor with No Grade Level Data

**Database:** Tutor has packages but `grade_level` is NULL or empty

**Filter Behavior:**
- Any grade filter (min or max) → ❌ Filtered out
- No grade filter → ✅ Shows (passes other filters)

### Edge Case 2: Tutor with Range Strings

**Database:** `grade_level = "Grade 10-12"`

**Current Behavior:** ❌ **Won't parse correctly!**

**Issue:** The parser expects `"Grade 10"`, not `"Grade 10-12"`

**Fix Needed:** Update parser to handle range strings:
```python
if "-" in grade.lower() and grade.lower().startswith("grade"):
    # Parse "Grade 10-12" -> extract min and max
    parts = grade.lower().replace("grade", "").strip().split("-")
    # Check both bounds
```

### Edge Case 3: Invalid Grade Format

**Database:** `grade_level = "High School"`

**Behavior:** Skipped (doesn't match any parsing rules)

**Result:** Tutor won't match any grade filter

### Edge Case 4: Mixed Case

**Database:** `grade_level = "GRADE 10"`

**Behavior:** ✅ Works (case-insensitive parsing)

## Common User Scenarios

### Scenario 1: Parent Looking for High School Tutor

**Need:** Tutor for Grade 10 student

**Action:**
- From: Grade 10
- To: Grade 10

**Result:** Tutors who teach Grade 10 (may also teach other grades)

### Scenario 2: Parent with Multiple Children

**Need:** One tutor for kids in Grade 5 and Grade 8

**Action:**
- From: Grade 5
- To: Grade 8

**Result:** Tutors who teach any grade from 5 to 8

### Scenario 3: University Student

**Need:** University-level tutor

**Action:**
- From: University
- To: University

**Result:** Tutors who teach University level

### Scenario 4: Elementary School Only

**Need:** Tutor specializing in elementary (no middle/high school)

**Action:**
- From: Grade 1
- To: Grade 5

**Result:** Tutors who teach elementary grades

**Note:** May include tutors who also teach Grade 6+ (OR logic)

## Debug Logging

When testing grade level filter, check backend logs:

```
[Tiered Tutors] === REQUEST PARAMETERS ===
  min_grade_level: 10.0
  max_grade_level: 12.0

[Post-Tiering Filters] Package data: 145 tutors
[Post-Tiering Filters] Grade levels for tutor 5: ['Grade 10', 'Grade 11', 'Grade 12']
[Post-Tiering Filters] Parsed grade: Grade 10 -> 10.0 (MATCH)

[Post-Tiering Filters] === FILTER RESULTS ===
  Initial tutors: 150
  After grade filter: 45
  Filtered out: 105
```

## API Testing

### Test 1: High School Range
```bash
curl "http://localhost:8000/api/tutors/tiered?minGradeLevel=10&maxGradeLevel=12&page=1&limit=10"
```

### Test 2: Minimum Only (Grade 10+)
```bash
curl "http://localhost:8000/api/tutors/tiered?minGradeLevel=10&page=1&limit=10"
```

### Test 3: Maximum Only (Up to Grade 5)
```bash
curl "http://localhost:8000/api/tutors/tiered?maxGradeLevel=5&page=1&limit=10"
```

### Test 4: University Only
```bash
curl "http://localhost:8000/api/tutors/tiered?minGradeLevel=13&maxGradeLevel=13&page=1&limit=10"
```

## Summary

✅ **Grade range filtering** - From/To dropdowns for flexible searching
✅ **Numeric system** - Converts all levels to numbers (0-13)
✅ **OR logic** - Tutors match if they teach ANY grade in range
✅ **Case-insensitive** - Handles various string formats
✅ **Special levels** - Nursery (0), KG (0.5), University (13)

⚠️ **Known Issue**: Range strings like "Grade 10-12" may not parse correctly

The grade level filter is functional and covers most use cases. The OR logic is user-friendly and shows more relevant results.
