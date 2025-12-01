# Debug Guide: Badge Counts Not Showing

## Quick Diagnostics

Open browser console (F12) and run these commands step by step:

### Step 1: Check if CommunityManager is loaded
```javascript
console.log('CommunityManager class exists?', typeof CommunityManager !== 'undefined');
```
**Expected**: `true`
**If false**: Script not loaded, check HTML script tag

### Step 2: Check if instance is created
```javascript
console.log('window.communityManager exists?', typeof window.communityManager !== 'undefined');
console.log('window.communityManager:', window.communityManager);
```
**Expected**: Object with methods
**If undefined**: Init.js not running or error in constructor

### Step 3: Check if badge elements exist
```javascript
const badges = {
    allCount: document.getElementById('all-count'),
    requestsBadge: document.getElementById('requests-badge'),
    connectionsBadge: document.getElementById('connections-badge')
};
console.log('Badge elements:', badges);
```
**Expected**: All three elements found (not null)
**If null**: HTML elements missing or wrong IDs

### Step 4: Check current badge values
```javascript
console.log('All Count:', document.getElementById('all-count')?.textContent);
console.log('Requests Badge:', document.getElementById('requests-badge')?.textContent);
console.log('Connections Badge:', document.getElementById('connections-badge')?.textContent);
```
**Expected**: Should show "0" at minimum
**If empty**: Badges not initialized

### Step 5: Check authentication token
```javascript
const token = localStorage.getItem('token');
console.log('Token exists?', !!token);
console.log('Token:', token ? token.substring(0, 20) + '...' : 'No token');
```
**Expected**: Token exists
**If no token**: User not logged in, badges will stay at "0"

### Step 6: Manually trigger badge load
```javascript
if (window.communityManager) {
    console.log('Attempting to load badge counts...');
    window.communityManager.loadBadgeCounts()
        .then(() => console.log('✅ Badge counts loaded'))
        .catch(err => console.error('❌ Error loading badges:', err));
} else {
    console.error('❌ communityManager not available');
}
```
**Expected**: API calls in Network tab, badges update
**If error**: Check console for specific error message

### Step 7: Check API response
```javascript
// Check connection stats API
const token = localStorage.getItem('token');
fetch('http://localhost:8000/api/connections/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
})
.then(res => {
    console.log('API Status:', res.status);
    return res.json();
})
.then(data => {
    console.log('API Response:', data);
})
.catch(err => console.error('API Error:', err));
```
**Expected**: 200 status, JSON with counts
**If 401**: Token expired or invalid
**If 404**: Backend not running
**If network error**: CORS issue or backend down

### Step 8: Check filter count elements
```javascript
const filterCounts = document.querySelectorAll('.filter-count');
console.log('Filter count elements found:', filterCounts.length);
filterCounts.forEach((el, i) => {
    const btn = el.closest('.filter-btn');
    console.log(`Filter ${i}:`, btn?.textContent.trim(), '=', el.textContent);
});
```
**Expected**: Multiple filter elements found
**If 0**: Modal not open or wrong selector

## Common Issues & Solutions

### Issue 1: "window.communityManager is undefined"

**Cause**: CommunityManager not initialized

**Solution**:
```javascript
// Manually create instance
if (typeof CommunityManager !== 'undefined') {
    window.communityManager = new CommunityManager();
    console.log('✅ Manually created communityManager');
} else {
    console.error('❌ CommunityManager class not loaded');
}
```

### Issue 2: Badges show empty text (not "0")

**Cause**: `initializeBadges()` not called

**Solution**:
```javascript
// Manually initialize badges to 0
document.getElementById('all-count').textContent = '0';
document.getElementById('requests-badge').textContent = '0';
document.getElementById('connections-badge').textContent = '0';
console.log('✅ Badges manually set to 0');
```

### Issue 3: API returns 401 Unauthorized

**Cause**: Not logged in or token expired

**Solution**:
1. Login again to get fresh token
2. Or manually set token (for testing):
```javascript
// Get token from another session or backend
localStorage.setItem('token', 'YOUR_VALID_TOKEN_HERE');
```

### Issue 4: CORS error in console

**Cause**: Backend CORS not configured or frontend URL mismatch

**Solution**:
1. Check backend is running: http://localhost:8000
2. Check frontend is on: http://localhost:8080
3. Backend `app.py` should have CORS for localhost:8080

### Issue 5: Badges load but show "0" when you have data

**Cause**: No connections in database

**Solution**:
```javascript
// Check if you actually have connections
fetch('http://localhost:8000/api/connections', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(res => res.json())
.then(data => {
    console.log('Your connections:', data);
    console.log('Connection count:', data.length);
});
```

### Issue 6: Modal doesn't open

**Cause**: Modal manager not working

**Solution**:
```javascript
// Manually open modal
const modal = document.getElementById('communityModal');
if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
    console.log('✅ Modal opened manually');
} else {
    console.error('❌ Modal element not found');
}
```

## Complete Diagnostic Report

Run this complete diagnostic script:

