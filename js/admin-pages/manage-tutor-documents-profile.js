/**
 * Manage Tutor Documents - Profile Header Integration
 * Loads profile data from admin_profile and manage_tutors_profile tables
 */

// API Configuration - use window object to avoid duplicate declaration
window.API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';

/**
 * Load and display admin profile header for manage-tutor-documents page
 * Fetches merged data from admin_profile and manage_tutors_profile tables via API
 */
async function loadManageTutorDocumentsProfile() {
    try {
        // Get admin email from localStorage (set during login)
        const adminEmail = localStorage.getItem('adminEmail');

        if (!adminEmail) {
            console.warn('No admin email found in localStorage');
            return;
        }

        // Get token for authentication
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            window.location.href = '../index.html';
            return;
        }

        // Fetch profile data from backend
        const response = await fetch(`${window.API_BASE_URL}/api/admin/manage-tutor-documents-profile/by-email/${encodeURIComponent(adminEmail)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                // Access denied - redirect to appropriate page
                alert('Access denied. Only manage-tutor-documents and manage-system-settings departments can access this page.');
                window.location.href = '../index.html';
                return;
            }
            throw new Error(`Failed to load profile: ${response.status}`);
        }

        const profileData = await response.json();

        // Update profile header with data
        updateProfileHeader(profileData);

        // Store admin_id for future use
        localStorage.setItem('adminId', profileData.id);

    } catch (error) {
        console.error('Error loading manage-tutor-documents profile:', error);
        // Use fallback data if API fails
        loadFallbackProfile();
    }
}

/**
 * Update profile header elements with data from backend
 */
function updateProfileHeader(profileData) {
    try {
        // Store profile data globally for modal access
        window.currentProfileData = profileData;
        console.log('Profile data stored in window.currentProfileData:', window.currentProfileData);

        // Update username
        const usernameElement = document.getElementById('adminUsername');
        if (usernameElement) {
            const fullName = `${profileData.first_name || ''} ${profileData.father_name || ''}`.trim() || profileData.username || 'Admin';
            usernameElement.textContent = fullName;
        }

        // Update profile picture
        const profilePicture = document.querySelector('.profile-avatar');
        if (profilePicture && profileData.profile_picture) {
            profilePicture.src = profileData.profile_picture;
        }

        // Update cover picture
        const coverImage = document.querySelector('.cover-img');
        if (coverImage && profileData.cover_picture) {
            coverImage.src = profileData.cover_picture;
        }

        // Update location/department info
        const locationElement = document.querySelector('.profile-location span:last-child');
        if (locationElement && profileData.tutors_profile) {
            locationElement.textContent = `Astegni Admin Panel | ${profileData.tutors_profile.position}`;
        }

        // Update quote
        const quoteElement = document.querySelector('.profile-quote span');
        if (quoteElement && profileData.quote) {
            quoteElement.textContent = `"${profileData.quote}"`;
        }

        // Update rating if available
        const ratingElement = document.querySelector('.rating-value');
        const reviewCountElement = document.querySelector('.rating-count');
        if (ratingElement && profileData.tutors_profile) {
            const rating = profileData.tutors_profile.rating || 0;
            ratingElement.textContent = rating.toFixed(1);

            if (reviewCountElement) {
                const reviews = profileData.tutors_profile.total_reviews || 0;
                reviewCountElement.textContent = `(${reviews} reviews)`;
            }
        }

        // Update badges
        updateBadges(profileData);

        // Update info grid
        updateInfoGrid(profileData);

        console.log('Profile header updated successfully');
    } catch (error) {
        console.error('Error updating profile header:', error);
    }
}

/**
 * Update badges based on profile data
 */
function updateBadges(profileData) {
    const badgesRow = document.querySelector('.badges-row');
    if (!badgesRow || !profileData.tutors_profile) return;

    // Clear existing badges
    badgesRow.innerHTML = '';

    // Get badges from profile
    const badges = profileData.tutors_profile.badges || [];

    // Add default System Administrator badge
    const systemAdminBadge = document.createElement('span');
    systemAdminBadge.className = 'profile-badge verified';
    systemAdminBadge.textContent = '✔ System Administrator';
    badgesRow.appendChild(systemAdminBadge);

    // Add Tutor Management badge
    const tutorBadge = document.createElement('span');
    tutorBadge.className = 'profile-badge school';
    tutorBadge.textContent = '👨‍🏫 Tutor Management';
    badgesRow.appendChild(tutorBadge);

    // Add Education Expert badge
    const expertBadge = document.createElement('span');
    expertBadge.className = 'profile-badge expert';
    expertBadge.textContent = '📊 Education Expert';
    badgesRow.appendChild(expertBadge);

    // Add custom badges from database
    if (Array.isArray(badges)) {
        badges.forEach(badge => {
            const badgeElement = document.createElement('span');
            badgeElement.className = `profile-badge ${badge.class || 'verified'}`;
            badgeElement.textContent = badge.text || badge;
            badgesRow.appendChild(badgeElement);
        });
    }
}

/**
 * Update info grid with profile data
 */
function updateInfoGrid(profileData) {
    if (!profileData.tutors_profile) return;

    const tutorsProfile = profileData.tutors_profile;
    const departments = profileData.departments || [];

    // Update department
    const departmentValue = document.querySelector('.info-item:nth-child(1) .info-value');
    if (departmentValue) {
        departmentValue.textContent = departments.join(', ') || 'Tutor Management';
    }

    // Update employee ID (use admin ID)
    const employeeIdValue = document.querySelector('.info-item:nth-child(2) .info-value');
    if (employeeIdValue) {
        employeeIdValue.textContent = `ADM-${String(profileData.id).padStart(6, '0')}`;
    }

    // Update email (from admin_profile table)
    const emailElement = document.getElementById('profileEmail');
    if (emailElement) {
        emailElement.textContent = profileData.email || '-';
    }

    // Update phone (from admin_profile table)
    const phoneElement = document.getElementById('profilePhone');
    if (phoneElement) {
        phoneElement.textContent = profileData.phone_number || '-';
    }

    // Update joined date
    const joinedValue = document.querySelector('.info-item:nth-child(5) .info-value');
    if (joinedValue && tutorsProfile.joined_date) {
        const joinedDate = new Date(tutorsProfile.joined_date);
        joinedValue.textContent = joinedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Update description
    const descriptionElement = document.querySelector('.info-description p');
    if (descriptionElement && profileData.bio) {
        descriptionElement.textContent = profileData.bio;
    }
}

/**
 * Load fallback profile data if API fails
 */
function loadFallbackProfile() {
    console.log('Loading fallback profile data');

    const fallbackData = {
        id: 1,
        username: 'admin_user',
        first_name: 'Admin',
        father_name: 'User',
        grandfather_name: '',
        email: localStorage.getItem('adminEmail') || 'admin@astegni.et',
        phone_number: '+251911234567',
        departments: ['manage-tutor-documents'],
        tutors_profile: {
            position: 'Tutor Management Specialist',
            rating: 4.9,
            total_reviews: 156,
            badges: [],
            tutors_verified: 0,
            tutors_rejected: 0,
            tutors_suspended: 0,
            joined_date: new Date().toISOString()
        },
        quote: 'Empowering educators through efficient management and verification.',
        bio: 'Experienced administrator specializing in tutor verification and quality assurance.'
    };

    updateProfileHeader(fallbackData);
}

/**
 * Initialize profile loading on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Load profile when page loads
    loadManageTutorDocumentsProfile();
});

/**
 * Open edit profile modal and populate with current data
 * Data is loaded from both admin_profile and manage_tutors_profile tables
 */
function openEditProfileModal() {
    console.log('openEditProfileModal called');

    const modal = document.getElementById('edit-profile-modal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }

    // Get stored profile data (contains merged data from both tables)
    const profileData = window.currentProfileData;
    console.log('Profile data:', profileData);

    if (profileData) {
        // Populate editable fields from admin_profile table
        const firstNameInput = document.getElementById('firstNameInput');
        const fatherNameInput = document.getElementById('fatherNameInput');
        const grandfatherNameInput = document.getElementById('grandfatherNameInput');
        const adminUsernameInput = document.getElementById('adminUsernameInput');
        const emailInput = document.getElementById('emailInput');
        const phoneNumberInput = document.getElementById('phoneNumberInput');
        const bioInput = document.getElementById('bioInput');
        const quoteInput = document.getElementById('quoteInput');

        if (firstNameInput) firstNameInput.value = profileData.first_name || '';
        if (fatherNameInput) fatherNameInput.value = profileData.father_name || '';
        if (grandfatherNameInput) grandfatherNameInput.value = profileData.grandfather_name || '';
        if (adminUsernameInput) adminUsernameInput.value = profileData.username || '';
        if (emailInput) emailInput.value = profileData.email || '';
        if (phoneNumberInput) phoneNumberInput.value = profileData.phone_number || '';
        if (bioInput) bioInput.value = profileData.bio || '';
        if (quoteInput) quoteInput.value = profileData.quote || '';

        console.log('Form fields populated');

        // Show department (read-only, from admin_profile table)
        const departmentInput = document.getElementById('departmentInput');
        if (departmentInput) {
            departmentInput.value = (profileData.departments || []).join(', ') || 'Tutor Management';
        }

        // Show read-only stats from manage_tutors_profile table
        if (profileData.tutors_profile) {
            const displayEmployeeId = document.getElementById('displayEmployeeId');
            if (displayEmployeeId) {
                displayEmployeeId.textContent = `ADM-${String(profileData.id).padStart(6, '0')}`;
            }

            const displayAccessLevel = document.getElementById('displayAccessLevel');
            if (displayAccessLevel) {
                displayAccessLevel.textContent = profileData.tutors_profile.position || 'Tutor Management';
            }

            const displayResponsibilities = document.getElementById('displayResponsibilities');
            if (displayResponsibilities) {
                const responsibilities = [];
                if (profileData.tutors_profile.permissions?.can_verify_tutors) responsibilities.push('Verify Tutors');
                if (profileData.tutors_profile.permissions?.can_reject_tutors) responsibilities.push('Reject Applications');
                if (profileData.tutors_profile.permissions?.can_suspend_tutors) responsibilities.push('Suspend Tutors');
                displayResponsibilities.textContent = responsibilities.join(', ') || 'View Only';
            }
            console.log('Read-only stats populated');
        } else {
            console.warn('No tutors_profile data found');
        }
    } else {
        console.error('No profile data available. Please reload the page.');
        alert('Profile data not loaded. Please refresh the page and try again.');
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    console.log('Modal displayed');
}

/**
 * Close edit profile modal
 */
function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Handle profile update form submission
 */
async function handleProfileUpdate(event) {
    event.preventDefault();

    try {
        const adminId = localStorage.getItem('adminId');
        const token = localStorage.getItem('token');

        if (!adminId || !token) {
            alert('Session expired. Please login again.');
            window.location.href = '../index.html';
            return;
        }

        // Get form data
        const updateData = {
            first_name: document.getElementById('firstNameInput').value,
            father_name: document.getElementById('fatherNameInput').value,
            grandfather_name: document.getElementById('grandfatherNameInput').value,
            email: document.getElementById('emailInput').value,
            phone_number: document.getElementById('phoneNumberInput').value,
            bio: document.getElementById('bioInput').value,
            quote: document.getElementById('quoteInput').value
        };

        // Send update request
        const response = await fetch(`${window.API_BASE_URL}/api/admin/profile/${adminId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error(`Failed to update profile: ${response.status}`);
        }

        const updatedProfile = await response.json();

        // Update UI with new data
        updateProfileHeader(updatedProfile);

        // Store updated profile
        window.currentProfileData = updatedProfile;

        // Close modal
        closeEditProfileModal();

        // Show success message
        alert('Profile updated successfully!');

    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
    }
}

