// ============================================
// STUDENT IMAGE UPLOAD HANDLER
// Handles profile picture and cover photo uploads
// ============================================

const StudentImageUploadHandler = {
    currentUploads: {
        profilePicture: null,
        coverPhoto: null
    },

    // Upload profile picture
    async uploadProfilePicture() {
        try {
            const file = this.currentUploads.profilePicture;
            if (!file) {
                throw new Error('No profile picture selected');
            }

            // Upload to backend
            const response = await StudentProfileAPI.uploadProfilePicture(file);

            if (response && response.url) {
                // Update profile picture in UI immediately
                this.updateProfilePicture(response.url);

                // Update state without reloading entire profile
                if (typeof StudentProfileState !== 'undefined' && StudentProfileState.studentProfile) {
                    StudentProfileState.studentProfile.profile_picture = response.url;
                }

                // Show success message
                this.showSuccessMessage('Profile picture updated successfully!');

                // Close modal
                if (typeof closeProfileUploadModal === 'function') {
                    closeProfileUploadModal();
                }

                return true;
            }

            throw new Error('Upload failed - no URL returned');
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            this.showErrorMessage('Failed to upload profile picture: ' + error.message);
            return false;
        }
    },

    // Upload cover photo
    async uploadCoverPhoto() {
        try {
            const file = this.currentUploads.coverPhoto;
            if (!file) {
                throw new Error('No cover photo selected');
            }

            // Upload to backend
            const response = await StudentProfileAPI.uploadCoverPhoto(file);

            if (response && response.url) {
                // Update cover photo in UI immediately
                this.updateCoverPhoto(response.url);

                // Update state without reloading entire profile
                if (typeof StudentProfileState !== 'undefined' && StudentProfileState.studentProfile) {
                    StudentProfileState.studentProfile.cover_image = response.url;
                }

                // Show success message
                this.showSuccessMessage('Cover photo updated successfully!');

                // Close modal
                if (typeof closeCoverUploadModal === 'function') {
                    closeCoverUploadModal();
                }

                return true;
            }

            throw new Error('Upload failed - no URL returned');
        } catch (error) {
            console.error('Error uploading cover photo:', error);
            this.showErrorMessage('Failed to upload cover photo: ' + error.message);
            return false;
        }
    },

    // Update profile picture in all locations
    updateProfilePicture(url) {
        const profileImages = document.querySelectorAll('#profile-avatar, .profile-avatar');
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

    // Show success message
    showSuccessMessage(message) {
        if (typeof StudentProfileUI !== 'undefined') {
            StudentProfileUI.showNotification(message, 'success');
        } else {
            // Fallback to simple notification
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
        if (typeof StudentProfileUI !== 'undefined') {
            StudentProfileUI.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
};
