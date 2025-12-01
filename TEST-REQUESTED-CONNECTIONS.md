# Testing Checklist: Requested Connections & Tab-Style Update

## Prerequisites
- [ ] Backend server running (`cd astegni-backend && python app.py`)
- [ ] Frontend server running (`python -m http.server 8080`)
- [ ] Two test user accounts (one parent, one student/tutor)
- [ ] Test users logged in on different browsers/incognito windows

## Test 1: Tab-Style Layout Visual Check

### Parent-Community-Panel
- [ ] Navigate to `http://localhost:8080/profile-pages/parent-profile.html`
- [ ] Go to "Community" panel
- [ ] **Expected:** Horizontal tab bar with 3 tabs (Connections, Events, Clubs)
- [ ] **Expected:** Connections tab is active (primary color background)
- [ ] **Expected:** Each tab shows icon, label, and count number
- [ ] Click "Events" tab
  - [ ] **Expected:** Events tab becomes active (blue background)
  - [ ] **Expected:** Connections tab becomes inactive (transparent)
- [ ] Click "Clubs" tab
  - [ ] **Expected:** Clubs tab becomes active
  - [ ] **Expected:** Previous tabs become inactive
- [ ] Resize browser to mobile width (<768px)
  - [ ] **Expected:** Tabs remain visible with horizontal scroll if needed

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 2: Requested Tab in Parent-Community-Panel

### Navigate to Requested Tab
- [ ] In Community panel, click "Connections" tab
- [ ] **Expected:** Connections section opens with sub-tabs
- [ ] **Expected:** Sub-tabs visible: All, Requested, Tutors, Students, Parents, + Add
- [ ] Click "Requested" tab
  - [ ] **Expected:** Tab becomes active (blue background)
  - [ ] **Expected:** Badge shows count of incoming requests

### Empty State
- [ ] If no incoming requests:
  - [ ] **Expected:** Large emoji (🔔) displayed
  - [ ] **Expected:** Message: "No pending connection requests"
  - [ ] **Expected:** Subtext about connection requests appearing here

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 3: Requested Connection Card Display

### Setup
1. User A (student/tutor) sends connection request to User B (parent)
2. User B (parent) logs into parent-profile.html

### Verify Card Appearance
- [ ] Navigate to Community → Connections → Requested
- [ ] **Expected:** Yellow-bordered card appears
- [ ] **Expected:** Avatar with yellow indicator dot
- [ ] **Expected:** User A's name displayed
- [ ] **Expected:** Badge shows "Tutor" or "Student" role
- [ ] **Expected:** Text: "Wants to connect as [Role]"
- [ ] **Expected:** Email address displayed
- [ ] **Expected:** "Requested X days ago" timestamp
- [ ] **Expected:** Three buttons: Accept (green), Reject (red), View Profile (outlined)

### Hover Effects
- [ ] Hover over card
  - [ ] **Expected:** Yellow glow shadow appears (rgba(251,191,36,0.3))
- [ ] Hover over Accept button
  - [ ] **Expected:** Opacity changes to 0.8
- [ ] Hover over Reject button
  - [ ] **Expected:** Opacity changes to 0.8
- [ ] Hover over View Profile button
  - [ ] **Expected:** Background becomes blue, text becomes white

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 4: Accept Connection Request

### Test Accept Functionality
- [ ] Click "Accept" button on a requested connection
- [ ] **Expected:** Browser shows "Connection accepted successfully!" alert
- [ ] Click OK on alert
- [ ] **Expected:** Page reloads connections
- [ ] **Expected:** Accepted user disappears from "Requested" tab
- [ ] Go to "All" tab
  - [ ] **Expected:** Accepted user now appears with "Connected as [Role]" badge
  - [ ] **Expected:** Card has blue styling (not yellow)
  - [ ] **Expected:** Buttons: View Profile, Message
- [ ] Check badge counts
  - [ ] **Expected:** "Requested" badge decreases by 1
  - [ ] **Expected:** "All" badge increases by 1
  - [ ] **Expected:** Role-specific badge increases (e.g., "Tutors" if accepted tutor)

### Verify Connection on Both Sides
- [ ] Log in as User A (the requester)
- [ ] Navigate to Connections
- [ ] **Expected:** User B (parent) appears in connected connections
- [ ] **Expected:** No longer shows as "pending" or "connecting"

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 5: Reject Connection Request

