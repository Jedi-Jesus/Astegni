/**
 * Admin Initialization - Hamburger Menu and Profile Data Loading
 * This file handles sidebar toggle and loading admin profile data
 */

// Check if API_BASE_URL is defined
if (typeof API_BASE_URL === 'undefined') {
    var API_BASE_URL = 'https://api.astegni.com';
}

/**
 * Initialize Hamburger Menu and Sidebar
 */
function initializeSidebar() {
    const hamburger = document.getElementById('hamburger');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebar-close');

    if (!hamburger || !sidebar) {
        console.warn('Hamburger or sidebar elements not found');
        return;
    }

    // Toggle sidebar on hamburger click
    hamburger.addEventListener('click', function(e) {
        e.stopPropagation();
        sidebar.classList.toggle('active');
        hamburger.classList.toggle('active');
    });

    // Close sidebar on close button click
    if (sidebarClose) {
        sidebarClose.addEventListener('click', function() {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
        });
    }

    // Close sidebar when clicking outside
    document.addEventListener('click', function(e) {
        if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });

    // Prevent sidebar clicks from closing it
    sidebar.addEventListener('click', function(e) {
        e.stopPropagation();
    });

    // Close sidebar after clicking a link (mobile behavior)
    const sidebarLinks = sidebar.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            // On mobile, close sidebar after selection
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    sidebar.classList.remove('active');
                    hamburger.classList.remove('active');
                }, 100);
            }
        });
    });

    // Handle ESC key to close sidebar
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });

    console.log('Sidebar initialized successfully');
}

/**
 * Load Admin Profile Data
 */
async function loadAdminProfileData() {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            console.warn('No authentication token found');
            return;
        }

        // Fetch admin profile data
        const response = await fetch(`${API_BASE_URL}/api/admin/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load profile: ${response.status}`);
        }

        const data = await response.json();

        // Backend returns data directly (not wrapped in success/data object)
        if (data && data.id) {
            updateProfileHeader(data);
            console.log('Admin profile data loaded successfully');
        } else if (data.success && data.data) {
            // Fallback for wrapped response format
            updateProfileHeader(data.data);
            console.log('Admin profile data loaded successfully');
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
        // Use fallback data if API fails
        loadFallbackProfileData();
    }
}

/**
 * Update Profile Header with Admin Data
 */
function updateProfileHeader(profileData) {
    // Update username - use admin_username field from API (backend uses admin_username, not username)
    const usernameElement = document.getElementById('adminUsername');
    if (usernameElement) {
        usernameElement.textContent = profileData.admin_username || profileData.username || profileData.name || 'Admin User';
    }

    // Update profile picture (backend uses profile_picture_url)
    const profileAvatar = document.querySelector('.profile-avatar');
    if (profileAvatar && (profileData.profile_picture_url || profileData.profile_picture)) {
        profileAvatar.src = profileData.profile_picture_url || profileData.profile_picture;
    }

    // Update cover image (backend uses cover_picture_url)
    const coverImg = document.querySelector('.cover-img');
    if (coverImg && (profileData.cover_picture_url || profileData.cover_picture)) {
        coverImg.src = profileData.cover_picture_url || profileData.cover_picture;
    }

    // Update role badge
    const roleBadge = document.querySelector('.profile-badge.verified');
    if (roleBadge) {
        const roleText = profileData.role === 'super_admin' ? '✔ Super Admin' :
                        profileData.role === 'admin' ? '✔ Admin' :
                        '✔ ' + (profileData.role || 'Admin');
        roleBadge.textContent = roleText;
    }

    // Update location with phone and email (backend uses phone_number, not phone)
    const locationElement = document.querySelector('.profile-location span:last-child');
    if (locationElement) {
        let locationText = '';

        // Add location/department if available (backend returns 'department', not 'location')
        if (profileData.department || profileData.location) {
            locationText += profileData.department || profileData.location;
        }

        // Add phone if available (backend uses phone_number field)
        if (profileData.phone_number || profileData.phone) {
            locationText += (locationText ? ' | ' : '') + '📞 ' + (profileData.phone_number || profileData.phone);
        }

        // Add email if available
        if (profileData.email) {
            locationText += (locationText ? ' | ' : '') + '✉️ ' + profileData.email;
        }

        // Add default text if nothing is available
        if (!locationText) {
            locationText = 'Core System Configuration';
        }

        locationElement.textContent = locationText;
    }

    // Update quote
    const quoteElement = document.querySelector('.profile-quote span');
    if (quoteElement && profileData.bio) {
        quoteElement.textContent = `"${profileData.bio}"`;
    }

    // Update info items
    const accessLevelElement = document.querySelector('.info-item:nth-child(1) .info-value');
    if (accessLevelElement) {
        accessLevelElement.textContent = profileData.role === 'super_admin' ? 'Root Administrator' :
                                        profileData.role === 'admin' ? 'Administrator' :
                                        profileData.role || 'Administrator';
    }

    const systemIdElement = document.querySelector('.info-item:nth-child(2) .info-value');
    if (systemIdElement) {
        systemIdElement.textContent = `SYS-ADMIN-${String(profileData.id || '001').padStart(3, '0')}`;
    }

    const lastLoginElement = document.querySelector('.info-item:nth-child(3) .info-value');
    if (lastLoginElement && profileData.last_login) {
        const lastLogin = new Date(profileData.last_login);
        const today = new Date();
        const isToday = lastLogin.toDateString() === today.toDateString();

        if (isToday) {
            lastLoginElement.textContent = `Today at ${lastLogin.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            })}`;
        } else {
            lastLoginElement.textContent = lastLogin.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }

    // Store profile data for edit modal
    window.currentAdminProfile = profileData;
}

/**
 * Load Admin Profile Stats
 */
async function loadAdminProfileStats() {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return;
        }

        // This endpoint would need to be created if admin_profile_stats table exists
        const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success && data.stats) {
                updateProfileStats(data.stats);
            }
        }
    } catch (error) {
        console.error('Error loading admin stats:', error);
        // Stats are optional, so we can fail silently
    }
}

