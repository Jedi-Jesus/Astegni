// ============================================
// PARENT PROFILE - UPLOAD MODAL HANDLER
// Handles profile picture and cover image uploads
// ============================================

// Profile picture upload functionality
async function handleProfilePictureUpload(file) {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please select a valid image file (JPG, PNG, GIF, WebP)', 'error');
        return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('Image must be less than 5MB', 'error');
        return;
    }

    try {
        // Show loading indicator
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) {
            avatarEl.style.opacity = '0.5';
        }

        // Upload via API
        const result = await ParentProfileAPI.uploadProfilePicture(file);
        console.log('[ParentProfile] Profile picture uploaded:', result);

        // Update display
        if (avatarEl && result.url) {
            avatarEl.src = result.url;
            avatarEl.style.opacity = '1';
        }

        // Update stored profile data
        if (window.parentProfileData) {
            window.parentProfileData.profile_picture = result.url;
        }

        showNotification('Profile picture updated successfully!', 'success');
    } catch (error) {
        console.error('[ParentProfile] Error uploading profile picture:', error);
        showNotification('Failed to upload profile picture. Please try again.', 'error');

        // Restore opacity
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) {
            avatarEl.style.opacity = '1';
        }
    }
}

// Cover image upload functionality
async function handleCoverImageUpload(file) {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showNotification('Please select a valid image file (JPG, PNG, GIF, WebP)', 'error');
        return;
    }

    // Validate file size (max 10MB for cover)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('Cover image must be less than 10MB', 'error');
        return;
    }

    try {
        // Show loading indicator
        const coverEl = document.getElementById('cover-img');
        if (coverEl) {
            coverEl.style.opacity = '0.5';
        }

        // Upload via API
        const result = await ParentProfileAPI.uploadCoverPhoto(file);
        console.log('[ParentProfile] Cover image uploaded:', result);

        // Update display
        if (coverEl && result.url) {
            coverEl.src = result.url;
            coverEl.style.opacity = '1';
        }

        // Update stored profile data
        if (window.parentProfileData) {
            window.parentProfileData.cover_image = result.url;
        }

        showNotification('Cover image updated successfully!', 'success');
    } catch (error) {
        console.error('[ParentProfile] Error uploading cover image:', error);
        showNotification('Failed to upload cover image. Please try again.', 'error');

        // Restore opacity
        const coverEl = document.getElementById('cover-img');
        if (coverEl) {
            coverEl.style.opacity = '1';
        }
    }
}

// Image file selection handler
function handleImageSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    if (type === 'profile') {
        handleProfilePictureUpload(file);
    } else if (type === 'cover') {
        handleCoverImageUpload(file);
    }
}

// Make functions available globally
window.handleProfilePictureUpload = handleProfilePictureUpload;
window.handleCoverImageUpload = handleCoverImageUpload;
window.handleImageSelect = handleImageSelect;
