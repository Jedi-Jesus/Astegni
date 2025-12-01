# Parent Community Panel - Exact Line Ranges for Extraction

## Quick Reference Table

| Component | Start | End | Lines | Status |
|-----------|-------|-----|-------|--------|
| CSS Link (HEAD) | 22 | 23 | 2 | Add if missing |
| Sidebar Link | 2271 | 2274 | 4 | Change ID to 'tutor-community' |
| Main Panel HTML | 4394 | 4820 | 427 | Change ID to 'tutor-community-panel' |
| Community Modal | 6685 | 6911 | 227 | Keep ID as 'communityModal' |
| Embedded CSS | 1590 | 2111 | 522 | Optional (external file exists) |
| JS Functions | 7684 | 7886 | 203 | Copy as-is |
| Initialization | 7672 | 7677 | 6 | Included in JS functions |
| JS Imports | 7067 | 7067 | 1 | Verify present |
| Parent Manager Import | 7889 | 7890 | 2 | Check if needed |

**Total: ~1,400 lines to extract**

---

## Section Details

### 1. CSS Link (Lines 22-23)
**What:** Import statement for community modal styles
**Action:** Add to tutor-profile.html HEAD if not present
**Change:** None needed

### 2. Sidebar Link (Lines 2271-2274)
**What:** "Community" link in profile sidebar
**Action:** Add after "Blog" link
**Change:** Replace `switchPanel('parent-community')` with `switchPanel('tutor-community')`

### 3. Main Panel HTML (Lines 4394-4820)
**What:** Complete community panel with all subsections
**Action:** Extract entire block and paste in panels section
**Change:** 
- Line 4394: Change `id="parent-community-panel"` to `id="tutor-community-panel"`

### 4. Community Modal (Lines 6685-6911)
**What:** Modal popup for community sections
**Action:** Extract entire block and paste before </body>
**Change:** None needed (ID stays as "communityModal")

### 5. Embedded CSS (Lines 1590-2111)
**What:** CSS styling for community components
**Action:** OPTIONAL - Skip if external CSS file is imported
**Change:** None needed

### 6. JavaScript Functions (Lines 7684-7886)
**What:** All community-related functions
**Action:** Extract and paste in script section
**Change:** Update console.log to mention tutor profile

### 7. Initialization Code (Lines 7672-7677)
**What:** Initialize communityManager
**Action:** Include when copying JS functions
**Change:** Update log message

### 8. Script Imports
**Line 7067:** Verify `../js/page-structure/communityManager.js` is imported
**Lines 7889-7890:** Check if parent community manager import needed

---

## Copy-Paste Order

1. **First:** Add CSS link to HEAD (lines 22-23)
2. **Second:** Add sidebar link (lines 2271-2274)
3. **Third:** Add panel HTML (lines 4394-4820)
4. **Fourth:** Add modal HTML (lines 6685-6911)
5. **Fifth:** Add CSS styles if needed (lines 1590-2111)
6. **Sixth:** Add JS initialization (lines 7672-7677)
7. **Seventh:** Add JS functions (lines 7684-7886)
8. **Eighth:** Verify script imports

---

## ID Changes Required

| Old | New | Location |
|-----|-----|----------|
| `parent-community-panel` | `tutor-community-panel` | Line 4394 |
| `switchPanel('parent-community')` | `switchPanel('tutor-community')` | Line 2271 |
| `communityModal` | Keep as-is | Line 6686 |

---

## Files to Import

Required:
- `../css/tutor-profile/community-modal.css` (external CSS)
- `../js/page-structure/communityManager.js` (manager class)

Optional:
- `../js/parent-profile/parent-community-manager.js` (or tutor equivalent)

---

## All Function Names

Functions to include in script:
- `openCommunityModal()`
- `closeCommunityModal()`
- `switchCommunityMainSection(sectionName)`
- `filterConnectionsBy(category)`
- `searchConnections(query)`
- `filterEventsBy(filterType)`
- `searchEvents(query)`
- `filterClubsBy(filterType)`
- `searchClubs(query)`
- `openAddConnectionModal()`
- `viewEvent(eventId)`
- `joinEvent(eventId)`
- `viewClub(clubId)`
- `joinClub(clubId)`

---

## Quick Test Checklist

After extraction:
- [ ] No console errors
- [ ] Sidebar link visible
- [ ] Community panel shows on click
- [ ] Modal opens/closes
- [ ] Search boxes functional
- [ ] No style conflicts

---

## Rollback

All changes are additive. To rollback:
1. Remove sidebar link
2. Remove panel HTML
3. Remove modal HTML
4. Remove CSS link
5. Remove JS functions
6. Refresh page

Done!
