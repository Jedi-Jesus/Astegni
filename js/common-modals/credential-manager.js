/**
 * Credential Manager - Role-Aware (Common Modal)
 *
 * Unified credential management system for ALL roles (tutor, student, etc.):
 * - Academic certificates
 * - Achievements
 * - Experience documents (tutors only)
 *
 * Features:
 * - Auto-detects current role (tutor/student) from localStorage
 * - Upload credentials with verification workflow
 * - Switch between credential types (achievement, academic, experience)
 * - Display credentials in grid layout
 * - Credential counts and badges
 * - View/Edit/Delete functionality
 *
 * API: Role-aware - uses appropriate endpoints:
 *   - Tutors: /api/tutor/documents
 *   - Students: /api/documents (with uploader_role=student)
 */

// Use existing API_BASE_URL from window or define if not exists
const CRED_API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
let currentCredentialType = 'achievement'; // Default view
let allCredentials = []; // Cache all credentials

// Legacy alias for backward compatibility
let allDocuments = allCredentials;

// ============================================================================
// ROLE DETECTION
// ============================================================================

/**
 * Get the current user's role from localStorage
 * @returns {string} 'tutor', 'student', 'parent', or 'advertiser'
 */
function getCurrentRole() {
    const role = localStorage.getItem('activeRole') || localStorage.getItem('userRole');
    console.log('[CredentialManager] Current role:', role);
    return role;
}

/**
 * Get the appropriate API endpoints based on current role
 * @returns {object} { list, upload, update, delete }
 */
function getAPIEndpoints() {
    const role = getCurrentRole();

    if (role === 'tutor') {
        // Tutors use role-specific endpoints
        return {
            list: `${CRED_API_BASE_URL}/api/tutor/documents`,
            upload: `${CRED_API_BASE_URL}/api/tutor/documents/upload`,
            update: (id) => `${CRED_API_BASE_URL}/api/tutor/documents/${id}`,
            delete: (id) => `${CRED_API_BASE_URL}/api/tutor/documents/${id}`,
            useRoleParam: false
        };
    } else {
        // Students and others use unified endpoints with uploader_role parameter
        return {
            list: `${CRED_API_BASE_URL}/api/documents?uploader_role=${role}`,
            upload: `${CRED_API_BASE_URL}/api/documents/upload`,
            update: (id) => `${CRED_API_BASE_URL}/api/documents/${id}`,
            delete: (id) => `${CRED_API_BASE_URL}/api/documents/${id}`,
            useRoleParam: true,
            roleParamValue: role
        };
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize credential manager when panel is loaded
 */
async function initializeCredentialManager() {
    const role = getCurrentRole();
    console.log(`🚀 Initializing Credential Manager for ${role}...`);

    // Set up form submission handler FIRST (before anything else)
    setupCredentialFormHandler();

    // Load all credentials from API
    await loadAllCredentials();

    // Display achievement credentials by default
    switchCredentialSection('achievement');

    console.log('✅ Credential Manager initialized');
}

// Legacy alias for backward compatibility
const initializeDocumentManager = initializeCredentialManager;

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Load all credentials from the API (role-aware)
 */
async function loadAllCredentials() {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            console.warn('No auth token found');
            return;
        }

        const endpoints = getAPIEndpoints();
        const role = getCurrentRole();

        // Fetch credentials using role-specific endpoint
        const response = await fetch(endpoints.list, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        allCredentials = await response.json();
        // Keep allDocuments in sync for backward compatibility
        allDocuments = allCredentials;
        console.log(`✅ Loaded ${allCredentials.length} ${role} credentials`, allCredentials);

        // Update credential counts
        updateCredentialCounts();

    } catch (error) {
        console.error('❌ Error loading credentials:', error);
        allCredentials = [];
        allDocuments = allCredentials;
    }
}

// Legacy alias
const loadAllDocuments = loadAllCredentials;

/**
 * Upload a new credential (role-aware)
 */
async function uploadCredential(formData) {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            throw new Error('No auth token found');
        }

        const endpoints = getAPIEndpoints();

        // Add uploader_role parameter if needed (for unified endpoint)
        if (endpoints.useRoleParam) {
            formData.append('uploader_role', endpoints.roleParamValue);
        }

        // Debug: Log FormData contents
        console.log('📤 FormData contents:');
        for (let [key, value] of formData.entries()) {
            if (value instanceof File) {
                console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        }

        const response = await fetch(endpoints.upload, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type for FormData - browser will set it with boundary
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Backend raw error response:', errorText);
            try {
                const errorData = JSON.parse(errorText);
                console.error('❌ Backend error JSON:', JSON.stringify(errorData, null, 2));
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            } catch (parseError) {
                throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
            }
        }

        const credential = await response.json();
        console.log('✅ Credential uploaded successfully:', credential);

        return credential;

    } catch (error) {
        console.error('❌ Error uploading credential:', error);
        throw error;
    }
}

// Legacy alias
const uploadDocument = uploadCredential;

/**
 * Update an existing credential (role-aware)
 */
async function updateCredential(credentialId, formData) {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            throw new Error('No auth token found');
        }

        const endpoints = getAPIEndpoints();

        // Add uploader_role parameter if needed (for unified endpoint)
        if (endpoints.useRoleParam) {
            formData.append('uploader_role', endpoints.roleParamValue);
        }

        const response = await fetch(endpoints.update(credentialId), {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type for FormData - browser will set it with boundary
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const credential = await response.json();
        console.log('✅ Credential updated successfully:', credential);

        return credential;

    } catch (error) {
        console.error('❌ Error updating credential:', error);
        throw error;
    }
}

