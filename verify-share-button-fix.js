/**
 * Quick Verification Script
 * Paste this into browser console to verify the fix
 */

console.log('%c=== SHARE BUTTON FIX VERIFICATION ===', 'color: #4CAF50; font-size: 16px; font-weight: bold;');

// Check 1: Modal Loaders
console.log('\n%c1. Modal Loader Configuration:', 'color: #2196F3; font-weight: bold;');

if (typeof ModalLoader !== 'undefined' && ModalLoader.getAvailableModals) {
    const modals = ModalLoader.getAvailableModals();
    const hasShareModal = modals.common.includes('share-profile-modal.html');
    console.log(`   ${hasShareModal ? '✓' : '✗'} share-profile-modal.html in ModalLoader`,
                hasShareModal ? 'color: green' : 'color: red');
    if (!hasShareModal) {
        console.log('%c   → You need to clear cache! Old modal-loader.js is cached.', 'color: orange');
    }
} else if (typeof CommonModalLoader !== 'undefined') {
    console.log('   ✓ CommonModalLoader is loaded', 'color: green');
} else {
    console.log('   ✗ No modal loader found', 'color: red');
}

// Check 2: Modal in DOM
console.log('\n%c2. Modal in DOM:', 'color: #2196F3; font-weight: bold;');
const modal = document.getElementById('shareProfileModal');
if (modal) {
    console.log('   ✓ shareProfileModal exists in DOM');
    console.log(`   Display: ${modal.style.display || 'default'}`);
    console.log(`   Visibility: ${modal.style.visibility || 'default'}`);
} else {
    console.log('%c   ✗ shareProfileModal NOT in DOM', 'color: red');
    console.log('%c   → Modal loader may not have preloaded it yet, or cache needs clearing', 'color: orange');
}

// Check 3: Share Manager
console.log('\n%c3. Share Profile Manager:', 'color: #2196F3; font-weight: bold;');
if (typeof shareProfile !== 'undefined') {
    console.log('   ✓ shareProfile() function exists');
} else {
    console.log('%c   ✗ shareProfile() function NOT found', 'color: red');
    console.log('%c   → Check if share-profile-manager.js is loaded', 'color: orange');
}

// Check 4: Script Tags
console.log('\n%c4. Script Loading:', 'color: #2196F3; font-weight: bold;');
const scripts = Array.from(document.querySelectorAll('script[src]'));
const modalLoaderScript = scripts.find(s => s.src.includes('modal-loader.js'));
const shareManagerScript = scripts.find(s => s.src.includes('share-profile-manager.js'));

if (modalLoaderScript) {
    const version = modalLoaderScript.src.match(/v=([^&]+)/);
    const isUpdated = version && version[1] === '20260204g';
    console.log(`   ${isUpdated ? '✓' : '✗'} modal-loader.js version: ${version ? version[1] : 'no version'}`);
    if (!isUpdated) {
        console.log('%c   → CACHE ISSUE: Old version detected! Clear browser cache.', 'color: orange');
    }
} else {
    console.log('   ℹ modal-loader.js not found (may use CommonModalLoader)');
}

if (shareManagerScript) {
    console.log('   ✓ share-profile-manager.js loaded');
} else {
    console.log('%c   ✗ share-profile-manager.js NOT loaded', 'color: red');
}

// Check 5: Authentication
console.log('\n%c5. Authentication:', 'color: #2196F3; font-weight: bold;');
const user = localStorage.getItem('currentUser') || localStorage.getItem('user');
const token = localStorage.getItem('token');
const activeRole = localStorage.getItem('active_role') || localStorage.getItem('userRole');
console.log(`   User: ${user ? '✓' : '✗'}`);
console.log(`   Token: ${token ? '✓' : '✗'}`);
console.log(`   Active Role: ${activeRole || 'not set'}`);

// Final verdict
console.log('\n%c=== FINAL VERDICT ===', 'color: #4CAF50; font-size: 14px; font-weight: bold;');

const allGood = (
    (typeof shareProfile !== 'undefined') &&
    (modal !== null) &&
    (user !== null) &&
    (token !== null)
);

if (allGood) {
    console.log('%c   ✓ Everything looks good! Share button should work.', 'color: green; font-weight: bold;');
    console.log('%c   Try clicking the Share Profile button now.', 'color: green');
} else {
    console.log('%c   ✗ Issues detected:', 'color: red; font-weight: bold;');

    if (typeof shareProfile === 'undefined') {
        console.log('%c   • shareProfile() function missing', 'color: red');
    }
    if (!modal) {
        console.log('%c   • Modal not in DOM - CLEAR CACHE and reload', 'color: red');
    }
    if (!user || !token) {
        console.log('%c   • Not authenticated - login first', 'color: red');
    }

    console.log('\n%c   ACTION REQUIRED:', 'color: orange; font-weight: bold;');
    console.log('%c   1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)', 'color: orange');
    console.log('%c   2. Clear "Cached images and files" for "All time"', 'color: orange');
    console.log('%c   3. Reload this page', 'color: orange');
    console.log('%c   4. Run this script again', 'color: orange');
}

console.log('\n%c=================================', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
