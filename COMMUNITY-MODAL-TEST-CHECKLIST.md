# Community Modal - Test Checklist

## Testing the Consolidated Implementation

### Prerequisites
- ✅ Backend server running on http://localhost:8000
- ✅ Frontend server running on http://localhost:8080
- ✅ User logged in as a tutor

---

## Test 1: Profile Header "View All" Buttons

### Test 1.1: Connections "View All"
1. Navigate to: http://localhost:8080/profile-pages/tutor-profile.html
2. Locate the **profile header** (top sidebar section)
3. Find the **Connections** stat box
4. Click on the **Connections stat box** or "View All"
5. **Expected Result:**
   - ✅ Community modal opens
   - ✅ Shows "Connections" section
   - ✅ Displays connections from database
   - ✅ No console errors

### Test 1.2: Requests "View All"
1. In the profile header, find the **Requests** stat box
2. Click on the **Requests stat box** or "View All"
3. **Expected Result:**
   - ✅ Community modal opens
   - ✅ Shows "Requests" section
   - ✅ Displays received requests by default
   - ✅ No console errors

---

## Test 2: Modal Section Switching

### Test 2.1: Switch to Connections
1. Open community modal (if not already open)
2. Click **"Connections"** in the left sidebar menu
3. **Expected Result:**
   - ✅ Connections section becomes visible
   - ✅ All other sections hidden
   - ✅ Connection data loads from database
   - ✅ Console shows: "🔄 Switching to section: connections"

### Test 2.2: Switch to Requests
1. Click **"Requests"** in the left sidebar menu
2. **Expected Result:**
   - ✅ Requests section becomes visible
   - ✅ Shows "Received" tab by default
   - ✅ Request data loads from database
   - ✅ Console shows: "🔄 Switching to section: requests"

### Test 2.3: Switch to Events
1. Click **"Events"** in the left sidebar menu
2. **Expected Result:**
   - ✅ Events section becomes visible
   - ✅ Events load from database
   - ✅ Console shows: "🔄 Switching to section: events"

### Test 2.4: Switch to Clubs
1. Click **"Clubs"** in the left sidebar menu
2. **Expected Result:**
   - ✅ Clubs section becomes visible
   - ✅ Clubs load from database
   - ✅ Console shows: "🔄 Switching to section: clubs"

---

## Test 3: Request Tab Switching

### Test 3.1: Switch to Received Requests
1. Navigate to **Requests** section
2. Click **"Received"** tab
3. **Expected Result:**
   - ✅ Received requests section visible
   - ✅ Sent requests section hidden
   - ✅ Data loads from `/api/connections?status=connecting&direction=incoming`
   - ✅ Tab button highlighted

### Test 3.2: Switch to Sent Requests
1. Click **"Sent"** tab
2. **Expected Result:**
   - ✅ Sent requests section visible
   - ✅ Received requests section hidden
   - ✅ Data loads from `/api/connections?status=connecting&direction=outgoing`
   - ✅ Tab button highlighted

---

## Test 4: Filtering

### Test 4.1: Filter Connections by Students
1. Navigate to **Connections** section
2. Click **"Students"** filter button
3. **Expected Result:**
   - ✅ Only student connections displayed
   - ✅ Filter count badge updates
   - ✅ Filter button becomes active
   - ✅ Console shows: "🔍 Filtering connections by: students"

### Test 4.2: Filter Connections by Parents
1. Click **"Parents"** filter button
2. **Expected Result:**
   - ✅ Only parent connections displayed
   - ✅ Filter count badge updates
   - ✅ Filter button becomes active

### Test 4.3: Filter Connections by Tutors
1. Click **"Tutors"** filter button
2. **Expected Result:**
   - ✅ Only tutor connections displayed
   - ✅ Filter count badge updates
   - ✅ Filter button becomes active

### Test 4.4: Filter All Connections
1. Click **"All"** filter button
2. **Expected Result:**
   - ✅ All connections displayed
   - ✅ Filter count badge shows total
   - ✅ "All" button becomes active

---

## Test 5: Search Functionality

### Test 5.1: Search Connections
1. Navigate to **Connections** section
2. Type a name in the search box (e.g., "John")
3. **Expected Result:**
   - ✅ Only matching connections displayed
   - ✅ Console shows: "🔎 Searching connections for: \"John\""
   - ✅ Empty state shows if no results

### Test 5.2: Search Requests
1. Navigate to **Requests** section, **Received** tab
2. Type a name in the search box
3. **Expected Result:**
   - ✅ Only matching requests displayed
   - ✅ Console shows: "🔎 Searching received requests for: \"...\""

---

## Test 6: Connection Actions

### Test 6.1: Accept Connection Request
1. Navigate to **Requests** → **Received** tab
2. Find a request with **Accept** button
3. Click **Accept**
4. **Expected Result:**
   - ✅ Toast message: "✅ Connection accepted!"
   - ✅ Request removed from received list
   - ✅ Connection count increases in profile header
   - ✅ API call to `PUT /api/connections/{id}` with status: "connected"

### Test 6.2: Reject Connection Request
1. Find a request with **Decline** button
2. Click **Decline**
3. **Expected Result:**
   - ✅ Toast message: "Connection declined"
   - ✅ Request removed from received list
   - ✅ API call to `PUT /api/connections/{id}` with status: "connection_failed"

