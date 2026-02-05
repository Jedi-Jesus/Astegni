# Backend Fix Applied - Credentials Column Error

## Problem Fixed
The tutor scoring system was querying the wrong column name in the credentials table:
- **Old (incorrect)**: `WHERE user_id = :tutor_user_id`
- **New (correct)**: `WHERE uploader_id = :tutor_user_id`

## What Was Wrong
After migrating the credentials table to the user-based system, the column was renamed from `user_id` to `uploader_id`, but the `tutor_scoring.py` file wasn't updated.

## File Changed
- `astegni-backend/tutor_scoring.py` (line 368)

## How to Apply Fix

### Step 1: Stop the Backend
In the terminal running the backend (or find the Python process), press `Ctrl+C` to stop it.

### Step 2: Restart the Backend
```bash
cd astegni-backend
python app.py
```

### Step 3: Test
The `/api/tutors` endpoint should now work without the database error.

## Error That Was Happening
```
⚠️ Error calculating new scores for tutor 2: (psycopg.errors.UndefinedColumn) column "user_id" does not exist
LINE 4:             WHERE user_id = $1
                          ^
```

This error will no longer appear after restarting the backend.
