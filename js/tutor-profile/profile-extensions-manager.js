/**
 * Tutor Profile Extensions Manager
 * Handles Certifications, Achievements, and Experience management
 */

// API_BASE_URL is already defined globally in package-manager-clean.js

// ============================================
// CERTIFICATIONS MANAGEMENT
// ============================================

async function loadCertifications() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
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
                ${getStatusBadge(cert.verification_status)}
            </div>

            ${cert.certificate_image_url ? `
                <div class="mb-4">
                    <img src="${cert.certificate_image_url}" alt="${cert.name}"
                        class="w-full h-48 object-cover rounded-lg border-2">
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
                <p class="text-gray-700 mt-3 line-clamp-2">${cert.description}</p>
            ` : ''}

            <div class="flex gap-2 mt-4">
                <button onclick="viewCertification(${cert.id})"
                    class="btn-primary text-sm flex-1">View</button>
            </div>
        </div>
    `).join('');
}

function openUploadCertificationModal() {
    const modal = document.getElementById('certificationModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('certificationForm')?.reset();
    }
}

function closeUploadCertificationModal() {
    const modal = document.getElementById('certificationModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Global variable to store pending certification form data
let pendingCertificationFormData = null;

// Handle certification form submission - Show verification fee modal first
document.addEventListener('DOMContentLoaded', () => {
    const certForm = document.getElementById('certificationForm');
    if (certForm) {
        certForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(certForm);

            // Store form data globally for later submission
            pendingCertificationFormData = formData;

            // Close certification modal and show verification fee modal
            closeUploadCertificationModal();
            openVerificationFeeModal('certification');
        });
    }
});

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

// ============================================
// ACHIEVEMENTS MANAGEMENT
// ============================================

async function loadAchievements() {
    console.log('🔄 Loading achievements...');
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No token found');
            return;
        }

        const response = await fetch(`${API_BASE_URL}/api/tutor/achievements`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('❌ Failed to load achievements, status:', response.status);
            throw new Error('Failed to load achievements');
        }

        const data = await response.json();
        console.log('✅ Loaded achievements:', data.achievements.length, 'items');
        renderAchievements(data.achievements);
    } catch (error) {
        console.error('❌ Error loading achievements:', error);
    }
}

function getStatusBadge(verificationStatus) {
    const statusColors = {
        'pending': 'bg-yellow-100 text-yellow-700',
        'verified': 'bg-green-100 text-green-700',
        'rejected': 'bg-red-100 text-red-700'
    };
    const statusText = {
        'pending': '⏳ Pending',
        'verified': '✓ Verified',
        'rejected': '✗ Rejected'
    };
    const colorClass = statusColors[verificationStatus] || statusColors['pending'];
    const text = statusText[verificationStatus] || statusText['pending'];
    return `<span class="${colorClass} px-3 py-1 rounded-full text-xs font-semibold">${text}</span>`;
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
            <div class="flex justify-between items-start mb-2">
                ${ach.is_featured ? '<div class="text-yellow-500 text-sm font-bold">⭐ FEATURED</div>' : '<div></div>'}
                ${getStatusBadge(ach.verification_status)}
            </div>
            <div class="text-6xl mb-3">${ach.icon || '🏆'}</div>
            <h3 class="text-lg font-bold mb-2">${ach.title}</h3>
            <p class="text-sm text-gray-600 mb-2">${ach.category || 'achievement'}</p>
            ${ach.year ? `<p class="text-sm font-semibold">${ach.year}</p>` : ''}
            ${ach.issuer ? `<p class="text-sm text-gray-600 mt-2">${ach.issuer}</p>` : ''}
            ${ach.description ? `<p class="text-sm text-gray-700 mt-3 line-clamp-3">${ach.description}</p>` : ''}
            <div class="flex gap-2 mt-4">
                <button onclick="viewAchievement(${ach.id})"
                    class="btn-primary text-sm flex-1">View</button>
            </div>
        </div>
    `).join('');
}

function openAddAchievementModal() {
    const modal = document.getElementById('achievementModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('achievementForm')?.reset();
    }
}