### Test 6.3: Cancel Sent Request
1. Navigate to **Requests** → **Sent** tab
2. Find a request with **Cancel** button
3. Click **Cancel**
4. Confirm the action
5. **Expected Result:**
   - ✅ Confirmation dialog appears
   - ✅ Request removed after confirmation
   - ✅ Toast message: "Request cancelled successfully"
   - ✅ API call to `DELETE /api/connections/{id}`

### Test 6.4: Message User
1. Navigate to **Connections** section
2. Find a connection card with **Message** button
3. Click **Message**
4. **Expected Result:**
   - ✅ Toast message: "🔗 Opening chat..."
   - ✅ Console log: "Message user: {userId}"
   - ✅ (Chat functionality coming soon)

### Test 6.5: View Profile
1. Find a connection card with **View Profile** button
2. Click **View Profile**
3. **Expected Result:**
   - ✅ Navigates to correct profile page (view-student.html, view-tutor.html, etc.)
   - ✅ Profile ID in URL matches the connection's profile ID
   - ✅ Console shows: "🔗 Navigating to {profileType} profile with ID {profileId}"

---

## Test 7: Modal Close

### Test 7.1: Close via X Button
1. Open community modal
2. Click the **X** close button (top right)
3. **Expected Result:**
   - ✅ Modal closes
   - ✅ Modal becomes hidden
   - ✅ Body overflow restored
   - ✅ Console shows: "👋 Community modal closed"

### Test 7.2: Close via ESC Key
1. Open community modal
2. Press **ESC** key
3. **Expected Result:**
   - ✅ Modal closes
   - ✅ Same as Test 7.1

---

## Test 8: Console Messages

### Expected Console Messages (in order)

1. **On page load:**
   ```
   ✅ CommunityManager initialized for tutor profile
   ✅ Community Modal Manager loaded successfully
   ```

2. **On opening modal:**
   ```
   🚀 Opening community modal - Section: connections
   🔄 Switching to section: connections
   ✅ Section "connections" is now visible
   ```

3. **On loading data:**
   ```
   📊 Updating badge counts: {...}
   ✓ Updated all-count to: X
   ✓ Updated connections-badge to: X
   ```

---

## Test 9: Browser Console Checks

### No Errors
- ✅ No JavaScript errors in console
- ✅ No 404 errors for missing files
- ✅ No CORS errors
- ✅ No authentication errors (if logged in)

### Correct API Calls (Network Tab)
- ✅ `GET /api/connections/stats` - Badge counts
- ✅ `GET /api/connections?status=connected&direction=all` - Connections
- ✅ `GET /api/connections?status=connecting&direction=incoming` - Received requests
- ✅ `GET /api/connections?status=connecting&direction=outgoing` - Sent requests
- ✅ `GET /api/events` - Events
- ✅ `GET /api/clubs` - Clubs

---

## Test 10: Edge Cases

### Test 10.1: Empty State
1. Navigate to a section with no data (e.g., Requests with no requests)
2. **Expected Result:**
   - ✅ Shows empty state message
   - ✅ Shows appropriate emoji (📩, 📤, 🔍)
   - ✅ No broken UI

### Test 10.2: Search with No Results
1. Search for a name that doesn't exist (e.g., "XYZ123")
2. **Expected Result:**
   - ✅ Shows "No results found for \"XYZ123\""
   - ✅ Shows search icon
   - ✅ Suggests trying different keywords

### Test 10.3: Multiple Rapid Clicks
1. Click different sections rapidly
2. **Expected Result:**
   - ✅ No errors
   - ✅ Final section displays correctly
   - ✅ No duplicate API calls

---

## Test 11: Old Files Removed

### Verify Old Files Are Not Loaded
1. Check page source or Network tab
2. **Expected Result:**
   - ✅ `community-modal-functions.js` NOT loaded
   - ✅ `bookstore-gamestore-communityModal.js` NOT loaded
   - ✅ Only `community-modal-manager.js` loaded

---

## Summary Checklist

- [ ] All profile header buttons work
- [ ] All section switches work
- [ ] Request tab switching works
- [ ] Filtering works for all categories
- [ ] Search works in all sections
- [ ] Connection actions work (Accept/Reject/Cancel/Message/View)
- [ ] Modal closes correctly (X button and ESC key)
- [ ] No console errors
- [ ] Correct console messages appear
- [ ] API calls are correct
- [ ] Empty states display properly
- [ ] Old files not loaded

---

## If Tests Fail

### Debugging Steps

1. **Check Browser Console**
   - Look for errors in red
   - Check for "CommunityManager not found" errors
   - Verify initialization messages

2. **Check Network Tab**
   - Are API calls being made?
   - Are they returning 200 OK?
   - Check response data

3. **Check Script Load Order**
   - `communityManager.js` must load before `community-modal-manager.js`
   - Verify in page source or Network tab

4. **Check HTML onclick Handlers**
   - Do they call the correct function names?
   - Are function names spelled correctly?

5. **Clear Browser Cache**
   - Press Ctrl+Shift+R (hard reload)
   - Or clear cache in DevTools

---

**Test Date:** _____________
**Tested By:** _____________
**Result:** Pass ☐ / Fail ☐

**Notes:**
