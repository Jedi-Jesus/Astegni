/**
 * Role Switching Diagnostic Script
 *
 * Instructions:
 * 1. Log into your account (contact@astegni.com)
 * 2. Open browser DevTools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter
 * 6. Read the diagnostic output
 */

console.log('=== ROLE SWITCHING DIAGNOSTICS ===\n');

// 1. Check if user is logged in
const token = localStorage.getItem('access_token') || localStorage.getItem('token');
const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
const userRole = localStorage.getItem('userRole');

console.log('1. AUTHENTICATION STATE');
console.log('   Token exists:', !!token);
console.log('   User object exists:', !!userStr);
console.log('   Current role:', userRole || 'NO ROLE');

if (userStr) {
    try {
        const user = JSON.parse(userStr);
        console.log('   User email:', user.email);
        console.log('   User name:', user.name || user.first_name);
        console.log('   User.role:', user.role);
        console.log('   User.active_role:', user.active_role);
    } catch (e) {
        console.error('   ERROR: Could not parse user object');
    }
}

console.log('\n2. PROFILE SYSTEM STATE');
console.log('   ProfileSystem exists:', typeof ProfileSystem !== 'undefined');
console.log('   window.switchToRole exists:', typeof window.switchToRole !== 'undefined');
console.log('   switchToRole type:', typeof window.switchToRole);

if (typeof window.switchToRole === 'function') {
    console.log('   ✅ switchToRole function is loaded');
} else {
    console.error('   ❌ switchToRole function NOT FOUND - This is the problem!');
    console.log('   → Solution: Hard refresh the page (Ctrl+Shift+R)');
}

console.log('\n3. DOM ELEMENTS');
const profileContainer = document.getElementById('profile-container');
const roleSwitcherSection = document.getElementById('role-switcher-section');
const roleOptions = document.getElementById('role-options');

console.log('   profile-container exists:', !!profileContainer);
if (profileContainer) {
    console.log('   profile-container visible:', !profileContainer.classList.contains('hidden'));
}

console.log('   role-switcher-section exists:', !!roleSwitcherSection);
if (roleSwitcherSection) {
    console.log('   role-switcher-section visible:', !roleSwitcherSection.classList.contains('hidden'));
}

console.log('   role-options exists:', !!roleOptions);
if (roleOptions) {
    console.log('   role-options children count:', roleOptions.children.length);
    console.log('   Role options:');
    Array.from(roleOptions.children).forEach((child, i) => {
        console.log(`     [${i}] className: ${child.className}`);
        console.log(`     [${i}] text: ${child.textContent.trim()}`);
        console.log(`     [${i}] has onclick:`, !!child.onclick);
    });
}

console.log('\n4. API TEST');
console.log('   Testing /api/my-roles endpoint...');

if (token) {
    fetch('http://localhost:8000/api/my-roles', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        console.log('   ✅ API Response:');
        console.log('      user_roles:', data.user_roles);
        console.log('      active_role:', data.active_role);
        console.log('      Total roles:', (data.user_roles || []).length);

        if (data.user_roles && data.user_roles.length > 1) {
            console.log('   ✅ You have multiple roles - switching should work');
        } else if (data.user_roles && data.user_roles.length === 1) {
            console.log('   ⚠️  You have only 1 role - switching is disabled (this is normal)');
        } else {
            console.log('   ⚠️  You have no roles');
        }
    })
    .catch(err => {
        console.error('   ❌ API Error:', err);
    });
} else {
    console.log('   ❌ No token - cannot test API');
}

console.log('\n5. MANUAL SWITCH TEST');
console.log('   You can manually test role switching:');
console.log('   → To switch to student role: window.switchToRole("student")');
console.log('   → To switch to tutor role: window.switchToRole("tutor")');
console.log('   → To switch to parent role: window.switchToRole("parent")');

console.log('\n6. RECOMMENDED ACTIONS');
if (typeof window.switchToRole !== 'function') {
    console.log('   ❌ CRITICAL: switchToRole function not loaded');
    console.log('   → Action: Hard refresh (Ctrl+Shift+R)');
    console.log('   → Or: Clear browser cache and reload');
} else if (!roleOptions || roleOptions.children.length === 0) {
    console.log('   ⚠️  No role options in dropdown');
    console.log('   → Action: Check if you have multiple roles in the API response above');
} else {
    console.log('   ✅ Everything looks normal');
    console.log('   → Try clicking a role in the dropdown');
    console.log('   → Check Network tab for /api/switch-role request');
}

console.log('\n=== END DIAGNOSTICS ===');
console.log('\nIf you see errors, copy them and share for further help.');
