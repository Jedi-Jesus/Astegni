// ============================================
// TUTOR PROFILE EDIT HANDLER
// Handles profile editing and form submission
// ============================================

const TutorProfileEditHandler = {
    isEditing: false,
    originalData: {},

    // Initialize edit functionality
    init() {
        this.setupEditButton();
        this.setupSaveButton();
        this.setupCancelButton();
    },

    // Setup edit button
    setupEditButton() {
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.enableEditMode());
        }
    },

    // Setup save button
    setupSaveButton() {
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }
    },

    // Setup cancel button
    setupCancelButton() {
        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEdit());
        }
    },

    // Enable edit mode
    enableEditMode() {
        this.isEditing = true;

        // Save original data (from localStorage user object)
        const user = JSON.parse(localStorage.getItem('currentUser') || localStorage.getItem('user') || '{}');
        this.originalData = { ...user };

        // Make fields editable
        this.makeFieldEditable('hero-title-input', 'typedText');
        this.makeFieldEditable('hero-subtitle-input', 'hero-subtitle');
        this.makeFieldEditable('bio-input', 'tutor-bio');
        this.makeFieldEditable('quote-input', 'tutor-quote');

        // Show save/cancel buttons
        this.showElement('save-profile-btn');
        this.showElement('cancel-edit-btn');
        this.hideElement('edit-profile-btn');

        // Make input fields visible
        const editableFields = document.querySelectorAll('[data-editable]');
        editableFields.forEach(field => {
            field.style.display = 'block';
            const displayField = field.previousElementSibling;
            if (displayField) {
                displayField.style.display = 'none';
            }
        });
    },

    // Save profile changes
    async saveProfile() {
        try {
            // Show loading state
            this.showLoading();

            // Collect form data
            const profileData = this.collectFormData();

            // Validate data
            if (!this.validateFormData(profileData)) {
                throw new Error('Please fill in all required fields');
            }

            // Send to backend
            const response = await TutorProfileAPI.updateTutorProfileExtended(profileData);

            if (response.message) {
                alert('Profile updated successfully!');

                // Reload profile data using inline function
                if (typeof loadProfileHeaderData === 'function') {
                    await loadProfileHeaderData();
                }

                // Disable edit mode
                this.disableEditMode();
            }

        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile. Please try again.');
        } finally {
            this.hideLoading();
        }
    },

    // Cancel edit
    cancelEdit() {
        // Restore original data
        if (confirm('Discard all changes?')) {
            this.disableEditMode();
            // Reload original data using inline function
            if (typeof loadProfileHeaderData === 'function') {
                loadProfileHeaderData();
            }
        }
    },

    // Disable edit mode
    disableEditMode() {
        this.isEditing = false;

        // Hide save/cancel buttons
        this.hideElement('save-profile-btn');
        this.hideElement('cancel-edit-btn');
        this.showElement('edit-profile-btn');

        // Hide input fields
        const editableFields = document.querySelectorAll('[data-editable]');
        editableFields.forEach(field => {
            field.style.display = 'none';
            const displayField = field.previousElementSibling;
            if (displayField) {
                displayField.style.display = 'block';
            }
        });
    },

    // Collect form data
    collectFormData() {
        return {
            hero_title: this.getInputValue('hero-title-input'),
            hero_subtitle: this.getInputValue('hero-subtitle-input'),
            bio: this.getInputValue('bio-input'),
            quote: this.getInputValue('quote-input'),
            location: this.getInputValue('location-input'),
            teaches_at: this.getInputValue('teaches-at-input'),
            sessionFormat: this.getSelectValue('session-format-select'),
            experience: parseInt(this.getInputValue('experience-input')) || 0,
            price: parseFloat(this.getInputValue('price-input')) || 0,
            // Add more fields as needed
        };
    },

    // Validate form data
    validateFormData(data) {
        // Basic validation
        if (!data.bio || data.bio.trim().length < 10) {
            alert('Bio must be at least 10 characters long');
            return false;
        }

        if (data.experience < 0) {
            alert('Experience cannot be negative');
            return false;
        }

        if (data.price < 0) {
            alert('Price cannot be negative');
            return false;
        }

        return true;
    },

    // Make field editable
    makeFieldEditable(inputId, displayId) {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);

        if (input && display) {
            input.value = display.textContent;
            input.style.display = 'block';
            display.style.display = 'none';
        }
    },

    // Utility functions
    getInputValue(id) {
        const input = document.getElementById(id);
        return input ? input.value : '';
    },

    getSelectValue(id) {
        const select = document.getElementById(id);
        return select ? select.value : '';
    },

    showElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
        }
    },

    hideElement(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    },

    showLoading() {
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
        }
    },

    hideLoading() {
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Changes';
        }
    }
};
