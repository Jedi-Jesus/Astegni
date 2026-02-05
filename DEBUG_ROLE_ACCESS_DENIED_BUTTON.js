/**
 * Debug Script: Add Role Button from Role Access Denied Modal
 *
 * Run this in console to diagnose why the Add Role button doesn't work
 */

console.clear();
console.log('%c🔍 DEBUGGING ADD ROLE BUTTON', 'font-size: 20px; font-weight: bold; color: #f59e0b;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f59e0b;');
console.log('');

// Step 1: Check if window.openAddRoleModal exists
console.log('%c[Step 1] Checking window.openAddRoleModal', 'color: #3b82f6; font-weight: bold;');
console.log('  typeof window.openAddRoleModal:', typeof window.openAddRoleModal);
if (typeof window.openAddRoleModal === 'function') {
    console.log('  ✅ Function exists');
    console.log('  Function source:');
    console.log(window.openAddRoleModal.toString().substring(0, 200) + '...');
} else {
    console.log('  ❌ Function NOT FOUND - THIS IS THE PROBLEM!');
}
console.log('');

// Step 2: Check if window.openAddRoleModalFromGuard exists
console.log('%c[Step 2] Checking window.openAddRoleModalFromGuard', 'color: #3b82f6; font-weight: bold;');
console.log('  typeof window.openAddRoleModalFromGuard:', typeof window.openAddRoleModalFromGuard);
if (typeof window.openAddRoleModalFromGuard === 'function') {
    console.log('  ✅ Function exists');
} else {
    console.log('  ❌ Function NOT FOUND');
}
console.log('');

// Step 3: Check if add-role-modal exists in DOM
console.log('%c[Step 3] Checking if add-role-modal is in DOM', 'color: #3b82f6; font-weight: bold;');
const modal = document.getElementById('add-role-modal');
if (modal) {
    console.log('  ✅ Modal found in DOM');
    console.log('  Current display:', modal.style.display || window.getComputedStyle(modal).display);
    console.log('  Current classes:', modal.className);
} else {
    console.log('  ❌ Modal NOT in DOM');
}
console.log('');

// Step 4: Check if ProfileSystem exists
console.log('%c[Step 4] Checking ProfileSystem', 'color: #3b82f6; font-weight: bold;');
if (typeof ProfileSystem !== 'undefined') {
    console.log('  ✅ ProfileSystem exists');
    console.log('  typeof ProfileSystem.openAddRoleModal:', typeof ProfileSystem.openAddRoleModal);
} else {
    console.log('  ❌ ProfileSystem NOT loaded');
}
console.log('');

// Step 5: Check role-access-denied modal
console.log('%c[Step 5] Checking role-access-denied modal', 'color: #3b82f6; font-weight: bold;');
const accessDeniedModal = document.getElementById('roleAccessDeniedModal');
if (accessDeniedModal) {
    console.log('  ✅ Access denied modal found');
    const isVisible = !accessDeniedModal.classList.contains('hidden') && accessDeniedModal.style.display !== 'none';
    console.log('  Is visible:', isVisible);

    // Check if the Add Role button exists
    const addRoleButton = Array.from(accessDeniedModal.querySelectorAll('button'))
        .find(btn => btn.textContent.includes('Add Role'));

    if (addRoleButton) {
        console.log('  ✅ Add Role button found');
        console.log('  Button onclick:', addRoleButton.getAttribute('onclick'));
    } else {
        console.log('  ❌ Add Role button NOT found in modal');
    }
} else {
    console.log('  ❌ Access denied modal NOT in DOM');
}
console.log('');

// Step 6: Try to call the function manually
console.log('%c[Step 6] Testing manual function call', 'color: #3b82f6; font-weight: bold;');
console.log('  Try running: window.openAddRoleModalFromGuard()');
console.log('  Or: window.openAddRoleModal()');
console.log('');

// Step 7: Check script loading order
console.log('%c[Step 7] Checking loaded scripts', 'color: #3b82f6; font-weight: bold;');
const scripts = Array.from(document.scripts).map(s => s.src || 'inline').filter(s =>
    s.includes('role-guard') ||
    s.includes('profile-system') ||
    s.includes('common-modal-loader') ||
    s === 'inline'
);
console.log('  Relevant scripts loaded:', scripts.length);
scripts.forEach((s, i) => {
    console.log(`    ${i + 1}. ${s}`);
});
console.log('');

// Summary
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f59e0b;');
console.log('%c📊 SUMMARY', 'font-size: 18px; font-weight: bold; color: #f59e0b;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f59e0b;');
console.log('');

const checks = {
    'window.openAddRoleModal exists': typeof window.openAddRoleModal === 'function',
    'window.openAddRoleModalFromGuard exists': typeof window.openAddRoleModalFromGuard === 'function',
    'add-role-modal in DOM': !!modal,
    'ProfileSystem loaded': typeof ProfileSystem !== 'undefined',
    'role-access-denied modal in DOM': !!accessDeniedModal
};

Object.entries(checks).forEach(([check, passed]) => {
    const symbol = passed ? '✅' : '❌';
    const color = passed ? '#10b981' : '#ef4444';
    console.log(`  ${symbol} %c${check}`, `color: ${color}; font-weight: bold;`);
});

console.log('');

// Diagnosis
if (!checks['window.openAddRoleModal exists']) {
    console.log('%c🚨 ROOT CAUSE FOUND!', 'font-size: 16px; font-weight: bold; color: #ef4444; background: #fee2e2; padding: 8px;');
    console.log('');
    console.log('%cwindow.openAddRoleModal is not defined!', 'color: #ef4444; font-weight: bold;');
    console.log('');
    console.log('This happens because:');
    console.log('1. find-tutors.html defines: async function openAddRoleModal() {...}');
    console.log('2. But it should be: window.openAddRoleModal = async function() {...}');
    console.log('3. ProfileSystem loads later and sets window.openAddRoleModal');
    console.log('4. If ProfileSystem hasn\'t loaded yet, the function doesn\'t exist');
    console.log('');
    console.log('%cSOLUTION:', 'color: #10b981; font-weight: bold;');
    console.log('Update find-tutors.html line ~1419 to use window.openAddRoleModal');
} else if (!checks['add-role-modal in DOM']) {
    console.log('%c🚨 ROOT CAUSE FOUND!', 'font-size: 16px; font-weight: bold; color: #ef4444; background: #fee2e2; padding: 8px;');
    console.log('');
    console.log('%cThe add-role-modal is not in the DOM!', 'color: #ef4444; font-weight: bold;');
    console.log('');
    console.log('This means common-modal-loader.js hasn\'t run yet or failed to load the modal.');
    console.log('');
    console.log('%cSOLUTION:', 'color: #10b981; font-weight: bold;');
    console.log('Check Network tab for failed requests to add-role-modal.html');
} else {
    console.log('%c✅ ALL CHECKS PASSED!', 'font-size: 16px; font-weight: bold; color: #10b981; background: #d1fae5; padding: 8px;');
    console.log('');
    console.log('Try clicking the Add Role button now, or run:');
    console.log('%cwindow.openAddRoleModalFromGuard()', 'background: #f5f5f5; padding: 4px; font-family: monospace;');
}

console.log('');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #f59e0b;');
