# Backend Restart Guide

## The changes have been successfully applied to the backend code!

However, if you have a backend server currently running, you need to restart it to load the new changes.

## Quick Restart Instructions

### Option 1: Using Task Manager (Recommended for Windows)
1. Press `Ctrl + Shift + Esc` to open Task Manager
2. Look for `python.exe` processes
3. Find the one running from `astegni-backend` directory
4. Right-click → End Task
5. Open a new terminal and run:
   ```bash
   cd astegni-backend
   python app.py
   ```

### Option 2: Using Command Line
```bash
# Kill all Python processes (careful - this will stop ALL Python processes)
taskkill /F /IM python.exe

# Then restart the backend
cd astegni-backend
python app.py
```

### Option 3: Using the provided batch file
```bash
# From the project root
restart-backend.bat
```

## Verify Backend is Running

After restarting, check:
1. Open browser: http://localhost:8000/docs
2. You should see the FastAPI Swagger documentation
3. Look for the session-requests endpoints

## What Changed

The backend now:
- Uses `tutor_session_requests` table instead of `session_requests`
- Automatically populates `tutor_students` table when a request is accepted
- Reads "My Students" from `tutor_students` instead of filtering `session_requests`

## Testing the New Flow

1. **Create a session request** (as a student/parent):
   - Go to a tutor's profile page
   - Request a tutoring session

2. **View the request** (as the tutor):
   - Go to tutor profile → "Requested Sessions" panel
   - You should see the pending request

3. **Accept the request** (as the tutor):
   - Click "View" on the request
   - Click "Accept Request"
   - You should see a success message

4. **Verify student enrollment**:
   - Go to "My Students" panel
   - The accepted student should now appear here
   - This data comes from the `tutor_students` table

## Database Check

To verify the changes in the database:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('tutor_session_requests', 'tutor_students');

-- View pending requests
SELECT * FROM tutor_session_requests WHERE status = 'pending';

-- View enrolled students
SELECT * FROM tutor_students;
```

## Troubleshooting

**Problem**: Backend won't start (port 8000 already in use)
**Solution**: Kill the existing Python process and try again

**Problem**: Changes not reflected in API
**Solution**: Make sure you restarted the backend server after the code changes

**Problem**: Database errors about missing tables
**Solution**: Run the migrations:
```bash
cd astegni-backend
python migrate_rename_session_requests.py
python migrate_create_tutor_students.py
```

---

**Status**: Code changes complete ✅ - Just need to restart the backend!
