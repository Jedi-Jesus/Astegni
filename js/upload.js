/**
 * Astegni Platform - Optimized Upload Manager
 * Unified file upload handling with Backblaze B2 integration
 */

class AstegniUploadManager {
    constructor() {
        this.API_BASE = `${window.API_BASE_URL || 'http://localhost:8000'}/api`;
        this.token = localStorage.getItem('token');
        this.activeUploads = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.injectStyles();
    }

    // ============================================
    // PROFILE & DATA LOADING
    // ============================================

    async loadTutorProfile() {
        try {
            const response = await fetch(`${this.API_BASE}/me`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                
                // Update UI with user data
                this.updateProfileUI(userData);
                
                // Load tutor-specific data if applicable
                if (userData.active_role === 'tutor') {
                    await this.loadTutorData();
                }
                
                return userData;
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    async loadTutorData() {
        try {
            const response = await fetch(`${this.API_BASE}/tutor/profile`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            if (response.ok) {
                const tutorData = await response.json();
                this.updateTutorUI(tutorData);
                return tutorData;
            }
        } catch (error) {
            console.error('Error loading tutor data:', error);
        }
    }

    updateProfileUI(userData) {
        // Update name displays
        const nameElements = ['centerName', 'tutorName', 'profile-name', 'dropdown-user-name'];
        nameElements.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = `${userData.first_name} ${userData.father_name || userData.last_name || ''}`;
        });

        // Update email
        const emailElem = document.getElementById('dropdown-user-email');
        if (emailElem) emailElem.textContent = userData.email;

        // Update profile pictures if available
        if (userData.profile_picture) {
            this.updateProfilePictures(userData.profile_picture);
        }
    }

    updateTutorUI(tutorData) {
        // Update bio
        const bioElem = document.getElementById('tutor-bio');
        if (bioElem) bioElem.textContent = tutorData.bio || 'No bio available';

        // Update quote
        const quoteElem = document.getElementById('quote');
        if (quoteElem) quoteElem.textContent = tutorData.quote || 'No quote set';

        // Update stats
        const statsMap = {
            'stat-total-students': tutorData.total_students,
            'stat-sessions': tutorData.total_sessions,
            'stat-avg-rating': tutorData.rating,
            'tutor-rating': tutorData.rating,
            'stat-experience': tutorData.experience
        };

        Object.keys(statsMap).forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.textContent = statsMap[id] || 0;
        });

        // Load certifications, experiences, achievements
        this.loadCredentials(tutorData);
    }

    loadCredentials(tutorData) {
        // Load certifications
        if (tutorData.certifications && tutorData.certifications.length > 0) {
            const grid = document.getElementById('certifications-grid');
            if (grid) {
                grid.innerHTML = '';
                tutorData.certifications.forEach(cert => {
                    const card = this.createCredentialCard(cert, 'certification');
                    grid.innerHTML += card;
                });
            }
        }

        // Load experiences
        if (tutorData.experiences && tutorData.experiences.length > 0) {
            const grid = document.getElementById('experience-grid');
            if (grid) {
                grid.innerHTML = '';
                tutorData.experiences.forEach(exp => {
                    const card = this.createCredentialCard(exp, 'experience');
                    grid.innerHTML += card;
                });
            }
        }

        // Load achievements
        if (tutorData.achievements && tutorData.achievements.length > 0) {
            const grid = document.getElementById('achievements-grid');
            if (grid) {
                grid.innerHTML = '';
                tutorData.achievements.forEach(ach => {
                    const card = this.createCredentialCard(ach, 'achievement');
                    grid.innerHTML += card;
                });
            }
        }
    }

    createCredentialCard(item, type) {
        const statusClass = item.status === 'verified' ? 'verified' : 'pending';
        const statusText = item.status === 'verified' ? 'Verified' : 'Pending Verification';
        
        return `
            <div class="${type}-card">
                <div class="card-header">
                    <h4>${item.title || type}</h4>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                <div class="card-content">
                    ${item.issuing_organization ? `<p><strong>Organization:</strong> ${item.issuing_organization}</p>` : ''}
                    ${item.organization ? `<p><strong>Organization:</strong> ${item.organization}</p>` : ''}
                    ${item.institution ? `<p><strong>Institution:</strong> ${item.institution}</p>` : ''}
                    ${item.issue_date ? `<p><strong>Date:</strong> ${item.issue_date}</p>` : ''}
                    ${item.file_url ? `<a href="${item.file_url}" target="_blank" class="view-link">View Document</a>` : ''}
                </div>
            </div>
        `;
    }

