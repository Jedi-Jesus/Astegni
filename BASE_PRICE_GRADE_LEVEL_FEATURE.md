# Base Price Grade Level Range Feature

## Overview
Added grade level range filtering to the tutor base price rules system. Admins can now specify which grade levels (1-12) a pricing rule applies to, allowing for more granular pricing control based on the educational level.

## What Changed

### 1. Database Migration
**File:** `astegni-backend/migrate_add_grade_level_to_base_price.py`

Added two new columns to the `base_price_rules` table in the admin database:
- `min_grade_level` (INTEGER, default: 1) - Minimum grade level (1-12)
- `max_grade_level` (INTEGER, default: 12) - Maximum grade level (1-12)
- Added check constraint: `min_grade_level <= max_grade_level AND min_grade_level >= 1 AND max_grade_level <= 12`

**Run Migration:**
```bash
cd astegni-backend
python migrate_add_grade_level_to_base_price.py
```

### 2. Backend Model Update
**File:** `astegni-backend/app.py modules/admin_models.py`

Updated `BasePriceRule` model:
```python
min_grade_level = Column(Integer, default=1)  # Minimum grade level (1-12)
max_grade_level = Column(Integer, default=12)  # Maximum grade level (1-12)
```

### 3. API Endpoints Update
**File:** `astegni-backend/base_price_endpoints.py`

Updated Pydantic models:
- `BasePriceRuleCreate`: Added `min_grade_level` and `max_grade_level` fields with validation (1-12)
- `BasePriceRuleUpdate`: Added optional `min_grade_level` and `max_grade_level` fields
- `BasePriceRuleResponse`: Added `min_grade_level` and `max_grade_level` fields

Added validation logic:
- Create endpoint: Validates that `min_grade_level <= max_grade_level`
- Update endpoint: Validates grade level range when either field is updated

### 4. Frontend HTML Update
**File:** `admin-pages/manage-system-settings.html`

Added Grade Level Range section in the base price modal (after Session Format):
```html
<!-- Grade Level Range -->
<div class="mb-4">
    <label class="block text-sm font-semibold mb-2">Grade Level Range *</label>
    <div class="grid grid-cols-2 gap-3">
        <div>
            <select id="base-price-min-grade" class="w-full px-3 py-2 border rounded-lg" required>
                <option value="1">Grade 1</option>
                ...
                <option value="12">Grade 12</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">Minimum</p>
        </div>
        <div>
            <select id="base-price-max-grade" class="w-full px-3 py-2 border rounded-lg" required>
                <option value="1">Grade 1</option>
                ...
                <option value="12" selected>Grade 12</option>
            </select>
            <p class="text-xs text-gray-500 mt-1">Maximum</p>
        </div>
    </div>
    <p class="text-xs text-gray-500 mt-1">
        <i class="fas fa-info-circle mr-1"></i>
        Set to Grade 1-12 for all grade levels (default)
    </p>
</div>
```

### 5. Frontend JavaScript Update
**File:** `admin-pages/js/admin-pages/base-price-manager.js`

**Updated Functions:**

1. **`createBasePriceCard(rule)`** - Display grade level in rule cards:
   ```javascript
   const minGrade = rule.min_grade_level || 1;
   const maxGrade = rule.max_grade_level || 12;
   const gradeLevelLabel = (minGrade === 1 && maxGrade === 12)
       ? 'All Grades (1-12)'
       : (minGrade === maxGrade)
           ? `Grade ${minGrade}`
           : `Grades ${minGrade}-${maxGrade}`;
   ```

2. **`openAddBasePriceModal()`** - Set default grade levels:
   ```javascript
   document.getElementById('base-price-min-grade').value = '1';
   document.getElementById('base-price-max-grade').value = '12';
   ```

3. **`editBasePriceRule(ruleId)`** - Populate grade level fields:
   ```javascript
   document.getElementById('base-price-min-grade').value = rule.min_grade_level || 1;
   document.getElementById('base-price-max-grade').value = rule.max_grade_level || 12;
   ```

4. **`saveBasePriceRule(event)`** - Include grade levels in save data with validation:
   ```javascript
   const minGrade = parseInt(document.getElementById('base-price-min-grade').value);
   const maxGrade = parseInt(document.getElementById('base-price-max-grade').value);

   // Validate grade level range
   if (minGrade > maxGrade) {
       showBasePriceError(`Minimum grade level (${minGrade}) cannot be greater than maximum grade level (${maxGrade})`);
       return;
   }
   ```