/**
 * Open upload profile picture modal
 */
function openUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

/**
 * Close upload profile picture modal
 */
function closeUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Open upload cover image modal
 */
function openUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

/**
 * Close upload cover image modal
 */
function closeUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

/**
 * Preview profile picture before upload
 */
function previewProfilePicture(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            const previewImg = document.getElementById('profilePreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Preview cover image before upload
 */
function previewCoverImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('coverPreview');
            const previewImg = document.getElementById('coverPreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
}

/**
 * Handle profile picture upload
 */
async function handleProfilePictureUpload() {
    const fileInput = document.getElementById('profilePictureInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    try {
        const adminId = localStorage.getItem('adminId');
        const token = localStorage.getItem('token');

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${window.API_BASE_URL}/api/admin/upload/profile-picture/${adminId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();

        // Update profile picture in UI
        const profilePicture = document.querySelector('.profile-avatar');
        if (profilePicture && result.profile_picture) {
            profilePicture.src = result.profile_picture;
        }

        closeUploadProfileModal();
        alert('Profile picture updated successfully!');

    } catch (error) {
        console.error('Error uploading profile picture:', error);
        alert('Failed to upload profile picture');
    }
}

/**
 * Handle cover image upload
 */
async function handleCoverImageUpload() {
    const fileInput = document.getElementById('coverImageInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a file to upload');
        return;
    }

    try {
        const adminId = localStorage.getItem('adminId');
        const token = localStorage.getItem('token');

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${window.API_BASE_URL}/api/admin/upload/cover-image/${adminId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();

        // Update cover image in UI
        const coverImage = document.querySelector('.cover-img');
        if (coverImage && result.cover_picture) {
            coverImage.src = result.cover_picture;
        }

        closeUploadCoverModal();
        alert('Cover image updated successfully!');

    } catch (error) {
        console.error('Error uploading cover image:', error);
        alert('Failed to upload cover image');
    }
}

// Store profile data globally for access by modals
window.currentProfileData = null;

// Expose functions globally for HTML onclick handlers
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.handleProfileUpdate = handleProfileUpdate;
window.openUploadProfileModal = openUploadProfileModal;
window.closeUploadProfileModal = closeUploadProfileModal;
window.openUploadCoverModal = openUploadCoverModal;
window.closeUploadCoverModal = closeUploadCoverModal;
window.previewProfilePicture = previewProfilePicture;
window.previewCoverImage = previewCoverImage;
window.handleProfilePictureUpload = handleProfilePictureUpload;
window.handleCoverImageUpload = handleCoverImageUpload;

// Also expose for manual calling
window.loadManageTutorDocumentsProfile = loadManageTutorDocumentsProfile;