/**
 * Update Profile Stats in Header
 */
function updateProfileStats(stats) {
    // Update department/position if available
    if (stats.department || stats.position) {
        const descElement = document.querySelector('.info-description p');
        if (descElement) {
            const dept = stats.department || 'System Administration';
            const pos = stats.position || 'Root Administrator';
            descElement.textContent = `${pos} in ${dept}. ${descElement.textContent}`;
        }
    }

    // Update employee ID if available
    if (stats.employee_id) {
        const systemIdElement = document.querySelector('.info-item:nth-child(2) .info-value');
        if (systemIdElement) {
            systemIdElement.textContent = stats.employee_id;
        }
    }

    // Update access level if available
    if (stats.access_level) {
        const accessElement = document.querySelector('.info-item:nth-child(1) .info-value');
        if (accessElement) {
            accessElement.textContent = stats.access_level;
        }
    }
}

/**
 * Load Fallback Profile Data (when API fails)
 */
function loadFallbackProfileData() {
    // Try to get data from localStorage first
    const savedProfile = localStorage.getItem('adminProfile');

    if (savedProfile) {
        try {
            const profileData = JSON.parse(savedProfile);
            updateProfileHeader(profileData);
            return;
        } catch (e) {
            console.error('Error parsing saved profile:', e);
        }
    }

    // Use default fallback data (match backend API field names)
    const fallbackData = {
        id: 1,
        admin_username: 'admin',
        role: 'super_admin',
        department: 'Astegni Platform',
        phone_number: '+251911234567',
        email: 'admin@astegni.com',
        bio: 'Maintaining system integrity and optimal performance for all users.',
        last_login: new Date().toISOString()
    };

    updateProfileHeader(fallbackData);
}

/**
 * Pre-populate Edit Profile Modal
 */
function populateEditProfileModal() {
    if (!window.currentAdminProfile) {
        return;
    }

    const profile = window.currentAdminProfile;

    // Parse Ethiopian name format (First Father Grandfather)
    const nameParts = (profile.name || '').split(' ');

    // Populate name fields
    const firstNameInput = document.getElementById('firstNameInput');
    const fatherNameInput = document.getElementById('fatherNameInput');
    const grandfatherNameInput = document.getElementById('grandfatherNameInput');

    if (firstNameInput) firstNameInput.value = nameParts[0] || '';
    if (fatherNameInput) fatherNameInput.value = nameParts[1] || '';
    if (grandfatherNameInput) grandfatherNameInput.value = nameParts[2] || '';

    // Populate other fields (use correct field names from API)
    const usernameInput = document.getElementById('adminUsernameInput');
    const emailInput = document.getElementById('emailInput');
    const phoneInput = document.getElementById('phoneNumberInput');
    const bioInput = document.getElementById('bioInput');
    const quoteInput = document.getElementById('quoteInput');

    if (usernameInput) usernameInput.value = profile.admin_username || profile.username || profile.name || '';
    if (emailInput) emailInput.value = profile.email || '';
    if (phoneInput) phoneInput.value = profile.phone_number || profile.phone || '';
    if (bioInput) bioInput.value = profile.bio || '';
    if (quoteInput) quoteInput.value = profile.quote || profile.bio || '';
}

/**
 * Initialize everything when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing admin page components...');

    // Initialize sidebar/hamburger menu
    initializeSidebar();

    // Load admin profile data
    loadAdminProfileData();

    // Load admin stats (optional)
    loadAdminProfileStats();

    // Set up edit profile modal population
    const editProfileModal = document.getElementById('edit-profile-modal');
    if (editProfileModal) {
        // Add event listener to populate modal when opened
        const originalOpenFunction = window.openEditProfileModal;
        window.openEditProfileModal = function() {
            if (originalOpenFunction) {
                originalOpenFunction();
            } else {
                // If function doesn't exist, just show the modal
                editProfileModal.classList.remove('hidden');
            }
            // Populate the form
            populateEditProfileModal();
        };
    }

    console.log('Admin initialization complete');
});

// Export functions to window for global access
window.initializeSidebar = initializeSidebar;
window.loadAdminProfileData = loadAdminProfileData;
window.populateEditProfileModal = populateEditProfileModal;