    // ============================================
    // SEARCH & AUTOCOMPLETE
    // ============================================

    setupSchoolSearch() {
        const searchInputs = [
            { id: 'cert-school-search', type: 'certification' },
            { id: 'exp-organization-search', type: 'experience' },
            { id: 'ach-institution-search', type: 'achievement' }
        ];

        searchInputs.forEach(input => {
            const elem = document.getElementById(input.id);
            if (elem) {
                elem.addEventListener('input', (e) => this.handleSchoolSearch(e, input.type));
                elem.addEventListener('focus', (e) => this.showSuggestions(e, input.type));
                elem.addEventListener('blur', (e) => setTimeout(() => this.hideSuggestions(input.type), 200));
            }
        });
    }

    async handleSchoolSearch(event, type) {
        const query = event.target.value;
        const suggestionsId = `${type === 'certification' ? 'cert' : type === 'experience' ? 'exp' : 'ach'}-${type === 'experience' ? 'organization' : type === 'achievement' ? 'institution' : 'school'}-suggestions`;
        const suggestionsDiv = document.getElementById(suggestionsId);
        
        if (!suggestionsDiv) return;

        if (query.length < 2) {
            suggestionsDiv.innerHTML = '';
            this.showRequestSchoolButton(type, true);
            return;
        }

        // Simulate school search (replace with actual API call)
        const schools = await this.searchSchools(query);
        
        if (schools.length === 0) {
            suggestionsDiv.innerHTML = '<div class="no-results">No schools found</div>';
            this.showRequestSchoolButton(type, true);
        } else {
            suggestionsDiv.innerHTML = schools.map(school => 
                `<div class="suggestion-item" onclick="uploadManager.selectSchool('${school}', '${type}')">${school}</div>`
            ).join('');
            this.showRequestSchoolButton(type, false);
        }
    }

    async searchSchools(query) {
        // This should call your API to search schools
        // For now, returning mock data
        const mockSchools = [
            'Addis Ababa University',
            'Unity University',
            'St. Mary\'s University',
            'Hawassa University',
            'Jimma University'
        ];
        
        return mockSchools.filter(school => 
            school.toLowerCase().includes(query.toLowerCase())
        );
    }

    selectSchool(school, type) {
        const inputId = type === 'certification' ? 'cert-school-search' : 
                       type === 'experience' ? 'exp-organization-search' : 
                       'ach-institution-search';
        const input = document.getElementById(inputId);
        if (input) {
            input.value = school;
            this.hideSuggestions(type);
        }
    }

