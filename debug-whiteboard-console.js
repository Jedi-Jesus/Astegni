/**
 * COMPREHENSIVE WHITEBOARD DEBUG CONSOLE
 * Paste this in browser console to diagnose button responsiveness
 */

console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
console.log('%c🎨 WHITEBOARD MODAL DEBUG CONSOLE', 'color: #00ff00; font-size: 16px; font-weight: bold');
console.log('%c═══════════════════════════════════════════\n', 'color: #00ff00; font-weight: bold');

// ============================================================================
// STEP 1: CHECK MODAL EXISTENCE
// ============================================================================
console.log('%c1️⃣ MODAL EXISTENCE CHECK', 'color: #ffff00; font-weight: bold');
const modal = document.getElementById('whiteboardModal');
console.log('Modal element:', modal);
console.log('Modal visible:', modal ? (modal.classList.contains('active') || modal.style.display !== 'none') : false);
console.log('');

if (!modal) {
    console.error('❌ CRITICAL: Modal not found in DOM!');
    console.log('💡 Ensure modal-loader.js has loaded the modal');
}

// ============================================================================
// STEP 2: CHECK WHITEBOARD MANAGER
// ============================================================================
console.log('%c2️⃣ WHITEBOARD MANAGER CHECK', 'color: #ffff00; font-weight: bold');
if (typeof whiteboardManager === 'undefined') {
    console.error('❌ CRITICAL: whiteboardManager is not defined!');
    console.log('💡 Check if js/tutor-profile/whiteboard-manager.js is loaded');
} else {
    console.log('✅ whiteboardManager exists');
    console.log('   - Canvas:', whiteboardManager.canvas);
    console.log('   - Event listeners setup:', whiteboardManager._eventListenersSetup);
    console.log('   - Current session:', whiteboardManager.currentSession);
    console.log('   - User role:', whiteboardManager.userRole);
    console.log('   - Is host:', whiteboardManager.isSessionHost);
}
console.log('');

// ============================================================================
// STEP 3: CHECK ALL BUTTON IDS
// ============================================================================
console.log('%c3️⃣ BUTTON AVAILABILITY CHECK', 'color: #ffff00; font-weight: bold');

const criticalButtons = [
    // Header buttons
    'closeWhiteboard',
    'minimizeWhiteboard',
    'maximizeWhiteboard',
    'mobileToggleHistory',
    'rightSidebarToggle',
    'leftSidebarToggle',

    // Page navigation
    'prevPageBtn',
    'nextPageBtn',
    'addPageBtn',

    // Toolbar
    'undoBtn',
    'redoBtn',
    'clearBtn',
    'saveBtn',

    // Other controls
    'videoToggleBtn',
    'audioToggleBtn',
    'endCallBtn'
];

let missingButtons = [];
criticalButtons.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) {
        console.error(`   ❌ ${id}: NOT FOUND`);
        missingButtons.push(id);
    } else {
        const computed = window.getComputedStyle(btn);
        const issues = [];

        if (btn.disabled) issues.push('DISABLED');
        if (computed.pointerEvents === 'none') issues.push('pointer-events:none');
        if (computed.display === 'none') issues.push('display:none');
        if (computed.visibility === 'hidden') issues.push('visibility:hidden');

        if (issues.length > 0) {
            console.warn(`   ⚠️ ${id}: ${issues.join(', ')}`);
        } else {
            console.log(`   ✅ ${id}`);
        }
    }
});

if (missingButtons.length > 0) {
    console.error(`\n❌ Missing ${missingButtons.length} critical buttons!`);
}
console.log('');

// ============================================================================
// STEP 4: CHECK SIDEBAR ICON BUTTONS
// ============================================================================
console.log('%c4️⃣ SIDEBAR ICON BUTTONS', 'color: #ffff00; font-weight: bold');
const sidebarBtns = document.querySelectorAll('.sidebar-icon-btn');
console.log(`Found ${sidebarBtns.length} sidebar icon buttons`);
if (sidebarBtns.length === 0) {
    console.error('   ❌ No sidebar icon buttons found!');
} else {
    sidebarBtns.forEach((btn, index) => {
        const computed = window.getComputedStyle(btn);
        const issues = [];
        if (btn.disabled) issues.push('DISABLED');
        if (computed.pointerEvents === 'none') issues.push('no-pointer');
        console.log(`   ${issues.length > 0 ? '⚠️' : '✅'} Button ${index + 1}:`, btn.id || btn.className, issues.join(', '));
    });
}
console.log('');

