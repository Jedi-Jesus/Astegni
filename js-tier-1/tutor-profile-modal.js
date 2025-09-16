// ============================================
// FIX FOR tutor-profile.js - Modal Functions
// Add this to your tutor-profile.js or create a new file tutor-profile-modals.js
// ============================================

// Global state for tutor profile
const tutorProfileState = {
    tutorId: null,
    profileData: {},
    certifications: [],
    experiences: [],
    achievements: [],
    isOwnProfile: false
};

// Get tutor ID from URL or localStorage
function getTutorId() {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorId = urlParams.get('id');
    return tutorId || localStorage.getItem('user_id');
}

// ============================================
// PROFILE LOADING AND INITIALIZATION
// ============================================

async function loadTutorProfile() {
    try {
        const tutorId = getTutorId();
        if (!tutorId) {
            console.error('No tutor ID found');
            return;
        }

        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/tutors/${tutorId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            throw new Error('Failed to load tutor profile');
        }

        const data = await response.json();
        tutorProfileState.profileData = data;
        tutorProfileState.tutorId = tutorId;
        
        // Check if this is the user's own profile
        const currentUserId = localStorage.getItem('user_id');
        tutorProfileState.isOwnProfile = currentUserId === tutorId;

        // Populate profile data
        populateProfileData(data);
        
        // Show/hide edit buttons based on ownership
        if (tutorProfileState.isOwnProfile) {
            document.querySelectorAll('.edit-button').forEach(btn => {
                btn.style.display = 'inline-block';
            });
        }

    } catch (error) {
        console.error('Error loading profile:', error);
        showNotification('Failed to load profile', 'error');
    }
}

function populateProfileData(data) {
    // Update profile elements with data
    const nameElement = document.querySelector('.tutor-name');
    if (nameElement) nameElement.textContent = data.name || 'Tutor Name';
    
    const bioElement = document.querySelector('.tutor-bio');
    if (bioElement) bioElement.textContent = data.bio || 'No bio available';
    
    const locationElement = document.querySelector('.location');
    if (locationElement) locationElement.textContent = data.location || 'Location not set';
    
    // Add more field updates as needed
}

// ============================================
// MODAL MANAGEMENT FUNCTIONS
// ============================================

