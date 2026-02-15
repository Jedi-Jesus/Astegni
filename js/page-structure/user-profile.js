// User Profile JavaScript Module
// Handles user profile functionality, panel switching, and profile management

// Panel switching functionality
function switchPanel(panelName) {
    // Hide all panels
    const allPanels = document.querySelectorAll('.panel-content');
    allPanels.forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });

    // Show selected panel
    const selectedPanel = document.getElementById(`${panelName}-panel`);
    if (selectedPanel) {
        selectedPanel.classList.remove('hidden');
        selectedPanel.classList.add('active');
    }

    // Update sidebar active state
    const allSidebarLinks = document.querySelectorAll('.sidebar-link');
    allSidebarLinks.forEach(link => {
        link.classList.remove('active');
    });

    // Find and activate the corresponding sidebar link
    const activeLink = Array.from(allSidebarLinks).find(link =>
        link.getAttribute('onclick')?.includes(`'${panelName}'`)
    );
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Hide profile header for non-dashboard panels
    const profileHeader = document.querySelector('.profile-header-section');
    if (profileHeader) {
        if (panelName === 'dashboard') {
            profileHeader.style.display = 'block';
        } else {
            profileHeader.style.display = 'none';
        }
    }

    // Close sidebar on mobile after panel switch
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
    }
}

// Profile modal functions
// Store original email for OTP verification
let originalEmail = '';
let emailChangeVerified = false;
let newEmailToVerify = '';

// OLD FUNCTION REMOVED - See new implementation at line 1031

// OTP Functions for Email Change
async function sendEmailOTP() {
    const newEmail = document.getElementById('editEmail').value;

    if (!newEmail || !newEmail.includes('@')) {
        alert('Please enter a valid email address');
        return;
    }

    if (!window.AuthManager || !window.AuthManager.getToken()) {
        alert('You must be logged in to change your email');
        return;
    }

    const sendOtpBtn = document.getElementById('sendEmailOtpBtn');
    sendOtpBtn.disabled = true;
    sendOtpBtn.textContent = 'Sending...';

    try {
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/send-otp-email-change`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AuthManager.getToken()}`
            },
            body: JSON.stringify({ new_email: newEmail })
        });

        if (response.ok) {
            const data = await response.json();
            newEmailToVerify = newEmail;

            // Show OTP verification section
            document.getElementById('otpVerificationSection').style.display = 'block';
            document.getElementById('otpInput').value = '';

            // Start OTP timer (5 minutes)
            startOTPTimer(300);

            alert(`OTP sent to ${newEmail}. Please check your inbox.`);
            sendOtpBtn.style.display = 'none';
        } else {
            const error = await response.json();
            alert(`Failed to send OTP: ${error.detail || 'Unknown error'}`);
            sendOtpBtn.disabled = false;
            sendOtpBtn.textContent = 'Verify Email';
        }
    } catch (error) {
        console.error('Error sending OTP:', error);
        alert('Failed to send OTP. Please try again.');
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Verify Email';
    }
}

let otpTimerInterval = null;

function startOTPTimer(seconds) {
    const timerElement = document.getElementById('otpTimer');
    let remaining = seconds;

    // Clear any existing timer
    if (otpTimerInterval) {
        clearInterval(otpTimerInterval);
    }

    otpTimerInterval = setInterval(() => {
        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerElement.textContent = `OTP expires in ${minutes}:${secs.toString().padStart(2, '0')}`;

        remaining--;

        if (remaining < 0) {
            clearInterval(otpTimerInterval);
            timerElement.textContent = 'OTP expired. Please request a new one.';
        }
    }, 1000);
}

async function verifyEmailOTP() {
    const otpCode = document.getElementById('otpInput').value;

    if (!otpCode || otpCode.length !== 6) {
        alert('Please enter a valid 6-digit OTP');
        return;
    }

    if (!window.AuthManager || !window.AuthManager.getToken()) {
        alert('You must be logged in');
        return;
    }

    try {
        const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/verify-otp-email-change`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AuthManager.getToken()}`
            },
            body: JSON.stringify({
                new_email: newEmailToVerify,
                otp_code: otpCode
            })
        });

        if (response.ok) {
            emailChangeVerified = true;

            // Hide OTP section
            document.getElementById('otpVerificationSection').style.display = 'none';

            // Stop timer
            if (otpTimerInterval) {
                clearInterval(otpTimerInterval);
            }

            alert('Email verified successfully! You can now save your profile.');
        } else {
            const error = await response.json();
            alert(`Verification failed: ${error.detail || 'Invalid OTP'}`);
        }
    } catch (error) {
        console.error('Error verifying OTP:', error);
        alert('Failed to verify OTP. Please try again.');
    }
}

