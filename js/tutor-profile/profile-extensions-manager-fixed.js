/**
 * Tutor Profile Extensions Manager - FIXED VERSION
 * Handles Certifications, Achievements, and Experience management
 */

// Ensure API_BASE_URL is defined (fallback if not)
if (typeof API_BASE_URL === 'undefined' && !window.API_BASE_URL) {
    console.warn('⚠️ API_BASE_URL not defined, using default');
    window.API_BASE_URL = 'http://localhost:8000';
}

console.log('🔧 [FIXED] Starting profile extensions manager...');
console.log('🔧 API_BASE_URL:', API_BASE_URL);

// ============================================
// MODAL OPEN/CLOSE FUNCTIONS (DEFINED FIRST)
// ============================================

function openUploadCertificationModal() {
    console.log('🔧 openUploadCertificationModal called');
    const modal = document.getElementById('upload-certification-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const form = document.getElementById('certification-form');
        if (form) form.reset();
        console.log('✅ Certification modal opened');
    } else {
        console.error('❌ Modal #upload-certification-modal not found!');
    }
}

function closeUploadCertificationModal() {
    const modal = document.getElementById('upload-certification-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openAddAchievementModal() {
    console.log('🔧 openAddAchievementModal called');
    const modal = document.getElementById('add-achievement-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const form = document.getElementById('achievement-form');
        if (form) form.reset();
        console.log('✅ Achievement modal opened');
    } else {
        console.error('❌ Modal #add-achievement-modal not found!');
    }
}

function closeAddAchievementModal() {
    const modal = document.getElementById('add-achievement-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function openAddExperienceModal() {
    console.log('🔧 openAddExperienceModal called');
    const modal = document.getElementById('add-experience-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const form = document.getElementById('experience-form');
        if (form) form.reset();
        console.log('✅ Experience modal opened');
    } else {
        console.error('❌ Modal #add-experience-modal not found!');
    }
}

function closeAddExperienceModal() {
    const modal = document.getElementById('add-experience-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function toggleEndDate(checkbox) {
    const endDateInput = document.getElementById('exp-end-date');
    if (endDateInput) {
        endDateInput.disabled = checkbox.checked;
        if (checkbox.checked) {
            endDateInput.value = '';
        }
    }
}

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE IMMEDIATELY
// ============================================

console.log('🔧 Registering modal functions to window object...');

window.openUploadCertificationModal = openUploadCertificationModal;
window.closeUploadCertificationModal = closeUploadCertificationModal;

window.openAddAchievementModal = openAddAchievementModal;
window.closeAddAchievementModal = closeAddAchievementModal;

window.openAddExperienceModal = openAddExperienceModal;
window.closeAddExperienceModal = closeAddExperienceModal;
window.toggleEndDate = toggleEndDate;

console.log('✅ Modal functions registered:', {
    openUploadCertificationModal: typeof window.openUploadCertificationModal,
    openAddAchievementModal: typeof window.openAddAchievementModal,
    openAddExperienceModal: typeof window.openAddExperienceModal
});

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadCertifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token found, skipping certifications load');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/tutor/certifications`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load certifications');
        }

        const data = await response.json();
        renderCertifications(data.certifications);
    } catch (error) {
        console.error('Error loading certifications:', error);
    }
}

