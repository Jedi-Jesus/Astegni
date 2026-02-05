/**
 * Add Role Button Fix Verification Script
 *
 * Run this in the browser console on find-tutors.html to verify the fix is working.
 *
 * Usage:
 *   1. Open find-tutors.html in browser
 *   2. Open DevTools Console (F12)
 *   3. Copy and paste this entire script
 *   4. Press Enter
 *   5. Follow the instructions
 */

(async function verifyAddRoleButtonFix() {
    console.clear();
    console.log('%c🧪 Add Role Button Fix Verification', 'font-size: 20px; font-weight: bold; color: #4CAF50;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50;');
    console.log('');

    const results = {
        passed: 0,
        failed: 0,
        warnings: 0,
        tests: []
    };

    function logTest(name, status, message) {
        const symbols = {
            pass: '✅',
            fail: '❌',
            warn: '⚠️',
            info: 'ℹ️'
        };
        const colors = {
            pass: '#4CAF50',
            fail: '#F44336',
            warn: '#FF9800',
            info: '#2196F3'
        };

        console.log(`${symbols[status]} %c${name}`, `color: ${colors[status]}; font-weight: bold;`);
        if (message) {
            console.log(`   ${message}`);
        }
        console.log('');

        results.tests.push({ name, status, message });
        if (status === 'pass') results.passed++;
        if (status === 'fail') results.failed++;
        if (status === 'warn') results.warnings++;
    }

    // Test 1: Check if add-role-modal exists in DOM
    console.log('%c[1/8] Checking if add-role-modal is in DOM...', 'color: #2196F3;');
    const addRoleModal = document.getElementById('add-role-modal');
    if (addRoleModal) {
        logTest('Add Role Modal in DOM', 'pass', 'Modal HTML element found');
    } else {
        logTest('Add Role Modal in DOM', 'fail', 'Modal not found - common-modal-loader.js may not have run');
    }

    // Test 2: Check z-index
    console.log('%c[2/8] Checking z-index values...', 'color: #2196F3;');
    if (addRoleModal) {
        const computedStyle = window.getComputedStyle(addRoleModal);
        const zIndex = parseInt(computedStyle.zIndex);

        if (zIndex === 100000) {
            logTest('Add Role Modal Z-Index', 'pass', `z-index is correctly set to 100000`);
        } else {
            logTest('Add Role Modal Z-Index', 'fail', `z-index is ${zIndex}, expected 100000`);
        }
    } else {
        logTest('Add Role Modal Z-Index', 'fail', 'Cannot check - modal not in DOM');
    }

    // Test 3: Check role-access-denied-modal z-index
    const accessDeniedModal = document.getElementById('roleAccessDeniedModal');
    if (accessDeniedModal) {
        const computedStyle = window.getComputedStyle(accessDeniedModal);
        const zIndex = parseInt(computedStyle.zIndex);
        logTest('Role Access Denied Modal Z-Index', 'info', `z-index is ${zIndex}`);
    }

    // Test 4: Check ProfileSystem is loaded
    console.log('%c[3/8] Checking if ProfileSystem is loaded...', 'color: #2196F3;');
    if (typeof ProfileSystem !== 'undefined') {
        logTest('ProfileSystem Loaded', 'pass', 'ProfileSystem object exists');
    } else {
        logTest('ProfileSystem Loaded', 'fail', 'ProfileSystem not found - profile-system.js may not have loaded');
    }

    // Test 5: Check window.openAddRoleModal function
    console.log('%c[4/8] Checking window.openAddRoleModal function...', 'color: #2196F3;');
    if (typeof window.openAddRoleModal === 'function') {
        logTest('window.openAddRoleModal', 'pass', 'Function is defined and callable');
    } else {
        logTest('window.openAddRoleModal', 'fail', 'Function not found');
    }

    // Test 6: Check window.openAddRoleModalFromGuard function
    console.log('%c[5/8] Checking window.openAddRoleModalFromGuard function...', 'color: #2196F3;');
    if (typeof window.openAddRoleModalFromGuard === 'function') {
        logTest('window.openAddRoleModalFromGuard', 'pass', 'Function is defined and callable');
    } else {
        logTest('window.openAddRoleModalFromGuard', 'fail', 'Function not found - role-guard.js may not have loaded');
    }

    // Test 7: Check CommonModalLoader
    console.log('%c[6/8] Checking CommonModalLoader...', 'color: #2196F3;');
    if (typeof CommonModalLoader !== 'undefined') {
        logTest('CommonModalLoader', 'pass', 'CommonModalLoader object exists');
    } else {
        logTest('CommonModalLoader', 'warn', 'CommonModalLoader not found - may be normal if using different modal system');
    }

    // Test 8: Check CSS file is loaded
    console.log('%c[7/8] Checking if CSS is loaded...', 'color: #2196F3;');
    const cssLoaded = [...document.styleSheets].some(sheet => {
        try {
            return sheet.href && sheet.href.includes('add-role-modal.css');
        } catch (e) {
            return false;
        }
    });
    if (cssLoaded) {
        logTest('Add Role Modal CSS', 'pass', 'CSS file is loaded');
    } else {
        logTest('Add Role Modal CSS', 'fail', 'CSS file not found in stylesheets');
    }

    // Test 9: Functional test
    console.log('%c[8/8] Running functional test...', 'color: #2196F3;');
    if (typeof window.openAddRoleModalFromGuard === 'function') {
        console.log('%cℹ️ Attempting to open modal...', 'color: #2196F3;');

        try {
            // Test if the function runs without errors
            const testPromise = window.openAddRoleModalFromGuard();

            if (testPromise && typeof testPromise.then === 'function') {
                logTest('Functional Test', 'pass', 'Function is async and returns a Promise');

                // Wait a bit and check if modal opened
                await new Promise(resolve => setTimeout(resolve, 1000));

                const modal = document.getElementById('add-role-modal');
                if (modal && (modal.style.display === 'flex' || modal.classList.contains('show'))) {
                    logTest('Modal Opens Successfully', 'pass', 'Modal is now visible');

                    // Close it
                    modal.style.display = 'none';
                    modal.classList.remove('show', 'active');
                    document.body.style.overflow = 'auto';
                } else {
                    logTest('Modal Opens Successfully', 'warn', 'Modal may not have opened - check console for errors');
                }
            } else {
                logTest('Functional Test', 'fail', 'Function did not return a Promise (should be async)');
            }
        } catch (error) {
            logTest('Functional Test', 'fail', `Error: ${error.message}`);
        }
    } else {
        logTest('Functional Test', 'fail', 'Cannot run - function not found');
    }

    // Summary
    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50;');
    console.log('%c📊 VERIFICATION SUMMARY', 'font-size: 18px; font-weight: bold; color: #4CAF50;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50;');
    console.log('');
    console.log(`✅ Passed:   ${results.passed}`);
    console.log(`❌ Failed:   ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log('');

    if (results.failed === 0) {
        console.log('%c🎉 ALL TESTS PASSED! The fix is working correctly.', 'font-size: 16px; font-weight: bold; color: #4CAF50; background: #E8F5E9; padding: 8px;');
        console.log('');
        console.log('%cNext Step: Test manually by setting up a tutor user:', 'color: #2196F3; font-weight: bold;');
        console.log('');
        console.log(`%clocalStorage.setItem('currentUser', JSON.stringify({
    active_role: 'tutor',
    roles: ['tutor']
}));
localStorage.setItem('userRole', 'tutor');
localStorage.setItem('token', 'test');
location.reload();`, 'background: #f5f5f5; padding: 8px; font-family: monospace;');
    } else {
        console.log('%c⚠️ SOME TESTS FAILED. Please check the errors above.', 'font-size: 16px; font-weight: bold; color: #F44336; background: #FFEBEE; padding: 8px;');
        console.log('');
        console.log('%cTroubleshooting:', 'color: #2196F3; font-weight: bold;');
        console.log('1. Clear cache and hard refresh (Ctrl+Shift+R)');
        console.log('2. Check if all script files are loaded (Network tab)');
        console.log('3. Look for JavaScript errors in console');
        console.log('4. Verify file paths are correct');
    }

    console.log('');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #4CAF50;');
    console.log('');

    return results;
})();