    showSuggestions(event, type) {
        const suggestionsId = `${type === 'certification' ? 'cert' : type === 'experience' ? 'exp' : 'ach'}-${type === 'experience' ? 'organization' : type === 'achievement' ? 'institution' : 'school'}-suggestions`;
        const suggestionsDiv = document.getElementById(suggestionsId);
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'block';
        }
    }

    hideSuggestions(type) {
        const suggestionsId = `${type === 'certification' ? 'cert' : type === 'experience' ? 'exp' : 'ach'}-${type === 'experience' ? 'organization' : type === 'achievement' ? 'institution' : 'school'}-suggestions`;
        const suggestionsDiv = document.getElementById(suggestionsId);
        if (suggestionsDiv) {
            suggestionsDiv.style.display = 'none';
        }
    }

    showRequestSchoolButton(type, show) {
        const buttonId = `${type === 'certification' ? 'cert' : type === 'experience' ? 'exp' : 'ach'}-request-school-btn`;
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.toggle('hidden', !show);
        }
    }

    // ============================================
    // CORE UPLOAD METHODS
    // ============================================

    async uploadFile(endpoint, formData, options = {}) {
        const uploadId = this.generateUploadId();
        
        try {
            // Show progress if requested
            if (options.showProgress) {
                this.showProgress(uploadId, options.progressTitle || 'Uploading...');
            }

            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Upload failed: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('success', options.successMessage || 'Upload successful!');
                return result;
            }
            
            throw new Error(result.detail || 'Upload failed');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('error', error.message);
            throw error;
        } finally {
            if (options.showProgress) {
                this.hideProgress(uploadId);
            }
        }
    }

    // ============================================
    // FILE MANAGEMENT METHODS
    // ============================================

    async deleteFile(fileUrl) {
        try {
            const response = await fetch(`${this.API_BASE}/upload/delete-file`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ file_url: fileUrl })
            });

            if (!response.ok) {
                throw new Error(`Delete failed: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                this.showNotification('success', 'File deleted successfully!');
                return result;
            }
            
            throw new Error(result.detail || 'Delete failed');
            
        } catch (error) {
            console.error('File delete error:', error);
            this.showNotification('error', error.message);
            throw error;
        }
    }

    async getMyUploads(folder = null) {
        try {
            const params = folder ? `?folder=${folder}` : '';
            const response = await fetch(`${this.API_BASE}/my-uploads${params}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch uploads');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching uploads:', error);
            throw error;
        }
    }

    // ============================================
    // SPECIFIC UPLOAD HANDLERS
    // ============================================

    async uploadProfilePicture(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await this.uploadFile('/upload/profile-picture', formData, {
            showProgress: true,
            progressTitle: 'Uploading profile picture...',
            successMessage: 'Profile picture updated successfully!'
        });

        // Update UI
        this.updateProfilePictures(result.url);
        return result;
    }

    async uploadCoverImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await this.uploadFile('/upload/cover-image', formData, {
            showProgress: true,
            progressTitle: 'Uploading cover image...',
            successMessage: 'Cover image updated successfully!'
        });

        // Update UI
        document.getElementById('cover-img').src = result.url;
        return result;
    }

    async uploadVideo(file, metadata) {
        const formData = new FormData();
        formData.append('file', file);
        Object.keys(metadata).forEach(key => {
            if (metadata[key]) formData.append(key, metadata[key]);
        });
        
        return await this.uploadFile('/upload/video', formData, {
            showProgress: true,
            progressTitle: 'Uploading video...',
            successMessage: 'Video uploaded and submitted for review!'
        });
    }

    async uploadVideoThumbnail(videoId, file) {
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await this.uploadFile(`/upload/video-thumbnail?video_id=${videoId}`, formData, {
            successMessage: 'Thumbnail uploaded successfully!'
        });

        return result;
    }

    async uploadBlogImage(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        return await this.uploadFile('/upload/blog-image', formData, {
            successMessage: 'Blog image uploaded successfully!'
        });
    }

    async uploadMultipleImages(files, folder = 'gallery') {
        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }
        formData.append('folder', folder);

        return await this.uploadFile('/upload/multiple-images', formData, {
            showProgress: true,
            progressTitle: 'Uploading images...',
            successMessage: `${files.length} images uploaded successfully!`
        });
    }

    async uploadCertification(data, file = null) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key]) formData.append(key, data[key]);
        });
        if (file) formData.append('file', file);
        
        const result = await this.uploadFile('/upload/certification', formData, {
            successMessage: 'Certification uploaded successfully!'
        });

        this.addItemToGrid('certifications-grid', this.createCertCard(result));
        return result;
    }

    async uploadExperience(data, file = null) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key]) formData.append(key, data[key]);
        });
        if (file) formData.append('file', file);
        
        const result = await this.uploadFile('/upload/experience', formData, {
            successMessage: 'Experience added successfully!'
        });

        this.addItemToGrid('experience-grid', this.createExpCard(result));
        return result;
    }

    async uploadAchievement(data, file = null) {
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key]) formData.append(key, data[key]);
        });
        if (file) formData.append('file', file);
        
        const result = await this.uploadFile('/upload/achievement', formData, {
            successMessage: 'Achievement added successfully!'
        });

        this.addItemToGrid('achievements-grid', this.createAchCard(result));
        return result;
    }

    // ============================================
    // UI UPDATE METHODS
    // ============================================

    updateProfilePictures(url) {
        const elements = ['profile-avatar', 'profile-pic', 'dropdown-profile-pic'];
        elements.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) elem.src = url;
        });
    }

    addItemToGrid(gridId, content) {
        const grid = document.getElementById(gridId);
        if (grid) {
            const card = document.createElement('div');
            card.className = 'card-item';
            card.innerHTML = content;
            grid.appendChild(card);
        }
    }

    createCertCard(result) {
        return `
            <div class="cert-card">
                <div class="card-header">
                    <h4>Certification</h4>
                    <span class="status-badge pending">Pending Verification</span>
                </div>
                <div class="card-content">
                    <p><strong>ID:</strong> ${result.certification_id || 'N/A'}</p>
                    <p><strong>Status:</strong> ${result.status}</p>
                    ${result.url ? `<a href="${result.url}" target="_blank" class="view-link">View Document</a>` : ''}
                </div>
            </div>
        `;
    }

    createExpCard(result) {
        return `
            <div class="exp-card">
                <div class="card-header">
                    <h4>Experience</h4>
                    <span class="status-badge pending">Pending Verification</span>
                </div>
                <div class="card-content">
                    <p><strong>Status:</strong> ${result.status}</p>
                    ${result.url ? `<a href="${result.url}" target="_blank" class="view-link">View Document</a>` : ''}
                </div>
            </div>
        `;
    }

    createAchCard(result) {
        return `
            <div class="ach-card">
                <div class="card-header">
                    <h4>Achievement</h4>
                    <span class="status-badge pending">Pending Verification</span>
                </div>
                <div class="card-content">
                    <p><strong>Status:</strong> ${result.status}</p>
                    ${result.url ? `<a href="${result.url}" target="_blank" class="view-link">View Certificate</a>` : ''}
                </div>
            </div>
        `;
    }

    // ============================================
    // PROGRESS & NOTIFICATION METHODS
    // ============================================

    showProgress(uploadId, title) {
        const progressBar = document.createElement('div');
        progressBar.id = `upload-${uploadId}`;
        progressBar.className = 'upload-progress-container';
        progressBar.innerHTML = `
            <h4>${title}</h4>
            <div class="upload-progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
            <p class="progress-text">0%</p>
        `;
        document.body.appendChild(progressBar);
        
        // Animate progress
        this.animateProgress(uploadId);
        this.activeUploads.set(uploadId, progressBar);
    }

    hideProgress(uploadId) {
        const progressBar = this.activeUploads.get(uploadId);
        if (progressBar) {
            progressBar.classList.add('fade-out');
            setTimeout(() => {
                progressBar.remove();
                this.activeUploads.delete(uploadId);
            }, 300);
        }
    }

    animateProgress(uploadId) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            progress = Math.min(progress, 90);
            
            const progressBar = this.activeUploads.get(uploadId);
            if (!progressBar) {
                clearInterval(interval);
                return;
            }
            
            progressBar.querySelector('.progress-fill').style.width = `${progress}%`;
            progressBar.querySelector('.progress-text').textContent = `${Math.round(progress)}%`;
            
            if (progress >= 90) clearInterval(interval);
        }, 200);
    }

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `toast-notification ${type}`;
        notification.innerHTML = `
            <div class="toast-icon">${type === 'success' ? '✓' : '✕'}</div>
            <div class="toast-message">${message}</div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, type === 'error' ? 5000 : 3000);
    }

    // ============================================
    // FILE VALIDATION
    // ============================================

    validateFile(file, options = {}) {
        const { maxSize = 10, allowedTypes = [] } = options;
        
        // Check file size (in MB)
        if (file.size > maxSize * 1024 * 1024) {
            throw new Error(`File size must be less than ${maxSize}MB`);
        }
        
        // Check file type if specified
        if (allowedTypes.length > 0) {
            const fileType = file.type.split('/')[0];
            if (!allowedTypes.includes(fileType)) {
                throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
            }
        }
        
        return true;
    }

    // ============================================
    // EVENT LISTENERS SETUP
    // ============================================

    setupEventListeners() {
        // Profile picture upload
        const profileInput = document.getElementById('profileInput');
        if (profileInput) {
            profileInput.addEventListener('change', (e) => this.handleImageSelect(e, 'profile'));
        }

        // Cover image upload
        const coverInput = document.getElementById('coverInput');
        if (coverInput) {
            coverInput.addEventListener('change', (e) => this.handleImageSelect(e, 'cover'));
        }

        // Setup drag and drop for upload areas
        this.setupDragAndDrop();
    }

    setupDragAndDrop() {
        const uploadAreas = document.querySelectorAll('.upload-area, .file-upload-area');
        
        uploadAreas.forEach(area => {
            area.addEventListener('dragover', (e) => {
                e.preventDefault();
                area.classList.add('drag-over');
            });
            
            area.addEventListener('dragleave', () => {
                area.classList.remove('drag-over');
            });
            
            area.addEventListener('drop', (e) => {
                e.preventDefault();
                area.classList.remove('drag-over');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    const inputId = area.getAttribute('data-input-id');
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.files = files;
                        input.dispatchEvent(new Event('change'));
                    }
                }
            });
        });
    }

    async handleImageSelect(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            this.validateFile(file, { maxSize: 5, allowedTypes: ['image'] });
            
            // Show preview
            this.showImagePreview(file, type);
            
            // Auto-upload or wait for user confirmation based on your UX preference
            // await this.uploadImage(file, type);
            
        } catch (error) {
            this.showNotification('error', error.message);
            event.target.value = '';
        }
    }

    showImagePreview(file, type) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewId = `${type}Preview`;
            const preview = document.getElementById(previewId);
            if (preview) {
                preview.style.display = 'block';
                const img = preview.querySelector('img');
                img.src = e.target.result;
                
                // Update file info
                const fileName = preview.querySelector(`.file-name, #${type}FileName`);
                const fileSize = preview.querySelector(`.file-size, #${type}FileSize`);
                const dimensions = preview.querySelector(`#${type}Dimensions`);
                
                if (fileName) fileName.textContent = file.name;
                if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
                
                // Get image dimensions
                if (dimensions) {
                    img.onload = function() {
                        dimensions.textContent = `${this.naturalWidth} x ${this.naturalHeight}px`;
                    };
                }
            }
        };
        reader.readAsDataURL(file);
    }

    resetUpload(type) {
        const input = document.getElementById(`${type}Input`);
        const preview = document.getElementById(`${type}Preview`);
        const uploadArea = document.getElementById(`${type}UploadArea`);
        
        if (input) input.value = '';
        if (preview) preview.style.display = 'none';
        if (uploadArea) uploadArea.classList.remove('has-file');
        
        // Reset preview image
        const previewImage = document.getElementById(`${type}PreviewImage`);
        if (previewImage) previewImage.src = '';
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    generateUploadId() {
        return `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    injectStyles() {
        if (document.getElementById('upload-manager-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'upload-manager-styles';
        style.textContent = `
            .toast-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10000;
                transform: translateX(400px);
                transition: transform 0.3s ease;
            }
            
            .toast-notification.show {
                transform: translateX(0);
            }
            
            .toast-notification.success {
                border-left: 4px solid #4caf50;
            }
            
            .toast-notification.error {
                border-left: 4px solid #f44336;
            }
            
            .upload-progress-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                min-width: 300px;
                transition: opacity 0.3s ease;
            }
            
            .upload-progress-container.fade-out {
                opacity: 0;
            }
            
            .upload-progress-bar {
                height: 4px;
                background: #e0e0e0;
                border-radius: 2px;
                overflow: hidden;
                margin: 10px 0;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                transition: width 0.3s ease;
            }
            
            .drag-over {
                background-color: rgba(102, 126, 234, 0.1);
                border-color: #667eea;
            }
            
            .status-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .status-badge.pending {
                background: #ffc107;
                color: white;
            }
            
            .card-item {
                margin-bottom: 15px;
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// FORM HANDLERS (Global Functions)
// ============================================

const uploadManager = new AstegniUploadManager();

// Certification form handler
async function saveCertification() {
    const data = {
        title: document.getElementById('cert-certified-in').value,
        issuing_organization: document.getElementById('cert-school-search').value,
        issue_date: document.getElementById('cert-date').value
    };
    
    const fileInput = document.getElementById('cert-file');
    const file = fileInput.files[0];
    
    if (!data.title || !data.issuing_organization) {
        uploadManager.showNotification('error', 'Please fill in all required fields');
        return;
    }
    
    try {
        await uploadManager.uploadCertification(data, file);
        closeCertificationModal();
        document.getElementById('certification-form').reset();
    } catch (error) {
        console.error('Error saving certification:', error);
    }
}

// Experience form handler
async function saveExperience() {
    const data = {
        position: document.getElementById('exp-position').value,
        organization: document.getElementById('exp-organization-search').value,
        start_date: document.getElementById('exp-start-date').value,
        end_date: document.getElementById('exp-current').checked ? null : document.getElementById('exp-end-date').value,
        description: document.getElementById('exp-description').value
    };
    
    const fileInput = document.getElementById('exp-file');
    const file = fileInput.files[0];
    
    if (!data.position || !data.organization || !data.start_date) {
        uploadManager.showNotification('error', 'Please fill in all required fields');
        return;
    }
    
    try {
        await uploadManager.uploadExperience(data, file);
        closeExperienceModal();
        document.getElementById('experience-form').reset();
    } catch (error) {
        console.error('Error saving experience:', error);
    }
}

// Achievement form handler
async function saveAchievement() {
    const data = {
        title: document.getElementById('ach-title').value,
        institution: document.getElementById('ach-institution-search').value,
        date_achieved: document.getElementById('ach-date').value,
        description: document.getElementById('ach-description').value
    };
    
    const fileInput = document.getElementById('ach-file');
    const file = fileInput.files[0];
    
    if (!data.title || !data.institution) {
        uploadManager.showNotification('error', 'Please fill in all required fields');
        return;
    }
    
    try {
        await uploadManager.uploadAchievement(data, file);
        closeAchievementModal();
        document.getElementById('achievement-form').reset();
    } catch (error) {
        console.error('Error saving achievement:', error);
    }
}

// Video upload handler
async function publishVideo() {
    const videoFile = document.getElementById('videoFile').files[0];
    const thumbnailFile = document.getElementById('thumbnailFile').files[0];
    
    if (!videoFile) {
        uploadManager.showNotification('error', 'Please select a video file');
        return;
    }
    
    const metadata = {
        title: document.getElementById('videoTitle').value,
        description: document.getElementById('videoDescription').value,
        category: document.getElementById('videoCategory').value,
        subject: document.getElementById('videoSubject')?.value,
        grade_level: document.getElementById('targetAudience').value
    };
    
    // Validate required fields
    if (!metadata.title || !metadata.description || !metadata.category) {
        uploadManager.showNotification('error', 'Please fill in all required fields');
        return;
    }
    
    try {
        // Upload video first
        const videoResult = await uploadManager.uploadVideo(videoFile, metadata);
        
        // Upload thumbnail if provided
        if (thumbnailFile && videoResult.video_id) {
            await uploadManager.uploadVideoThumbnail(videoResult.video_id, thumbnailFile);
        }
        
        // Close upload modal and show review modal
        closeModal('uploadVideoModal');
        openModal('videoReviewModal');
        
    } catch (error) {
        console.error('Video publish error:', error);
    }
}

// Save video as draft
async function saveVideoAsDraft() {
    const videoFile = document.getElementById('videoFile').files[0];
    
    if (!videoFile) {
        uploadManager.showNotification('error', 'Please select a video file');
        return;
    }
    
    const metadata = {
        title: document.getElementById('videoTitle').value || 'Untitled Draft',
        description: document.getElementById('videoDescription').value || '',
        category: document.getElementById('videoCategory').value || 'general',
        grade_level: document.getElementById('targetAudience').value,
        status: 'draft'
    };
    
    try {
        await uploadManager.uploadVideo(videoFile, metadata);
        uploadManager.showNotification('success', 'Video saved as draft');
        closeModal('uploadVideoModal');
    } catch (error) {
        console.error('Draft save error:', error);
    }
}

// Remove video file
function removeVideoFile() {
    const fileInput = document.getElementById('videoFile');
    const fileInfo = document.getElementById('videoFileInfo');
    
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.classList.add('hidden');
}

// Remove thumbnail
function removeThumbnail() {
    const fileInput = document.getElementById('thumbnailFile');
    const preview = document.getElementById('thumbnailPreview');
    
    if (fileInput) fileInput.value = '';
    if (preview) {
        preview.classList.add('hidden');
        preview.querySelector('img').src = '';
    }
}

// Image upload handlers
async function uploadImage(type) {
    let file, uploadMethod;
    
    if (type === 'cover') {
        file = document.getElementById('coverInput').files[0];
        uploadMethod = 'uploadCoverImage';
    } else if (type === 'profile') {
        file = document.getElementById('profileInput').files[0];
        uploadMethod = 'uploadProfilePicture';
    }
    
    if (!file) {
        uploadManager.showNotification('error', `Please select ${type === 'cover' ? 'a cover image' : 'a profile picture'}`);
        return;
    }
    
    try {
        await uploadManager[uploadMethod](file);
        closeModal(`${type}UploadModal`);
    } catch (error) {
        console.error(`${type} upload error:`, error);
    }
}

// File handling utilities
function handleFileSelect(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    const previewId = `${type}-file-preview`;
    const preview = document.getElementById(previewId);
    
    if (preview) {
        preview.classList.remove('hidden');
        preview.querySelector('.file-name').textContent = file.name;
    }
}

function removeFile(type) {
    const fileInput = document.getElementById(`${type}-file`);
    const preview = document.getElementById(`${type}-file-preview`);
    
    if (fileInput) fileInput.value = '';
    if (preview) preview.classList.add('hidden');
}

function toggleEndDate() {
    const endDateInput = document.getElementById('exp-end-date');
    const isCurrentlyWorking = document.getElementById('exp-current').checked;
    
    if (endDateInput) {
        endDateInput.disabled = isCurrentlyWorking;
        endDateInput.value = isCurrentlyWorking ? '' : endDateInput.value;
        endDateInput.style.opacity = isCurrentlyWorking ? '0.5' : '1';
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!localStorage.getItem('token')) {
        console.log('User not authenticated');
    } else {
        // Load user profile on page load
        uploadManager.loadTutorProfile();
        // Setup school search functionality
        uploadManager.setupSchoolSearch();
    }
});

