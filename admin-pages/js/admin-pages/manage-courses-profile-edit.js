/**
 * Manage Courses - Profile Edit Modal Handler
 * Handles loading and updating admin profile data
 */

(function() {
    'use strict';

    // Use global API_BASE_URL set by api-config.js
    const API_BASE_URL_LOCAL = window.API_BASE_URL || 'http://localhost:8000';
    let currentAdminProfile = null;

    /**
     * Open Edit Profile Modal and populate with current data
     */
    window.openEditProfileModal = async function() {
        const modal = document.getElementById('edit-profile-modal');
        if (!modal) {
            console.error('Edit profile modal not found');
            return;
        }

        // Get admin email
        const adminEmail = getAdminEmailFromPage();
        if (!adminEmail) {
            alert('Could not identify logged-in admin');
            return;
        }

        console.log('Opening edit profile modal for email:', adminEmail);

        try {
            // Fetch current profile data (using new dual-database endpoint)
            const url = `${API_BASE_URL_LOCAL}/api/admin/courses/profile/by-email/${encodeURIComponent(adminEmail)}`;
            console.log('Fetching profile from:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            currentAdminProfile = await response.json();
            console.log('Loaded profile data:', currentAdminProfile);
            console.log('Profile ID:', currentAdminProfile.id);

            // Populate form fields
            populateEditForm(currentAdminProfile);

            // Show modal
            modal.classList.remove('hidden');
            modal.classList.add('flex');

            // Initialize geolocation UI (show/hide detect button based on allow_location state)
            if (typeof initGeolocationUI === 'function') {
                initGeolocationUI();
            }

        } catch (error) {
            console.error('Error opening edit profile modal:', error);
            alert('Error loading profile data');
        }
    };

    /**
     * Close Edit Profile Modal
     */
    window.closeEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    /**
     * Populate edit form with current profile data
     * Fields match manage_courses_profile table: username, hero_title[], hero_subtitle, bio, quote, location[], languages
     */
    function populateEditForm(profile) {
        // Helper to safely set input value
        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value || '';
        };

        // Username
        setVal('editUsername', profile.username);

        // Hero Subtitle
        setVal('editHeroSubtitle', profile.hero_subtitle);

        // Bio
        setVal('editBio', profile.bio);

        // Quote
        setVal('editQuote', profile.quote);

        // Languages (convert array to comma-separated string)
        const languages = Array.isArray(profile.languages) ? profile.languages.join(', ') : (profile.languages || '');
        setVal('editLanguages', languages);

        // Allow Location checkbox (GPS detection permission)
        const allowLocationCheckbox = document.getElementById('editAllowLocation');
        if (allowLocationCheckbox) {
            allowLocationCheckbox.checked = profile.allow_location || false;
        }

        // Display Location checkbox (public visibility)
        const displayLocationCheckbox = document.getElementById('editDisplayLocation');
        if (displayLocationCheckbox) {
            displayLocationCheckbox.checked = profile.display_location !== false; // Default to true
        }

        // Hero Titles (array field)
        const heroTitleContainer = document.getElementById('heroTitleContainer');
        if (heroTitleContainer) {
            heroTitleContainer.innerHTML = '';
            const heroTitles = Array.isArray(profile.hero_title) ? profile.hero_title : [];
            if (heroTitles.length > 0) {
                heroTitles.forEach((title, index) => {
                    addHeroTitleFieldWithValue(title);
                });
            } else {
                // Add one empty field
                addHeroTitleField();
            }
        }

        // Locations (array field)
        const locationContainer = document.getElementById('locationContainer');
        if (locationContainer) {
            locationContainer.innerHTML = '';
            const locations = Array.isArray(profile.location) ? profile.location : [];
            if (locations.length > 0) {
                locations.forEach((loc, index) => {
                    addLocationFieldWithValue(loc);
                });
            } else {
                // Add one empty field
                addLocationField();
            }
        }
    }

    /**
     * Add a hero title input field
     */
    window.addHeroTitleField = function() {
        addHeroTitleFieldWithValue('');
    };

    function addHeroTitleFieldWithValue(value) {
        const container = document.getElementById('heroTitleContainer');
        if (!container) return;

        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.innerHTML = `
            <input type="text" class="hero-title-input flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Course Manager" value="${value || ''}">
            <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }

    /**
     * Add a location input field
     * @param {string} value - Optional location value to pre-fill
     */
    window.addLocationField = function(value) {
        addLocationFieldWithValue(value || '');
    };

    function addLocationFieldWithValue(value) {
        const container = document.getElementById('locationContainer');
        if (!container) return;

        const div = document.createElement('div');
        div.className = 'flex gap-2 items-center';
        div.innerHTML = `
            <input type="text" class="location-input flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Addis Ababa" value="${value || ''}">
            <button type="button" onclick="this.parentElement.remove()" class="text-red-500 hover:text-red-700">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(div);
    }

    /**
     * Get all hero titles from the form
     */
    window.getHeroTitles = function() {
        const inputs = document.querySelectorAll('.hero-title-input');
        return Array.from(inputs).map(input => input.value.trim()).filter(val => val !== '');
    };

    /**
     * Get all locations from the form
     */
    window.getLocations = function() {
        const inputs = document.querySelectorAll('.location-input');
        return Array.from(inputs).map(input => input.value.trim()).filter(val => val !== '');
    }

    /**
     * Handle Profile Update Form Submission
     */
    window.handleProfileUpdate = async function(event) {
        event.preventDefault();

        if (!currentAdminProfile || !currentAdminProfile.id) {
            alert('Profile data not loaded');
            return;
        }

        // Helper to get input value
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        // Get languages from comma-separated input
        const languagesInput = getVal('editLanguages');
        const languages = languagesInput
            ? languagesInput.split(',').map(lang => lang.trim()).filter(lang => lang !== '')
            : [];

        // Get hero_title and location arrays
        const heroTitles = window.getHeroTitles ? window.getHeroTitles() : [];
        const locations = window.getLocations ? window.getLocations() : [];

        // Get allow_location checkbox value (GPS detection permission)
        const allowLocationCheckbox = document.getElementById('editAllowLocation');
        const allowLocation = allowLocationCheckbox ? allowLocationCheckbox.checked : false;

        // Get display_location checkbox value (public visibility)
        const displayLocationCheckbox = document.getElementById('editDisplayLocation');
        const displayLocation = displayLocationCheckbox ? displayLocationCheckbox.checked : true;

        // Gather form data matching manage_courses_profile table
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

        try {
            // Send update request to manage-courses-profile endpoint
            // This updates both admin_profile (names, phone) and manage_courses_profile (bio, quote)
            const response = await fetch(`${API_BASE_URL_LOCAL}/api/admin/manage-courses-profile/${currentAdminProfile.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedProfile = await response.json();

            // Update the page with new data
            if (window.DashboardLoader && window.DashboardLoader.loadProfile) {
                await window.DashboardLoader.loadProfile();
            }

            // Close modal
            closeEditProfileModal();

            // Show success message
            showSuccessNotification('Profile updated successfully!');

            console.log('Profile updated:', updatedProfile);

        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Error updating profile. Please try again.');
        }
    };

    /**
     * Open Upload Profile Picture Modal
     */
    window.openUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    /**
     * Close Upload Profile Picture Modal
     */
    window.closeUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        // Clear preview
        const preview = document.getElementById('profilePreview');
        if (preview) {
            preview.classList.add('hidden');
        }
    };

    /**
     * Preview profile picture before upload
     */
    window.previewProfilePicture = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        // Show preview
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
    };

    /**
     * Handle profile picture upload
     */
    window.handleProfilePictureUpload = async function() {
        const fileInput = document.getElementById('profilePictureInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file');
            return;
        }

        // TODO: Implement actual upload to Backblaze B2
        alert('Image upload feature coming soon!\n\nThis will upload to Backblaze B2 and update the database.');

        // For now, just close the modal
        closeUploadProfileModal();
    };

    /**
     * Open Upload Cover Image Modal
     */
    window.openUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    /**
     * Close Upload Cover Image Modal
     */
    window.closeUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        // Clear preview
        const preview = document.getElementById('coverPreview');
        if (preview) {
            preview.classList.add('hidden');
        }
    };

    /**
     * Preview cover image before upload
     */
    window.previewCoverImage = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (10MB max for cover)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        // Show preview
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
    };

    /**
     * Handle cover image upload
     */
    window.handleCoverImageUpload = async function() {
        const fileInput = document.getElementById('coverImageInput');
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select a file');
            return;
        }

        // TODO: Implement actual upload to Backblaze B2
        alert('Image upload feature coming soon!\n\nThis will upload to Backblaze B2 and update the database.');

        // For now, just close the modal
        closeUploadCoverModal();
    };

    /**
     * Get admin email from page/authentication
     * Uses same logic as manage-courses-dashboard-loader.js getAdminEmail()
     */
    function getAdminEmailFromPage() {
        // Method 1: Check if authManager has current user
        if (typeof authManager !== 'undefined' && authManager && authManager.getCurrentUser) {
            const user = authManager.getCurrentUser();
            if (user && user.email) {
                console.log('Got admin email from authManager:', user.email);
                return user.email;
            }
        }

        // Method 2: Check localStorage for currentUser
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.email) {
                    console.log('Got admin email from localStorage currentUser:', user.email);
                    return user.email;
                }
            } catch (e) {
                console.error('Error parsing stored user:', e);
            }
        }

        // Method 3: Try to decode JWT token
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
                    console.log('Got admin email from JWT token:', payload.email);
                    return payload.email;
                }
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }

        // Fallback for testing - remove in production
        console.warn('Could not find admin email, using test email');
        return 'test1@example.com';
    }

    /**
     * Show success notification
     */
    function showSuccessNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg bg-green-500 text-white transition-all duration-300';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Close modals on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeEditProfileModal();
            closeUploadProfileModal();
            closeUploadCoverModal();
        }
    });

    console.log('✅ Manage Courses Profile Edit module initialized');

})();
