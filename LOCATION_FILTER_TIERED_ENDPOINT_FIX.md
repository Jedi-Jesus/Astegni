# Location Filter - Tiered Endpoint Fix

## ✅ Issue Fixed

**Problem:** When selecting a location filter, tutors weren't being filtered because the `/api/tutors/tiered` endpoint was missing the `user_location` parameter and filter logic.

**Root Cause:** The location filter fix was only applied to the standard `/api/tutors` endpoint, but the frontend uses the tiered endpoint (`/api/tutors/tiered`) by default.

## Changes Made

### 1. Added `user_location` Parameter to Tiered Endpoint
**File:** `astegni-backend/app.py modules/routes.py`
**Line:** 1571

```python
@router.get("/api/tutors/tiered")
def get_tutors_tiered(
    # ... other parameters ...
    user_location: Optional[str] = Query(None),  # NEW: Filter tutors by location
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
```

### 2. Added Location Filter Logic
**File:** `astegni-backend/app.py modules/routes.py`
**Lines:** 1720-1732

```python
# Location filter - filter tutors by matching user's location
if user_location:
    print(f"[Tiered - Location Filter] Filtering tutors near: {user_location}")
    # Case-insensitive partial match on location field in users table
    # Also exclude tutors with NULL, empty, or "Not specified" locations
    query = query.filter(
        and_(
            User.location.isnot(None),  # Not NULL
            User.location != '',  # Not empty
            func.lower(User.location) != 'not specified',  # Not "Not specified"
            func.lower(User.location).contains(user_location.lower())  # Contains selected location
        )
    )
```

## How It Works Now

### Before Fix:
```
User selects "In Addis Ababa"
    ↓
Frontend sends: /api/tutors/tiered?user_location=Addis+Ababa,+Ethiopia
    ↓
Backend ignores user_location (parameter doesn't exist)
    ↓
Returns ALL tutors (including "Not specified" locations)
    ↓
3 tutors shown (no filtering)
```

### After Fix:
```
User selects "In Addis Ababa"
    ↓
Frontend sends: /api/tutors/tiered?user_location=Addis+Ababa,+Ethiopia
    ↓
Backend filters:
  ✅ Location is NOT NULL
  ✅ Location is NOT empty
  ✅ Location is NOT "not specified"
  ✅ Location contains "addis ababa, ethiopia"
    ↓
Returns ONLY matching tutors
    ↓
Tutors properly filtered by location
```

## Testing

### 1. Restart Backend Server
The backend server has been restarted automatically with the fix applied.

### 2. Test in Browser
```
1. Open: http://localhost:8081/branch/find-tutors.html
2. Login as: jediael.s.abebe@gmail.com
3. Select different locations from the dropdown
4. Verify: Tutor count changes based on location selected
```

### 3. Watch Console Output
You should see:
```
[API] Adding location filter: Addis Ababa, Ethiopia
[API] Full URL: .../tutors/tiered?...&user_location=Addis+Ababa%2C+Ethiopia
```

And in backend logs:
```
[Tiered - Location Filter] Filtering tutors near: Addis Ababa, Ethiopia
```

### 4. Expected Behavior

| Selection | Behavior |
|-----------|----------|
| "All Locations" | Shows all tutors (including "Not specified") |
| "In Ethiopia" | Shows only tutors with valid Ethiopian locations |
| "In Addis Ababa" | Shows only tutors in Addis Ababa |
| "In Yeka" | Shows only tutors in Yeka sub-city |
| "In Megenagna" | Shows only tutors in Megenagna neighborhood |

**"Not specified" tutors excluded:** ✅ When any specific location is selected

## Console Debug

When you select a location now, you'll see in backend terminal:

```
[Tiered - Location Filter] Filtering tutors near: Addis Ababa, Ethiopia
```

And the number of tutors returned should change based on how many tutors actually have that location in their profile.

## Files Modified

1. ✅ **`astegni-backend/app.py modules/routes.py`**
   - Line 1571: Added `user_location` parameter
   - Lines 1720-1732: Added location filter logic

## Summary

✅ **Tiered endpoint now supports location filtering**
✅ **Excludes "Not specified" locations when filter is active**
✅ **Matches hierarchical location strings (partial matching)**
✅ **Case-insensitive filtering**

---

**Fix Applied:** 2026-01-23
**Backend Restarted:** Yes
**Ready to Test:** Yes

**Next Step:** Refresh the find-tutors page and test the location filter!