// 1. EDIT PROFILE MODAL
window.openEditProfileModal = function() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.classList.remove('hidden');
        return;
    }

    const modalHTML = `
        <div id="edit-profile-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">Edit Profile</h2>
                        <button onclick="closeEditProfileModal()" class="text-gray-500 hover:text-gray-700 text-3xl">&times;</button>
                    </div>
                    
                    <form id="editProfileForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Full Name</label>
                            <input type="text" id="edit-name" class="w-full p-2 border rounded" 
                                   value="${tutorProfileState.profileData.name || ''}" placeholder="Your full name">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Location</label>
                            <input type="text" id="edit-location" class="w-full p-2 border rounded" 
                                   value="${tutorProfileState.profileData.location || ''}" placeholder="City, Country">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Hourly Rate (ETB)</label>
                            <input type="number" id="edit-price" class="w-full p-2 border rounded" 
                                   value="${tutorProfileState.profileData.price || ''}" placeholder="500">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Teaching Experience (years)</label>
                            <input type="number" id="edit-experience" class="w-full p-2 border rounded" 
                                   value="${tutorProfileState.profileData.experience || ''}" placeholder="5">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Subjects (comma separated)</label>
                            <input type="text" id="edit-courses" class="w-full p-2 border rounded" 
                                   value="${(tutorProfileState.profileData.courses || []).join(', ')}" 
                                   placeholder="Mathematics, Physics, Chemistry">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Grades (comma separated)</label>
                            <input type="text" id="edit-grades" class="w-full p-2 border rounded" 
                                   value="${(tutorProfileState.profileData.grades || []).join(', ')}" 
                                   placeholder="Grade 9, Grade 10, Grade 11">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Bio</label>
                            <textarea id="edit-bio" rows="4" class="w-full p-2 border rounded" 
                                      placeholder="Tell students about yourself...">${tutorProfileState.profileData.bio || ''}</textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Quote</label>
                            <input type="text" id="edit-quote" class="w-full p-2 border rounded" 
                                   value="${tutorProfileState.profileData.quote || ''}" 
                                   placeholder="Your inspiring quote...">
                        </div>
                    </form>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeEditProfileModal()" 
                                class="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                        <button onclick="saveProfile()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Save Changes</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeEditProfileModal = function() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) {
        modal.remove();
    }
};

window.saveProfile = async function() {
    try {
        const profileData = {
            name: document.getElementById('edit-name').value,
            location: document.getElementById('edit-location').value,
            price: parseFloat(document.getElementById('edit-price').value) || 0,
            experience: parseInt(document.getElementById('edit-experience').value) || 0,
            courses: document.getElementById('edit-courses').value.split(',').map(s => s.trim()).filter(s => s),
            grades: document.getElementById('edit-grades').value.split(',').map(s => s.trim()).filter(s => s),
            bio: document.getElementById('edit-bio').value,
            quote: document.getElementById('edit-quote').value
        };

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
            showNotification('Profile updated successfully!', 'success');
            closeEditProfileModal();
            await loadTutorProfile(); // Reload profile data
        } else {
            throw new Error('Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showNotification('Failed to save profile', 'error');
    }
};

// 2. ADD CERTIFICATION MODAL
window.openAddCertificationModal = function() {
    const modal = document.getElementById('add-certification-modal');
    if (modal) {
        modal.classList.remove('hidden');
        return;
    }

    const modalHTML = `
        <div id="add-certification-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">Add Certification</h2>
                        <button onclick="closeAddCertificationModal()" class="text-gray-500 hover:text-gray-700 text-3xl">&times;</button>
                    </div>
                    
                    <form id="addCertificationForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Institution</label>
                            <input type="text" id="cert-institution" class="w-full p-2 border rounded" 
                                   placeholder="Harvard University" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Certification Title</label>
                            <input type="text" id="cert-title" class="w-full p-2 border rounded" 
                                   placeholder="Bachelor of Science" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Field of Study</label>
                            <input type="text" id="cert-field" class="w-full p-2 border rounded" 
                                   placeholder="Computer Science" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Type</label>
                            <select id="cert-type" class="w-full p-2 border rounded" required>
                                <option value="">Select Type</option>
                                <option value="BSc">BSc</option>
                                <option value="MSc">MSc</option>
                                <option value="PhD">PhD</option>
                                <option value="Diploma">Diploma</option>
                                <option value="Certificate">Certificate</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Date Received</label>
                            <input type="date" id="cert-date" class="w-full p-2 border rounded" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Certificate Image (optional)</label>
                            <input type="file" id="cert-image" class="w-full p-2 border rounded" accept="image/*">
                        </div>
                    </form>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeAddCertificationModal()" 
                                class="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                        <button onclick="saveCertification()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add Certification</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeAddCertificationModal = function() {
    const modal = document.getElementById('add-certification-modal');
    if (modal) {
        modal.remove();
    }
};

window.saveCertification = async function() {
    try {
        const formData = new FormData();
        formData.append('institution', document.getElementById('cert-institution').value);
        formData.append('title', document.getElementById('cert-title').value);
        formData.append('field', document.getElementById('cert-field').value);
        formData.append('type', document.getElementById('cert-type').value);
        formData.append('date', document.getElementById('cert-date').value);
        
        const imageFile = document.getElementById('cert-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/certifications', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            showNotification('Certification added successfully!', 'success');
            closeAddCertificationModal();
            await loadCertifications(); // Reload certifications
        } else {
            throw new Error('Failed to add certification');
        }
    } catch (error) {
        console.error('Error adding certification:', error);
        showNotification('Failed to add certification', 'error');
    }
};

