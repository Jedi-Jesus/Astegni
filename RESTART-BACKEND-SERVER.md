# How to Restart the Backend Server

The backend server needs to be restarted to apply the gender field fixes in `routes.py`.

---

## Quick Steps

### Step 1: Stop the Current Server

**Find the process**:
```bash
netstat -ano | findstr :8000
```

Output will show something like:
```
TCP    127.0.0.1:8000         0.0.0.0:0              LISTENING       13884
                                                                      ^^^^^
                                                                      This is the PID
```

**Kill the process** (replace 13884 with your actual PID):
```bash
taskkill /PID 13884 /F
```

### Step 2: Restart the Server

```bash
cd astegni-backend
python app.py
```

**Expected output**:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

### Step 3: Verify the Fix

**Test the endpoint**:
```bash
curl http://localhost:8000/api/tutors?page=1&limit=5
```

**Expected result**:
```json
{
  "tutors": [
    {
      "id": 80,
      "first_name": "Selamawit",
      "father_name": "Desta",
      "gender": "Female",
      ...
    },
    ...
  ],
  "total": 39,
  "page": 1,
  "limit": 5,
  "pages": 8
}
```

**Key things to check**:
- Status code: 200 (not 500)
- `"total": 39` (not 13)
- Each tutor has `"gender"` field populated
- No error messages

---

## Alternative: Using Uvicorn with Auto-Reload

If you want automatic reloading during development:

```bash
cd astegni-backend
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

With `--reload`, the server will automatically restart when you change Python files.

---

## Troubleshooting

### Issue: "Address already in use"

**Solution**: Kill the existing process first
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Issue: "ModuleNotFoundError"

**Solution**: Ensure you're in the correct directory and have dependencies installed
```bash
cd astegni-backend
pip install -r requirements.txt
python app.py
```

### Issue: Database connection error

**Solution**: Check your `.env` file has correct DATABASE_URL
```
DATABASE_URL=postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db
```

---

## Testing the Frontend After Restart

1. Open browser: `http://localhost:8080/branch/find-tutors.html`
2. Open DevTools Console (F12)
3. Check that you see:
   - No API errors
   - Tutor count shows 39 (not 13)
   - All filters work correctly

**Success indicators**:
```
Console: "Successfully fetched 39 tutors from API"
Page shows: "Showing 1-12 of 39 tutors"
Pagination: Shows multiple pages
```

---

## Quick Verification Commands

Run these to confirm everything is working:

```bash
# 1. Check server is running
curl http://localhost:8000/api/tutors?limit=1

# 2. Check total count
curl -s http://localhost:8000/api/tutors | grep -o '"total":[0-9]*'
# Should show: "total":39

# 3. Test gender filter
curl -s "http://localhost:8000/api/tutors?gender=Female" | grep -o '"total":[0-9]*'
# Should show: "total":18

# 4. Test pagination
curl -s "http://localhost:8000/api/tutors?page=2&limit=15" | grep -o '"page":[0-9]*'
# Should show: "page":2
```

---

## Summary

**Before Restart**: API crashes with 500 error, only 13 tutors show
**After Restart**: API works correctly, all 39 tutors accessible
**Time Required**: ~30 seconds to restart
**Verification**: Test endpoint returns 39 tutors with gender field