### Test Reject Functionality
- [ ] User C sends connection request to parent (User B)
- [ ] User B navigates to Community → Connections → Requested
- [ ] Click "Reject" button on User C's request
- [ ] **Expected:** Browser shows "Connection request rejected" alert
- [ ] Click OK on alert
- [ ] **Expected:** Page reloads connections
- [ ] **Expected:** User C's card disappears from "Requested" tab
- [ ] Go to "All" tab
  - [ ] **Expected:** User C does NOT appear in connections list
- [ ] Check badge counts
  - [ ] **Expected:** "Requested" badge decreases by 1
  - [ ] **Expected:** "All" badge remains unchanged

### Verify Rejection on Requester Side
- [ ] Log in as User C (the requester)
- [ ] Navigate to Connections
- [ ] **Expected:** User B (parent) does NOT appear in connections
- [ ] **Expected:** Connection status is "connection_failed" (if visible in outgoing)

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 6: View Profile from Requested Card

### Test Profile Navigation
- [ ] In Requested tab, click "View Profile" button (👤 icon)
- [ ] **Expected:** Redirects to `/view-profiles/view-[role].html?id=[profile_id]`
- [ ] **Expected:** Profile page loads correctly
- [ ] **Expected:** Profile shows requester's information
- [ ] Go back to parent-profile.html
- [ ] **Expected:** Can return to Community panel seamlessly

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 7: CommunityModal Requested Filter

### Open CommunityModal
- [ ] In parent-community-panel, click "Connections" card
- [ ] **Expected:** Full-screen modal opens
- [ ] **Expected:** Modal title: "Connections"
- [ ] **Expected:** Filter bar visible with: All, 🔔 Requested, 👨‍🎓 Students, 👨‍🏫 Tutors, 👪 Parents, + Add

### Test Requested Filter
- [ ] Click "🔔 Requested" filter button
- [ ] **Expected:** Filter button becomes active (blue background)
- [ ] **Expected:** Other filters become inactive
- [ ] **Expected:** Same requested connection cards appear as in panel
- [ ] **Expected:** Accept/Reject buttons functional
- [ ] Test Accept button in modal
  - [ ] **Expected:** Works same as in panel
  - [ ] **Expected:** Modal updates after acceptance
- [ ] Close modal (ESC or X button)
  - [ ] **Expected:** Modal closes smoothly
  - [ ] **Expected:** Parent-profile.html remains in correct state

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 8: Badge Count Accuracy

### Verify All Badge Counts
- [ ] Create 3 incoming connection requests (User D, E, F → Parent)
- [ ] Navigate to Community → Connections
- [ ] **Expected:** "All" badge shows count of connected connections (e.g., 12)
- [ ] **Expected:** "Requested" badge shows 3
- [ ] Accept 1 request (User D)
  - [ ] **Expected:** "Requested" badge decreases to 2
  - [ ] **Expected:** "All" badge increases by 1
  - [ ] **Expected:** Role-specific badge increases (e.g., "Tutors")
- [ ] Reject 1 request (User E)
  - [ ] **Expected:** "Requested" badge decreases to 1
  - [ ] **Expected:** "All" badge remains unchanged
- [ ] Refresh page
  - [ ] **Expected:** Badge counts persist correctly
  - [ ] **Expected:** "Requested" shows 1, not 3

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 9: Search Functionality

### Search in Requested Tab
- [ ] Navigate to Community → Connections → Requested
- [ ] Type requester's name in search box
- [ ] **Expected:** Matching requested connections remain visible
- [ ] **Expected:** Non-matching requests are hidden
- [ ] Clear search box
  - [ ] **Expected:** All requested connections reappear

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 10: Error Handling

### Test API Failures
- [ ] Stop backend server
- [ ] Navigate to Community → Connections → Requested
- [ ] **Expected:** Shows error message: "Failed to load connections"
- [ ] **Expected:** "Retry" button appears
- [ ] Start backend server
- [ ] Click "Retry" button
  - [ ] **Expected:** Successfully loads connections

### Test Accept/Reject with Network Error
- [ ] Stop backend server
- [ ] Click "Accept" on a requested connection
- [ ] **Expected:** Shows error alert: "Failed to accept connection. Please try again."
- [ ] Start backend server
- [ ] Retry acceptance
  - [ ] **Expected:** Works correctly

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 11: Responsive Design

