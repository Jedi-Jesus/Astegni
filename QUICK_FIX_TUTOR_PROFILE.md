# Quick Fix for Tutor Profile Call Modal

## The Issue
The debug tool shows files exist, but modal isn't loading on the actual tutor-profile page.

## Solution: Run This on Tutor Profile Page

### Step 1: Open Tutor Profile
1. Go to: `http://localhost:8081/profile-pages/tutor-profile.html`
2. **Make sure you're logged in**
3. Press **F12** to open DevTools
4. Go to **Console** tab

### Step 2: Paste This Diagnostic Script

```javascript
console.clear();
console.log('🔍 DIAGNOSING CALL MODAL ON TUTOR PROFILE\n');

// Check 1: Modal in DOM
const modal = document.getElementById('chatCallModal');
console.log('1. Modal in DOM:', modal ? '✅ YES' : '❌ NO');

// Check 2: Manager exists
console.log('2. Manager exists:', typeof StandaloneChatCallManager !== 'undefined' ? '✅ YES' : '❌ NO');

// Check 3: Script tag
const scripts = Array.from(document.querySelectorAll('script'));
const hasScript = scripts.some(s => s.src && s.src.includes('chat-call-modal.js'));
console.log('3. Script tag exists:', hasScript ? '✅ YES' : '❌ NO');

// Check 4: CSS link
const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
const hasCSS = links.some(l => l.href && l.href.includes('chat-call-modal.css'));
console.log('4. CSS link exists:', hasCSS ? '✅ YES' : '❌ NO');

// Check 5: Console logs
console.log('\n5. Looking for load messages...');
console.log('   (Check above for "✅ Standalone Chat Call Modal loaded")');

console.log('\n📋 NEXT STEPS:');
if (!modal) {
    console.log('❌ Modal not in DOM - Run FIX #1 below');
}
if (typeof StandaloneChatCallManager === 'undefined') {
    console.log('❌ Manager not loaded - Run FIX #2 below');
}
if (modal && typeof StandaloneChatCallManager !== 'undefined') {
    console.log('✅ Everything looks good! Run TEST CALL below');
}
```

### Step 3: Based on Results, Run the Appropriate Fix

---

## FIX #1: Force Load Modal HTML

If modal is NOT in DOM, paste this:

```javascript
console.log('🔧 Loading modal HTML...');

fetch('../modals/common-modals/chat-call-modal.html')
    .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
    })
    .then(html => {
        // Remove existing if any
        const existing = document.getElementById('chatCallModal');
        if (existing) existing.remove();

        // Insert modal
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('✅ Modal HTML loaded successfully!');
        console.log('✅ Modal element:', document.getElementById('chatCallModal'));

        // Now run test
        console.log('\n🧪 Testing modal...');
        setTimeout(() => {
            if (typeof StandaloneChatCallManager !== 'undefined') {
                StandaloneChatCallManager.handleIncomingCall({
                    call_id: 'test_' + Date.now(),
                    conversation_id: 'test',
                    caller_name: 'Test Call',
                    caller_role: 'Tutor',
                    caller_avatar: '/assets/default-avatar.png',
                    call_type: 'voice'
                });
                console.log('✅ Test call triggered - modal should appear!');
            } else {
                console.log('⚠️ Manager still not loaded. Wait 2 seconds and run FIX #2');
            }
        }, 500);
    })
    .catch(error => {
        console.error('❌ Failed to load modal:', error);
        console.log('🔍 Trying alternative path...');

        // Try absolute path
        fetch('/modals/common-modals/chat-call-modal.html')
            .then(r => r.text())
            .then(html => {
                document.body.insertAdjacentHTML('beforeend', html);
                console.log('✅ Modal loaded with absolute path!');
            })
            .catch(err => console.error('❌ Both paths failed:', err));
    });
```

---

## FIX #2: Reload JavaScript Manager

If manager is NOT loaded, paste this:

```javascript
console.log('🔧 Reloading JavaScript manager...');

// Create and load script
const script = document.createElement('script');
script.src = '../js/common-modals/chat-call-modal.js';
script.onload = function() {
    console.log('✅ JavaScript loaded!');
    console.log('✅ Manager:', typeof StandaloneChatCallManager !== 'undefined' ? 'EXISTS' : 'STILL MISSING');

    if (typeof StandaloneChatCallManager !== 'undefined') {
        console.log('✅ Initializing manager...');
        StandaloneChatCallManager.initialize();
        console.log('✅ Manager initialized!');
    }
};
script.onerror = function() {
    console.error('❌ Failed to load JavaScript');
    console.log('🔍 Trying absolute path...');

    const script2 = document.createElement('script');
    script2.src = '/js/common-modals/chat-call-modal.js';
    document.head.appendChild(script2);
};
document.head.appendChild(script);
```

---

## TEST CALL (After Fixes Applied)

Once both modal and manager are loaded, test with this:

