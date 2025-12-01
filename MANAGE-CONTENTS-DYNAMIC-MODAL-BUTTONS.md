# Manage Contents - Dynamic Modal Action Buttons Implementation

## Overview
Updated the manage-contents.html page to implement dynamic action buttons in the content modal based on which panel the modal was opened from.

## Changes Made

### 1. Table Actions Column
- **Before**: Multiple action buttons (Approve, Reject, Flag, etc.) in the table actions column
- **After**: Only "View" button in the table actions column
- All other actions now appear in the modal footer

### 2. Modal Action Buttons (Dynamic Based on Panel)

#### Requested Panel
When content modal is opened from the "Requested Contents" panel:
- **Approve** button (green) - Approves the content
- **Reject** button (red) - Rejects the content with reason

#### Verified Panel
When content modal is opened from the "Verified Contents" panel:
- **Flag** button (orange) - Flags the content for review
- **Reject** button (red) - Rejects the content

#### Rejected Panel
When content modal is opened from the "Rejected Contents" panel:
- **Reconsider** button (blue) - Moves content back to pending

#### Flagged Panel
When content modal is opened from the "Flagged Contents" panel:
- **Reinstate** button (green) - Restores content to verified status
- **Reject** button (red) - Rejects the content

All panels include a **Close** button to dismiss the modal.

## Implementation Details

### File Modified
- `js/admin-pages/manage-contents.js`

### Key Functions Updated

#### 1. `createContentRow(content, panel)`
```javascript
// Updated to pass panel parameter to viewContent()
onclick="viewContent(${content.id}, '${panel}')"
```

#### 2. `viewContent(contentId, panel = null)`
```javascript
// Now accepts panel parameter
// Auto-determines panel from content status if not provided
async function viewContent(contentId, panel = null) {
    // ... fetch content
    openContentModal(content, panel);
}
```

#### 3. `openContentModal(content, panel = 'requested')`
```javascript
// Updated to accept panel parameter
// Dynamically updates modal footer with panel-specific action buttons
function openContentModal(content, panel = 'requested') {
    // ... existing code

    // Update modal footer with dynamic buttons
    const modalFooter = modal.querySelector('.modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = getModalActionButtons(content.id, panel);
    }
}
```

#### 4. `getModalActionButtons(contentId, panel)` - NEW FUNCTION
```javascript
// Returns HTML for action buttons based on panel
function getModalActionButtons(contentId, panel) {
    // Returns different buttons based on panel:
    // - requested: Approve + Reject
    // - verified: Flag + Reject
    // - rejected: Reconsider
    // - flagged: Reinstate + Reject
    // Always includes Close button
}
```

#### 5. `createUploadFeedItem(upload)` - UPDATED
```javascript
// Live upload feed items now pass panel parameter when clicked
const panel = upload.verification_status === 'pending' ? 'requested' :
              upload.verification_status === 'suspended' ? 'flagged' :
              upload.verification_status;

div.onclick = () => viewContent(upload.id, panel);
```

#### 6. `getActionButtons(content, panel)` - SIMPLIFIED
```javascript
// Simplified to return empty string
// All actions are now in the modal instead of table
function getActionButtons(content, panel) {
    return '';
}
```

## User Experience Flow

### Example: Viewing Content from Requested Panel
1. User navigates to "Requested Contents" panel
2. User clicks "View" button on any content row
3. Modal opens showing content details
4. Modal footer displays: **[Close] [Approve] [Reject]** buttons
5. User can approve or reject directly from modal

### Example: Viewing Content from Flagged Panel
1. User navigates to "Flagged Contents" panel
2. User clicks "View" button on any flagged content
3. Modal opens showing content details (including suspension reason)
4. Modal footer displays: **[Close] [Reinstate] [Reject]** buttons
5. User can reinstate (restore to verified) or reject

## Benefits

1. **Cleaner Table UI**: Actions column only shows "View" button, reducing visual clutter
2. **Context-Aware Actions**: Modal shows only relevant actions based on current content status
3. **Better UX**: Users can review content details before taking action
4. **Consistent Pattern**: All actions happen in the modal, not scattered in table rows
5. **Maintainable Code**: Single function (`getModalActionButtons`) manages all button logic

## Testing Checklist

- [x] Requested panel: Modal shows Approve + Reject buttons
- [x] Verified panel: Modal shows Flag + Reject buttons
- [x] Rejected panel: Modal shows Reconsider button
- [x] Flagged panel: Modal shows Reinstate + Reject buttons
- [x] Table actions column only shows View button
- [x] Live upload feed items open modal with correct buttons
- [x] All action buttons work correctly (approve, reject, flag, reconsider, reinstate)
- [x] Close button always present and functional

## Notes

- The modal automatically determines the panel if it's not explicitly provided (e.g., when called from live upload feed)
- Button icons use Font Awesome classes for visual clarity
- All buttons have hover states for better interaction feedback
- Action functions (approveContent, rejectContent, etc.) remain unchanged