// Legacy alias
const updateDocument = updateCredential;

/**
 * Delete a credential (role-aware)
 */
async function deleteCredential(credentialId) {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            throw new Error('No auth token found');
        }

        const endpoints = getAPIEndpoints();

        const response = await fetch(endpoints.delete(credentialId), {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('✅ Credential deleted successfully:', result);

        return result;

    } catch (error) {
        console.error('❌ Error deleting credential:', error);
        throw error;
    }
}

// Legacy alias
const deleteDocument = deleteCredential;

// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Switch between credential types (achievement, academic, experience)
 */
function switchCredentialSection(credentialType) {
    console.log(`🔄 Switching to ${credentialType} credentials`);

    currentCredentialType = credentialType;

    // Remove active styling from ALL credential cards
    const allCards = ['achievement', 'academic', 'experience'];
    allCards.forEach(type => {
        const card = document.getElementById(`cred-card-${type}`);
        if (card) {
            card.classList.remove('active', 'ring-4', 'ring-yellow-400', 'ring-blue-400', 'ring-green-400');
        }
    });

    // Also try the old selector for backward compatibility (tutor profile)
    document.querySelectorAll('.credential-type-card').forEach(card => {
        card.classList.remove('active', 'ring-4', 'ring-yellow-400', 'ring-blue-400', 'ring-green-400');
    });

    // Add active styling to the selected card
    const activeCard = document.getElementById(`cred-card-${credentialType}`);
    if (activeCard) {
        activeCard.classList.add('active', 'ring-4');
        if (credentialType === 'achievement') {
            activeCard.classList.add('ring-yellow-400');
        } else if (credentialType === 'academic') {
            activeCard.classList.add('ring-blue-400');
        } else if (credentialType === 'experience') {
            activeCard.classList.add('ring-green-400');
        }
    }

    // Update title (for tutor profile layout)
    const icons = {
        achievement: '🏆',
        academic: '🎓',
        experience: '💼'
    };

    const titles = {
        achievement: 'Achievements',
        academic: 'Academic Certificates',
        experience: 'Work Experience'
    };

    const titleElement = document.getElementById('current-cred-type-title');
    if (titleElement) {
        titleElement.textContent = `${icons[credentialType]} ${titles[credentialType]}`;
    }

    // Hide/Show credential sections (for student profile layout with separate sections)
    const allSections = ['achievement', 'academic', 'experience'];
    allSections.forEach(type => {
        const section = document.getElementById(`cred-section-${type}`);
        if (section) {
            if (type === credentialType) {
                section.classList.remove('hidden');
                console.log(`✅ Showing section: cred-section-${type}`);
            } else {
                section.classList.add('hidden');
                console.log(`❌ Hiding section: cred-section-${type}`);
            }
        }
    });

    // Display credentials of this type
    displayCredentials(credentialType);
}

// Legacy alias
const switchDocumentSection = switchCredentialSection;

/**
 * Display credentials of a specific type
 */
function displayCredentials(credentialType) {
    // Support both layouts:
    // 1. Tutor profile: Single #credentials-grid
    // 2. Student profile: Separate grids (#achievements-grid, #academic-grid, #experience-grid)
    let credentialsGrid = document.getElementById('credentials-grid');
    let emptyStateId = 'credentials-empty-state';

    // If single grid not found, try type-specific grids (student profile)
    if (!credentialsGrid) {
        const gridMapping = {
            'achievement': 'achievements-grid',
            'academic': 'academic-grid',
            'experience': 'experience-grid'
        };

        const emptyStateMapping = {
            'achievement': 'achievements-empty-state',
            'academic': 'academic-empty-state',
            'experience': 'experience-empty-state'
        };

        const gridId = gridMapping[credentialType];
        emptyStateId = emptyStateMapping[credentialType];

        if (gridId) {
            credentialsGrid = document.getElementById(gridId);
        }
    }

    if (!credentialsGrid) {
        console.error('Credentials grid not found');
        return;
    }

    // Filter credentials by type
    const filteredCredentials = allCredentials.filter(cred => cred.document_type === credentialType);

    console.log(`📊 Displaying ${filteredCredentials.length} ${credentialType} credentials`);

    // Update count
    const countElement = document.getElementById('current-cred-count');
    if (countElement) {
        countElement.textContent = `${filteredCredentials.length} credential${filteredCredentials.length !== 1 ? 's' : ''}`;
    }

    // Clear grid (keep only empty state if it exists)
    const emptyState = document.getElementById(emptyStateId);
    if (emptyState) {
        // Keep empty state element, clear everything else
        Array.from(credentialsGrid.children).forEach(child => {
            if (child.id !== emptyStateId) {
                child.remove();
            }
        });
    } else {
        // Clear entire grid
        credentialsGrid.innerHTML = '';
    }

    // Show/hide empty state
    if (filteredCredentials.length === 0) {
        if (emptyState) {
            emptyState.classList.remove('hidden');
        } else {
            credentialsGrid.innerHTML = `
                <div class="text-center text-gray-500 py-12 col-span-full" id="${emptyStateId}">
                    <div class="text-6xl mb-4">${getCredentialTypeIcon(credentialType)}</div>
                    <p class="text-lg font-semibold mb-2">No ${getCredentialTypeName(credentialType).toLowerCase()} yet</p>
                    <p class="text-sm">Click "Upload Credential" to add your first credential</p>
                </div>
            `;
        }
        return;
    } else {
        // Hide empty state if credentials exist
        if (emptyState) {
            emptyState.classList.add('hidden');
        }
    }

    // Render credential cards
    filteredCredentials.forEach(credential => {
        const card = createCredentialCard(credential);
        credentialsGrid.insertAdjacentHTML('beforeend', card);
    });
}

