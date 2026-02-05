// EMERGENCY FIX - Paste this in console if role is still undefined
console.log('=== FIXING CURRENT SESSION ===');

// Get current user
const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
console.log('1. Current user object:', currentUser);

// Determine active role
let activeRole = null;

if (currentUser.active_role && currentUser.active_role !== 'undefined') {
    activeRole = currentUser.active_role;
    console.log('2. Using active_role:', activeRole);
} else if (currentUser.role && currentUser.role !== 'undefined') {
    activeRole = currentUser.role;
    console.log('2. Using role:', activeRole);
} else if (currentUser.roles && currentUser.roles.length > 0) {
    activeRole = currentUser.roles[0];
    console.log('2. Using first role from array:', activeRole);
} else {
    console.error('2. NO ROLE FOUND! Cannot fix session.');
}

if (activeRole) {
    // Set localStorage.userRole
    localStorage.setItem('userRole', activeRole);
    console.log('3. Set localStorage.userRole to:', activeRole);

    // Update currentUser object
    currentUser.active_role = activeRole;
    currentUser.role = activeRole;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    console.log('4. Updated currentUser object');

    // Update AuthManager
    if (window.AuthManager && window.AuthManager.user) {
        window.AuthManager.user.active_role = activeRole;
        window.AuthManager.user.role = activeRole;
        console.log('5. Updated AuthManager.user');
    }

    console.log('\n✅ SESSION FIXED!');
    console.log('Active role is now:', activeRole);
    console.log('\nYou can now try switching roles again.');
} else {
    console.error('❌ CANNOT FIX - No role information found in user object!');
    console.log('You may need to log out and log in again.');
}
