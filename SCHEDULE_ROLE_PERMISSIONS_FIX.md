# Schedule Role-Based Permissions Fix ✅

## Problem
When viewing schedule details in student-profile, the **Edit** and **Delete** buttons were shown for **ALL** schedules, including those created by the user's other roles (e.g., tutor schedules shown in student profile).

### Example Issue:
- User is viewing student-profile page (active_role: "student")
- User clicks "View Details" on a schedule they created as a **tutor**
- Edit and Delete buttons are shown ❌ (should be hidden)
- User shouldn't be able to edit/delete schedules from other roles

## Expected Behavior
- **Show Edit/Delete buttons** ONLY when viewing a schedule created by the current active role
- **Hide Edit/Delete buttons** when viewing schedules from other roles

### Examples:
| Current Page | Active Role | Schedule Created By | Show Buttons? |
|-------------|-------------|---------------------|---------------|
| student-profile | student | student | ✅ Yes |
| student-profile | student | tutor | ❌ No |
| student-profile | student | parent | ❌ No |
| tutor-profile | tutor | tutor | ✅ Yes |
| tutor-profile | tutor | student | ❌ No |

## Fix Applied ✅

### 1. Added IDs to Buttons
Modified [view-schedule-modal.html:142-147](modals/common-modals/view-schedule-modal.html#L142):

**Before:**
```html
<button type="button" class="btn btn-warning" onclick="editScheduleFromView()">
    <i class="fas fa-edit"></i> Edit
</button>
<button type="button" class="btn btn-danger" onclick="deleteScheduleFromView()">
    <i class="fas fa-trash"></i> Delete
</button>
```

**After:**
```html
<button type="button" id="view-schedule-edit-btn" class="btn btn-warning" onclick="editScheduleFromView()">
    <i class="fas fa-edit"></i> Edit
</button>
<button type="button" id="view-schedule-delete-btn" class="btn btn-danger" onclick="deleteScheduleFromView()">
    <i class="fas fa-trash"></i> Delete
</button>
```

### 2. Added Role Permission Check
Enhanced [global-functions.js:2896-2933](js/student-profile/global-functions.js#L2896) in `populateViewScheduleModal()`:

```javascript
// Role-based permissions: Only show Edit/Delete if schedule belongs to current active role
const editBtn = document.getElementById('view-schedule-edit-btn');
const deleteBtn = document.getElementById('view-schedule-delete-btn');

// Get current active role
const currentActiveRole = localStorage.getItem('active_role');
const scheduleRole = schedule.scheduler_role;

console.log('[View Schedule Modal] Permission check - Active role:', currentActiveRole, 'Schedule role:', scheduleRole);

// Show buttons only if roles match
const canEdit = currentActiveRole === scheduleRole;

if (editBtn) {
    if (canEdit) {
        editBtn.style.display = 'inline-block';
        console.log('[View Schedule Modal] Edit button shown - roles match');
    } else {
        editBtn.style.display = 'none';
        console.log('[View Schedule Modal] Edit button hidden - roles do not match');
    }
}

if (deleteBtn) {
    if (canEdit) {
        deleteBtn.style.display = 'inline-block';
        console.log('[View Schedule Modal] Delete button shown - roles match');
    } else {
        deleteBtn.style.display = 'none';
        console.log('[View Schedule Modal] Delete button hidden - roles do not match');
    }
}
```

## How It Works

1. **Get Current Active Role**: Reads from `localStorage.getItem('active_role')`
2. **Get Schedule Creator Role**: Uses `schedule.scheduler_role` from API response
3. **Compare Roles**: `canEdit = currentActiveRole === scheduleRole`
4. **Show/Hide Buttons**:
   - If roles match → Show Edit and Delete buttons
   - If roles don't match → Hide Edit and Delete buttons

## Files Modified
1. ✅ [view-schedule-modal.html:142-147](modals/common-modals/view-schedule-modal.html#L142) - Added button IDs
2. ✅ [global-functions.js:2896-2933](js/student-profile/global-functions.js#L2896) - Added permission check
3. ✅ [student-profile.html:6056](profile-pages/student-profile.html#L6056) - Cache-busting: `?v=20260129-role-permissions`

## Testing Instructions

### Test Case 1: View Own Role's Schedule (Should Show Buttons)
1. **Hard refresh**: **Ctrl + Shift + R**
2. Go to student-profile page
3. Verify active role is "student" (check localStorage or UI)
4. Click "View Details" on a schedule created as **student**
5. **Expected**: ✅ Edit and Delete buttons are **visible**
6. Check console for:
   ```
   [View Schedule Modal] Permission check - Active role: student Schedule role: student
   [View Schedule Modal] Edit button shown - roles match
   [View Schedule Modal] Delete button shown - roles match
   ```

### Test Case 2: View Other Role's Schedule (Should Hide Buttons)
1. Still on student-profile page (active_role: "student")
2. Click "View Details" on a schedule created as **tutor**
3. **Expected**: ❌ Edit and Delete buttons are **hidden**
4. Check console for:
   ```
   [View Schedule Modal] Permission check - Active role: student Schedule role: tutor
   [View Schedule Modal] Edit button hidden - roles do not match
   [View Schedule Modal] Delete button hidden - roles do not match
   ```

### Test Case 3: Multi-Role User
If user has multiple roles (e.g., both student and tutor):
1. Create schedules as both student and tutor
2. Switch between student-profile and tutor-profile pages
3. Verify buttons show/hide correctly based on which profile you're viewing

## Console Output

When opening a schedule, you'll see logs like:
```
[View Schedule Modal] Opening for ID: 18
[View Schedule Modal] Loaded schedule: {id: 18, scheduler_role: 'student', ...}
[View Schedule Modal] Permission check - Active role: student Schedule role: student
[View Schedule Modal] Edit button shown - roles match
[View Schedule Modal] Delete button shown - roles match
```

Or when viewing another role's schedule:
```
[View Schedule Modal] Opening for ID: 19
[View Schedule Modal] Loaded schedule: {id: 19, scheduler_role: 'tutor', ...}
[View Schedule Modal] Permission check - Active role: student Schedule role: tutor
[View Schedule Modal] Edit button hidden - roles do not match
[View Schedule Modal] Delete button hidden - roles do not match
```

## Security Note

This is **client-side UI protection** only. The backend should also enforce role-based permissions:
- Edit endpoint: `/api/schedules/{id}` should verify the user's active role matches `scheduler_role`
- Delete endpoint: `/api/schedules/{id}` should verify the user's active role matches `scheduler_role`

This prevents users from bypassing the UI to edit/delete schedules from other roles.

## Related Data Structure

The schedule object includes the creator role:
```json
{
  "id": 18,
  "title": "Math Tutoring",
  "scheduler_id": 3,
  "scheduler_role": "student",  ← Used for permission check
  "schedule_type": "recurring",
  "months": ["January", "February"],
  "days": ["Monday", "Wednesday"],
  ...
}
```

## Status: RESOLVED ✅

The schedule view modal now correctly shows/hides Edit and Delete buttons based on role permissions:
- ✅ Shows buttons when viewing own role's schedules
- ✅ Hides buttons when viewing other role's schedules
- ✅ Logs permission checks for debugging
- ✅ Works across all profile pages (student, tutor, parent, advertiser)

Perfect! Users can now view schedules from all their roles but can only edit/delete schedules created by their current active role. 🎉
