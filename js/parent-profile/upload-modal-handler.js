// ============================================
// PARENT PROFILE - UPLOAD MODAL HANDLER
// Handles profile picture and cover image uploads
// ============================================

// Track selected file
let selectedFile = null;
let uploadType = null;

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

// Image file selection handler - for preview
function handleImageSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    selectedFile = file;
    uploadType = type;

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';
        const imageId = type === 'cover' ? 'coverPreviewImage' : 'profilePreviewImage';
        const fileNameId = type === 'cover' ? 'coverFileName' : 'profileFileName';
        const fileSizeId = type === 'cover' ? 'coverFileSize' : 'profileFileSize';
        const dimensionsId = type === 'cover' ? 'coverDimensions' : 'profileDimensions';

        const preview = document.getElementById(previewId);
        const previewImage = document.getElementById(imageId);

        if (preview && previewImage) {
            previewImage.src = e.target.result;
            preview.style.display = 'block';

            // Set file info
            if (document.getElementById(fileNameId)) {
                document.getElementById(fileNameId).textContent = file.name;
            }
            if (document.getElementById(fileSizeId)) {
                document.getElementById(fileSizeId).textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
            }

            // Get image dimensions
            const img = new Image();
            img.onload = function() {
                if (document.getElementById(dimensionsId)) {
                    document.getElementById(dimensionsId).textContent = `${img.width} x ${img.height}px`;
                }
            };
            img.src = e.target.result;
        }
    };
    reader.readAsDataURL(file);
}

// Upload Image
async function uploadImage(type) {
    if (!selectedFile) {
        alert('Please select an image first');
        return;
    }

    try {
        // Show progress
        const progressId = type === 'cover' ? 'coverProgress' : 'profileProgress';
        const spinnerId = type === 'cover' ? 'coverSpinner' : 'profileSpinner';
        const progressFillId = type === 'cover' ? 'coverProgressFill' : 'profileProgressFill';
        const progressTextId = type === 'cover' ? 'coverProgressText' : 'profileProgressText';

        const progressEl = document.getElementById(progressId);
        const spinnerEl = document.getElementById(spinnerId);

        if (progressEl) progressEl.style.display = 'block';
        if (spinnerEl) spinnerEl.style.display = 'block';

        // Simulate progress
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                const fillEl = document.getElementById(progressFillId);
                const textEl = document.getElementById(progressTextId);
                if (fillEl) fillEl.style.width = progress + '%';
                if (textEl) textEl.textContent = `Uploading... ${progress}%`;
            }
        }, 200);

        // Upload to backend
        let response;
        if (type === 'cover') {
            response = await ParentProfileAPI.uploadCoverPhoto(selectedFile);
        } else {
            response = await ParentProfileAPI.uploadProfilePicture(selectedFile);
        }

        // Clear progress interval
        clearInterval(progressInterval);

        // Complete progress
        const fillEl = document.getElementById(progressFillId);
        const textEl = document.getElementById(progressTextId);
        if (fillEl) fillEl.style.width = '100%';
        if (textEl) textEl.textContent = 'Upload Complete! 100%';

        if (response && response.url) {
            // Update the image on page
            if (type === 'cover') {
                const coverImg = document.getElementById('cover-img');
                if (coverImg) coverImg.src = response.url;
            } else {
                const profileImg = document.getElementById('profile-avatar');
                if (profileImg) profileImg.src = response.url;
            }

            // Update state
            if (window.parentProfileData) {
                if (type === 'cover') {
                    window.parentProfileData.cover_image = response.url;
                } else {
                    window.parentProfileData.profile_picture = response.url;
                }
            }

            // Show success message
            setTimeout(() => {
                alert(`${type === 'cover' ? 'Cover photo' : 'Profile picture'} updated successfully!`);

                // Close modal
                if (type === 'cover') {
                    closeCoverUploadModal();
                } else {
                    closeProfileUploadModal();
                }
            }, 500);
        } else {
            throw new Error('Upload failed - no URL returned');
        }

    } catch (error) {
        console.error('Error uploading image:', error);
        alert(`Failed to upload ${type === 'cover' ? 'cover photo' : 'profile picture'}. Please try again.`);

        // Hide progress
        const progressId = type === 'cover' ? 'coverProgress' : 'profileProgress';
        const spinnerId = type === 'cover' ? 'coverSpinner' : 'profileSpinner';
        const progressEl = document.getElementById(progressId);
        const spinnerEl = document.getElementById(spinnerId);
        if (progressEl) progressEl.style.display = 'none';
        if (spinnerEl) spinnerEl.style.display = 'none';
    }
}

// Reset Upload
function resetUpload(type) {
    selectedFile = null;
    uploadType = null;

    const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';
    const progressId = type === 'cover' ? 'coverProgress' : 'profileProgress';
    const spinnerId = type === 'cover' ? 'coverSpinner' : 'profileSpinner';
    const inputId = type === 'cover' ? 'coverInput' : 'profileInput';
    const progressFillId = type === 'cover' ? 'coverProgressFill' : 'profileProgressFill';
    const progressTextId = type === 'cover' ? 'coverProgressText' : 'profileProgressText';

    const preview = document.getElementById(previewId);
    const progress = document.getElementById(progressId);
    const spinner = document.getElementById(spinnerId);
    const input = document.getElementById(inputId);
    const fill = document.getElementById(progressFillId);
    const text = document.getElementById(progressTextId);

    if (preview) preview.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (spinner) spinner.style.display = 'none';
    if (input) input.value = '';
    if (fill) fill.style.width = '0%';
    if (text) text.textContent = 'Uploading... 0%';
}

// Make functions available globally
window.handleProfilePictureUpload = handleProfilePictureUpload;
window.handleCoverImageUpload = handleCoverImageUpload;
window.handleImageSelect = handleImageSelect;
window.uploadImage = uploadImage;
window.resetUpload = resetUpload;
