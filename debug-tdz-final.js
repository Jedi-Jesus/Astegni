// Paste this entire block into DevTools console on tutor-profile.html
// =====================================================================

(function debugTDZ() {
    console.group('=== TDZ Debug ===');

    // 1. How many times is global-functions.js in the DOM?
    const gfScripts = Array.from(document.querySelectorAll('script[src]'))
        .filter(s => s.src.includes('global-functions'));
    console.log('1. global-functions.js script tags:', gfScripts.length);
    gfScripts.forEach((s, i) => console.log('   ', i, s.src));

    // 2. Is the variable accessible at all?
    try {
        const val = eval('typeof currentTutorRequestType');
        console.log('2. typeof currentTutorRequestType:', val);
    } catch(e) {
        console.error('2. eval threw:', e.message);
    }

    // 3. Try accessing it directly (will throw TDZ if in TDZ)
    try {
        const val = eval('currentTutorRequestType');
        console.log('3. currentTutorRequestType value:', val);
    } catch(e) {
        console.error('3. CONFIRMED TDZ:', e.message);
    }

    // 4. Is filterTutorRequestType the same reference as window version?
    const winFn = window.filterTutorRequestType;
    console.log('4. window.filterTutorRequestType type:', typeof winFn);

    // 5. Check all top-level scripts loaded
    const allScripts = Array.from(document.querySelectorAll('script[src]'))
        .map(s => s.src.replace(window.location.origin, ''));
    console.log('5. All scripts (' + allScripts.length + '):', allScripts);

    // 6. Check for any error events captured
    console.log('6. Captured early errors:', window.__earlyErrors || '(not monitoring - reload with snippet below)');

    // 7. Attempt to call filterTutorRequestType and catch exact error
    try {
        filterTutorRequestType('courses');
        console.log('7. filterTutorRequestType call SUCCEEDED');
    } catch(e) {
        console.error('7. filterTutorRequestType threw:', e.message);
        console.error('   Stack:', e.stack);
    }

    console.groupEnd();
})();
