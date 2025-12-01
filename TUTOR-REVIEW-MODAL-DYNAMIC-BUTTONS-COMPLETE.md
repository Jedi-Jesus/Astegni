# Tutor Review Modal - Dynamic Buttons Implementation

## Overview
The tutor review modal now displays context-aware action buttons based on which panel/table the modal was opened from. Each panel shows only the relevant actions for that tutor status.

## Changes Made

### 1. Modified Files

#### `js/admin-pages/tutor-review.js`
**Key Updates:**
- Added `currentSourcePanel` variable to track which panel opened the modal
- Modified `reviewTutorRequest(tutorId, sourcePanel)` to accept source panel parameter
- Created `renderModalButtons(sourcePanel)` function for dynamic button rendering
- Updated all reload functions to use `window.loadXxxTutors()` consistently
- Fixed panel reloading to target the correct panel after each action

**New Functions:**
- `renderModalButtons(sourcePanel)` - Dynamically renders appropriate buttons
- `showSuspendReason()` - Shows suspension reason textarea (similar to rejection)
- `confirmSuspendTutor()` - Suspends a tutor with reason
- `reconsiderTutorFromModal()` - Reconsiders a rejected tutor
- `reinstateTutorFromModal()` - Reinstates a suspended tutor

**Updated Functions:**
- `reviewTutorRequest(tutorId, sourcePanel)` - Now accepts and tracks source panel
- `confirmRejectTutor()` - Now reloads the correct panel based on `currentSourcePanel`
- `closeTutorReviewModal()` - Clears both `currentReviewTutorId` and `currentSourcePanel`
- `resetReviewModal()` - Handles both rejection and suspension reason sections

#### `admin-pages/manage-tutor-documents.html`
**Changes:**
- Removed hardcoded action buttons from modal footer
- Footer now contains only a comment: "Buttons will be rendered dynamically by renderModalButtons()"

#### `js/admin-pages/manage-tutors-data.js`
**Changes:**
- Updated all `reviewTutorRequest()` calls to pass the source panel parameter
- Removed redundant action buttons from tables (suspend, reconsider, reinstate)
- Changed all action columns to show only a single "View" button
- Updated button labels from "Review" to "View"

**Table Updates:**
- **Requested table**: `reviewTutorRequest(id, 'requested')`
- **Verified table**: `reviewTutorRequest(id, 'verified')`
- **Rejected table**: `reviewTutorRequest(id, 'rejected')`
- **Suspended table**: `reviewTutorRequest(id, 'suspended')`

### 2. Button Configurations by Panel

| Source Panel | Buttons Displayed | Actions |
|-------------|------------------|---------|
| **Requested** | Approve, Reject | - Approve tutor<br>- Reject with reason |
| **Verified** | Suspend, Reject | - Suspend tutor with reason<br>- Reject with reason |
| **Rejected** | Reconsider | - Move back to pending status |
| **Suspended** | Reinstate, Reject | - Reinstate to verified status<br>- Reject with reason |

### 3. Panel Reload Logic

After each action, the correct panel is automatically reloaded:

| Action | Source Panel | Panel Reloaded | Function Called |
|--------|-------------|----------------|-----------------|
| Approve | Requested | Requested | `window.loadPendingTutors()` |
| Reject | Requested | Requested | `window.loadPendingTutors()` |
| Suspend | Verified | Verified | `window.loadVerifiedTutors()` |
| Reject | Verified | Verified | `window.loadVerifiedTutors()` |
| Reconsider | Rejected | Rejected | `window.loadRejectedTutors()` |
| Reinstate | Suspended | Suspended | `window.loadSuspendedTutors()` |
| Reject | Suspended | Suspended | `window.loadSuspendedTutors()` |

### 4. API Endpoints Used

| Action | Endpoint | Method | Body |
|--------|----------|--------|------|
| Approve | `/api/admin/tutor/{id}/verify` | POST | - |
| Reject | `/api/admin/tutor/{id}/reject` | POST | `{ "reason": "..." }` |
| Suspend | `/api/admin/tutor/{id}/suspend` | POST | `{ "reason": "..." }` |
| Reconsider | `/api/admin/tutor/{id}/reconsider` | POST | - |
| Reinstate | `/api/admin/tutor/{id}/reinstate` | POST | - |

## How It Works

