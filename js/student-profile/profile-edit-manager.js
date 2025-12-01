/**
 * STUDENT PROFILE EDIT MANAGER
 * Handles comprehensive profile editing with database integration
 */

const API_BASE_URL = 'https://api.astegni.com';

/**
 * Get current user ID from AuthManager
 */
function getCurrentUserId() {
    if (!window.AuthManager || !window.AuthManager.user) {
        console.error('❌ AuthManager or user not available');
        return null;
    }
    return window.AuthManager.user.id;
}

// ============================================
// MODAL FUNCTIONS
// ============================================

/**
 * Open edit profile modal and populate with current data
 */
async function openEditProfileModal() {
    try {
        // Show modal
        const modal = document.getElementById('editProfileModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';

            // Load current profile data
            await loadCurrentProfileData();
        }
    } catch (error) {
        console.error('Error opening edit modal:', error);
        showNotification('Failed to open edit modal', 'error');
    }
}

/**
 * Close edit profile modal
 */
function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
}

// ============================================
// DYNAMIC FIELD MANAGEMENT
// ============================================

/**
 * Add new hero title input field
 */
function addHeroTitle() {
    const container = document.getElementById('hero-titles-container');
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.className = 'form-input hero-title-input';
    newInput.placeholder = 'Enter hero title';
    newInput.style.marginBottom = '0.5rem';

    // Add remove button
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '0.5rem';
    wrapper.appendChild(newInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'btn-secondary';
    removeBtn.style.padding = '0.5rem 1rem';
    removeBtn.style.minWidth = 'auto';
    removeBtn.onclick = () => wrapper.remove();
    wrapper.appendChild(removeBtn);

    container.appendChild(wrapper);
}

// Hero subtitle is now a single value field (removed addHeroSubtitle function)

/**
 * Add new interested in (subject) input field
 */
function addInterestedIn() {
    const container = document.getElementById('interested-in-container');
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.className = 'form-input interested-in-input';
    newInput.placeholder = 'Enter subject';
    newInput.style.marginBottom = '0.5rem';

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '0.5rem';
    wrapper.appendChild(newInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'btn-secondary';
    removeBtn.style.padding = '0.5rem 1rem';
    removeBtn.style.minWidth = 'auto';
    removeBtn.onclick = () => wrapper.remove();
    wrapper.appendChild(removeBtn);

    container.appendChild(wrapper);
}

/**
 * Add new language input field
 */
function addLanguage() {
    const container = document.getElementById('languages-container');
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.className = 'form-input language-input';
    newInput.placeholder = 'Enter language';
    newInput.style.marginBottom = '0.5rem';

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '0.5rem';
    wrapper.appendChild(newInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'btn-secondary';
    removeBtn.style.padding = '0.5rem 1rem';
    removeBtn.style.minWidth = 'auto';
    removeBtn.onclick = () => wrapper.remove();
    wrapper.appendChild(removeBtn);

    container.appendChild(wrapper);
}

/**
 * Add new hobby input field
 */
function addHobby() {
    const container = document.getElementById('hobbies-container');
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.className = 'form-input hobby-input';
    newInput.placeholder = 'Enter hobby';
    newInput.style.marginBottom = '0.5rem';

    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.gap = '0.5rem';
    wrapper.appendChild(newInput);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.className = 'btn-secondary';
    removeBtn.style.padding = '0.5rem 1rem';
    removeBtn.style.minWidth = 'auto';
    removeBtn.onclick = () => wrapper.remove();
    wrapper.appendChild(removeBtn);

    container.appendChild(wrapper);
}

// Quote is now a single value field (removed addQuote function)

// ============================================
// DATA LOADING AND POPULATION
// ============================================

/**
 * Load current profile data from database
 */
async function loadCurrentProfileData() {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('User ID not available');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_BASE_URL}/api/student/profile/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            // Profile might not exist yet, that's okay
            console.log('No existing profile found, creating new profile');
            return;
        }

        const data = await response.json();
        populateEditForm(data);
    } catch (error) {
        console.error('Error loading profile data:', error);
        // Don't show error - user might be creating profile for first time
    }
}