// ============================================
// SCHOOL REQUEST MODAL HANDLERS
// ============================================

function openSchoolRequestModal(source) {
    const modal = document.getElementById('school-request-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.dataset.source = source; // Store which form triggered this
    }
}

function closeSchoolRequestModal() {
    const modal = document.getElementById('school-request-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('school-request-form').reset();
    }
}

async function submitSchoolRequest() {
    const schoolName = document.getElementById('request-school-name').value;
    const location = document.getElementById('request-school-location').value;
    const phone = document.getElementById('request-school-phone').value;

    if (!schoolName || !location || !phone) {
        uploadManager.showNotification('error', 'Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch(`${uploadManager.API_BASE}/schools/request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${uploadManager.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: schoolName,
                location: location,
                phone: phone
            })
        });

        if (response.ok) {
            uploadManager.showNotification('success', 'School request submitted for review');
            
            // Add the school to the input field of the source form
            const modal = document.getElementById('school-request-modal');
            const source = modal.dataset.source;
            
            if (source === 'cert') {
                document.getElementById('cert-school-search').value = schoolName;
            } else if (source === 'exp') {
                document.getElementById('exp-organization-search').value = schoolName;
            } else if (source === 'ach') {
                document.getElementById('ach-institution-search').value = schoolName;
            }
            
            closeSchoolRequestModal();
        } else {
            throw new Error('Failed to submit school request');
        }
    } catch (error) {
        uploadManager.showNotification('error', error.message);
    }
}


