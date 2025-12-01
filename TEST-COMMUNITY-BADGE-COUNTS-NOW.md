# Quick Test: Community Modal Badge Counts

## Start Servers

### Terminal 1 - Backend
```bash
cd astegni-backend
python app.py
```

### Terminal 2 - Frontend
```bash
# From project root
python -m http.server 8080
```

## Test Steps

### 1. Login
- Open: http://localhost:8080/profile-pages/tutor-profile.html
- Login with your test account

### 2. Open Community Modal
- Click the "Community" card (has 👥 icon)
- Modal should open immediately

### 3. Check Badge Counts

#### Main Navigation Badges (Left Sidebar)
Look at the left sidebar menu:
- **All** badge - Should show total count (or "0" if no data)
- **Requests** badge - Should show incoming requests (or "0")
- **Connections** badge - Should show established connections (or "0")

#### Filter Badges (Each Section)
In the "All" section, look at filter buttons:
- All: Shows total
- 👨‍🎓 Students: Shows student connections (or "0")
- 👪 Parents: Shows parent connections (or "0")
- 👔 Colleagues: Shows tutor connections (or "0")
- ⭐ Fans: Shows all connections (or "0")

### 4. Test Section Switching
Click each section in left sidebar:
- **All** - Should load all connections with filter counts
- **Requests** - Should show incoming requests with filter counts
- **Connections** - Should show established connections with filter counts
- **Events** - Should load events from database
- **Clubs** - Should load clubs from database

### 5. Test Filtering
In any section with connections:
- Click "Students" filter → Should show only students
- Click "Parents" filter → Should show only parents
- Click "Colleagues" filter → Should show only tutors
- Click "All" filter → Should show all again

## Expected Results

### ✅ Success Indicators
1. All badges show numbers (or "0" if no data)
2. Badges never show empty/blank spaces
3. Filter counts match visible cards
4. Clicking filters updates the grid correctly
5. No JavaScript errors in console
6. Network tab shows API calls to `/api/connections/stats`, `/api/connections`, `/api/events`, `/api/clubs`

### ❌ Failure Indicators
1. Badges are blank or show "undefined"
2. Counts don't update when switching sections
3. Console shows errors about missing functions
4. API calls return 401 (authentication issue)
5. Grid shows "Loading..." forever

## Debug Commands

Open browser console (F12) and run:

```javascript
// Check if communityManager exists
console.log(window.communityManager);

// Check current stats
console.log(window.communityManager.stats);

// Manually reload badge counts
window.communityManager.loadBadgeCounts();

// Check all filter count elements
document.querySelectorAll('.filter-count').forEach(el => {
    console.log(el.closest('.filter-btn')?.textContent, '=', el.textContent);
});

// Check main navigation badges
console.log('All Count:', document.getElementById('all-count')?.textContent);
console.log('Requests Badge:', document.getElementById('requests-badge')?.textContent);
console.log('Connections Badge:', document.getElementById('connections-badge')?.textContent);
```

## Common Issues

### Issue: All badges show "0"
**Cause**: No connections in database
**Solution**: Create test connections using backend API or seed data

### Issue: Badges are blank
**Cause**: JavaScript not loading or communityManager not initialized
**Solution**: Check console for errors, refresh page

### Issue: 401 Unauthorized errors
**Cause**: Not logged in or token expired
**Solution**: Login again, check localStorage for 'token'

### Issue: Network errors
**Cause**: Backend not running or wrong URL
**Solution**: Verify backend is running on http://localhost:8000

## Quick Seed Test Data

If you need test connections, run in backend:

```bash
cd astegni-backend
python seed_tutor_data.py  # Creates tutors
# Then create connections via API or manually in database
```

## Verify API Responses

### Check Connection Stats
```bash
# Replace <TOKEN> with your actual JWT token from localStorage
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/connections/stats
```

Expected response:
```json
{
  "total_connections": 5,
  "connecting_count": 2,
  "connected_count": 5,
  "incoming_requests": 2,
  "outgoing_requests": 1,
  "disconnected_count": 0,
  "failed_count": 0,
  "blocked_count": 0
}
```

### Check Connections List
```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8000/api/connections?status=connected
```

Should return array of connection objects with user details.

## Success Criteria

All tests pass when:
- ✅ All badges display numbers (even "0" is correct)
- ✅ Switching sections loads new data
- ✅ Filtering works and updates counts
- ✅ No console errors
- ✅ API calls succeed (200 status)
- ✅ Empty state shows "No connections found" not blank screen

---

**Implementation Complete!** 🎉

All badge counts now load from database:
- Main navigation badges (all-count, requests-badge, connections-badge)
- Filter badges in each section
- Zero values display correctly when no data exists
