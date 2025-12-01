// manage-campaigns.js - Campaign Management Module
// Handles all campaign management functionality for the admin panel

(function() {
    'use strict';

    // Campaign management specific functions
    window.openAddCampaignModal = function() {
        const modal = document.getElementById('add-campaign-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeAddCampaignModal = function() {
        const modal = document.getElementById('add-campaign-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.saveCampaign = function() {
        // Implement campaign saving logic here
        console.log('Saving campaign...');
        closeAddCampaignModal();
        showNotification('Campaign added successfully!', 'success');
    };

    window.reviewCampaignRequest = function(requestId) {
        console.log('Reviewing campaign request:', requestId);
        // Implement review logic
        showNotification(`Reviewing request ${requestId}`, 'info');
    };

    window.approveCampaign = function(requestId) {
        console.log('Approving campaign:', requestId);
        // Implement approval logic
        showNotification(`Campaign ${requestId} approved successfully!`, 'success');
    };

    window.rejectCampaign = function(requestId) {
        console.log('Rejecting campaign:', requestId);
        // Implement rejection logic
        showNotification(`Campaign ${requestId} rejected.`, 'warning');
    };

    window.reconsiderCampaign = function(rejectedId) {
        console.log('Reconsidering campaign:', rejectedId);
        // Implement reconsideration logic
        showNotification(`Reconsidering campaign ${rejectedId}`, 'info');
    };

    window.reinstateCampaign = function(suspendedId) {
        console.log('Reinstating campaign:', suspendedId);
        // Implement reinstatement logic
        showNotification(`Campaign ${suspendedId} reinstated successfully!`, 'success');
    };

    window.openCampaignReports = function() {
        console.log('Opening campaign reports');
        showNotification('Campaign Reports feature coming soon!', 'info');
    };

    window.openCampaignAnalytics = function() {
        console.log('Opening campaign analytics');
        showNotification('Campaign Analytics feature coming soon!', 'info');
    };

    window.openCampaignSettings = function() {
        console.log('Opening campaign settings');
        showNotification('Campaign Settings feature coming soon!', 'info');
    };

    window.openEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.openUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.openUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    };

    window.closeUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    window.handleProfileUpdate = function(event) {
        event.preventDefault();
        // Implement profile update logic
        const adminName = document.getElementById('adminNameInput').value;
        const adminNameDisplay = document.getElementById('adminName');
        if (adminNameDisplay) {
            adminNameDisplay.textContent = adminName;
        }
        closeEditProfileModal();
        showNotification('Profile updated successfully!', 'success');
    };

    window.previewProfilePicture = function(event) {
        const file = event.target.files[0];
        if (file) {
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
        }
    };

    window.previewCoverImage = function(event) {
        const file = event.target.files[0];
        if (file) {
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
        }
    };

    window.handleProfilePictureUpload = function() {
        // Implement profile picture upload logic
        console.log('Uploading profile picture...');
        closeUploadProfileModal();
        showNotification('Profile picture uploaded successfully!', 'success');
    };

    window.handleCoverImageUpload = function() {
        // Implement cover image upload logic
        console.log('Uploading cover image...');
        closeUploadCoverModal();
        showNotification('Cover image uploaded successfully!', 'success');
    };

    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            // Implement logout logic
            console.log('Logging out...');
            showNotification('Logging out...', 'info');
            // Redirect to login page
            setTimeout(() => {
                window.location.href = '../index.html';
            }, 1000);
        }
    };

    // Notification helper function
    function showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;

        // Set color based on type
        switch(type) {
            case 'success':
                notification.className += ' bg-green-500 text-white';
                break;
            case 'warning':
                notification.className += ' bg-yellow-500 text-white';
                break;
            case 'error':
                notification.className += ' bg-red-500 text-white';
                break;
            default:
                notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        // Check if we're on the campaign management page
        if (window.location.href.includes('manage-campaigns.html')) {
            console.log('Campaign Management Module initialized');

            // Add keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    // Close all modals
                    closeAddCampaignModal();
                    closeEditProfileModal();
                    closeUploadProfileModal();
                    closeUploadCoverModal();
                }
            });

            // Initialize panel state from URL
            const urlParams = new URLSearchParams(window.location.search);
            const panel = urlParams.get('panel');
            if (panel) {
                // switchPanel function is provided by panel-manager.js
                if (typeof window.switchPanel === 'function') {
                    window.switchPanel(panel);
                }
            }
        }
    });
})();