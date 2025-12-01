        // switchPanel and sidebar functions are now handled by shared modules

        // School management functions
        function openAddSchoolModal() {
            document.getElementById('add-school-modal').classList.remove('hidden');
        }

        function closeAddSchoolModal() {
            document.getElementById('add-school-modal').classList.add('hidden');
        }

        function saveSchool() {
            alert('School saved successfully!');
            closeAddSchoolModal();
        }

        function reviewSchoolRequest(id) {
            console.log('Reviewing school request:', id);
        }

        function approveSchool(id) {
            if (confirm('Approve this school registration?')) {
                console.log('Approving school:', id);
            }
        }

        function rejectSchool(id) {
            const reason = prompt('Please provide rejection reason:');
            if (reason) {
                console.log('Rejecting school:', id, 'Reason:', reason);
            }
        }

        function reconsiderSchool(id) {
            if (confirm('Reconsider this school application?')) {
                console.log('Reconsidering school:', id);
            }
        }

        function reinstateSchool(id) {
            if (confirm('Reinstate this school?')) {
                console.log('Reinstating school:', id);
            }
        }

        // School-specific sidebar functions
        function openSchoolReports() {
            alert('Opening School Reports...');
        }

        function openVerificationGuidelines() {
            alert('Opening Verification Guidelines...');
        }

        function openSchoolSettings() {
            alert('Opening School Settings...');
        }

        // Logout function
        function logout() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '../index.html';
            }
        }

        // Modal Functions
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

        // Handle profile update
        async function handleProfileUpdate(event) {
            event.preventDefault();
            const formData = new FormData(event.target);

            // Simulate API call
            try {
                // Here you would make your API call
                console.log('Updating profile with:', Object.fromEntries(formData));

                // Update UI with new values
                const adminName = document.getElementById('adminNameInput').value;
                document.getElementById('adminName').textContent = adminName;

                closeEditProfileModal();
                alert('Profile updated successfully!');
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('Error updating profile. Please try again.');
            }
        }

        // Handle profile picture upload
        async function handleProfilePictureUpload() {
            const fileInput = document.getElementById('profilePictureInput');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file');
                return;
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                alert('File size must be less than 5MB');
                return;
            }

            try {
                // Simulate upload with FormData
                const formData = new FormData();
                formData.append('profilePicture', file);

                console.log('Uploading profile picture:', file.name);

                // Update the profile picture in UI
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.querySelector('.profile-avatar').src = e.target.result;
                };
                reader.readAsDataURL(file);

                closeUploadProfileModal();
                alert('Profile picture updated successfully!');
            } catch (error) {
                console.error('Error uploading profile picture:', error);
                alert('Error uploading image. Please try again.');
            }
        }

        // Handle cover image upload
        async function handleCoverImageUpload() {
            const fileInput = document.getElementById('coverImageInput');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file');
                return;
            }

            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('File size must be less than 10MB');
                return;
            }

            try {
                // Simulate upload with FormData
                const formData = new FormData();
                formData.append('coverImage', file);

                console.log('Uploading cover image:', file.name);

                // Update the cover image in UI
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.querySelector('.cover-img').src = e.target.result;
                };
                reader.readAsDataURL(file);

                closeUploadCoverModal();
                alert('Cover image updated successfully!');
            } catch (error) {
                console.error('Error uploading cover image:', error);
                alert('Error uploading image. Please try again.');
            }
        }

        // Preview functions for image uploads
        function previewProfilePicture(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('profilePreviewImg').src = e.target.result;
                    document.getElementById('profilePreview').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        }

        function previewCoverImage(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('coverPreviewImg').src = e.target.result;
                    document.getElementById('coverPreview').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        }
// Make all functions globally available
window.openAddSchoolModal = openAddSchoolModal;
window.closeAddSchoolModal = closeAddSchoolModal;
window.saveSchool = saveSchool;
window.reviewSchoolRequest = reviewSchoolRequest;
window.approveSchool = approveSchool;
window.rejectSchool = rejectSchool;
window.reconsiderSchool = reconsiderSchool;
window.reinstateSchool = reinstateSchool;
window.openSchoolReports = openSchoolReports;
window.openVerificationGuidelines = openVerificationGuidelines;
window.openSchoolSettings = openSchoolSettings;
window.logout = logout;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.openUploadProfileModal = openUploadProfileModal;
window.closeUploadProfileModal = closeUploadProfileModal;
window.openUploadCoverModal = openUploadCoverModal;
window.closeUploadCoverModal = closeUploadCoverModal;
window.previewProfilePicture = previewProfilePicture;
window.previewCoverImage = previewCoverImage;

// Add missing helper functions
window.handleProfilePictureUpload = function() {
    alert('Profile picture uploaded successfully!');
    closeUploadProfileModal();
};

window.handleCoverImageUpload = function() {
    alert('Cover image uploaded successfully!');
    closeUploadCoverModal();
};

window.handleProfileUpdate = function(event) {
    event.preventDefault();
    alert('Profile updated successfully!');
    closeEditProfileModal();
};
