# Deployment: Fix Languages Column Type Mismatch
**Date:** 2026-02-06
**Issue:** Profile update failing with CORS error (masking 500 error)
**Root Cause:** Database schema mismatch - `users.languages` is `text[]` in production but SQLAlchemy model expects `json`

---

## Problem

When users try to update their profile on production, they get this error:

```
Access to fetch at 'https://api.astegni.com/api/tutor/profile' from origin 'https://astegni.com'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

The actual backend error (visible in journalctl logs):

```
sqlalchemy.exc.ProgrammingError: (psycopg.errors.DatatypeMismatch)
column "languages" is of type text[] but expression is of type json
```

**Why CORS error appears:** When FastAPI crashes with a 500 error, it doesn't send CORS headers, which causes the browser to show a CORS error instead of the actual error.

---

## Root Cause

The production database has a schema mismatch:

- **Production DB:** `users.languages` column is `text[]` (PostgreSQL array)
- **SQLAlchemy Model:** `languages = Column(JSON, default=[], nullable=True)`
- **Local DB:** `users.languages` column is `json` ✅ (correct)

This mismatch happened because a previous migration (`migrate_user_profile_remove_deprecated_fields.py`) was supposed to convert `user_profiles.languages` (ARRAY) to `users.languages` (JSON), but on production the conversion didn't complete properly.

---

## Solution

Run the migration script `fix_languages_column_type.py` which:

1. Checks if `users.languages` is `text[]` type
2. Converts it to `json` type using `to_jsonb()`
3. Preserves all existing data
4. Also fixes `users.hobbies` if needed

**The migration is SAFE and IDEMPOTENT:**
- ✅ Preserves all existing data
- ✅ Can be run multiple times without issues
- ✅ Only converts if column is currently `text[]`

---

## Deployment Steps

### 1. Push Changes to GitHub

```bash
# Already done:
git add astegni-backend/fix_languages_column_type.py
git commit -m "Add migration to fix languages column type mismatch (text[] -> json)"
git push origin main
```

### 2. SSH into Production Server

```bash
ssh root@128.140.122.215
# Password: UVgkFmAsh4N4
```

### 3. Navigate to Backend Directory

```bash
cd /var/www/astegni/astegni-backend
```

### 4. Pull Latest Changes

```bash
git pull origin main
```

### 5. Activate Virtual Environment

```bash
source venv/bin/activate
```

### 6. Backup Database (CRITICAL!)

```bash
# Backup user database
pg_dump astegni_user_db > /var/backups/user_db_$(date +%Y%m%d_%H%M%S)_before_languages_fix.sql

# Verify backup was created
ls -lh /var/backups/user_db_*_before_languages_fix.sql
```

### 7. Verify Current Column Type

```bash
psql astegni_user_db -c "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('languages', 'hobbies') ORDER BY column_name"
```

**Expected output (BEFORE fix):**
```
 column_name | data_type |  udt_name
-------------+-----------+------------
 hobbies     | ARRAY     | _text
 languages   | ARRAY     | _text
```

### 8. Run the Migration

```bash
echo "yes" | python fix_languages_column_type.py
```

**Expected output:**
```
Starting migration to fix languages column type...

1. Checking current column type...
   hobbies: ARRAY (_text)
   languages: ARRAY (_text)

2. Converting languages column from text[] to json...
[OK] Converted languages column to json type

3. Converting hobbies column from text[] to json...
[OK] Converted hobbies column to json type

4. Verifying changes...
   Final column types:
   hobbies: json (json)
   languages: json (json)

[SUCCESS] Migration completed successfully!

Summary:
- Fixed languages column type (text[] -> json)
- Fixed hobbies column type (text[] -> json)
- SQLAlchemy model now matches database schema
```

### 9. Verify the Fix

```bash
# Check column types again
psql astegni_user_db -c "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('languages', 'hobbies') ORDER BY column_name"
```

**Expected output (AFTER fix):**
```
 column_name | data_type | udt_name
-------------+-----------+----------
 hobbies     | json      | json
 languages   | json      | json
```

### 10. Restart Backend Service

```bash
systemctl restart astegni-backend
```

### 11. Monitor Logs

```bash
journalctl -u astegni-backend -f
```

Look for:
- No error messages about `text[]` vs `json` type mismatch
- Successful startup messages

### 12. Test Profile Update

1. Go to https://astegni.com/profile-pages/tutor-profile.html
2. Click "Edit Profile"
3. Make a small change (e.g., add location)
4. Click "Save"
5. Verify the profile updates successfully without CORS errors

---

## Verification Checklist

- [ ] Database backup created
- [ ] Migration script ran successfully
- [ ] Column types verified as `json`
- [ ] Backend service restarted
- [ ] No errors in logs
- [ ] Profile update works on production
- [ ] No CORS errors
- [ ] Data preserved correctly

---

## Rollback (If Needed)

If something goes wrong:

```bash
# Stop the backend
systemctl stop astegni-backend

# Restore from backup
psql astegni_user_db < /var/backups/user_db_YYYYMMDD_HHMMSS_before_languages_fix.sql

# Restart backend
systemctl start astegni-backend
```

---

## Files Changed

- `astegni-backend/fix_languages_column_type.py` (new migration script)

---

## Expected Impact

- ✅ Profile updates will work correctly
- ✅ No more CORS errors on profile save
- ✅ Languages and hobbies fields can be updated
- ✅ All existing data preserved
- ✅ No downtime required (migration is fast)

---

## Notes

- This migration is safe to run even if the columns are already `json` (idempotent)
- The migration preserves all existing data
- The conversion uses PostgreSQL's `to_jsonb()` function which handles the type conversion properly
- Both local and production databases will now match the SQLAlchemy model
