/**
 * VERIFY SHARE PROFILE FIX
 * Run this in console to check if the correct function is loaded
 */

console.log('🔍 VERIFYING SHARE PROFILE FIX');
console.log('═'.repeat(80));

// 1. Check if function exists
console.log('\n✓ Step 1: Function exists?');
if (typeof window.shareProfile !== 'function') {
    console.error('❌ FAIL: window.shareProfile is not a function!');
    console.log('Type:', typeof window.shareProfile);
} else {
    console.log('✅ PASS: window.shareProfile is a function');
}

// 2. Check if it's async
console.log('\n✓ Step 2: Is it async?');
const isAsync = window.shareProfile.constructor.name === 'AsyncFunction';
if (!isAsync) {
    console.error('❌ FAIL: shareProfile is NOT async (wrong function!)');
    console.log('Constructor:', window.shareProfile.constructor.name);
} else {
    console.log('✅ PASS: shareProfile is async');
}

// 3. Check function signature
console.log('\n✓ Step 3: Function signature check');
const functionSource = window.shareProfile.toString();

// Show first 500 characters
console.log('Function source (first 500 chars):');
console.log(functionSource.substring(0, 500));

// 4. Check for key features
console.log('\n✓ Step 4: Key features present?');

const checks = {
    'Has event parameter': functionSource.includes('event'),
    'Has stopPropagation': functionSource.includes('stopPropagation'),
    'Has ensureShareModalLoaded': functionSource.includes('ensureShareModalLoaded'),
    'Has loadReferralData': functionSource.includes('loadReferralData'),
    'Checks for token': functionSource.includes('token'),
    'Opens modal': functionSource.includes('shareProfileModal'),
    'NOT native share only': !functionSource.includes('navigator.share') || functionSource.length > 300
};

let allPassed = true;
for (const [check, passed] of Object.entries(checks)) {
    if (passed) {
        console.log(`✅ ${check}`);
    } else {
        console.error(`❌ ${check}`);
        allPassed = false;
    }
}

// 5. Overall result
console.log('\n' + '═'.repeat(80));
if (allPassed && isAsync && typeof window.shareProfile === 'function') {
    console.log('🎉 ✅ ALL CHECKS PASSED!');
    console.log('The CORRECT shareProfile function is loaded!');
    console.log('You can now click "Share Profile" button - it should work!');
} else {
    console.error('❌ VERIFICATION FAILED!');
    console.error('The WRONG shareProfile function is still loaded!');
    console.error('');
    console.error('Possible issues:');
    console.error('1. Browser cache not cleared - Try Ctrl+Shift+Delete');
    console.error('2. Hard refresh not done - Try Ctrl+Shift+F5');
    console.error('3. Old version still loading - Check Network tab for v=20260204j');
    console.error('4. Try in incognito/private window');
}
console.log('═'.repeat(80));

// 6. Bonus: Check modal exists
console.log('\n✓ Bonus: Modal HTML check');
const modal = document.getElementById('shareProfileModal');
if (modal) {
    console.log('✅ Modal exists in DOM');
    console.log('   Current display:', modal.style.display);
} else {
    console.warn('⚠️ Modal not yet in DOM (will be loaded when needed)');
}

// 7. Show which script file is defining it
console.log('\n✓ Script loading check:');
const scripts = document.querySelectorAll('script[src*="share-profile"]');
console.log(`Found ${scripts.length} share-profile script(s):`);
scripts.forEach((script, i) => {
    console.log(`  ${i + 1}. ${script.src}`);
});

console.log('\n💡 TIP: If verification failed, hard refresh (Ctrl+Shift+F5) and run this script again\n');