### Mobile View (<768px)
- [ ] Resize browser to 375px width (iPhone SE)
- [ ] Navigate to Community panel
- [ ] **Expected:** Tab bar scrolls horizontally if needed
- [ ] **Expected:** All tabs remain accessible via scroll
- [ ] Navigate to Connections → Requested
- [ ] **Expected:** Connection cards stack vertically
- [ ] **Expected:** Cards fit screen width (280px minimum)
- [ ] **Expected:** Buttons remain accessible and clickable

### Tablet View (768px-1024px)
- [ ] Resize to 768px width (iPad)
- [ ] **Expected:** Tabs display comfortably
- [ ] **Expected:** Connection cards display in grid (2 columns)

### Desktop View (>1024px)
- [ ] Resize to 1440px width
- [ ] **Expected:** Tabs have adequate spacing
- [ ] **Expected:** Connection cards display in grid (3+ columns)

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 12: Dark Mode Compatibility

### Test Theme Switching
- [ ] Enable dark mode (if available in settings)
- [ ] Navigate to Community → Connections → Requested
- [ ] **Expected:** Card backgrounds use `var(--card-bg)` (dark)
- [ ] **Expected:** Text uses `var(--text)` (light)
- [ ] **Expected:** Borders use `var(--border-color)` (dark theme)
- [ ] **Expected:** Yellow accent (#fbbf24) remains visible
- [ ] **Expected:** Buttons maintain contrast
- [ ] Switch back to light mode
  - [ ] **Expected:** Everything remains readable

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 13: Performance

### Load Time
- [ ] Clear browser cache
- [ ] Navigate to parent-profile.html
- [ ] Navigate to Community → Connections
- [ ] **Expected:** Initial load completes within 2 seconds
- [ ] Click "Requested" tab
  - [ ] **Expected:** Tab switch is instant (no delay)
  - [ ] **Expected:** Cards render within 1 second

### Large Dataset
- [ ] Create 50+ incoming connection requests (use script if needed)
- [ ] Navigate to Requested tab
- [ ] **Expected:** Page remains responsive
- [ ] **Expected:** Scrolling is smooth
- [ ] **Expected:** No browser lag or freezing

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test 14: Edge Cases

### Zero Connections
- [ ] New user with no connections
- [ ] Navigate to Community → Connections
- [ ] **Expected:** "All" tab shows empty state
- [ ] **Expected:** "Requested" tab shows empty state
- [ ] **Expected:** Badge counts show 0

### Multiple Roles
- [ ] User G has both "tutor" and "student" roles
- [ ] User G sends connection request
- [ ] **Expected:** Badge shows primary role (tutor > student priority)
- [ ] Accept connection
  - [ ] **Expected:** User G appears in both "Tutors" and "Students" filters

### Duplicate Requests (Should Not Occur)
- [ ] User H sends connection request
- [ ] Verify User H cannot send another request
- [ ] **Expected:** Backend prevents duplicate requests
- [ ] **Expected:** No duplicate cards in Requested tab

**Status:** ⬜ Pass | ⬜ Fail | ⬜ Not Tested

---

## Test Summary

| Test | Status | Notes |
|------|--------|-------|
| 1. Tab-Style Layout | ⬜ | |
| 2. Requested Tab | ⬜ | |
| 3. Card Display | ⬜ | |
| 4. Accept Request | ⬜ | |
| 5. Reject Request | ⬜ | |
| 6. View Profile | ⬜ | |
| 7. CommunityModal | ⬜ | |
| 8. Badge Counts | ⬜ | |
| 9. Search | ⬜ | |
| 10. Error Handling | ⬜ | |
| 11. Responsive | ⬜ | |
| 12. Dark Mode | ⬜ | |
| 13. Performance | ⬜ | |
| 14. Edge Cases | ⬜ | |

---

## Bug Report Template

### Bug Title
[Short description of the issue]

### Severity
- [ ] Critical (blocks testing)
- [ ] High (major functionality broken)
- [ ] Medium (functionality impaired)
- [ ] Low (cosmetic issue)

### Steps to Reproduce
1.
2.
3.

### Expected Behavior


### Actual Behavior


### Screenshots/Console Errors


### Environment
- Browser:
- OS:
- Screen Resolution:

---

**Test Completed By:** ________________
**Date:** ________________
**Overall Status:** ⬜ All Pass | ⬜ Some Failures | ⬜ Incomplete
