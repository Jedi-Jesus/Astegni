# Hobbies Migration to Users Table - Complete

## Summary

Successfully migrated the `hobbies` field from the `student_profiles` table to the `users` table, centralizing it as a shared field across all user roles (student, tutor, parent, advertiser).

## Changes Made

### 1. Database Migration
**File:** `astegni-backend/migrate_add_hobbies_to_users.py`

- Added `hobbies` column to `users` table as JSON type (consistent with other array fields like `languages`)
- Copied existing hobbies data from `student_profiles` to `users` table (0 users had data)
- **Note:** `student_profiles.hobbies` column still exists for backward compatibility but is now deprecated

**Migration Result:**
```
✓ hobbies column added to users table (JSON type)
✓ Data migration completed (0 rows copied)
✓ Verification successful
```

### 2. Backend Model Updates

#### a. User Model ([app.py modules/models.py:56](app.py modules/models.py#L56))
```python
hobbies = Column(JSON, default=[], nullable=True)  # Array of hobbies/interests
```
Added to the "Shared Media & Social Fields" section alongside `languages`, `location`, and `social_links`.

#### b. User Profile Endpoints ([user_profile_endpoints.py](user_profile_endpoints.py))
- Updated `UserProfileUpdate` Pydantic model to include `hobbies` field
- Updated `UserProfileResponse` Pydantic model to include `hobbies` field
- Added `hobbies` to the `user_fields` list (line 158)
- Updated GET endpoint to return `hobbies` from users table
- Updated PUT endpoint to save `hobbies` to users table
- Updated full profile endpoint to include `hobbies`

#### c. Student Profile Endpoints ([student_profile_endpoints.py](student_profile_endpoints.py))
- Updated GET endpoint to JOIN with `users` table and fetch `hobbies` from there (lines 111-132)
- Updated PUT endpoint to save `hobbies` to `users` table instead of `student_profiles` (lines 213-226)
- Updated INSERT query to save `hobbies` to `users` table (lines 261-274)
- Removed `hobbies` from student_profiles UPDATE/INSERT queries

**Key Changes:**
```sql
-- GET endpoint now JOINs with users table
SELECT
    sp.id, sp.user_id,
    ...
    COALESCE(u.hobbies, '[]') as hobbies,  -- From users table
    ...
FROM student_profiles sp
JOIN users u ON sp.user_id = u.id

-- UPDATE endpoint updates users table
UPDATE users
SET
    location = COALESCE(%s, location),
    languages = %s,
    hobbies = %s  -- Added
WHERE id = %s
```

### 3. Frontend Updates

#### a. Profile Data Loader ([js/student-profile/profile-data-loader.js:331-360](js/student-profile/profile-data-loader.js#L331-L360))
**No changes needed** - Already fetches `data.hobbies` which now comes from the users table via the API JOIN.

#### b. Profile Edit Manager ([js/student-profile/profile-edit-manager.js:386](js/student-profile/profile-edit-manager.js#L386))
**No changes needed** - Already collects and sends hobbies:
```javascript
hobbies: collectArrayValues('hobby-input')
```

The backend now saves this to the `users` table automatically.

## Data Flow

### Before Migration
```
Frontend → API → student_profiles.hobbies (ARRAY type)
```

### After Migration
```
Frontend → API → users.hobbies (JSON type)
                ↓
         student_profiles (read-only, deprecated)
```

## API Endpoints Updated

1. **GET** `/api/student/profile/{user_id}` - Returns hobbies from users table
2. **PUT** `/api/student/profile` - Saves hobbies to users table
3. **GET** `/api/user/profile` - Returns hobbies from users table
4. **PUT** `/api/user/profile` - Saves hobbies to users table
5. **GET** `/api/user/profile/full` - Includes hobbies from users table

## Database Schema

### Users Table
```sql
hobbies JSON DEFAULT '[]'
```
Example: `["Reading", "Sports", "Music"]`

### Student Profiles Table
```sql
hobbies ARRAY (DEPRECATED - kept for backward compatibility)
```

## Benefits

1. **Centralized Data:** Hobbies now available for all user roles (student, tutor, parent, advertiser)
2. **Consistent Storage:** Uses JSON type like other array fields in users table (`languages`, `social_links`)
3. **Better Architecture:** Aligns with the pattern of storing shared profile fields in users table
4. **Future-Proof:** Easy to extend hobbies to other roles without additional migrations

## Backward Compatibility

- `student_profiles.hobbies` column **NOT removed** to avoid breaking existing code
- New code reads from `users.hobbies`
- Old code reading from `student_profiles.hobbies` will see empty arrays

## Testing

### Verified
✓ Migration script runs successfully
✓ `users.hobbies` column exists (JSON type)
✓ `student_profiles.hobbies` column still exists (backward compatibility)
✓ Backend models updated
✓ API endpoints updated
✓ Frontend already compatible

### Next Steps for Full Testing
1. Start backend: `cd astegni-backend && python app.py`
2. Start frontend: `python dev-server.py`
3. Login as student
4. Edit profile and add hobbies
5. Verify hobbies appear in profile header
6. Check database: `SELECT id, hobbies FROM users WHERE hobbies IS NOT NULL`

## Files Modified

### Backend
- `astegni-backend/migrate_add_hobbies_to_users.py` (NEW)
- [astegni-backend/app.py modules/models.py](astegni-backend/app.py modules/models.py)
- [astegni-backend/user_profile_endpoints.py](astegni-backend/user_profile_endpoints.py)
- [astegni-backend/student_profile_endpoints.py](astegni-backend/student_profile_endpoints.py)

### Frontend
- No changes required (already compatible)

## Migration Command

```bash
cd astegni-backend
python migrate_add_hobbies_to_users.py
```

## Future Cleanup (Optional)

Once confident all code uses `users.hobbies`, you can optionally:
1. Remove `hobbies` column from `student_profiles` table
2. Remove `hobbies` from `StudentProfile` model in models.py
3. Update CLAUDE.md to reflect this change

**Command to remove (after testing):**
```python
# migrate_remove_hobbies_from_student_profiles.py
ALTER TABLE student_profiles DROP COLUMN hobbies;
```

## Related Documentation

- See `CLAUDE.md` for full project architecture
- See `SUBSCRIPTION_MIGRATION_SUMMARY.md` for similar migration pattern
- See `USER_BASED_SUBSCRIPTIONS_COMPLETE.md` for user table field patterns
