// ============================
// Admin Management Functions
// ============================

// Sample admin data (in production, this would come from the database)
const sampleAdmins = [
    {
        id: 1,
        name: 'Abebe Bekele',
        email: 'abebe.bekele@astegni.com',
        role: 'super-admin',
        status: 'online',
        avatar: '../uploads/system_images/system_profile_pictures/man-user.png',
        lastActive: '2 minutes ago',
        joined: 'Jan 15, 2024',
        permissions: ['all'],
        totalActions: 1247,
        loginCount: 342
    },
    {
        id: 2,
        name: 'Tigist Hailu',
        email: 'tigist.hailu@astegni.com',
        role: 'admin',
        status: 'online',
        avatar: '../uploads/system_images/system_profile_pictures/woman-user.jpg',
        lastActive: '5 minutes ago',
        joined: 'Feb 03, 2024',
        permissions: ['manage-users', 'manage-content', 'view-analytics'],
        totalActions: 892,
        loginCount: 215
    },
    {
        id: 3,
        name: 'Dawit Tesfaye',
        email: 'dawit.tesfaye@astegni.com',
        role: 'moderator',
        status: 'offline',
        avatar: '../uploads/system_images/system_profile_pictures/man-user.png',
        lastActive: '2 hours ago',
        joined: 'Mar 10, 2024',
        permissions: ['manage-content', 'handle-reports'],
        totalActions: 543,
        loginCount: 128
    },
    {
        id: 4,
        name: 'Yohannes Mulugeta',
        email: 'yohannes.m@astegni.com',
        role: 'admin',
        status: 'suspended',
        avatar: '../uploads/system_images/system_profile_pictures/man-user.png',
        lastActive: '5 days ago',
        joined: 'Jan 20, 2024',
        suspendedDate: 'Apr 15, 2024',
        suspendedReason: 'Policy Violation',
        permissions: ['manage-users', 'manage-credentials'],
        totalActions: 678,
        loginCount: 189
    }
];

let currentAdminId = null;

// Use global API_BASE_URL if already defined (avoid redeclaration)
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'http://localhost:8000';
}

// Invite Admin Modal Functions
function openInviteAdminModal() {
    const modal = document.getElementById('invite-admin-modal');
    if (modal) {
        modal.classList.remove('hidden');
        // Prevent body scroll
        document.body.classList.add('modal-open');
        // Clear form
        document.getElementById('invite-admin-name').value = '';
        document.getElementById('invite-admin-email').value = '';
        document.getElementById('invite-admin-role').value = '';
        document.getElementById('invite-admin-message').value = '';
        // Uncheck all permissions
        document.querySelectorAll('#invite-admin-modal input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
}

function closeInviteAdminModal() {
    const modal = document.getElementById('invite-admin-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Restore body scroll
        document.body.classList.remove('modal-open');
    }
}

async function handleAdminInvitation(event) {
    event.preventDefault();

    // Get form values matching backend AdminInviteRequest model
    const firstName = document.getElementById('invite-admin-first-name').value.trim();
    const fatherName = document.getElementById('invite-admin-father-name').value.trim();
    const grandfatherName = document.getElementById('invite-admin-grandfather-name')?.value.trim() || '';
    const email = document.getElementById('invite-admin-email').value.trim();
    const phoneNumber = document.getElementById('invite-admin-phone')?.value.trim() || '';
    const department = document.getElementById('invite-admin-department').value;
    const position = document.getElementById('invite-admin-position').value.trim();
    const employeeId = document.getElementById('invite-admin-employee-id')?.value.trim() || '';
    const welcomeMessage = document.getElementById('invite-admin-message')?.value.trim() || '';

    // Validate required fields
    if (!firstName || !fatherName || !email || !department || !position) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }

    // Prepare invitation data matching backend AdminInviteRequest model
    const invitationData = {
        first_name: firstName,
        father_name: fatherName,
        grandfather_name: grandfatherName,
        email: email,
        phone_number: phoneNumber,
        employee_id: employeeId,
        department: department,
        position: position,
        welcome_message: welcomeMessage
    };

    // Show loading state
    const submitBtn = document.getElementById('invite-admin-submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending OTP...';
    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/send-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(invitationData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Success - OTP sent
            showNotification(`OTP invitation sent successfully to ${email}!`, 'success');

            // Show success modal or alert with details
            const otpInfo = data.otp ? `\n\nDEV MODE - OTP: ${data.otp}` : '';
            alert(`Invitation sent successfully!\n\nAdmin: ${firstName} ${fatherName}\nEmail: ${email}\nDepartment: ${department}\nPosition: ${position}\n\nThe admin will receive an OTP via email to complete their registration.\nThe OTP is valid for 7 days.${otpInfo}`);

            closeInviteAdminModal();
            clearInviteAdminForm();

            // Refresh the pending invitations list if on that panel
            if (typeof loadPendingInvitations === 'function') {
                loadPendingInvitations();
            }
        } else {
            // Error from server
            const errorMessage = data.detail || data.message || 'Failed to send invitation';
            showNotification(errorMessage, 'error');
            alert(`Error: ${errorMessage}`);
        }
    } catch (error) {
        console.error('Error sending invitation:', error);
        showNotification('Failed to send invitation. Please check your connection and try again.', 'error');
        alert('Failed to send invitation. Please try again.');
    } finally {
        // Restore button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}

// Clear the invite admin form
function clearInviteAdminForm() {
    const fields = [
        'invite-admin-first-name',
        'invite-admin-father-name',
        'invite-admin-grandfather-name',
        'invite-admin-email',
        'invite-admin-phone',
        'invite-admin-department',
        'invite-admin-position',
        'invite-admin-employee-id',
        'invite-admin-message'
    ];

    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.tagName === 'SELECT') {
                field.selectedIndex = 0;
            } else {
                field.value = '';
            }
        }
    });
}

