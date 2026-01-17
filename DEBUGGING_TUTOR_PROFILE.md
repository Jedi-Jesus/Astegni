# Debugging Call Modal on Tutor Profile

## Quick Debug Steps

### Step 1: Open Tutor Profile
1. Start your dev server: `python dev-server.py` (port 8081)
2. Start backend: `cd astegni-backend && python app.py` (port 8000)
3. Open browser: `http://localhost:8081/profile-pages/tutor-profile.html`
4. **Log in first** (call modal needs authentication)

### Step 2: Open Browser DevTools
- Press **F12** or **Ctrl+Shift+I**
- Go to **Console** tab

### Step 3: Check for These Messages
Look for these console messages (they should appear automatically):

✅ **Expected (Good):**
```
✅ Chat Modal HTML loaded for tutor-profile
✅ ChatModalManager initialized for tutor-profile
✅ Standalone Chat Call Modal loaded for tutor-profile
[StandaloneChatCall] Initializing...
[StandaloneChatCall] Setting up WebSocket listeners
```

❌ **If you see errors:**
```
Failed to load chat-call-modal: ...
```

---

## Step 4: Run Quick Tests in Console

### Test 1: Check if Modal HTML Loaded
Paste this in console:
```javascript
console.log(document.getElementById('chatCallModal'));
```

**Expected:** Should show `<div id="chatCallModal" ...>`
**If `null`:** Modal HTML didn't load. See Fix #1 below.

---

### Test 2: Check if Manager Exists
```javascript
console.log(StandaloneChatCallManager);
```

**Expected:** Should show `StandaloneChatCallManagerClass {currentCall: null, ...}`
**If `undefined`:** JavaScript didn't load. See Fix #2 below.

---

### Test 3: Check if CSS Loaded
```javascript
const modal = document.getElementById('chatCallModal');
console.log(modal ? window.getComputedStyle(modal).display : 'Modal not found');
```

**Expected:** Should show `none` (modal is hidden by default)
**If different:** CSS might not have loaded.

---

### Test 4: Trigger Test Call
```javascript
StandaloneChatCallManager.handleIncomingCall({
    call_id: 'debug_' + Date.now(),
    conversation_id: 'test_123',
    caller_name: 'Debug Test',
    caller_role: 'Tutor',
    caller_avatar: '/assets/default-avatar.png',
    call_type: 'voice'
});
```

**Expected:** Modal should pop up with incoming call screen
**If nothing happens:** See debugging steps below.

---

## Common Issues & Fixes

### Fix #1: Modal HTML Not Loading

**Check the path:**
```javascript
fetch('../modals/common-modals/chat-call-modal.html')
    .then(r => r.ok ? console.log('✅ HTML file accessible') : console.error('❌ File not found:', r.status))
    .catch(e => console.error('❌ Fetch failed:', e));
```

