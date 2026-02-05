// ============================================
// DIAGNOSE EXACT ERROR IN SESSIONS-PANEL-MANAGER.JS
// Paste this in browser console to see the real error
// ============================================

console.log('🔍 Starting diagnosis...');
console.log('');

// First, check current state
console.log('1️⃣ CURRENT STATE:');
console.log('   window.API_BASE_URL:', window.API_BASE_URL);
console.log('   window.SessionsPanel:', typeof window.SessionsPanel);
console.log('   window.filterSessionsByRole:', typeof window.filterSessionsByRole);
console.log('');

// Listen for ALL errors
window.addEventListener('error', (event) => {
    console.error('❌ CAUGHT ERROR:', event);
    console.error('   Message:', event.message);
    console.error('   Filename:', event.filename);
    console.error('   Line:', event.lineno, 'Column:', event.colno);
    console.error('   Error object:', event.error);
}, true);

console.log('2️⃣ ERROR LISTENER INSTALLED');
console.log('   Now reload the page or load the script again...');
console.log('');

// Now try to load the script fresh
console.log('3️⃣ LOADING SCRIPT FRESH...');
const script = document.createElement('script');
script.src = '../js/tutor-profile/sessions-panel-manager.js?v=' + Date.now();
script.onerror = (e) => {
    console.error('❌ Script failed to load:', e);
};
script.onload = () => {
    console.log('✅ Script loaded!');
    console.log('   window.filterSessionsByRole:', typeof window.filterSessionsByRole);
    console.log('   window.SessionsPanel:', window.SessionsPanel);
    console.log('');
    console.log('If filterSessionsByRole is still undefined, check the error messages above.');
};
document.body.appendChild(script);

console.log('');
console.log('4️⃣ WAITING FOR RESULTS...');
console.log('   Watch the console for error messages');
console.log('');
