// ============================================
// DEBUG AND FIX - filterSchedulesByRole
// Copy and paste this entire code into browser console (F12)
// ============================================

console.clear();
console.log('🔍 Starting debug...');
console.log('==========================================');

// Step 1: Check if function exists
console.log('\n📌 Step 1: Check if function exists');
console.log('typeof window.filterSchedulesByRole:', typeof window.filterSchedulesByRole);
console.log('window.filterSchedulesByRole:', window.filterSchedulesByRole);

// Step 2: Check which scripts are loaded
console.log('\n📌 Step 2: Check loaded schedule scripts');
const scheduleScripts = Array.from(document.querySelectorAll('script[src*="schedule"]'));
console.log('Found schedule scripts:', scheduleScripts.length);
scheduleScripts.forEach(script => {
    console.log('  -', script.src);
});

// Step 3: Check all schedule-related functions
console.log('\n📌 Step 3: All schedule-related window functions');
const scheduleFunctions = Object.keys(window).filter(k =>
    k.toLowerCase().includes('schedule')
);
console.log('Found functions:', scheduleFunctions);
scheduleFunctions.forEach(fn => {
    console.log(`  - ${fn}: ${typeof window[fn]}`);
});

// Step 4: Apply the fix
console.log('\n📌 Step 4: Applying fix...');

// Remove old scripts
scheduleScripts.forEach(script => {
    console.log('Removing old script:', script.src);
    script.remove();
});

// Create and load new script with cache-busting
const newScript = document.createElement('script');
const timestamp = Date.now();
newScript.src = `../js/student-profile/schedule-manager.js?v=${timestamp}`;

newScript.onload = function() {
    console.log('\n✅ Script reloaded!');
    console.log('==========================================');

    // Test again
    console.log('\n📌 Testing after reload:');
    console.log('typeof window.filterSchedulesByRole:', typeof window.filterSchedulesByRole);

    if (typeof window.filterSchedulesByRole === 'function') {
        console.log('\n🎉 SUCCESS! Function is now available!');
        console.log('You can now click the filter buttons.');
        console.log('==========================================');

        // Show a visual alert
        const style = 'background: #4CAF50; color: white; padding: 10px; font-size: 16px; font-weight: bold;';
        console.log('%c ✅ FIX APPLIED SUCCESSFULLY! ', style);
    } else {
        console.log('\n❌ STILL NOT WORKING');
        console.log('Try these steps:');
        console.log('1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)');
        console.log('2. Close ALL tabs and restart browser');
        console.log('3. Clear browser cache: Ctrl+Shift+Delete');
        console.log('==========================================');
    }
};

newScript.onerror = function() {
    console.error('❌ Failed to load script!');
    console.log('Make sure you are on the student-profile.html page');
};

document.head.appendChild(newScript);
console.log('Loading script with timestamp:', timestamp);
console.log('==========================================');
