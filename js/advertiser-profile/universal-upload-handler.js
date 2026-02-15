// ============================================
// ADVERTISER UNIVERSAL UPLOAD HANDLER
// Handles cover, profile, and story uploads using universal-upload-modal
// ============================================

let storyUploadFile = null;

/**
 * Open universal upload modal with specific type
 * @param {string} uploadType - 'cover', 'profile', or 'story'
 */
function openUniversalUploadModal(uploadType = 'story') {
    console.log('[AdvertiserUpload] Opening universal upload modal for:', uploadType);

    // CommonModalLoader preloads all modals, so modal should already be in DOM
    const tryOpenModal = () => {
        const modal = document.getElementById('storyUploadModal');

        if (!modal) {
            console.log('[AdvertiserUpload] Modal not loaded yet, waiting...');
            // Modal not loaded yet, wait and retry
            setTimeout(tryOpenModal, 100);
            return;
        }

        // Detect profile type from URL
        const currentPage = window.location.pathname;
        const isTutorProfile = currentPage.includes('tutor-profile.html');

        // Hide story option for non-tutor profiles
        const uploadTypeSelect = document.getElementById('uploadType');
        if (uploadTypeSelect) {
            const storyOption = uploadTypeSelect.querySelector('option[value="story"]');
            if (storyOption) {
                if (isTutorProfile) {
                    storyOption.style.display = 'block';
                } else {
                    storyOption.style.display = 'none';
                    // If story was requested but we're not on tutor profile, default to cover
                    if (uploadType === 'story') {
                        uploadType = 'cover';
                    }
                }
            }

            uploadTypeSelect.value = uploadType;
            // Trigger change to update modal UI
            if (typeof handleUploadTypeChange === 'function') {
                handleUploadTypeChange();
            }
        }

        // Show modal
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        console.log('[AdvertiserUpload] ✅ Universal modal opened');
    };

    tryOpenModal();
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
    resetUpload('story');
}

/**
 * Handle file selection from universal modal
 */
function handleStorySelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    console.log('[AdvertiserUpload] File selected:', file.name, file.type, file.size);

    // Store file globally
    window.storyUploadFile = file;
    storyUploadFile = file;

    // Validate file type
    const uploadType = document.getElementById('uploadType')?.value || 'story';
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (uploadType === 'cover' || uploadType === 'profile') {
        if (!isImage) {
            alert('Please select an image file');
            return;
        }
    }

    // Show preview
    const previewContainer = document.getElementById('storyPreview');
    const previewImage = document.getElementById('storyPreviewImage');
    const previewVideo = document.getElementById('storyPreviewVideo');

    if (previewContainer) {
        previewContainer.style.display = 'block';

        if (isImage) {
            previewImage.style.display = 'block';
            previewVideo.style.display = 'none';
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else if (isVideo) {
            previewImage.style.display = 'none';
            previewVideo.style.display = 'block';
            const url = URL.createObjectURL(file);
            previewVideo.src = url;
        }

        // Update file info
        document.getElementById('storyFileName').textContent = file.name;
        document.getElementById('storyFileSize').textContent = formatFileSize(file.size);
        document.getElementById('storyFileType').textContent = file.type;
    }
}

/**
 * Handle upload type change
 */
async function handleUploadTypeChange() {
    const uploadType = document.getElementById('uploadType')?.value || 'story';
    const titleEl = document.getElementById('uploadModalTitle');
    const iconEl = document.getElementById('uploadIcon');
    const hintEl = document.getElementById('uploadHint');
    const fileInput = document.getElementById('storyInput');
    const captionGroup = document.querySelector('#storyPreview .form-group');

    // Fetch user's subscription limits
    let limits = null;
    try {
        if (typeof StorageManager !== 'undefined') {
            const response = await StorageManager.getStorageLimits();
            limits = response.limits;
        }
    } catch (error) {
        console.warn('[AdvertiserUpload] Could not fetch storage limits:', error);
    }

    // Default limits
    const maxImageSizeMB = limits?.max_image_size_mb || 5;
    const maxVideoSizeMB = limits?.max_video_size_mb || 50;

    // Update modal UI based on type
    switch(uploadType) {
        case 'cover':
            if (titleEl) titleEl.textContent = 'Upload Cover Image';
            if (iconEl) iconEl.textContent = '🖼️';
            if (hintEl) hintEl.textContent = `Recommended: 1920x400px (JPG, PNG, GIF) - Max ${maxImageSizeMB}MB`;
            if (fileInput) fileInput.accept = 'image/*';
            if (captionGroup) captionGroup.style.display = 'none';
            break;

        case 'profile':
            if (titleEl) titleEl.textContent = 'Upload Profile Picture';
            if (iconEl) iconEl.textContent = '👤';
            if (hintEl) hintEl.textContent = `Recommended: 400x400px (JPG, PNG, GIF) - Max ${maxImageSizeMB}MB`;
            if (fileInput) fileInput.accept = 'image/*';
            if (captionGroup) captionGroup.style.display = 'none';
            break;

        case 'story':
        default:
            if (titleEl) titleEl.textContent = 'Upload Story';
            if (iconEl) iconEl.textContent = '📱';
            if (hintEl) hintEl.textContent = `Image: Max ${maxImageSizeMB}MB | Video: Max ${maxVideoSizeMB}MB`;
            if (fileInput) fileInput.accept = 'image/*,video/*';
            if (captionGroup) captionGroup.style.display = 'block';
            break;
    }
}