// ============================================================================
// STEP 5: CHECK TOOLBAR BUTTONS
// ============================================================================
console.log('%c5️⃣ TOOLBAR BUTTONS', 'color: #ffff00; font-weight: bold');
const toolBtns = document.querySelectorAll('.tool-button');
console.log(`Found ${toolBtns.length} tool buttons`);
if (toolBtns.length === 0) {
    console.error('   ❌ No tool buttons found!');
} else {
    toolBtns.forEach((btn, index) => {
        const computed = window.getComputedStyle(btn);
        const issues = [];
        if (btn.disabled) issues.push('DISABLED');
        if (computed.pointerEvents === 'none') issues.push('no-pointer');
        console.log(`   ${issues.length > 0 ? '⚠️' : '✅'} Tool ${index + 1}:`, btn.id || btn.title, issues.join(', '));
    });
}
console.log('');

// ============================================================================
// STEP 6: CHECK MODAL CSS PROPERTIES
// ============================================================================
console.log('%c6️⃣ MODAL CSS PROPERTIES', 'color: #ffff00; font-weight: bold');
if (modal) {
    const modalStyle = window.getComputedStyle(modal);
    console.log('   display:', modalStyle.display);
    console.log('   visibility:', modalStyle.visibility);
    console.log('   opacity:', modalStyle.opacity);
    console.log('   z-index:', modalStyle.zIndex);
    console.log('   pointer-events:', modalStyle.pointerEvents);
    console.log('   position:', modalStyle.position);

    if (modalStyle.pointerEvents === 'none') {
        console.error('   ❌ CRITICAL: Modal has pointer-events: none!');
        console.log('   💡 This blocks ALL clicks inside the modal');
    }

    if (parseInt(modalStyle.zIndex) < 1000) {
        console.warn('   ⚠️ Low z-index may cause overlay issues');
    }
}
console.log('');

// ============================================================================
// STEP 7: CHECK FOR BLOCKING OVERLAYS
// ============================================================================
console.log('%c7️⃣ BLOCKING OVERLAYS CHECK', 'color: #ffff00; font-weight: bold');
const overlays = document.querySelectorAll('[class*="overlay"], [class*="backdrop"], [class*="modal"]');
console.log(`Found ${overlays.length} potential overlay elements`);

let blockingOverlays = [];
overlays.forEach((overlay, index) => {
    if (overlay === modal) return; // Skip the whiteboard modal itself

    const style = window.getComputedStyle(overlay);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0;

    if (isVisible) {
        const zIndex = parseInt(style.zIndex) || 0;
        const pointerEvents = style.pointerEvents;

        if (modal && zIndex > parseInt(window.getComputedStyle(modal).zIndex)) {
            console.warn(`   ⚠️ Overlay ${index + 1} (${overlay.className}): z-index ${zIndex} is ABOVE whiteboard modal!`);
            blockingOverlays.push(overlay);
        } else {
            console.log(`   ℹ️ Overlay ${index + 1} (${overlay.className}): z-index ${zIndex}, pointer-events: ${pointerEvents}`);
        }
    }
});

if (blockingOverlays.length > 0) {
    console.error(`   ❌ Found ${blockingOverlays.length} overlays potentially blocking the whiteboard modal!`);
}
console.log('');

// ============================================================================
// STEP 8: EVENT LISTENER TEST
// ============================================================================
console.log('%c8️⃣ EVENT LISTENER TEST', 'color: #ffff00; font-weight: bold');

// Test if clicking actually works
function testButtonClick(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) {
        console.error(`   ❌ Cannot test ${buttonId} - button not found`);
        return false;
    }

    console.log(`   Testing ${buttonId}...`);

    // Check if button has any event listeners (indirect detection)
    const hasOnClick = btn.onclick !== null;
    const hasEventListener = btn.getAttribute('onclick') !== null;

    console.log(`      - Has onclick attribute: ${hasEventListener}`);
    console.log(`      - Has onclick property: ${hasOnClick}`);

    // Try to click it
    try {
        btn.click();
        console.log(`      ✅ Click executed (check if action occurred)`);
        return true;
    } catch (e) {
        console.error(`      ❌ Click failed:`, e);
        return false;
    }
}

// Test close button
testButtonClick('closeWhiteboard');
console.log('');

// ============================================================================
// STEP 9: CHECK SCRIPTS LOADING
// ============================================================================
console.log('%c9️⃣ SCRIPT LOADING CHECK', 'color: #ffff00; font-weight: bold');
const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
const whiteboardScript = scripts.find(s => s.includes('whiteboard-manager'));
const modalLoaderScript = scripts.find(s => s.includes('modal-loader'));

if (whiteboardScript) {
    console.log('   ✅ whiteboard-manager.js loaded:', whiteboardScript);
} else {
    console.error('   ❌ whiteboard-manager.js NOT FOUND!');
}

if (modalLoaderScript) {
    console.log('   ✅ modal-loader.js loaded:', modalLoaderScript);
} else {
    console.warn('   ⚠️ modal-loader.js not found (might be inline or common-modal-loader.js)');
}
console.log('');

