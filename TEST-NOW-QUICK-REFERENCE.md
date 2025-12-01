# Test Badge Counts NOW - Quick Reference

## Start Servers

```bash
# Terminal 1
cd astegni-backend && python app.py

# Terminal 2
python -m http.server 8080
```

## Open & Test

1. Go to: **http://localhost:8080/profile-pages/tutor-profile.html**
2. Login if needed
3. Open **DevTools Console (F12)**
4. Click the **"Community" card**

## What You Should See in Console

```
🔄 Re-initializing badges after modal open...
✓ Initialized all-count badge to 0
✓ Initialized requests-badge to 0
✓ Initialized connections-badge to 0
📊 Updating badge counts: {totalConnections: X, pendingRequests: Y, ...}
✓ Updated all-count to: X
✓ Updated requests-badge to: Y
✓ Updated connections-badge to: Z
```

## What Badges Should Show

- **All Count**: Number (sum of connections + requests + events + clubs)
- **Requests Badge**: Number (incoming connection requests)
- **Connections Badge**: Number (established connections)
- **Filter badges**: Numbers based on roles

**Even "0" is correct!** Just not blank/empty.

## If Not Working

### Quick Fix (Run in console):
```javascript
// After opening modal, run:
window.communityManager.initializeBadges();
window.communityManager.loadBadgeCounts();
```

### Check:
```javascript
// Are badges showing?
console.log({
    all: document.getElementById('all-count')?.textContent,
    requests: document.getElementById('requests-badge')?.textContent,
    connections: document.getElementById('connections-badge')?.textContent
});
```

### Common Issues:
- **Not logged in**: Check `localStorage.getItem('token')`
- **Backend not running**: Check http://localhost:8000
- **401 errors**: Login again
- **Still blank**: Run diagnostic from `QUICK-DEBUG-BADGES.md`

## Files to Check

If you need to verify the changes:

1. **`js/page-structure/communityManager.js`** - Has detailed logging
2. **`js/tutor-profile/modal-manager.js`** - Re-initializes on modal open
3. **`js/tutor-profile/global-functions.js`** - Uses communityManager

## Success = Badges Show Numbers! ✅

Even if they show "0" (because you have no connections), that's correct behavior!
