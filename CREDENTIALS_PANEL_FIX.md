# Credentials Panel "No Credentials" Bug - Fix Complete

## Issue
Credentials panel in tutor profile was showing "No credentials found" even though the database had 2 credentials for the user.

## Root Cause: ID Mismatch

The API endpoint `/api/tutor/documents` was using the wrong ID to query the credentials table.

### The Problem:

**User Data:**
- `users.id` = 1 (user_id)
- `tutor_profiles.id` = 5 (tutor_id)
- `credentials.uploader_id` = 1 (stores user_id, not tutor_id)

**What the API was doing (WRONG):**
```python
# Line 362: Get tutor_profiles.id
tutor_id = get_tutor_id_from_user(current_user.id)  # Returns 5

# Lines 380, 390: Query with tutor_id
WHERE uploader_id = %s  # Using tutor_id = 5 ❌
```

**SQL Query that ran:**
```sql
SELECT * FROM credentials
WHERE uploader_id = 5 AND uploader_role = 'tutor'
```

**Result:** 0 credentials found (because `uploader_id = 1`, not 5)

---

## The Fix

**File:** `astegni-backend/credentials_endpoints.py`
**Function:** `get_tutor_documents()`
**Lines:** 361-392

### Changes Made:

**Before:**
```python
try:
    tutor_id = get_tutor_id_from_user(current_user.id)
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            if document_type:
                cursor.execute("""
                    SELECT * FROM credentials
                    WHERE uploader_id = %s AND uploader_role = 'tutor' AND document_type = %s
                    ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                """, (tutor_id, document_type))  # ❌ Using tutor_id
            else:
                cursor.execute("""
                    SELECT * FROM credentials
                    WHERE uploader_id = %s AND uploader_role = 'tutor'
                    ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                """, (tutor_id,))  # ❌ Using tutor_id
```

**After:**
```python
try:
    # Verify tutor profile exists
    tutor_id = get_tutor_id_from_user(current_user.id)
    if not tutor_id:
        raise HTTPException(status_code=404, detail="Tutor profile not found")

    # FIX: Use user_id (not tutor_id) to query credentials table
    # credentials.uploader_id stores user_id, not tutor_profiles.id
    user_id = current_user.id

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            if document_type:
                cursor.execute("""
                    SELECT * FROM credentials
                    WHERE uploader_id = %s AND uploader_role = 'tutor' AND document_type = %s
                    ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                """, (user_id, document_type))  # ✅ Using user_id
            else:
                cursor.execute("""
                    SELECT * FROM credentials
                    WHERE uploader_id = %s AND uploader_role = 'tutor'
                    ORDER BY date_of_issue DESC NULLS LAST, created_at DESC
                """, (user_id,))  # ✅ Using user_id
```

### Key Changes:
1. Added `user_id = current_user.id` (line 368)
2. Changed `(tutor_id, document_type)` to `(user_id, document_type)` (line 380)
3. Changed `(tutor_id,)` to `(user_id,)` (line 390)
4. Added explanatory comments

---

## Why This Works

**New SQL Query:**
```sql
SELECT * FROM credentials
WHERE uploader_id = 1 AND uploader_role = 'tutor'
```

**Result:** 2 credentials found ✅

| ID | uploader_id | document_type | title | years |
|----|-------------|---------------|-------|-------|
| 11 | 1 | experience | Test | 5 |
| 12 | 1 | experience | Test | 5 |

---

## Impact

### Before Fix:
- Credentials panel: "No credentials found"
- Credentials count in UI: 0
- Market pricing calculation: 0 credentials (0 bonus)

### After Fix:
- Credentials panel: Shows 2 credentials
- Credentials count in UI: 2
- Market pricing calculation: 2 credentials (60 ETB bonus)

---

## Testing

### 1. Restart Backend
```bash
cd astegni-backend
python app.py
```

### 2. Test API Endpoint
```bash
curl -X GET "http://localhost:8000/api/tutor/documents" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": 12,
    "tutor_id": 1,
    "document_type": "experience",
    "title": "Test",
    "issued_by": "Astegni",
    "years": 5,
    ...
  },
  {
    "id": 11,
    "tutor_id": 1,
    "document_type": "experience",
    "title": "Test",
    "issued_by": "Astegni",
    "years": 5,
    ...
  }
]
```

### 3. Test in Browser
1. Open tutor profile page
2. Go to Credentials panel
3. **Expected:** See 2 credentials displayed
4. Credential counts should show: "2" instead of "0"

---

## Related Systems Affected

### ✅ Market Pricing
With 2 credentials now visible, market pricing will correctly calculate:
- **Credentials Score:** 10/100 (2 × 5 points)
- **Credential Bonus:** 60 ETB (2 × 30 ETB)

**New suggested prices:**
- **Online:** 100 + 60 + 300 = **460 ETB** (was 100 ETB)
- **In-person:** 200 + 60 + 300 = **560 ETB** (was 200 ETB)

*Note: 300 ETB is from 10 years experience bonus (already in database)*

---

## Database Schema Reference

### credentials table:
```sql
CREATE TABLE credentials (
    id SERIAL PRIMARY KEY,
    uploader_id INTEGER NOT NULL,        -- Stores users.id (NOT tutor_profiles.id)
    uploader_role VARCHAR(50) NOT NULL,  -- 'tutor', 'student', 'parent'
    document_type VARCHAR(50),           -- 'academic', 'achievement', 'experience'
    title VARCHAR(255),
    issued_by VARCHAR(255),
    years INTEGER,                       -- Years of experience (for experience type)
    ...
);
```

### Key Point:
- `credentials.uploader_id` = `users.id` (user_id)
- `credentials.uploader_id` ≠ `tutor_profiles.id` (tutor_id)

---

## Why Was This Wrong?

The confusion came from the function name `get_tutor_id_from_user()` which returns `tutor_profiles.id`.

This is correct for some operations (like getting tutor-specific data from `tutor_analysis` table), but NOT for credentials.

The credentials table is a **unified table** used by all roles (tutor, student, parent), so it uses `users.id` as the common identifier.

---

## Files Modified

1. ✅ `astegni-backend/credentials_endpoints.py` (lines 361-392)
   - Added `user_id = current_user.id`
   - Changed 2 query parameters from `tutor_id` to `user_id`
   - Added explanatory comments

---

## Verification Query

To verify the fix works, run this SQL:

```sql
-- What the old code queried (WRONG)
SELECT COUNT(*) FROM credentials
WHERE uploader_id = 5 AND uploader_role = 'tutor';
-- Result: 0

-- What the new code queries (CORRECT)
SELECT COUNT(*) FROM credentials
WHERE uploader_id = 1 AND uploader_role = 'tutor';
-- Result: 2
```

---

## Summary

**Problem:** API used `tutor_profiles.id` to query `credentials.uploader_id`

**Solution:** Use `users.id` instead

**Result:** Credentials panel now shows all credentials correctly

**Status:** ✅ Fixed - Restart backend to apply changes