function renderCertifications(certifications) {
    const grid = document.getElementById('certifications-grid');
    if (!grid) return;

    if (certifications.length === 0) {
        grid.innerHTML = `
            <div class="text-center text-gray-500 py-12 col-span-full">
                <p class="text-lg">Your certifications will appear here.</p>
                <p class="text-sm mt-2">Click "Upload Certification" to add your first credential.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = certifications.map(cert => `
        <div class="card p-6">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-bold mb-2">${cert.name}</h3>
                    <p class="text-gray-600 mb-1">${cert.issuing_organization}</p>
                    ${cert.field_of_study ? `<p class="text-sm text-gray-500">${cert.field_of_study}</p>` : ''}
                </div>
                ${cert.is_verified ? '<span class="text-green-500 text-2xl">✓</span>' : ''}
            </div>

            ${cert.certificate_image_url ? `
                <div class="mb-4">
                    <img src="${cert.certificate_image_url}" alt="${cert.name}"
                        class="w-full rounded-lg border-2">
                </div>
            ` : ''}

            <div class="text-sm text-gray-600 space-y-1">
                ${cert.issue_date ? `
                    <p>📅 Issued: ${new Date(cert.issue_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short'
                    })}</p>
                ` : ''}
                ${cert.expiry_date ? `
                    <p>⏰ Expires: ${new Date(cert.expiry_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short'
                    })}</p>
                ` : ''}
                ${cert.credential_id ? `<p>🔑 ID: ${cert.credential_id}</p>` : ''}
            </div>

            ${cert.description ? `
                <p class="text-gray-700 mt-3">${cert.description}</p>
            ` : ''}

            <div class="flex gap-2 mt-4">
                ${cert.credential_url ? `
                    <a href="${cert.credential_url}" target="_blank"
                        class="btn-secondary text-sm flex-1">Verify</a>
                ` : ''}
                <button onclick="deleteCertification(${cert.id})"
                    class="btn-secondary text-sm text-red-600">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteCertification(certId) {
    if (!confirm('Are you sure you want to delete this certification?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/certifications/${certId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete certification');
        }

        alert('Certification deleted successfully!');
        loadCertifications();
    } catch (error) {
        console.error('Error deleting certification:', error);
        alert('Failed to delete certification. Please try again.');
    }
}

// Similar functions for achievements and experience...
async function loadAchievements() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token found, skipping achievements load');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/tutor/achievements`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load achievements');
        }

        const data = await response.json();
        renderAchievements(data.achievements);
    } catch (error) {
        console.error('Error loading achievements:', error);
    }
}

function renderAchievements(achievements) {
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;

    if (achievements.length === 0) {
        grid.innerHTML = `
            <div class="text-center text-gray-500 py-12 col-span-full">
                <p class="text-lg">Your achievements will appear here.</p>
                <p class="text-sm mt-2">Click "Add Achievement" to showcase your accomplishments.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = achievements.map(ach => `
        <div class="card p-6 text-center" style="border-color: ${ach.color || 'gold'}; border-width: 2px;">
            <div class="text-6xl mb-3">${ach.icon || '🏆'}</div>
            ${ach.is_featured ? '<div class="text-yellow-500 text-sm font-bold mb-2">⭐ FEATURED</div>' : ''}
            <h3 class="text-lg font-bold mb-2">${ach.title}</h3>
            <p class="text-sm text-gray-600 mb-2">${ach.category || 'achievement'}</p>
            ${ach.year ? `<p class="text-sm font-semibold">${ach.year}</p>` : ''}
            ${ach.issuer ? `<p class="text-sm text-gray-600 mt-2">${ach.issuer}</p>` : ''}
            ${ach.description ? `<p class="text-sm text-gray-700 mt-3">${ach.description}</p>` : ''}
            <div class="flex gap-2 mt-4">
                ${ach.verification_url ? `
                    <a href="${ach.verification_url}" target="_blank"
                        class="btn-secondary text-sm flex-1">Verify</a>
                ` : ''}
                <button onclick="deleteAchievement(${ach.id})"
                    class="btn-secondary text-sm text-red-600">Delete</button>
            </div>
        </div>
    `).join('');
}

async function deleteAchievement(achId) {
    if (!confirm('Are you sure you want to delete this achievement?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/achievements/${achId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete achievement');
        }

        alert('Achievement deleted successfully!');
        loadAchievements();
    } catch (error) {
        console.error('Error deleting achievement:', error);
        alert('Failed to delete achievement. Please try again.');
    }
}

async function loadExperience() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.warn('No token found, skipping experience load');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/tutor/experience`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load experience');
        }

        const data = await response.json();
        renderExperience(data.experience);
    } catch (error) {
        console.error('Error loading experience:', error);
    }
}

