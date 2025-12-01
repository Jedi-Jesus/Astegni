# Tutor Review Modal - Quick Test Guide

## Quick Testing Steps

### 1. Test Requested Panel (Pending Tutors)

**Open Modal:**
```
Navigate to: Tutor Requests panel
Click: "View" button on any tutor
```

**Expected Buttons:**
- ✅ Cancel (gray)
- ✅ Reject (red)
- ✅ Approve (green)

**Test Approve:**
1. Click "Approve" button
2. Confirm action
3. ✅ Success notification appears
4. ✅ Modal closes
5. ✅ Tutor disappears from Requested panel

**Test Reject:**
1. Click "Reject" button
2. ✅ Rejection reason textarea appears
3. ✅ "Reject" button becomes hidden
4. ✅ "Confirm Rejection" button appears
5. Type rejection reason
6. Click "Confirm Rejection"
7. Confirm action
8. ✅ Success notification appears
9. ✅ Modal closes
10. ✅ Tutor disappears from Requested panel

---

### 2. Test Verified Panel (Active Tutors)

**Open Modal:**
```
Navigate to: Verified Tutors panel
Click: "View" button on any tutor
```

**Expected Buttons:**
- ✅ Cancel (gray)
- ✅ Reject (red)
- ✅ Suspend (orange)

**Test Suspend:**
1. Click "Suspend" button
2. ✅ Suspension reason textarea appears (orange-themed)
3. ✅ "Suspend" button becomes hidden
4. ✅ "Confirm Suspension" button appears
5. Type suspension reason
6. Click "Confirm Suspension"
7. Confirm action
8. ✅ Success notification appears
9. ✅ Modal closes
10. ✅ Tutor disappears from Verified panel
11. ✅ Tutor appears in Suspended panel

**Test Reject from Verified:**
1. Click "Reject" button
2. ✅ Rejection reason textarea appears (red-themed)
3. Type rejection reason
4. Click "Confirm Rejection"
5. Confirm action
6. ✅ Success notification appears
7. ✅ Modal closes
8. ✅ Tutor disappears from Verified panel
9. ✅ Tutor appears in Rejected panel

---

### 3. Test Rejected Panel

**Open Modal:**
```
Navigate to: Rejected Tutors panel
Click: "View" button on any tutor
```

**Expected Buttons:**
- ✅ Cancel (gray)
- ✅ Reconsider (blue)

**Test Reconsider:**
1. Click "Reconsider" button
2. Confirm action
3. ✅ Success notification appears
4. ✅ Modal closes
5. ✅ Tutor disappears from Rejected panel
6. ✅ Tutor appears in Requested panel (moved back to pending)

---

### 4. Test Suspended Panel

**Open Modal:**
```
Navigate to: Suspended Tutors panel
Click: "View" button on any tutor
```

**Expected Buttons:**
- ✅ Cancel (gray)
- ✅ Reject (red)
- ✅ Reinstate (green)

**Test Reinstate:**
1. Click "Reinstate" button
2. Confirm action
3. ✅ Success notification appears
4. ✅ Modal closes
5. ✅ Tutor disappears from Suspended panel
6. ✅ Tutor appears in Verified panel

**Test Reject from Suspended:**
1. Click "Reject" button
2. ✅ Rejection reason textarea appears
3. Type rejection reason
4. Click "Confirm Rejection"
5. Confirm action
6. ✅ Success notification appears
7. ✅ Modal closes
8. ✅ Tutor disappears from Suspended panel
9. ✅ Tutor appears in Rejected panel

---

## Visual Verification Checklist

### Button Colors
- ✅ Cancel: Gray border, gray text
- ✅ Approve: Green background, white text
- ✅ Reject: Red background, white text
- ✅ Confirm Rejection: Darker red background
- ✅ Suspend: Orange background, white text
- ✅ Confirm Suspension: Darker orange background
- ✅ Reconsider: Blue background, white text
- ✅ Reinstate: Green background, white text

### Icons
- ✅ Cancel: X icon (fas fa-times)
- ✅ Approve: Check circle icon (fas fa-check-circle)
- ✅ Reject: X circle icon (fas fa-times-circle)
- ✅ Confirm Rejection: Warning triangle icon (fas fa-exclamation-triangle)
- ✅ Suspend: Ban icon (fas fa-ban)
- ✅ Confirm Suspension: Warning triangle icon
- ✅ Reconsider: Undo icon (fas fa-undo)
- ✅ Reinstate: Check circle icon

### Textarea Styling
- ✅ Rejection reason: Red border (border-red-300), red label text
- ✅ Suspension reason: Orange border (border-orange-300), orange label text

---

## Common Issues to Watch For

### ❌ Problem: Modal shows wrong buttons
**Solution:** Check that `reviewTutorRequest()` is being called with correct panel name:
- 'requested', 'verified', 'rejected', or 'suspended'

### ❌ Problem: Tutor doesn't disappear after action
**Solution:** Check that:
1. API endpoint returns success (check browser console)
2. Correct panel reload function is being called
3. Panel reload function exists in window object

### ❌ Problem: Textarea doesn't appear
**Solution:** Check that:
1. Button has correct onclick handler (`showRejectReason()` or `showSuspendReason()`)
2. Textarea section IDs are correct
3. No JavaScript errors in console

### ❌ Problem: Action completes but panel doesn't refresh
**Solution:** Verify:
1. `window.loadXxxTutors` functions exist
2. Console shows which reload function is being called
3. No errors during reload

---

## Browser Console Debugging

### Check Source Panel:
```javascript
// Should show the panel name when modal is open
console.log(currentSourcePanel);
// Expected: 'requested', 'verified', 'rejected', or 'suspended'
```

### Check Load Functions:
```javascript
// Should return true for all
console.log(typeof window.loadPendingTutors === 'function');
console.log(typeof window.loadVerifiedTutors === 'function');
console.log(typeof window.loadRejectedTutors === 'function');
console.log(typeof window.loadSuspendedTutors === 'function');
```

### Monitor API Calls:
```javascript
// Open Network tab in browser DevTools
// Filter: XHR or Fetch
// Watch for:
// - POST /api/admin/tutor/{id}/verify
// - POST /api/admin/tutor/{id}/reject
// - POST /api/admin/tutor/{id}/suspend
// - POST /api/admin/tutor/{id}/reconsider
// - POST /api/admin/tutor/{id}/reinstate
```

---

## Expected User Flow

### Typical Tutor Lifecycle:

```
1. REQUESTED (Pending)
   ├─→ [Approve] → VERIFIED
   └─→ [Reject] → REJECTED

2. VERIFIED (Active)
   ├─→ [Suspend] → SUSPENDED
   └─→ [Reject] → REJECTED

3. REJECTED
   └─→ [Reconsider] → REQUESTED (back to pending)

4. SUSPENDED
   ├─→ [Reinstate] → VERIFIED (back to active)
   └─→ [Reject] → REJECTED
```

---

## Success Criteria

All tests pass when:
1. ✅ All buttons appear correctly in each panel
2. ✅ All actions complete successfully
3. ✅ Tutors move between panels as expected
4. ✅ Modal closes after each action
5. ✅ Appropriate panel reloads after each action
6. ✅ Success notifications appear
7. ✅ No JavaScript errors in console
8. ✅ ESC key closes modal
9. ✅ Cancel button closes modal
10. ✅ Confirmation dialogs appear for all actions

---

## Performance Notes

- Modal opens instantly (tutor data loads asynchronously)
- Button rendering is immediate (no delay)
- Panel reload after action should complete within 1-2 seconds
- If reload takes longer, check network connection and backend response time