**If 404 error:**
- File path might be wrong for tutor-profile (it's in `/profile-pages/`)
- Path should be `../modals/common-modals/chat-call-modal.html` (correct)
- Verify file exists: Check if `modals/common-modals/chat-call-modal.html` exists

**Force load manually:**
```javascript
fetch('../modals/common-modals/chat-call-modal.html')
    .then(response => response.text())
    .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('✅ Modal loaded manually');
    });
```

---

### Fix #2: JavaScript Manager Not Loading

**Check if script tag exists:**
```javascript
const scripts = Array.from(document.querySelectorAll('script'));
const callModalScript = scripts.find(s => s.src.includes('chat-call-modal.js'));
console.log(callModalScript ? '✅ Script tag exists' : '❌ Script tag missing');
```

**If missing:** The integration didn't save properly. Let me know and I'll re-add it.

**Check if file loads:**
```javascript
fetch('../js/common-modals/chat-call-modal.js')
    .then(r => r.ok ? console.log('✅ JS file accessible') : console.error('❌ JS not found:', r.status))
    .catch(e => console.error('❌ Fetch failed:', e));
```

---

### Fix #3: CSS Not Loading

**Check if CSS link exists:**
```javascript
const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
const callModalCSS = links.find(l => l.href.includes('chat-call-modal.css'));
console.log(callModalCSS ? '✅ CSS link exists' : '❌ CSS link missing');
```

**Force load CSS manually:**
```javascript
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = '../css/common-modals/chat-call-modal.css';
document.head.appendChild(link);
console.log('✅ CSS loaded manually');
```

---

### Fix #4: Modal Shows But Buttons Don't Work

**Check onclick handlers:**
```javascript
const acceptBtn = document.querySelector('.accept-btn');
console.log('Accept button:', acceptBtn);
console.log('onclick:', acceptBtn?.getAttribute('onclick'));
```

**Test button manually:**
```javascript
// Get the button
const acceptBtn = document.querySelector('.accept-btn');

// Test if StandaloneChatCallManager.acceptIncomingCall exists
if (typeof StandaloneChatCallManager !== 'undefined' &&
    typeof StandaloneChatCallManager.acceptIncomingCall === 'function') {
    console.log('✅ Accept function exists');
} else {
    console.error('❌ Accept function missing');
}
```

---

## Complete Diagnostic Script

Run this all-in-one diagnostic in console:

```javascript
console.clear();
console.log('=== CALL MODAL DIAGNOSTIC ===\n');

// 1. Check HTML
const modal = document.getElementById('chatCallModal');
console.log('1. Modal HTML:', modal ? '✅ Loaded' : '❌ NOT FOUND');

// 2. Check Manager
console.log('2. Manager:', typeof StandaloneChatCallManager !== 'undefined' ? '✅ Exists' : '❌ NOT FOUND');

// 3. Check CSS
if (modal) {
    const display = window.getComputedStyle(modal).display;
    console.log('3. CSS:', display === 'none' ? '✅ Loaded (display: none)' : '⚠️ Unexpected: ' + display);
}

// 4. Check WebSocket
console.log('4. WebSocket:', window.chatWebSocket ?
    (window.chatWebSocket.readyState === 1 ? '✅ Connected' : '⚠️ State: ' + window.chatWebSocket.readyState) :
    '❌ NOT FOUND');

// 5. Check files
Promise.all([
    fetch('../modals/common-modals/chat-call-modal.html').then(r => ({file: 'HTML', ok: r.ok})),
    fetch('../js/common-modals/chat-call-modal.js').then(r => ({file: 'JS', ok: r.ok})),
    fetch('../css/common-modals/chat-call-modal.css').then(r => ({file: 'CSS', ok: r.ok}))
]).then(results => {
    console.log('5. Files:');
    results.forEach(r => console.log(`   ${r.file}: ${r.ok ? '✅' : '❌'}`));
});

console.log('\n=== END DIAGNOSTIC ===');
console.log('\nTo test call, run:');
console.log('StandaloneChatCallManager.handleIncomingCall({call_id:"test",conversation_id:"test",caller_name:"Test",caller_role:"Tutor",caller_avatar:"/assets/default-avatar.png",call_type:"voice"});');
```

---

## Using the Debug Tool

I've created a dedicated debug tool for you:

1. Open: `http://localhost:8081/DEBUG_CALL_MODAL.html`
2. Click each button in order:
   - **Run System Check** - Checks browser capabilities
   - **Check Required Files** - Verifies files exist
   - **Check Modal in DOM** - Checks if HTML loaded
   - **Check Manager** - Verifies JavaScript loaded
   - **Check WebSocket** - Tests connection
   - **Test Voice Call** / **Test Video Call** - Triggers test calls

3. If something is red (❌), use the **Quick Fixes** section at the bottom

---

## Still Not Working?

If modal still doesn't appear after all checks:

### Nuclear Option - Force Everything
```javascript
// 1. Remove old modal if exists
document.getElementById('chatCallModal')?.remove();

// 2. Force load HTML
fetch('../modals/common-modals/chat-call-modal.html')
    .then(r => r.text())
    .then(html => {
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('✅ HTML loaded');

        // 3. Test immediately
        setTimeout(() => {
            StandaloneChatCallManager.handleIncomingCall({
                call_id: 'force_test',
                conversation_id: 'test',
                caller_name: 'Force Test',
                caller_role: 'Tutor',
                caller_avatar: '/assets/default-avatar.png',
                call_type: 'voice'
            });
        }, 500);
    });
```

---

## Report Back

After running diagnostics, report which step failed:
- ✅ or ❌ for each test
- Any error messages from console
- Screenshot of browser DevTools Console tab

This will help me identify the exact issue!
