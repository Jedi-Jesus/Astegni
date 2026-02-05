/**
 * COMPREHENSIVE SHARE PROFILE FIX VERIFICATION
 *
 * This script verifies that ALL conflicting shareProfile functions have been removed
 * and only the centralized share-profile-manager.js version is active.
 */

console.log('%c🔍 COMPREHENSIVE SHARE PROFILE FIX VERIFICATION', 'color: #3b82f6; font-size: 16px; font-weight: bold');
console.log('═'.repeat(80));

let allPassed = true;

// Step 1: Check if the function exists
console.log('\n✓ Step 1: Function exists?');
if (typeof window.shareProfile === 'function') {
    console.log('%c✅ PASS: window.shareProfile is a function', 'color: green');
} else {
    console.error('%c❌ FAIL: window.shareProfile is NOT a function', 'color: red');
    allPassed = false;
}

// Step 2: Check if it's async
console.log('\n✓ Step 2: Is it async?');
if (window.shareProfile.constructor.name === 'AsyncFunction') {
    console.log('%c✅ PASS: shareProfile is async', 'color: green');
} else {
    console.error('%c❌ FAIL: shareProfile is NOT async (wrong function!)', 'color: red');
    allPassed = false;
}

// Step 3: Check function signature
console.log('\n✓ Step 3: Function signature check');
const funcSource = window.shareProfile.toString();
console.log('Function source (first 500 chars):');
console.log(funcSource.substring(0, 500));

// Step 4: Check for key features of the CORRECT function
console.log('\n✓ Step 4: Key features present?');
const features = {
    'event parameter': /async\s+function\s+shareProfile\s*\(\s*event\s*\)/.test(funcSource),
    'stopPropagation': funcSource.includes('stopPropagation'),
    'ensureShareModalLoaded': funcSource.includes('ensureShareModalLoaded'),
    'loadReferralData': funcSource.includes('loadReferralData'),
    'token check': funcSource.includes('token'),
    'opens modal': funcSource.includes('shareProfileModal') || funcSource.includes('classList.add'),
};

Object.entries(features).forEach(([feature, present]) => {
    if (present) {
        console.log('%c✅ Has ' + feature, 'color: green');
    } else {
        console.error('%c❌ Missing ' + feature, 'color: red');
        allPassed = false;
    }
});

// Check it's NOT the old native share version
const isOldVersion = funcSource.includes('navigator.share') &&
                     funcSource.includes('Check out my') &&
                     !funcSource.includes('ensureShareModalLoaded');

if (!isOldVersion) {
    console.log('%c✅ NOT the old native share version', 'color: green');
} else {
    console.error('%c❌ STILL using old native share version!', 'color: red');
    allPassed = false;
}

// Step 5: Check modal HTML
console.log('\n✓ Step 5: Modal HTML check');
const modal = document.getElementById('shareProfileModal');
if (modal) {
    console.log('%c✅ Modal exists in DOM', 'color: green');
    console.log('   Current display:', window.getComputedStyle(modal).display);
} else {
    console.error('%c❌ Modal NOT found in DOM', 'color: red');
    allPassed = false;
}

// Step 6: Check script loading
console.log('\n✓ Step 6: Script loading check:');
const scripts = Array.from(document.querySelectorAll('script[src*="share-profile"]'));
console.log('Found ' + scripts.length + ' share-profile script(s):');
scripts.forEach(function(script, i) {
    console.log('  ' + (i + 1) + '. ' + script.src);
});

// Step 7: Check for conflicting scripts
console.log('\n✓ Step 7: Checking for conflicting script files:');
const potentialConflicts = [
    'navigationManager.js',
    'globalFunctionsManager.js',
    'page-structure-3.js'
];

const loadedScripts = Array.from(document.querySelectorAll('script[src]'));
potentialConflicts.forEach(function(scriptName) {
    const found = loadedScripts.find(function(s) { return s.src.includes(scriptName); });
    if (found) {
        const hasNewVersion = found.src.includes('v=20260204k') || found.src.includes('v=20260204');
        if (hasNewVersion) {
            console.log('%c✅ ' + scriptName + ' loaded with NEW version', 'color: green');
        } else {
            console.warn('%c⚠️  ' + scriptName + ' loaded but version may be old: ' + found.src, 'color: orange');
        }
    }
});

// Step 8: Check share-profile-manager loading
console.log('\n✓ Step 8: share-profile-manager.js loading check:');
const shareManagerScript = loadedScripts.find(function(s) { return s.src.includes('share-profile-manager.js'); });
if (shareManagerScript) {
    console.log('%c✅ share-profile-manager.js is loaded', 'color: green');
    console.log('   Source: ' + shareManagerScript.src);
    if (shareManagerScript.src.includes('v=20260204k')) {
        console.log('%c✅ Latest version (v=20260204k)', 'color: green');
    }
} else {
    console.error('%c❌ share-profile-manager.js NOT loaded!', 'color: red');
    allPassed = false;
}

// Final verdict
console.log('\n' + '═'.repeat(80));
if (allPassed) {
    console.log('%c✅ VERIFICATION PASSED!', 'color: green; font-size: 18px; font-weight: bold');
    console.log('%c🎉 The correct shareProfile function is loaded!', 'color: green; font-size: 14px');
    console.log('\n💡 You can now test by clicking the "Share Profile" button');
} else {
    console.error('%c❌ VERIFICATION FAILED!', 'color: red; font-size: 18px; font-weight: bold');
    console.error('%cThe WRONG shareProfile function is still loaded!', 'color: red; font-size: 14px');
    console.log('\n📋 Troubleshooting steps:');
    console.log('1. Clear browser cache completely (Ctrl+Shift+Delete)');
    console.log('2. Do a hard refresh (Ctrl+Shift+F5)');
    console.log('3. Check Network tab for v=20260204k on navigationManager.js');
    console.log('4. Try in incognito/private window');
    console.log('5. Check browser console for any script loading errors');
}
console.log('═'.repeat(80));

// Additional diagnostic info
console.log('\n📊 Diagnostic Info:');
console.log('- shareProfile constructor:', window.shareProfile.constructor.name);
console.log('- Function length:', funcSource.length, 'characters');
console.log('- Contains "ShareProfileManager":', funcSource.includes('ShareProfileManager'));
console.log('- Contains "referralCode":', funcSource.includes('referralCode'));
console.log('- Contains "copyReferralLink":', funcSource.includes('copyReferralLink'));
