# Schedule Feature Setup Guide

## Current Status

The schedule feature is **fully implemented** in the code:

✅ Frontend form submits to `/api/tutor/schedules`
✅ Backend saves to `tutor_teaching_schedules` table
✅ Empty state shows "No schedules created yet"
✅ View modal reads from database

## Setup Required

The only thing needed is to **create the database table**.

### Step 1: Create the Table

Run this command from the `astegni-backend` directory:

```bash
cd astegni-backend
python create_teaching_schedules.py
```

### Step 2: Verify Table Creation

```bash
python -c "import psycopg; conn = psycopg.connect('postgresql://astegni_user:Astegni2025@localhost:5432/astegni_db'); cur = conn.cursor(); cur.execute('SELECT COUNT(*) FROM tutor_teaching_schedules'); print(f'Table exists! Row count: {cur.fetchone()[0]}'); conn.close()"
```

### Step 3: Restart Backend

```bash
cd astegni-backend
uvicorn app:app --reload
```

### Step 4: Test the Feature

1. Open [http://localhost:8080/profile-pages/tutor-profile.html](http://localhost:8080/profile-pages/tutor-profile.html)
2. Log in with a tutor account
3. Click on "Schedule" in the sidebar
4. You should see "No schedules created yet"
5. Click "Create Schedule"
6. Fill in the form and submit
7. The schedule should appear in the table

## How It Works

### Database Flow

```
Frontend Form → POST /api/tutor/schedules
                    ↓
    tutor_schedule_endpoints.py (line 95)
                    ↓
    INSERT INTO tutor_teaching_schedules
                    ↓
            Return created schedule
```

### Display Flow

```
Switch to Schedule Panel → loadSchedules()
                              ↓
          GET /api/tutor/schedules
                              ↓
    SELECT * FROM tutor_teaching_schedules WHERE tutor_id = ?
                              ↓
          Render table or "No schedules" message
```

### View Modal Flow

```
Click "View" button → viewSchedule(id)
                          ↓
      GET /api/tutor/schedules/{id}
                          ↓
    SELECT * FROM tutor_teaching_schedules WHERE id = ?
                          ↓
          Display schedule details in modal
```

## Key Files

### Frontend
- **HTML**: [profile-pages/tutor-profile.html](../profile-pages/tutor-profile.html#L3228) - Form at line 3228
- **JS**: [js/tutor-profile/global-functions.js](../js/tutor-profile/global-functions.js)
  - `saveSchedule()` - Line 2418
  - `loadSchedules()` - Line 2927
  - `viewSchedule()` - Line 3057

### Backend
- **Endpoints**: [astegni-backend/tutor_schedule_endpoints.py](../astegni-backend/tutor_schedule_endpoints.py)
  - `POST /api/tutor/schedules` - Line 95
  - `GET /api/tutor/schedules` - Line 189
  - `GET /api/tutor/schedules/{id}` - Line 259
- **Migration**: [astegni-backend/create_teaching_schedules.py](../astegni-backend/create_teaching_schedules.py)

## Troubleshooting

### 422 Error on GET /api/tutor/schedules

**Cause**: Table doesn't exist or has wrong schema

**Solution**: Run `python create_teaching_schedules.py`

### "Please log in" message

**Cause**: Not authenticated

**Solution**: Log in with a tutor account first

### "Only tutors can create schedules"

**Cause**: Current user doesn't have 'tutor' role

**Solution**: Make sure the user has 'tutor' in their roles array

## Testing

After setup, test the complete workflow:

1. **Create a schedule**
   - Click "Create Schedule"
   - Fill in all required fields
   - Submit form
   - Verify success message
   - Check schedule appears in table

2. **View schedule details**
   - Click "View" button on a schedule
   - Verify modal opens
   - Verify all details are correct

3. **Empty state**
   - Delete all schedules (or use new tutor account)
   - Switch to schedule panel
   - Verify "No schedules created yet" message appears

## Next Steps (Optional Enhancements)

- [ ] Add edit functionality for existing schedules
- [ ] Add delete button for schedules
- [ ] Add calendar view visualization
- [ ] Add notifications/reminders
- [ ] Add schedule sharing with students