async function saveUserProfile() {
    // Get form values - Ethiopian name fields
    const firstName = document.getElementById('editFirstName').value.trim();
    const fatherName = document.getElementById('editFatherName').value.trim();
    const grandfatherName = document.getElementById('editGrandfatherName').value.trim();
    const location = document.getElementById('editLocation').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const interests = document.getElementById('editInterests').value.trim();
    const bio = document.getElementById('editBio').value.trim();
    const quote = document.getElementById('editQuote').value.trim();

    // Validate required fields
    if (!firstName || !fatherName || !grandfatherName) {
        alert('First name, Father name, and Grandfather name are required!');
        return;
    }

    // Check if email was changed and needs verification
    if (email !== originalEmail && email) {
        if (!emailChangeVerified) {
            alert('Please verify your new email address before saving. Click "Verify Email" button.');
            return;
        }
    }

    // Prepare data for API call
    const profileData = {
        first_name: firstName,
        father_name: fatherName,
        grandfather_name: grandfatherName,
        location,
        email,
        phone,
        interests,
        bio,
        quote
    };

    // Check if user is authenticated
    if (window.AuthManager && window.AuthManager.getToken()) {
        try {
            // Call backend API to update profile
            const response = await fetch(`${window.API_BASE_URL || 'http://localhost:8000'}/api/update-profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.AuthManager.getToken()}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                const updatedUser = await response.json();

                // Update local storage
                const currentUser = window.AuthManager.getUser();
                Object.assign(currentUser, updatedUser);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));

                // Update display
                updateProfileDisplay(firstName, fatherName, grandfatherName, location, email, phone, interests, bio, quote);

                // Close modal
                closeEditProfileModal();

                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification('Profile updated successfully!', 'success');
                } else {
                    alert('Profile updated successfully!');
                }
            } else {
                const error = await response.json();
                alert(`Failed to update profile: ${error.detail || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        }
    } else {
        // Offline mode - just update display
        updateProfileDisplay(firstName, fatherName, grandfatherName, location, email, phone, interests, bio, quote);
        closeEditProfileModal();
        alert('Profile updated (offline mode)');
    }
}

function updateProfileDisplay(firstName, fatherName, grandfatherName, location, email, phone, interests, bio, quote) {
    // Update full name display
    const fullName = `${firstName} ${fatherName} ${grandfatherName}`;
    document.getElementById('profile-name').textContent = fullName;

    if (location) document.getElementById('user-location').textContent = location;

    // Handle optional fields
    const emailContainer = document.getElementById('email-container');
    const phoneContainer = document.getElementById('phone-container');

    if (email) {
        document.getElementById('user-email').textContent = email;
        emailContainer.style.display = 'flex';
    } else {
        emailContainer.style.display = 'none';
    }

    if (phone) {
        document.getElementById('user-phone').textContent = phone;
        phoneContainer.style.display = 'flex';
    } else {
        phoneContainer.style.display = 'none';
    }

    if (interests) document.getElementById('user-interests').textContent = interests;
    if (bio) document.getElementById('user-bio').textContent = bio;
    if (quote) document.getElementById('user-quote').textContent = `"${quote}"`;
}

// Note: shareProfile() function is provided by share-profile-manager.js
// which is loaded after this file in user-profile.html

// Cover upload functions
let coverFile = null;

function openCoverUploadModal() {
    const modal = document.getElementById('coverUploadModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeCoverUploadModal() {
    const modal = document.getElementById('coverUploadModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    resetCoverUpload();
}

function handleCoverSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    coverFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('coverPreviewImg').src = e.target.result;
        document.getElementById('coverFileName').textContent = file.name;
        document.getElementById('coverFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
        document.getElementById('coverPreview').classList.remove('hidden');
        document.getElementById('coverUploadBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}

function resetCoverUpload() {
    coverFile = null;
    document.getElementById('coverInput').value = '';
    document.getElementById('coverPreview').classList.add('hidden');
    document.getElementById('coverUploadProgress').classList.add('hidden');
    document.getElementById('coverUploadBtn').disabled = true;
    document.getElementById('coverProgressFill').style.width = '0%';
    document.getElementById('coverProgressText').textContent = 'Uploading... 0%';
}

function uploadCoverImage() {
    if (!coverFile) return;

    // Show progress
    document.getElementById('coverUploadProgress').classList.remove('hidden');

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('coverProgressFill').style.width = progress + '%';
        document.getElementById('coverProgressText').textContent = `Uploading... ${progress}%`;

        if (progress >= 100) {
            clearInterval(interval);

            // Update cover image
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('cover-img').src = e.target.result;

                // Close modal
                closeCoverUploadModal();

                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification('Cover photo updated successfully!', 'success');
                } else {
                    alert('Cover photo updated successfully!');
                }
            };
            reader.readAsDataURL(coverFile);
        }
    }, 200);
}

// Profile picture upload functions
let profileFile = null;

function openProfileUploadModal() {
    const modal = document.getElementById('profileUploadModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeProfileUploadModal() {
    const modal = document.getElementById('profileUploadModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    resetProfileUpload();
}

function handleProfileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
    }

    profileFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('profilePreviewImg').src = e.target.result;
        document.getElementById('profileFileName').textContent = file.name;
        document.getElementById('profileFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
        document.getElementById('profilePreview').classList.remove('hidden');
        document.getElementById('profileUploadBtn').disabled = false;
    };
    reader.readAsDataURL(file);
}

function resetProfileUpload() {
    profileFile = null;
    document.getElementById('profileInput').value = '';
    document.getElementById('profilePreview').classList.add('hidden');
    document.getElementById('profileUploadProgress').classList.add('hidden');
    document.getElementById('profileUploadBtn').disabled = true;
    document.getElementById('profileProgressFill').style.width = '0%';
    document.getElementById('profileProgressText').textContent = 'Uploading... 0%';
}

function uploadProfileImage() {
    if (!profileFile) return;

    // Show progress
    document.getElementById('profileUploadProgress').classList.remove('hidden');

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('profileProgressFill').style.width = progress + '%';
        document.getElementById('profileProgressText').textContent = `Uploading... ${progress}%`;

        if (progress >= 100) {
            clearInterval(interval);

            // Update profile picture
            const reader = new FileReader();
            reader.onload = (e) => {
                document.getElementById('profile-avatar').src = e.target.result;

                // Close modal
                closeProfileUploadModal();

                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification('Profile picture updated successfully!', 'success');
                } else {
                    alert('Profile picture updated successfully!');
                }
            };
            reader.readAsDataURL(profileFile);
        }
    }, 200);
}

// FAB menu toggle
function toggleFabMenu() {
    const fabMenu = document.getElementById('fab-menu');
    const fabButton = document.getElementById('fab-button');

    if (fabMenu && fabButton) {
        fabMenu.classList.toggle('hidden');
        fabButton.classList.toggle('active');
    }
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeEditProfileModal();
        closeCoverUploadModal();
        closeProfileUploadModal();

        // Close FAB menu
        const fabMenu = document.getElementById('fab-menu');
        const fabButton = document.getElementById('fab-button');
        if (fabMenu && !fabMenu.classList.contains('hidden')) {
            fabMenu.classList.add('hidden');
            fabButton.classList.remove('active');
        }
    }
});