// Legacy alias
const displayDocuments = displayCredentials;

/**
 * Create a document card HTML
 */
function createCredentialCard(document) {
    const statusBadges = {
        pending: '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">⏳ Pending</span>',
        verified: '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">✅ Verified</span>',
        rejected: '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">❌ Rejected</span>'
    };

    const typeColors = {
        achievement: 'from-yellow-50 to-amber-50 border-yellow-200',
        academic: 'from-blue-50 to-indigo-50 border-blue-200',
        experience: 'from-green-50 to-emerald-50 border-green-200'
    };

    const issueDate = new Date(document.date_of_issue).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    return `
        <div class="card p-5 bg-gradient-to-br ${typeColors[document.document_type]} hover:shadow-lg transition-all duration-200 ${document.is_featured ? 'ring-2 ring-purple-400 ring-offset-2' : ''}">
            <!-- Header with status badge and featured star -->
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${getCredentialTypeIcon(document.document_type)}</span>
                    ${document.is_featured ? '<span class="text-xl" title="Featured Document">⭐</span>' : ''}
                </div>
                <div class="flex flex-col gap-1 items-end">
                    ${statusBadges[document.verification_status]}
                    ${document.is_featured ? '<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">Featured</span>' : ''}
                </div>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">${document.title}</h3>

            <!-- Issued By -->
            <p class="text-sm text-gray-600 mb-1">
                <span class="font-semibold">Issued by:</span> ${document.issued_by}
            </p>

            <!-- Date -->
            <p class="text-sm text-gray-600 mb-3">
                <span class="font-semibold">Date:</span> ${issueDate}
            </p>

            ${document.description ? `
                <p class="text-sm text-gray-600 mb-3 line-clamp-2">${document.description}</p>
            ` : ''}

            ${document.status_reason ? `
                <div class="bg-red-50 border-l-4 border-red-500 p-2 mb-3 rounded">
                    <p class="text-xs text-red-800">
                        <span class="font-semibold">Status reason:</span><br>
                        ${document.status_reason}
                    </p>
                </div>
            ` : ''}

            <!-- Actions -->
            <div class="flex gap-2 mt-4">
                <button onclick="viewDocument(${document.id})"
                    class="flex-1 px-3 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm transition-all">
                    👁️ View
                </button>
                <button onclick="editDocument(${document.id})"
                    class="px-3 py-2 bg-white border-2 border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-sm transition-all">
                    ✏️
                </button>
                <button onclick="deleteDocumentConfirm(${document.id})"
                    class="px-3 py-2 bg-white border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 font-semibold text-sm transition-all">
                    🗑️
                </button>
            </div>
        </div>
    `;
}

/**
 * Update credential counts on the type selector cards
 */
function updateCredentialCounts() {
    const achievementCount = allCredentials.filter(d => d.document_type === 'achievement').length;
    const academicCount = allCredentials.filter(d => d.document_type === 'academic').length;
    const experienceCount = allCredentials.filter(d => d.document_type === 'experience').length;

    // Support both naming conventions:
    // Tutor profile uses: achievement-count, academic-count, experience-count
    // Student profile uses: stat-achievement-count, stat-academic-count
    const achievementBadge = document.getElementById('achievement-count') || document.getElementById('stat-achievement-count');
    const academicBadge = document.getElementById('academic-count') || document.getElementById('stat-academic-count');
    const experienceBadge = document.getElementById('experience-count') || document.getElementById('stat-experience-count');

    if (achievementBadge) achievementBadge.textContent = achievementCount;
    if (academicBadge) academicBadge.textContent = academicCount;
    if (experienceBadge) experienceBadge.textContent = experienceCount;

    console.log(`📊 Credential counts - Achievements: ${achievementCount}, Academic: ${academicCount}, Experience: ${experienceCount}`);
}

// ============================================================================
// STATUS PANEL FUNCTIONS
// ============================================================================

/**
 * Show the status panel with a message
 * @param {string} type - 'success', 'error', 'warning', 'info', 'loading'
 * @param {string} title - Panel title
 * @param {string} message - Panel message
 * @param {boolean} showProgress - Show progress bar animation
 * @param {boolean} showOkButton - Show OK button (for success/error states)
 */
