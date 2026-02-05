// ============================================
// FORCE RELOAD SCHEDULE MANAGER SCRIPT
// Run this in browser console (F12 → Console)
// ============================================

console.log('🔄 Force reloading schedule manager script...');

// Remove old script
const oldScript = document.querySelector('script[src*="schedule-manager.js"]');
if (oldScript) {
    console.log('🗑️ Removing old script:', oldScript.src);
    oldScript.remove();
}

// Add new script with fresh timestamp to bypass cache
const newScript = document.createElement('script');
const timestamp = new Date().getTime();
const scriptPath = '../js/student-profile/schedule-manager.js';
newScript.src = `${scriptPath}?v=${timestamp}`;

newScript.onload = function() {
    console.log('✅ Script reloaded successfully!');

    // Test if function is available
    if (typeof window.filterSchedulesByRole === 'function') {
        console.log('✅ filterSchedulesByRole is now available!');
        console.log('Function:', window.filterSchedulesByRole);
        console.log('');
        console.log('🎉 SUCCESS! The fix is working.');
        console.log('You can now click the schedule filter buttons.');
    } else {
        console.error('❌ Function still not available after reload');
        console.log('Available window functions:', Object.keys(window).filter(k => k.includes('Schedule')));
    }
};

newScript.onerror = function() {
    console.error('❌ Failed to reload script');
};

document.head.appendChild(newScript);
console.log('📦 New script added with timestamp:', timestamp);
