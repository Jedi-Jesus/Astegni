# Trending Tutors Database Error Fix

## Problem

The Trending Tutors widget was displaying an error state because the `/api/tutors` endpoint was crashing with a database error:

```
psycopg.errors.UndefinedColumn: column "document_type" does not exist
LINE 5: AND document_type = 'credential'
```

## Root Cause

The tutor scoring logic in `tutor_scoring.py` was trying to count credentials by querying the old `documents` table with a `document_type` column. However, according to the breaking changes in CLAUDE.md:

> Old `documents` → `credentials` (achievements)
> New `documents` (teaching materials)

The credentials have been migrated to a separate `credentials` table, and the `document_type` column no longer exists in `documents`.

## Fix Applied

Updated [tutor_scoring.py:363-370](astegni-backend/tutor_scoring.py#L363-L370):

### Before:
```python
credentials_query = text("""
    SELECT COUNT(*) as credential_count
    FROM documents
    WHERE uploader_id = :tutor_user_id
    AND document_type = 'credential'
""")
```

### After:
```python
credentials_query = text("""
    SELECT COUNT(*) as credential_count
    FROM credentials
    WHERE user_id = :tutor_user_id
""")
```

## Changes:
1. Table: `documents` → `credentials`
2. Column: `uploader_id` → `user_id` (credentials table uses `user_id`)
3. Removed: `AND document_type = 'credential'` filter (no longer needed since credentials have their own table)

## Testing Required

**IMPORTANT: You must restart the backend for this fix to take effect.**

```bash
# In astegni-backend directory
python app.py
```

Then refresh the parent profile page and verify:
1. No console errors for `/api/tutors`
2. Trending Tutors widget displays tutor carousel
3. Tutors fade in/out every 5 seconds

## Related Files

- [astegni-backend/tutor_scoring.py:363-370](astegni-backend/tutor_scoring.py#L363-L370) - Fixed query
- [js/parent-profile/right-widgets-manager.js:533-574](js/parent-profile/right-widgets-manager.js#L533-L574) - Trending Tutors widget frontend
- [TRENDING_TUTORS_WIDGET_IMPLEMENTATION.md](TRENDING_TUTORS_WIDGET_IMPLEMENTATION.md) - Complete widget documentation

## Status

✅ **Fix Applied** - Backend code updated
⚠️ **Restart Required** - Backend needs manual restart
⏳ **Testing Pending** - Verify fix after backend restart