/**
 * Populate edit form with existing data
 */
function populateEditForm(data) {
    // Single value fields
    if (data.username) document.getElementById('edit-username').value = data.username;
    if (data.location) document.getElementById('edit-location').value = data.location;
    if (data.studying_at) document.getElementById('edit-studying-at').value = data.studying_at;
    if (data.grade_level) document.getElementById('edit-grade-level').value = data.grade_level;
    if (data.about) document.getElementById('edit-about').value = data.about;

    // Hero subtitle (single value from array - take first element)
    if (data.hero_subtitle && Array.isArray(data.hero_subtitle) && data.hero_subtitle.length > 0) {
        document.getElementById('edit-hero-subtitle').value = data.hero_subtitle[0];
    } else if (typeof data.hero_subtitle === 'string') {
        document.getElementById('edit-hero-subtitle').value = data.hero_subtitle;
    }

    // Quote (single value from array - take first element)
    if (data.quote && Array.isArray(data.quote) && data.quote.length > 0) {
        document.getElementById('edit-quote').value = data.quote[0];
    } else if (typeof data.quote === 'string') {
        document.getElementById('edit-quote').value = data.quote;
    }

    // Learning method checkboxes
    if (data.learning_method && Array.isArray(data.learning_method)) {
        if (data.learning_method.includes('Online')) {
            document.getElementById('learning-online').checked = true;
        }
        if (data.learning_method.includes('In-person')) {
            document.getElementById('learning-in-person').checked = true;
        }
    }

    // Array fields
    populateArrayField('hero-titles-container', 'hero-title-input', data.hero_title, 'input', addHeroTitle);
    populateArrayField('interested-in-container', 'interested-in-input', data.interested_in, 'input', addInterestedIn);
    populateArrayField('languages-container', 'language-input', data.languages, 'input', addLanguage);
    populateArrayField('hobbies-container', 'hobby-input', data.hobbies, 'input', addHobby);
}

/**
 * Helper function to populate array fields
 */
function populateArrayField(containerId, inputClass, dataArray, fieldType, addFunction) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing inputs except the first one
    container.innerHTML = '';

    if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
        dataArray.forEach((value, index) => {
            if (index === 0) {
                // Use first existing input
                const firstInput = fieldType === 'textarea'
                    ? document.createElement('textarea')
                    : document.createElement('input');
                firstInput.type = 'text';
                firstInput.className = `form-input ${inputClass}`;
                firstInput.value = value;
                firstInput.style.marginBottom = '0.5rem';
                if (fieldType === 'textarea') {
                    firstInput.rows = 2;
                }
                container.appendChild(firstInput);
            } else {
                // Add additional inputs
                addFunction();
                const inputs = container.querySelectorAll(`.${inputClass}`);
                const lastInput = inputs[inputs.length - 1];
                if (lastInput) {
                    lastInput.value = value;
                }
            }
        });
    } else {
        // Add one empty input
        const firstInput = fieldType === 'textarea'
            ? document.createElement('textarea')
            : document.createElement('input');
        firstInput.type = 'text';
        firstInput.className = `form-input ${inputClass}`;
        firstInput.style.marginBottom = '0.5rem';
        if (fieldType === 'textarea') {
            firstInput.rows = 2;
        }
        container.appendChild(firstInput);
    }
}

// ============================================
// DATA COLLECTION AND SAVING
// ============================================

/**
 * Collect values from array fields
 */
function collectArrayValues(className) {
    const inputs = document.querySelectorAll(`.${className}`);
    const values = [];

    inputs.forEach(input => {
        const value = input.value.trim();
        if (value) {
            values.push(value);
        }
    });

    return values;
}

