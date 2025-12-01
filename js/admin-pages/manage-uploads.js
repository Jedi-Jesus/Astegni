// Upload Management Functions
// Page-specific JavaScript for manage-uploads.html

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Upload Management page loaded');

    // Initialize panel manager
    if (typeof initializePanelManager === 'function') {
        initializePanelManager();
    }

    // Set active sidebar link
    updateActiveSidebarLink();
});

// Update active sidebar link based on current panel
function updateActiveSidebarLink() {
    const currentPanel = new URLSearchParams(window.location.search).get('panel') || 'dashboard';
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    sidebarLinks.forEach(link => {
        link.classList.remove('active');
        const linkText = link.textContent.toLowerCase();

        if (currentPanel === 'dashboard' && linkText.includes('dashboard')) {
            link.classList.add('active');
        } else if (currentPanel === 'all-uploads' && linkText.includes('all uploads')) {
            link.classList.add('active');
        } else if (currentPanel === 'images' && linkText.includes('images')) {
            link.classList.add('active');
        } else if (currentPanel === 'videos' && linkText.includes('videos')) {
            link.classList.add('active');
        } else if (currentPanel === 'documents' && linkText.includes('documents')) {
            link.classList.add('active');
        } else if (currentPanel === 'flagged' && linkText.includes('flagged')) {
            link.classList.add('active');
        }
    });
}

// Storage Analytics Modal
function openStorageAnalytics() {
    alert('Opening Storage Analytics Dashboard...');
    // TODO: Implement storage analytics modal
}

// Upload Settings Modal
function openUploadSettings() {
    alert('Opening Upload Settings...');
    // TODO: Implement upload settings modal
}

// Content Policy Modal
function openContentPolicy() {
    alert('Opening Content Policy Guidelines...');
    // TODO: Implement content policy modal
}

// Review Content Function
function reviewContent(contentId) {
    console.log('Reviewing content:', contentId);
    // TODO: Implement content review functionality
    alert(`Reviewing flagged content: ${contentId}`);
}

// Approve Content Function
function approveContent(contentId) {
    console.log('Approving content:', contentId);
    if (confirm(`Are you sure you want to approve content ${contentId}?`)) {
        // TODO: Implement content approval
        alert(`Content ${contentId} has been approved!`);
    }
}

// Remove Content Function
function removeContent(contentId) {
    console.log('Removing content:', contentId);
    if (confirm(`Are you sure you want to remove content ${contentId}? This action cannot be undone.`)) {
        // TODO: Implement content removal
        alert(`Content ${contentId} has been removed!`);
    }
}

// Export Uploads Function
function exportUploads() {
    console.log('Exporting uploads data...');
    // TODO: Implement export functionality
    alert('Preparing uploads export...');
}

// File Preview Function
function previewFile(fileId, fileType) {
    console.log('Previewing file:', fileId, 'Type:', fileType);
    // TODO: Implement file preview modal
}

// Delete Upload Function
function deleteUpload(uploadId) {
    if (confirm(`Are you sure you want to delete upload ${uploadId}?`)) {
        console.log('Deleting upload:', uploadId);
        // TODO: Implement delete functionality
        alert(`Upload ${uploadId} has been deleted!`);
    }
}

// Edit Upload Details Function
function editUploadDetails(uploadId) {
    console.log('Editing upload details:', uploadId);
    // TODO: Implement edit modal
    alert(`Editing details for upload ${uploadId}`);
}

// View User Profile Function
function viewUserProfile(userId) {
    console.log('Viewing user profile:', userId);
    // TODO: Navigate to user profile or show modal
}

// Filter Uploads by Type
function filterByType(type) {
    console.log('Filtering uploads by type:', type);
    // TODO: Implement filtering logic
}

// Sort Uploads
function sortUploads(sortBy) {
    console.log('Sorting uploads by:', sortBy);
    // TODO: Implement sorting logic
}

// Bulk Actions
function performBulkAction(action) {
    const selectedItems = document.querySelectorAll('.upload-checkbox:checked');
    if (selectedItems.length === 0) {
        alert('Please select at least one item');
        return;
    }

    console.log(`Performing ${action} on ${selectedItems.length} items`);
    // TODO: Implement bulk actions
}

// Storage Quota Management
function updateStorageQuota(userId, newQuota) {
    console.log('Updating storage quota for user:', userId, 'New quota:', newQuota);
    // TODO: Implement quota update
}

// Flag Content Function
function flagContent(contentId, reason) {
    console.log('Flagging content:', contentId, 'Reason:', reason);
    // TODO: Implement flagging functionality
}

// Generate Storage Report
function generateStorageReport() {
    console.log('Generating storage report...');
    // TODO: Implement report generation
    alert('Generating storage report...');
}

// Profile Modal Functions (shared with other admin pages)
function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Handle Profile Update
function handleProfileUpdate(event) {
    event.preventDefault();
    console.log('Updating profile...');
    // TODO: Implement profile update
    alert('Profile updated successfully!');
    closeEditProfileModal();
}

// Preview Profile Picture
function previewProfilePicture(event) {
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
}

// Handle Profile Picture Upload
function handleProfilePictureUpload() {
    console.log('Uploading profile picture...');
    // TODO: Implement upload
    alert('Profile picture uploaded successfully!');
    closeUploadProfileModal();
}

// Preview Cover Image
function previewCoverImage(event) {
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
}

// Handle Cover Image Upload
function handleCoverImageUpload() {
    console.log('Uploading cover image...');
    // TODO: Implement upload
    alert('Cover image uploaded successfully!');
    closeUploadCoverModal();
}

// Logout Function
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        console.log('Logging out...');
        // TODO: Implement logout
        window.location.href = '/login';
    }
}