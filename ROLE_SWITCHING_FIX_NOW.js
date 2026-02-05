/**
 * EMERGENCY ROLE SWITCHING FIX
 * Run this in the console to manually trigger role switcher setup
 */

console.log('🔧 MANUAL ROLE SWITCHER FIX\n');

// Force re-setup the role switcher
async function fixRoleSwitcher() {
    console.log('1️⃣ Calling setupRoleSwitcher()...');

    if (typeof window.setupRoleSwitcher === 'function') {
        try {
            await window.setupRoleSwitcher();
            console.log('✅ setupRoleSwitcher() completed');

            // Check if it worked
            const roleOptions = document.getElementById('role-options');
            if (roleOptions) {
                console.log('📊 Role options now has', roleOptions.children.length, 'children');

                if (roleOptions.children.length > 0) {
                    console.log('✅ SUCCESS! Role options populated:');
                    Array.from(roleOptions.children).forEach((child, i) => {
                        console.log(`   [${i}] ${child.textContent.trim()}`);
                    });
                } else {
                    console.log('❌ STILL EMPTY! Investigating...');

                    // Manual fix - add roles directly
                    console.log('\n2️⃣ Attempting manual fix...');
                    const token = localStorage.getItem('access_token') || localStorage.getItem('token');

                    const response = await fetch('http://localhost:8000/api/my-roles', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    const data = await response.json();
                    console.log('📡 API returned:', data);

                    const userRoles = data.user_roles || [];
                    const activeRole = data.active_role;
                    const userFacingRoles = userRoles.filter(r => r !== 'admin');

                    console.log('Filtered roles:', userFacingRoles);
                    console.log('Active role:', activeRole);
                    console.log('Count:', userFacingRoles.length);

                    // Clear and manually rebuild
                    roleOptions.innerHTML = '';

                    if (userFacingRoles.length > 1) {
                        console.log('✅ Multiple roles detected - adding them manually...');

                        userFacingRoles.forEach(role => {
                            const roleOption = document.createElement('div');
                            roleOption.className = 'role-option';

                            if (role === activeRole) {
                                roleOption.classList.add('active');
                            }

                            // Format role name
                            const roleNames = {
                                'student': 'Student',
                                'tutor': 'Tutor',
                                'parent': 'Parent',
                                'advertiser': 'Advertiser',
                                'user': 'User'
                            };
                            const roleName = roleNames[role] || role.charAt(0).toUpperCase() + role.slice(1);

                            roleOption.innerHTML = `
                                <span class="role-name">${roleName}</span>
                                ${role === activeRole ? '<span class="role-badge">ACTIVE</span>' : ''}
                            `;

                            roleOption.onclick = () => {
                                if (role === activeRole) {
                                    console.log('Navigating to', role, 'profile...');
                                    const profilePages = {
                                        'student': '/profile-pages/student-profile.html',
                                        'tutor': '/profile-pages/tutor-profile.html',
                                        'parent': '/profile-pages/parent-profile.html',
                                        'advertiser': '/profile-pages/advertiser-profile.html'
                                    };
                                    window.location.href = profilePages[role] || '/index.html';
                                } else {
                                    console.log('Switching to', role, '...');
                                    if (typeof window.switchToRole === 'function') {
                                        window.switchToRole(role);
                                    } else {
                                        console.error('switchToRole function not found!');
                                    }
                                }
                            };

                            roleOptions.appendChild(roleOption);
                            console.log('   ✅ Added:', roleName);
                        });

                        // Add "Add New Role" button
                        const addRoleOption = document.createElement('div');
                        addRoleOption.className = 'role-option add-role-option';
                        addRoleOption.innerHTML = `
                            <span class="add-role-icon">+</span>
                            <span class="role-name">Add New Role</span>
                        `;
                        addRoleOption.onclick = () => {
                            if (typeof window.openAddRoleModal === 'function') {
                                window.openAddRoleModal();
                            }
                        };
                        roleOptions.appendChild(addRoleOption);
                        console.log('   ✅ Added: Add New Role button');

                        console.log('\n✅ MANUAL FIX COMPLETE!');
                        console.log('Try opening the profile dropdown now and clicking a role.');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error:', error);
        }
    } else {
        console.error('❌ window.setupRoleSwitcher not found!');
    }
}

// Run the fix
fixRoleSwitcher();
