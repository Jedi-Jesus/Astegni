        // switchPanel and sidebar functions are now handled by shared modules

        // Course management functions
        function openAddCourseModal() {
            document.getElementById('add-course-modal').classList.remove('hidden');
        }

        function closeAddCourseModal() {
            document.getElementById('add-course-modal').classList.add('hidden');
        }

        function saveCourse() {
            alert('Course saved successfully!');
            closeAddCourseModal();
        }

        function reviewRequest(id) {
            console.log('Reviewing course request:', id);
        }

        function approveRequest(id) {
            if (confirm('Approve this course request?')) {
                console.log('Approving request:', id);
            }
        }

        function rejectRequest(id) {
            const reason = prompt('Please provide rejection reason:');
            if (reason) {
                console.log('Rejecting request:', id, 'Reason:', reason);
            }
        }

        function restoreCourse(id) {
            if (confirm('Restore this course to active status?')) {
                console.log('Restoring course:', id);
            }
        }

        function openAddCategoryModal() {
            alert('Opening Add Category modal...');
        }

        // Course-specific sidebar functions
        function openCourseReports() {
            alert('Opening Course Analytics...');
        }

        function openCurriculumGuidelines() {
            alert('Opening Curriculum Guidelines...');
        }

        function openCourseSettings() {
            alert('Opening Course Settings...');
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
            if (modal) modal.classList.remove('hidden');
        }

        function closeEditProfileModal() {
            const modal = document.getElementById('edit-profile-modal');
            if (modal) modal.classList.add('hidden');
        }

        function openUploadProfileModal() {
            const modal = document.getElementById('upload-profile-modal');
            if (modal) modal.classList.remove('hidden');
        }

        function closeUploadProfileModal() {
            const modal = document.getElementById('upload-profile-modal');
            if (modal) modal.classList.add('hidden');
        }

        function openUploadCoverModal() {
            const modal = document.getElementById('upload-cover-modal');
            if (modal) modal.classList.remove('hidden');
        }

        function closeUploadCoverModal() {
            const modal = document.getElementById('upload-cover-modal');
            if (modal) modal.classList.add('hidden');
        }

        async function handleProfilePictureUpload() {
            const fileInput = document.getElementById('profilePictureInput');
            const file = fileInput.files[0];
            if (!file) { alert('Please select a file'); return; }
            if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }

            const uploadBtn = document.getElementById('uploadProfileBtn');
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.querySelectorAll('.profile-avatar').forEach(img => img.src = e.target.result);
                };
                reader.readAsDataURL(file);
                alert('Profile picture updated successfully!');
                closeUploadProfileModal();
            } catch (error) {
                alert('Upload failed: ' + error.message);
            } finally {
                uploadBtn.textContent = 'Upload';
                uploadBtn.disabled = false;
            }
        }

        async function handleCoverImageUpload() {
            const fileInput = document.getElementById('coverImageInput');
            const file = fileInput.files[0];
            if (!file) { alert('Please select a file'); return; }
            if (!file.type.startsWith('image/')) { alert('Please select an image file'); return; }

            const uploadBtn = document.getElementById('uploadCoverBtn');
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            try {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const reader = new FileReader();
                reader.onload = function (e) {
                    document.querySelectorAll('.cover-img').forEach(img => img.src = e.target.result);
                };
                reader.readAsDataURL(file);
                alert('Cover image updated successfully!');
                closeUploadCoverModal();
            } catch (error) {
                alert('Upload failed: ' + error.message);
            } finally {
                uploadBtn.textContent = 'Upload';
                uploadBtn.disabled = false;
            }
        }

        function handleProfileUpdate(event) {
            event.preventDefault();
            const formData = {
                name: document.getElementById('adminNameInput').value,
                department: document.getElementById('departmentInput').value,
                employeeId: document.getElementById('employeeIdInput').value,
                bio: document.getElementById('bioInput').value,
                quote: document.getElementById('quoteInput').value
            };
            document.getElementById('adminName').textContent = formData.name;
            document.querySelector('.profile-quote span').textContent = `"${formData.quote}"`;
            alert('Profile updated successfully!');
            closeEditProfileModal();
        }

        function previewProfilePicture(event) {
            const file = event.target.files[0];
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function (e) {
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
                reader.onload = function (e) {
                    document.getElementById('coverPreviewImg').src = e.target.result;
                    document.getElementById('coverPreview').classList.remove('hidden');
                };
                reader.readAsDataURL(file);
            }
        }
// Make all functions globally available
window.openAddCourseModal = openAddCourseModal;
window.closeAddCourseModal = closeAddCourseModal;
window.saveCourse = saveCourse;
window.reviewRequest = reviewRequest;
window.approveRequest = approveRequest;
window.rejectRequest = rejectRequest;
window.restoreCourse = restoreCourse;
window.openAddCategoryModal = openAddCategoryModal;
window.openCourseReports = openCourseReports;
window.openCurriculumGuidelines = openCurriculumGuidelines;
window.openCourseSettings = openCourseSettings;
window.logout = logout;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.openUploadProfileModal = openUploadProfileModal;
window.closeUploadProfileModal = closeUploadProfileModal;
window.openUploadCoverModal = openUploadCoverModal;
window.closeUploadCoverModal = closeUploadCoverModal;
window.handleProfileUpdate = handleProfileUpdate;
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
