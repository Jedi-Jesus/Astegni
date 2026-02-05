# Package Session Format - Changed to Radio Buttons

## The Change

Changed session format from **checkboxes** (allowing multiple selections) to **radio buttons** (allowing only one selection) in the package management modal.

## Why This Change?

### Previous Issue
- Checkboxes allowed tutors to select multiple formats: Online, In-person, Self-paced
- This created confusion because a **single package** should only have ONE session format
- The "Hybrid" concept applies to **tutors** (who have multiple packages), not individual packages

### New Approach
- Radio buttons ensure only ONE format per package
- Tutors offering both formats create separate packages (one for Online, one for In-person)
- Backend properly aggregates package formats to determine if tutor is "Hybrid"

## Files Modified

### js/tutor-profile/package-manager-clean.js

#### 1. Form HTML (Lines 1062-1077)
**Changed from checkboxes to radio buttons:**

```javascript
// BEFORE (Checkboxes)
<input type="checkbox" id="formatOnline" ${pkg.sessionFormat?.includes('online') ? 'checked' : ''}>
<input type="checkbox" id="formatInPerson" ${pkg.sessionFormat?.includes('in-person') ? 'checked' : ''}>
<input type="checkbox" id="formatSelfPaced" ${pkg.sessionFormat?.includes('self-paced') ? 'checked' : ''}>

// AFTER (Radio Buttons)
<input type="radio" name="sessionFormat" id="formatOnline" value="Online" ${pkg.session_format?.toLowerCase() === 'online' ? 'checked' : ''}>
<input type="radio" name="sessionFormat" id="formatInPerson" value="In-person" ${pkg.session_format?.toLowerCase() === 'in-person' ? 'checked' : ''}>
// Removed Self-paced option
```

**Key changes:**
- ✅ Changed `type="checkbox"` to `type="radio"`
- ✅ Added `name="sessionFormat"` (required for radio button grouping)
- ✅ Added `value` attribute ("Online" or "In-person")
- ✅ Changed condition to check single value instead of array
- ✅ Removed "Self-paced" option (can be added back if needed as a third radio option)

#### 2. Save Package Logic (Lines 2089-2091)
**Changed from array to single value:**

```javascript
// BEFORE (Multiple checkboxes)
const sessionFormat = [];
if (document.getElementById('formatOnline')?.checked) sessionFormat.push('online');
if (document.getElementById('formatInPerson')?.checked) sessionFormat.push('in-person');
if (document.getElementById('formatSelfPaced')?.checked) sessionFormat.push('self-paced');

// AFTER (Single radio button)
const sessionFormatRadio = document.querySelector('input[name="sessionFormat"]:checked');
const sessionFormat = sessionFormatRadio ? sessionFormatRadio.value : null;
```

**Result:**
- Before: `sessionFormat = ['online', 'in-person']` (array)
- After: `sessionFormat = 'Online'` (string) or `null`

#### 3. Backend Data Conversion - Create (Line 117)
```javascript
// BEFORE
session_format: Array.isArray(packageData.sessionFormat) ? packageData.sessionFormat.join(', ') : null,

// AFTER
session_format: packageData.sessionFormat || null,  // Single value: 'Online' or 'In-person'
```

#### 4. Backend Data Conversion - Update (Line 231)
```javascript
// BEFORE
session_format: Array.isArray(data.sessionFormat) ? data.sessionFormat.join(', ') : null,

// AFTER
session_format: data.sessionFormat || null,  // Single value: 'Online' or 'In-person'
```

#### 5. Load Package from Backend (Line 335)
```javascript
// BEFORE
sessionFormat: backendPackage.session_format ? backendPackage.session_format.split(', ').filter(f => f) : [],

// AFTER
session_format: backendPackage.session_format || null,  // Single value: 'Online' or 'In-person'
```

