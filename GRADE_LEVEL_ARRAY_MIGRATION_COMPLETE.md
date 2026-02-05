# Grade Level Array Migration - Complete

## Summary

Successfully migrated `grade_level` column in `tutor_packages` table from VARCHAR to TEXT[] (array).

## Migration Details

### Before
```sql
grade_level VARCHAR
-- Stored as: "Grade 10-12" or "Grade 10" or NULL
```

### After
```sql
grade_level TEXT[]
-- Stored as: {'Grade 10', 'Grade 11', 'Grade 12'} or {} (empty array)
```

## Changes Made

### 1. Database Schema Migration
**File**: `astegni-backend/migrate_grade_level_to_array.py`

**Steps performed:**
1. Created temporary `grade_level_array TEXT[]` column
2. Migrated data:
   - NULL/empty → `[]` (empty array)
   - Comma-separated → array (`"Grade 10,11"` → `['Grade 10', '11']`)
   - Single values → array with one element (`"Grade 10"` → `['Grade 10']`)
3. Dropped old VARCHAR column
4. Renamed new column to `grade_level`
5. Trimmed whitespace from array elements

### 2. Test Data Added

```sql
Package 1 (Tutor 1): ['Grade 10', 'Grade 11', 'Grade 12']
Package 2 (Tutor 2): ['Grade 9', 'Grade 10']
Package 3 (Tutor 3): [] (empty for testing)
Package 7 (Tutor 1): ['Grade 10', 'Grade 11', 'Grade 12']
Package 8 (Tutor 2): ['University']
```

## Backend Impact

### API Endpoints Using grade_level

#### 1. Get Tutor Packages (`/api/tutor/{id}/packages`)
**File**: `astegni-backend/view_tutor_endpoints.py`

**Current query** (Line 524-534):
```python
cur.execute("""
    SELECT id, name, grade_level, course_ids, description,
           session_format, schedule_type, schedule_days,
           ...
    FROM tutor_packages
    WHERE tutor_id = %s AND is_active = TRUE
""", (tutor_id,))
```

**Change needed**: grade_level now returns as Python list, not string

#### 2. Create/Update Package Endpoints
Need to ensure data is sent as array, not string:

```python
# BEFORE
grade_level = "Grade 10-12"

# AFTER
grade_level = ['Grade 10', 'Grade 11', 'Grade 12']
```

## Frontend Impact

### 1. Package Management Modal
**File**: `js/tutor-profile/package-manager-clean.js`

**Current behavior**: May expect string, needs to handle array

**Example change needed**:
```javascript
// BEFORE (string)
gradeLevel: backendPackage.grade_level || '',

// AFTER (array)
gradeLevel: backendPackage.grade_level || [],  // Array
```

### 2. Display Logic
Need to join array for display:

```javascript
// Display grade levels
const gradeLevels = pkg.grade_level || [];
const displayText = gradeLevels.length > 0
    ? gradeLevels.join(', ')
    : 'Not specified';
```

### 3. Form Input
Grade level selection should populate array:

```javascript
// Get selected grade levels (multi-select or checkboxes)
const selectedGrades = Array.from(
    document.querySelectorAll('input[name="grade-level"]:checked')
).map(cb => cb.value);

// Send as array
packageData = {
    ...
    grade_level: selectedGrades,  // ['Grade 10', 'Grade 11']
    ...
};
```

## Benefits

✅ **Multiple grade levels per package**: Can target multiple grades properly
✅ **Proper filtering**: Can use PostgreSQL array operators (ANY, ALL, &&)
✅ **No parsing needed**: No more splitting comma-separated strings
✅ **Type safety**: PostgreSQL enforces array structure
✅ **Efficient queries**: Can use array indexing and containment operators

## Query Examples

### Find packages teaching Grade 10
```sql
SELECT * FROM tutor_packages
WHERE 'Grade 10' = ANY(grade_level);
```

### Find packages teaching any of multiple grades
```sql
SELECT * FROM tutor_packages
WHERE grade_level && ARRAY['Grade 10', 'Grade 11'];
```

### Find packages teaching exact set of grades
```sql
SELECT * FROM tutor_packages
WHERE grade_level = ARRAY['Grade 10', 'Grade 11', 'Grade 12'];
```

### Get all unique grades from all packages
```sql
SELECT DISTINCT unnest(grade_level) as grade
FROM tutor_packages
WHERE grade_level IS NOT NULL
AND array_length(grade_level, 1) > 0
ORDER BY grade;
```

## Aggregation for Tutor Display

To show all grades a tutor teaches (across all packages):

```sql
SELECT
    tutor_id,
    ARRAY_AGG(DISTINCT elem ORDER BY elem) as all_grades
FROM tutor_packages,
LATERAL unnest(grade_level) as elem
WHERE is_active = true
GROUP BY tutor_id;
```

**Example result:**
```
Tutor 1: ['Grade 10', 'Grade 11', 'Grade 12']
Tutor 2: ['Grade 9', 'Grade 10', 'University']
```

## Frontend TODO List

### 1. Package Management Modal
- [ ] Update form to support multiple grade level selection
- [ ] Change from single input to checkboxes or multi-select
- [ ] Update save logic to send array instead of string
- [ ] Update load logic to handle array from backend

### 2. View Tutor Page
- [ ] Update package display to show array of grades
- [ ] Join array elements with commas for display

### 3. API Integration
- [ ] Update all POST/PUT package endpoints to accept array
- [ ] Update all GET package endpoints to return array
- [ ] Test creating/editing packages with multiple grades

## Testing

### Test Case 1: Create Package with Multiple Grades
```javascript
const packageData = {
    name: "Math Tutoring",
    grade_level: ['Grade 10', 'Grade 11', 'Grade 12'],
    session_format: 'Online',
    ...
};

// POST /api/tutor/packages
```

### Test Case 2: Display Package Grades
```javascript
// Backend returns:
{
    id: 1,
    grade_level: ['Grade 10', 'Grade 11', 'Grade 12']
}

// Frontend displays:
"Grade 10, Grade 11, Grade 12"
```

### Test Case 3: Empty Grade Levels
```javascript
// Backend returns:
{
    id: 3,
    grade_level: []
}

// Frontend displays:
"Not specified"
```

### Test Case 4: Tutor with Multiple Packages
```javascript
// Tutor 1 packages:
Package 1: ['Grade 10', 'Grade 11', 'Grade 12']
Package 7: ['Grade 10', 'Grade 11', 'Grade 12']

// Aggregated tutor display:
"Grade 10, Grade 11, Grade 12" (deduplicated)
```

## Migration Status

✅ **Database Schema**: Migrated to TEXT[]
✅ **Test Data**: Added sample grade levels
⚠️ **Backend Endpoints**: Need to verify array handling
⚠️ **Frontend Forms**: Need to support multiple grade selection
⚠️ **Frontend Display**: Need to join arrays for display

## Next Steps

1. Update package creation/edit forms to support multiple grade levels
2. Verify all API endpoints properly handle array type
3. Update display logic to show comma-separated grade list
4. Test complete flow: create package → save → retrieve → display
5. Update tutor card aggregation logic if needed

The database migration is complete and ready for frontend integration!
