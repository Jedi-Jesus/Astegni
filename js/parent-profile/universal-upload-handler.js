// ============================================
// PARENT UNIVERSAL UPLOAD HANDLER
// Handles cover and profile uploads using universal-upload-modal
// ============================================

let storyUploadFile = null;

/**
 * Initialize parent upload modal - hide story option
 */
function initializeParentUploadModal() {
    const uploadTypeSelect = document.getElementById('uploadType');
    if (uploadTypeSelect) {
        // Hide story option for parent profile
        const storyOption = uploadTypeSelect.querySelector('option[value="story"]');
        if (storyOption) {
            storyOption.style.display = 'none';
        }
        console.log('[ParentUpload] Story option hidden for parent profile');
    }
}

/**
 * Handle upload type change in universal modal
 */
function handleUploadTypeChange() {
    const uploadType = document.getElementById('uploadType')?.value;
    const uploadIcon = document.getElementById('uploadIcon');
    const uploadHint = document.getElementById('uploadHint');
    const uploadButton = document.getElementById('uploadButton');
    const storyInput = document.getElementById('storyInput');
    const uploadModalTitle = document.getElementById('uploadModalTitle');

    console.log('[ParentUpload] Upload type changed to:', uploadType);

    if (!uploadType) return;

    // Update modal based on upload type
    switch (uploadType) {
        case 'cover':
            if (uploadModalTitle) uploadModalTitle.textContent = 'Upload Cover Photo';
            if (uploadIcon) uploadIcon.textContent = '🖼️';
            if (uploadHint) uploadHint.textContent = 'Recommended: 1920x400px (JPG, PNG, GIF) | Max: 10MB';
            if (uploadButton) uploadButton.textContent = 'Upload Cover';
            if (storyInput) storyInput.accept = 'image/*';
            break;
        case 'profile':
            if (uploadModalTitle) uploadModalTitle.textContent = 'Upload Profile Picture';
            if (uploadIcon) uploadIcon.textContent = '👤';
            if (uploadHint) uploadHint.textContent = 'Recommended: 500x500px (JPG, PNG, GIF) | Max: 5MB';
            if (uploadButton) uploadButton.textContent = 'Upload Profile';
            if (storyInput) storyInput.accept = 'image/*';
            break;
        default:
            if (uploadModalTitle) uploadModalTitle.textContent = 'Upload File';
            if (uploadIcon) uploadIcon.textContent = '📁';
            if (uploadHint) uploadHint.textContent = 'Select a file to upload';
            if (uploadButton) uploadButton.textContent = 'Upload';
            break;
    }
}

/**
 * Close universal upload modal
 */
function closeStoryUploadModal() {
    const modal = document.getElementById('storyUploadModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // Reset upload state
    storyUploadFile = null;
    window.storyUploadFile = null;
    resetUpload('story');
}

/**
 * Handle file selection from universal modal
 */
function handleStorySelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('[ParentUpload] File selected:', file.name, file.type, file.size);

    // Store file globally
    window.storyUploadFile = file;
    storyUploadFile = file;

    // Validate file type
    const uploadType = document.getElementById('uploadType')?.value || 'profile';
    const isImage = file.type.startsWith('image/');

    if (!isImage) {
        alert('Please select an image file (JPG, PNG, GIF, WebP)');
        event.target.value = '';
        return;
    }

    // Validate file size
    const maxSize = uploadType === 'cover' ? 10 * 1024 * 1024 : 5 * 1024 * 1024; // 10MB for cover, 5MB for profile
    if (file.size > maxSize) {
        alert(`File size must be less than ${uploadType === 'cover' ? '10MB' : '5MB'}`);
        event.target.value = '';
        return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('storyPreview');
        const previewImage = document.getElementById('storyPreviewImage');
        const previewVideo = document.getElementById('storyPreviewVideo');
        const fileName = document.getElementById('storyFileName');
        const fileSize = document.getElementById('storyFileSize');
        const fileType = document.getElementById('storyFileType');

        if (preview) preview.style.display = 'block';
        if (previewImage) {
            previewImage.src = e.target.result;
            previewImage.style.display = 'block';
        }
        if (previewVideo) previewVideo.style.display = 'none';
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB';
        if (fileType) fileType.textContent = file.type;
    };
    reader.readAsDataURL(file);

    console.log('[ParentUpload] ✅ File preview displayed');
}

