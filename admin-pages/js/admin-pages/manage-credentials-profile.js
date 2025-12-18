/**
 * Manage Credentials - Profile Header Integration
 * Loads profile data from admin_profile and manage_credentials_profile tables
 */

// API Configuration - use window object to avoid duplicate declaration
window.API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

/**
 * Load and display admin profile header for manage-credentials page
 * Fetches merged data from admin_profile and manage_credentials_profile tables via API
 */
async function loadManageCredentialsProfile() {
    try {
        // Get admin email from localStorage (set during login)
        const adminEmail = localStorage.getItem('adminEmail');

        if (!adminEmail) {
            console.warn('No admin email found in localStorage');
            return;
        }

        // Get admin token for authentication (admin pages use adminToken)
        const token = localStorage.getItem('adminToken') || localStorage.getItem('admin_access_token');
        if (!token) {
            console.error('No admin authentication token found');
            window.location.href = '../index.html';
            return;
        }

        // Fetch profile data from backend
        const response = await fetch(`${window.API_BASE_URL}/api/admin/manage-credentials-profile/by-email/${encodeURIComponent(adminEmail)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                // Access denied - redirect to appropriate page
                alert('Access denied. Only manage-credentials and manage-system-settings departments can access this page.');
                window.location.href = '../index.html';
                return;
            }
            // If endpoint doesn't exist yet, use fallback
            if (response.status === 404) {
                console.log('Credentials profile endpoint not found, using fallback');
                loadFallbackProfile();
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
        console.error('Error loading manage-credentials profile:', error);
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

        // Update username - prioritize username, fallback to full name
        const usernameElement = document.getElementById('adminUsername');
        if (usernameElement) {
            // Priority: username > first_name + father_name + grandfather_name > 'Admin'
            let displayName = profileData.username;
            if (!displayName) {
                const fullName = [
                    profileData.first_name,
                    profileData.father_name,
                    profileData.grandfather_name
                ].filter(n => n).join(' ');
                displayName = fullName || 'Admin';
            }
            usernameElement.textContent = displayName;
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

        // Update location from manage_credentials_profile.location array
        const locationElement = document.querySelector('.profile-location span:last-child');
        if (locationElement) {
            if (profileData.location && Array.isArray(profileData.location) && profileData.location.length > 0) {
                // Show locations from profile (respecting display_location setting)
                if (profileData.display_location !== false) {
                    locationElement.textContent = profileData.location.join(', ');
                } else {
                    locationElement.textContent = 'Location hidden';
                }
            } else if (profileData.departments && profileData.departments.length > 0) {
                locationElement.textContent = profileData.departments.join(', ') + ' | Credentials Management';
            } else {
                locationElement.textContent = 'Astegni Admin Panel | Credentials Management';
            }
        }

        // Update quote
        const quoteElement = document.querySelector('.profile-quote span');
        if (quoteElement && profileData.quote) {
            quoteElement.textContent = `"${profileData.quote}"`;
        }

        // Update rating from admin_reviews (calculated live in backend)
        const ratingElement = document.querySelector('.rating-value');
        const reviewCountElement = document.querySelector('.rating-count');
        if (ratingElement && profileData.rating !== undefined) {
            ratingElement.textContent = profileData.rating.toFixed(1);
        }
        if (reviewCountElement && profileData.total_reviews !== undefined) {
            reviewCountElement.textContent = `(${profileData.total_reviews} reviews)`;
        }

        // Update rating stars based on admin_reviews rating
        const ratingStarsEl = document.querySelector('.rating-stars');
        if (ratingStarsEl && profileData.rating !== undefined) {
            const rating = profileData.rating;
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            let starsHTML = '';

            for (let i = 0; i < fullStars; i++) {
                starsHTML += '★';
            }
            if (hasHalfStar) {
                starsHTML += '★';
            }
            while (starsHTML.length < 5) {
                starsHTML += '☆';
            }

            ratingStarsEl.textContent = starsHTML;
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
    if (!badgesRow) return;

    // Clear existing badges
    badgesRow.innerHTML = '';

    // Add default System Administrator badge
    const systemAdminBadge = document.createElement('span');
    systemAdminBadge.className = 'profile-badge verified';
    systemAdminBadge.textContent = '✔ System Administrator';
    badgesRow.appendChild(systemAdminBadge);

    // Add Credentials Management badge
    const credentialsBadge = document.createElement('span');
    credentialsBadge.className = 'profile-badge school';
    credentialsBadge.textContent = '🎓 Credentials Management';
    badgesRow.appendChild(credentialsBadge);

    // Add Verification Expert badge
    const expertBadge = document.createElement('span');
    expertBadge.className = 'profile-badge expert';
    expertBadge.textContent = '📊 Verification Expert';
    badgesRow.appendChild(expertBadge);

    // Add custom badges from database
    if (profileData.credentials_profile && Array.isArray(profileData.credentials_profile.badges)) {
        profileData.credentials_profile.badges.forEach(badge => {
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
    const credentialsProfile = profileData.credentials_profile || {};
    const departments = profileData.departments || [];

    // Update department
    const departmentValue = document.querySelector('.info-item:nth-child(1) .info-value');
    if (departmentValue) {
        departmentValue.textContent = departments.join(', ') || 'Credentials Management';
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
    if (joinedValue && credentialsProfile.joined_date) {
        const joinedDate = new Date(credentialsProfile.joined_date);
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
        departments: ['manage-credentials'],
        credentials_profile: {
            position: 'Credentials Verification Specialist',
            rating: 4.9,
            total_reviews: 156,
            badges: [],
            credentials_verified: 0,
            credentials_rejected: 0,
            credentials_suspended: 0,
            joined_date: new Date().toISOString()
        },
        quote: 'Ensuring credential authenticity through diligent verification.',
        bio: 'Experienced administrator specializing in credential verification and quality assurance.'
    };

    updateProfileHeader(fallbackData);
}

/**
 * Initialize profile loading on page load
 */
document.addEventListener('DOMContentLoaded', function() {
    // Load profile when page loads
    loadManageCredentialsProfile();
});

/**
 * Open edit profile modal and populate with current data
 * Data is loaded from both admin_profile and manage_credentials_profile tables
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
        // Populate editable fields that match the HTML modal IDs
        const usernameInput = document.getElementById('editUsername');
        const bioInput = document.getElementById('editBio');
        const quoteInput = document.getElementById('editQuote');
        const heroSubtitleInput = document.getElementById('editHeroSubtitle');
        const languagesInput = document.getElementById('editLanguages');
        const allowLocationCheckbox = document.getElementById('editAllowLocation');
        const displayLocationCheckbox = document.getElementById('editDisplayLocation');

        // Set basic fields
        if (usernameInput) usernameInput.value = profileData.username || '';
        if (bioInput) bioInput.value = profileData.bio || '';
        if (quoteInput) quoteInput.value = profileData.quote || '';
        if (heroSubtitleInput) heroSubtitleInput.value = profileData.hero_subtitle || '';

        // Set languages (convert array to comma-separated string)
        if (languagesInput) {
            const langs = profileData.languages || [];
            languagesInput.value = Array.isArray(langs) ? langs.join(', ') : langs;
        }

        // Set allow_location checkbox (system access to location)
        if (allowLocationCheckbox) {
            allowLocationCheckbox.checked = profileData.allow_location === true;
        }

        // Set display_location checkbox (public visibility)
        if (displayLocationCheckbox) {
            displayLocationCheckbox.checked = profileData.display_location !== false;
        }

        // Populate hero titles array (using array-field-utils.js functions)
        if (typeof populateHeroTitles === 'function') {
            populateHeroTitles(profileData.hero_title || []);
        }

        // Populate locations array (using array-field-utils.js functions)
        if (typeof populateLocations === 'function') {
            populateLocations(profileData.location || []);
        }

        console.log('Form fields populated');

        // Show read-only stats from manage_credentials_profile table
        if (profileData.credentials_profile) {
            const displayEmployeeId = document.getElementById('displayEmployeeId');
            if (displayEmployeeId) {
                displayEmployeeId.textContent = `ADM-${String(profileData.id).padStart(6, '0')}`;
            }

            const displayAccessLevel = document.getElementById('displayAccessLevel');
            if (displayAccessLevel) {
                displayAccessLevel.textContent = profileData.credentials_profile.position || 'Credentials Management';
            }

            const displayResponsibilities = document.getElementById('displayResponsibilities');
            if (displayResponsibilities) {
                const responsibilities = [];
                if (profileData.credentials_profile.permissions?.can_verify) responsibilities.push('Verify Credentials');
                if (profileData.credentials_profile.permissions?.can_reject) responsibilities.push('Reject Credentials');
                if (profileData.credentials_profile.permissions?.can_suspend) responsibilities.push('Suspend Credentials');
                displayResponsibilities.textContent = responsibilities.join(', ') || 'View Only';
            }
            console.log('Read-only stats populated');
        } else {
            console.warn('No credentials_profile data found');
        }
    } else {
        console.error('No profile data available. Please reload the page.');
        alert('Profile data not loaded. Please refresh the page and try again.');
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Initialize geolocation UI (show/hide detect button based on allow_location state)
    if (typeof initGeolocationUI === 'function') {
        initGeolocationUI();
    }

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

        // Helper to get input value
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        // Get languages from text input (comma-separated)
        const languagesInput = document.getElementById('editLanguages');
        const languagesText = languagesInput ? languagesInput.value.trim() : '';
        const languages = languagesText ? languagesText.split(',').map(lang => lang.trim()).filter(lang => lang) : [];

        // Get hero_title and location arrays
        const heroTitles = typeof getHeroTitles === 'function' ? getHeroTitles() : [];
        const locations = typeof getLocations === 'function' ? getLocations() : [];

        console.log('Hero titles collected:', heroTitles);
        console.log('Locations collected:', locations);

        // Get allow_location checkbox value (whether system can access user's location)
        const allowLocationCheckbox = document.getElementById('editAllowLocation');
        const allowLocation = allowLocationCheckbox ? allowLocationCheckbox.checked : false;

        // Get display_location checkbox value (whether to show location publicly)
        const displayLocationCheckbox = document.getElementById('editDisplayLocation');
        const displayLocation = displayLocationCheckbox ? displayLocationCheckbox.checked : true;

        // Combined profile fields (admin_profile + manage_credentials_profile)
        const updateData = {
            username: getVal('editUsername'),
            bio: getVal('editBio'),
            quote: getVal('editQuote'),
            location: locations,
            hero_title: heroTitles,
            hero_subtitle: getVal('editHeroSubtitle'),
            languages: languages,
            allow_location: allowLocation,
            display_location: displayLocation
        };

        console.log('Update data being sent:', updateData);

        // Send update request to credentials-specific endpoint
        const response = await fetch(`${window.API_BASE_URL}/api/admin/manage-credentials-profile/${adminId}`, {
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
window.loadManageCredentialsProfile = loadManageCredentialsProfile;