// Load saved profile data on page load
document.addEventListener('DOMContentLoaded', async () => {
    // ============================================
    // AUTHENTICATION CHECK
    // ============================================
    // Check if AuthManager is loaded
    if (typeof AuthManager === 'undefined' || typeof window.AuthManager === 'undefined') {
        console.error('❌ AuthManager not loaded! Redirecting to login...');
        alert('Authentication manager not loaded. Please refresh the page.');
        window.location.href = '../index.html';
        return;
    }

    // Wait for AuthManager to restore session
    await window.AuthManager.restoreSession();

    // Check if user is authenticated
    if (!window.AuthManager.isAuthenticated()) {
        console.warn('⚠️ User not authenticated. Redirecting to login...');
        alert('Please log in to access your profile.');
        window.location.href = '../index.html';
        return;
    }

    // FIX: Check if role switch is in progress FIRST (before getting userRole)
    // Use localStorage with timestamp - valid for 10 seconds after switch
    const switchTimestamp = localStorage.getItem('role_switch_timestamp');
    const targetRole = localStorage.getItem('role_switch_target');

    if (switchTimestamp && targetRole === 'user') {
        const timeSinceSwitch = Date.now() - parseInt(switchTimestamp);
        const isWithinGracePeriod = timeSinceSwitch < 10000; // 10 seconds grace period

        if (isWithinGracePeriod) {
            // Clear the flags after successful detection
            localStorage.removeItem('role_switch_timestamp');
            localStorage.removeItem('role_switch_target');

            console.log('✅ [UserProfile] Role switch detected (within 10s grace period) - allowing page load');
            console.log('✅ [UserProfile] Skipping role validation (user just switched roles)');
            // Continue to initialize the page - skip role validation entirely
        } else {
            // Grace period expired, clear flags and perform normal check
            console.log('⚠️ [UserProfile] Role switch grace period expired, clearing flags and performing normal role check');
            localStorage.removeItem('role_switch_timestamp');
            localStorage.removeItem('role_switch_target');

            // Fall through to normal role check below
            performNormalRoleCheck();
        }
    } else {
        // No role switch in progress - perform normal check
        performNormalRoleCheck();
    }

    function performNormalRoleCheck() {
        const userRole = window.AuthManager.getUserRole();
        const user = window.AuthManager.getUser();

        // DEBUG: Log detailed role information
        console.log('🔍 [UserProfile] Role Check Debug:', {
            userRole: userRole,
            user_active_role: user?.active_role,
            user_role: user?.role,
            user_roles: user?.roles,
            localStorage_userRole: localStorage.getItem('userRole'),
            localStorage_switchTimestamp: localStorage.getItem('role_switch_timestamp'),
            localStorage_switchTarget: localStorage.getItem('role_switch_target')
        });

        // More defensive role check - handle undefined, null, and string "undefined"
        const normalizedRole = userRole && userRole !== 'undefined' && userRole !== 'null' ? userRole : null;

        if (normalizedRole !== 'user') {
            console.warn(`⚠️ [UserProfile] User role is '${normalizedRole}', not 'user'. Redirecting...`);
            alert(`This page is for general users only. You are logged in as: ${normalizedRole || 'unknown'}\n\nPlease switch to your user role or log in with a user account.`);
            window.location.href = '../index.html';
            return;
        }
    }

    console.log('✅ Authentication verified for user profile');

    // ============================================
    // LOAD PROFILE DATA FROM API
    // ============================================
    await loadUserProfileData();

    // ============================================
    // LOAD CONNECTION STATISTICS
    // ============================================
    await loadConnectionStats();

    // ============================================
    // LOAD TRENDING TUTORS & RECOMMENDED TOPICS
    // ============================================
    await loadTrendingTutors();
    await loadRecommendedTopics();
});

// Navigation link handler
function handleNavLinkClick(event, page) {
    event.preventDefault();
    if (typeof openComingSoonModal === 'function') {
        openComingSoonModal();
    } else {
        alert(`${page} feature coming soon!`);
    }
}

// Quick action button styles
const quickActionStyle = document.createElement('style');
quickActionStyle.textContent = `
    .quick-action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        background: var(--card-bg);
        border: 2px solid rgba(var(--border-rgb), 0.2);
        border-radius: 12px;
        transition: all 0.3s ease;
        text-decoration: none;
        color: var(--text);
        cursor: pointer;
    }

    .quick-action-btn:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        border-color: var(--button-bg);
        background: rgba(var(--button-bg-rgb), 0.05);
    }
`;
document.head.appendChild(quickActionStyle);

// ============================================
// ENGAGEMENT FILTER FUNCTIONS
// ============================================

// State for current engagement filters
let currentEngagementFilter = 'likes'; // likes, saved, favorites, comments, shares, viewing-history

/**
 * Filter engagements by type (likes, saved, favorites, comments, shares, viewing-history)
 */