// Show notification helper
function showNotification(message, type = 'info') {
    // Check if there's a notification system available
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
    } else if (typeof window.notify === 'function') {
        window.notify(message, type);
    } else {
        // Fallback to console
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// View Admin Details
async function viewAdminDetails(adminId) {
    currentAdminId = adminId;
    const modal = document.getElementById('admin-details-modal');
    const contentDiv = document.getElementById('admin-details-content');

    if (modal) {
        modal.classList.remove('hidden');

        // Find admin data
        const admin = sampleAdmins.find(a => a.id === adminId);

        if (admin) {
            // Populate modal with admin details
            contentDiv.innerHTML = `
                <div class="space-y-6">
                    <!-- Admin Header -->
                    <div class="flex items-center gap-4 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <img src="${admin.avatar}" alt="${admin.name}" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg">
                        <div>
                            <h3 class="text-2xl font-bold">${admin.name}</h3>
                            <p class="text-gray-600">${admin.email}</p>
                            <div class="flex items-center gap-2 mt-2">
                                <span class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">${admin.role.replace('-', ' ').toUpperCase()}</span>
                                <span class="px-3 py-1 ${admin.status === 'online' ? 'bg-green-100 text-green-800' : admin.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} rounded-full text-xs font-semibold">
                                    ${admin.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Stats Grid -->
                    <div class="grid grid-cols-3 gap-4">
                        <div class="bg-blue-50 p-4 rounded-lg text-center">
                            <div class="text-3xl font-bold text-blue-600">${admin.totalActions}</div>
                            <div class="text-sm text-gray-600 mt-1">Total Actions</div>
                        </div>
                        <div class="bg-green-50 p-4 rounded-lg text-center">
                            <div class="text-3xl font-bold text-green-600">${admin.loginCount}</div>
                            <div class="text-sm text-gray-600 mt-1">Login Count</div>
                        </div>
                        <div class="bg-purple-50 p-4 rounded-lg text-center">
                            <div class="text-3xl font-bold text-purple-600">${admin.permissions.length}</div>
                            <div class="text-sm text-gray-600 mt-1">Permissions</div>
                        </div>
                    </div>

                    <!-- Details -->
                    <div class="space-y-4">
                        <div class="border-b pb-3">
                            <div class="text-sm text-gray-600">Last Active</div>
                            <div class="font-semibold">${admin.lastActive}</div>
                        </div>
                        <div class="border-b pb-3">
                            <div class="text-sm text-gray-600">Joined Date</div>
                            <div class="font-semibold">${admin.joined}</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600 mb-2">Permissions</div>
                            <div class="flex flex-wrap gap-2">
                                ${admin.permissions.map(p => `
                                    <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                        ${p.replace('-', ' ')}
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div>
                        <h4 class="font-bold mb-3">Recent Activity</h4>
                        <div class="space-y-2">
                            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <i class="fas fa-user-edit text-blue-500"></i>
                                <div class="flex-1">
                                    <div class="text-sm font-semibold">Updated user profile</div>
                                    <div class="text-xs text-gray-500">2 hours ago</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <i class="fas fa-check-circle text-green-500"></i>
                                <div class="flex-1">
                                    <div class="text-sm font-semibold">Approved 5 tutors</div>
                                    <div class="text-xs text-gray-500">5 hours ago</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <i class="fas fa-flag text-red-500"></i>
                                <div class="flex-1">
                                    <div class="text-sm font-semibold">Resolved 3 reports</div>
                                    <div class="text-xs text-gray-500">1 day ago</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}

function closeAdminDetailsModal() {
    const modal = document.getElementById('admin-details-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Edit Admin Role Functions
function editAdminRole(adminId) {
    currentAdminId = adminId;
    const modal = document.getElementById('edit-admin-role-modal');
    const admin = sampleAdmins.find(a => a.id === adminId);

    if (modal && admin) {
        modal.classList.remove('hidden');

        // Populate modal with admin info
        document.getElementById('edit-admin-avatar').src = admin.avatar;
        document.getElementById('edit-admin-name').textContent = admin.name;
        document.getElementById('edit-admin-email').textContent = admin.email;
        document.getElementById('edit-admin-role-select').value = admin.role;
        document.getElementById('edit-admin-reason').value = '';
    }
}

function closeEditAdminRoleModal() {
    const modal = document.getElementById('edit-admin-role-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function handleEditAdminRole(event) {
    event.preventDefault();

    const newRole = document.getElementById('edit-admin-role-select').value;
    const reason = document.getElementById('edit-admin-reason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/${currentAdminId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ role: newRole, reason })
        });

        if (response.ok) {
            alert('Admin role updated successfully!');
            closeEditAdminRoleModal();
            // Refresh admin list
            // loadAdminList();
        } else {
            throw new Error('Failed to update role');
        }
    } catch (error) {
        console.error('Error updating admin role:', error);
        alert('Failed to update admin role. Please try again.');
    }
}

// View Admin Activity
function viewAdminActivity(adminId) {
    alert(`Viewing activity log for admin ID: ${adminId}\n\nThis would show detailed activity logs, login history, and actions performed.`);
}

// Suspend Admin Functions
function suspendAdmin(adminId) {
    currentAdminId = adminId;
    const modal = document.getElementById('suspend-admin-modal');
    const admin = sampleAdmins.find(a => a.id === adminId);

    if (modal && admin) {
        modal.classList.remove('hidden');

        // Populate modal with admin info
        document.getElementById('suspend-admin-avatar').src = admin.avatar;
        document.getElementById('suspend-admin-name').textContent = admin.name;
        document.getElementById('suspend-admin-email').textContent = admin.email;

        // Clear form
        document.getElementById('suspend-reason').value = '';
        document.getElementById('suspend-details').value = '';
        document.getElementById('suspend-duration').value = 'indefinite';
    }
}

function closeSuspendAdminModal() {
    const modal = document.getElementById('suspend-admin-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function handleSuspendAdmin(event) {
    event.preventDefault();

    const reason = document.getElementById('suspend-reason').value;
    const details = document.getElementById('suspend-details').value;
    const duration = document.getElementById('suspend-duration').value;

    const suspensionData = {
        reason,
        details,
        duration
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/${currentAdminId}/suspend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(suspensionData)
        });

        if (response.ok) {
            alert('Admin suspended successfully!');
            closeSuspendAdminModal();
            // Refresh admin list
            // loadAdminList();
        } else {
            throw new Error('Failed to suspend admin');
        }
    } catch (error) {
        console.error('Error suspending admin:', error);
        alert('Failed to suspend admin. Please try again.');
    }
}

// Reactivate Admin
async function reactivateAdmin(adminId) {
    if (!confirm('Are you sure you want to reactivate this administrator?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/${adminId}/reactivate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            alert('Admin reactivated successfully!');
            // Refresh admin list
            // loadAdminList();
        } else {
            throw new Error('Failed to reactivate admin');
        }
    } catch (error) {
        console.error('Error reactivating admin:', error);
        alert('Failed to reactivate admin. Please try again.');
    }
}

// Revoke Admin Access Functions
function revokeAdminAccess(adminId) {
    currentAdminId = adminId;
    const modal = document.getElementById('revoke-admin-modal');
    const admin = sampleAdmins.find(a => a.id === adminId);

    if (modal && admin) {
        modal.classList.remove('hidden');

        // Populate modal with admin info
        document.getElementById('revoke-admin-avatar').src = admin.avatar;
        document.getElementById('revoke-admin-name').textContent = admin.name;
        document.getElementById('revoke-admin-email').textContent = admin.email;

        // Reset checkbox
        const checkbox = document.getElementById('revoke-confirm-checkbox');
        const confirmBtn = document.getElementById('revoke-confirm-btn');
        checkbox.checked = false;
        confirmBtn.disabled = true;

        // Enable/disable confirm button based on checkbox
        checkbox.addEventListener('change', function() {
            confirmBtn.disabled = !this.checked;
        });
    }
}

function closeRevokeAdminModal() {
    const modal = document.getElementById('revoke-admin-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function confirmRevokeAdmin() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/${currentAdminId}/revoke`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.ok) {
            alert('Admin access revoked permanently!');
            closeRevokeAdminModal();
            // Refresh admin list
            // loadAdminList();
        } else {
            throw new Error('Failed to revoke admin access');
        }
    } catch (error) {
        console.error('Error revoking admin access:', error);
        alert('Failed to revoke admin access. Please try again.');
    }
}

// Invitation Management
async function resendInvitation(email) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/invitation/resend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            alert(`Invitation resent to ${email}!`);
        } else {
            throw new Error('Failed to resend invitation');
        }
    } catch (error) {
        console.error('Error resending invitation:', error);
        alert('Failed to resend invitation. Please try again.');
    }
}

async function cancelInvitation(email) {
    if (!confirm(`Are you sure you want to cancel the invitation to ${email}?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/invitation/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ email })
        });

        if (response.ok) {
            alert('Invitation cancelled successfully!');
            // Refresh pending invitations
            // loadPendingInvitations();
        } else {
            throw new Error('Failed to cancel invitation');
        }
    } catch (error) {
        console.error('Error cancelling invitation:', error);
        alert('Failed to cancel invitation. Please try again.');
    }
}
