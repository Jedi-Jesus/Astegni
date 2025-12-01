# Quick Debug: Badge Counts Not Showing

## Run This in Browser Console (F12)

Copy and paste each command ONE AT A TIME and share the results:

### Step 1: Basic Check
```javascript
console.clear();
console.log('=== BADGE DEBUG ===');
console.log('1. CommunityManager loaded?', typeof CommunityManager !== 'undefined');
console.log('2. communityManager instance?', typeof window.communityManager !== 'undefined');
console.log('3. Token exists?', !!localStorage.getItem('token'));
```

### Step 2: Check Badge Elements
```javascript
console.log('\n=== BADGE ELEMENTS ===');
console.log('all-count:', document.getElementById('all-count'));
console.log('requests-badge:', document.getElementById('requests-badge'));
console.log('connections-badge:', document.getElementById('connections-badge'));
console.log('\nValues:');
console.log('all-count value:', document.getElementById('all-count')?.textContent);
console.log('requests-badge value:', document.getElementById('requests-badge')?.textContent);
console.log('connections-badge value:', document.getElementById('connections-badge')?.textContent);
```

### Step 3: Manual Badge Initialization
```javascript
console.log('\n=== INITIALIZING BADGES ===');
['all-count', 'requests-badge', 'connections-badge'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = '0';
        console.log(`Set ${id} to "0"`);
    } else {
        console.error(`Element ${id} not found!`);
    }
});
```

### Step 4: Test API Call
```javascript
console.log('\n=== TESTING API ===');
const token = localStorage.getItem('token');
if (!token) {
    console.error('NO TOKEN - You must be logged in!');
} else {
    fetch('http://localhost:8000/api/connections/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        console.log('API Status:', res.status);
        return res.json();
    })
    .then(data => {
        console.log('API Data:', data);
    })
    .catch(err => {
        console.error('API Error:', err);
    });
}
```

### Step 5: Manually Load Badges
```javascript
console.log('\n=== LOADING BADGES ===');
if (window.communityManager) {
    window.communityManager.loadBadgeCounts()
        .then(() => {
            console.log('✅ Badges loaded!');
            console.log('Values now:');
            console.log('  all-count:', document.getElementById('all-count')?.textContent);
            console.log('  requests-badge:', document.getElementById('requests-badge')?.textContent);
            console.log('  connections-badge:', document.getElementById('connections-badge')?.textContent);
        })
        .catch(err => console.error('❌ Load failed:', err));
} else {
    console.error('❌ communityManager not found!');
}
```

## Most Common Issues

### Issue: "communityManager not found"
**Solution**: Refresh the page, check console logs during page load

### Issue: "NO TOKEN"
**Solution**: You need to login first!
1. Go to login page
2. Login with your credentials
3. Return to tutor profile page

### Issue: Badges show "0" but you have connections
**Solution**: Check if you actually have connections in database:
```javascript
fetch('http://localhost:8000/api/connections', {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(res => res.json())
.then(data => console.log('Your connections:', data.length, 'connections found'));
```

### Issue: API returns 401
**Solution**: Token expired, login again

### Issue: Network error
**Solution**: Make sure backend is running:
```bash
cd astegni-backend
python app.py
```

## Complete Test Function

Run this complete test:

```javascript
async function testEverything() {
    console.clear();
    console.log('🔍 COMPLETE BADGE TEST\n');

    // 1. Check setup
    console.log('📋 Setup Check:');
    console.log('  CommunityManager class:', typeof CommunityManager !== 'undefined' ? '✅' : '❌');
    console.log('  communityManager instance:', window.communityManager ? '✅' : '❌');
    console.log('  Token:', localStorage.getItem('token') ? '✅' : '❌ NO TOKEN!');

    // 2. Check elements
    console.log('\n📍 Element Check:');
    const ids = ['all-count', 'requests-badge', 'connections-badge'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        console.log(`  ${id}:`, el ? `✅ "${el.textContent}"` : '❌ NOT FOUND');
    });

    // 3. Initialize to zero
    console.log('\n🔢 Setting to "0":');
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '0';
            console.log(`  ${id}: ✅`);
        }
    });

    // 4. Test API
    console.log('\n🌐 Testing API:');
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('  ❌ Cannot test - no token (not logged in)');
        return;
    }

    try {
        const res = await fetch('http://localhost:8000/api/connections/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log('  Status:', res.status, res.ok ? '✅' : '❌');

        if (res.ok) {
            const data = await res.json();
            console.log('  Data:', data);
        } else {
            console.error('  Error:', await res.text());
        }
    } catch (err) {
        console.error('  ❌ Network error:', err.message);
        console.error('  Is backend running on http://localhost:8000?');
        return;
    }

    // 5. Load badges
    console.log('\n📊 Loading badges:');
    if (!window.communityManager) {
        console.error('  ❌ communityManager not available');
        return;
    }

    try {
        await window.communityManager.loadBadgeCounts();
        console.log('  ✅ Loaded successfully');

        console.log('\n✨ Final Values:');
        ids.forEach(id => {
            const el = document.getElementById(id);
            console.log(`  ${id}: "${el?.textContent}"`);
        });
    } catch (err) {
        console.error('  ❌ Load failed:', err);
    }

    console.log('\n🏁 Test Complete');
}

testEverything();
```

## What to Share

After running the test above, share:
1. The console output from `testEverything()`
2. Any errors (in red)
3. What the badges show in the UI

This will help identify the exact issue!
