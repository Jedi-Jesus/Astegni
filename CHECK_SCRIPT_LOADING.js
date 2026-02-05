// ========================================
// PASTE THIS IN BROWSER CONSOLE
// To check if schedule-panel-manager.js is loading
// ========================================

console.log('%c=== SCRIPT LOADING DIAGNOSTICS ===', 'color: cyan; font-size: 18px; font-weight: bold');

// Check 1: Did the script log its load message?
console.log('\n%c[CHECK 1] Looking for load message in console', 'color: yellow; font-weight: bold');
console.log('Look above for: "✅ Schedule Panel Manager loaded successfully"');
console.log('If you see it, the script loaded. If not, the script failed to load.');

// Check 2: Check all script tags
console.log('\n%c[CHECK 2] Checking all script tags', 'color: yellow; font-weight: bold');
const scripts = Array.from(document.querySelectorAll('script[src]'));
const scheduleScript = scripts.find(s => s.src.includes('schedule-panel-manager'));
if (scheduleScript) {
    console.log('%c✅ Script tag exists:', 'color: lime', scheduleScript.src);
    console.log('   Loading state:', scheduleScript.readyState || 'complete');
} else {
    console.log('%c❌ Script tag NOT FOUND!', 'color: red');
}

// Check 3: Check if functions exist
console.log('\n%c[CHECK 3] Checking function availability', 'color: yellow; font-weight: bold');
const functions = [
    'loadSchedules',
    'filterSchedules',
    'filterSchedulesByRole',
    'searchSchedules',
    'sortSchedulesByColumn'
];

functions.forEach(fn => {
    const exists = typeof window[fn] === 'function';
    console.log(
        exists ? '%c✅' : '%c❌',
        exists ? 'color: lime' : 'color: red',
        fn + ':', typeof window[fn]
    );
});

// Check 4: Check variables
console.log('\n%c[CHECK 4] Checking variables', 'color: yellow; font-weight: bold');
console.log('allSchedules:', typeof window.allSchedules, window.allSchedules);
console.log('currentScheduleTab:', typeof window.currentScheduleTab, window.currentScheduleTab);

// Check 5: Network check
console.log('\n%c[CHECK 5] Network Check', 'color: yellow; font-weight: bold');
console.log('Open DevTools → Network tab');
console.log('Filter by "schedule-panel-manager"');
console.log('Check if the file loaded (status 200) or failed (status 404)');
console.log('Check the "Size" column - should be > 0 bytes');

// Check 6: Manual load test
console.log('\n%c[CHECK 6] Manual Load Test', 'color: yellow; font-weight: bold');
console.log('Run this command to manually load the script:');
console.log('%cconst s = document.createElement("script"); s.src = "../js/tutor-profile/schedule-panel-manager.js?v=" + Date.now(); document.head.appendChild(s);', 'color: cyan');

console.log('\n%c=== DIAGNOSIS ===', 'color: magenta; font-size: 16px; font-weight: bold');
if (typeof window.filterSchedulesByRole === 'function') {
    console.log('%c✅ Everything is working! The function exists.', 'color: lime; font-size: 14px; font-weight: bold');
} else {
    console.log('%c❌ Problem detected:', 'color: red; font-size: 14px; font-weight: bold');
    if (scheduleScript) {
        console.log('%c   Script tag exists but function is not defined', 'color: orange');
        console.log('%c   → The script may have a runtime error', 'color: orange');
        console.log('%c   → Check the console for error messages', 'color: orange');
    } else {
        console.log('%c   Script tag is missing from the HTML', 'color: orange');
        console.log('%c   → The script is not being loaded at all', 'color: orange');
    }
}