#### 6. Display in Sidebar (Lines 2288-2291)
```javascript
// BEFORE
${pkg.sessionFormat && pkg.sessionFormat.length > 0
    ? pkg.sessionFormat.map(format =>
        `<span>...${format}</span>`
      ).join('')
    : `<span>Not specified</span>`
}

// AFTER
${pkg.session_format
    ? `<span>...${pkg.session_format}</span>`
    : `<span>Not specified</span>`
}
```

#### 7. Display in View Mode (Lines 2422-2426)
```javascript
// BEFORE
if (pkg.sessionFormat && pkg.sessionFormat.length > 0) {
    formatContainer.innerHTML = pkg.sessionFormat.map(format =>
        `<span>${format}</span>`
    ).join('');
} else {
    formatContainer.innerHTML = '<p>No format specified</p>';
}

// AFTER
if (pkg.session_format) {
    formatContainer.innerHTML = `<span>${pkg.session_format}</span>`;
} else {
    formatContainer.innerHTML = '<p>Not specified</p>';
}
```

## Database Impact

### Before
```sql
-- Packages could store comma-separated values
tutor_packages:
  id: 1, session_format: 'online, in-person'  -- Not ideal
```

### After
```sql
-- Each package has ONE format
tutor_packages:
  id: 1, session_format: 'Online'
  id: 2, session_format: 'In-person'
```

## How "Hybrid" Works Now

### Tutor Level (Find Tutors Page)
**Backend aggregates all packages:**
```python
# routes.py - Get all session formats from tutor's packages
session_formats = ['Online', 'In-person']  # From multiple packages

# Display logic
if 'Online' in session_formats and 'In-person' in session_formats:
    session_format_display = "Hybrid"  # ✅
```

**Result:** Tutor card shows "Hybrid"

### Package Level (Package Management Modal)
**Individual package:**
```javascript
// Package 1
session_format: "Online"  // Shows: Online

// Package 2
session_format: "In-person"  // Shows: In-person
```

**Result:** Each package shows its specific format

## User Experience

### Creating a Package
1. Tutor opens package management modal
2. Sees session format with TWO radio button options:
   - 🖥️ Online
   - 👥 In-person
3. Can only select ONE (radio button behavior)
4. Saves package with that single format

### Offering Both Formats
1. Create Package 1: Select "Online"
2. Create Package 2: Select "In-person"
3. Backend detects tutor has both formats
4. Tutor card on find-tutors page shows "Hybrid" ✅

## Display Values

| Package session_format | Package Display | Tutor Display (if only this package) |
|------------------------|-----------------|-------------------------------------|
| `'Online'` | "Online" | "Online" |
| `'In-person'` | "In-person" | "In-person" |
| `NULL` | "Not specified" | "Not specified" |
| Has both packages | N/A | "Hybrid" ✅ |

## Benefits

✅ **Clearer UX**: Radio buttons make it obvious only one format per package
✅ **Database integrity**: No comma-separated values
✅ **Proper "Hybrid" concept**: Applies to tutors, not individual packages
✅ **Simpler logic**: No array handling, just single string values
✅ **Consistent with design**: Matches other single-choice fields (schedule type, payment frequency)

## Next Steps for View Tutor Page

The view-tutor page (view-tutor-db-loader.js) still needs similar updates to properly display individual package formats. Currently at line 1244-1249, it tries to handle "both" format which no longer exists.

**Recommended fix:**
```javascript
// view-tutor-db-loader.js Line 1244-1250
// CURRENT (handles old "both" format)
const sessionFormats = pkg.session_format
    ? (typeof pkg.session_format === 'string'
        ? (pkg.session_format.toLowerCase() === 'both' ? ['Online', 'In-person'] : [pkg.session_format])
        : pkg.session_format)
    : [];

// SHOULD BE (handle single format)
const sessionFormat = pkg.session_format || 'Not specified';
```

This will properly display "Online", "In-person", or "Not specified" for each package.

## Summary

Converted session format from checkboxes (multiple selection) to radio buttons (single selection) in the package management modal. Each package now has exactly ONE session format. Tutors become "Hybrid" when they have multiple packages with different formats, which is detected at the backend aggregation level.