function showDocStatusPanel(type, title, message, showProgress = false, showOkButton = false) {
    const panel = document.getElementById('doc-upload-status-panel');
    const iconEl = document.getElementById('doc-status-icon');
    const titleEl = document.getElementById('doc-status-title');
    const messageEl = document.getElementById('doc-status-message');
    const progressEl = document.getElementById('doc-status-progress');
    const okBtn = document.getElementById('doc-status-ok-btn');

    if (!panel) {
        console.error('❌ Status panel not found');
        return;
    }

    // Set icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
        loading: '⏳'
    };

    // Update content
    if (iconEl) iconEl.textContent = icons[type] || '📄';
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    // Show/hide progress bar
    if (progressEl) {
        if (showProgress) {
            progressEl.classList.remove('hidden');
        } else {
            progressEl.classList.add('hidden');
        }
    }

    // Show/hide OK button
    if (okBtn) {
        if (showOkButton) {
            okBtn.classList.remove('hidden');
        } else {
            okBtn.classList.add('hidden');
        }
    }

    // Remove all status type classes
    panel.classList.remove('success', 'error', 'warning', 'info', 'loading', 'auto-hiding');

    // Add new status type class
    panel.classList.add(type);

    // Make panel visible and slide in
    panel.style.display = 'flex';
    // Force reflow before adding active class for animation
    panel.offsetHeight;
    panel.classList.add('active');

    console.log(`[StatusPanel] Showing ${type} panel:`, title);
}

/**
 * Close the status panel
 */
function closeDocStatusPanel() {
    const panel = document.getElementById('doc-upload-status-panel');
    if (!panel) return;

    // Slide out
    panel.classList.remove('active');

    // Hide panel after animation completes
    setTimeout(() => {
        panel.style.display = 'none';
    }, 400); // Match the slide animation duration

    console.log('[StatusPanel] Closed');
}

// Expose to window for HTML onclick
window.closeDocStatusPanel = closeDocStatusPanel;

// ============================================================================
// DELETE MODAL STATUS PANEL FUNCTIONS
// ============================================================================

/**
 * Show the delete status panel with a message
 * @param {string} type - 'success', 'error', 'loading'
 * @param {string} title - Panel title
 * @param {string} message - Panel message
 * @param {boolean} showProgress - Show progress bar animation
 * @param {boolean} showOkButton - Show OK button (for success/error states)
 */
function showDeleteStatusPanel(type, title, message, showProgress = false, showOkButton = false) {
    const panel = document.getElementById('delete-status-panel');
    const iconEl = document.getElementById('delete-status-icon');
    const titleEl = document.getElementById('delete-status-title');
    const messageEl = document.getElementById('delete-status-message');
    const progressEl = document.getElementById('delete-status-progress');
    const okBtn = document.getElementById('delete-status-ok-btn');

    if (!panel) {
        console.error('❌ Delete status panel not found');
        return;
    }

    // Set icon based on type
    const icons = {
        success: '✅',
        error: '❌',
        loading: '⏳'
    };

    // Update content
    if (iconEl) iconEl.textContent = icons[type] || '🗑️';
    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;

    // Show/hide progress bar
    if (progressEl) {
        if (showProgress) {
            progressEl.classList.remove('hidden');
        } else {
            progressEl.classList.add('hidden');
        }
    }

    // Show/hide OK button
    if (okBtn) {
        if (showOkButton) {
            okBtn.classList.remove('hidden');
        } else {
            okBtn.classList.add('hidden');
        }
    }

    // Remove all status type classes
    panel.classList.remove('success', 'error', 'loading');

    // Add new status type class
    panel.classList.add(type);

    // Make panel visible and slide in
    panel.style.display = 'flex';
    // Force reflow before adding active class for animation
    panel.offsetHeight;
    panel.classList.add('active');

    console.log(`[DeleteStatusPanel] Showing ${type} panel:`, title);
}

/**
 * Close the delete status panel
 */
function closeDeleteStatusPanel() {
    const panel = document.getElementById('delete-status-panel');
    if (!panel) return;

    // Slide out
    panel.classList.remove('active');

    // Hide panel after animation completes
    setTimeout(() => {
        panel.style.display = 'none';
    }, 400); // Match the slide animation duration

    console.log('[DeleteStatusPanel] Closed');
}

// Expose to window for HTML onclick
window.closeDeleteStatusPanel = closeDeleteStatusPanel;

// ============================================================================
// MODAL FUNCTIONS
// ============================================================================

/**
 * Open upload document modal
 * Guards feature access - requires complete profile and KYC verification
 */
function openUploadCredentialModal() {
    // Guard: Check profile completion and KYC before allowing upload
    if (window.ProfileCompletionGuard && typeof ProfileCompletionGuard.guard === 'function') {
        const allowed = ProfileCompletionGuard.guard('Upload Credentials', () => {
            _openUploadCredentialModalInternal();
        });
        if (!allowed) {
            return; // User was shown the appropriate modal to complete profile/KYC
        }
    } else {
        // Guard not available, proceed directly
        _openUploadCredentialModalInternal();
    }
}

/**
 * Internal function to open the modal (called after guard check passes)
 */
function _openUploadCredentialModalInternal() {
    const modal = document.getElementById('uploadDocumentModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Reset form
        const form = document.getElementById('uploadDocumentForm');
        if (form) {
            form.reset();
            // Set up form handler if not already done (modal loaded dynamically)
            setupCredentialFormHandler();
        }

        // Hide "Experience" option for students (only for tutors)
        const currentRole = getCurrentRole();
        const experienceOption = document.getElementById('doc-type-experience');

        if (experienceOption) {
            if (currentRole === 'student') {
                // Hide experience option for students
                experienceOption.style.display = 'none';
                console.log('[CredentialManager] 🎓 Student mode: Experience option hidden');
            } else {
                // Show experience option for tutors and others
                experienceOption.style.display = 'block';
                console.log('[CredentialManager] 💼 Tutor mode: Experience option visible');
            }
        }
    } else {
        console.error('❌ Upload document modal not found. Make sure modal-loader has loaded it.');
    }
}