// 3. ADD EXPERIENCE MODAL
window.openAddExperienceModal = function() {
    const modal = document.getElementById('add-experience-modal');
    if (modal) {
        modal.classList.remove('hidden');
        return;
    }

    const modalHTML = `
        <div id="add-experience-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">Add Experience</h2>
                        <button onclick="closeAddExperienceModal()" class="text-gray-500 hover:text-gray-700 text-3xl">&times;</button>
                    </div>
                    
                    <form id="addExperienceForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Job Title</label>
                            <input type="text" id="exp-title" class="w-full p-2 border rounded" 
                                   placeholder="Senior Mathematics Teacher" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Organization</label>
                            <input type="text" id="exp-organization" class="w-full p-2 border rounded" 
                                   placeholder="ABC International School" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Start Date</label>
                            <input type="date" id="exp-start-date" class="w-full p-2 border rounded" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">End Date</label>
                            <input type="date" id="exp-end-date" class="w-full p-2 border rounded">
                            <label class="flex items-center mt-2">
                                <input type="checkbox" id="exp-current" class="mr-2" onchange="toggleEndDate()">
                                <span class="text-sm">Currently working here</span>
                            </label>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Description</label>
                            <textarea id="exp-description" rows="3" class="w-full p-2 border rounded" 
                                      placeholder="Describe your responsibilities and achievements..."></textarea>
                        </div>
                    </form>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeAddExperienceModal()" 
                                class="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                        <button onclick="saveExperience()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add Experience</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeAddExperienceModal = function() {
    const modal = document.getElementById('add-experience-modal');
    if (modal) {
        modal.remove();
    }
};

window.toggleEndDate = function() {
    const checkbox = document.getElementById('exp-current');
    const endDateInput = document.getElementById('exp-end-date');
    if (checkbox.checked) {
        endDateInput.disabled = true;
        endDateInput.value = '';
    } else {
        endDateInput.disabled = false;
    }
};

window.saveExperience = async function() {
    try {
        const experienceData = {
            title: document.getElementById('exp-title').value,
            organization: document.getElementById('exp-organization').value,
            start_date: document.getElementById('exp-start-date').value,
            end_date: document.getElementById('exp-current').checked ? null : document.getElementById('exp-end-date').value,
            is_current: document.getElementById('exp-current').checked,
            description: document.getElementById('exp-description').value
        };

        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/experiences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(experienceData)
        });

        if (response.ok) {
            showNotification('Experience added successfully!', 'success');
            closeAddExperienceModal();
            await loadExperiences(); // Reload experiences
        } else {
            throw new Error('Failed to add experience');
        }
    } catch (error) {
        console.error('Error adding experience:', error);
        showNotification('Failed to add experience', 'error');
    }
};

// 4. ADD ACHIEVEMENT MODAL
window.openAddAchievementModal = function() {
    const modal = document.getElementById('add-achievement-modal');
    if (modal) {
        modal.classList.remove('hidden');
        return;
    }

    const modalHTML = `
        <div id="add-achievement-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-bold">Add Achievement</h2>
                        <button onclick="closeAddAchievementModal()" class="text-gray-500 hover:text-gray-700 text-3xl">&times;</button>
                    </div>
                    
                    <form id="addAchievementForm" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium mb-1">Achievement Title</label>
                            <input type="text" id="ach-title" class="w-full p-2 border rounded" 
                                   placeholder="Teacher of the Year" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Organization/Issuer</label>
                            <input type="text" id="ach-issuer" class="w-full p-2 border rounded" 
                                   placeholder="Ministry of Education" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Date Achieved</label>
                            <input type="date" id="ach-date" class="w-full p-2 border rounded" required>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Description</label>
                            <textarea id="ach-description" rows="3" class="w-full p-2 border rounded" 
                                      placeholder="Describe this achievement..."></textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Certificate/Badge (optional)</label>
                            <input type="file" id="ach-image" class="w-full p-2 border rounded" accept="image/*">
                        </div>
                    </form>
                    
                    <div class="flex justify-end gap-3 mt-6">
                        <button onclick="closeAddAchievementModal()" 
                                class="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                        <button onclick="saveAchievement()" 
                                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Add Achievement</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

window.closeAddAchievementModal = function() {
    const modal = document.getElementById('add-achievement-modal');
    if (modal) {
        modal.remove();
    }
};

window.saveAchievement = async function() {
    try {
        const formData = new FormData();
        formData.append('title', document.getElementById('ach-title').value);
        formData.append('issuer', document.getElementById('ach-issuer').value);
        formData.append('date', document.getElementById('ach-date').value);
        formData.append('description', document.getElementById('ach-description').value);
        
        const imageFile = document.getElementById('ach-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }

        const token = localStorage.getItem('access_token');
        const response = await fetch('http://localhost:8000/api/tutor/achievements', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            showNotification('Achievement added successfully!', 'success');
            closeAddAchievementModal();
            await loadAchievements(); // Reload achievements
        } else {
            throw new Error('Failed to add achievement');
        }
    } catch (error) {
        console.error('Error adding achievement:', error);
        showNotification('Failed to add achievement', 'error');
    }
};

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadCertifications() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/tutor/certifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const certifications = await response.json();
            tutorProfileState.certifications = certifications;
            displayCertifications(certifications);
        }
    } catch (error) {
        console.error('Error loading certifications:', error);
    }
}