function filterEngagements(filterType) {
    currentEngagementFilter = filterType;

    // Update button active states
    const filterButtons = document.querySelectorAll('.engagement-filter-btn');
    filterButtons.forEach(btn => {
        if (btn.dataset.filter === filterType) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Load engagement data
    loadEngagementData();
}

/**
 * Load engagement data based on current filters
 */
function loadEngagementData() {
    const resultsContainer = document.getElementById('engagement-results');
    if (!resultsContainer) return;

    // Show loading state
    resultsContainer.innerHTML = '<p class="text-gray-500">Loading...</p>';

    // TODO: Fetch real data from API based on currentEngagementFilter
    // For now, show empty state
    setTimeout(() => {
        resultsContainer.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500 text-lg mb-2">No ${currentEngagementFilter} found</p>
                <p class="text-sm text-gray-400">You haven't ${currentEngagementFilter} any content yet</p>
            </div>
        `;
    }, 300);
}

// Initialize engagement panel when switching to it
const originalSwitchPanel = switchPanel;
switchPanel = function(panelName) {
    originalSwitchPanel(panelName);

    // Load engagement data when switching to my-engagements panel
    if (panelName === 'my-engagements') {
        loadEngagementData();
    }
};

console.log('User Profile module loaded successfully');

// ============================================
// USER PROFILE DATA MANAGEMENT
// ============================================

const API_BASE_URL_PROFILE = window.API_BASE_URL || 'http://localhost:8000';
let currentUserProfile = null;

/**
 * Load full user profile data on page load
 */
async function loadUserProfileData() {
    console.log('[loadUserProfileData] Starting to load user profile data...');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('[loadUserProfileData] No authentication token found');
            return;
        }

        console.log('[loadUserProfileData] Fetching from:', `${API_BASE_URL_PROFILE}/api/user/profile/full`);
        const response = await fetch(`${API_BASE_URL_PROFILE}/api/user/profile/full`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[loadUserProfileData] Response status:', response.status);
        if (!response.ok) {
            throw new Error('Failed to load profile data');
        }

        currentUserProfile = await response.json();
        console.log('[loadUserProfileData] Profile data received:', currentUserProfile);
        displayUserProfile(currentUserProfile);

    } catch (error) {
        console.error('[loadUserProfileData] Error loading user profile:', error);
    }
}

/**
 * Display user profile data in the UI
 */
function displayUserProfile(profile) {
    console.log('[displayUserProfile] Displaying profile:', profile);
    // Profile Header Section
    const profileNameEl = document.getElementById('profile-name');
    const navbarProfileNameEl = document.getElementById('navbar-profile-name');
    const usernameEl = document.getElementById('profile-username');
    const profileLocationEl = document.getElementById('user-location');
    const profilePicEl = document.getElementById('profile-pic');
    const coverImgEl = document.getElementById('cover-img');

    // Display name (from API - already built with naming convention logic)
    // API returns pre-built name based on Ethiopian or International naming convention
    let fullName = profile.name;

    // Fallback: Build name manually if API didn't provide it
    if (!fullName) {
        if (profile.grandfather_name) {
            // Ethiopian naming convention
            fullName = [profile.first_name, profile.father_name, profile.grandfather_name]
                .filter(Boolean)
                .join(' ');
        } else if (profile.last_name) {
            // International naming convention
            fullName = [profile.first_name, profile.last_name]
                .filter(Boolean)
                .join(' ');
        } else {
            // Fallback
            fullName = [profile.first_name, profile.father_name]
                .filter(Boolean)
                .join(' ');
        }
    }

    console.log('[displayUserProfile] Setting profile name to:', fullName);
    if (profileNameEl) {
        profileNameEl.textContent = fullName;
    } else {
        console.error('[displayUserProfile] profile-name element not found!');
    }

    // Also update navbar profile name
    if (navbarProfileNameEl) {
        navbarProfileNameEl.textContent = fullName;
    }

    // Display username (from user_profiles table - renamed for clarity)
    if (usernameEl) {
        usernameEl.textContent = profile.user_profile_username ? `@${profile.user_profile_username}` : '@username';
        // Add styling for placeholder
        if (!profile.user_profile_username) {
            usernameEl.style.opacity = '0.5';
        } else {
            usernameEl.style.opacity = '1';
        }
    }

    // Display location (from users table)
    if (profileLocationEl) {
        profileLocationEl.textContent = profile.location || 'Location not set';
    }

    // Display profile picture (from users table)
    if (profilePicEl && profile.profile_picture) {
        profilePicEl.src = profile.profile_picture;
    }

    // CRITICAL FIX: Also update the main profile avatar in the header section
    const profileAvatarEl = document.getElementById('profile-avatar');
    if (profileAvatarEl && profile.profile_picture) {
        console.log('[displayUserProfile] Setting profile-avatar src to:', profile.profile_picture);
        profileAvatarEl.src = profile.profile_picture;
        profileAvatarEl.onerror = function() {
            console.warn('[displayUserProfile] Failed to load profile picture, using placeholder');
            // Keep the default placeholder SVG if image fails to load
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-family='sans-serif' font-size='16'%3E150x150%3C/text%3E%3C/svg%3E";
        };
    } else if (profileAvatarEl) {
        console.log('[displayUserProfile] No profile_picture in profile data, keeping placeholder');
    }

    // Display cover image (from user_profiles table)
    if (coverImgEl && profile.user_profile_cover_image) {
        coverImgEl.src = profile.user_profile_cover_image;
    }

    // Profile Details Section
    const userQuoteEl = document.getElementById('user-quote');
    const userBioEl = document.getElementById('user-bio');
    const userInterestsEl = document.getElementById('user-interests');
    const userEmailEl = document.getElementById('user-email');
    const userPhoneEl = document.getElementById('user-phone');
    const emailContainer = document.getElementById('email-container');

    // Quote (from user_profiles table)
    if (userQuoteEl) {
        userQuoteEl.textContent = profile.user_profile_quote || '"Learning is a journey, not a destination."';
    }

    // Bio (from user_profiles table)
    if (userBioEl) {
        userBioEl.textContent = profile.user_profile_about || profile.bio || 'No bio available';
    }

    // Interests (from user_profiles table)
    if (userInterestsEl) {
        const interests = profile.user_profile_interests || profile.user_profile_interested_in;
        if (Array.isArray(interests) && interests.length > 0) {
            userInterestsEl.textContent = interests.join(', ');
        } else {
            userInterestsEl.textContent = 'Not specified';
        }
    }

    // Email (from users table) - ALWAYS display
    if (userEmailEl && emailContainer) {
        userEmailEl.textContent = profile.email || 'Not specified';
        emailContainer.style.display = 'flex';  // Always show email container
    }

    // Phone (from users table)
    const phoneContainer = document.getElementById('phone-container');
    if (userPhoneEl && phoneContainer) {
        if (profile.phone) {
            userPhoneEl.textContent = profile.phone;
            phoneContainer.style.display = 'flex';
        } else {
            phoneContainer.style.display = 'none';
        }
    }

    // Member since (from user_profiles.created_at - when user role was added)
    const userJoinedEl = document.getElementById('user-joined');
    if (userJoinedEl) {
        if (profile.user_profile_created_at) {
            // Use user_profiles.created_at (when user role was added)
            const joinDate = new Date(profile.user_profile_created_at);
            userJoinedEl.textContent = joinDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        } else if (profile.user_created_at) {
            // Fallback to users.created_at
            const joinDate = new Date(profile.user_created_at);
            userJoinedEl.textContent = joinDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long'
            });
        }
    }

    // Hero section (if present on page)
    const heroTitleEl = document.getElementById('typedText');
    const heroSubtitleEl = document.getElementById('hero-subtitle');

    if (heroTitleEl && profile.user_profile_hero_title) {
        heroTitleEl.textContent = profile.user_profile_hero_title;
    }

    if (heroSubtitleEl && profile.user_profile_hero_subtitle) {
        heroSubtitleEl.textContent = profile.user_profile_hero_subtitle;
    }

    // Mobile Profile Section
    const mobileProfilePicEl = document.getElementById('mobile-profile-pic');
    const mobileProfileNameEl = document.getElementById('mobile-profile-name');
    const mobileProfileRoleEl = document.getElementById('mobile-profile-role');

    // Update mobile profile picture
    if (mobileProfilePicEl && profile.profile_picture) {
        mobileProfilePicEl.src = profile.profile_picture;
    }

    // Update mobile profile name
    if (mobileProfileNameEl) {
        mobileProfileNameEl.textContent = fullName;
    }

    // Update mobile profile role (display active role)
    if (mobileProfileRoleEl && profile.active_role) {
        // Capitalize first letter of role
        const roleDisplay = profile.active_role.charAt(0).toUpperCase() + profile.active_role.slice(1);
        mobileProfileRoleEl.textContent = roleDisplay;
    }

    // Display Social Links (from users table)
    displaySocialLinks(profile.social_links);

    console.log('[displayUserProfile] Profile display complete');
}

/**
 * Display social media links from database
 * @param {Object} socialLinks - Object containing social media URLs from users.social_links (JSON field)
 */
function displaySocialLinks(socialLinks) {
    console.log('[displaySocialLinks] Rendering social links:', socialLinks);
    const container = document.getElementById('social-links-container');

    if (!container) {
        console.warn('[displaySocialLinks] Container not found');
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    // If no social links, hide container
    if (!socialLinks || Object.keys(socialLinks).length === 0) {
        console.log('[displaySocialLinks] No social links to display');
        container.style.display = 'none';
        return;
    }

    // Social media platform configurations
    const platforms = {
        twitter: {
            name: 'Twitter',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
            </svg>`,
            color: '#1DA1F2',
            hoverColor: '#1a91da'
        },
        linkedin: {
            name: 'LinkedIn',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"></path>
                <circle cx="4" cy="4" r="2"></circle>
            </svg>`,
            color: '#0A66C2',
            hoverColor: '#004182'
        },
        facebook: {
            name: 'Facebook',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3V2z"></path>
            </svg>`,
            color: '#1877F2',
            hoverColor: '#165ed0'
        },
        instagram: {
            name: 'Instagram',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>`,
            color: '#E4405F',
            hoverColor: '#d32f4f'
        },
        youtube: {
            name: 'YouTube',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.4 19.6c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"></path>
            </svg>`,
            color: '#FF0000',
            hoverColor: '#cc0000'
        },
        github: {
            name: 'GitHub',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path>
            </svg>`,
            color: '#333333',
            hoverColor: '#24292e'
        },
        tiktok: {
            name: 'TikTok',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"></path>
            </svg>`,
            color: '#000000',
            hoverColor: '#2b2b2b'
        },
        telegram: {
            name: 'Telegram',
            icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"></path>
            </svg>`,
            color: '#0088cc',
            hoverColor: '#006699'
        }
    };

    // Build social links HTML
    let hasLinks = false;

    for (const [platform, url] of Object.entries(socialLinks)) {
        if (url && url.trim() !== '') {
            hasLinks = true;
            const config = platforms[platform.toLowerCase()];

            if (config) {
                const linkEl = document.createElement('a');
                linkEl.href = url;
                linkEl.target = '_blank';
                linkEl.rel = 'noopener noreferrer';
                linkEl.title = config.name;
                linkEl.style.cssText = `
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background-color: ${config.color};
                    color: white;
                    transition: all 0.3s ease;
                    text-decoration: none;
                `;

                // Hover effect
                linkEl.addEventListener('mouseenter', function() {
                    this.style.backgroundColor = config.hoverColor;
                    this.style.transform = 'translateY(-3px) scale(1.1)';
                    this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                });

                linkEl.addEventListener('mouseleave', function() {
                    this.style.backgroundColor = config.color;
                    this.style.transform = 'translateY(0) scale(1)';
                    this.style.boxShadow = 'none';
                });

                linkEl.innerHTML = config.icon;
                container.appendChild(linkEl);
            }
        }
    }

    // Show/hide container based on whether we have links
    if (hasLinks) {
        container.style.display = 'flex';
        console.log('[displaySocialLinks] Displayed social links successfully');
    } else {
        container.style.display = 'none';
        console.log('[displaySocialLinks] No valid social links found');
    }
}

/**
 * Open edit profile modal and populate with current data
 * Loads data from both users table and user_profiles table
 */
function openEditProfileModal() {
    console.log('[openEditProfileModal] Opening edit modal with profile:', currentUserProfile);
    const modal = document.getElementById('editProfileModal');
    if (!modal) {
        console.error('[openEditProfileModal] Modal not found');
        return;
    }

    // Populate form fields with current data
    if (currentUserProfile) {
        // From user_profiles table
        document.getElementById('editUsername').value = currentUserProfile.user_profile_username || '';
        document.getElementById('editHeroTitle').value = currentUserProfile.user_profile_hero_title || '';
        document.getElementById('editHeroSubtitle').value = currentUserProfile.user_profile_hero_subtitle || '';
        document.getElementById('editQuote').value = currentUserProfile.user_profile_quote || '';

        // About - try user_profiles.about first, fallback to users.bio
        const aboutValue = currentUserProfile.user_profile_about || currentUserProfile.bio || '';
        document.getElementById('editAbout').value = aboutValue;

        // From users table
        document.getElementById('editLocation').value = currentUserProfile.location || '';

        // Languages (array to comma-separated string) - from users table
        const languages = currentUserProfile.languages || [];
        document.getElementById('editLanguages').value = Array.isArray(languages) ? languages.join(', ') : '';

        // Interested in (array to comma-separated string) - from user_profiles table
        const interests = currentUserProfile.user_profile_interested_in || currentUserProfile.user_profile_interests || [];
        document.getElementById('editInterestedIn').value = Array.isArray(interests) ? interests.join(', ') : '';

        // Social links - from users table
        const socialLinks = currentUserProfile.social_links || {};
        document.getElementById('editTwitter').value = socialLinks.twitter || '';
        document.getElementById('editLinkedIn').value = socialLinks.linkedin || '';
        document.getElementById('editFacebook').value = socialLinks.facebook || '';
        document.getElementById('editInstagram').value = socialLinks.instagram || '';

        // Load display_location checkbox (show/hide location on public profile)
        const displayLocationCheckbox = document.getElementById('editDisplayLocation');
        if (displayLocationCheckbox) {
            displayLocationCheckbox.checked = currentUserProfile.display_location === true;
            console.log('[User Edit] display_location loaded:', currentUserProfile.display_location);
        }

        // Disable GPS detection checkbox and show "Change Location" button if location exists
        const allowLocationCheckbox = document.getElementById('editAllowLocation');
        const changeLocationBtn = document.getElementById('changeLocationBtn');
        if (allowLocationCheckbox && currentUserProfile.location) {
            allowLocationCheckbox.checked = false;
            allowLocationCheckbox.disabled = true; // Make unselectable
            if (changeLocationBtn) {
                changeLocationBtn.classList.remove('hidden');
            }
            console.log('[User Edit] GPS checkbox disabled (location exists, click Change Location to modify)');
        }

        console.log('[openEditProfileModal] Form populated successfully');
    } else {
        console.warn('[openEditProfileModal] No currentUserProfile data available');
    }

    modal.classList.remove('hidden');
}

/**
 * Close edit profile modal
 */
function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Save user profile changes
 */
async function saveUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please login to continue');
            return;
        }

        // Get form data
        const username = document.getElementById('editUsername').value.trim();
        const heroTitle = document.getElementById('editHeroTitle').value.trim();
        const heroSubtitle = document.getElementById('editHeroSubtitle').value.trim();
        const location = document.getElementById('editLocation').value.trim();
        const quote = document.getElementById('editQuote').value.trim();
        const about = document.getElementById('editAbout').value.trim();

        // Parse comma-separated values to arrays
        const languagesStr = document.getElementById('editLanguages').value.trim();
        const languages = languagesStr ? languagesStr.split(',').map(l => l.trim()).filter(Boolean) : [];

        const interestedInStr = document.getElementById('editInterestedIn').value.trim();
        const interestedIn = interestedInStr ? interestedInStr.split(',').map(i => i.trim()).filter(Boolean) : [];

        // Social links
        const socialLinks = {
            twitter: document.getElementById('editTwitter').value.trim(),
            linkedin: document.getElementById('editLinkedIn').value.trim(),
            facebook: document.getElementById('editFacebook').value.trim(),
            instagram: document.getElementById('editInstagram').value.trim()
        };

        // Get display_location checkbox value
        const displayLocationCheckbox = document.getElementById('editDisplayLocation');
        const displayLocation = displayLocationCheckbox?.checked || false;
        console.log('[User Save] display_location value:', displayLocation);

        // Prepare update data for both tables
        // Location goes to users table, rest goes to user_profiles table
        const updateData = {
            // For users table
            location: location || null,
            display_location: displayLocation,

            // For user_profiles table
            username: username || null,
            hero_title: heroTitle || null,
            hero_subtitle: heroSubtitle || null,
            quote: quote || null,
            bio: about || null,  // Store as 'bio' in user_profiles table
            languages: languages,
            interested_in: interestedIn,
            social_links: socialLinks
        };

        // Send update request to full profile endpoint (updates both tables)
        const response = await fetch(`${API_BASE_URL_PROFILE}/api/user/profile/full`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || 'Failed to update profile');
        }

        // Show success message
        if (window.showToast) {
            window.showToast('Profile updated successfully!', 'success');
        } else {
            alert('Profile updated successfully!');
        }

        // Close modal
        closeEditProfileModal();

        // Reload profile data
        await loadUserProfileData();

    } catch (error) {
        console.error('Error saving profile:', error);
        if (window.showToast) {
            window.showToast(error.message || 'Failed to update profile', 'error');
        } else {
            alert(error.message || 'Failed to update profile');
        }
    }
}

// Note: shareProfile() function is now provided by share-profile-manager.js
// which is loaded after this file in user-profile.html and provides
// full referral tracking functionality

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadUserProfileData();
});

// Export functions to window for global access
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveUserProfile = saveUserProfile;
// Note: window.shareProfile is set by share-profile-manager.js
window.loadUserProfileData = loadUserProfileData;


/**
 * Load connection statistics from the connections table
 */
async function loadConnectionStats() {
    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        // Use the dedicated stats endpoint that returns all counts in one call
        const response = await fetch(`${API_BASE_URL}/api/connections/stats?role=user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const stats = await response.json();

            // Update the stat boxes with the data from the API
            const connectionsCountEl = document.getElementById('connections-count');
            const pendingRequestsCountEl = document.getElementById('pending-requests-count');
            const receivedRequestsCountEl = document.getElementById('received-requests-count');

            if (connectionsCountEl) {
                connectionsCountEl.textContent = stats.accepted_count || 0;
            }
            if (pendingRequestsCountEl) {
                pendingRequestsCountEl.textContent = stats.outgoing_requests || 0;
            }
            if (receivedRequestsCountEl) {
                receivedRequestsCountEl.textContent = stats.incoming_requests || 0;
            }

            console.log('[loadConnectionStats] Stats loaded:', stats);
        } else {
            console.error('[loadConnectionStats] Failed to load stats:', response.status);
        }

    } catch (error) {
        console.error('[loadConnectionStats] Error loading connection stats:', error);
    }
}

/**
 * NOTE: openChatModal() and openCommunityModal() are now provided by:
 * - chat-modal.js (for chat)
 * - community-modal-manager.js (for community)
 * These scripts are loaded in user-profile.html and provide the global functions.
 */

/**
 * Load trending tutors with continuous cycling
 */
async function loadTrendingTutors() {
    try {
        const container = document.getElementById('trending-tutors-container');
        if (!container) return;

        // Fetch more trending tutors for continuous cycling
        const response = await fetch(`${API_BASE_URL}/api/tutors/trending?limit=20&min_searches=1`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const allTutors = data.trending_tutors || [];

        if (allTutors.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-sm text-gray-500">No trending tutors yet</p>
                </div>
            `;
            return;
        }

        // Initialize container with fade transition
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.5s ease-in-out';

        let currentIndex = 0;
        const tutorsPerPage = 5;

        // Function to render a batch of tutors
        function renderTutorBatch(tutors) {
            return tutors.map(tutor => {
                const fullName = `${tutor.first_name || ''} ${tutor.father_name || ''}`.trim();

                // Generate initials from first_name and father_name/last_name
                const firstName = tutor.first_name || '';
                const secondName = tutor.father_name || tutor.last_name || '';
                const initials = (firstName.charAt(0) + secondName.charAt(0)).toUpperCase();

                // Generate background color based on name
                const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
                const colorIndex = (firstName.charCodeAt(0) + secondName.charCodeAt(0)) % colors.length;
                const bgColor = colors[colorIndex];

                // Get rating
                const rating = tutor.rating ? `${tutor.rating.toFixed(1)}⭐` : null;

                // Get subjects/courses
                let subjects = 'Various Subjects';
                if (tutor.subjects && Array.isArray(tutor.subjects) && tutor.subjects.length > 0) {
                    subjects = tutor.subjects.slice(0, 2).join(', ');
                } else if (tutor.subject) {
                    subjects = tutor.subject;
                }

                // Get institution/school
                const institution = tutor.teaches_at || tutor.institution || tutor.location || '';

                // Build info line: "Rating • Subject • Institution" (skip rating if not available)
                let infoLine = '';
                if (rating && institution) {
                    infoLine = `${rating} • ${subjects} • ${institution}`;
                } else if (rating) {
                    infoLine = `${rating} • ${subjects}`;
                } else if (institution) {
                    infoLine = `${subjects} • ${institution}`;
                } else {
                    infoLine = subjects;
                }

                // Use profile picture if available, otherwise show initials
                const avatarHTML = tutor.profile_picture
                    ? `<img src="${tutor.profile_picture}"
                            alt="${fullName}"
                            class="w-12 h-12 rounded-full object-cover">`
                    : `<div class="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                            style="background-color: ${bgColor}">
                            ${initials}
                       </div>`;

                return `
                    <div class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-all">
                        ${avatarHTML}
                        <div class="flex-1">
                            <p class="font-semibold text-sm">${fullName}</p>
                            <p class="text-xs text-gray-500">${infoLine}</p>
                        </div>
                        <a href="../view-profiles/view-tutor.html?id=${tutor.user_id}"
                           class="px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded hover:bg-blue-600 transition-colors">
                            View
                        </a>
                    </div>
                `;
            }).join('');
        }

        // Function to cycle through tutors
        async function cycleTutors() {
            // Get next batch of tutors
            const batch = allTutors.slice(currentIndex, currentIndex + tutorsPerPage);

            // If we've reached the end, restart from beginning
            if (batch.length === 0 || currentIndex >= allTutors.length) {
                currentIndex = 0;
                return cycleTutors(); // Restart cycle
            }

            // Fade out current content
            container.style.opacity = '0';
            await delay(500);

            // Render new batch
            container.innerHTML = renderTutorBatch(batch);

            // Fade in new content
            container.style.opacity = '1';
            await delay(500);

            // Move to next batch
            currentIndex += tutorsPerPage;

            // Wait before showing next batch (3 seconds display time)
            await delay(3000);

            // Continue cycling
            cycleTutors();
        }

        // Start the cycling
        cycleTutors();

        console.log(`[loadTrendingTutors] Started cycling ${allTutors.length} trending tutors`);

    } catch (error) {
        console.error('[loadTrendingTutors] Error loading trending tutors:', error);
        const container = document.getElementById('trending-tutors-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-sm text-red-500">Failed to load trending tutors</p>
                </div>
            `;
        }
    }
}

/**
 * Load recommended topics (top tier courses and schools) with continuous cycling
 */
async function loadRecommendedTopics() {
    try {
        const container = document.getElementById('recommended-topics-widget');
        if (!container) return;

        console.log('[loadRecommendedTopics] Loading recommended topics...');

        // Fetch more courses and schools for continuous cycling
        const [coursesResponse, schoolsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/api/trending/courses?limit=20&min_searches=1`),
            fetch(`${API_BASE_URL}/api/trending/schools?limit=20&min_searches=1`)
        ]);

        let courses = [];
        let schools = [];

        if (coursesResponse.ok) {
            const coursesData = await coursesResponse.json();
            courses = coursesData.trending_courses || [];
        }

        if (schoolsResponse.ok) {
            const schoolsData = await schoolsResponse.json();
            schools = schoolsData.trending_schools || [];
        }

        // Handle empty states
        if (courses.length === 0 && schools.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-inbox text-3xl mb-2 text-gray-400"></i>
                    <p class="text-sm text-gray-500">No topics available yet</p>
                </div>
            `;
            return;
        }

        // Prepare all topics in a single array for cycling
        const allTopics = [];

        // Add all courses
        courses.forEach(course => {
            allTopics.push({
                type: 'course',
                id: course.id,
                name: course.course_name,
                category: course.course_category,
                rating: course.rating,
                icon: getCourseIcon(course.course_category)
            });
        });

        // Add all schools
        schools.forEach(school => {
            allTopics.push({
                type: 'school',
                id: school.id,
                name: school.name,
                category: school.type,
                rating: school.rating,
                icon: '🏫',
                students: school.student_count
            });
        });

        // Initialize container with fade transition
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.5s ease-in-out';

        let currentIndex = 0;
        const itemsPerPage = 5;

        // Function to cycle through topics
        async function cycleTopics() {
            // Get next batch of topics
            const batch = allTopics.slice(currentIndex, currentIndex + itemsPerPage);

            // If we've reached the end, restart from beginning
            if (batch.length === 0 || currentIndex >= allTopics.length) {
                currentIndex = 0;
                return cycleTopics(); // Restart cycle
            }

            // Fade out current content
            await fadeOut(container);
            await delay(300);

            // Render new batch
            renderTopics(container, batch);

            // Fade in new content
            await fadeIn(container);

            // Move to next batch
            currentIndex += itemsPerPage;

            // Wait before showing next batch (3 seconds display time)
            await delay(3000);

            // Continue cycling
            cycleTopics();
        }

        // Start the cycling
        cycleTopics();

        console.log(`[loadRecommendedTopics] Started cycling ${allTopics.length} topics (${courses.length} courses, ${schools.length} schools)`);

    } catch (error) {
        console.error('[loadRecommendedTopics] Error loading topics:', error);
        const container = document.getElementById('recommended-topics-widget');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2 text-yellow-500"></i>
                    <p class="text-sm text-gray-500">Failed to load topics</p>
                </div>
            `;
        }
    }
}

/**
 * Render topics into container
 */
function renderTopics(container, topics) {
    container.innerHTML = topics.map(topic => {
        const ratingStars = topic.rating ? '⭐'.repeat(Math.round(topic.rating)) : '';
        const subtitle = topic.type === 'course'
            ? topic.category
            : `${topic.students || 0} students`;

        return `
            <div class="topic-item" onclick="handleTopicClick('${topic.type}', ${topic.id})">
                <span class="topic-icon">${topic.icon}</span>
                <div class="topic-info">
                    <p class="topic-name">${topic.name}</p>
                    <p class="topic-subtitle">${subtitle}</p>
                </div>
                <span class="topic-rating">${ratingStars}</span>
            </div>
        `;
    }).join('');
}

/**
 * Fade in animation
 */
function fadeIn(element) {
    return new Promise(resolve => {
        element.style.opacity = '1';
        setTimeout(resolve, 500); // Match transition duration
    });
}

/**
 * Fade out animation
 */
function fadeOut(element) {
    return new Promise(resolve => {
        element.style.opacity = '0';
        setTimeout(resolve, 500); // Match transition duration
    });
}

/**
 * Delay helper
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get icon for course category
 */
function getCourseIcon(category) {
    const icons = {
        'STEM': '🔬',
        'Mathematics': '📐',
        'Math': '📐',
        'Science': '🧪',
        'Technology': '💻',
        'Engineering': '⚙️',
        'Arts': '🎨',
        'Music': '🎵',
        'Languages': '🗣️',
        'Business': '💼',
        'Education': '📚',
        'Sports & Fitness': '🏃',
        'Beauty & Wellness': '💄'
    };
    return icons[category] || '📚';
}

/**
 * Handle topic click
 */
function handleTopicClick(type, id) {
    if (type === 'course') {
        // Navigate to course page or search tutors by course
        window.location.href = `../branch/find-tutors.html?course_id=${id}`;
    } else if (type === 'school') {
        // Navigate to school page or search tutors by school
        window.location.href = `../branch/find-tutors.html?school_id=${id}`;
    }
}

/**
 * Handle "Change Location" button click - enables GPS checkbox
 */
function handleChangeLocationUser() {
    const allowLocationCheckbox = document.getElementById('editAllowLocation');
    const changeLocationBtn = document.getElementById('changeLocationBtn');

    if (allowLocationCheckbox) {
        allowLocationCheckbox.disabled = false; // Enable the checkbox
        allowLocationCheckbox.checked = false; // Uncheck it
        console.log('[User Edit] GPS checkbox enabled for location change');
    }

    if (changeLocationBtn) {
        changeLocationBtn.classList.add('hidden'); // Hide the button
    }
}

// Export connection stats function to window
window.loadConnectionStats = loadConnectionStats;
window.loadTrendingTutors = loadTrendingTutors;
window.loadRecommendedTopics = loadRecommendedTopics;
window.handleChangeLocationUser = handleChangeLocationUser;
