# View Modal Edit Mode Fix - Complete

## Problem
When clicking "Edit" on a course request in the view modal, the fields are converted from text elements to input/select elements. If you then try to view a different course without closing the modal, you get this error:

```
TypeError: Cannot set properties of null (setting 'textContent')
```

This happens because the code tries to set `textContent` on elements that have been converted to `<input>` and `<select>` elements during edit mode.

## Root Cause
The `viewCourseRequest()` and `viewCourse()` functions assumed the modal elements were always in display mode (plain text), but clicking "Edit" converted them to input elements. Viewing another course while in edit mode caused the error.

## Solution
Added a new `resetViewModalToDisplayMode()` function that:
1. Detects if the modal is in edit mode
2. Preserves current input values
3. Converts all input/select elements back to plain text display
4. Restores the proper HTML structure

This function is called at the start of both:
- `viewCourseRequest()` - for course requests (REQ-* and REJ-* IDs)
- `viewCourse()` - for active/suspended courses

## Changes Made

### File: `js/admin-pages/manage-courses-standalone.js`

1. **Added `resetViewModalToDisplayMode()` function** (lines 1228-1281)
   - Checks if modal is in edit mode
   - Converts inputs back to text elements
   - Preserves current values when resetting

2. **Updated `viewCourseRequest()` function** (line 422)
   - Added `resetViewModalToDisplayMode()` call at the start

3. **Updated `viewCourse()` function** (line 583)
   - Added `resetViewModalToDisplayMode()` call at the start

## How It Works

**Before the fix:**
1. User views Course A
2. User clicks "Edit" → fields become inputs
3. User views Course B → ERROR (tries to set textContent on input elements)

**After the fix:**
1. User views Course A
2. User clicks "Edit" → fields become inputs
3. User views Course B → `resetViewModalToDisplayMode()` converts inputs back to text → Course B loads successfully

## Testing

Tested the following workflow:
1. View a course request (REQ-CRS-001)
2. Click "Edit" to enable edit mode
3. Click on another course request in the table (REQ-CRS-003)
4. Verify the new course loads without error
5. Click "Edit" again
6. Switch between courses multiple times
7. All operations work smoothly

## Benefits
- No more crashes when switching courses in edit mode
- Seamless user experience when browsing courses
- Preserves unsaved changes when applicable
- Clean modal state management

---

**Status:** ✅ Complete and tested
**Date:** 2025-10-18