/**
 * Save student profile to database
 */
async function saveStudentProfile() {
    try {
        // Show loading state
        const saveBtn = event.target;
        const originalText = saveBtn.textContent;
        saveBtn.textContent = '💾 Saving...';
        saveBtn.disabled = true;

        // Collect form data
        const heroSubtitle = document.getElementById('edit-hero-subtitle').value.trim();
        const quote = document.getElementById('edit-quote').value.trim();

        const profileData = {
            hero_title: collectArrayValues('hero-title-input'),
            hero_subtitle: heroSubtitle ? [heroSubtitle] : [], // Store as single-element array
            username: document.getElementById('edit-username').value.trim(),
            location: document.getElementById('edit-location').value.trim(),
            studying_at: document.getElementById('edit-studying-at').value.trim(),
            grade_level: document.getElementById('edit-grade-level').value,
            interested_in: collectArrayValues('interested-in-input'),
            learning_method: [],
            languages: collectArrayValues('language-input'),
            hobbies: collectArrayValues('hobby-input'),
            quote: quote ? [quote] : [], // Store as single-element array
            about: document.getElementById('edit-about').value.trim()
        };

        // Collect learning method checkboxes
        if (document.getElementById('learning-online').checked) {
            profileData.learning_method.push('Online');
        }
        if (document.getElementById('learning-in-person').checked) {
            profileData.learning_method.push('In-person');
        }

        // Validate required fields
        if (!profileData.username) {
            showNotification('Username is required', 'warning');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            return;
        }

        if (!profileData.grade_level) {
            showNotification('Grade level is required', 'warning');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            return;
        }

        if (profileData.learning_method.length === 0) {
            showNotification('Please select at least one learning method', 'warning');
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
            return;
        }

        // Get authentication token
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        console.log('Saving student profile:', profileData);

        // Send to backend with Authorization header
        const response = await fetch(`${API_BASE_URL}/api/student/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to save profile' }));
            console.error('❌ Profile save failed:', response.status, errorData);
            throw new Error(errorData.detail || `Failed to save profile (${response.status})`);
        }

        console.log('✅ Profile saved successfully!');

        const result = await response.json();

        // Show success notification
        showNotification('✅ Profile updated successfully!', 'success');

        // Close modal
        closeEditProfileModal();

        // Reload profile header without page reload
        await reloadProfileHeader();

        // Reset button
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;

    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification(`❌ Failed to save profile: ${error.message}`, 'error');

        // Reset button
        const saveBtn = event.target;
        saveBtn.textContent = '💾 Save Changes';
        saveBtn.disabled = false;
    }
}

// ============================================
// PROFILE HEADER REFRESH
// ============================================

/**
 * Reload profile header section from database without page refresh
 */
async function reloadProfileHeader() {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('User ID not available');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(`${API_BASE_URL}/api/student/profile/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load profile data');
        }

        const data = await response.json();

        // Update profile header elements
        updateProfileHeaderUI(data);

    } catch (error) {
        console.error('Error reloading profile header:', error);
        // Don't show error to user - silent failure
    }
}

/**
 * Update profile header UI with new data
 */
