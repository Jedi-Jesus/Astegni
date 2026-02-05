// Force reload schedule-manager.js
console.clear();
console.log('🔄 Force reloading schedule-manager.js...\n');

// Remove old script
const oldScripts = document.querySelectorAll('script[src*="schedule-manager.js"]');
console.log('Found old scripts:', oldScripts.length);
oldScripts.forEach(script => {
    console.log('Removing:', script.src);
    script.remove();
});

// Add new script with fresh timestamp
const newScript = document.createElement('script');
newScript.src = `../js/student-profile/schedule-manager.js?v=${Date.now()}`;

newScript.onload = function() {
    console.log('\n✅ Script loaded!');
    console.log('typeof window.loadSchedules:', typeof window.loadSchedules);
    console.log('typeof window.filterSchedulesByRole:', typeof window.filterSchedulesByRole);

    if (typeof window.loadSchedules === 'function') {
        console.log('\n🎉 SUCCESS! loadSchedules is now available!');
    } else {
        console.log('\n❌ loadSchedules still not available');
        console.log('Check browser console for errors');
    }
};

newScript.onerror = function(error) {
    console.error('❌ Failed to load script:', error);
    console.log('Check if file exists at: js/student-profile/schedule-manager.js');
};

document.head.appendChild(newScript);
console.log('Loading script with timestamp:', newScript.src);
