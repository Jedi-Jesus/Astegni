// ============================================
// GLOBAL FUNCTIONS (for HTML onclick handlers)
// ============================================

window.viewTutorProfile = function(tutorId) {
    // Track search history when viewing a tutor
    const searchTerm = document.getElementById('searchBar')?.value?.trim();
    if (searchTerm) {
        PreferencesManager.addTutorViewToHistory(searchTerm, tutorId);
    }

    // Navigate to tutor profile page in new tab
    const url = `../view-profiles/view-tutor.html?id=${tutorId}`;
    window.open(url, '_blank');
}

window.connectWithTutor = async function(tutorProfileId, tutorName) {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
        // Open login modal or redirect to login
        if (window.openAuthModal) {
            window.openAuthModal('login');
        } else {
            alert('Please log in to connect with tutors');
        }
        return;
    }

    // Get current user's role
    const activeRole = localStorage.getItem('active_role') || 'student';

    // tutorProfileId is the tutor's profile ID (tutor_profiles.id)
    // This is the preferred way to identify a tutor for connections
    if (!tutorProfileId) {
        alert('Unable to connect: Tutor information not found. Please refresh the page and try again.');
        return;
    }

    // Show connection confirmation
    const confirmed = confirm(`Would you like to connect with ${tutorName || 'this tutor'}? This will send them a connection request.`);
    if (!confirmed) return;

    try {
        // Use the correct API base URL and endpoint
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

        // Use recipient_profile_id (tutor profile ID) instead of recipient_id (user ID)
        // The backend will look up the user_id from the tutor_profiles table
        const response = await fetch(`${API_BASE_URL}/connections`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                recipient_profile_id: tutorProfileId,  // Using profile ID (tutor_profiles.id)
                recipient_type: 'tutor',
                requester_type: activeRole
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Connection request sent to ${tutorName || 'tutor'} successfully!`);
            // Update button state if needed
            const button = document.querySelector(`[onclick*="connectWithTutor(${tutorProfileId}"]`);
            if (button) {
                button.innerHTML = `<span class="flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Pending
                </span>`;
                button.disabled = true;
                button.classList.add('pending-btn');
                button.classList.remove('connect-btn');
            }
        } else if (response.status === 400 && data.detail) {
            // Connection already exists - check the status and update button
            const detail = data.detail.toLowerCase();
            const button = document.querySelector(`[onclick*="connectWithTutor(${tutorProfileId}"]`);

            if (detail.includes('already connected')) {
                alert(`You are already connected with ${tutorName || 'this tutor'}.`);
                // Update button to show Connected
                if (button) {
                    button.innerHTML = `<span class="flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                        Connected
                    </span>`;
                    button.disabled = true;
                    button.classList.add('connected-btn');
                    button.classList.remove('connect-btn');
                }
            } else if (detail.includes('pending')) {
                alert(`You already have a pending connection request with ${tutorName || 'this tutor'}.`);
                // Update button to show Pending
                if (button) {
                    button.innerHTML = `<span class="flex items-center justify-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Pending
                    </span>`;
                    button.disabled = true;
                    button.classList.add('pending-btn');
                    button.classList.remove('connect-btn');
                }
            } else if (detail.includes('rejected')) {
                alert(`Your previous connection request was rejected.`);
            } else if (detail.includes('blocked')) {
                alert(`You cannot connect with this tutor.`);
                if (button) {
                    button.disabled = true;
                    button.classList.add('bg-gray-400');
                    button.classList.remove('connect-btn');
                }
            } else {
                alert(data.detail);
            }
        } else {
            alert(data.detail || 'Failed to send connection request');
        }
    } catch (error) {
        console.error('Error connecting with tutor:', error);
        alert('Error sending connection request. Please try again.');
    }
};

window.acceptConnectionRequest = async function(connectionId, tutorName) {
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
        alert('Please log in to accept connection requests');
        return;
    }

    const confirmed = confirm(`Accept connection request from ${tutorName || 'this tutor'}?`);
    if (!confirmed) return;

    try {
        const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000/api';

        const response = await fetch(`${API_BASE_URL}/connections/${connectionId}/accept`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            alert(`You are now connected with ${tutorName || 'this tutor'}!`);
            // Update button to show Connected
            const button = document.querySelector(`[data-connection-id="${connectionId}"]`);
            if (button) {
                button.innerHTML = `<span class="flex items-center justify-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                    Connected
                </span>`;
                button.disabled = true;
                button.classList.add('connected-btn');
                button.classList.remove('accept-btn');
                button.removeAttribute('onclick');
            }
        } else {
            alert(data.detail || 'Failed to accept connection request');
        }
    } catch (error) {
        console.error('Error accepting connection:', error);
        alert('Error accepting connection request. Please try again.');
    }
};

window.changePage = function(page) {
    if (page >= 1 && page <= FindTutorsState.totalPages && page !== FindTutorsState.currentPage) {
        FindTutorsState.currentPage = page;
        FindTutorsController.loadTutors();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.toggleFavorite = function(tutorId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please log in to add favorites');
        return;
    }

    const button = document.querySelector(`[data-id="${tutorId}"].favorite-btn`);
    const isActive = button.classList.contains('text-yellow-500');

    // Toggle UI immediately for better UX
    if (isActive) {
        button.classList.remove('text-yellow-500');
        button.classList.add('text-gray-400');
        button.querySelector('svg').setAttribute('fill', 'none');
        button.title = 'Add to favorites';
    } else {
        button.classList.remove('text-gray-400');
        button.classList.add('text-yellow-500');
        button.querySelector('svg').setAttribute('fill', 'currentColor');
        button.title = 'Remove from favorites';
    }

    // Update localStorage
    const favorites = JSON.parse(localStorage.getItem('favoriteTutors') || '[]');
    if (isActive) {
        const index = favorites.indexOf(tutorId);
        if (index > -1) favorites.splice(index, 1);
    } else {
        if (!favorites.includes(tutorId)) favorites.push(tutorId);
    }
    localStorage.setItem('favoriteTutors', JSON.stringify(favorites));

    // Trigger filter update if favorites filter is active
    if (document.querySelector('input[name="favorite"]:checked')) {
        FindTutorsController.loadTutors();
    }
};

window.toggleSave = function(tutorId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        alert('Please log in to save tutors');
        return;
    }

    const button = document.querySelector(`[data-id="${tutorId}"].save-btn`);
    const isActive = button.classList.contains('text-blue-500');

    // Toggle UI immediately for better UX
    if (isActive) {
        button.classList.remove('text-blue-500');
        button.classList.add('text-gray-400');
        button.querySelector('svg').setAttribute('fill', 'none');
        button.title = 'Save for later';
    } else {
        button.classList.remove('text-gray-400');
        button.classList.add('text-blue-500');
        button.querySelector('svg').setAttribute('fill', 'currentColor');
        button.title = 'Remove from saved';
    }

    // Update localStorage
    const saved = JSON.parse(localStorage.getItem('savedTutors') || '[]');
    if (isActive) {
        const index = saved.indexOf(tutorId);
        if (index > -1) saved.splice(index, 1);
    } else {
        if (!saved.includes(tutorId)) saved.push(tutorId);
    }
    localStorage.setItem('savedTutors', JSON.stringify(saved));

    // Trigger filter update if saved filter is active
    if (document.querySelector('input[name="saved"]:checked')) {
        FindTutorsController.loadTutors();
    }
};

window.requestCourse = function() {
    const searchTerm = document.getElementById('searchBar')?.value || '';
    const message = searchTerm
        ? `I'm looking for a course related to "${searchTerm}". Please help me find suitable tutors or training programs.`
        : `I'm looking for a specific course. Please help me find suitable tutors or training programs.`;

    // Could integrate with a contact form or support system
    if (confirm(`${message}\n\nWould you like to be contacted by our team?`)) {
        showNotification('Course request submitted! Our team will contact you soon.', 'success');
        // Here you could make an API call to submit the request
        // submitRequest('course', { searchTerm, message });
    }
};

window.requestSchool = function() {
    const searchTerm = document.getElementById('searchBar')?.value || '';
    const message = searchTerm
        ? `I'm looking for a school or training center related to "${searchTerm}". Please help me find suitable institutions.`
        : `I'm looking for a specific school or training center. Please help me find suitable institutions.`;

    // Could integrate with a contact form or support system
    if (confirm(`${message}\n\nWould you like to be contacted by our team?`)) {
        showNotification('School request submitted! Our team will contact you soon.', 'success');
        // Here you could make an API call to submit the request
        // submitRequest('school', { searchTerm, message });
    }
};

// Message a tutor - opens chat modal with the tutor
window.messageTutor = function(tutorData) {
    console.log('Opening chat with tutor:', tutorData);

    // Check if user is authenticated
    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    if (!token) {
        // Open login modal or redirect to login
        if (window.openAuthModal) {
            window.openAuthModal('login');
        } else {
            alert('Please log in to message tutors');
        }
        return;
    }

    // Handle both object and ID-only calls
    let tutor = tutorData;
    if (typeof tutorData === 'number' || typeof tutorData === 'string') {
        // If just an ID was passed, try to find the tutor in the current list
        const tutorId = parseInt(tutorData);
        tutor = FindTutorsState?.tutors?.find(t => t.id === tutorId);
        if (!tutor) {
            console.error('Tutor not found in current list');
            alert('Unable to start chat. Please try again.');
            return;
        }
    }

    // Build the target user object for chat modal
    // IMPORTANT: profile_id is the tutor's profile ID (tutor_profiles.id)
    // user_id should ONLY be set if we have a real user_id from the tutor data
    // DO NOT use profile_id as user_id - they are different!
    const targetUser = {
        id: tutor.user_id || null,  // Only set if we have real user_id
        user_id: tutor.user_id || null,  // Only set if we have real user_id, NOT profile_id
        profile_id: tutor.id,  // This is the tutor's profile_id (primary identifier for chat)
        full_name: tutor.full_name || `${tutor.first_name || ''} ${tutor.father_name || ''}`.trim(),
        name: tutor.full_name || `${tutor.first_name || ''} ${tutor.father_name || ''}`.trim(),
        profile_picture: tutor.profile_picture || tutor.avatar,
        avatar: tutor.profile_picture || tutor.avatar,
        role: 'tutor',
        profile_type: 'tutor',
        is_online: tutor.is_online || false
    };

    console.log('Target user for chat:', targetUser);

    // Open chat modal with the tutor
    if (typeof openChatModal === 'function') {
        openChatModal(targetUser);
        console.log('Chat modal opened for tutor:', targetUser.full_name);
    } else if (typeof ChatModalManager !== 'undefined') {
        // Initialize if needed
        if (typeof ChatModalManager.init === 'function' && !ChatModalManager.state?.isOpen) {
            ChatModalManager.init();
        }
        // Open with the tutor
        if (typeof ChatModalManager.openChatWithUser === 'function') {
            ChatModalManager.openChatWithUser(targetUser);
            console.log('Chat modal opened via ChatModalManager');
        } else if (typeof ChatModalManager.open === 'function') {
            ChatModalManager.open();
            // Select the tutor as a direct message target
            setTimeout(() => {
                if (ChatModalManager.selectDirectMessageTarget) {
                    ChatModalManager.selectDirectMessageTarget(targetUser);
                }
            }, 300);
        }
    } else {
        console.error('Chat modal not available');
        alert('Chat feature is not available. Please refresh the page.');
    }
};

// Helper to encode tutor data for onclick handlers
window.encodeTutorDataForOnclick = function(tutor) {
    return JSON.stringify(tutor).replace(/"/g, '&quot;');
};

// ============================================
// MOBILE MENU FUNCTIONS
// ============================================

// Toggle mobile menu
window.toggleMobileMenu = function() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

    if (!mobileMenu || !mobileMenuBtn) return;

    const isOpen = !mobileMenu.classList.contains('hidden');

    if (isOpen) {
        closeMobileMenu();
    } else {
        openMobileMenu();
    }
};

// Open mobile menu
window.openMobileMenu = function() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

    if (!mobileMenu) return;

    mobileMenu.classList.remove('hidden');
    if (mobileMenuBtn) mobileMenuBtn.classList.add('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('hidden');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Update mobile profile section visibility
    updateMobileProfileSection();
};

// Close mobile menu
window.closeMobileMenu = function() {
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');

    if (!mobileMenu) return;

    mobileMenu.classList.add('hidden');
    if (mobileMenuBtn) mobileMenuBtn.classList.remove('active');
    if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');

    // Restore body scroll
    document.body.style.overflow = '';
};

// Toggle mobile profile dropdown
window.toggleMobileProfileDropdown = function() {
    const dropdown = document.querySelector('.mobile-profile-dropdown');
    const toggle = document.getElementById('mobile-profile-toggle');

    if (dropdown) {
        dropdown.classList.toggle('open');
    }
    if (toggle) {
        toggle.classList.toggle('expanded');
    }
};

// Update mobile profile section based on auth state
window.updateMobileProfileSection = function() {
    const mobileProfileSection = document.getElementById('mobile-profile-section');
    const mobileAuthSection = document.getElementById('mobile-auth-section');
    const mobileNotificationBtn = document.getElementById('mobile-notification-btn');

    const token = localStorage.getItem('access_token') || localStorage.getItem('token');
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (token && currentUser) {
        // User is logged in
        if (mobileProfileSection) {
            mobileProfileSection.classList.remove('hidden');

            // Update profile info
            const profilePic = document.getElementById('mobile-profile-pic');
            const profileName = document.getElementById('mobile-profile-name');
            const profileRole = document.getElementById('mobile-profile-role');
            const dropdownPic = document.getElementById('mobile-dropdown-pic');
            const dropdownName = document.getElementById('mobile-dropdown-name');
            const dropdownEmail = document.getElementById('mobile-dropdown-email');
            const profileLink = document.getElementById('mobile-profile-link');

            const avatarUrl = currentUser.profile_picture_url || currentUser.profilePicture ||
                              '../images/default-avatar.png';
            const name = currentUser.name || currentUser.full_name || 'User';
            const email = currentUser.email || '';
            const role = localStorage.getItem('active_role') || currentUser.role || 'student';

            if (profilePic) profilePic.src = avatarUrl;
            if (profileName) profileName.textContent = name;
            if (profileRole) profileRole.textContent = role;
            if (dropdownPic) dropdownPic.src = avatarUrl;
            if (dropdownName) dropdownName.textContent = name;
            if (dropdownEmail) dropdownEmail.textContent = email;

            // Set profile link
            if (profileLink) {
                const profilePage = getProfilePageForRole(role);
                profileLink.href = profilePage;
            }
        }

        if (mobileAuthSection) mobileAuthSection.classList.add('hidden');
        if (mobileNotificationBtn) mobileNotificationBtn.classList.remove('hidden');
    } else {
        // User is logged out
        if (mobileProfileSection) mobileProfileSection.classList.add('hidden');
        if (mobileAuthSection) mobileAuthSection.classList.remove('hidden');
        if (mobileNotificationBtn) mobileNotificationBtn.classList.add('hidden');
    }
};

// Helper function to get profile page for role
function getProfilePageForRole(role) {
    const rolePages = {
        'tutor': '../profile-pages/tutor-profile.html',
        'student': '../profile-pages/student-profile.html',
        'parent': '../profile-pages/parent-profile.html',
        'advertiser': '../profile-pages/advertiser-profile.html'
    };
    return rolePages[role] || '../profile-pages/user-profile.html';
}

// Open notification modal
window.openNotificationModal = function() {
    const notificationModal = document.getElementById('notificationModal');
    if (notificationModal) {
        notificationModal.classList.add('open');
    }
};

// Open login modal (if available)
window.openLoginModal = function() {
    if (window.openAuthModal) {
        window.openAuthModal('login');
    } else if (window.openModal) {
        window.openModal('login-modal');
    }
};

// Open register modal (if available)
window.openRegisterModal = function() {
    if (window.openAuthModal) {
        window.openAuthModal('register');
    } else if (window.openModal) {
        window.openModal('register-modal');
    }
};

// Initialize mobile menu event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu button click
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    // Mobile menu overlay click to close
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    // Mobile theme toggle
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', function() {
            if (window.toggleTheme) {
                window.toggleTheme();
            } else {
                // Fallback theme toggle
                const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTheme = currentTheme === 'light' ? 'dark' : 'light';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
            }
        });
    }

    // Close mobile menu on window resize (if goes to desktop)
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024) {
            closeMobileMenu();
        }
    });

    // Initial update of mobile profile section
    updateMobileProfileSection();
});
