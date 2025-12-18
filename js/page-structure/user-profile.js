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

function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.remove('hidden');

        // Get current user from authManager
        const currentUser = window.AuthManager ? window.AuthManager.getUser() : null;

        // Load current profile data - separate name fields
        if (currentUser) {
            document.getElementById('editFirstName').value = currentUser.first_name || '';
            document.getElementById('editFatherName').value = currentUser.father_name || '';
            document.getElementById('editGrandfatherName').value = currentUser.grandfather_name || '';
            originalEmail = currentUser.email || '';
            document.getElementById('editEmail').value = currentUser.email || '';
            document.getElementById('editPhone').value = currentUser.phone || '';
        } else {
            // Fallback to parsing display name
            const fullName = document.getElementById('userName').textContent || '';
            const nameParts = fullName.split(' ');
            document.getElementById('editFirstName').value = nameParts[0] || '';
            document.getElementById('editFatherName').value = nameParts[1] || '';
            document.getElementById('editGrandfatherName').value = nameParts[2] || '';
            originalEmail = document.getElementById('user-email').textContent || '';
            document.getElementById('editEmail').value = originalEmail;
            document.getElementById('editPhone').value = document.getElementById('user-phone').textContent || '';
        }

        document.getElementById('editLocation').value = document.getElementById('user-location').textContent || '';
        document.getElementById('editInterests').value = document.getElementById('user-interests').textContent || '';
        document.getElementById('editBio').value = document.getElementById('user-bio').textContent || '';
        document.getElementById('editQuote').value = document.getElementById('user-quote').textContent.replace(/"/g, '') || '';

        // Reset OTP verification state
        emailChangeVerified = false;
        newEmailToVerify = '';
        document.getElementById('otpVerificationSection').style.display = 'none';
        document.getElementById('sendEmailOtpBtn').style.display = 'none';

        // Monitor email changes
        document.getElementById('editEmail').addEventListener('input', handleEmailChange);
    }
}

