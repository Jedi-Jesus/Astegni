        // Panel switching functionality
        function switchPanel(panelName) {
            // Hide all panel contents
            const panels = document.querySelectorAll('.panel-content');
            panels.forEach(panel => {
                panel.classList.remove('active');
                panel.classList.add('hidden');
            });

            // Remove active state from all sidebar links
            const sidebarLinks = document.querySelectorAll('.sidebar-link');
            sidebarLinks.forEach(link => {
                link.classList.remove('active');
            });

            // Show selected panel
            const selectedPanel = document.getElementById(`${panelName}-panel`);
            if (selectedPanel) {
                selectedPanel.classList.remove('hidden');
                selectedPanel.classList.add('active');
            }

            // Set active sidebar link
            const activeLink = document.querySelector(`[onclick="switchPanel('${panelName}'); return false;"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }

        // Initialize dashboard panel as active on page load
        document.addEventListener('DOMContentLoaded', () => {
            switchPanel('dashboard');

            // Sidebar toggle
            const hamburger = document.getElementById('hamburger');
            const sidebar = document.getElementById('sidebar');
            const sidebarClose = document.getElementById('sidebar-close');

            if (hamburger) {
                hamburger.addEventListener('click', () => {
                    sidebar.classList.add('active');
                });
            }

            if (sidebarClose) {
                sidebarClose.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                });
            }
        });

        // Advertiser management functions
        function openAddAdvertiserModal() {
            document.getElementById('add-advertiser-modal').classList.remove('hidden');
        }

        function closeAddAdvertiserModal() {
            document.getElementById('add-advertiser-modal').classList.add('hidden');
        }

        function saveAdvertiser() {
            alert('Advertiser saved successfully!');
            closeAddAdvertiserModal();
        }

        function reviewCampaign(id) {
            console.log('Reviewing campaign:', id);
            alert('Opening campaign review for: ' + id);
        }

        function approveCampaign(id) {
            if (confirm('Approve this campaign?')) {
                console.log('Approving campaign:', id);
                alert('Campaign ' + id + ' has been approved!');
            }
        }

        function rejectCampaign(id) {
            const reason = prompt('Please provide a reason for rejection:');
            if (reason) {
                console.log('Rejecting campaign:', id, 'Reason:', reason);
                alert('Campaign ' + id + ' has been rejected.');
            }
        }

        function pauseCampaign(id) {
            if (confirm('Pause this campaign?')) {
                console.log('Pausing campaign:', id);
                alert('Campaign ' + id + ' has been paused.');
            }
        }

        function reconsiderCampaign(id) {
            if (confirm('Reconsider this rejected campaign?')) {
                console.log('Reconsidering campaign:', id);
                alert('Campaign ' + id + ' moved to pending review.');
            }
        }

        function openPerformanceReports() {
            alert('Opening Performance Reports...');
        }

        function openBillingPayments() {
            alert('Opening Billing & Payments...');
        }

        function openAdSettings() {
            alert('Opening Ad Settings...');
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

        // Handle profile picture upload
        async function handleProfilePictureUpload() {
            const fileInput = document.getElementById('profilePictureInput');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file');
                return;
            }

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Show loading state
            const uploadBtn = document.getElementById('uploadProfileBtn');
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            try {
                // Simulate upload (replace with actual API call)
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Update profile picture preview
                const reader = new FileReader();
                reader.onload = function (e) {
                    const profileImages = document.querySelectorAll('.profile-avatar');
                    profileImages.forEach(img => {
                        img.src = e.target.result;
                    });
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

        // Handle cover image upload
        async function handleCoverImageUpload() {
            const fileInput = document.getElementById('coverImageInput');
            const file = fileInput.files[0];

            if (!file) {
                alert('Please select a file');
                return;
            }

            if (!file.type.startsWith('image/')) {
                alert('Please select an image file');
                return;
            }

            // Show loading state
            const uploadBtn = document.getElementById('uploadCoverBtn');
            uploadBtn.textContent = 'Uploading...';
            uploadBtn.disabled = true;

            try {
                // Simulate upload (replace with actual API call)
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Update cover image preview
                const reader = new FileReader();
                reader.onload = function (e) {
                    const coverImages = document.querySelectorAll('.cover-img');
                    coverImages.forEach(img => {
                        img.src = e.target.result;
                    });
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

        // Handle profile form submission
        function handleProfileUpdate(event) {
            event.preventDefault();

            const formData = {
                name: document.getElementById('adminNameInput').value,
                department: document.getElementById('departmentInput').value,
                employeeId: document.getElementById('employeeIdInput').value,
                bio: document.getElementById('bioInput').value,
                quote: document.getElementById('quoteInput').value
            };

            console.log('Updating profile:', formData);

            // Update UI with new values
            document.getElementById('adminName').textContent = formData.name;
            document.querySelector('.profile-quote span').textContent = `"${formData.quote}"`;

            alert('Profile updated successfully!');
            closeEditProfileModal();
        }

        // Preview functions for image uploads
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