// ============================================
// FAB (FLOATING ACTION BUTTON) HANDLERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const mainFab = document.getElementById('main-fab');
    const fabMenu = document.querySelector('.fab-menu');

        // All initialization code in one place
    if (localStorage.getItem('token')) {
        uploadManager.loadTutorProfile();
        uploadManager.setupSchoolSearch();
    }


    if (mainFab && fabMenu) {
        mainFab.addEventListener('click', () => {
            mainFab.classList.toggle('open');
            fabMenu.classList.toggle('show');
        });
        
        // Close FAB menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!mainFab.contains(e.target) && !fabMenu.contains(e.target)) {
                mainFab.classList.remove('open');
                fabMenu.classList.remove('show');
            }
        });
    }
});

// FAB quick action functions
function openRequestedSessionsModal() {
    // Navigate to requested sessions section
    const btn = document.querySelector('[data-content="requested-sessions"]');
    if (btn) btn.click();
}

function openStudentsModal() {
    // Navigate to my students section
    const btn = document.querySelector('[data-content="my-students"]');
    if (btn) btn.click();
}

function openNotesModal() {
    // Navigate to notes section
    const btn = document.querySelector('[data-content="notes"]');
    if (btn) btn.click();
}

function openToolsModal() {
    // Navigate to teaching tools section
    const btn = document.querySelector('[data-content="tutor-tools"]');
    if (btn) btn.click();
}