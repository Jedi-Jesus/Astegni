# Test Community Modal Badge Counts

## Quick Test Instructions

### 1. Start Backend
```bash
cd astegni-backend
python app.py
```

### 2. Start Frontend
```bash
# From project root
python -m http.server 8080
```

### 3. Open Browser
```
http://localhost:8080/profile-pages/tutor-profile.html
```

### 4. Test Badge Counts

#### Check Console Logs
Open browser console (F12) and look for:
```
👥 Initializing Community Manager...
✅ Community Manager initialized
```

#### Check Badge Values
1. Click on the "Community" card or button to open the modal
2. Look at the left sidebar menu badges:
   - **All** badge (id: `all-count`) - Should show total count
   - **Requests** badge (id: `requests-badge`) - Should show incoming requests
   - **Connections** badge (id: `connections-badge`) - Should show connected users

#### Expected Behavior
- Badges should show **numbers from database** (not 0, unless database is empty)
- Numbers should match actual data in database
- If no token/not logged in, badges may show 0

### 5. Test Grid Loading

#### All Section
1. Click "All" in the left menu
2. Should see loading state, then connection cards
3. Filter counts should update dynamically
4. Click "Students", "Parents", etc. to filter

#### Requests Section
1. Click "Requests" in the left menu
2. Should show incoming connection requests
3. Should have "Accept" and "Decline" buttons
4. Filter counts should show breakdown by role

#### Connections Section
1. Click "Connections" in the left menu
2. Should show established connections
3. Should have "Message" button
4. Filter counts should show breakdown by role

#### Events Section
1. Click "Events" in the left menu
2. Should load events from database
3. Should show event cards with "Register" button

#### Clubs Section
1. Click "Clubs" in the left menu
2. Should load clubs from database
3. Should show club cards with "View Club" button

## Debugging

### Badge Not Showing Count

**Check 1:** Console errors?
```javascript
// In browser console
console.log(window.communityManager);
```

**Check 2:** API responding?
```bash
# Test in browser console or separate terminal
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/connections/stats
```

**Check 3:** Token exists?
```javascript
// In browser console
console.log(localStorage.getItem('token'));
```

### Grid Not Loading

**Check 1:** Community Manager initialized?
```javascript
// In browser console
console.log(typeof window.communityManager);
// Should output: "object"
```

**Check 2:** Try manual load
```javascript
// In browser console
window.communityManager.loadSectionGrid('all');
```

**Check 3:** Check API
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/connections?status=connected
```

## Sample Data Setup

If you need sample data to test:

### Create Sample Connections
```sql
-- Run in PostgreSQL
INSERT INTO connections (user_id_1, user_id_2, connection_type, status, initiated_by)
VALUES 
  (1, 2, 'connect', 'connected', 1),
  (1, 3, 'connect', 'connecting', 3),
  (1, 4, 'connect', 'connected', 1);
```

### Create Sample Events
```bash
cd astegni-backend
python seed_events_clubs_data.py
```

## What Should You See?

### After Opening Modal
- ✅ Badge numbers appear instantly (from cache or API)
- ✅ All badge shows total (connections + requests + events + clubs)
- ✅ Requests badge shows pending incoming requests
- ✅ Connections badge shows established connections

### After Clicking Section
- ✅ Loading state appears
- ✅ Grid populates with cards from database
- ✅ Filter counts update dynamically
- ✅ Empty state if no data

### After Filtering
- ✅ Active filter highlighted
- ✅ Cards filtered by category
- ✅ Count remains accurate

## Success Criteria

- [ ] All badges show real numbers from database
- [ ] No hardcoded counts (like 257, 89, etc.)
- [ ] Grids load from database tables
- [ ] Filter counts calculate dynamically
- [ ] Events grid loads from events table
- [ ] Clubs grid loads from clubs table
- [ ] Connections grid loads from connections table

## Files Modified

1. `js/page-structure/communityManager.js` - Added database integration
2. `profile-pages/tutor-profile.html` - Added script tag and updated functions
3. `js/tutor-profile/init.js` - Added communityManager initialization
4. `astegni-backend/app.py modules/models.py` - Added roles to ConnectionResponse
5. `astegni-backend/connection_endpoints.py` - Added roles to API responses