## Usage

### Creating a New Pricing Rule with Grade Level
1. Go to Admin Panel → System Settings → Pricing Panel
2. Click "Add Price Rule"
3. Fill in the form including:
   - Rule Name (e.g., "High School Math Online")
   - Subject Category
   - Session Format
   - **Grade Level Range** (e.g., Grades 9-12)
   - Base Price
   - Credential Bonus
   - Experience Bonus
   - Priority
4. Save the rule

### Grade Level Display
- **All Grades (1-12)**: Displayed as "All Grades (1-12)"
- **Single Grade**: Displayed as "Grade X" (e.g., "Grade 10")
- **Range**: Displayed as "Grades X-Y" (e.g., "Grades 9-12")

### Default Behavior
- When creating a new rule, grade level defaults to 1-12 (all grades)
- Existing rules without grade level data will default to 1-12

## Validation Rules

1. **Range Validation**: `min_grade_level` must be ≤ `max_grade_level`
2. **Value Range**: Both values must be between 1 and 12
3. **Required**: Both fields are required when creating/editing a rule
4. **Frontend Validation**: JavaScript validates before submission
5. **Backend Validation**: API validates on create/update operations

## Example Pricing Rules

### Example 1: Elementary School General Rule
- Rule Name: "Elementary Base Price"
- Subject: All Subjects
- Format: All Formats
- **Grade Level: 1-6**
- Base Price: 50 ETB/hr

### Example 2: High School Advanced STEM
- Rule Name: "Advanced STEM High School"
- Subject: Mathematics or Science
- Format: Online
- **Grade Level: 10-12**
- Base Price: 100 ETB/hr

### Example 3: Middle School Language Arts
- Rule Name: "Middle School Languages"
- Subject: Languages
- Format: In-Person
- **Grade Level: 7-9**
- Base Price: 60 ETB/hr

## Testing Checklist

- [x] Migration script created
- [x] Database columns added with defaults
- [x] Model updated in admin_models.py
- [x] API endpoints updated (Create/Update/Response)
- [x] Validation added in backend
- [x] HTML form fields added
- [x] JavaScript updated for all CRUD operations
- [x] Grade level displayed in rule cards
- [x] Frontend validation added

## Next Steps

After deployment:
1. Run the migration script on production
2. Test creating new rules with various grade level ranges
3. Test editing existing rules to add grade levels
4. Verify grade level display in admin panel
5. Update any tutor matching logic to consider grade levels

## Notes

- **Backward Compatible**: Existing rules without grade level data will automatically use defaults (1-12)
- **Database Constraint**: PostgreSQL check constraint ensures data integrity
- **User Experience**: Clear labels and helper text guide admins
- **Visual Feedback**: Grade level prominently displayed on rule cards

## Files Changed

1. `astegni-backend/migrate_add_grade_level_to_base_price.py` (NEW)
2. `astegni-backend/app.py modules/admin_models.py` (MODIFIED)
3. `astegni-backend/base_price_endpoints.py` (MODIFIED)
4. `admin-pages/manage-system-settings.html` (MODIFIED)
5. `admin-pages/js/admin-pages/base-price-manager.js` (MODIFIED)

## Migration Command

```bash
# Navigate to backend directory
cd astegni-backend

# Run migration
python migrate_add_grade_level_to_base_price.py

# Verify migration
# Check that columns exist and default values are set
```

## API Changes

### Request Body (Create/Update)
```json
{
  "rule_name": "High School Math Online",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 9,
  "max_grade_level": 12,
  "base_price_per_hour": 100.0,
  "credential_bonus": 15.0,
  "experience_bonus_per_year": 5.0,
  "priority": 1,
  "is_active": true
}
```

### Response Body
```json
{
  "id": 1,
  "rule_name": "High School Math Online",
  "subject_category": "mathematics",
  "session_format": "Online",
  "min_grade_level": 9,
  "max_grade_level": 12,
  "base_price_per_hour": 100.0,
  "credential_bonus": 15.0,
  "experience_bonus_per_year": 5.0,
  "priority": 1,
  "is_active": true,
  "created_at": "2026-01-22T10:30:00Z",
  "updated_at": null
}
```

## Summary

Grade level range feature successfully added to base price rules, providing admins with fine-grained control over tutor pricing based on the educational level they teach. All validation, UI, and API changes are complete and ready for testing.