### Opening the Modal
1. User clicks "View" button in any table
2. `reviewTutorRequest(tutorId, sourcePanel)` is called with the appropriate panel name
3. Modal opens and stores both `currentReviewTutorId` and `currentSourcePanel`
4. Tutor details are loaded via API
5. `renderModalButtons(sourcePanel)` renders the appropriate action buttons

### Taking Actions
1. User clicks an action button (e.g., "Suspend", "Reconsider", "Reinstate")
2. If requiring a reason, a textarea appears dynamically
3. User confirms the action
4. API request is made with appropriate endpoint
5. On success:
   - Modal closes
   - Appropriate panel is reloaded to reflect the change
   - Success notification is shown

### Dynamic Button Rendering
The `renderModalButtons()` function uses a switch statement to determine which buttons to show:
- Always shows a "Cancel" button
- Adds action buttons based on `sourcePanel` value
- Each button has proper styling, icons, and onclick handlers

## Key Features

### 1. Context-Aware Buttons
- Only relevant actions are shown for each tutor status
- Prevents invalid state transitions (e.g., can't approve an already verified tutor)

### 2. Reason Inputs
- Rejection reason: Red-themed, required for reject action
- Suspension reason: Orange-themed, required for suspend action
- Both created dynamically when needed

### 3. Consistent UX
- All tables now have uniform "View" buttons
- All actions are performed through the modal
- Consistent button styling and icons across all panels

### 4. Proper State Management
- `currentSourcePanel` tracks context throughout the modal lifecycle
- Panel reloading is context-aware
- Modal reset clears all state properly

### 5. Error Handling
- All API calls have try-catch blocks
- User-friendly error messages
- Fallback to page reload if specific load functions don't exist

## Testing Checklist

- [ ] **Requested Panel**
  - [ ] View tutor details
  - [ ] Approve tutor → tutor removed from requested panel
  - [ ] Reject tutor with reason → tutor removed from requested panel

- [ ] **Verified Panel**
  - [ ] View tutor details
  - [ ] Suspend tutor with reason → tutor removed from verified panel
  - [ ] Reject tutor with reason → tutor removed from verified panel

- [ ] **Rejected Panel**
  - [ ] View tutor details
  - [ ] Reconsider tutor → tutor removed from rejected panel, moved to requested

- [ ] **Suspended Panel**
  - [ ] View tutor details
  - [ ] Reinstate tutor → tutor removed from suspended panel, moved to verified
  - [ ] Reject tutor with reason → tutor removed from suspended panel

- [ ] **Modal Behavior**
  - [ ] ESC key closes modal
  - [ ] Cancel button closes modal
  - [ ] Modal reset clears all fields and states
  - [ ] Proper button visibility (show/hide on action clicks)

## Bug Fixes from Original Implementation

### Fixed Issues:
1. **Panel reload mismatch**: `confirmRejectTutor()` was always reloading `loadPendingTutors()` regardless of source panel
2. **Suspended panel not updating**: After reinstate or reject actions, suspended panel wasn't reloading
3. **Incorrect function references**: Changed from `loadXxxTutors` to `window.loadXxxTutors` for consistency
4. **Missing source context**: Actions didn't know which panel they came from

### How Fixes Work:
- `confirmRejectTutor()` now checks `currentSourcePanel` and reloads the appropriate panel
- All action functions explicitly call `window.loadXxxTutors()` to ensure proper function reference
- Source panel is tracked throughout the modal lifecycle
- Each action properly removes tutors from their current panel

## Window Object Exports

All functions are properly exported to the window object:
```javascript
window.approveTutor = approveTutor;
window.confirmRejectTutor = confirmRejectTutor;
window.reviewTutorRequest = reviewTutorRequest;
window.closeTutorReviewModal = closeTutorReviewModal;
window.showRejectReason = showRejectReason;
window.showSuspendReason = showSuspendReason;
window.confirmSuspendTutor = confirmSuspendTutor;
window.reconsiderTutorFromModal = reconsiderTutorFromModal;
window.reinstateTutorFromModal = reinstateTutorFromModal;
```

## Future Enhancements

Potential improvements:
1. Add loading states during API calls
2. Add animation when buttons change (reject → confirm reject)
3. Store recently viewed tutors for quick access
4. Add keyboard shortcuts for common actions
5. Add batch operations (select multiple tutors)
6. Add activity log showing who performed which actions

## Notes

- All button rendering is done client-side for maximum flexibility
- The modal footer is completely dynamic - no hardcoded buttons
- API endpoints must exist on the backend for all actions to work
- Authentication token is required for all API calls
- The implementation follows the same pattern used in manage-courses modal system
