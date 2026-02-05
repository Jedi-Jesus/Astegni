// TEMPORARY DEBUG: Add this to browser console on tutor-profile.html

// Force add test dates for debugging
function forceAddTestDates() {
    console.log('🧪 Force adding test dates...');
    console.log('Before:', selectedSpecificDates);
    
    selectedSpecificDates.push('2026-02-20');
    selectedSpecificDates.push('2026-02-21');
    selectedSpecificDates.push('2026-02-22');
    
    console.log('After:', selectedSpecificDates);
    
    if (typeof updateSelectedDatesList === 'function') {
        updateSelectedDatesList();
        console.log('✅ Updated UI');
    }
}

// Run it
forceAddTestDates();

// Now try to save the schedule and see if it works with these dates
console.log('👉 Now try clicking "Create Schedule" button in the modal');
