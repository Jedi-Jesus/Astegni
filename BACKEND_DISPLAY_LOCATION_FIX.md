# Backend Fix: display_location Field Support

## Issue
The `display_location` field was not being accepted by the backend endpoints, causing 500 Internal Server Error when trying to save profile data.

## Root Causes
1. `display_location` was not in the `user_fields` list in various profile update endpoints
2. Debug print statements were trying to access non-existent `tutor_profile.languages` field
3. `display_location` was missing from Pydantic model schemas

## Files Fixed

### 1. ✅ Tutor Profile - `app.py modules/routes.py`
**Line 2480-2481:** Added `display_location` to user_fields
```python
user_fields = {'first_name', 'father_name', 'grandfather_name', 'last_name', 'gender',
               'location', 'display_location', 'profile_picture', 'social_links', 'languages'}
```

**Lines 2523, 2530:** Fixed debug prints to use `current_user.languages` and `current_user.display_location` instead of `tutor_profile.languages`

### 2. ✅ Student Profile - `student_profile_endpoints.py`
**Line 37:** Added to Pydantic model
```python
display_location: Optional[bool] = None
```

**Lines 214-229:** Added to SQL UPDATE query
```sql
UPDATE users
SET
    location = COALESCE(%s, location),
    display_location = COALESCE(%s, display_location),
    languages = %s,
    hobbies = %s
WHERE id = %s
```

### 3. ✅ Parent Profile - `parent_endpoints.py` & `models.py`
**parent_endpoints.py Line 103:** Added to user_fields list
```python
user_fields = ['location', 'display_location', 'profile_picture', 'social_links', 'languages']
```

**models.py Line 1324:** Added to ParentProfileUpdate model
```python
display_location: Optional[bool] = None  # Will be saved to users table
```

### 4. ✅ Advertiser Profile - `routes.py` & `models.py`
**routes.py Lines 6517-6519:** Added to user_fields set
```python
user_fields = {'first_name', 'father_name', 'grandfather_name', 'last_name',
               'email', 'phone', 'gender', 'location', 'display_location', 'profile_picture',
               'social_links', 'languages'}
```

**models.py Line 1427:** Added to AdvertiserProfileUpdate model
```python
display_location: Optional[bool] = None  # Will be saved to users table
```

### 5. ✅ User Profile - `user_profile_endpoints.py`
**Line 29:** Added to UserProfileUpdate model
```python
display_location: Optional[bool] = None
```

**Line 265:** Added to users_table_fields list
```python
users_table_fields = ['location', 'display_location', 'languages', 'social_links', 'profile_picture']
```

## Testing
1. Backend server needs to be restarted for changes to take effect
2. Test profile save for all role types:
   - Tutor profile edit & save
   - Student profile edit & save
   - Parent profile edit & save
   - Advertiser profile edit & save
   - User profile edit & save

## Expected Behavior
- `display_location` field should now be accepted and saved to the `users` table
- Checkbox state will persist across sessions
- No more 500 Internal Server Error when saving profiles

## Database
No migration needed - the `display_location` column already exists in the `users` table (created by `migrate_add_display_location_to_users.py`).
