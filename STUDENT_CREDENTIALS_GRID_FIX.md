# Student Profile Credentials Grid Fix

## Issue
The student profile credentials panel was showing "Credentials grid not found" errors when switching between Academic and Achievement credential types.

## Root Cause
The student profile was loading the **tutor** profile's `credential-manager.js` which expects a different HTML structure:
- **Tutor structure**: Single grid (`credentials-grid`) that filters content by type
- **Student structure**: Multiple grids (`achievements-grid`, `academic-grid`) with separate sections

Additionally, there were mismatches in the inline credential code:
1. **Section Type Mapping**: The onclick handler uses `'academic'` (singular) but the JavaScript mapping only had `'academics'` (plural)
2. **Container ID Mismatch**:
   - HTML has: `id="academic-grid"` and `id="academic-empty-state"`
   - JavaScript expected: `id="certificates-grid"` and `id="certificates-empty-state"`

## Files Modified
- [profile-pages/student-profile.html](profile-pages/student-profile.html)

## Changes Made

### 1. Removed Conflicting Script Tag (Line ~6017)
**The main fix**: Removed the tutor credential-manager.js script that was conflicting with the student profile's inline credential management.

**Before:**
```html
<!-- Credential Manager (unified credential upload handling) -->
<script src="../js/tutor-profile/credential-manager.js"></script>
```

**After:**
```html
<!-- Note: Student profile has inline credential management (different structure than tutor) -->
<!-- DO NOT load credential-manager.js - it conflicts with student inline code -->
```

The tutor's `credential-manager.js` looks for a single `id="credentials-grid"` element, but the student profile has:
- `id="achievements-grid"` for achievements
- `id="academic-grid"` for academic credentials

This architectural difference requires separate implementations.

### 2. Fixed Section Type Mapping (Line ~7023)
**Before:**
```javascript
const sectionToTypeMap = {
    'achievement': 'achievement',
    'academics': 'academic_certificate',
    'extracurricular': 'extracurricular'
};
```

**After:**
```javascript
const sectionToTypeMap = {
    'achievement': 'achievement',
    'academic': 'academic_certificate',      // Added singular form
    'academics': 'academic_certificate',     // Kept plural for compatibility
    'extracurricular': 'extracurricular'
};
```

### 3. Fixed Container Maps in Multiple Functions

Updated three functions that use containerMap and emptyStateMap:
- `showCredentialLoadingState()` (Line ~6536)
- `showCredentialErrorState()` (Line ~6580)
- `renderCredentials()` (Line ~6669)

**Before (all three functions):**
```javascript
const containerMap = {
    'achievement': 'achievements-grid',
    'academic_certificate': 'certificates-grid',  // ❌ Wrong ID
    'extracurricular': 'extracurricular-list'
};

const emptyStateMap = {
    'achievement': 'achievements-empty-state',
    'academic_certificate': 'certificates-empty-state',  // ❌ Wrong ID
    'extracurricular': 'extracurricular-empty-state'
};
```

**After (all three functions):**
```javascript
const containerMap = {
    'achievement': 'achievements-grid',
    'academic_certificate': 'academic-grid',  // ✅ Correct ID
    'extracurricular': 'extracurricular-list'
};

const emptyStateMap = {
    'achievement': 'achievements-empty-state',
    'academic_certificate': 'academic-empty-state',  // ✅ Correct ID
    'extracurricular': 'extracurricular-empty-state'
};
```

## HTML Structure (Unchanged)
The HTML already had the correct structure:
```html
<!-- Achievement Section -->
<div id="cred-section-achievement" class="credential-section">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="achievements-grid">
        <div class="text-center text-gray-500 py-12 col-span-full" id="achievements-empty-state">
            <!-- Empty state content -->
        </div>
    </div>
</div>

<!-- Academic Section -->
<div id="cred-section-academic" class="credential-section hidden">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="academic-grid">
        <div class="text-center text-gray-500 py-12 col-span-full" id="academic-empty-state">
            <!-- Empty state content -->
        </div>
    </div>
</div>
```

## Testing
After these changes, the credentials panel should:
1. ✅ Switch between Achievement and Academic sections without errors
2. ✅ Display loading states correctly
3. ✅ Display error states correctly
4. ✅ Render credentials in the correct grid
5. ✅ Show/hide empty states appropriately

## How to Test
1. Open student profile
2. Click on "Credentials" in sidebar
3. Click on "Academic Credentials" card
4. Click on "Awards and Honors" card
5. Check browser console - should see no "Credentials grid not found" errors
6. Verify credentials load and display in the correct sections

## Why Two Different Implementations?

### Tutor Profile ([js/tutor-profile/credential-manager.js](js/tutor-profile/credential-manager.js))
- **Structure**: Single grid layout
- **Grid ID**: `credentials-grid` (one grid for all types)
- **Switching**: Filters and re-renders the same grid
- **Types**: Achievement, Academic, Experience (3 types)

### Student Profile (Inline in [profile-pages/student-profile.html](profile-pages/student-profile.html))
- **Structure**: Multiple grid layout with tabbed sections
- **Grid IDs**: `achievements-grid`, `academic-grid` (separate grids)
- **Switching**: Shows/hides different grid sections
- **Types**: Achievement, Academic (2 types, no experience)

## Status
✅ **FIXED** - Removed conflicting script, all container ID mismatches resolved, section type mapping corrected

## Summary of Fixes
1. ✅ Removed `credential-manager.js` script tag (conflicted with inline code)
2. ✅ Added `'academic'` to section type mapping
3. ✅ Updated all container maps: `certificates-grid` → `academic-grid`
4. ✅ Updated all empty state maps: `certificates-empty-state` → `academic-empty-state`