/**
 * Close upload document modal
 */
function closeUploadDocumentModal() {
    const modal = document.getElementById('uploadDocumentModal');
    if (!modal) return;

    // Reset form
    const form = document.getElementById('uploadDocumentForm');
    if (form) {
        form.reset();
        // Remove edit mode attributes
        form.removeAttribute('data-edit-mode');
        form.removeAttribute('data-document-id');
    }

    // Reset modal title and button text
    const modalTitle = modal.querySelector('h2');
    const submitButton = form?.querySelector('button[type="submit"]');
    if (modalTitle) modalTitle.textContent = '📤 Upload Document';
    if (submitButton) submitButton.innerHTML = '<span class="flex items-center justify-center gap-2"><span>📤</span><span>Upload Document</span></span>';

    // Reset file input to required
    const fileInput = document.getElementById('doc-file');
    if (fileInput) {
        fileInput.required = true;
        const fileLabel = fileInput.previousElementSibling;
        if (fileLabel && fileLabel.tagName === 'LABEL') {
            fileLabel.innerHTML = 'Upload File <span class="text-red-500">*</span>';
        }
    }

    // Hide and reset years field
    const yearsField = document.getElementById('years-field');
    const yearsInput = document.getElementById('doc-years');
    if (yearsField) {
        yearsField.style.display = 'none';
    }
    if (yearsInput) {
        yearsInput.required = false;
        yearsInput.value = '';
    }

    // Hide modal
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

/**
 * Set up form submission handler
 */
function setupCredentialFormHandler() {
    const form = document.getElementById('uploadDocumentForm');
    if (!form) {
        // Form not in DOM yet - it will be loaded dynamically by modal-loader
        // Handler will be attached when openUploadCredentialModal is called
        return;
    }

    // Check if handler already attached to prevent duplicate submissions
    if (form.dataset.handlerAttached === 'true') {
        console.log('⚠️ Form handler already attached, skipping...');
        return;
    }

    // Mark as attached
    form.dataset.handlerAttached = 'true';
    console.log('✅ Attaching form submit handler...');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Check if we're in edit mode
        const isEditMode = form.getAttribute('data-edit-mode') === 'true';
        const documentId = form.getAttribute('data-document-id');

        console.log(isEditMode ? `✏️ Updating document ${documentId}...` : '📤 Uploading new document...');

        try {
            // Get form data
            const formData = new FormData(form);

            // Handle is_featured checkbox (checkboxes only send value when checked)
            const isFeaturedCheckbox = document.getElementById('doc-is-featured');
            if (isFeaturedCheckbox) {
                // Remove the default checkbox value and set explicit true/false
                formData.delete('is_featured');
                formData.append('is_featured', isFeaturedCheckbox.checked ? 'true' : 'false');
                console.log('📌 Is Featured:', isFeaturedCheckbox.checked);
            }

            // Remove empty optional fields to avoid validation errors
            // FastAPI expects optional integer fields to be omitted if empty, not sent as ""
            const yearsValue = formData.get('years');
            if (!yearsValue || yearsValue.trim() === '') {
                formData.delete('years');
            }

            const expiryDateValue = formData.get('expiry_date');
            if (!expiryDateValue || expiryDateValue.trim() === '') {
                formData.delete('expiry_date');
            }

            const descriptionValue = formData.get('description');
            if (!descriptionValue || descriptionValue.trim() === '') {
                formData.delete('description');
            }

            // Show loading state in status panel
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="flex items-center justify-center gap-2"><span>⏳</span><span>${isEditMode ? 'Updating...' : 'Uploading...'}</span></span>`;

            // Show loading panel
            showDocStatusPanel(
                'loading',
                isEditMode ? 'Updating Credential...' : 'Uploading Credential...',
                'Please wait while we process your request...',
                true, // Show progress bar
                false // No OK button
            );

            let uploadedDocument;

            if (isEditMode && documentId) {
                // Update existing document
                uploadedDocument = await updateCredential(documentId, formData);

                // Update in cache
                const index = allCredentials.findIndex(d => d.id === parseInt(documentId));
                if (index !== -1) {
                    allCredentials[index] = uploadedDocument;
                    allDocuments = allCredentials; // Keep in sync
                }

                console.log('✅ Credential updated:', uploadedDocument);

                // Show success panel
                showDocStatusPanel(
                    'success',
                    'Credential Updated!',
                    `Your ${getCredentialTypeName(uploadedDocument.document_type)} "${uploadedDocument.title}" has been updated successfully.`,
                    false, // No progress bar
                    true // Show OK button
                );
            } else {
                // Upload new credential
                uploadedDocument = await uploadCredential(formData);

                // Add to cache
                allCredentials.push(uploadedDocument);
                allDocuments = allCredentials; // Keep in sync

                console.log('✅ Credential uploaded:', uploadedDocument);

                // Show success panel
                showDocStatusPanel(
                    'success',
                    'Credential Uploaded!',
                    `Your ${getCredentialTypeName(uploadedDocument.document_type)} "${uploadedDocument.title}" has been submitted for verification.\n\nYou'll be notified once it's reviewed by our admin team.`,
                    false, // No progress bar
                    true // Show OK button
                );
            }

            // Update UI
            updateCredentialCounts();
            displayCredentials(currentCredentialType);

            // Reset button BEFORE closing modal (so it's visible when reset)
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;

            // Close modal after a short delay to show success state
            setTimeout(() => {
                closeUploadDocumentModal();
            }, 100);

        } catch (error) {
            console.error('❌ Error:', error);

            // Show error panel
            showDocStatusPanel(
                'error',
                `${isEditMode ? 'Update' : 'Upload'} Failed`,
                `${error.message}\n\nPlease try again or contact support if the issue persists.`,
                false, // No progress bar
                true // Show OK button
            );

            // Reset button
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    });

    console.log('✅ Document form handler set up');
}

/**
 * View credential details
 */
function viewDocument(documentId) {
    const docData = allCredentials.find(d => d.id === documentId);
    if (!docData) {
        console.error('Credential not found:', documentId);
        return;
    }

    // Open credential URL in new tab
    if (docData.document_url) {
        window.open(docData.document_url, '_blank');
    } else {
        alert('Credential file not available');
    }
}

/**
 * Edit credential
 */
function editDocument(documentId) {
    const docData = allCredentials.find(d => d.id === documentId);
    if (!docData) {
        console.error('Credential not found:', documentId);
        return;
    }

    console.log('✏️ Editing credential:', docData);

    // Open the upload modal in edit mode
    const modal = document.getElementById('uploadDocumentModal');
    if (!modal) {
        console.error('Upload document modal not found');
        return;
    }

    // Get form elements
    const form = document.getElementById('uploadDocumentForm');
    const titleInput = document.getElementById('doc-title');
    const typeSelect = document.getElementById('doc-type');
    const descriptionInput = document.getElementById('doc-description');
    const issuedByInput = document.getElementById('doc-issued-by');
    const dateInput = document.getElementById('doc-date-of-issue');
    const expiryInput = document.getElementById('doc-expiry-date');
    const isFeaturedCheckbox = document.getElementById('doc-is-featured');
    const fileInput = document.getElementById('doc-file');
    const yearsInput = document.getElementById('doc-years');
    const modalTitle = modal.querySelector('h2');
    const submitButton = form.querySelector('button[type="submit"]');

    // Store document ID in form for update
    form.setAttribute('data-edit-mode', 'true');
    form.setAttribute('data-document-id', documentId);

    // Populate form fields
    if (titleInput) titleInput.value = docData.title || '';
    if (typeSelect) {
        typeSelect.value = docData.document_type || '';
        // Trigger the credential type change handler to show/hide years field
        handleCredentialTypeChange(typeSelect);
    }
    if (descriptionInput) descriptionInput.value = docData.description || '';
    if (issuedByInput) issuedByInput.value = docData.issued_by || '';
    if (dateInput && docData.date_of_issue) {
        // Convert date to YYYY-MM-DD format for input
        const date = new Date(docData.date_of_issue);
        dateInput.value = date.toISOString().split('T')[0];
    }
    if (expiryInput && docData.expiry_date) {
        const expiryDate = new Date(docData.expiry_date);
        expiryInput.value = expiryDate.toISOString().split('T')[0];
    }
    if (yearsInput && docData.years !== undefined && docData.years !== null) {
        yearsInput.value = docData.years;
    }
    if (isFeaturedCheckbox) {
        isFeaturedCheckbox.checked = docData.is_featured || false;
        // Trigger change event to update status text
        isFeaturedCheckbox.dispatchEvent(new Event('change'));
    }

    // Make file input optional in edit mode
    if (fileInput) {
        fileInput.required = false;
        const fileLabel = fileInput.previousElementSibling;
        if (fileLabel && fileLabel.tagName === 'LABEL') {
            fileLabel.innerHTML = 'Upload New File (Optional)';
        }
    }

    // Update modal title and button text
    if (modalTitle) modalTitle.textContent = '✏️ Edit Document';
    if (submitButton) submitButton.innerHTML = '<span class="flex items-center justify-center gap-2"><span>💾</span><span>Update Document</span></span>';

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
}

/**
 * Delete document with confirmation modal
 */
function deleteDocumentConfirm(documentId) {
    const docData = allDocuments.find(d => d.id === documentId);
    if (!docData) {
        console.error('Document not found:', documentId);
        return;
    }

    // Open delete confirmation modal
    openDeleteCredentialModal(documentId, docData);
}

/**
 * Open delete credential confirmation modal
 */
function openDeleteCredentialModal(documentId, docData) {
    const modal = document.getElementById('deleteCredentialModal');
    if (!modal) {
        console.error('❌ Delete credential modal not found. Make sure modal-loader has loaded it.');
        return;
    }

    // Populate credential details
    const titleEl = document.getElementById('delete-cred-title');
    const typeEl = document.getElementById('delete-cred-type');
    const statusEl = document.getElementById('delete-cred-status');

    if (titleEl) titleEl.textContent = docData.title;
    if (typeEl) typeEl.textContent = getCredentialTypeName(docData.document_type);
    if (statusEl) statusEl.textContent = docData.verification_status;

    // Store document ID for deletion
    modal.dataset.documentId = documentId;

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    console.log('🗑️ Delete confirmation modal opened for document:', documentId);
}

/**
 * Close delete credential modal
 */
function closeDeleteCredentialModal() {
    const modal = document.getElementById('deleteCredentialModal');
    if (!modal) return;

    // Hide modal
    modal.classList.add('hidden');
    modal.style.display = 'none';

    // Clear stored document ID
    delete modal.dataset.documentId;

    // Reset status panel
    closeDeleteStatusPanel();

    console.log('Delete confirmation modal closed');
}

/**
 * Confirm and execute credential deletion
 */
async function confirmDeleteCredential() {
    const modal = document.getElementById('deleteCredentialModal');
    const documentId = modal?.dataset.documentId;

    if (!documentId) {
        console.error('No document ID found for deletion');
        return;
    }

    const docData = allDocuments.find(d => d.id === parseInt(documentId));
    if (!docData) {
        console.error('Document not found:', documentId);
        return;
    }

    try {
        // Show loading panel
        showDeleteStatusPanel(
            'loading',
            'Deleting Credential...',
            'Please wait while we delete your credential...',
            true, // Show progress bar
            false // No OK button
        );

        console.log(`🗑️ Deleting document ${documentId}...`);

        // Delete from API
        await deleteDocument(documentId);

        // Remove from cache
        allCredentials = allCredentials.filter(d => d.id !== parseInt(documentId));
        allDocuments = allCredentials;

        // Update UI
        updateCredentialCounts();
        displayCredentials(currentCredentialType);

        // Show success panel
        showDeleteStatusPanel(
            'success',
            'Credential Deleted',
            `Your ${getCredentialTypeName(docData.document_type)} has been deleted successfully.`,
            false, // No progress bar
            true // Show OK button
        );

    } catch (error) {
        console.error('❌ Error deleting document:', error);

        // Show error panel
        showDeleteStatusPanel(
            'error',
            'Delete Failed',
            `${error.message}\n\nPlease try again or contact support.`,
            false, // No progress bar
            true // Show OK button
        );
    }
}

// Expose delete modal functions to window
window.openDeleteCredentialModal = openDeleteCredentialModal;
window.closeDeleteCredentialModal = closeDeleteCredentialModal;
window.confirmDeleteCredential = confirmDeleteCredential;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get icon for document type
 */
function getCredentialTypeIcon(documentType) {
    const icons = {
        achievement: '🏆',
        academic: '🎓',
        experience: '💼'
    };
    return icons[documentType] || '📄';
}

/**
 * Get display name for document type
 */
function getCredentialTypeName(documentType) {
    const names = {
        achievement: 'Achievement',
        academic: 'Academic Certificate',
        experience: 'Work Experience'
    };
    return names[documentType] || 'Document';
}

// ============================================================================
// ESC KEY TO CLOSE MODAL
// ============================================================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUploadDocumentModal();
    }
});

// ============================================================================
// INITIALIZE ON PANEL SWITCH
// ============================================================================

// Track if already initialized to prevent duplicate initialization
let isCredentialManagerInitialized = false;

// Safe initialization wrapper
async function safeInitializeCredentialManager() {
    if (!isCredentialManagerInitialized) {
        console.log('📄 Initializing Credential Manager...');
        await initializeCredentialManager();
        isCredentialManagerInitialized = true;
    } else {
        console.log('📄 Credential Manager already initialized, skipping...');
    }
}

// Legacy alias
const safeInitializeDocumentManager = safeInitializeCredentialManager;

// Listen for panel switches to initialize when credentials panel is shown
// Support both 'panelSwitched' (legacy) and 'panelSwitch' (current) events
window.addEventListener('panelSwitch', (event) => {
    if (event.detail.panelName === 'credentials') {
        console.log('📄 panelSwitch event: credentials panel shown');
        safeInitializeCredentialManager();
    }
});

window.addEventListener('panelSwitched', (event) => {
    if (event.detail.panel === 'credentials') {
        console.log('📄 panelSwitched event: credentials panel shown');
        safeInitializeCredentialManager();
    }
});

// Initialize on page load if credentials panel is already visible
const checkAndInitializeCredentials = () => {
    const credentialsPanel = document.getElementById('credentials-panel');
    if (credentialsPanel && !credentialsPanel.classList.contains('hidden')) {
        console.log('📄 Credentials panel visible - initializing...');
        safeInitializeCredentialManager();
    }
};

// Legacy alias
const checkAndInitializeDocuments = checkAndInitializeCredentials;

// Try initialization on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOMContentLoaded - checking credentials panel...');
    checkAndInitializeCredentials();
});

// Try again on window load (in case DOMContentLoaded was too early)
window.addEventListener('load', () => {
    console.log('📄 Window load - checking credentials panel...');
    checkAndInitializeCredentials();
});

// Also check after a short delay (for dynamic panel rendering)
setTimeout(() => {
    console.log('📄 Delayed check (500ms) - checking credentials panel...');
    checkAndInitializeCredentials();
}, 500);

// Additional delayed checks to catch late panel switches
setTimeout(() => {
    console.log('📄 Delayed check (1000ms) - checking credentials panel...');
    checkAndInitializeCredentials();
}, 1000);

setTimeout(() => {
    console.log('📄 Delayed check (2000ms) - checking credentials panel...');
    checkAndInitializeCredentials();
}, 2000);

// ============================================================================
// CREDENTIAL TYPE CHANGE HANDLER
// ============================================================================

/**
 * Handle credential type change
 * Shows/hides the years input field when experience type is selected
 */
function handleCredentialTypeChange(selectElement) {
    const yearsField = document.getElementById('years-field');
    const yearsInput = document.getElementById('doc-years');

    if (!yearsField || !yearsInput) {
        console.warn('[CredentialManager] Years field elements not found');
        return;
    }

    const selectedType = selectElement.value;

    if (selectedType === 'experience') {
        // Show years field for experience type
        yearsField.style.display = 'block';
        yearsInput.required = true;
        console.log('[CredentialManager] Years field shown (experience type selected)');
    } else {
        // Hide years field for other types
        yearsField.style.display = 'none';
        yearsInput.required = false;
        yearsInput.value = ''; // Clear the value when hiding
        console.log('[CredentialManager] Years field hidden (non-experience type selected)');
    }
}

// ============================================================================
// FEATURED TOGGLE HANDLER
// ============================================================================

/**
 * Handle the "Featured Document" toggle
 * Featured documents are highlighted on the user's public profile
 */
function handleFeaturedToggle(checkbox) {
    // Simply allow the toggle to work normally
    // The is_featured value will be sent with the form data
    console.log('[CredentialManager] Featured toggle:', checkbox.checked ? 'ON' : 'OFF');

    // Optional: Show a tooltip/info message when first enabled
    if (checkbox.checked) {
        console.log('[CredentialManager] ⭐ This credential will be featured on your public profile');
    }
}

// Expose to window for HTML onclick
window.handleFeaturedToggle = handleFeaturedToggle;

// ============================================================================
// COMING SOON MODAL FUNCTIONS
// ============================================================================

/**
 * Open the coming soon modal
 * Shows different content based on login state
 */
function openComingSoonModal(featureName) {
    const modal = document.getElementById('coming-soon-modal');
    if (!modal) {
        console.warn('[ComingSoon] Modal not found in DOM');
        return;
    }

    // Update message if feature name provided
    if (featureName) {
        const messageEl = document.getElementById('coming-soon-message');
        if (messageEl) {
            messageEl.textContent = `The ${featureName} feature is coming soon! We're working hard to bring it to you.`;
        }
    }

    // Check if user is logged in
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isLoggedIn = user && (user.id || user.email || user.first_name);

    const formEl = document.getElementById('coming-soon-form');
    const loggedInEl = document.getElementById('coming-soon-logged-in');
    const userNameEl = document.getElementById('coming-soon-user-name');

    if (isLoggedIn) {
        // Show logged-in message
        if (formEl) formEl.style.display = 'none';
        if (loggedInEl) loggedInEl.style.display = 'block';
        if (userNameEl) {
            const displayName = user.first_name || user.full_name || user.email?.split('@')[0] || 'there';
            userNameEl.textContent = displayName;
        }
    } else {
        // Show email signup form
        if (formEl) formEl.style.display = 'block';
        if (loggedInEl) loggedInEl.style.display = 'none';
    }

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
    console.log('[ComingSoon] Modal opened for:', featureName || 'unspecified feature');
}

