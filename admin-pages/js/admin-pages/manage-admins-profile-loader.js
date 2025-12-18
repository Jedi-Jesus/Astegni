/**
 * Manage Admins - Profile Header Loader
 * Loads profile data from admin_profile and manage_admins_profile tables
 * Ratings and reviews come from admin_reviews table
 */

(function() {
    'use strict';

    // Use existing API_BASE_URL if available, otherwise auto-detect environment
    const PROFILE_API_BASE = (typeof API_BASE_URL !== 'undefined')
        ? API_BASE_URL
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8000'
            : 'https://api.astegni.com');

    // Store current profile data
    let currentProfile = null;

    /**
     * Load profile header data on page load
     */
    async function loadProfileHeader() {
        console.log('Loading profile header for manage-admins...');

        try {
            const adminEmail = getAdminEmail();

            if (!adminEmail) {
                console.error('No admin email found - cannot load profile');
                return;
            }

            console.log(`Loading profile for admin: ${adminEmail}`);

            const response = await fetch(`${PROFILE_API_BASE}/api/admin/admins/profile/by-email/${encodeURIComponent(adminEmail)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            const profile = await response.json();
            currentProfile = profile;
            updateProfileHeader(profile);
            loadDepartmentSwitcher(profile);

            console.log('Profile header loaded from database:', profile);

        } catch (error) {
            console.error('Error loading profile header:', error);
        }
    }

    /**
     * Get admin email from authentication
     */
    function getAdminEmail() {
        // Method 1: Check adminUser in localStorage
        const adminUser = localStorage.getItem('adminUser');
        if (adminUser) {
            try {
                const user = JSON.parse(adminUser);
                if (user.email) {
                    return user.email;
                }
            } catch (e) {
                console.error('Error parsing adminUser:', e);
            }
        }

        // Method 2: Check if authManager has current user
        if (typeof authManager !== 'undefined' && authManager && authManager.getCurrentUser) {
            const user = authManager.getCurrentUser();
            if (user && user.email) {
                return user.email;
            }
        }

        // Method 3: Check localStorage for currentUser
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.email) {
                    return user.email;
                }
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }

        // Method 4: Try to decode JWT token
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (token) {
            try {
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));

                const payload = JSON.parse(jsonPayload);
                if (payload.email) {
                    return payload.email;
                }
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        console.warn('Could not find admin email');
        return null;
    }

    /**
     * Load department switcher in navbar dropdown
     */
    function loadDepartmentSwitcher(profile) {
        const switcher = document.getElementById('department-switcher-section');
        const options = document.getElementById('department-options');

        if (!switcher || !options) return;

        let departments = profile?.departments || [];

        if (!Array.isArray(departments) || departments.length === 0) {
            switcher.classList.add('hidden');
            return;
        }

        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        const currentDept = adminUser.department;

        const isSystemSettings = currentDept === 'manage-system-settings' ||
                                 departments.includes('manage-system-settings');

        if (isSystemSettings) {
            switcher.classList.add('hidden');
            return;
        }

        if (departments.length > 1) {
            switcher.classList.remove('hidden');

            options.innerHTML = departments.map(dept => {
                const isActive = dept === currentDept;
                const icon = getDepartmentIcon(dept);
                const label = formatDepartmentName(dept);

                return `
                    <a href="javascript:void(0)" onclick="switchDepartment('${dept}')" class="department-option ${isActive ? 'active' : ''}">
                        <i class="fas ${icon}"></i>
                        <span>${label}</span>
                        ${isActive ? '<i class="fas fa-check ml-auto text-green-500"></i>' : ''}
                    </a>
                `;
            }).join('');
        } else {
            switcher.classList.add('hidden');
        }
    }

    function switchDepartment(dept) {
        const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
        adminUser.department = dept;
        localStorage.setItem('adminUser', JSON.stringify(adminUser));
        window.location.href = getDepartmentLink(dept);
    }

    window.switchDepartment = switchDepartment;

    function getDepartmentIcon(dept) {
        const icons = {
            'manage-courses': 'fa-graduation-cap',
            'manage-schools': 'fa-school',
            'manage-campaigns': 'fa-bullhorn',
            'manage-credentials': 'fa-certificate',
            'manage-contents': 'fa-photo-video',
            'manage-customers': 'fa-users',
            'manage-admins': 'fa-user-shield',
            'manage-advertisers': 'fa-ad',
            'manage-system-settings': 'fa-cog'
        };
        return icons[dept] || 'fa-folder';
    }

    function formatDepartmentName(dept) {
        return dept.split('-').map(
            word => word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    function getDepartmentLink(dept) {
        return `${dept}.html`;
    }

    /**
     * Update profile header with data from database
     * - Profile data from manage_admins_profile
     * - Rating from admin_reviews (live calculation)
     */
    function updateProfileHeader(profile) {
        // Update profile picture
        const profileAvatar = document.querySelector('.profile-avatar');
        if (profileAvatar && profile.profile_picture) {
            const picturePath = profile.profile_picture.startsWith('/')
                ? '../' + profile.profile_picture.substring(1)
                : '../' + profile.profile_picture;
            profileAvatar.src = picturePath;
        }

        // Update cover picture
        const coverImg = document.querySelector('.cover-img');
        if (coverImg && profile.cover_picture) {
            const coverPath = profile.cover_picture.startsWith('/')
                ? '../' + profile.cover_picture.substring(1)
                : '../' + profile.cover_picture;
            coverImg.src = coverPath;
        }

        // Update username (display name)
        const usernameEl = document.getElementById('adminUsername');
        let displayName = profile.username || '';
        if (!displayName && profile.first_name && profile.father_name) {
            displayName = `${profile.first_name} ${profile.father_name}`;
        }
        if (usernameEl && displayName) {
            usernameEl.textContent = displayName;
        }

        // Update badges from manage_admins_profile
        const badgesRow = document.querySelector('.badges-row');
        if (badgesRow && profile.badges && profile.badges.length > 0) {
            let badgesHTML = '';
            profile.badges.forEach(badge => {
                if (typeof badge === 'object') {
                    badgesHTML += `<span class="profile-badge ${badge.class || ''}">${badge.text || badge.label || ''}</span>`;
                } else {
                    badgesHTML += `<span class="profile-badge">${badge}</span>`;
                }
            });
            badgesRow.innerHTML = badgesHTML;
        }

        // Update rating from admin_reviews (live calculation)
        const ratingValueEl = document.querySelector('.rating-value');
        if (ratingValueEl && profile.rating !== undefined) {
            ratingValueEl.textContent = profile.rating.toFixed(1);
        }

        // Update review count from admin_reviews
        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingCountEl && profile.total_reviews !== undefined) {
            ratingCountEl.textContent = `(${profile.total_reviews} reviews)`;
        }

        // Update rating stars
        const ratingStarsEl = document.querySelector('.rating-stars');
        if (ratingStarsEl && profile.rating !== undefined) {
            const rating = profile.rating;
            const fullStars = Math.floor(rating);
            const hasHalfStar = rating % 1 >= 0.5;
            let starsHTML = '';

            for (let i = 0; i < fullStars; i++) {
                starsHTML += '<i class="fas fa-star text-yellow-400"></i>';
            }
            if (hasHalfStar && fullStars < 5) {
                starsHTML += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
            }
            const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
            for (let i = 0; i < emptyStars; i++) {
                starsHTML += '<i class="far fa-star text-yellow-400"></i>';
            }

            ratingStarsEl.innerHTML = starsHTML;
        }

        // Update location from manage_admins_profile.location array
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            if (profile.location && Array.isArray(profile.location) && profile.location.length > 0) {
                // Show locations from profile (respecting display_location setting)
                // display_location = whether to show location publicly (default true)
                // allow_location = whether system can use GPS to detect location (separate setting)
                if (profile.display_location !== false) {
                    locationEl.textContent = profile.location.join(', ');
                } else {
                    locationEl.textContent = 'Location hidden';
                }
            } else if (profile.hero_subtitle) {
                locationEl.textContent = profile.hero_subtitle;
            } else if (profile.departments && profile.departments.length > 0) {
                locationEl.textContent = profile.departments.join(', ') + ' | Admin Management';
            } else {
                locationEl.textContent = 'Astegni Admin Panel | Administration';
            }
        }

        // Update quote
        const quoteEl = document.querySelector('.profile-quote span');
        if (quoteEl && profile.quote) {
            quoteEl.textContent = `"${profile.quote}"`;
        }

        // Update profile info grid
        const infoItems = document.querySelectorAll('.profile-info-grid .info-item');
        infoItems.forEach(item => {
            const label = item.querySelector('.info-label');
            const value = item.querySelector('.info-value');

            if (label && value) {
                const labelText = label.textContent.toLowerCase();
                if (labelText.includes('email')) {
                    const email = Array.isArray(profile.email) ? profile.email[0] : profile.email;
                    value.textContent = email || 'N/A';
                } else if (labelText.includes('phone')) {
                    const phone = Array.isArray(profile.phone_number) ? profile.phone_number[0] : profile.phone_number;
                    value.textContent = phone || 'N/A';
                } else if (labelText.includes('department')) {
                    if (profile.departments && profile.departments.length > 0) {
                        value.textContent = profile.departments.map(d => formatDepartmentName(d)).join(', ');
                    }
                } else if (labelText.includes('joined')) {
                    if (profile.created_at) {
                        const date = new Date(profile.created_at);
                        value.textContent = date.toLocaleDateString('en-US', {
                            month: 'long',
                            year: 'numeric'
                        });
                    }
                }
            }
        });

        // Update bio/description
        const descriptionEl = document.querySelector('.info-description p');
        if (descriptionEl && profile.bio) {
            descriptionEl.textContent = profile.bio;
        }
    }

    /**
     * Load reviews for the admin from admin_reviews table
     */
    async function loadAdminReviews() {
        try {
            const adminEmail = getAdminEmail();
            if (!adminEmail) return;

            const response = await fetch(`${PROFILE_API_BASE}/api/admin/admins/reviews/by-email/${encodeURIComponent(adminEmail)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch reviews');
            }

            const data = await response.json();
            displayReviews(data.reviews || []);

        } catch (error) {
            console.error('Error loading reviews:', error);
        }
    }

    /**
     * Display reviews in the dashboard and reviews panel
     */
    function displayReviews(reviews) {
        const dashboardReviewsList = document.getElementById('dashboard-reviews-list');
        const reviewsList = document.getElementById('reviews-list');

        if (!reviews || reviews.length === 0) {
            const emptyHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-star text-4xl mb-4 opacity-50"></i>
                    <p>No reviews yet</p>
                </div>
            `;
            if (dashboardReviewsList) dashboardReviewsList.innerHTML = emptyHTML;
            if (reviewsList) reviewsList.innerHTML = emptyHTML;
            return;
        }

        const createReviewHTML = (review) => `
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <i class="fas fa-user text-gray-400"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-semibold">${review.reviewer_name || 'Anonymous'}</h4>
                            <span class="text-sm text-gray-500">${formatDate(review.created_at)}</span>
                        </div>
                        <div class="flex items-center gap-1 mb-2">
                            ${generateStars(review.rating)}
                        </div>
                        <p class="text-gray-600 text-sm">${review.comment || ''}</p>
                        ${review.reviewer_role ? `<span class="text-xs text-gray-400">${review.reviewer_role}</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        // Dashboard shows only first 5 reviews
        if (dashboardReviewsList) {
            dashboardReviewsList.innerHTML = reviews.slice(0, 5).map(createReviewHTML).join('');
        }

        // Reviews panel shows all reviews
        if (reviewsList) {
            reviewsList.innerHTML = reviews.map(createReviewHTML).join('');
        }
    }

    function generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star text-yellow-400"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
            } else {
                stars += '<i class="far fa-star text-yellow-400"></i>';
            }
        }
        return stars;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    /**
     * Open Edit Profile Modal and populate with current data from manage_admins_profile
     */
    function openEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (!modal) return;

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        if (currentProfile) {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val || '';
            };

            // Only fields from manage_admins_profile table
            setVal('editUsername', currentProfile.username);
            setVal('editBio', currentProfile.bio);
            setVal('editQuote', currentProfile.quote);
            setVal('editHeroSubtitle', currentProfile.hero_subtitle);

            // Hero titles - populate array fields
            if (typeof populateHeroTitles === 'function') {
                populateHeroTitles(currentProfile.hero_title);
            }

            // Locations - populate array fields
            if (typeof populateLocations === 'function') {
                populateLocations(currentProfile.location);
            }

            // Languages - convert array to comma-separated string
            const languages = Array.isArray(currentProfile.languages)
                ? currentProfile.languages.join(', ')
                : currentProfile.languages || '';
            setVal('editLanguages', languages);

            // Allow Location checkbox (GPS detection permission)
            const allowLocationCheckbox = document.getElementById('editAllowLocation');
            if (allowLocationCheckbox) {
                allowLocationCheckbox.checked = currentProfile.allow_location || false;
            }

            // Display Location checkbox (public visibility)
            const displayLocationCheckbox = document.getElementById('editDisplayLocation');
            if (displayLocationCheckbox) {
                displayLocationCheckbox.checked = currentProfile.display_location !== false; // Default to true
            }

            // Initialize geolocation UI (show/hide detect button based on allow_location state)
            if (typeof initGeolocationUI === 'function') {
                initGeolocationUI();
            }
        }
    }

    function closeEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();

        const submitBtn = document.getElementById('editProfileSubmitBtn');
        const originalText = submitBtn ? submitBtn.innerHTML : 'Update Profile';
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;
        }

        try {
            const getVal = (id) => {
                const el = document.getElementById(id);
                return el ? el.value.trim() : '';
            };

            // Parse languages from comma-separated string to array
            const languagesStr = getVal('editLanguages');
            const languages = languagesStr
                ? languagesStr.split(',').map(l => l.trim()).filter(l => l)
                : [];

            // Get hero_title and location arrays
            const heroTitles = typeof getHeroTitles === 'function' ? getHeroTitles() : [];
            const locations = typeof getLocations === 'function' ? getLocations() : [];

            // Get allow_location checkbox value (GPS detection permission)
            const allowLocationCheckbox = document.getElementById('editAllowLocation');
            const allowLocation = allowLocationCheckbox ? allowLocationCheckbox.checked : false;

            // Get display_location checkbox value (public visibility)
            const displayLocationCheckbox = document.getElementById('editDisplayLocation');
            const displayLocation = displayLocationCheckbox ? displayLocationCheckbox.checked : true;

            // Only fields from manage_admins_profile table
            const profileData = {
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

            const response = await fetch(`${PROFILE_API_BASE}/api/admin/admins/profile/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(profileData)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const result = await response.json();
            currentProfile = result;
            updateProfileHeader(result);
            closeEditProfileModal();
            alert('Profile updated successfully!');

        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile. Please try again.');
        } finally {
            if (submitBtn) {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        }
    }

    // Upload Modal Functions
    function openUploadProfileModal() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    function closeUploadProfileModal() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            const previewImg = document.getElementById('profilePreviewImg');
            const previewIcon = document.getElementById('profilePreviewIcon');
            if (previewImg) {
                previewImg.classList.add('hidden');
                previewImg.src = '';
            }
            if (previewIcon) previewIcon.classList.remove('hidden');
            const input = document.getElementById('profilePictureInput');
            if (input) input.value = '';
        }
    }

    function openUploadCoverModal() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    function closeUploadCoverModal() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            const previewImg = document.getElementById('coverPreviewImg');
            const previewIcon = document.getElementById('coverPreviewIcon');
            if (previewImg) {
                previewImg.classList.add('hidden');
                previewImg.src = '';
            }
            if (previewIcon) previewIcon.classList.remove('hidden');
            const input = document.getElementById('coverPictureInput');
            if (input) input.value = '';
        }
    }

    function previewProfilePicture(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewImg = document.getElementById('profilePreviewImg');
                const previewIcon = document.getElementById('profilePreviewIcon');
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.classList.remove('hidden');
                }
                if (previewIcon) previewIcon.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    function previewCoverPicture(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewImg = document.getElementById('coverPreviewImg');
                const previewIcon = document.getElementById('coverPreviewIcon');
                if (previewImg) {
                    previewImg.src = e.target.result;
                    previewImg.classList.remove('hidden');
                }
                if (previewIcon) previewIcon.classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
    }

    async function uploadProfilePicture() {
        const fileInput = document.getElementById('profilePictureInput');
        const file = fileInput?.files[0];

        if (!file) {
            alert('Please select an image first');
            return;
        }

        const uploadBtn = document.getElementById('uploadProfileBtn');
        const originalText = uploadBtn ? uploadBtn.textContent : 'Upload';
        if (uploadBtn) {
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${PROFILE_API_BASE}/api/admin/admins/profile/upload-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload picture');
            }

            const result = await response.json();

            if (result.profile_picture) {
                const profileAvatar = document.querySelector('.profile-avatar');
                if (profileAvatar) {
                    profileAvatar.src = '../' + result.profile_picture;
                }
            }

            closeUploadProfileModal();
            alert('Profile picture updated successfully!');

        } catch (error) {
            console.error('Error uploading profile picture:', error);
            alert('Failed to upload profile picture. Please try again.');
        } finally {
            if (uploadBtn) {
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
            }
        }
    }

    async function uploadCoverPicture() {
        const fileInput = document.getElementById('coverPictureInput');
        const file = fileInput?.files[0];

        if (!file) {
            alert('Please select an image first');
            return;
        }

        const uploadBtn = document.getElementById('uploadCoverBtn');
        const originalText = uploadBtn ? uploadBtn.textContent : 'Upload';
        if (uploadBtn) {
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${PROFILE_API_BASE}/api/admin/admins/profile/upload-cover`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to upload cover');
            }

            const result = await response.json();

            if (result.cover_picture) {
                const coverImg = document.querySelector('.cover-img');
                if (coverImg) {
                    coverImg.src = '../' + result.cover_picture;
                }
            }

            closeUploadCoverModal();
            alert('Cover image updated successfully!');

        } catch (error) {
            console.error('Error uploading cover picture:', error);
            alert('Failed to upload cover image. Please try again.');
        } finally {
            if (uploadBtn) {
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
            }
        }
    }

    // Expose functions globally
    window.openEditProfileModal = openEditProfileModal;
    window.closeEditProfileModal = closeEditProfileModal;
    window.handleProfileUpdate = handleProfileUpdate;
    window.openUploadProfileModal = openUploadProfileModal;
    window.closeUploadProfileModal = closeUploadProfileModal;
    window.openUploadCoverModal = openUploadCoverModal;
    window.closeUploadCoverModal = closeUploadCoverModal;
    window.previewProfilePicture = previewProfilePicture;
    window.previewCoverPicture = previewCoverPicture;
    window.uploadProfilePicture = uploadProfilePicture;
    window.uploadCoverPicture = uploadCoverPicture;

    // Export for use by other modules
    window.AdminsProfileLoader = {
        loadProfile: loadProfileHeader,
        loadReviews: loadAdminReviews,
        getAdminEmail: getAdminEmail,
        getCurrentProfile: () => currentProfile
    };

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-admins.html')) {
            console.log('Admins Profile Loader initialized');
            loadProfileHeader();
            loadAdminReviews();
        }
    });

})();
