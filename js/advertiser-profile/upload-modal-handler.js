// ============================================
// UPLOAD MODAL HANDLER - ADVERTISER PROFILE
// Handles cover and profile picture upload modals with Backblaze integration
// ============================================

// Global variables for file handling
let selectedFile = null;
let uploadType = null;

// Open Cover Upload Modal
function openCoverUploadModal() {
    document.getElementById('coverUploadModal').style.display = 'flex';
    resetUpload('cover');
}

// Close Cover Upload Modal
function closeCoverUploadModal() {
    document.getElementById('coverUploadModal').style.display = 'none';
    resetUpload('cover');
}

// Open Profile Upload Modal
function openProfileUploadModal() {
    document.getElementById('profileUploadModal').style.display = 'flex';
    resetUpload('profile');
}

// Close Profile Upload Modal
function closeProfileUploadModal() {
    document.getElementById('profileUploadModal').style.display = 'none';
    resetUpload('profile');
}

// Handle Image Selection
function handleImageSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    selectedFile = file;
    uploadType = type;

    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
    }

    const maxSize = type === 'cover' ? 5 * 1024 * 1024 : 2 * 1024 * 1024; // 5MB for cover, 2MB for profile
    if (file.size > maxSize) {
        const maxSizeMB = maxSize / (1024 * 1024);
        alert(`File size must be less than ${maxSizeMB}MB`);
        return;
    }

    // Show preview
    showImagePreview(file, type);
}

// Show Image Preview
function showImagePreview(file, type) {
    const reader = new FileReader();

    reader.onload = function(e) {
        const previewId = type === 'cover' ? 'coverPreview' : 'profilePreview';
        const imageId = type === 'cover' ? 'coverPreviewImage' : 'profilePreviewImage';
        const fileNameId = type === 'cover' ? 'coverFileName' : 'profileFileName';
        const fileSizeId = type === 'cover' ? 'coverFileSize' : 'profileFileSize';
        const dimensionsId = type === 'cover' ? 'coverDimensions' : 'profileDimensions';

        // Show preview container
        document.getElementById(previewId).style.display = 'block';

        // Set image
        document.getElementById(imageId).src = e.target.result;

        // Set file info
        document.getElementById(fileNameId).textContent = file.name;
        document.getElementById(fileSizeId).textContent = formatFileSize(file.size);

        // Get image dimensions
        const img = new Image();
        img.onload = function() {
            document.getElementById(dimensionsId).textContent = `${this.width} x ${this.height}px`;
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// Upload Image to Backblaze via Backend
async function uploadImage(type) {
    if (!selectedFile) {
        alert('Please select an image first');
        return;
    }

    try {
        console.log(`📤 Uploading ${type} image to Backblaze...`);

        // Show progress
        const progressId = type === 'cover' ? 'coverProgress' : 'profileProgress';
        const spinnerId = type === 'cover' ? 'coverSpinner' : 'profileSpinner';
        const progressFillId = type === 'cover' ? 'coverProgressFill' : 'profileProgressFill';
        const progressTextId = type === 'cover' ? 'coverProgressText' : 'profileProgressText';

        document.getElementById(progressId).style.display = 'block';
        document.getElementById(spinnerId).style.display = 'block';

        // Simulate progress (since we don't have real upload progress)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                document.getElementById(progressFillId).style.width = progress + '%';
                document.getElementById(progressTextId).textContent = `Uploading... ${progress}%`;
            }
        }, 200);

        // Upload to backend (which uploads to Backblaze)
        let response;
        if (type === 'cover') {
            response = await AdvertiserProfileAPI.uploadCoverPhoto(selectedFile);
        } else {
            response = await AdvertiserProfileAPI.uploadProfilePicture(selectedFile);
        }

        // Clear progress interval
        clearInterval(progressInterval);

        // Complete progress
        document.getElementById(progressFillId).style.width = '100%';
        document.getElementById(progressTextId).textContent = 'Upload Complete! 100%';

        console.log('✅ Upload successful:', response);

        if (response && response.url) {
            // Update the image on page immediately
            if (type === 'cover') {
                const coverImg = document.getElementById('hero-cover');
                if (coverImg) coverImg.src = response.url;
            } else {
                const profileImg = document.getElementById('hero-avatar');
                if (profileImg) profileImg.src = response.url;

                // Also update nav profile pic
                const navProfilePic = document.getElementById('nav-profile-pic');
                if (navProfilePic) navProfilePic.src = response.url;
            }

            // Update AdvertiserProfileDataLoader state
            if (typeof AdvertiserProfileDataLoader !== 'undefined' && AdvertiserProfileDataLoader.profileData) {
                if (type === 'cover') {
                    AdvertiserProfileDataLoader.profileData.cover_image = response.url;
                } else {
                    AdvertiserProfileDataLoader.profileData.profile_picture = response.url;
                }
            }

            // Show success message
            setTimeout(() => {
                alert(`${type === 'cover' ? 'Cover photo' : 'Profile picture'} uploaded successfully to Backblaze!`);

                // Close modal
                if (type === 'cover') {
                    closeCoverUploadModal();
                } else {
                    closeProfileUploadModal();
                }

                // Reload profile to show latest changes
                if (typeof AdvertiserProfileDataLoader !== 'undefined') {
                    AdvertiserProfileDataLoader.loadCompleteProfile();
                }
            }, 500);
        } else {
            throw new Error('Upload failed - no URL returned');
        }

    } catch (error) {
        console.error('❌ Error uploading image:', error);
        alert(`Failed to upload ${type === 'cover' ? 'cover photo' : 'profile picture'}. Please try again.\n\nError: ${error.message}`);

        // Hide progress
        const progressId = type === 'cover' ? 'coverProgress' : 'profileProgress';
        const spinnerId = type === 'cover' ? 'coverSpinner' : 'profileSpinner';
        document.getElementById(progressId).style.display = 'none';
        document.getElementById(spinnerId).style.display = 'none';
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

    // Hide preview
    document.getElementById(previewId).style.display = 'none';

    // Hide progress
    document.getElementById(progressId).style.display = 'none';
    document.getElementById(spinnerId).style.display = 'none';

    // Reset progress
    document.getElementById(progressFillId).style.width = '0%';

    // Reset file input
    document.getElementById(inputId).value = '';
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Close modals on ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const coverModal = document.getElementById('coverUploadModal');
        const profileModal = document.getElementById('profileUploadModal');

        if (coverModal && coverModal.style.display === 'flex') {
            closeCoverUploadModal();
        }
        if (profileModal && profileModal.style.display === 'flex') {
            closeProfileUploadModal();
        }
    }
});

// Close modals on overlay click
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('upload-cover-modal')) {
        closeCoverUploadModal();
    }
    if (event.target.classList.contains('upload-profile-modal')) {
        closeProfileUploadModal();
    }
});

// Upload spinner CSS (injected dynamically)
const uploadSpinnerStyle = document.createElement('style');
uploadSpinnerStyle.textContent = `
    .upload-spinner {
        width: 40px;
        height: 40px;
        margin: 1rem auto;
        border: 4px solid var(--highlight-bg);
        border-top: 4px solid var(--button-bg);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(uploadSpinnerStyle);

console.log('✅ Advertiser upload modal handler loaded');