function renderExperience(experiences) {
    const grid = document.getElementById('experience-timeline');
    if (!grid) return;

    if (experiences.length === 0) {
        grid.innerHTML = `
            <div class="text-center text-gray-500 py-12 col-span-full">
                <p class="text-lg">Your work experience will appear here.</p>
                <p class="text-sm mt-2">Click "Add Experience" to add your employment history.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = experiences.map(exp => {
        const startDate = exp.start_date ? new Date(exp.start_date) : null;
        const endDate = exp.end_date ? new Date(exp.end_date) : null;

        return `
        <div class="card p-6 border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-shadow" onclick="viewExperienceDetails(${exp.id})">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h3 class="text-xl font-bold">${exp.job_title}</h3>
                    <p class="text-lg text-gray-700">${exp.institution}</p>
                    ${exp.location ? `<p class="text-sm text-gray-600">${exp.location}</p>` : ''}
                </div>
                ${exp.is_current ? `
                    <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                        Current
                    </span>
                ` : ''}
            </div>

            <div class="text-sm text-gray-600 mb-3">
                <p>📅 ${startDate ? startDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short'
                }) : 'N/A'} - ${exp.is_current ? 'Present' : (endDate ? endDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short'
                }) : 'N/A')}</p>
                ${exp.employment_type ? `<p>💼 ${exp.employment_type}</p>` : ''}
            </div>

            ${exp.description ? `
                <p class="text-gray-700 mb-3 line-clamp-3">${exp.description}</p>
            ` : ''}

            <div class="flex gap-2 mt-4">
                <button onclick="event.stopPropagation(); viewExperienceDetails(${exp.id})"
                    class="btn-secondary text-sm flex-1">View Details</button>
                <button onclick="event.stopPropagation(); deleteExperience(${exp.id})"
                    class="btn-secondary text-sm text-red-600">Delete</button>
            </div>
        </div>
    `}).join('');
}

async function deleteExperience(expId) {
    if (!confirm('Are you sure you want to delete this experience?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/experience/${expId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete experience');
        }

        alert('Experience deleted successfully!');
        loadExperience();
    } catch (error) {
        console.error('Error deleting experience:', error);
        alert('Failed to delete experience. Please try again.');
    }
}

// Expose delete functions
window.deleteCertification = deleteCertification;
window.deleteAchievement = deleteAchievement;
window.deleteExperience = deleteExperience;

// ============================================
// FORM SUBMISSION HANDLERS
// ============================================

// Wait for DOM to be ready before attaching form listeners
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFormHandlers);
} else {
    setupFormHandlers();
}

function setupFormHandlers() {
    console.log('🔧 Setting up form handlers...');

    // Certification form
    const certForm = document.getElementById('certification-form');
    if (certForm) {
        certForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(certForm);
            const token = localStorage.getItem('token');

            try {
                const response = await fetch(`${API_BASE_URL}/api/tutor/certifications`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to upload certification');
                }

                alert('Certification uploaded successfully!');
                closeUploadCertificationModal();
                loadCertifications();
            } catch (error) {
                console.error('Error uploading certification:', error);
                alert('Failed to upload certification. Please try again.');
            }
        });
        console.log('✅ Certification form handler attached');
    }

    // Achievement form
    const achForm = document.getElementById('achievement-form');
    if (achForm) {
        achForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(achForm);
            const token = localStorage.getItem('token');

            try {
                const response = await fetch(`${API_BASE_URL}/api/tutor/achievements`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to add achievement');
                }

                alert('Achievement added successfully!');
                closeAddAchievementModal();
                loadAchievements();
            } catch (error) {
                console.error('Error adding achievement:', error);
                alert('Failed to add achievement. Please try again.');
            }
        });
        console.log('✅ Achievement form handler attached');
    }

    // Experience form
    const expForm = document.getElementById('experience-form');
    if (expForm) {
        expForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(expForm);
            const token = localStorage.getItem('token');

            try {
                const response = await fetch(`${API_BASE_URL}/api/tutor/experience`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to add experience');
                }

                alert('Experience added successfully!');
                closeAddExperienceModal();
                loadExperience();
            } catch (error) {
                console.error('Error adding experience:', error);
                alert('Failed to add experience. Please try again.');
            }
        });
        console.log('✅ Experience form handler attached');
    }
}

// ============================================
// PANEL SWITCHING INTEGRATION
// ============================================

const originalSwitchPanel = window.switchPanel;
window.switchPanel = function(panelName) {
    if (originalSwitchPanel) {
        originalSwitchPanel(panelName);
    }

    // Load data when switching to specific panels
    if (panelName === 'certifications') {
        loadCertifications();
    } else if (panelName === 'achievements') {
        loadAchievements();
    } else if (panelName === 'experience') {
        loadExperience();
    }
};

console.log('✅ Profile Extensions Manager FIXED version loaded successfully!');