/**
 * Main upload function - routes to specific upload handler
 */
async function uploadFile() {
    const uploadType = document.getElementById('uploadType')?.value || 'story';

    console.log('[AdvertiserUpload] Upload initiated for type:', uploadType);

    switch(uploadType) {
        case 'cover':
            await uploadCoverImage();
            break;
        case 'profile':
            await uploadProfileImage();
            break;
        case 'story':
        default:
            await uploadStory();
            break;
    }
}

/**
 * Upload cover image
 */
async function uploadCoverImage() {
    if (!window.storyUploadFile) {
        alert('Please select an image first');
        return;
    }

    try {
        console.log('[AdvertiserUpload] Uploading cover image...');

        // Show progress
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'block';

        // Simulate progress animation
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                const fillEl = document.getElementById('storyProgressFill');
                const textEl = document.getElementById('storyProgressText');
                if (fillEl) fillEl.style.width = progress + '%';
                if (textEl) textEl.textContent = `Uploading... ${progress}%`;
            }
        }, 200);

        // Upload via API - Use appropriate API based on profile type
        let response;
        if (typeof AdvertiserProfileAPI !== 'undefined' && AdvertiserProfileAPI.uploadCoverPhoto) {
            response = await AdvertiserProfileAPI.uploadCoverPhoto(window.storyUploadFile);
        } else {
            // Fallback to generic API upload
            const formData = new FormData();
            formData.append('file', window.storyUploadFile);

            const token = localStorage.getItem('token');
            // FIXED: Correct endpoint is /api/upload/cover-image (not cover-photo)
            const apiResponse = await fetch(`${API_BASE_URL}/api/upload/cover-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!apiResponse.ok) {
                throw new Error(`Upload failed: ${apiResponse.statusText}`);
            }

            response = await apiResponse.json();
        }

        // Clear progress interval
        clearInterval(progressInterval);

        // Complete progress
        const fillEl = document.getElementById('storyProgressFill');
        const textEl = document.getElementById('storyProgressText');
        if (fillEl) fillEl.style.width = '100%';
        if (textEl) textEl.textContent = 'Upload Complete! 100%';

        console.log('[AdvertiserUpload] ✅ Cover uploaded:', response);

        if (response && response.url) {
            // Update cover image immediately
            const coverImg = document.getElementById('cover-img');
            if (coverImg) {
                coverImg.src = response.url;
            }

            // Update all cover images
            document.querySelectorAll('.cover-img').forEach(img => {
                img.src = response.url;
            });

            // Update profile data loader state
            if (typeof AdvertiserProfileDataLoader !== 'undefined' && AdvertiserProfileDataLoader.profileData) {
                AdvertiserProfileDataLoader.profileData.cover_image = response.url;
            }

            // Show success
            setTimeout(() => {
                alert('Cover image uploaded successfully to Backblaze!');
                closeStoryUploadModal();

                // Reload profile from database
                if (typeof AdvertiserProfileDataLoader !== 'undefined') {
                    AdvertiserProfileDataLoader.loadCompleteProfile();
                }
            }, 500);
        }

    } catch (error) {
        console.error('[AdvertiserUpload] ❌ Error uploading cover:', error);
        alert(`Failed to upload cover image. Please try again.\n\nError: ${error.message}`);

        // Hide progress
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'none';
    }
}

/**
 * Upload profile picture
 */
async function uploadProfileImage() {
    if (!window.storyUploadFile) {
        alert('Please select an image first');
        return;
    }

    try {
        console.log('[AdvertiserUpload] Uploading profile picture...');

        // Show progress
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'block';

        // Simulate progress animation
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                const fillEl = document.getElementById('storyProgressFill');
                const textEl = document.getElementById('storyProgressText');
                if (fillEl) fillEl.style.width = progress + '%';
                if (textEl) textEl.textContent = `Uploading... ${progress}%`;
            }
        }, 200);

        // Upload via API - Use appropriate API based on profile type
        let response;
        if (typeof AdvertiserProfileAPI !== 'undefined' && AdvertiserProfileAPI.uploadProfilePicture) {
            response = await AdvertiserProfileAPI.uploadProfilePicture(window.storyUploadFile);
        } else {
            // Fallback to generic API upload
            const formData = new FormData();
            formData.append('file', window.storyUploadFile);

            const token = localStorage.getItem('token');
            const apiResponse = await fetch(`${API_BASE_URL}/api/upload/profile-picture`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!apiResponse.ok) {
                throw new Error(`Upload failed: ${apiResponse.statusText}`);
            }

            response = await apiResponse.json();
        }

        // Clear progress interval
        clearInterval(progressInterval);

        // Complete progress
        const fillEl = document.getElementById('storyProgressFill');
        const textEl = document.getElementById('storyProgressText');
        if (fillEl) fillEl.style.width = '100%';
        if (textEl) textEl.textContent = 'Upload Complete! 100%';

        console.log('[AdvertiserUpload] ✅ Profile picture uploaded:', response);

        if (response && response.url) {
            // Update profile picture immediately
            const profileImg = document.getElementById('profile-avatar');
            if (profileImg) {
                profileImg.src = response.url;
            }

            // Update all profile avatars
            document.querySelectorAll('.profile-avatar').forEach(img => {
                img.src = response.url;
            });

            // Update nav profile pic
            const navProfilePic = document.getElementById('nav-profile-pic');
            if (navProfilePic) navProfilePic.src = response.url;

            // Update dropdown profile pic
            const dropdownProfilePic = document.getElementById('dropdown-profile-pic');
            if (dropdownProfilePic) dropdownProfilePic.src = response.url;

            // Update profile data loader state
            if (typeof AdvertiserProfileDataLoader !== 'undefined' && AdvertiserProfileDataLoader.profileData) {
                AdvertiserProfileDataLoader.profileData.profile_picture = response.url;
            }

            // Show success
            setTimeout(() => {
                alert('Profile picture uploaded successfully to Backblaze!');
                closeStoryUploadModal();

                // Reload profile from database
                if (typeof AdvertiserProfileDataLoader !== 'undefined') {
                    AdvertiserProfileDataLoader.loadCompleteProfile();
                }
            }, 500);
        }

    } catch (error) {
        console.error('[AdvertiserUpload] ❌ Error uploading profile picture:', error);
        alert(`Failed to upload profile picture. Please try again.\n\nError: ${error.message}`);

        // Hide progress
        const progressEl = document.getElementById('storyProgress');
        if (progressEl) progressEl.style.display = 'none';
    }
}

/**
 * Upload story (placeholder)
 */
async function uploadStory() {
    alert('Story upload coming soon for advertiser profiles!');
}

/**
 * Reset upload state
 */
function resetUpload(type) {
    storyUploadFile = null;
    window.storyUploadFile = null;

    const previewContainer = document.getElementById('storyPreview');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    const progressEl = document.getElementById('storyProgress');
    if (progressEl) {
        progressEl.style.display = 'none';
    }

    const fillEl = document.getElementById('storyProgressFill');
    if (fillEl) {
        fillEl.style.width = '0%';
    }

    const textEl = document.getElementById('storyProgressText');
    if (textEl) {
        textEl.textContent = 'Uploading... 0%';
    }

    const fileInput = document.getElementById('storyInput');
    if (fileInput) {
        fileInput.value = '';
    }
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Make functions globally available
window.openUniversalUploadModal = openUniversalUploadModal;
window.closeStoryUploadModal = closeStoryUploadModal;
window.handleStorySelect = handleStorySelect;
window.handleUploadTypeChange = handleUploadTypeChange;
window.uploadFile = uploadFile;
window.resetUpload = resetUpload;

console.log('[AdvertiserUpload] ✅ Universal upload handler loaded');
