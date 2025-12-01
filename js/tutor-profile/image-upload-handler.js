// ============================================
// IMAGE UPLOAD HANDLER
// Handles profile picture and cover photo uploads
// ============================================

const ImageUploadHandler = {
    // Initialize upload handlers
    init() {
        this.setupProfilePictureUpload();
        this.setupCoverPhotoUpload();
    },

    // Setup profile picture upload
    setupProfilePictureUpload() {
        const uploadBtn = document.getElementById('upload-profile-picture-btn');
        const fileInput = document.getElementById('profile-picture-input');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        }

        // Also setup modal-based upload if exists
        const modalUploadBtn = document.getElementById('modal-profile-upload-btn');
        const modalFileInput = document.getElementById('modal-profile-picture-input');

        if (modalUploadBtn && modalFileInput) {
            modalUploadBtn.addEventListener('click', () => modalFileInput.click());
            modalFileInput.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        }
    },

    // Setup cover photo upload
    setupCoverPhotoUpload() {
        const uploadBtn = document.getElementById('upload-cover-photo-btn');
        const fileInput = document.getElementById('cover-photo-input');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleCoverPhotoUpload(e));
        }

        // Also setup modal-based upload if exists
        const modalUploadBtn = document.getElementById('modal-cover-upload-btn');
        const modalFileInput = document.getElementById('modal-cover-photo-input');

        if (modalUploadBtn && modalFileInput) {
            modalUploadBtn.addEventListener('click', () => modalFileInput.click());
            modalFileInput.addEventListener('change', (e) => this.handleCoverPhotoUpload(e));
        }
    },

    // Handle profile picture upload
    async handleProfilePictureUpload(event) {
        const file = event.target.files[0];

        if (!file) return;

        // Validate file
        if (!this.validateImageFile(file)) {
            return;
        }

        try {
            // Show loading state
            this.showUploadLoading('profile');

            // Preview image immediately
            this.previewImage(file, 'profile-avatar');

            // Upload to backend
            const response = await TutorProfileAPI.uploadProfilePicture(file);

            if (response && response.url) {
                // Update image with backend URL immediately
                this.updateProfilePicture(response.url);

                // Update state without reloading entire profile to prevent data override
                if (typeof TutorProfileState !== 'undefined' && TutorProfileState.tutorProfile) {
                    TutorProfileState.tutorProfile.profile_picture = response.url;
                }

                // Show success message
                this.showSuccessMessage('Profile picture updated successfully!');
            } else {
                throw new Error('Upload failed - no URL returned');
            }

        } catch (error) {
            console.error('Error uploading profile picture:', error);
            this.showErrorMessage('Failed to upload profile picture. Please try again.');
        } finally {
            this.hideUploadLoading('profile');
        }
    },

    // Handle cover photo upload
    async handleCoverPhotoUpload(event) {
        const file = event.target.files[0];

        if (!file) return;

        // Validate file
        if (!this.validateImageFile(file, 5 * 1024 * 1024)) { // 5MB limit for cover
            return;
        }

        try {
            // Show loading state
            this.showUploadLoading('cover');

            // Preview image immediately
            this.previewImage(file, 'cover-img');

            // Upload to backend
            const response = await TutorProfileAPI.uploadCoverPhoto(file);

            if (response && response.url) {
                // Update image with backend URL immediately
                this.updateCoverPhoto(response.url);

                // Update state without reloading entire profile to prevent data override
                if (typeof TutorProfileState !== 'undefined' && TutorProfileState.tutorProfile) {
                    TutorProfileState.tutorProfile.cover_image = response.url;
                }

                // Show success message
                this.showSuccessMessage('Cover photo updated successfully!');
            } else {
                throw new Error('Upload failed - no URL returned');
            }

        } catch (error) {
            console.error('Error uploading cover photo:', error);
            this.showErrorMessage('Failed to upload cover photo. Please try again.');
        } finally {
            this.hideUploadLoading('cover');
        }
    },

    // Validate image file
    validateImageFile(file, maxSize = 2 * 1024 * 1024) { // 2MB default
        // Check file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
            return false;
        }

        // Check file size
        if (file.size > maxSize) {
            const maxSizeMB = maxSize / (1024 * 1024);
            alert(`File size must be less than ${maxSizeMB}MB`);
            return false;
        }

        return true;
    },

    // Preview image before upload
    previewImage(file, imageElementId) {
        const reader = new FileReader();

        reader.onload = (e) => {
            const imgElements = document.querySelectorAll(`#${imageElementId}, .${imageElementId}`);
            imgElements.forEach(img => {
                if (img) {
                    img.src = e.target.result;
                }
            });
        };

        reader.readAsDataURL(file);
    },

    // Update profile picture in all locations
    updateProfilePicture(url) {
        const profileImages = document.querySelectorAll('#profile-avatar, .profile-avatar, #tutor-avatar, .tutor-avatar');
        profileImages.forEach(img => {
            if (img) {
                img.src = url;
            }
        });
    },

    // Update cover photo
    updateCoverPhoto(url) {
        const coverImages = document.querySelectorAll('#cover-img, .cover-img');
        coverImages.forEach(img => {
            if (img) {
                img.src = url;
            }
        });
    },

    // Show upload loading state
    showUploadLoading(type) {
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = `${type}-upload-loading`;
        loadingOverlay.className = 'upload-loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="upload-spinner">
                <div class="spinner"></div>
                <p>Uploading ${type === 'profile' ? 'profile picture' : 'cover photo'}...</p>
            </div>
        `;

        const targetElement = type === 'profile'
            ? document.querySelector('.profile-avatar-container')
            : document.querySelector('.cover-image-container');

        if (targetElement) {
            targetElement.style.position = 'relative';
            targetElement.appendChild(loadingOverlay);
        }
    },

    // Hide upload loading state
    hideUploadLoading(type) {
        const loadingOverlay = document.getElementById(`${type}-upload-loading`);
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    },

    // Show success message
    showSuccessMessage(message) {
        // Use existing notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        } else {
            // Fallback to simple alert
            const notification = document.createElement('div');
            notification.className = 'upload-notification success';
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
    },

    // Show error message
    showErrorMessage(message) {
        // Use existing notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
};

// Add CSS for loading spinner (inline)
const imageUploadStyle = document.createElement('style');
imageUploadStyle.textContent = `
    .upload-loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        border-radius: inherit;
    }

    .upload-spinner {
        text-align: center;
        color: white;
    }

    .spinner {
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(imageUploadStyle);
