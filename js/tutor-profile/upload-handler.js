// ============================================
// TUTOR PROFILE UPLOAD HANDLER
// Handles all file upload operations
// ============================================

const TutorUploadHandler = {
    // Current upload state
    currentUploads: {
        video: null,
        thumbnail: null,
        profilePicture: null,
        coverPhoto: null
    },

    // Initialize upload handlers
    init() {
        this.setupDragAndDrop();
        this.setupFileInputs();
    },

    // Setup drag and drop for all upload areas
    setupDragAndDrop() {
        const uploadAreas = [
            { id: 'video-upload-area', type: 'video' },
            { id: 'thumbnail-upload-area', type: 'thumbnail' },
            { id: 'profile-upload-area', type: 'profile' },
            { id: 'cover-upload-area', type: 'cover' }
        ];

        uploadAreas.forEach(({ id, type }) => {
            const element = document.getElementById(id);
            if (!element) return;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                element.addEventListener(eventName, this.preventDefaults, false);
            });

            ['dragenter', 'dragover'].forEach(eventName => {
                element.addEventListener(eventName, () => {
                    element.classList.add('drag-over');
                }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                element.addEventListener(eventName, () => {
                    element.classList.remove('drag-over');
                }, false);
            });

            element.addEventListener('drop', (e) => this.handleDrop(e, type), false);
        });
    },

    // Setup file input change listeners
    setupFileInputs() {
        const inputs = [
            { id: 'video-file-input', handler: (e) => this.handleVideoFile(e) },
            { id: 'thumbnail-file-input', handler: (e) => this.handleThumbnailFile(e) },
            { id: 'profile-picture-input', handler: (e) => this.handleProfilePicture(e) },
            { id: 'cover-photo-input', handler: (e) => this.handleCoverPhoto(e) }
        ];

        inputs.forEach(({ id, handler }) => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', handler);
            }
        });
    },

    // Prevent default drag behaviors
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    },

    // Handle drop event
    handleDrop(e, type) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            this.handleFiles(files, type);
        }
    },

    // Handle files based on type
    handleFiles(files, type) {
        const file = files[0];

        switch (type) {
            case 'video':
                this.handleVideoFile({ target: { files: [file] } });
                break;
            case 'thumbnail':
                this.handleThumbnailFile({ target: { files: [file] } });
                break;
            case 'profile':
                this.handleProfilePicture({ target: { files: [file] } });
                break;
            case 'cover':
                this.handleCoverPhoto({ target: { files: [file] } });
                break;
        }
    },

    // Handle video file selection
    handleVideoFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('video/')) {
            TutorProfileUI.showNotification('Please select a valid video file', 'error');
            return;
        }

        // Validate file size (max 200MB)
        const maxSize = 200 * 1024 * 1024;
        if (file.size > maxSize) {
            TutorProfileUI.showNotification('Video file is too large. Maximum size is 200MB', 'error');
            return;
        }

        this.currentUploads.video = file;

        // Update UI
        const fileName = document.getElementById('video-file-name');
        const fileSize = document.getElementById('video-file-size');
        const uploadArea = document.getElementById('video-upload-area');
        const fileInfo = document.getElementById('video-file-info');

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        if (uploadArea) uploadArea.classList.add('has-file');
        if (fileInfo) fileInfo.style.display = 'block';

        // Create video preview if possible
        this.createVideoPreview(file);

        TutorProfileUI.showNotification('Video file selected', 'success');
    },

    // Handle thumbnail file selection
    handleThumbnailFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            TutorProfileUI.showNotification('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            TutorProfileUI.showNotification('Image file is too large. Maximum size is 5MB', 'error');
            return;
        }

        this.currentUploads.thumbnail = file;

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('thumbnail-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);

        TutorProfileUI.showNotification('Thumbnail selected', 'success');
    },

    // Handle profile picture selection
    handleProfilePicture(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            TutorProfileUI.showNotification('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            TutorProfileUI.showNotification('Image file is too large. Maximum size is 5MB', 'error');
            return;
        }

        this.currentUploads.profilePicture = file;

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('profile-picture-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    },

    // Handle cover photo selection
    handleCoverPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            TutorProfileUI.showNotification('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            TutorProfileUI.showNotification('Image file is too large. Maximum size is 5MB', 'error');
            return;
        }

        this.currentUploads.coverPhoto = file;

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('cover-photo-preview');
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    },

    // Upload video with metadata
    async uploadVideo() {
        if (!this.currentUploads.video) {
            TutorProfileUI.showNotification('Please select a video file', 'error');
            return;
        }

        // Get video metadata
        const title = document.getElementById('video-title')?.value;
        const description = document.getElementById('video-description')?.value;
        const category = document.getElementById('video-category')?.value;
        const tags = document.getElementById('video-tags')?.value;

        if (!title) {
            TutorProfileUI.showNotification('Please enter a video title', 'error');
            return;
        }

        // Create form data
        const formData = new FormData();
        formData.append('video', this.currentUploads.video);
        formData.append('title', title);
        formData.append('description', description || '');
        formData.append('category', category || 'educational');
        formData.append('tags', tags || '');

        if (this.currentUploads.thumbnail) {
            formData.append('thumbnail', this.currentUploads.thumbnail);
        }

        try {
            // Show upload progress
            this.showUploadProgress('Uploading video...');

            const result = await TutorProfileAPI.uploadVideo(formData);

            TutorProfileUI.showNotification('Video uploaded successfully!', 'success');
            this.hideUploadProgress();
            this.resetVideoUpload();
            TutorModalManager.closeVideoUpload();

            // Reload videos
            if (TutorProfileController.loadVideos) {
                TutorProfileController.loadVideos();
            }
        } catch (error) {
            console.error('Upload error:', error);
            TutorProfileUI.showNotification('Failed to upload video', 'error');
            this.hideUploadProgress();
        }
    },

    // Upload profile picture
    async uploadProfilePicture() {
        if (!this.currentUploads.profilePicture) {
            TutorProfileUI.showNotification('Please select a profile picture', 'error');
            return;
        }

        try {
            this.showUploadProgress('Uploading profile picture...');

            const result = await TutorProfileAPI.uploadProfilePicture(this.currentUploads.profilePicture);

            // Update profile with new picture URL
            const profile = TutorProfileState.getTutorProfile();
            if (profile) {
                profile.profilePicture = result.url;
                TutorProfileState.setTutorProfile(profile);
                TutorProfileUI.displayProfile(profile);
            }

            TutorProfileUI.showNotification('Profile picture updated!', 'success');
            this.hideUploadProgress();
            this.resetProfilePictureUpload();
            TutorModalManager.closeProfileUpload();
        } catch (error) {
            console.error('Upload error:', error);
            TutorProfileUI.showNotification('Failed to upload profile picture', 'error');
            this.hideUploadProgress();
        }
    },

    // Upload cover photo
    async uploadCoverPhoto() {
        if (!this.currentUploads.coverPhoto) {
            TutorProfileUI.showNotification('Please select a cover photo', 'error');
            return;
        }

        try {
            this.showUploadProgress('Uploading cover photo...');

            const result = await TutorProfileAPI.uploadCoverPhoto(this.currentUploads.coverPhoto);

            // Update profile with new cover photo URL
            const profile = TutorProfileState.getTutorProfile();
            if (profile) {
                profile.coverPhoto = result.url;
                TutorProfileState.setTutorProfile(profile);
                TutorProfileUI.displayProfile(profile);
            }

            TutorProfileUI.showNotification('Cover photo updated!', 'success');
            this.hideUploadProgress();
            this.resetCoverPhotoUpload();
            TutorModalManager.closeCoverUpload();
        } catch (error) {
            console.error('Upload error:', error);
            TutorProfileUI.showNotification('Failed to upload cover photo', 'error');
            this.hideUploadProgress();
        }
    },

    // Create video preview
    createVideoPreview(file) {
        const preview = document.getElementById('video-preview');
        if (!preview) return;

        const videoURL = URL.createObjectURL(file);
        preview.src = videoURL;
        preview.style.display = 'block';

        // Clean up URL when video is loaded
        preview.onload = () => {
            URL.revokeObjectURL(videoURL);
        };
    },

    // Show upload progress
    showUploadProgress(message) {
        const progressContainer = document.getElementById('upload-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
            const progressText = progressContainer.querySelector('.progress-text');
            if (progressText) {
                progressText.textContent = message;
            }
        }
    },

    // Hide upload progress
    hideUploadProgress() {
        const progressContainer = document.getElementById('upload-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    },

    // Reset upload states
    resetVideoUpload() {
        this.currentUploads.video = null;
        this.currentUploads.thumbnail = null;

        const form = document.getElementById('video-upload-form');
        if (form) form.reset();

        const uploadArea = document.getElementById('video-upload-area');
        if (uploadArea) uploadArea.classList.remove('has-file');

        const fileInfo = document.getElementById('video-file-info');
        if (fileInfo) fileInfo.style.display = 'none';
    },

    resetProfilePictureUpload() {
        this.currentUploads.profilePicture = null;
        const input = document.getElementById('profile-picture-input');
        if (input) input.value = '';
    },

    resetCoverPhotoUpload() {
        this.currentUploads.coverPhoto = null;
        const input = document.getElementById('cover-photo-input');
        if (input) input.value = '';
    },

    // Remove selected files
    removeVideoFile() {
        this.resetVideoUpload();
        TutorProfileUI.showNotification('Video file removed', 'info');
    },

    removeThumbnail() {
        this.currentUploads.thumbnail = null;
        const preview = document.getElementById('thumbnail-preview');
        if (preview) {
            preview.src = '';
            preview.style.display = 'none';
        }
        TutorProfileUI.showNotification('Thumbnail removed', 'info');
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
};
