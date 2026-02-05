/**
 * Safe Verification Script (no variable conflicts)
 * Paste this into browser console to verify the fix
 */

(function() {
    console.log('%c=== SHARE BUTTON FIX VERIFICATION ===', 'color: #4CAF50; font-size: 16px; font-weight: bold;');

    // Check 1: Modal Loaders
    console.log('\n%c1. Modal Loader Configuration:', 'color: #2196F3; font-weight: bold;');

    if (typeof ModalLoader !== 'undefined' && ModalLoader.getAvailableModals) {
        const modals = ModalLoader.getAvailableModals();
        const hasShareModal = modals.common.includes('share-profile-modal.html');
        console.log(`   ${hasShareModal ? '✓' : '✗'} share-profile-modal.html in ModalLoader`);
        if (!hasShareModal) {
            console.log('%c   → You need to clear cache! Old modal-loader.js is cached.', 'color: orange');
        }
    } else if (typeof CommonModalLoader !== 'undefined') {
        console.log('   ✓ CommonModalLoader is loaded');
    } else {
        console.log('   ✗ No modal loader found');
    }

    // Check 2: Modal in DOM
    console.log('\n%c2. Modal in DOM:', 'color: #2196F3; font-weight: bold;');
    const modalElement = document.getElementById('shareProfileModal');
    if (modalElement) {
        console.log('   ✓ shareProfileModal exists in DOM');
        console.log(`   Display: ${modalElement.style.display || 'default'}`);
        console.log(`   Visibility: ${modalElement.style.visibility || 'default'}`);
    } else {
        console.log('%c   ✗ shareProfileModal NOT in DOM', 'color: red');
        console.log('%c   → Modal loader may not have preloaded it yet, or cache needs clearing', 'color: orange');
    }

    // Check 3: Share Manager
    console.log('\n%c3. Share Profile Function:', 'color: #2196F3; font-weight: bold;');
    if (typeof shareProfile !== 'undefined') {
        console.log('   ✓ shareProfile() function exists');

        // Check if it's the correct function
        const funcCode = shareProfile.toString();
        const isNewFunction = funcCode.includes('ensureShareModalLoaded') ||
                              funcCode.includes('shareProfileModal') ||
                              funcCode.includes('currentReferralData');
        const isOldFunction = funcCode.includes('fallbackShare') &&
                             !funcCode.includes('ensureShareModalLoaded');

        if (isNewFunction) {
            console.log('%c   ✓ CORRECT function (from share-profile-manager.js)', 'color: green; font-weight: bold;');
        } else if (isOldFunction) {
            console.log('%c   ✗ WRONG function (old one from global-functions.js)', 'color: red; font-weight: bold;');
            console.log('%c   → CLEAR CACHE IMMEDIATELY!', 'color: red; font-weight: bold;');
        } else {
            console.log('   ⚠ Unknown function version');
        }
    } else {
        console.log('%c   ✗ shareProfile() function NOT found', 'color: red');
        console.log('%c   → Check if share-profile-manager.js is loaded', 'color: orange');
    }

    // Check 4: Script Tags
    console.log('\n%c4. Script Loading:', 'color: #2196F3; font-weight: bold;');
    const scriptElements = Array.from(document.querySelectorAll('script[src]'));
    const modalLoaderScript = scriptElements.find(s => s.src.includes('modal-loader.js'));
    const shareManagerScript = scriptElements.find(s => s.src.includes('share-profile-manager.js'));
    const globalFunctionsScript = scriptElements.find(s => s.src.includes('global-functions.js'));

    if (modalLoaderScript) {
        const version = modalLoaderScript.src.match(/v=([^&]+)/);
        const isUpdated = version && version[1] === '20260204g';
        console.log(`   ${isUpdated ? '✓' : '✗'} modal-loader.js version: ${version ? version[1] : 'no version'}`);
        if (!isUpdated) {
            console.log('%c   → CACHE ISSUE: Old version detected! Clear browser cache.', 'color: red; font-weight: bold;');
        }
    } else {
        console.log('   ℹ modal-loader.js not found (may use CommonModalLoader)');
    }

    if (globalFunctionsScript) {
        const version = globalFunctionsScript.src.match(/v=([^&]+)/);
        const versionStr = version ? version[1] : 'no version';
        const isUpdated = version && version[1] === '20260204h';
        console.log(`   ${isUpdated ? '✓' : '✗'} global-functions.js version: ${versionStr}`);
        if (!isUpdated && ['20251230', '20260129-role-fix', 'no version'].includes(versionStr)) {
            console.log('%c   → CRITICAL: Old global-functions.js cached! CLEAR CACHE NOW!', 'color: red; font-weight: bold;');
        }
    }

    if (shareManagerScript) {
        console.log('   ✓ share-profile-manager.js loaded');
    } else {
        console.log('%c   ✗ share-profile-manager.js NOT loaded', 'color: red');
    }

    // Check 5: Authentication
    console.log('\n%c5. Authentication:', 'color: #2196F3; font-weight: bold;');
    const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
    const tokenStr = localStorage.getItem('token');
    const activeRoleStr = localStorage.getItem('active_role') || localStorage.getItem('userRole');
    console.log(`   User: ${userStr ? '✓' : '✗'}`);
    console.log(`   Token: ${tokenStr ? '✓' : '✗'}`);
    console.log(`   Active Role: ${activeRoleStr || 'not set'}`);

    // Final verdict
    console.log('\n%c=== FINAL VERDICT ===', 'color: #4CAF50; font-size: 14px; font-weight: bold;');

    const funcCode = typeof shareProfile !== 'undefined' ? shareProfile.toString() : '';
    const hasCorrectFunction = funcCode.includes('ensureShareModalLoaded') ||
                               funcCode.includes('shareProfileModal');

    const allGood = (
        (typeof shareProfile !== 'undefined') &&
        hasCorrectFunction &&
        (modalElement !== null) &&
        (userStr !== null) &&
        (tokenStr !== null)
    );

    if (allGood) {
        console.log('%c   ✅ EVERYTHING IS PERFECT!', 'color: green; font-size: 16px; font-weight: bold;');
        console.log('%c   The share button should now open the correct modal.', 'color: green; font-weight: bold;');
        console.log('%c   Click the "Share Profile" button to test!', 'color: green');
    } else {
        console.log('%c   ❌ ISSUES DETECTED:', 'color: red; font-size: 16px; font-weight: bold;');

        if (typeof shareProfile === 'undefined') {
            console.log('%c   • shareProfile() function missing', 'color: red');
        } else if (!hasCorrectFunction) {
            console.log('%c   • WRONG shareProfile() function (old version)', 'color: red; font-weight: bold;');
        }

        if (!modalElement) {
            console.log('%c   • Modal not in DOM', 'color: red');
        }

        if (!userStr || !tokenStr) {
            console.log('%c   • Not authenticated - login first', 'color: red');
        }

        console.log('\n%c   🔧 ACTION REQUIRED:', 'color: orange; font-size: 14px; font-weight: bold;');
        console.log('%c   1. Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)', 'color: orange');
        console.log('%c   2. Select "Cached images and files"', 'color: orange');
        console.log('%c   3. Select "All time"', 'color: orange');
        console.log('%c   4. Click "Clear data"', 'color: orange');
        console.log('%c   5. Reload this page (Ctrl+Shift+R or Cmd+Shift+R)', 'color: orange');
        console.log('%c   6. Run this script again to verify', 'color: orange');
    }

    console.log('\n%c=================================', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
})();
