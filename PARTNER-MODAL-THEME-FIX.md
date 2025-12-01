# Partner Modal Theme Compliance & Database Fix

## Summary
Fixed two critical issues with the partner modal:
1. Add button colors now comply with the page theme (orange instead of purple)
2. Fixed database error where `partnership_type_category` was null

## Issues Fixed

### Issue 1: Button Colors Not Using Theme ❌ → ✅

**Problem:**
- Add Email and Add Phone buttons were using purple gradient colors (#667eea → #764ba2)
- These colors didn't match the site's orange theme

**Solution:**
Updated `.add-field-btn-with-text` to use theme CSS variables:

**Before:**
```css
.add-field-btn-with-text {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}

.add-field-btn-with-text:hover {
    box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
}
```

**After:**
```css
.add-field-btn-with-text {
    background: var(--button-bg);           /* #F59E0B - Orange */
    color: var(--button-text);              /* #FFFFFF - White */
    box-shadow: 0 2px 4px rgba(var(--button-bg-rgb), 0.2);
}

.add-field-btn-with-text:hover {
    background: var(--button-hover);        /* #D97706 - Darker orange */
    box-shadow: 0 4px 8px rgba(var(--button-hover-rgb), 0.3);
}

.add-field-btn-with-text:active {
    background: var(--button-active);       /* #92400E - Even darker */
}
```

**Theme Variables Used:**
- `--button-bg: #F59E0B` (Primary orange)
- `--button-text: #FFFFFF` (White text)
- `--button-hover: #D97706` (Darker orange on hover)
- `--button-active: #92400E` (Darkest on click)
- `--button-bg-rgb: 245, 158, 11` (RGB for shadows)
- `--button-hover-rgb: 217, 119, 6` (RGB for hover shadows)

### Issue 2: Database Null Constraint Error ❌ → ✅

**Problem:**
```
Error creating partner request: null value in column "partnership_type_category"
of relation "partner_requests" violates not-null constraint
```

**Root Cause:**
The backend INSERT statement was missing the `partnership_type_category` column, even though the endpoint was receiving it.

**Solution:**
Updated the INSERT query in `partner_request_endpoints.py`:

**Before:**
```python
cur.execute("""
    INSERT INTO partner_requests (
        company_name,
        contact_person,
        emails,
        phones,
        partnership_type,
        description,
        proposal_file_path,
        status
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    RETURNING id, created_at
""", (
    company_name,
    contact_person,
    json.dumps(emails_list),
    json.dumps(phones_list),
    partnership_type,
    description,
    proposal_file_path,
    'pending'
))
```

**After:**
```python
cur.execute("""
    INSERT INTO partner_requests (
        company_name,
        contact_person,
        emails,
        phones,
        partnership_type,
        partnership_type_category,  # ← ADDED
        description,
        proposal_file_path,
        status
    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)  # ← 9 placeholders now
    RETURNING id, created_at
""", (
    company_name,
    contact_person,
    json.dumps(emails_list),
    json.dumps(phones_list),
    partnership_type,
    partnership_type_category,  # ← ADDED
    description,
    proposal_file_path,
    'pending'
))
```

## Files Modified

1. **css/index.css** (lines 62-92)
   - Changed button colors from purple gradient to theme orange
   - Updated all color references to use CSS variables
   - Ensures consistent theming across the site

2. **astegni-backend/partner_request_endpoints.py** (lines 116-142)
   - Added `partnership_type_category` to INSERT statement
   - Fixed parameter ordering to match column order
   - Now properly stores both partnership_type and category

## Visual Changes

### Before (Purple):
```
[+] Add Email    ← Purple gradient (#667eea → #764ba2)
[+] Add Phone    ← Purple gradient
```

### After (Orange - Theme Compliant):
```
[+] Add Email    ← Orange (#F59E0B) with hover (#D97706)
[+] Add Phone    ← Orange matching site theme
```

## Testing

1. **Test Button Colors:**
   - Open http://localhost:8080
   - Click "Become a Partner"
   - Verify "Add Email" and "Add Phone" buttons are orange
   - Hover over buttons - should turn darker orange (#D97706)
   - Click buttons - should turn even darker (#92400E)

2. **Test Database Insert:**
   - Fill out partner form completely
   - Select "Educational Institution" or "Technology Partner"
   - Submit form
   - Verify success modal appears
   - Check database - `partnership_type_category` should be populated

3. **Test "Other" Type:**
   - Fill out form
   - Select "Other" from Partnership Type
   - Enter custom type (e.g., "Content Provider")
   - Submit
   - Verify:
     - `partnership_type` = "Content Provider" (custom text)
     - `partnership_type_category` = "other"

## Database Verification

Check that data is being stored correctly:

```bash
cd astegni-backend
python -c "
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Get most recent submission
cur.execute('''
    SELECT company_name, partnership_type, partnership_type_category
    FROM partner_requests
    ORDER BY created_at DESC
    LIMIT 1
''')

result = cur.fetchone()
print(f'Company: {result[0]}')
print(f'Type: {result[1]}')
print(f'Category: {result[2]}')

cur.close()
conn.close()
"
```

**Expected Output:**
```
Company: Test Company
Type: educational_institution (or custom text if "other")
Category: educational_institution (or "technology" or "other")
```

## Success Criteria ✅

- ✅ Add Email button uses theme orange color
- ✅ Add Phone button uses theme orange color
- ✅ Hover state uses theme hover color (#D97706)
- ✅ Active state uses theme active color (#92400E)
- ✅ Buttons match other buttons across the site
- ✅ Database INSERT includes partnership_type_category
- ✅ No more null constraint violation errors
- ✅ Form submissions work for all partnership types
- ✅ "Other" type stores both custom text and category

## Theme Compliance

The buttons now properly follow the site's theme system:

| State | Color | Variable |
|-------|-------|----------|
| Normal | #F59E0B (Orange) | `--button-bg` |
| Hover | #D97706 (Dark Orange) | `--button-hover` |
| Active | #92400E (Darker Orange) | `--button-active` |
| Text | #FFFFFF (White) | `--button-text` |

This ensures:
- Consistent user experience across all pages
- Easy theme updates (change variables, all buttons update)
- Professional appearance matching brand colors
- Proper visual feedback on interaction

## Additional Notes

The fix ensures that the partner modal buttons now match:
- Submit buttons
- Navigation buttons
- Call-to-action buttons
- All other primary action buttons on the site

This creates a cohesive visual language throughout the platform.
