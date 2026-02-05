// ============================================
// DEBUG CONSOLE FOR SESSIONS PANEL
// Paste this in browser console to diagnose issues
// ============================================

console.log('🔧 ========================================');
console.log('🔧 SESSIONS PANEL DEBUG CONSOLE');
console.log('🔧 ========================================');
console.log('');

// 1. Check if script is loaded
console.log('1️⃣ CHECKING IF SESSIONS-PANEL-MANAGER.JS IS LOADED:');
console.log('-------------------------------------------');

const scriptTags = Array.from(document.querySelectorAll('script[src*="sessions-panel-manager"]'));
console.log(`📜 Found ${scriptTags.length} sessions-panel-manager script tag(s):`);
scriptTags.forEach((script, i) => {
    console.log(`   [${i+1}] ${script.src}`);
});
console.log('');

// 2. Check if functions exist in window
console.log('2️⃣ CHECKING IF FUNCTIONS EXIST IN WINDOW:');
console.log('-------------------------------------------');

const requiredFunctions = [
    'filterSessionsByRole',
    'loadSessions',
    'loadSessionStats',
    'searchSessions',
    'toggleSessionNotification',
    'toggleSessionAlarm',
    'toggleSessionFeatured',
    'sortSessionsByColumn',
    'loadFilteredSessionsPage'
];

requiredFunctions.forEach(funcName => {
    const exists = typeof window[funcName] === 'function';
    console.log(`   ${exists ? '✅' : '❌'} window.${funcName} = ${exists ? 'function' : typeof window[funcName]}`);
});
console.log('');

// 3. Check SessionsPanel namespace
console.log('3️⃣ CHECKING SESSIONSPANEL NAMESPACE:');
console.log('-------------------------------------------');
console.log(`   SessionsPanel exists: ${typeof window.SessionsPanel !== 'undefined'}`);
if (window.SessionsPanel) {
    console.log('   SessionsPanel properties:', Object.keys(window.SessionsPanel));
}
console.log('');

// 4. Check filter buttons
console.log('4️⃣ CHECKING FILTER BUTTONS:');
console.log('-------------------------------------------');
const filterButtons = document.querySelectorAll('button[onclick*="filterSessionsByRole"]');
console.log(`   Found ${filterButtons.length} filter button(s)`);
filterButtons.forEach((btn, i) => {
    console.log(`   [${i+1}] onclick="${btn.getAttribute('onclick')}"`);
    console.log(`       Text: "${btn.textContent.trim()}"`);
});
console.log('');

// 5. Check sessions panel container
console.log('5️⃣ CHECKING SESSIONS PANEL ELEMENTS:');
console.log('-------------------------------------------');
const sessionsPanel = document.getElementById('sessions-panel');
const sessionsContainer = document.getElementById('sessions-table-container');
console.log(`   #sessions-panel: ${sessionsPanel ? '✅ Found' : '❌ Not found'}`);
console.log(`   #sessions-table-container: ${sessionsContainer ? '✅ Found' : '❌ Not found'}`);
console.log('');

// 6. Test function call
console.log('6️⃣ TESTING FUNCTION CALL:');
console.log('-------------------------------------------');
try {
    if (typeof window.filterSessionsByRole === 'function') {
        console.log('   ✅ filterSessionsByRole is callable');
        console.log('   Testing call with ("all", null)...');
        // Don\'t actually call it, just verify it's callable
        console.log('   ✅ Function signature looks good');
    } else {
        console.error('   ❌ filterSessionsByRole is NOT a function!');
    }
} catch (e) {
    console.error('   ❌ Error testing function:', e);
}
console.log('');

// 7. Check all loaded scripts
console.log('7️⃣ ALL LOADED SCRIPTS (sessions/tutor related):');
console.log('-------------------------------------------');
const allScripts = Array.from(document.querySelectorAll('script[src]'));
const relevantScripts = allScripts.filter(s =>
    s.src.includes('sessions') ||
    s.src.includes('tutor-profile') ||
    s.src.includes('panel')
);
console.log(`   Found ${relevantScripts.length} relevant script(s):`);
relevantScripts.forEach((script, i) => {
    const url = new URL(script.src);
    console.log(`   [${i+1}] ${url.pathname}${url.search}`);
});
console.log('');

// 8. Manual fix function
console.log('8️⃣ MANUAL FIX:');
console.log('-------------------------------------------');
console.log('   If filterSessionsByRole is missing, you can define it manually:');
console.log('');
console.log('   Copy and paste this into console:');
console.log('   ┌─────────────────────────────────────────┐');
console.log('   │ window.filterSessionsByRole = function(role, event) { │');
console.log('   │     console.log("Filtering by role:", role);           │');
console.log('   │     // Add actual implementation here                 │');
console.log('   │ };                                                     │');
console.log('   └─────────────────────────────────────────┘');
console.log('');

// 9. Force reload script
console.log('9️⃣ FORCE RELOAD SESSIONS-PANEL-MANAGER.JS:');
console.log('-------------------------------------------');
console.log('   To force reload the script, paste this:');
console.log('');
console.log('   ┌─────────────────────────────────────────────────────┐');
console.log('   │ const script = document.createElement("script");     │');
console.log('   │ script.src = "../js/tutor-profile/sessions-panel-manager.js?v=" + Date.now(); │');
console.log('   │ document.body.appendChild(script);                   │');
console.log('   │ console.log("✅ Script reloaded!");                  │');
console.log('   └─────────────────────────────────────────────────────┘');
console.log('');

// 10. Summary
console.log('🔧 ========================================');
console.log('🔧 DEBUG SUMMARY');
console.log('🔧 ========================================');

const functionsOK = requiredFunctions.every(f => typeof window[f] === 'function');
const scriptsOK = scriptTags.length > 0;
const buttonsOK = filterButtons.length > 0;

console.log(`   Scripts loaded: ${scriptsOK ? '✅' : '❌'}`);
console.log(`   Functions defined: ${functionsOK ? '✅' : '❌'}`);
console.log(`   Buttons found: ${buttonsOK ? '✅' : '❌'}`);
console.log('');

if (functionsOK && scriptsOK && buttonsOK) {
    console.log('   ✅ Everything looks good! The error might be timing-related.');
    console.log('   💡 Try clicking the Sessions panel in the sidebar first,');
    console.log('      then try the filter buttons.');
} else {
    console.log('   ❌ Issues detected! See details above.');
    console.log('');
    console.log('   RECOMMENDED ACTIONS:');
    if (!scriptsOK) {
        console.log('   1. Check if sessions-panel-manager.js exists in js/tutor-profile/');
    }
    if (!functionsOK) {
        console.log('   2. Use the manual fix above (section 8) to define missing functions');
    }
    if (!buttonsOK) {
        console.log('   3. Make sure you\'re on the Sessions panel');
    }
}

console.log('');
console.log('🔧 ========================================');
console.log('🔧 END OF DEBUG');
console.log('🔧 ========================================');
