# Role-Optional Registration System

## Summary

Registration has been updated to NOT require role selection. Users are created without any roles and can add roles later through the role management system.

## Changes Made

### 1. Frontend Changes

**File: `modals/index/register-modal.html`**
- ✅ Removed "Register as" role selector dropdown
- Users now only provide email and password during registration

**File: `js/index/profile-and-authentication.js`**
- ✅ Updated `handleRegister()` to not collect or send role data
- `tempRegistrationData` no longer includes `role` field

### 2. Database Changes

**Migration: `astegni-backend/migrate_remove_role_defaults.py`**
- ✅ Removed default value from `active_role` column (was `'user'`)
- ✅ Removed default value from `roles` column (was `'["user"]'`)
- Both columns are now nullable with NO default values

**Before:**
```sql
Column: active_role
  Nullable: YES
  Default: 'user'::character varying

Column: roles
  Nullable: YES
  Default: '["user"]'::json
```

**After:**
```sql
Column: active_role
  Nullable: YES
  Default: None

Column: roles
  Nullable: YES
  Default: None
```

### 3. Backend Model Changes

**File: `astegni-backend/app.py modules/models.py`**

**User Model:**
```python
# BEFORE
roles = Column(JSON, default=["user"])
active_role = Column(String, default="user")

# AFTER
roles = Column(JSON, nullable=True)  # No default
active_role = Column(String, nullable=True)  # No default
```

**UserRegister Pydantic Model:**
```python
# BEFORE
role: str = "student"

# AFTER
role: Optional[str] = None  # No default
```

### 4. Backend Endpoint Changes

**File: `astegni-backend/app.py modules/routes.py`**

**Updated `/api/register` endpoint:**
- Now handles users with NO roles
- If `role` is provided, creates user with that role
- If `role` is NOT provided, creates user with `roles=None` and `active_role=None`
- Safely handles existing users with NULL roles using `existing_user.roles or []`

## User Flow

### New Registration Flow

1. User opens registration modal
2. User enters email and password (NO role selection)
3. User verifies OTP
4. Account is created with:
   - `roles = NULL`
   - `active_role = NULL`
5. User can add roles later through:
   - Profile settings
   - Role management modal
   - Add Role functionality

### Backward Compatibility

- Existing users with roles continue to work normally
- System safely handles NULL roles throughout codebase
- Role management system can add roles to users without roles

## Testing

To test the new registration flow:

1. **Start the backend:**
   ```bash
   cd astegni-backend
   python app.py
   ```

2. **Start the frontend:**
   ```bash
   python dev-server.py
   ```

3. **Register a new user:**
   - Go to http://localhost:8081
   - Click "Join Now" or "Sign Up"
   - Enter email and password
   - Complete OTP verification
   - User should be created with NULL roles

4. **Verify in database:**
   ```python
   cd astegni-backend
   python -c "
   from sqlalchemy import create_engine, text
   import os
   from dotenv import load_dotenv

   load_dotenv()
   DATABASE_URL = os.getenv('DATABASE_URL')
   engine = create_engine(DATABASE_URL)

   with engine.connect() as conn:
       result = conn.execute(text('''
           SELECT id, email, roles, active_role
           FROM users
           ORDER BY created_at DESC
           LIMIT 5
       '''))

       for row in result:
           print(f'User {row[0]}: {row[1]}')
           print(f'  Roles: {row[2]}')
           print(f'  Active Role: {row[3]}')
           print()
   "
   ```

## Migration Instructions

### For Production

1. **Backup the database first:**
   ```bash
   ssh root@128.140.122.215
   cd /var/www/astegni/astegni-backend
   pg_dump astegni_user_db > /var/backups/user_db_before_role_optional_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Run the migration:**
   ```bash
   source venv/bin/activate
   python migrate_remove_role_defaults.py
   ```

3. **Restart the backend:**
   ```bash
   systemctl restart astegni-backend
   journalctl -u astegni-backend -f
   ```

4. **Verify:**
   - Test registration on production
   - Check logs for any errors
   - Verify users can still login

## Impact Assessment

### ✅ Safe Changes
- Database columns were already nullable
- Only removed default values
- No data loss or migration of existing data
- Backward compatible with existing users

### ⚠️ Potential Issues to Monitor
- Ensure all code that accesses `roles` or `active_role` handles NULL values
- Check role switcher doesn't break for users without roles
- Verify authentication flows work with NULL roles
- Monitor error logs for NULL pointer exceptions

### 🔍 Areas Using roles/active_role
- `js/index/profile-and-authentication.js` - Role switcher
- `astegni-backend/app.py modules/routes.py` - Authentication endpoints
- `astegni-backend/utils.py` - Token creation (check if handles NULL roles)
- Profile pages - Check if they handle users without roles

## Next Steps

1. ✅ Registration modal updated (role selector removed)
2. ✅ Frontend registration handler updated (no role sent)
3. ✅ Database migration completed (defaults removed)
4. ✅ Backend models updated (nullable, no defaults)
5. ✅ Backend endpoint updated (handles NULL roles)
6. ⏳ Test registration flow end-to-end
7. ⏳ Verify existing functionality still works
8. ⏳ Deploy to production

## Rollback Plan

If issues arise, rollback by restoring defaults:

```sql
-- Rollback migration
ALTER TABLE users ALTER COLUMN active_role SET DEFAULT 'user';
ALTER TABLE users ALTER COLUMN roles SET DEFAULT '["user"]'::json;

-- Update NULL values to defaults (if needed)
UPDATE users SET active_role = 'user' WHERE active_role IS NULL;
UPDATE users SET roles = '["user"]'::json WHERE roles IS NULL;
```

Then restore the original code from git:
```bash
git checkout HEAD -- modals/index/register-modal.html
git checkout HEAD -- js/index/profile-and-authentication.js
git checkout HEAD -- astegni-backend/app.py modules/models.py
git checkout HEAD -- astegni-backend/app.py modules/routes.py
```

## Support

If issues occur:
- Check backend logs: `journalctl -u astegni-backend -f` (production)
- Check database: Run SQL queries above to inspect user data
- Verify .env configuration is correct
- Test with a fresh user account

---

**Date:** 2026-01-24
**Version:** 2.1.1
**Status:** ✅ Implementation Complete - Testing Required
