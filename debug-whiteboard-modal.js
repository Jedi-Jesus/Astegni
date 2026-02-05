/**
 * Whiteboard Modal Debug Script
 * Paste this into the browser console to diagnose why buttons aren't responding
 */

console.log('=== WHITEBOARD MODAL DEBUG ===\n');

// 1. Check if modal exists in DOM
const modal = document.getElementById('whiteboardModal');
console.log('1. Modal exists in DOM:', !!modal);
if (!modal) {
    console.error('❌ Modal not found! It may not be loaded yet.');
    console.log('💡 Try waiting for modals to load or check modal-loader.js');
} else {
    console.log('✅ Modal found:', modal);
}

// 2. Check if whiteboardManager exists
console.log('\n2. WhiteboardManager instance:', typeof whiteboardManager !== 'undefined' ? '✅ Exists' : '❌ Not found');
if (typeof whiteboardManager !== 'undefined') {
    console.log('   - Initialized:', whiteboardManager.canvas ? '✅ Yes' : '❌ No');
    console.log('   - Current session:', whiteboardManager.currentSession);
    console.log('   - User role:', whiteboardManager.userRole);
} else {
    console.error('❌ whiteboardManager is not defined!');
    console.log('💡 Check if js/tutor-profile/whiteboard-manager.js is loaded');
}

// 3. Check specific button IDs and if they have event listeners
const buttonIds = [
    'mobileToggleHistory',
    'rightSidebarToggle',
    'minimizeWhiteboard',
    'maximizeWhiteboard',
    'closeWhiteboard',
    'leftSidebarToggle',
    'prevPageBtn',
    'nextPageBtn',
    'addPageBtn',
    'undoBtn',
    'clearBtn',
    'saveBtn'
];

console.log('\n3. Button Availability:');
buttonIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
        console.log(`   ✅ ${id}:`, btn);
        // Check if button is disabled or has pointer-events: none
        const computed = window.getComputedStyle(btn);
        if (btn.disabled) {
            console.warn(`      ⚠️ Button is disabled!`);
        }
        if (computed.pointerEvents === 'none') {
            console.warn(`      ⚠️ pointer-events: none`);
        }
        if (computed.display === 'none' || computed.visibility === 'hidden') {
            console.warn(`      ⚠️ Button is hidden!`);
        }
    } else {
        console.error(`   ❌ ${id}: Not found`);
    }
});

// 4. Check sidebar icon buttons
console.log('\n4. Sidebar Icon Buttons:');
const sidebarBtns = document.querySelectorAll('.sidebar-icon-btn');
console.log(`   Found ${sidebarBtns.length} sidebar icon buttons`);
if (sidebarBtns.length > 0) {
    console.log('   First button:', sidebarBtns[0]);
} else {
    console.error('   ❌ No sidebar icon buttons found!');
}

// 5. Check toolbar buttons
console.log('\n5. Toolbar Buttons:');
const toolBtns = document.querySelectorAll('.tool-button');
console.log(`   Found ${toolBtns.length} tool buttons`);
if (toolBtns.length > 0) {
    console.log('   First button:', toolBtns[0]);
} else {
    console.error('   ❌ No tool buttons found!');
}

// 6. Check if modal is visible
if (modal) {
    const modalStyle = window.getComputedStyle(modal);
    console.log('\n6. Modal Visibility:');
    console.log('   - display:', modalStyle.display);
    console.log('   - visibility:', modalStyle.visibility);
    console.log('   - opacity:', modalStyle.opacity);
    console.log('   - z-index:', modalStyle.zIndex);
    console.log('   - pointer-events:', modalStyle.pointerEvents);

    if (modalStyle.pointerEvents === 'none') {
        console.error('   ❌ ISSUE FOUND: Modal has pointer-events: none!');
        console.log('   💡 This prevents all clicks from working');
    }
}

// 7. Check if there are overlays blocking clicks
console.log('\n7. Checking for Blocking Overlays:');
const allOverlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal-overlay"]');
console.log(`   Found ${allOverlays.length} potential overlay elements`);
allOverlays.forEach((overlay, index) => {
    const style = window.getComputedStyle(overlay);
    if (style.display !== 'none' && style.visibility !== 'hidden') {
        console.log(`   Overlay ${index + 1}:`, overlay);
        console.log(`      - z-index: ${style.zIndex}`);
        console.log(`      - pointer-events: ${style.pointerEvents}`);
        if (parseInt(style.zIndex) > 9000) {
            console.warn(`      ⚠️ High z-index might block whiteboard (z-index: ${style.zIndex})`);
        }
    }
});

// 8. Test click on a button
console.log('\n8. Testing Button Click:');
const testBtn = document.getElementById('closeWhiteboard');
if (testBtn) {
    console.log('   Attempting to click closeWhiteboard button...');
    try {
        testBtn.click();
        console.log('   ✅ Click executed (check if modal closed)');
    } catch (e) {
        console.error('   ❌ Click failed:', e);
    }
}

// 9. Check if scripts are loaded
console.log('\n9. Script Loading Check:');
const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
const whiteboardScript = scripts.find(s => s.includes('whiteboard-manager'));
if (whiteboardScript) {
    console.log('   ✅ whiteboard-manager.js loaded:', whiteboardScript);
} else {
    console.error('   ❌ whiteboard-manager.js not found in page scripts!');
}

// 10. Summary
console.log('\n=== DEBUG SUMMARY ===');
console.log('Issues Found:');
let issuesFound = false;

if (!modal) {
    console.error('- Modal not in DOM');
    issuesFound = true;
}
if (typeof whiteboardManager === 'undefined') {
    console.error('- WhiteboardManager not defined');
    issuesFound = true;
}
if (modal && window.getComputedStyle(modal).pointerEvents === 'none') {
    console.error('- Modal has pointer-events: none');
    issuesFound = true;
}
if (!whiteboardScript) {
    console.error('- whiteboard-manager.js not loaded');
    issuesFound = true;
}

if (!issuesFound) {
    console.log('✅ No obvious issues found. Check browser console for JavaScript errors.');
}

console.log('\n=== END DEBUG ===');
