// ========================================
// AUTH DEBUG SCRIPT
// Copy and paste this in browser console (F12)
// ========================================

console.log('\n========================================');
console.log('🔍 AUTH DEBUG REPORT');
console.log('========================================\n');

// 1. Check localStorage
console.log('📦 LocalStorage Contents:');
console.log('  Token exists:', !!localStorage.getItem('token'));
console.log('  Token length:', localStorage.getItem('token')?.length || 0);
console.log('  User Role:', localStorage.getItem('userRole'));

try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('\n👤 Current User Object:');
    console.log('  User ID:', currentUser.id);
    console.log('  Name:', currentUser.name);
    console.log('  Email:', currentUser.email);
    console.log('  Role:', currentUser.role);
    console.log('  Active Role:', currentUser.active_role);
    console.log('  Roles Array:', currentUser.roles);
} catch (e) {
    console.error('  ❌ Error parsing currentUser:', e);
}

// 2. Check AuthManager
console.log('\n🔐 AuthManager Status:');
if (typeof window.AuthManager !== 'undefined') {
    console.log('  AuthManager exists: ✅');
    console.log('  isAuthenticated():', window.AuthManager.isAuthenticated());
    console.log('  getUserRole():', window.AuthManager.getUserRole());
    console.log('  getUser():', window.AuthManager.getUser());
    console.log('  Token from AuthManager:', !!window.AuthManager.token);
} else {
    console.log('  AuthManager exists: ❌');
}

// 3. Decode JWT Token
console.log('\n🔑 JWT Token Payload:');
try {
    const token = localStorage.getItem('token');
    if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = parts[1];
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            console.log('  User ID (sub):', decoded.sub);
            console.log('  Active Role:', decoded.active_role);
            console.log('  Roles:', decoded.roles);
            console.log('  Role IDs:', decoded.role_ids);
            console.log('  Expires:', new Date(decoded.exp * 1000).toLocaleString());
        } else {
            console.log('  ❌ Invalid token format');
        }
    } else {
        console.log('  ❌ No token found');
    }
} catch (e) {
    console.error('  ❌ Error decoding token:', e);
}

// 4. Check for admin token
console.log('\n⚠️  Checking for Admin Token Conflict:');
const adminToken = localStorage.getItem('adminToken');
const admin_token = localStorage.getItem('admin_token');
console.log('  adminToken exists:', !!adminToken);
console.log('  admin_token exists:', !!admin_token);
if (adminToken || admin_token) {
    console.log('  ⚠️  WARNING: Admin token found! This may cause conflicts.');
}

// 5. Summary
console.log('\n========================================');
console.log('📊 SUMMARY');
console.log('========================================');

const userRole = window.AuthManager?.getUserRole();
if (userRole === 'student') {
    console.log('✅ Status: Correctly logged in as STUDENT');
} else if (userRole === 'admin') {
    console.log('❌ Status: Logged in as ADMIN (not student!)');
    console.log('💡 Solution: Clear localStorage and login as student');
} else if (userRole) {
    console.log(`⚠️  Status: Logged in as ${userRole?.toUpperCase()}`);
} else {
    console.log('❌ Status: Not authenticated');
}

console.log('\n========================================\n');

// Instructions
console.log('📝 Next Steps:');
if (userRole === 'admin') {
    console.log('  1. Run: localStorage.clear()');
    console.log('  2. Refresh page');
    console.log('  3. Login as STUDENT (not admin)');
    console.log('  4. Choose "Student" role');
    console.log('  5. Navigate to student profile');
} else if (userRole === 'student') {
    console.log('  ✅ Everything looks correct!');
    console.log('  If the page still says "admin", share this debug output.');
} else {
    console.log('  1. Login from index.html');
    console.log('  2. Choose "Student" role');
    console.log('  3. Run this script again');
}
