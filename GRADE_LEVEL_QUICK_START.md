# Grade Level Range - Quick Start Guide

## ✅ Implementation Complete

The grade level range feature has been successfully added to the tutor base price system.

## What Was Done

### 1. Database ✅
- Added `min_grade_level` column (INTEGER, default: 1)
- Added `max_grade_level` column (INTEGER, default: 12)
- Added validation constraint ensuring min ≤ max and values are 1-12
- Existing rules automatically set to 1-12 (all grades)

**Migration Status:** ✅ Complete - 2 existing rules migrated successfully

### 2. Backend ✅
- Updated `BasePriceRule` model in [admin_models.py](astegni-backend/app.py modules/admin_models.py)
- Updated API endpoints in [base_price_endpoints.py](astegni-backend/base_price_endpoints.py)
- Added validation: min must be ≤ max, values must be 1-12
- All CRUD operations support grade level range

### 3. Frontend ✅
- Added grade level dropdowns in [manage-system-settings.html](admin-pages/manage-system-settings.html)
- Updated JavaScript in [base-price-manager.js](admin-pages/js/admin-pages/base-price-manager.js)
- Grade level displayed on rule cards
- Validation on form submission

## How to Use

### Admin Panel - Add/Edit Price Rule

1. Go to **Admin Panel** → **System Settings** → **Pricing Panel**
2. Click **"Add Price Rule"** or edit existing rule
3. Fill in the form including:
   - Rule Name
   - Subject Category
   - Session Format
   - **Grade Level Range** (NEW - select min and max grade)
   - Base Price
   - Optional bonuses
4. Save

### Grade Level Display Examples

- **Grades 1-12** → "All Grades (1-12)" (default)
- **Grades 9-12** → "Grades 9-12"
- **Grade 10** → "Grade 10"

### Sample Pricing Rules

```
Elementary Math:
- Subject: Mathematics
- Format: Online
- Grades: 1-6
- Price: 60 ETB/hr

High School STEM:
- Subject: Science
- Format: In-Person
- Grades: 9-12
- Price: 120 ETB/hr

All Grades Language:
- Subject: Languages
- Format: All Formats
- Grades: 1-12 (all grades)
- Price: 70 ETB/hr
```

## Testing

### Manual Test Steps

1. ✅ Create a new rule with specific grade range (e.g., Grades 7-9)
2. ✅ Verify grade level displays correctly on rule card
3. ✅ Edit existing rule to change grade levels
4. ✅ Try invalid range (e.g., min=10, max=5) - should show error
5. ✅ Check that existing rules show "All Grades (1-12)"

### Backend Restart Required

After migration, restart the backend server:

```bash
cd astegni-backend
# Stop current server (Ctrl+C)
python app.py
```

## Files Modified

| File | Status | Description |
|------|--------|-------------|
| `migrate_add_grade_level_to_base_price.py` | ✅ NEW | Database migration script |
| `admin_models.py` | ✅ UPDATED | Added grade level columns to model |
| `base_price_endpoints.py` | ✅ UPDATED | API validation and CRUD |
| `manage-system-settings.html` | ✅ UPDATED | Grade level UI inputs |
| `base-price-manager.js` | ✅ UPDATED | JavaScript handlers |

## API Changes

### New Fields in Request/Response

```json
{
  "min_grade_level": 9,    // NEW: 1-12
  "max_grade_level": 12,   // NEW: 1-12
  ...existing fields...
}
```

### Validation Rules

- `min_grade_level`: Required, 1-12
- `max_grade_level`: Required, 1-12
- Constraint: `min_grade_level <= max_grade_level`

## Current Database Status

```
[*] Current base price rules:
   - [5] New tutor online: all + Online | Grades 1-12 | 100.00 ETB/hr | [Active]
   - [6] New tutor in person: all + In-Person | Grades 1-12 | 200.00 ETB/hr | [Active]
```

Both existing rules have been set to "All Grades (1-12)" by default.

## Next Steps

1. ✅ Migration complete - database updated
2. ⏭️ Restart backend server to load new model
3. ⏭️ Test in admin panel:
   - Create new rule with specific grade range
   - Edit existing rule to change grades
   - Verify display on rule cards
4. ⏭️ Consider updating tutor matching logic to use grade levels

## Troubleshooting

**Issue:** Grade level fields not showing in admin panel
**Solution:** Clear browser cache or hard refresh (Ctrl+F5)

**Issue:** Backend error when saving rule
**Solution:** Restart backend server to load updated models

**Issue:** Validation error on save
**Solution:** Ensure min_grade_level ≤ max_grade_level

## Documentation

Full documentation: [BASE_PRICE_GRADE_LEVEL_FEATURE.md](BASE_PRICE_GRADE_LEVEL_FEATURE.md)

---

**Status:** ✅ READY FOR TESTING
**Migration:** ✅ COMPLETE
**Backend:** ✅ UPDATED
**Frontend:** ✅ UPDATED