function closeAddAchievementModal() {
    const modal = document.getElementById('achievementModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Global variable to store pending form data
let pendingAchievementFormData = null;

// Handle achievement form submission - Show verification fee modal first
document.addEventListener('DOMContentLoaded', () => {
    const achForm = document.getElementById('achievementForm');
    if (achForm) {
        achForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate certificate file
            const certificateFile = document.getElementById('ach-certificate');
            if (certificateFile && certificateFile.files.length > 0) {
                const file = certificateFile.files[0];
                const maxSize = 5 * 1024 * 1024; // 5MB
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

                if (!allowedTypes.includes(file.type)) {
                    alert('Invalid file type. Please upload JPG, PNG, or PDF only.');
                    return;
                }

                if (file.size > maxSize) {
                    alert(`File is too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
                    return;
                }
            } else {
                alert('Please upload a certificate file.');
                return;
            }

            const formData = new FormData(achForm);

            // Fix: Remove empty string values that should be null (FastAPI int validation issue)
            const year = formData.get('year');
            if (year === '' || year === null) {
                formData.delete('year');
            }

            // Store form data globally for later submission
            pendingAchievementFormData = formData;

            // Close achievement modal and show verification fee modal
            closeAddAchievementModal();
            openVerificationFeeModal('achievement');
        });
    }
});

// Modal functions for verification workflow
function openVerificationFeeModal(itemType) {
    console.log('🔔 [profile-extensions] openVerificationFeeModal() called with type:', itemType);
    const modal = document.getElementById('verificationFeeModal');
    console.log('🔍 [profile-extensions] Found modal:', modal ? 'YES ✅' : 'NO ❌');

    if (modal) {
        console.log('📊 [profile-extensions] Current state:', {
            display: modal.style.display,
            hasHidden: modal.classList.contains('hidden'),
            hasShow: modal.classList.contains('show')
        });

        // Store the item type for later use
        modal.dataset.itemType = itemType;

        // Remove hidden class and add show class
        modal.classList.remove('hidden');
        modal.classList.add('show');

        // CRITICAL: Set display to flex
        modal.style.display = 'flex';

        document.body.style.overflow = 'hidden';

        console.log('📊 [profile-extensions] New state:', {
            display: modal.style.display,
            hasHidden: modal.classList.contains('hidden'),
            hasShow: modal.classList.contains('show')
        });

        console.log('✅ [profile-extensions] Verification fee modal should now be visible');
    } else {
        console.error('❌ [profile-extensions] verificationFeeModal element not found!');
    }
}

function closeVerificationFeeModal() {
    const modal = document.getElementById('verificationFeeModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        modal.style.display = 'none'; // CRITICAL: Set display to none
        document.body.style.overflow = '';
        // Reset pending form data
        pendingAchievementFormData = null;
        pendingCertificationFormData = null;
        pendingExperienceFormData = null;
        // Also clear window.pendingVerificationData
        window.pendingVerificationData = null;
    }
}

function openVerificationModal(itemType) {
    console.log('🎉 openVerificationModal called with itemType:', itemType);
    const modal = document.getElementById('verificationModal');
    const itemTypeSpan = document.getElementById('verificationItemType');

    console.log('🔍 Modal element found:', !!modal);
    console.log('🔍 ItemType span found:', !!itemTypeSpan);

    if (modal && itemTypeSpan) {
        itemTypeSpan.textContent = itemType;
        modal.classList.remove('hidden');
        modal.classList.add('show');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('✅ Verification modal should now be visible!');
    } else {
        console.error('❌ Could not open verification modal - elements not found');
    }
}

function closeVerificationModal() {
    console.log('🚪 Closing verification modal...');
    const modal = document.getElementById('verificationModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        console.log('✅ Verification modal closed');
    }
}

// Confirm and Pay - Actually submit the form
async function confirmAndPayVerificationFee() {
    const modal = document.getElementById('verificationFeeModal');
    const token = localStorage.getItem('token');

    // Determine which form data to submit
    let formData = null;
    let endpoint = '';
    let reloadFunction = null;
    let itemType = '';

    // PRIORITY 1: Check for window.pendingVerificationData (from global-functions.js)
    if (window.pendingVerificationData) {
        console.log('✅ Found window.pendingVerificationData:', window.pendingVerificationData);
        itemType = window.pendingVerificationData.type;
        formData = window.pendingVerificationData.formData;

        switch(itemType) {
            case 'achievement':
                endpoint = `${API_BASE_URL}/api/tutor/achievements`;
                reloadFunction = loadAchievements;
                break;
            case 'certification':
                endpoint = `${API_BASE_URL}/api/tutor/certifications`;
                reloadFunction = loadCertifications;
                break;
            case 'experience':
                endpoint = `${API_BASE_URL}/api/tutor/experience`;
                reloadFunction = loadExperience;
                break;
        }
    }
    // PRIORITY 2: Fall back to old method (modal dataset + individual variables)
    else {
        console.log('⚠️ No window.pendingVerificationData, checking old variables...');
        itemType = modal?.dataset.itemType || 'achievement';

        if (itemType === 'achievement' && pendingAchievementFormData) {
            formData = pendingAchievementFormData;
            endpoint = `${API_BASE_URL}/api/tutor/achievements`;
            reloadFunction = loadAchievements;
        } else if (itemType === 'certification' && pendingCertificationFormData) {
            formData = pendingCertificationFormData;
            endpoint = `${API_BASE_URL}/api/tutor/certifications`;
            reloadFunction = loadCertifications;
        } else if (itemType === 'experience' && pendingExperienceFormData) {
            formData = pendingExperienceFormData;
            endpoint = `${API_BASE_URL}/api/tutor/experience`;
            reloadFunction = loadExperience;
        }
    }

    if (!formData) {
        console.error('❌ No pending submission found in either method');
        alert('No pending submission found. Please try submitting the form again.');
        closeVerificationFeeModal();
        return;
    }

    console.log(`📤 Submitting ${itemType} to ${endpoint}`);

    // Debug: Log FormData contents
    console.log('📋 FormData contents:');
    for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
            console.log(`  - ${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
        } else {
            console.log(`  - ${key}: ${value}`);
        }
    }

    // Show loading state
    const confirmBtn = document.querySelector('#verificationFeeModal button[onclick*="confirmAndPay"]');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Processing Payment...';
        confirmBtn.style.opacity = '0.7';
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.error('⏱️ Upload timeout after 90 seconds');
            controller.abort();
        }, 90000); // 90 second timeout (increased from 60)

        console.log(`⏳ Uploading ${itemType} with verification fee paid...`);
        console.log(`📡 Endpoint: ${endpoint}`);
        console.log(`🔑 Token exists: ${!!token}`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData,
            signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`✅ Response received! Status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`❌ ${itemType} upload error:`, {
                status: response.status,
                statusText: response.statusText,
                errorData: errorData
            });

            // Better error message for 422 validation errors
            if (response.status === 422) {
                console.error('🔍 Validation Error Details:', errorData);
                const detailMsg = errorData.detail || 'Validation failed';
                throw new Error(`Validation Error: ${JSON.stringify(detailMsg, null, 2)}`);
            }

            throw new Error(errorData.detail || `Failed to add ${itemType} (${response.status})`);
        }

        console.log('📥 Parsing response JSON...');
        const result = await response.json();
        console.log(`✅ ${itemType} added successfully:`, result);

        // Reset button state on success (before closing modal)
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm & Pay 50 ETB';
            confirmBtn.style.opacity = '1';
        }

        // Close fee modal
        console.log('🚪 Closing verification fee modal...');
        closeVerificationFeeModal();

        // Show verification success modal
        console.log('🎉 Opening verification success modal...');
        openVerificationModal(itemType);

        // Reload list
        console.log('🔄 Reloading list...');
        if (reloadFunction) {
            await reloadFunction();
        }
        console.log('✅ All done!');

        // Reset pending form data (both methods)
        window.pendingVerificationData = null;
        pendingAchievementFormData = null;
        pendingCertificationFormData = null;
        pendingExperienceFormData = null;

    } catch (error) {
        console.error(`Error adding ${itemType}:`, error);

        // Reset button state on error
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm & Pay 50 ETB';
            confirmBtn.style.opacity = '1';
        }

        if (error.name === 'AbortError') {
            alert('Upload timed out. Please try again with a smaller file or check your connection.');
        } else {
            alert(error.message || `Failed to add ${itemType}. Please try again.`);
        }
    }
}

// Register global functions for HTML onclick handlers
window.openVerificationFeeModal = openVerificationFeeModal;
window.closeVerificationFeeModal = closeVerificationFeeModal;
window.openVerificationModal = openVerificationModal;
window.closeVerificationModal = closeVerificationModal;
window.confirmAndPayVerificationFee = confirmAndPayVerificationFee;

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

// ============================================
// EXPERIENCE MANAGEMENT
// ============================================

async function loadExperience() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found');
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
    const timeline = document.getElementById('experience-timeline');
    if (!timeline) return;

    if (experiences.length === 0) {
        timeline.innerHTML = `
            <div class="text-center text-gray-500 py-12">
                <p class="text-lg">Your work experience will appear here.</p>
                <p class="text-sm mt-2">Click "Add Experience" to add your employment history.</p>
            </div>
        `;
        return;
    }

    timeline.innerHTML = experiences.map(exp => {
        const startDate = exp.start_date ? new Date(exp.start_date) : null;
        const endDate = exp.end_date ? new Date(exp.end_date) : null;

        return `
        <div class="card p-6 border-l-4 border-blue-500">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <h3 class="text-xl font-bold">${exp.job_title}</h3>
                    <p class="text-lg text-gray-700">${exp.institution}</p>
                    ${exp.location ? `<p class="text-sm text-gray-600">${exp.location}</p>` : ''}
                </div>
                <div class="flex gap-2 items-center">
                    ${exp.is_current ? `
                        <span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                            Current
                        </span>
                    ` : ''}
                    ${getStatusBadge(exp.verification_status)}
                </div>
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
                <p class="text-gray-700 mb-3 line-clamp-2">${exp.description}</p>
            ` : ''}

            ${exp.responsibilities ? `
                <div class="mb-3">
                    <h4 class="font-semibold text-gray-700 mb-2">Key Responsibilities:</h4>
                    <p class="text-gray-600 text-sm whitespace-pre-line line-clamp-2">${exp.responsibilities}</p>
                </div>
            ` : ''}

            ${exp.achievements ? `
                <div class="mb-3">
                    <h4 class="font-semibold text-gray-700 mb-2">Achievements:</h4>
                    <p class="text-gray-600 text-sm whitespace-pre-line line-clamp-2">${exp.achievements}</p>
                </div>
            ` : ''}

            <button onclick="viewExperience(${exp.id})"
                class="btn-primary text-sm mt-2 w-full">View</button>
        </div>
    `}).join('');
}

function openAddExperienceModal() {
    const modal = document.getElementById('experienceModal');
    if (modal) {
        modal.classList.remove('hidden');
        document.getElementById('experienceForm')?.reset();
    }
}

function closeAddExperienceModal() {
    const modal = document.getElementById('experienceModal');
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

// Global variable to store pending experience form data
let pendingExperienceFormData = null;

// Handle experience form submission - Show verification fee modal first
document.addEventListener('DOMContentLoaded', () => {
    const expForm = document.getElementById('experienceForm');
    if (expForm) {
        expForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Validate certificate file
            const certificateFile = document.getElementById('exp-certificate');
            if (certificateFile && certificateFile.files.length > 0) {
                const file = certificateFile.files[0];
                const maxSize = 5 * 1024 * 1024; // 5MB
                const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

                if (!allowedTypes.includes(file.type)) {
                    alert('Invalid file type. Please upload JPG, PNG, or PDF only.');
                    return;
                }

                if (file.size > maxSize) {
                    alert(`File is too large. Maximum size is 5MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
                    return;
                }
            } else {
                alert('Please upload a certificate or letter of employment.');
                return;
            }

            const formData = new FormData(expForm);

            // Store form data globally for later submission
            pendingExperienceFormData = formData;

            // Close experience modal and show verification fee modal
            closeAddExperienceModal();
            openVerificationFeeModal('experience');
        });
    }
});

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

// ============================================
// PANEL SWITCHING INTEGRATION
// ============================================

// Hook into panel switching to load data when panels are shown
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

// ============================================
// INITIALIZATION
// ============================================

// Load data on page load if on the respective panels
document.addEventListener('DOMContentLoaded', () => {
    // Check which panel is active and load data
    const activePanelParam = new URLSearchParams(window.location.search).get('panel');

    if (activePanelParam === 'certifications') {
        loadCertifications();
    } else if (activePanelParam === 'achievements') {
        loadAchievements();
    } else if (activePanelParam === 'experience') {
        loadExperience();
    }
});

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE (for onclick handlers)
// ============================================

console.log('🔧 Registering profile extensions modal functions...');

// Make functions globally available for HTML onclick attributes
window.openUploadCertificationModal = openUploadCertificationModal;
window.closeUploadCertificationModal = closeUploadCertificationModal;
window.deleteCertification = deleteCertification;

window.openAddAchievementModal = openAddAchievementModal;
window.closeAddAchievementModal = closeAddAchievementModal;
window.deleteAchievement = deleteAchievement;

window.openAddExperienceModal = openAddExperienceModal;
window.closeAddExperienceModal = closeAddExperienceModal;
window.toggleEndDate = toggleEndDate;
window.deleteExperience = deleteExperience;

console.log('✅ Profile extensions modal functions registered:', {
    openUploadCertificationModal: typeof window.openUploadCertificationModal,
    openAddAchievementModal: typeof window.openAddAchievementModal,
    openAddExperienceModal: typeof window.openAddExperienceModal
});

// ============================================
// VIEW MODAL FUNCTIONS
// ============================================

// View Achievement
async function viewAchievement(achId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/achievements/${achId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load achievement');
        }

        const ach = await response.json();
        openViewAchievementModal(ach);
    } catch (error) {
        console.error('Error loading achievement:', error);
        alert('Failed to load achievement. Please try again.');
    }
}

// View Certification
async function viewCertification(certId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/certifications/${certId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load certification');
        }

        const cert = await response.json();
        openViewCertificationModal(cert);
    } catch (error) {
        console.error('Error loading certification:', error);
        alert('Failed to load certification. Please try again.');
    }
}

// View Experience
async function viewExperience(expId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/experience/${expId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load experience');
        }

        const exp = await response.json();
        openViewExperienceModal(exp);
    } catch (error) {
        console.error('Error loading experience:', error);
        alert('Failed to load experience. Please try again.');
    }
}

// Open View Achievement Modal
function openViewAchievementModal(ach) {
    const modal = document.getElementById('viewAchievementModal');
    if (!modal) return;

    // Store current achievement data
    modal.dataset.achievementId = ach.id;
    modal.dataset.achievementData = JSON.stringify(ach);

    // Populate read-only view
    document.getElementById('view-ach-icon').textContent = ach.icon || '🏆';
    document.getElementById('view-ach-title').textContent = ach.title || '';
    document.getElementById('view-ach-category').textContent = ach.category || '';
    document.getElementById('view-ach-year').textContent = ach.year || 'N/A';
    document.getElementById('view-ach-issuer').textContent = ach.issuer || 'N/A';
    document.getElementById('view-ach-description').textContent = ach.description || 'No description';
    document.getElementById('view-ach-status').innerHTML = getStatusBadge(ach.verification_status);

    // Show certificate preview if exists
    const certificatePreview = document.getElementById('view-ach-certificate-preview');
    if (ach.certificate_url) {
        certificatePreview.classList.remove('hidden');
        const fileExt = ach.certificate_url.split('.').pop().toLowerCase();
        if (fileExt === 'pdf') {
            certificatePreview.innerHTML = `
                <div class="text-center p-8 bg-gray-100 rounded-lg">
                    <p class="text-6xl mb-2">📄</p>
                    <p class="text-sm text-gray-600">PDF Document</p>
                </div>
                <button onclick="viewFullFile('${ach.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        } else {
            certificatePreview.innerHTML = `
                <img src="${ach.certificate_url}" alt="Certificate" class="w-full rounded-lg border-2">
                <button onclick="viewFullFile('${ach.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        }
    } else {
        certificatePreview.classList.add('hidden');
    }

    // Show modal in view mode
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setViewModalMode('achievement', 'view');
}

// Open View Certification Modal
function openViewCertificationModal(cert) {
    const modal = document.getElementById('viewCertificationModal');
    if (!modal) return;

    // Store current certification data
    modal.dataset.certificationId = cert.id;
    modal.dataset.certificationData = JSON.stringify(cert);

    // Populate read-only view
    document.getElementById('view-cert-name').textContent = cert.name || '';
    document.getElementById('view-cert-organization').textContent = cert.issuing_organization || '';
    document.getElementById('view-cert-field').textContent = cert.field_of_study || 'N/A';
    document.getElementById('view-cert-issue-date').textContent = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'N/A';
    document.getElementById('view-cert-expiry-date').textContent = cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'No expiry';
    document.getElementById('view-cert-credential-id').textContent = cert.credential_id || 'N/A';
    document.getElementById('view-cert-description').textContent = cert.description || 'No description';
    document.getElementById('view-cert-status').innerHTML = getStatusBadge(cert.verification_status);

    // Show certificate preview if exists
    const certificatePreview = document.getElementById('view-cert-certificate-preview');
    if (cert.certificate_image_url) {
        certificatePreview.classList.remove('hidden');
        const fileExt = cert.certificate_image_url.split('.').pop().toLowerCase();
        if (fileExt === 'pdf') {
            certificatePreview.innerHTML = `
                <div class="text-center p-8 bg-gray-100 rounded-lg">
                    <p class="text-6xl mb-2">📄</p>
                    <p class="text-sm text-gray-600">PDF Document</p>
                </div>
                <button onclick="viewFullFile('${cert.certificate_image_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        } else {
            certificatePreview.innerHTML = `
                <img src="${cert.certificate_image_url}" alt="Certificate" class="w-full rounded-lg border-2">
                <button onclick="viewFullFile('${cert.certificate_image_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        }
    } else {
        certificatePreview.classList.add('hidden');
    }

    // Show modal in view mode
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setViewModalMode('certification', 'view');
}

// Open View Experience Modal
function openViewExperienceModal(exp) {
    const modal = document.getElementById('viewExperienceModal');
    if (!modal) return;

    // Store current experience data
    modal.dataset.experienceId = exp.id;
    modal.dataset.experienceData = JSON.stringify(exp);

    // Populate read-only view
    document.getElementById('view-exp-job-title').textContent = exp.job_title || '';
    document.getElementById('view-exp-institution').textContent = exp.institution || '';
    document.getElementById('view-exp-location').textContent = exp.location || 'N/A';
    document.getElementById('view-exp-employment-type').textContent = exp.employment_type || 'N/A';
    document.getElementById('view-exp-start-date').textContent = exp.start_date ? new Date(exp.start_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
    }) : 'N/A';
    document.getElementById('view-exp-end-date').textContent = exp.is_current ? 'Present' : (exp.end_date ? new Date(exp.end_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long'
    }) : 'N/A');
    document.getElementById('view-exp-description').textContent = exp.description || 'No description';
    document.getElementById('view-exp-responsibilities').textContent = exp.responsibilities || 'None provided';
    document.getElementById('view-exp-achievements').textContent = exp.achievements || 'None provided';
    document.getElementById('view-exp-status').innerHTML = getStatusBadge(exp.verification_status);

    // Show certificate preview if exists
    const certificatePreview = document.getElementById('view-exp-certificate-preview');
    if (exp.certificate_url) {
        certificatePreview.classList.remove('hidden');
        const fileExt = exp.certificate_url.split('.').pop().toLowerCase();
        if (fileExt === 'pdf') {
            certificatePreview.innerHTML = `
                <div class="text-center p-8 bg-gray-100 rounded-lg">
                    <p class="text-6xl mb-2">📄</p>
                    <p class="text-sm text-gray-600">PDF Document</p>
                </div>
                <button onclick="viewFullFile('${exp.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        } else {
            certificatePreview.innerHTML = `
                <img src="${exp.certificate_url}" alt="Certificate" class="w-full rounded-lg border-2">
                <button onclick="viewFullFile('${exp.certificate_url}')"
                    class="btn-secondary w-full mt-2">View Full File</button>
            `;
        }
    } else {
        certificatePreview.classList.add('hidden');
    }

    // Show modal in view mode
    modal.classList.remove('hidden');
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setViewModalMode('experience', 'view');
}

// Set View Modal Mode (view or edit)
function setViewModalMode(type, mode) {
    const modal = document.getElementById(`view${type.charAt(0).toUpperCase() + type.slice(1)}Modal`);
    if (!modal) return;

    const viewContent = modal.querySelector('.view-content');
    const editContent = modal.querySelector('.edit-content');
    const editBtn = modal.querySelector('.edit-btn');
    const updateBtn = modal.querySelector('.update-btn');
    const cancelEditBtn = modal.querySelector('.cancel-edit-btn');

    if (mode === 'view') {
        viewContent?.classList.remove('hidden');
        editContent?.classList.add('hidden');
        editBtn?.classList.remove('hidden');
        updateBtn?.classList.add('hidden');
        cancelEditBtn?.classList.add('hidden');
    } else if (mode === 'edit') {
        viewContent?.classList.add('hidden');
        editContent?.classList.remove('hidden');
        editBtn?.classList.add('hidden');
        updateBtn?.classList.remove('hidden');
        cancelEditBtn?.classList.remove('hidden');

        // Populate edit fields with current data
        const data = JSON.parse(modal.dataset[`${type}Data`]);
        populateEditForm(type, data);
    }
}

// Close View Modal
function closeViewModal(type) {
    const modal = document.getElementById(`view${type.charAt(0).toUpperCase() + type.slice(1)}Modal`);
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// View Full File in fullscreen
function viewFullFile(fileUrl) {
    const modal = document.getElementById('fullscreenFileModal');
    if (!modal) {
        // Create fullscreen modal if it doesn't exist
        const modalHtml = `
            <div id="fullscreenFileModal" class="fixed inset-0 z-[9999] hidden bg-black">
                <div class="relative w-full h-full">
                    <button onclick="closeFullscreenFile()"
                        class="absolute top-4 right-4 z-10 text-white bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-3 text-2xl">
                        ✕
                    </button>
                    <div id="fullscreenFileContent" class="w-full h-full flex items-center justify-center">
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const fileContent = document.getElementById('fullscreenFileContent');
    const fileExt = fileUrl.split('.').pop().toLowerCase();

    if (fileExt === 'pdf') {
        fileContent.innerHTML = `<iframe src="${fileUrl}" class="w-full h-full"></iframe>`;
    } else {
        fileContent.innerHTML = `<img src="${fileUrl}" alt="File" class="max-w-full max-h-full object-contain">`;
    }

    document.getElementById('fullscreenFileModal').classList.remove('hidden');
}

function closeFullscreenFile() {
    document.getElementById('fullscreenFileModal')?.classList.add('hidden');
}

// Populate Edit Forms
function populateEditForm(type, data) {
    if (type === 'achievement') {
        document.getElementById('edit-ach-icon').value = data.icon || '';
        document.getElementById('edit-ach-title').value = data.title || '';
        document.getElementById('edit-ach-category').value = data.category || '';
        document.getElementById('edit-ach-year').value = data.year || '';
        document.getElementById('edit-ach-issuer').value = data.issuer || '';
        document.getElementById('edit-ach-description').value = data.description || '';
    } else if (type === 'certification') {
        document.getElementById('edit-cert-name').value = data.name || '';
        document.getElementById('edit-cert-organization').value = data.issuing_organization || '';
        document.getElementById('edit-cert-field').value = data.field_of_study || '';
        document.getElementById('edit-cert-issue-date').value = data.issue_date || '';
        document.getElementById('edit-cert-expiry-date').value = data.expiry_date || '';
        document.getElementById('edit-cert-credential-id').value = data.credential_id || '';
        document.getElementById('edit-cert-description').value = data.description || '';
    } else if (type === 'experience') {
        document.getElementById('edit-exp-job-title').value = data.job_title || '';
        document.getElementById('edit-exp-institution').value = data.institution || '';
        document.getElementById('edit-exp-location').value = data.location || '';
        document.getElementById('edit-exp-employment-type').value = data.employment_type || '';
        document.getElementById('edit-exp-start-date').value = data.start_date || '';
        document.getElementById('edit-exp-end-date').value = data.end_date || '';
        document.getElementById('edit-exp-is-current').checked = data.is_current || false;
        document.getElementById('edit-exp-description').value = data.description || '';
        document.getElementById('edit-exp-responsibilities').value = data.responsibilities || '';
        document.getElementById('edit-exp-achievements').value = data.achievements || '';
        // Disable end date if current
        if (data.is_current) {
            document.getElementById('edit-exp-end-date').disabled = true;
        }
    }
}

// Update Functions
async function updateAchievement() {
    const modal = document.getElementById('viewAchievementModal');
    const achId = modal.dataset.achievementId;
    const form = document.getElementById('editAchievementForm');
    const formData = new FormData(form);

    // Add file if selected
    const fileInput = document.getElementById('edit-ach-certificate');
    if (fileInput.files.length > 0) {
        formData.append('certificate', fileInput.files[0]);
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/achievements/${achId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to update achievement');
        }

        alert('Achievement updated successfully!');
        closeViewModal('achievement');
        loadAchievements();
    } catch (error) {
        console.error('Error updating achievement:', error);
        alert('Failed to update achievement. Please try again.');
    }
}

async function updateCertification() {
    const modal = document.getElementById('viewCertificationModal');
    const certId = modal.dataset.certificationId;
    const form = document.getElementById('editCertificationForm');
    const formData = new FormData(form);

    // Add file if selected
    const fileInput = document.getElementById('edit-cert-certificate');
    if (fileInput.files.length > 0) {
        formData.append('certificate_image', fileInput.files[0]);
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/certifications/${certId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to update certification');
        }

        alert('Certification updated successfully!');
        closeViewModal('certification');
        loadCertifications();
    } catch (error) {
        console.error('Error updating certification:', error);
        alert('Failed to update certification. Please try again.');
    }
}

async function updateExperience() {
    const modal = document.getElementById('viewExperienceModal');
    const expId = modal.dataset.experienceId;
    const form = document.getElementById('editExperienceForm');
    const formData = new FormData(form);

    // Add file if selected
    const fileInput = document.getElementById('edit-exp-certificate');
    if (fileInput.files.length > 0) {
        formData.append('certificate', fileInput.files[0]);
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/tutor/experience/${expId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to update experience');
        }

        alert('Experience updated successfully!');
        closeViewModal('experience');
        loadExperience();
    } catch (error) {
        console.error('Error updating experience:', error);
        alert('Failed to update experience. Please try again.');
    }
}

// Delete from View Modal Functions
async function deleteAchievementFromView() {
    const modal = document.getElementById('viewAchievementModal');
    const achId = modal.dataset.achievementId;

    if (!confirm('Are you sure you want to delete this achievement? This will also delete any uploaded files.')) {
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
        closeViewModal('achievement');
        loadAchievements();
    } catch (error) {
        console.error('Error deleting achievement:', error);
        alert('Failed to delete achievement. Please try again.');
    }
}

async function deleteCertificationFromView() {
    const modal = document.getElementById('viewCertificationModal');
    const certId = modal.dataset.certificationId;

    if (!confirm('Are you sure you want to delete this certification? This will also delete any uploaded files.')) {
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
        closeViewModal('certification');
        loadCertifications();
    } catch (error) {
        console.error('Error deleting certification:', error);
        alert('Failed to delete certification. Please try again.');
    }
}

async function deleteExperienceFromView() {
    const modal = document.getElementById('viewExperienceModal');
    const expId = modal.dataset.experienceId;

    if (!confirm('Are you sure you want to delete this experience? This will also delete any uploaded files.')) {
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
        closeViewModal('experience');
        loadExperience();
    } catch (error) {
        console.error('Error deleting experience:', error);
        alert('Failed to delete experience. Please try again.');
    }
}

// Register global functions
window.viewAchievement = viewAchievement;
window.viewCertification = viewCertification;
window.viewExperience = viewExperience;
window.closeViewModal = closeViewModal;
window.viewFullFile = viewFullFile;
window.closeFullscreenFile = closeFullscreenFile;
window.setViewModalMode = setViewModalMode;
window.populateEditForm = populateEditForm;
window.updateAchievement = updateAchievement;
window.updateCertification = updateCertification;
window.updateExperience = updateExperience;
window.deleteAchievementFromView = deleteAchievementFromView;
window.deleteCertificationFromView = deleteCertificationFromView;
window.deleteExperienceFromView = deleteExperienceFromView;
