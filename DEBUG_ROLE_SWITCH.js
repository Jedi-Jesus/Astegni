// DEBUG SCRIPT FOR ROLE SWITCHING
// Paste this into browser console to debug role switching issues

console.log('=== ROLE SWITCH DEBUG SCRIPT ===');

function debugRoleState() {
    console.log('\n=== CURRENT STATE ===');
    console.log('1. localStorage.userRole:', localStorage.getItem('userRole'));
    console.log('2. localStorage.token:', localStorage.getItem('token')?.substring(0, 50) + '...');

    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const parsed = JSON.parse(currentUser);
        console.log('3. currentUser.active_role:', parsed.active_role);
        console.log('   currentUser.role:', parsed.role);
        console.log('   currentUser.roles:', parsed.roles);
    }

    console.log('4. AuthManager.user.active_role:', window.AuthManager?.user?.active_role);
    console.log('   AuthManager.user.role:', window.AuthManager?.user?.role);
    console.log('   AuthManager.user.roles:', window.AuthManager?.user?.roles);

    console.log('5. sessionStorage.role_switch_in_progress:', sessionStorage.getItem('role_switch_in_progress'));
    console.log('   sessionStorage.target_role:', sessionStorage.getItem('target_role'));

    console.log('6. AuthManager.getUserRole():', window.AuthManager?.getUserRole());
    console.log('===================\n');
}

// Run initial check
debugRoleState();

// Intercept switchToRole calls
const originalSwitchToRole = window.switchToRole;
window.switchToRole = async function(newRole) {
    console.log('\n🔄 SWITCH TO ROLE CALLED:', newRole);
    console.log('--- BEFORE SWITCH ---');
    debugRoleState();

    // Call original function
    const result = await originalSwitchToRole.call(this, newRole);

    console.log('--- AFTER SWITCH (before navigation) ---');
    debugRoleState();

    return result;
};

// Intercept fetch to log API calls
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const url = args[0];
    if (url.includes('switch-role')) {
        console.log('📡 API CALL: switch-role');
        const response = await originalFetch.apply(this, args);
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        console.log('📡 API RESPONSE:', data);
        return response;
    }
    return originalFetch.apply(this, args);
};

console.log('✅ Debug script loaded! Try switching roles now.');
console.log('💡 Or manually check state: debugRoleState()');