// ============================================================================
// STEP 10: CHECK CONSOLE ERRORS
// ============================================================================
console.log('%c🔟 CONSOLE ERROR CHECK', 'color: #ffff00; font-weight: bold');
console.log('   Check browser console for JavaScript errors above this debug output.');
console.log('   Look for errors related to:');
console.log('   - "Cannot read property of undefined"');
console.log('   - "xyz is not defined"');
console.log('   - "Failed to fetch"');
console.log('   - Network errors (403, 404, 500)');
console.log('');

// ============================================================================
// STEP 11: FIX ATTEMPT
// ============================================================================
console.log('%c1️⃣1️⃣ AUTOMATIC FIX ATTEMPT', 'color: #ffff00; font-weight: bold');

if (typeof whiteboardManager !== 'undefined') {
    console.log('   Attempting to re-setup event listeners...');

    // Force reset the flag
    whiteboardManager._eventListenersSetup = false;

    // Try to re-setup
    try {
        whiteboardManager.setupEventListeners();
        console.log('   ✅ Event listeners re-setup complete!');
        console.log('   💡 Try clicking buttons now - they should work!');
    } catch (e) {
        console.error('   ❌ Failed to re-setup event listeners:', e);
    }
} else {
    console.error('   ❌ Cannot fix - whiteboardManager not defined');
}
console.log('');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
console.log('%c📊 DEBUG SUMMARY', 'color: #00ff00; font-size: 16px; font-weight: bold');
console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-weight: bold');

const issues = [];

if (!modal) issues.push('❌ Modal not in DOM');
if (typeof whiteboardManager === 'undefined') issues.push('❌ whiteboardManager not defined');
if (modal && window.getComputedStyle(modal).pointerEvents === 'none') issues.push('❌ Modal has pointer-events: none');
if (missingButtons.length > 0) issues.push(`❌ ${missingButtons.length} buttons missing`);
if (blockingOverlays.length > 0) issues.push(`❌ ${blockingOverlays.length} overlays blocking modal`);
if (!whiteboardScript) issues.push('❌ whiteboard-manager.js not loaded');
if (typeof whiteboardManager !== 'undefined' && !whiteboardManager._eventListenersSetup) {
    issues.push('⚠️ Event listeners not set up');
}

if (issues.length === 0) {
    console.log('%c✅ NO OBVIOUS ISSUES FOUND', 'color: #00ff00; font-weight: bold');
    console.log('');
    console.log('Possible causes:');
    console.log('1. Event listeners attached to wrong elements');
    console.log('2. JavaScript error preventing listener attachment');
    console.log('3. Cached old JavaScript file (try hard refresh: Ctrl+Shift+R)');
    console.log('4. Wrong modal HTML version loaded');
} else {
    console.log('%c⚠️ ISSUES FOUND:', 'color: #ff0000; font-weight: bold');
    issues.forEach(issue => console.log('   ' + issue));
    console.log('');
    console.log('RECOMMENDED ACTIONS:');
    console.log('1. If "Event listeners not set up" - automatic fix was attempted above');
    console.log('2. If "Modal has pointer-events: none" - check CSS for .whiteboardModal or #whiteboardModal');
    console.log('3. If buttons missing - check modal HTML loaded correctly');
    console.log('4. If overlays blocking - close other modals or check z-index hierarchy');
    console.log('5. Try hard refresh (Ctrl+Shift+R) to clear cached JavaScript');
}

console.log('');
console.log('%c═══════════════════════════════════════════', 'color: #00ff00; font-weight: bold');
console.log('%cDEBUG COMPLETE - Check results above', 'color: #00ff00; font-weight: bold');
console.log('%c═══════════════════════════════════════════\n', 'color: #00ff00; font-weight: bold');

// ============================================================================
// MANUAL FIX COMMANDS
// ============================================================================
console.log('%c📝 MANUAL FIX COMMANDS (copy and run if needed):', 'color: #00ffff; font-weight: bold');
console.log('');
console.log('// Force re-setup event listeners:');
console.log('%cwhiteboardManager._eventListenersSetup = false; whiteboardManager.setupEventListeners();', 'background: #222; color: #0f0; padding: 5px;');
console.log('');
console.log('// Check if modal has pointer-events blocking:');
console.log('%cdocument.getElementById("whiteboardModal").style.pointerEvents', 'background: #222; color: #0f0; padding: 5px;');
console.log('');
console.log('// Force enable pointer-events:');
console.log('%cdocument.getElementById("whiteboardModal").style.pointerEvents = "auto";', 'background: #222; color: #0f0; padding: 5px;');
console.log('');
console.log('// Test specific button click:');
console.log('%cdocument.getElementById("closeWhiteboard").click();', 'background: #222; color: #0f0; padding: 5px;');
console.log('');
