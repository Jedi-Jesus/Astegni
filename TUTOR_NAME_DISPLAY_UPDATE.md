# Tutor Name Display - Dual Naming Convention Support

## Summary
Updated the tutor card display system to support both Ethiopian and international naming conventions.

## Changes Made

### 1. Backend API Update
**File:** `astegni-backend/app.py modules/routes.py`
- **Line 1364:** Added `"last_name": tutor.user.last_name` to the tutor data response
- The API now returns `last_name` field alongside existing Ethiopian naming fields (`first_name`, `father_name`, `grandfather_name`)

### 2. Frontend Display Logic Update
**File:** `js/find-tutors/tutor-card-creator.js`
- **Lines 7-21:** Updated `createTutorCard()` method to intelligently handle both naming conventions

#### New Logic:
```javascript
// Priority order:
// 1. Use full_name if already provided
// 2. If last_name exists → International: first_name + last_name
// 3. Otherwise → Ethiopian: first_name + father_name
```

## How It Works

### Ethiopian Naming Convention
- **Format:** first_name + father_name (+ grandfather_name)
- **Example:** "Abebe Kebede" (first_name: Abebe, father_name: Kebede)
- **When used:** When `last_name` field is `null` or empty

### International Naming Convention
- **Format:** first_name + last_name
- **Example:** "John Smith" (first_name: John, last_name: Smith)
- **When used:** When `last_name` field has a value

## Database Schema
The `users` table already supports both conventions:
- `first_name` (required)
- `father_name` (optional - Ethiopian)
- `grandfather_name` (optional - Ethiopian)
- `last_name` (optional - International)

## Testing
To test the implementation:

1. **Ethiopian tutor:**
   - first_name: "Abebe"
   - father_name: "Kebede"
   - last_name: null
   - **Display:** "Abebe Kebede"

2. **International tutor:**
   - first_name: "John"
   - father_name: null
   - last_name: "Smith"
   - **Display:** "John Smith"

3. **Tutor with full_name:**
   - full_name: "Dr. Jane Doe"
   - **Display:** "Dr. Jane Doe"

## Benefits
- ✅ Supports Ethiopian naming convention (existing functionality)
- ✅ Supports international first name + last name format (new)
- ✅ Backward compatible with existing tutor data
- ✅ Flexible for global expansion
- ✅ No breaking changes to existing code

## Files Modified
1. `astegni-backend/app.py modules/routes.py` - Added last_name to API response
2. `js/find-tutors/tutor-card-creator.js` - Updated name display logic