```javascript
console.clear();
console.log('=== COMMUNITY BADGE DIAGNOSTIC ===\n');

// 1. Check CommunityManager class
console.log('1. CommunityManager class:', typeof CommunityManager !== 'undefined' ? '✅ Loaded' : '❌ Not loaded');

// 2. Check instance
console.log('2. window.communityManager:', window.communityManager ? '✅ Exists' : '❌ Not created');

// 3. Check DOM elements
const allCount = document.getElementById('all-count');
const requestsBadge = document.getElementById('requests-badge');
const connectionsBadge = document.getElementById('connections-badge');
console.log('3. Badge elements:');
console.log('   - all-count:', allCount ? '✅ Found' : '❌ Not found');
console.log('   - requests-badge:', requestsBadge ? '✅ Found' : '❌ Not found');
console.log('   - connections-badge:', connectionsBadge ? '✅ Found' : '❌ Not found');

// 4. Check badge values
console.log('4. Badge values:');
console.log('   - all-count:', allCount?.textContent || '(empty)');
console.log('   - requests-badge:', requestsBadge?.textContent || '(empty)');
console.log('   - connections-badge:', connectionsBadge?.textContent || '(empty)');

// 5. Check authentication
const token = localStorage.getItem('token');
console.log('5. Authentication token:', token ? '✅ Exists' : '❌ No token');

// 6. Check modal
const modal = document.getElementById('communityModal');
console.log('6. Community modal:', modal ? '✅ Found' : '❌ Not found');
console.log('   - Modal visible:', modal ? (modal.style.display !== 'none' ? '✅ Yes' : '❌ No') : 'N/A');

// 7. Check filter counts
const filterCounts = document.querySelectorAll('.filter-count');
console.log('7. Filter count elements:', filterCounts.length, 'found');

// 8. Check communityManager stats
if (window.communityManager) {
    console.log('8. CommunityManager stats:', window.communityManager.stats || 'Not loaded yet');
} else {
    console.log('8. CommunityManager stats: N/A (manager not created)');
}

// 9. Test API connection
console.log('\n9. Testing API connection...');
if (token) {
    fetch('http://localhost:8000/api/connections/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        console.log('   API Status:', res.status);
        if (res.ok) {
            return res.json();
        } else {
            throw new Error(`HTTP ${res.status}`);
        }
    })
    .then(data => {
        console.log('   ✅ API Response:', data);
    })
    .catch(err => {
        console.log('   ❌ API Error:', err.message);
    });
} else {
    console.log('   ⚠️ Skipped (no token)');
}

console.log('\n=== END DIAGNOSTIC ===');
```

## Manual Fix Script

If diagnostics show issues, run this to manually fix and test:

```javascript
console.log('🔧 Running manual fix...\n');

// Step 1: Create communityManager if missing
if (!window.communityManager && typeof CommunityManager !== 'undefined') {
    window.communityManager = new CommunityManager();
    console.log('✅ Created communityManager instance');
}

// Step 2: Initialize badges to 0 if empty
const badges = ['all-count', 'requests-badge', 'connections-badge'];
badges.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.textContent.trim()) {
        el.textContent = '0';
        console.log(`✅ Set ${id} to "0"`);
    }
});

// Step 3: Trigger badge load
if (window.communityManager) {
    console.log('📡 Loading badge counts from API...');
    window.communityManager.loadBadgeCounts()
        .then(() => {
            console.log('✅ Badge counts loaded successfully');
            // Show results
            console.log('Badge values:');
            badges.forEach(id => {
                const el = document.getElementById(id);
                console.log(`  ${id}: ${el?.textContent}`);
            });
        })
        .catch(err => {
            console.error('❌ Failed to load badge counts:', err);
        });
} else {
    console.error('❌ communityManager not available');
}

console.log('\n🔧 Manual fix complete');
```

## Quick Test: Force Load Badges

```javascript
// This will force-reload badges and show results
async function testBadges() {
    console.log('🧪 Testing badge counts...\n');

    if (!window.communityManager) {
        console.error('❌ communityManager not found');
        return;
    }

    try {
        // Load badges
        await window.communityManager.loadBadgeCounts();

        // Read values
        const results = {
            'All Count': document.getElementById('all-count')?.textContent,
            'Requests': document.getElementById('requests-badge')?.textContent,
            'Connections': document.getElementById('connections-badge')?.textContent
        };

        console.table(results);

        // Verify
        const allFilled = Object.values(results).every(v => v && v !== '');
        console.log(allFilled ? '✅ All badges have values' : '❌ Some badges are empty');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run test
testBadges();
```

## Check Console for Errors

Look for these specific errors:

### "CommunityManager is not defined"
- Script not loaded
- Check: `<script src="../js/page-structure/communityManager.js"></script>`

### "Cannot read property 'textContent' of null"
- Badge element ID mismatch
- Check HTML has: `id="all-count"`, `id="requests-badge"`, `id="connections-badge"`

### "Failed to fetch" or "NetworkError"
- Backend not running
- Start backend: `cd astegni-backend && python app.py`

### "401 Unauthorized"
- Not logged in or token expired
- Login again to get fresh token

### "CORS policy" error
- Frontend/backend URL mismatch
- Check both running on correct ports (8080/8000)

## Verify Script Load Order

In console, check:
```javascript
console.log('Load order check:');
console.log('1. CommunityManager:', typeof CommunityManager !== 'undefined');
console.log('2. window.communityManager:', typeof window.communityManager !== 'undefined');
console.log('3. switchCommunitySection:', typeof switchCommunitySection !== 'undefined');
console.log('4. filterCommunity:', typeof filterCommunity !== 'undefined');
```

All should be `true` for proper operation.

## Next Steps

Based on diagnostic results:

1. **If communityManager undefined**: Check script loading and init.js
2. **If badges empty**: Check initializeBadges() called
3. **If API fails**: Check backend running and authentication
4. **If badges stay "0"**: Check database has connections

Run the diagnostic script above and share the console output for specific help!