```javascript
console.clear();
console.log('🧪 TESTING CALL MODAL\n');

// Final check
const modal = document.getElementById('chatCallModal');
const managerExists = typeof StandaloneChatCallManager !== 'undefined';

console.log('Modal in DOM:', modal ? '✅' : '❌');
console.log('Manager loaded:', managerExists ? '✅' : '❌');

if (!modal || !managerExists) {
    console.error('❌ Not ready yet! Run fixes above first.');
} else {
    console.log('\n📞 Triggering test call...\n');

    StandaloneChatCallManager.handleIncomingCall({
        call_id: 'test_' + Date.now(),
        conversation_id: 'test_conv_123',
        caller_name: 'John Doe (Test)',
        caller_role: 'Tutor',
        caller_avatar: '/assets/default-avatar.png',
        call_type: 'voice'
    });

    console.log('✅ Test call sent!');
    console.log('👀 Check if modal appeared on screen');
    console.log('');
    console.log('If modal appeared:');
    console.log('  - Click ACCEPT to test active call screen');
    console.log('  - Click DECLINE to close');
    console.log('');
    console.log('If modal did NOT appear:');
    console.log('  - Check if modal has "active" class:');
    console.log('   ', document.getElementById('chatCallModal')?.classList.contains('active'));
}
```

---

## Complete All-in-One Fix

If you just want to fix everything at once, paste this:

```javascript
(async function fixEverything() {
    console.clear();
    console.log('🔧 FIXING CALL MODAL - PLEASE WAIT...\n');

    // Step 1: Load CSS if missing
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const hasCSS = links.some(l => l.href && l.href.includes('chat-call-modal.css'));

    if (!hasCSS) {
        console.log('📝 Loading CSS...');
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '../css/common-modals/chat-call-modal.css';
        document.head.appendChild(link);
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('✅ CSS loaded');
    } else {
        console.log('✅ CSS already loaded');
    }

    // Step 2: Load JavaScript if missing
    if (typeof StandaloneChatCallManager === 'undefined') {
        console.log('📝 Loading JavaScript...');
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '../js/common-modals/chat-call-modal.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        }).catch(() => {
            console.log('⚠️ Trying absolute path...');
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = '/js/common-modals/chat-call-modal.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        });
        console.log('✅ JavaScript loaded');
        await new Promise(resolve => setTimeout(resolve, 200));
    } else {
        console.log('✅ JavaScript already loaded');
    }

    // Step 3: Load HTML
    console.log('📝 Loading modal HTML...');
    const existing = document.getElementById('chatCallModal');
    if (existing) {
        console.log('⚠️ Removing existing modal...');
        existing.remove();
    }

    try {
        const response = await fetch('../modals/common-modals/chat-call-modal.html');
        if (!response.ok) throw new Error('Not found');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('✅ Modal HTML loaded');
    } catch (error) {
        console.log('⚠️ Trying absolute path...');
        const response = await fetch('/modals/common-modals/chat-call-modal.html');
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        console.log('✅ Modal HTML loaded (absolute path)');
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Initialize manager
    if (typeof StandaloneChatCallManager !== 'undefined') {
        console.log('📝 Initializing manager...');
        StandaloneChatCallManager.initialize();
        console.log('✅ Manager initialized');
    }

    // Step 5: Final check
    console.log('\n✅ SETUP COMPLETE!\n');
    console.log('Final status:');
    console.log('  Modal:', document.getElementById('chatCallModal') ? '✅' : '❌');
    console.log('  Manager:', typeof StandaloneChatCallManager !== 'undefined' ? '✅' : '❌');

    // Step 6: Auto-test
    console.log('\n🧪 Auto-testing in 1 second...\n');
    setTimeout(() => {
        if (typeof StandaloneChatCallManager !== 'undefined') {
            StandaloneChatCallManager.handleIncomingCall({
                call_id: 'auto_test_' + Date.now(),
                conversation_id: 'test',
                caller_name: 'Auto Test Call',
                caller_role: 'Tutor',
                caller_avatar: '/assets/default-avatar.png',
                call_type: 'voice'
            });
            console.log('✅ TEST CALL TRIGGERED!');
            console.log('👀 Modal should appear now!');
        }
    }, 1000);

})().catch(error => {
    console.error('❌ Fix failed:', error);
    console.log('\n📋 Manual steps:');
    console.log('1. Clear cache: Ctrl+Shift+R');
    console.log('2. Check file paths are correct');
    console.log('3. Verify files exist in filesystem');
});
```

---

## What This Does:

1. ✅ Checks if CSS is loaded, loads if missing
2. ✅ Checks if JavaScript is loaded, loads if missing
3. ✅ Loads modal HTML
4. ✅ Initializes the manager
5. ✅ Auto-tests with a call after 1 second

## Expected Result:

After running the all-in-one fix, you should see:
```
✅ SETUP COMPLETE!
✅ Modal: ✅
✅ Manager: ✅
🧪 Auto-testing in 1 second...
✅ TEST CALL TRIGGERED!
👀 Modal should appear now!
```

Then the modal should pop up on your screen!

---

## Still Not Working?

If the all-in-one fix doesn't work:

1. **Clear browser cache**: `Ctrl + Shift + R`
2. **Check console for errors**: Look for red errors
3. **Verify you're logged in**: Modal needs authentication
4. **Check file paths**: Make sure files exist at the paths shown

Let me know what happens!
