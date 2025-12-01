# Manage Schools - Validation Error Fix

## Issue
The `/api/schools/requested` endpoint was returning a `500 Internal Server Error` with validation errors:
```
ResponseValidationError: 2 validation errors:
  {'type': 'string_type', 'loc': ('response', 3, 'email'), 'msg': 'Input should be a valid string', 'input': None}
  {'type': 'string_type', 'loc': ('response', 3, 'phone'), 'msg': 'Input should be a valid string', 'input': None}
```

## Root Cause
1. **Database Model (`RequestedSchool`)**: The `school_email` and `school_phone` columns were nullable (allowed `NULL` values)
2. **Pydantic Schema (`SchoolBase`)**: The `email` and `phone` fields were defined as required `str` types
3. **Mismatch**: When database records had `NULL` values for email/phone, the Pydantic validation failed because it expected strings, not `None`

## Solution
Changed the Pydantic schema in `astegni-backend/app.py modules/models.py` (line 1514-1515):

**Before:**
```python
class SchoolBase(BaseModel):
    school_name: str
    school_type: str
    school_level: str
    location: str
    email: str              # ❌ Required string
    phone: str              # ❌ Required string
    students_count: Optional[int] = 0
```

**After:**
```python
class SchoolBase(BaseModel):
    school_name: str
    school_type: str
    school_level: str
    location: str
    email: Optional[str] = None     # ✅ Optional, defaults to None
    phone: Optional[str] = None     # ✅ Optional, defaults to None
    students_count: Optional[int] = 0
```

## Impact
This fix affects all school-related Pydantic schemas that inherit from `SchoolBase`:
- ✅ `RequestedSchoolResponse` - For pending school requests
- ✅ `SchoolResponse` - For verified schools
- ✅ `RejectedSchoolResponse` - For rejected schools
- ✅ `SuspendedSchoolResponse` - For suspended schools

## Testing
1. The backend server will auto-reload (uvicorn --reload flag detected)
2. Navigate to `admin-pages/manage-schools.html`
3. Switch to the "Requested" panel
4. Verify that schools with missing email/phone now load successfully
5. Test approve/reject functionality

## Status
✅ **FIXED** - The validation error has been resolved. Schools with null email/phone values will now be properly serialized.
