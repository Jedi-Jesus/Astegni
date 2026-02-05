// TEST SCHEDULE FIX
// Run this in browser console on tutor-profile.html after hard reload

console.log('🧪 === TESTING SCHEDULE FIX ===\n');

// Test 1: Check if schedule-panel-manager loaded
console.log('1. Schedule Panel Manager:');
console.log('   filterSchedulesByRole:', typeof filterSchedulesByRole);
console.log('   loadSchedules:', typeof loadSchedules);
console.log('   Expected: "function" for both\n');

// Test 2: Check variables declared
console.log('2. Variables Declared:');
console.log('   allSchedules:', typeof allSchedules !== 'undefined');
console.log('   currentScheduleTab:', typeof currentScheduleTab !== 'undefined');
console.log('   scheduleCurrentPage:', typeof scheduleCurrentPage !== 'undefined');
console.log('   Expected: true for all\n');

// Test 3: Check global-functions loaded
console.log('3. Global Functions:');
console.log('   saveSchedule:', typeof saveSchedule);
console.log('   handleFromDateChange:', typeof handleFromDateChange);
console.log('   selectedSpecificDates:', typeof selectedSpecificDates !== 'undefined');
console.log('   Expected: "function", "function", true\n');

// Test 4: Check if console has errors
console.log('4. Check console above for any RED errors');
console.log('   Should NOT see: "filterSchedulesByRole is not defined"\n');

console.log('=== TEST COMPLETE ===');
console.log('If all checks pass, try creating a specific date schedule!');
