# Schedule Feature - Quick Test Guide

## ✅ SETUP COMPLETE

The `tutor_teaching_schedules` table has been created successfully!

## Quick Test (5 minutes)

### 1. Start Backend
```bash
cd astegni-backend
uvicorn app:app --reload
```

### 2. Open Tutor Profile
Navigate to: http://localhost:8080/profile-pages/tutor-profile.html

### 3. Log In
Use a tutor account credentials

### 4. Test Empty State
- Click **"Schedule"** in the left sidebar
- You should see:
  ```
  📅 No schedules created yet
  Click "Create Schedule" to add your first schedule
  ```

### 5. Create Your First Schedule
- Click **"Create Schedule"** button
- Fill in the form:
  - **Title**: "Grade 12 Mathematics"
  - **Subject**: Select "Mathematics"
  - **Grade Level**: Select "Grade 11-12"
  - **Year**: 2025
  - **Schedule Type**: Keep "Recurring" selected
  - **Months**: Check "January", "February", "March"
  - **Days**: Check "Monday", "Wednesday", "Friday"
  - **Start Time**: 09:00
  - **End Time**: 10:00
  - **Notes**: "Algebra and Calculus lessons"
  - **Status**: Keep "Active" selected
- Click **"Create Schedule"**

### 6. Verify Creation
- You should see a success message
- The schedule appears in the table
- You should see:
  - Schedule title and subject
  - "Recurring" badge
  - Days: Mon, Wed, Fri
  - Time: 09:00 - 10:00
  - A "View" button

### 7. Test View Modal
- Click the **"View"** button
- A modal opens showing:
  - Schedule title
  - Subject and grade badges
  - Active status badge
  - Full schedule details
  - Months: January, February, March
  - Days: Monday, Wednesday, Friday
  - Time range
- Click "Close" or the X button to close modal

## ✅ Success Indicators

If you see all of this, the feature is working perfectly:
- ✅ Empty state shows when no schedules exist
- ✅ Create form saves to database
- ✅ Schedule appears in table immediately
- ✅ View modal loads schedule details from database
- ✅ All data persists (refresh page and it's still there)

## 🔍 Troubleshooting

### "Please log in to view your schedules"
**Solution**: Make sure you're logged in as a tutor

### "Only tutors can create schedules"
**Solution**: Current user must have 'tutor' role in their roles array

### 422 or 500 Error
**Solution**: Check backend logs and verify table exists:
```bash
cd astegni-backend
python verify_schedule_table.py
```

## 📝 Test Different Scenarios

### Test Specific Dates Schedule
1. Create another schedule
2. Select **"Specific Dates"** instead of Recurring
3. Click "Add Date" and pick specific dates
4. Submit and verify

### Test Draft Schedule
1. Create a schedule
2. Select **"Draft"** status instead of Active
3. Verify it shows an orange "Draft" badge

### Test Alarms
1. Create a schedule
2. Check **"Enable Alarm"**
3. Select reminder time (e.g., "15 minutes before")
4. Check notification preferences
5. Submit and verify alarm settings appear in view modal

## 🎉 Next Steps

Once testing is complete, you can:
- Create schedules for different subjects
- Mix recurring and specific date schedules
- Use the schedule panel to manage all your teaching schedules
- Students will be able to see your active schedules (when that feature is added)

## Need Help?

See [SCHEDULE-FEATURE-SETUP.md](SCHEDULE-FEATURE-SETUP.md) for complete documentation and troubleshooting.