/**
 * Upload file based on selected type
 */
async function uploadFile() {
    if (!window.storyUploadFile && !storyUploadFile) {
        alert('Please select a file first');
        return;
    }

    const file = window.storyUploadFile || storyUploadFile;
    const uploadType = document.getElementById('uploadType')?.value;

    console.log('[ParentUpload] Starting upload:', uploadType, file.name);

    // Show progress
    const progressEl = document.getElementById('storyProgress');
    const spinnerEl = document.getElementById('storySpinner');
    const progressFill = document.getElementById('storyProgressFill');
    const progressText = document.getElementById('storyProgressText');

    if (progressEl) progressEl.style.display = 'block';
    if (spinnerEl) spinnerEl.style.display = 'block';

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 10;
        if (progress <= 90) {
            if (progressFill) progressFill.style.width = progress + '%';
            if (progressText) progressText.textContent = `Uploading... ${progress}%`;
        }
    }, 200);

    try {
        let response;

        if (uploadType === 'cover') {
            if (typeof ParentProfileAPI !== 'undefined' && ParentProfileAPI.uploadCoverPhoto) {
                response = await ParentProfileAPI.uploadCoverPhoto(file);
            } else {
                throw new Error('ParentProfileAPI not available');
            }
        } else if (uploadType === 'profile') {
            if (typeof ParentProfileAPI !== 'undefined' && ParentProfileAPI.uploadProfilePicture) {
                response = await ParentProfileAPI.uploadProfilePicture(file);
            } else {
                throw new Error('ParentProfileAPI not available');
            }
        } else {
            throw new Error('Invalid upload type');
        }

        // Clear progress interval
        clearInterval(progressInterval);

        // Complete progress
        if (progressFill) progressFill.style.width = '100%';
        if (progressText) progressText.textContent = 'Upload Complete! 100%';

        if (response && response.url) {
            console.log('[ParentUpload] ✅ Upload successful:', response.url);

            // Update the image on page
            if (uploadType === 'cover') {
                const coverImg = document.getElementById('cover-img');
                if (coverImg) coverImg.src = response.url;
            } else if (uploadType === 'profile') {
                const profileImg = document.getElementById('profile-avatar');
                if (profileImg) profileImg.src = response.url;
            }

            // Update state
            if (window.parentProfileData) {
                if (uploadType === 'cover') {
                    window.parentProfileData.cover_image = response.url;
                } else if (uploadType === 'profile') {
                    window.parentProfileData.profile_picture = response.url;
                }
            }

            // Show success message
            setTimeout(() => {
                alert(`${uploadType === 'cover' ? 'Cover photo' : 'Profile picture'} updated successfully!`);
                closeStoryUploadModal();
            }, 500);
        } else {
            throw new Error('Upload failed - no URL returned');
        }

    } catch (error) {
        console.error('[ParentUpload] Upload error:', error);
        clearInterval(progressInterval);

        // Hide progress
        if (progressEl) progressEl.style.display = 'none';
        if (spinnerEl) spinnerEl.style.display = 'none';

        alert(`Failed to upload ${uploadType === 'cover' ? 'cover photo' : 'profile picture'}. Please try again.`);
    }
}

/**
 * Reset upload state
 */
function resetUpload(type) {
    storyUploadFile = null;
    window.storyUploadFile = null;

    const preview = document.getElementById('storyPreview');
    const progress = document.getElementById('storyProgress');
    const spinner = document.getElementById('storySpinner');
    const input = document.getElementById('storyInput');
    const fill = document.getElementById('storyProgressFill');
    const text = document.getElementById('storyProgressText');

    if (preview) preview.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (spinner) spinner.style.display = 'none';
    if (input) input.value = '';
    if (fill) fill.style.width = '0%';
    if (text) text.textContent = 'Uploading... 0%';

    console.log('[ParentUpload] Upload reset');
}

// Make functions globally available
window.initializeParentUploadModal = initializeParentUploadModal;
window.handleUploadTypeChange = handleUploadTypeChange;
window.closeStoryUploadModal = closeStoryUploadModal;
window.handleStorySelect = handleStorySelect;
window.uploadFile = uploadFile;
window.resetUpload = resetUpload;

console.log('[ParentUpload] ✅ Universal upload handler loaded');