function updateProfileHeaderUI(data) {
    // Update username
    const usernameEl = document.querySelector('.profile-name');
    if (usernameEl && data.username) {
        usernameEl.textContent = data.username;
    }

    // Update hero titles (rotating text) - targets #typedText
    if (data.hero_title && data.hero_title.length > 0) {
        const heroTitleEl = document.getElementById('typedText');
        if (heroTitleEl) {
            heroTitleEl.textContent = data.hero_title[0];
        }
    }

    // Update hero subtitle - targets #hero-subtitle
    if (data.hero_subtitle && data.hero_subtitle.length > 0) {
        const heroSubtitleEl = document.getElementById('hero-subtitle');
        if (heroSubtitleEl) {
            heroSubtitleEl.textContent = data.hero_subtitle[0];
        }
    } else if (typeof data.hero_subtitle === 'string' && data.hero_subtitle) {
        const heroSubtitleEl = document.getElementById('hero-subtitle');
        if (heroSubtitleEl) {
            heroSubtitleEl.textContent = data.hero_subtitle;
        }
    }

    // Update location
    const locationEl = document.querySelector('.profile-location');
    if (locationEl && data.location) {
        locationEl.textContent = data.location;
    }

    // Update bio/about (About Me section in dashboard panel)
    const bioEl = document.getElementById('student-bio');
    if (bioEl) {
        if (data.about) {
            bioEl.textContent = data.about;
            bioEl.style.fontStyle = 'normal';
            bioEl.style.color = 'var(--text-muted)';
        } else {
            bioEl.textContent = 'No bio yet';
            bioEl.style.fontStyle = 'italic';
            bioEl.style.color = 'var(--text-muted)';
        }
    }

    // Update interested in (subjects) - targets #student-subjects
    if (data.interested_in && data.interested_in.length > 0) {
        const subjectsEl = document.getElementById('student-subjects');
        if (subjectsEl) {
            subjectsEl.textContent = data.interested_in.join(', ');
            subjectsEl.style.color = 'var(--text)';
            subjectsEl.style.fontStyle = 'normal';
        }
    }

    // Update grade level - targets #student-grade
    const gradeEl = document.getElementById('student-grade');
    if (gradeEl && data.grade_level) {
        gradeEl.textContent = data.grade_level;
        gradeEl.style.color = 'var(--text)';
        gradeEl.style.fontStyle = 'normal';
    }

    // Update studying at - targets #student-school
    const studyingAtEl = document.getElementById('student-school');
    if (studyingAtEl && data.studying_at) {
        studyingAtEl.textContent = data.studying_at;
        studyingAtEl.style.color = 'var(--text)';
        studyingAtEl.style.fontStyle = 'normal';
    }

    // Update learning method - targets #student-learning-methods
    if (data.learning_method && data.learning_method.length > 0) {
        const learningMethodEl = document.getElementById('student-learning-methods');
        if (learningMethodEl) {
            learningMethodEl.textContent = data.learning_method.join(', ');
            learningMethodEl.style.color = 'var(--text)';
            learningMethodEl.style.fontStyle = 'normal';
        }
    }

    // Update languages - targets #student-languages
    if (data.languages && data.languages.length > 0) {
        const languagesEl = document.getElementById('student-languages');
        if (languagesEl) {
            languagesEl.textContent = data.languages.join(', ');
            languagesEl.style.color = 'var(--text)';
            languagesEl.style.fontStyle = 'normal';
        }
    }

    // Update hobbies - targets #student-hobbies
    if (data.hobbies && data.hobbies.length > 0) {
        const hobbiesEl = document.getElementById('student-hobbies');
        if (hobbiesEl) {
            hobbiesEl.textContent = data.hobbies.join(', ');
            hobbiesEl.style.color = 'var(--text)';
            hobbiesEl.style.fontStyle = 'normal';
        }
    }

    console.log('✅ Profile header updated successfully');
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
    // Check if notification system exists from student-profile.js
    if (window.app && window.app.notificationSystem) {
        window.app.notificationSystem.show(message, type);
        return;
    }

    // Fallback: Create simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Profile Edit Manager initialized');

    // Attach edit button handler
    const editBtn = document.querySelector('.edit-profile-btn');
    if (editBtn) {
        editBtn.addEventListener('click', openEditProfileModal);
    }

    // ESC key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeEditProfileModal();
        }
    });
});

// Export functions for global access
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.saveStudentProfile = saveStudentProfile;
window.addHeroTitle = addHeroTitle;
window.addInterestedIn = addInterestedIn;
window.addLanguage = addLanguage;
window.addHobby = addHobby;
