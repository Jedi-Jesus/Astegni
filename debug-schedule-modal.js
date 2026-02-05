// DEBUG SCRIPT FOR SCHEDULE MODAL ISSUE
// Paste this into your browser console (F12)

console.log('=== SCHEDULE MODAL DEBUG ===');

// Check if function exists
console.log('1. Function exists on window?', typeof window.openViewScheduleModal);

// If not, check if script loaded
const scripts = Array.from(document.querySelectorAll('script[src*="global-functions"]'));
console.log('2. Global functions script tags:', scripts.map(s => s.src));

// Force reload the script
if (typeof window.openViewScheduleModal !== 'function') {
    console.log('3. Function not found! Force-reloading script...');

    // Remove old script
    scripts.forEach(s => s.remove());

    // Add new script with fresh cache-busting
    const newScript = document.createElement('script');
    newScript.src = `../js/student-profile/global-functions.js?v=${Date.now()}`;
    newScript.onload = () => {
        console.log('4. Script reloaded! Function now available?', typeof window.openViewScheduleModal);
        if (typeof window.openViewScheduleModal === 'function') {
            console.log('✅ SUCCESS! Try clicking the View Details button now.');
        } else {
            console.error('❌ STILL NOT LOADED. Check console for errors.');
        }
    };
    document.body.appendChild(newScript);
} else {
    console.log('✅ Function is already loaded! Should work fine.');
    console.log('Available schedule functions:', {
        openViewScheduleModal: typeof window.openViewScheduleModal,
        closeViewScheduleModal: typeof window.closeViewScheduleModal,
        editScheduleFromView: typeof window.editScheduleFromView,
        deleteScheduleFromView: typeof window.deleteScheduleFromView
    });
}