/**
 * Close the coming soon modal
 */
function closeComingSoonModal() {
    const modal = document.getElementById('coming-soon-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
        console.log('[ComingSoon] Modal closed');
    }
}

// Expose to window for HTML onclick handlers
window.openComingSoonModal = openComingSoonModal;
window.closeComingSoonModal = closeComingSoonModal;

// Also close on ESC key for coming soon modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const comingSoonModal = document.getElementById('coming-soon-modal');
        if (comingSoonModal && !comingSoonModal.classList.contains('hidden')) {
            closeComingSoonModal();
        }
    }
});

// Close on clicking overlay (but not content)
document.addEventListener('click', (e) => {
    const modal = document.getElementById('coming-soon-modal');
    if (e.target === modal) {
        closeComingSoonModal();
    }
});

// ============================================================================
// EXPOSE FUNCTIONS TO WINDOW (for HTML onclick handlers)
// ============================================================================

// Primary exports (credentials naming)
window.switchCredentialSection = switchCredentialSection;
window.openUploadCredentialModal = openUploadCredentialModal;
window.closeUploadDocumentModal = closeUploadDocumentModal;
window.viewDocument = viewDocument;
window.editDocument = editDocument;
window.deleteDocumentConfirm = deleteDocumentConfirm;
window.initializeCredentialManager = initializeCredentialManager;
window.safeInitializeCredentialManager = safeInitializeCredentialManager;
window.handleCredentialTypeChange = handleCredentialTypeChange;

// Expose for panel-manager.js (student/parent profiles)
window.initializeCredentialsPanel = safeInitializeCredentialManager;

// Legacy aliases for backward compatibility
window.switchDocumentSection = switchCredentialSection;
window.initializeDocumentManager = initializeCredentialManager;
window.safeInitializeDocumentManager = safeInitializeCredentialManager;

console.log('✅ Credential Manager (Role-Aware) script loaded');
console.log('✅ Credential functions exposed to window:', {
    switchCredentialSection: typeof window.switchCredentialSection,
    openUploadCredentialModal: typeof window.openUploadCredentialModal,
    closeUploadDocumentModal: typeof window.closeUploadDocumentModal,
    viewDocument: typeof window.viewDocument,
    editDocument: typeof window.editDocument,
    deleteDocumentConfirm: typeof window.deleteDocumentConfirm,
    initializeCredentialManager: typeof window.initializeCredentialManager
});

// Set up form handler immediately on script load (not waiting for panel switch)
// This prevents the form from reloading the page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupCredentialFormHandler);
} else {
    // DOM already loaded
    setupCredentialFormHandler();
}