function handleEmailChange(event) {
    const newEmail = event.target.value;
    const sendOtpBtn = document.getElementById('sendEmailOtpBtn');

    // Show OTP button only if email has changed and is valid
    if (newEmail !== originalEmail && newEmail && newEmail.includes('@')) {
        sendOtpBtn.style.display = 'inline-block';
        emailChangeVerified = false;
    } else {
        sendOtpBtn.style.display = 'none';
        emailChangeVerified = newEmail === originalEmail; // If same as original, no verification needed
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        // Remove event listener
        document.getElementById('editEmail').removeEventListener('input', handleEmailChange);
    }
}

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
        const response = await fetch('http://localhost:8000/api/send-otp-email-change', {
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
        const response = await fetch('http://localhost:8000/api/verify-otp-email-change', {
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
            const response = await fetch('http://localhost:8000/api/update-profile', {
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
    document.getElementById('userName').textContent = fullName;

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

// Share profile function
function shareProfile() {
    const profileUrl = window.location.href;

    if (navigator.share) {
        navigator.share({
            title: 'My Astegni Profile',
            text: 'Check out my profile on Astegni!',
            url: profileUrl
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(profileUrl).then(() => {
            if (typeof showNotification === 'function') {
                showNotification('Profile link copied to clipboard!', 'success');
            } else {
                alert('Profile link copied to clipboard!');
            }
        });
    }
}

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
document.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('userProfileData');
    if (savedData) {
        try {
            const profileData = JSON.parse(savedData);

            if (profileData.fullName) document.getElementById('userName').textContent = profileData.fullName;
            if (profileData.location) document.getElementById('user-location').textContent = profileData.location;

            const emailContainer = document.getElementById('email-container');
            const phoneContainer = document.getElementById('phone-container');

            if (profileData.email) {
                document.getElementById('user-email').textContent = profileData.email;
                emailContainer.style.display = 'flex';
            }

            if (profileData.phone) {
                document.getElementById('user-phone').textContent = profileData.phone;
                phoneContainer.style.display = 'flex';
            }

            if (profileData.interests) document.getElementById('user-interests').textContent = profileData.interests;
            if (profileData.bio) document.getElementById('user-bio').textContent = profileData.bio;
            if (profileData.quote) document.getElementById('user-quote').textContent = `"${profileData.quote}"`;
        } catch (error) {
            console.error('Error loading profile data:', error);
        }
    }
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
let currentEngagementFilter = 'likes'; // likes, saved, favorites, comments
let currentEngagementType = 'tutors'; // tutors, reels

/**
 * Filter engagements by type (likes, saved, favorites, comments)
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
 * Filter engagements by content type (tutors, reels)
 */
function filterEngagementType(contentType) {
    currentEngagementType = contentType;

    // Update button active states
    const typeButtons = document.querySelectorAll('.engagement-type-btn');
    typeButtons.forEach(btn => {
        if (btn.dataset.type === contentType) {
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

    // Simulate API call delay
    setTimeout(() => {
        // Sample data for demonstration
        const sampleData = generateSampleEngagementData(currentEngagementFilter, currentEngagementType);

        if (sampleData.length === 0) {
            resultsContainer.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500 text-lg mb-2">No ${currentEngagementFilter} found</p>
                    <p class="text-sm text-gray-400">You haven't ${currentEngagementFilter} any ${currentEngagementType} yet</p>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${sampleData.map(item => createEngagementCard(item)).join('')}
                </div>
            `;
        }
    }, 300);
}

/**
 * Generate sample engagement data
 */
function generateSampleEngagementData(filterType, contentType) {
    // Sample data structure
    const tutorData = [
        { id: 1, name: 'Dr. Abebe Tadesse', subject: 'Mathematics', rating: 4.8, image: '../uploads/system_images/system_profile_pictures/tutor-.jpg', time: '2 hours ago' },
        { id: 2, name: 'Aster Bekele', subject: 'Physics', rating: 4.9, image: '../uploads/system_images/system_profile_pictures/tutor-woman.jpg', time: '1 day ago' },
        { id: 3, name: 'Mulugeta Assefa', subject: 'Chemistry', rating: 4.7, image: '../uploads/system_images/system_profile_pictures/tutor-.jpg', time: '3 days ago' }
    ];

    const reelData = [
        { id: 1, title: 'Advanced Calculus Tutorial', views: '12K', thumbnail: '../uploads/system_images/system_images/Math wallpaper 1.jpeg', time: '1 hour ago' },
        { id: 2, title: 'Physics Lab Experiment', views: '8K', thumbnail: '../uploads/system_images/system_images/Physics wallpaper 2.jpeg', time: '5 hours ago' },
        { id: 3, title: 'Chemistry Fundamentals', views: '15K', thumbnail: '../uploads/system_images/system_images/Chemistry wallpaper 3.jpg', time: '2 days ago' }
    ];

    return contentType === 'tutors' ? tutorData : reelData;
}

/**
 * Create engagement card HTML
 */
function createEngagementCard(item) {
    if (currentEngagementType === 'tutors') {
        return `
            <div class="card p-4 engagement-card">
                <div class="flex items-center gap-4">
                    <img src="${item.image}" alt="${item.name}"
                         class="w-16 h-16 rounded-full object-cover"
                         onerror="this.style.display='none'; this.onerror=null;">
                    <div class="flex-1">
                        <h3 class="font-semibold text-lg">${item.name}</h3>
                        <p class="text-sm text-gray-600">${item.subject}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-yellow-500">⭐ ${item.rating}</span>
                            <span class="text-xs text-gray-500">${item.time}</span>
                        </div>
                    </div>
                    <button class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        View Profile
                    </button>
                </div>
            </div>
        `;
    } else {
        return `
            <div class="card overflow-hidden engagement-card">
                <div class="relative aspect-video bg-gray-200">
                    <img src="${item.thumbnail}" alt="${item.title}"
                         class="w-full h-full object-cover"
                         onerror="this.style.display='none'; this.onerror=null;">
                    <div class="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        ${item.views} views
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold mb-1">${item.title}</h3>
                    <p class="text-xs text-gray-500">${item.time}</p>
                </div>
            </div>
        `;
    }
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
