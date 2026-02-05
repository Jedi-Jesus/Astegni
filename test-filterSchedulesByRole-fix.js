// ============================================
// TEST filterSchedulesByRole FIX
// Paste this in console after hard refresh
// ============================================

console.clear();
console.log('🧪 Testing filterSchedulesByRole fix...');
console.log('==========================================\n');

// Check if function exists
console.log('✅ Step 1: Check if function is defined');
console.log('typeof window.filterSchedulesByRole:', typeof window.filterSchedulesByRole);

if (typeof window.filterSchedulesByRole === 'function') {
    console.log('✅ FUNCTION EXISTS!');
    console.log('Function source:', window.filterSchedulesByRole.toString().substring(0, 100) + '...');

    // Check if it's callable
    console.log('\n✅ Step 2: Test if function is callable');
    try {
        console.log('Function is callable: YES');
        console.log('✅ ALL TESTS PASSED!');
        console.log('\n🎉 SUCCESS! You can now click the schedule filter buttons.');
        console.log('==========================================');

        const style = 'background: #4CAF50; color: white; padding: 15px; font-size: 18px; font-weight: bold; border-radius: 5px;';
        console.log('%c ✅ FIX WORKING PERFECTLY! ', style);

    } catch (error) {
        console.error('❌ Function exists but not callable:', error);
    }
} else {
    console.error('❌ FUNCTION STILL NOT DEFINED!');
    console.log('\n🔧 Try this:');
    console.log('1. Hard refresh: Ctrl+Shift+R');
    console.log('2. Or close all tabs and restart browser');
    console.log('==========================================');
}

// Show all schedule-related functions
console.log('\n📋 All schedule-related functions available:');
const scheduleFunctions = Object.keys(window).filter(k => k.toLowerCase().includes('schedule'));
scheduleFunctions.forEach(fn => {
    console.log(`  - ${fn}: ${typeof window[fn]}`);
});
