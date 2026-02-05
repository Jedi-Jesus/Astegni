# Student Credentials User ID Fix

## Issue

Student credentials were being saved with `uploader_id = profile_id` (student_profile.id) instead of `uploader_id = user_id` (users.id), which was inconsistent with how tutor credentials work.

### Example Problem:
- User: Kush Studios
- `users.id` = 2
- `student_profiles.id` = 1
- **Before Fix**: Credentials saved with `uploader_id = 1` (profile_id)
- **After Fix**: Credentials saved with `uploader_id = 2` (user_id)

## Root Cause

The unified credentials endpoint (`/api/documents/upload`) was using `get_profile_id_for_role()` to get the profile ID, while the tutor-specific endpoint (`/api/tutor/documents/upload`) was using `current_user.id` directly.

This created an inconsistency:
- **Tutors**: `uploader_id = user_id` (from JWT token)
- **Students**: `uploader_id = profile_id` (from student_profiles table)

## Solution

Changed all unified credential endpoints to use **`current_user.id`** (user_id) instead of `profile_id`, making the system consistent with how tutors work.

The `uploader_role` field differentiates between student and tutor credentials for the same user.

## Files Modified

### `astegni-backend/credentials_endpoints.py`

#### 1. Upload Endpoint (`POST /api/documents/upload`)
**Lines changed: 1497-1511, 1528-1533, 1560-1570, 1573-1589**

**Before:**
```python
# Get profile ID for the specified role
profile_id = get_profile_id_for_role(current_user.id, uploader_role)
if not profile_id:
    raise HTTPException(status_code=404, detail=f"{uploader_role.capitalize()} profile not found")

# Upload file
file_upload_result = b2_service.upload_file(
    file_data=file_content,
    file_name=file.filename,
    file_type="files",
    user_id=profile_id  # WRONG: Using profile_id
)

# Insert credential
cursor.execute("""
    INSERT INTO credentials (uploader_id, ...)
    VALUES (%s, ...)
""", (profile_id, ...))  # WRONG: Using profile_id
```

**After:**
```python
# USER-BASED: Use current_user.id directly (credentials belong to the user, not the profile)
# The uploader_role field indicates which role uploaded it
print(f"   Using user_id: {current_user.id} (uploader_role: '{uploader_role}')")

# Upload file
file_upload_result = b2_service.upload_file(
    file_data=file_content,
    file_name=file.filename,
    file_type="files",
    user_id=current_user.id  # CORRECT: Using user_id
)

# Insert credential
cursor.execute("""
    INSERT INTO credentials (uploader_id, ...)
    VALUES (%s, ...)
""", (current_user.id, ...))  # CORRECT: Using user_id
```

#### 2. Get Endpoint (`GET /api/documents`)
**Lines changed: 1340-1375**

**Before:**
```python
# Get profile ID for the specified role
profile_id = get_profile_id_for_role(current_user.id, uploader_role)
if not profile_id:
    return []

# Query by profile_id
cursor.execute("""
    SELECT * FROM credentials
    WHERE uploader_id = %s AND uploader_role = %s
""", (profile_id, uploader_role))
```

**After:**
```python
# USER-BASED: Query by user_id and uploader_role
print(f"[Unified Documents] Querying by user_id: {current_user.id}, uploader_role: {uploader_role}")

# Query by user_id
cursor.execute("""
    SELECT * FROM credentials
    WHERE uploader_id = %s AND uploader_role = %s
""", (current_user.id, uploader_role))
```

#### 3. Stats Endpoint (`GET /api/documents/stats`)
**Lines changed: 1426-1442**

**Before:**
```python
profile_id = get_profile_id_for_role(current_user.id, uploader_role)
if not profile_id:
    return UnifiedCredentialStats(total_credentials=0, by_type={})

cursor.execute("""
    SELECT document_type, COUNT(*) as count
    FROM credentials
    WHERE uploader_id = %s AND uploader_role = %s
    GROUP BY document_type
""", (profile_id, uploader_role))
```

**After:**
```python
# USER-BASED: Query by user_id and uploader_role
cursor.execute("""
    SELECT document_type, COUNT(*) as count
    FROM credentials
    WHERE uploader_id = %s AND uploader_role = %s
    GROUP BY document_type
""", (current_user.id, uploader_role))
```

#### 4. Update Endpoint (`PUT /api/documents/{document_id}`)
**Lines changed: 1644-1659, 1718-1729, 1748-1752, 1770**

