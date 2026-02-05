// PASTE THIS IN CONSOLE TO CHECK USER OBJECT
console.log('=== CHECKING USER OBJECT STRUCTURE ===');

// Check localStorage
const storedUser = localStorage.getItem('currentUser');
console.log('1. localStorage.currentUser (raw):', storedUser);

if (storedUser) {
    const parsed = JSON.parse(storedUser);
    console.log('2. Parsed currentUser:', parsed);
    console.log('   - active_role:', parsed.active_role);
    console.log('   - role:', parsed.role);
    console.log('   - roles:', parsed.roles);
}

console.log('3. localStorage.userRole:', localStorage.getItem('userRole'));

// Check AuthManager
console.log('4. AuthManager.user:', window.AuthManager?.user);
console.log('   - active_role:', window.AuthManager?.user?.active_role);
console.log('   - role:', window.AuthManager?.user?.role);
console.log('   - roles:', window.AuthManager?.user?.roles);

console.log('5. AuthManager.getUserRole():', window.AuthManager?.getUserRole());

// Test restoreSession manually
console.log('\n=== TESTING RESTORE SESSION ===');
if (window.AuthManager) {
    console.log('Calling restoreSession() manually...');
    window.AuthManager.restoreSession().then(() => {
        console.log('After manual restoreSession():');
        console.log('   AuthManager.user.active_role:', window.AuthManager.user?.active_role);
        console.log('   AuthManager.getUserRole():', window.AuthManager.getUserRole());
    });
}
