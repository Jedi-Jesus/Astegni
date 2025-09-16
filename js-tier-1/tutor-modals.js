// =============================================
// MODAL MANAGER FOR TUTOR PROFILE
// =============================================

class ModalManager {
    constructor(profileManager) {
        this.profileManager = profileManager;
        this.activeModal = null;
        this.setupModalHandlers();
    }

    setupModalHandlers() {
        // Edit Profile
        window.openEditProfileModal = () => this.openEditProfileModal();
        window.closeEditProfileModal = () => this.closeModal('edit-profile-modal');
        window.saveProfile = () => this.saveProfile();
        
        // Certifications
        window.addCertification = () => this.openAddCertificationModal();
        window.editCertification = (id) => this.openEditCertificationModal(id);
        window.deleteCertification = (id) => this.deleteCertification(id);
        
        // Experiences
        window.addExperience = () => this.openAddExperienceModal();
        window.editExperience = (id) => this.openEditExperienceModal(id);
        window.deleteExperience = (id) => this.deleteExperience(id);
        
        // Achievements
        window.addAchievement = () => this.openAddAchievementModal();
        window.editAchievement = (id) => this.openEditAchievementModal(id);
        window.deleteAchievement = (id) => this.deleteAchievement(id);
        
        // Schedule
        window.openScheduleModal = () => this.openScheduleModal();
        window.closeScheduleModal = () => this.closeModal('create-session-modal');
        
        // Students
        window.openStudentDetailsModal = (id) => this.openStudentDetailsModal(id);
        window.closeStudentDetailsModal = () => this.closeModal('student-details-modal');
        
        // Share
        window.shareProfile = () => this.openShareModal();
        
        // Upload
        window.openCoverUploadModal = () => this.openUploadModal('cover');
        window.openProfileUploadModal = () => this.openUploadModal('profile');
        window.uploadImage = (type) => this.uploadImage(type);
        
        // ESC key handler
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
            }
        });
    }

    // =============================================
    // EDIT PROFILE MODAL
    // =============================================

    openEditProfileModal() {
        const profile = this.profileManager.profileData;
        
        const modalHTML = `
            <div id="edit-profile-modal" class="modal show">
                <div class="modal-overlay" onclick="closeEditProfileModal()"></div>
                <div class="modal-content edit-profile-modal">
                    <div class="modal-header">
                        <h2>Edit Tutor Profile</h2>
                        <button class="modal-close" onclick="closeEditProfileModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="editProfileForm">
                            <div class="form-section">
                                <label class="form-label">Bio</label>
                                <textarea class="form-textarea" id="edit-bio" rows="5">${profile.bio || ''}</textarea>
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Quote</label>
                                <input type="text" class="form-input" id="edit-quote" value="${profile.quote || ''}">
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Gender</label>
                                <select class="form-input" id="edit-gender">
                                    <option value="">Select Gender</option>
                                    <option value="Male" ${profile.gender === 'Male' ? 'selected' : ''}>Male</option>
                                    <option value="Female" ${profile.gender === 'Female' ? 'selected' : ''}>Female</option>
                                    <option value="Other" ${profile.gender === 'Other' ? 'selected' : ''}>Other</option>
                                </select>
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Location</label>
                                <input type="text" class="form-input" id="edit-location" value="${profile.location || ''}">
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Teaches At</label>
                                <input type="text" class="form-input" id="edit-teaches-at" value="${profile.teaches_at || ''}">
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Hourly Rate (ETB)</label>
                                <input type="number" class="form-input" id="edit-price" value="${profile.price || 0}">
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Experience (years)</label>
                                <input type="number" class="form-input" id="edit-experience" value="${profile.experience || 0}">
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Courses (comma separated)</label>
                                <input type="text" class="form-input" id="edit-courses" 
                                       value="${(profile.courses || []).join(', ')}">
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Grades (comma separated)</label>
                                <input type="text" class="form-input" id="edit-grades" 
                                       value="${(profile.grades || []).join(', ')}">
                            </div>
                            
                            <div class="form-section">
                                <label class="form-label">Teaching Methods (comma separated)</label>
                                <input type="text" class="form-input" id="edit-methods" 
                                       value="${(profile.teaching_methods || []).join(', ')}">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="closeEditProfileModal()">Cancel</button>
                        <button class="btn-primary" onclick="saveProfile()">Save Changes</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderModal(modalHTML, 'edit-profile-modal');
    }

    async saveProfile() {
        const profileData = {
            bio: document.getElementById('edit-bio').value,
            quote: document.getElementById('edit-quote').value,
            gender: document.getElementById('edit-gender').value,
            location: document.getElementById('edit-location').value,
            teaches_at: document.getElementById('edit-teaches-at').value,
            price: parseFloat(document.getElementById('edit-price').value) || 0,
            experience: parseInt(document.getElementById('edit-experience').value) || 0,
            courses: document.getElementById('edit-courses').value.split(',').map(s => s.trim()).filter(s => s),
            grades: document.getElementById('edit-grades').value.split(',').map(s => s.trim()).filter(s => s),
            teaching_methods: document.getElementById('edit-methods').value.split(',').map(s => s.trim()).filter(s => s)
        };

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/api/tutor/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                this.profileManager.showToast('Profile updated successfully!', 'success');
                this.closeModal('edit-profile-modal');
                await this.profileManager.loadAllData();
            } else {
                throw new Error('Failed to update profile');
            }
        } catch (error) {
            this.profileManager.showToast('Error updating profile', 'error');
        }
    }

    // =============================================
    // CERTIFICATION MODALS
    // =============================================

    openAddCertificationModal() {
        const modalHTML = `
            <div id="add-certification-modal" class="modal show">
                <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add Certification</h2>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form id="addCertificationForm">
                            <div class="form-group">
                                <label>Title *</label>
                                <input type="text" id="cert-title" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Issuing Organization *</label>
                                <input type="text" id="cert-org" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Issue Date *</label>
                                <input type="date" id="cert-date" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Expiry Date</label>
                                <input type="date" id="cert-expiry" class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label>Credential ID</label>
                                <input type="text" id="cert-credential" class="form-input">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn-primary" onclick="modalManager.submitCertification()">Add Certification</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderModal(modalHTML, 'add-certification-modal');
    }

    async submitCertification() {
        const certData = {
            title: document.getElementById('cert-title').value,
            issuing_organization: document.getElementById('cert-org').value,
            issue_date: document.getElementById('cert-date').value,
            expiry_date: document.getElementById('cert-expiry').value || null,
            credential_id: document.getElementById('cert-credential').value || null
        };

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/api/tutor/certifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(certData)
            });

            if (response.ok) {
                this.profileManager.showToast('Certification added successfully!', 'success');
                document.getElementById('add-certification-modal').remove();
                await this.profileManager.loadAllData();
            } else {
                throw new Error('Failed to add certification');
            }
        } catch (error) {
            this.profileManager.showToast('Error adding certification', 'error');
        }
    }

    async deleteCertification(id) {
        if (!confirm('Are you sure you want to delete this certification?')) return;

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`http://localhost:8000/api/tutor/certifications/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.profileManager.showToast('Certification deleted successfully', 'success');
                await this.profileManager.loadAllData();
            }
        } catch (error) {
            this.profileManager.showToast('Error deleting certification', 'error');
        }
    }

    // =============================================
    // EXPERIENCE MODALS
    // =============================================

    openAddExperienceModal() {
        const modalHTML = `
            <div id="add-experience-modal" class="modal show">
                <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add Experience</h2>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="form-group">
                                <label>Position *</label>
                                <input type="text" id="exp-position" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Organization *</label>
                                <input type="text" id="exp-org" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Location</label>
                                <input type="text" id="exp-location" class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label>Start Date *</label>
                                <input type="date" id="exp-start" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label>End Date</label>
                                <input type="date" id="exp-end" class="form-input">
                                <label>
                                    <input type="checkbox" id="exp-current" onchange="this.checked ? document.getElementById('exp-end').disabled = true : document.getElementById('exp-end').disabled = false">
                                    Currently working here
                                </label>
                            </div>
                            
                            <div class="form-group">
                                <label>Description</label>
                                <textarea id="exp-desc" class="form-input" rows="4"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn-primary" onclick="modalManager.submitExperience()">Add Experience</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderModal(modalHTML, 'add-experience-modal');
    }

    async submitExperience() {
        const expData = {
            position: document.getElementById('exp-position').value,
            organization: document.getElementById('exp-org').value,
            location: document.getElementById('exp-location').value,
            start_date: document.getElementById('exp-start').value,
            end_date: document.getElementById('exp-current').checked ? null : document.getElementById('exp-end').value,
            is_current: document.getElementById('exp-current').checked,
            description: document.getElementById('exp-desc').value
        };

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/api/tutor/experiences', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(expData)
            });

            if (response.ok) {
                this.profileManager.showToast('Experience added successfully!', 'success');
                document.getElementById('add-experience-modal').remove();
                await this.profileManager.loadAllData();
            } else {
                throw new Error('Failed to add experience');
            }
        } catch (error) {
            this.profileManager.showToast('Error adding experience', 'error');
        }
    }

    // =============================================
    // ACHIEVEMENT MODALS
    // =============================================

    openAddAchievementModal() {
        const modalHTML = `
            <div id="add-achievement-modal" class="modal show">
                <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Add Achievement</h2>
                        <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <form>
                            <div class="form-group">
                                <label>Title *</label>
                                <input type="text" id="ach-title" class="form-input" required>
                            </div>
                            
                            <div class="form-group">
                                <label>Category *</label>
                                <select id="ach-category" class="form-input" required>
                                    <option value="">Select Category</option>
                                    <option value="Award">Award</option>
                                    <option value="Publication">Publication</option>
                                    <option value="Project">Project</option>
                                    <option value="Certification">Certification</option>
                                    <option value="Recognition">Recognition</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Date Achieved</label>
                                <input type="date" id="ach-date" class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label>Description</label>
                                <textarea id="ach-desc" class="form-input" rows="4"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn-primary" onclick="modalManager.submitAchievement()">Add Achievement</button>
                    </div>
                </div>
            </div>
        `;
        
        this.renderModal(modalHTML, 'add-achievement-modal');
    }

    async submitAchievement() {
        const achData = {
            title: document.getElementById('ach-title').value,
            category: document.getElementById('ach-category').value,
            date_achieved: document.getElementById('ach-date').value || null,
            description: document.getElementById('ach-desc').value
        };

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch('http://localhost:8000/api/tutor/achievements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(achData)
            });

            if (response.ok) {
                this.profileManager.showToast('Achievement added successfully!', 'success');
                document.getElementById('add-achievement-modal').remove();
                await this.profileManager.loadAllData();
            } else {
                throw new Error('Failed to add achievement');
            }
        } catch (error) {
            this.profileManager.showToast('Error adding achievement', 'error');
        }
    }

    // =============================================
    // UPLOAD MODALS
    // =============================================

    openUploadModal(type) {
        const modalId = `${type}UploadModal`;
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            this.activeModal = modalId;
        }
    }

    async uploadImage(type) {
        const fileInput = document.getElementById(`${type}Input`);
        const file = fileInput.files[0];

        if (!file) {
            alert('Please select an image first');
            return;
        }

        // Show progress
        document.getElementById(`${type}Progress`).classList.add('active');
        document.getElementById(`${type}Spinner`).classList.add('active');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('access_token');
            const endpoint = type === 'cover' 
                ? '/api/upload/profile-picture' // You'll need to create a cover image endpoint
                : '/api/upload/profile-picture';

            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    document.getElementById(`${type}ProgressFill`).style.width = percentComplete + '%';
                    document.getElementById(`${type}ProgressText`).textContent = `Uploading... ${Math.round(percentComplete)}%`;
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    
                    // Update the image on the page
                    if (type === 'cover') {
                        const coverImg = document.querySelector('.cover-img');
                        if (coverImg) {
                            coverImg.src = this.profileManager.getImageUrl(response.url);
                        }
                    } else {
                        const profileImg = document.querySelector('.profile-avatar');
                        if (profileImg) {
                            profileImg.src = this.profileManager.getImageUrl(response.url);
                        }
                    }
                    
                    this.profileManager.showToast(`${type === 'cover' ? 'Cover' : 'Profile'} image uploaded successfully!`, 'success');
                    this.closeModal(`${type}UploadModal`);
                } else {
                    throw new Error('Upload failed');
                }
            });

            xhr.addEventListener('error', () => {
                this.profileManager.showToast('Error uploading image', 'error');
                document.getElementById(`${type}Progress`).classList.remove('active');
                document.getElementById(`${type}Spinner`).classList.remove('active');
            });

            xhr.open('POST', `http://localhost:8000${endpoint}`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            xhr.send(formData);
            
        } catch (error) {
            this.profileManager.showToast('Error uploading image', 'error');
            document.getElementById(`${type}Progress`).classList.remove('active');
            document.getElementById(`${type}Spinner`).classList.remove('active');
        }
    }

    // =============================================
    // UTILITY FUNCTIONS
    // =============================================

    renderModal(html, modalId) {
        // Remove existing modal if present
        const existing = document.getElementById(modalId);
        if (existing) existing.remove();
        
        // Add new modal
        document.body.insertAdjacentHTML('beforeend', html);
        this.activeModal = modalId;
        
        // Make modalManager accessible
        window.modalManager = this;
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            if (modal.classList.contains('modal')) {
                modal.remove();
            } else {
                modal.classList.remove('active', 'show');
            }
        }
        
        if (this.activeModal === modalId) {
            this.activeModal = null;
        }
    }
}