**Before:**
```python
profile_id = get_profile_id_for_role(current_user.id, uploader_role)

cursor.execute("""
    SELECT * FROM credentials
    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
""", (document_id, profile_id, uploader_role))

# ... later ...
file_upload_result = b2_service.upload_file(user_id=profile_id)

# ... later ...
update_values.extend([document_id, profile_id, uploader_role])
```

**After:**
```python
# USER-BASED: Get existing document and verify ownership by user_id
cursor.execute("""
    SELECT * FROM credentials
    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
""", (document_id, current_user.id, uploader_role))

# ... later ...
file_upload_result = b2_service.upload_file(user_id=current_user.id)

# ... later ...
update_values.extend([document_id, current_user.id, uploader_role])
```

#### 5. Delete Endpoint (`DELETE /api/documents/{document_id}`)
**Lines changed: 1840-1869**

**Before:**
```python
profile_id = get_profile_id_for_role(current_user.id, uploader_role)

cursor.execute("""
    SELECT id, verification_status FROM credentials
    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
""", (document_id, profile_id, uploader_role))

# ... later ...
cursor.execute("""
    DELETE FROM credentials
    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
""", (document_id, profile_id, uploader_role))
```

**After:**
```python
# USER-BASED: Verify ownership by user_id
cursor.execute("""
    SELECT id, verification_status FROM credentials
    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
""", (document_id, current_user.id, uploader_role))

# ... later ...
cursor.execute("""
    DELETE FROM credentials
    WHERE id = %s AND uploader_id = %s AND uploader_role = %s
""", (document_id, current_user.id, uploader_role))
```

## How It Works Now

### Unified Credential System (User-Based)

Both tutors and students now use the **same approach**:

1. **Authentication**: JWT token contains `user_id`
2. **Upload**: `uploader_id = user_id` (from JWT)
3. **Role Differentiation**: `uploader_role` field ('student' or 'tutor')
4. **Fetch**: Query by `uploader_id = user_id AND uploader_role = 'student'/'tutor'`

### Example for Kush Studios (user_id = 2):

```sql
-- Upload student credential
INSERT INTO credentials (uploader_id, uploader_role, ...)
VALUES (2, 'student', ...);

-- Upload tutor credential (same user, different role)
INSERT INTO credentials (uploader_id, uploader_role, ...)
VALUES (2, 'tutor', ...);

-- Fetch student credentials
SELECT * FROM credentials
WHERE uploader_id = 2 AND uploader_role = 'student';

-- Fetch tutor credentials
SELECT * FROM credentials
WHERE uploader_id = 2 AND uploader_role = 'tutor';
```

## Benefits

1. **Consistency**: Both student and tutor credentials use the same user-based approach
2. **Multi-Role Support**: One user can have both student and tutor credentials
3. **Simplicity**: No need to look up profile IDs - use user_id directly from JWT
4. **Correct IDs**: `uploader_id` now correctly stores `user_id` for both roles

## Testing

### Before Fix:
```bash
# User: Kush Studios (user_id = 2, student_profile.id = 1)
# Upload credential → uploader_id = 1 ❌ WRONG
```

### After Fix:
```bash
# User: Kush Studios (user_id = 2, student_profile.id = 1)
# Upload credential → uploader_id = 2 ✅ CORRECT
```

### Test Script:
```python
import psycopg
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg.connect(os.getenv('DATABASE_URL'))
cursor = conn.cursor()

# Check credentials for user_id = 2
cursor.execute('''
    SELECT id, uploader_id, uploader_role, title
    FROM credentials
    WHERE uploader_id = 2
    ORDER BY created_at DESC
''')

for row in cursor.fetchall():
    print(f"ID: {row[0]}, uploader_id: {row[1]}, role: {row[2]}, title: {row[3]}")

conn.close()
```

## Migration Notes

### Existing Data
If there are existing credentials with `uploader_id = profile_id`, they need to be migrated:

```sql
-- For students: Update uploader_id from profile_id to user_id
UPDATE credentials c
SET uploader_id = s.user_id
FROM student_profiles s
WHERE c.uploader_role = 'student'
  AND c.uploader_id = s.id;

-- Verify migration
SELECT
    c.id,
    c.uploader_id as credential_uploader_id,
    s.id as student_profile_id,
    s.user_id,
    c.uploader_role,
    c.title
FROM credentials c
LEFT JOIN student_profiles s ON c.uploader_id = s.user_id
WHERE c.uploader_role = 'student'
ORDER BY c.created_at DESC;
```

## Backend Restart Required

✅ Backend has been restarted with the fix applied.

## Status

✅ **FIXED** - All unified credential endpoints now use `user_id` instead of `profile_id`
