/**
 * Manage Courses - Profile Edit Modal Handler
 * Handles loading and updating admin profile data
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';
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
            // Fetch current profile data
            const url = `${API_BASE_URL}/api/admin/manage-courses-profile/by-email/${encodeURIComponent(adminEmail)}`;
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
     */
    function populateEditForm(profile) {
        // Ethiopian name fields
        document.getElementById('firstNameInput').value = profile.first_name || '';
        document.getElementById('fatherNameInput').value = profile.father_name || '';
        document.getElementById('grandfatherNameInput').value = profile.grandfather_name || '';

        // Username
        if (document.getElementById('adminUsernameInput')) {
            document.getElementById('adminUsernameInput').value = profile.username || '';
        }

        // Contact information
        document.getElementById('emailInput').value = profile.email || '';
        document.getElementById('phoneNumberInput').value = profile.phone_number || '';

        // Bio and quote
        document.getElementById('bioInput').value = profile.bio || '';
        document.getElementById('quoteInput').value = profile.quote || '';
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

        // Gather form data
        const updateData = {
            first_name: document.getElementById('firstNameInput').value.trim(),
            father_name: document.getElementById('fatherNameInput').value.trim(),
            grandfather_name: document.getElementById('grandfatherNameInput').value.trim(),
            phone_number: document.getElementById('phoneNumberInput').value.trim(),
            bio: document.getElementById('bioInput').value.trim(),
            quote: document.getElementById('quoteInput').value.trim()
        };

        // Validate required fields
        if (!updateData.first_name || !updateData.father_name) {
            alert('First name and father name are required');
            return;
        }

        try {
            // Send update request
            const response = await fetch(`${API_BASE_URL}/api/admin/profile/${currentAdminProfile.id}`, {
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