async function loadExperiences() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/tutor/experiences`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const experiences = await response.json();
            tutorProfileState.experiences = experiences;
            displayExperiences(experiences);
        }
    } catch (error) {
        console.error('Error loading experiences:', error);
    }
}

async function loadAchievements() {
    try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(`http://localhost:8000/api/tutor/achievements`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const achievements = await response.json();
            tutorProfileState.achievements = achievements;
            displayAchievements(achievements);
        }
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayCertifications(certifications) {
    const container = document.getElementById('certifications-container');
    if (!container) return;

    if (certifications.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No certifications added yet.</p>';
        return;
    }

    container.innerHTML = certifications.map(cert => `
        <div class="certification-item border rounded p-4 mb-3">
            <div class="flex justify-between">
                <div>
                    <h4 class="font-bold">${cert.title} - ${cert.type}</h4>
                    <p class="text-gray-600">${cert.institution}</p>
                    <p class="text-sm text-gray-500">${cert.field} • ${new Date(cert.date).getFullYear()}</p>
                </div>
                ${tutorProfileState.isOwnProfile ? `
                    <div class="flex gap-2">
                        <button onclick="editCertification(${cert.id})" class="text-blue-500 hover:text-blue-700">Edit</button>
                        <button onclick="deleteCertification(${cert.id})" class="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function displayExperiences(experiences) {
    const container = document.getElementById('experiences-container');
    if (!container) return;

    if (experiences.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No experiences added yet.</p>';
        return;
    }

    container.innerHTML = experiences.map(exp => `
        <div class="experience-item border rounded p-4 mb-3">
            <div class="flex justify-between">
                <div>
                    <h4 class="font-bold">${exp.title}</h4>
                    <p class="text-gray-600">${exp.organization}</p>
                    <p class="text-sm text-gray-500">
                        ${new Date(exp.start_date).getFullYear()} - 
                        ${exp.is_current ? 'Present' : new Date(exp.end_date).getFullYear()}
                    </p>
                    ${exp.description ? `<p class="mt-2">${exp.description}</p>` : ''}
                </div>
                ${tutorProfileState.isOwnProfile ? `
                    <div class="flex gap-2">
                        <button onclick="editExperience(${exp.id})" class="text-blue-500 hover:text-blue-700">Edit</button>
                        <button onclick="deleteExperience(${exp.id})" class="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function displayAchievements(achievements) {
    const container = document.getElementById('achievements-container');
    if (!container) return;

    if (achievements.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No achievements added yet.</p>';
        return;
    }

    container.innerHTML = achievements.map(ach => `
        <div class="achievement-item border rounded p-4 mb-3">
            <div class="flex justify-between">
                <div>
                    <h4 class="font-bold">${ach.title}</h4>
                    <p class="text-gray-600">${ach.issuer}</p>
                    <p class="text-sm text-gray-500">${new Date(ach.date).getFullYear()}</p>
                    ${ach.description ? `<p class="mt-2">${ach.description}</p>` : ''}
                </div>
                ${tutorProfileState.isOwnProfile ? `
                    <div class="flex gap-2">
                        <button onclick="editAchievement(${ach.id})" class="text-blue-500 hover:text-blue-700">Edit</button>
                        <button onclick="deleteAchievement(${ach.id})" class="text-red-500 hover:text-red-700">Delete</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Load profile on page load
    loadTutorProfile();
    
    // Load additional data if own profile
    const currentUserId = localStorage.getItem('user_id');
    const tutorId = getTutorId();
    
    if (currentUserId === tutorId) {
        loadCertifications();
        loadExperiences();
        loadAchievements();
    }
    
    // Add event listeners to existing buttons
    const editProfileBtn = document.querySelector('[onclick="openEditProfileModal()"]');
    if (editProfileBtn && !window.openEditProfileModal) {
        console.error('Edit profile button found but function not defined');
    }
});