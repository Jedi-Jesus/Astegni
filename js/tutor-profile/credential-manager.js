/**
 * Credential Manager for Tutor Profile
 *
 * Unified credential management system for:
 * - Academic certificates
 * - Achievements
 * - Experience documents
 *
 * Features:
 * - Upload credentials with verification workflow
 * - Switch between credential types (achievement, academic, experience)
 * - Display credentials in grid layout
 * - Credential counts and badges
 * - View/Edit/Delete functionality
 *
 * API: Uses /api/tutor/documents endpoints (which access 'credentials' table)
 * Note: API endpoints still use 'documents' naming for backward compatibility,
 *       but they read/write to the 'credentials' database table.
 */

// Use existing API_BASE_URL from window or define if not exists
const CRED_API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
let currentCredentialType = 'achievement'; // Default view
let allCredentials = []; // Cache all credentials

// Legacy alias for backward compatibility
let allDocuments = allCredentials;

// The role for this credential manager (tutor profile page)
const CREDENTIAL_UPLOADER_ROLE = 'tutor';

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize credential manager when panel is loaded
 */
async function initializeCredentialManager() {
    console.log('🚀 Initializing Credential Manager...');

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
 * Load all credentials from the API
 * Uses /api/tutor/documents endpoint (reads from 'credentials' table)
 */
async function loadAllCredentials() {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            console.warn('No auth token found');
            return;
        }

        // Use tutor-specific endpoint (which reads from credentials table)
        const response = await fetch(`${CRED_API_BASE_URL}/api/tutor/documents`, {
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
        console.log(`✅ Loaded ${allCredentials.length} tutor credentials`, allCredentials);

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
 * Upload a new credential
 * Uses /api/tutor/documents/upload endpoint (writes to 'credentials' table)
 */
async function uploadCredential(formData) {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            throw new Error('No auth token found');
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

        // Use tutor-specific endpoint (which writes to credentials table)
        const response = await fetch(`${CRED_API_BASE_URL}/api/tutor/documents/upload`, {
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
 * Update an existing credential
 * Uses /api/tutor/documents/{id} endpoint (updates in 'credentials' table)
 */
async function updateCredential(credentialId, formData) {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            throw new Error('No auth token found');
        }

        const response = await fetch(`${CRED_API_BASE_URL}/api/tutor/documents/${credentialId}`, {
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
 * Delete a credential
 * Uses /api/tutor/documents/{id} endpoint (deletes from 'credentials' table)
 */
async function deleteCredential(credentialId) {
    try {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
        if (!token) {
            throw new Error('No auth token found');
        }

        const response = await fetch(`${CRED_API_BASE_URL}/api/tutor/documents/${credentialId}`, {
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

    // Update active card styling
    document.querySelectorAll('.credential-type-card').forEach(card => {
        card.classList.remove('active', 'ring-4');
        if (credentialType === 'achievement') {
            card.classList.remove('ring-yellow-400');
        } else if (credentialType === 'academic') {
            card.classList.remove('ring-blue-400');
        } else if (credentialType === 'experience') {
            card.classList.remove('ring-green-400');
        }
    });

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

    // Update title
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

    // Display credentials of this type
    displayCredentials(credentialType);
}

// Legacy alias
const switchDocumentSection = switchCredentialSection;

/**
 * Display credentials of a specific type
 */
function displayCredentials(credentialType) {
    const credentialsGrid = document.getElementById('credentials-grid');
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

    // Clear grid
    credentialsGrid.innerHTML = '';

    // Show empty state if no credentials
    if (filteredCredentials.length === 0) {
        credentialsGrid.innerHTML = `
            <div class="text-center text-gray-500 py-12 col-span-full" id="credentials-empty-state">
                <div class="text-6xl mb-4">${getCredentialTypeIcon(credentialType)}</div>
                <p class="text-lg font-semibold mb-2">No ${getCredentialTypeName(credentialType).toLowerCase()} yet</p>
                <p class="text-sm">Click "Upload Credential" to add your first credential</p>
            </div>
        `;
        return;
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

    const achievementBadge = document.getElementById('achievement-count');
    const academicBadge = document.getElementById('academic-count');
    const experienceBadge = document.getElementById('experience-count');

    if (achievementBadge) achievementBadge.textContent = achievementCount;
    if (academicBadge) academicBadge.textContent = academicCount;
    if (experienceBadge) experienceBadge.textContent = experienceCount;

    console.log(`📊 Credential counts - Achievements: ${achievementCount}, Academic: ${academicCount}, Experience: ${experienceCount}`);
}

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
        const currentRole = localStorage.getItem('activeRole');
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
 * Show toast notification (appears in bottom-right corner)
 */
function showToastNotification(message, type = 'success', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 10000; display: flex; flex-direction: column; gap: 10px; max-width: 400px;';
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.style.cssText = 'padding: 16px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; align-items: start; gap: 12px; animation: slideInRight 0.3s ease-out; min-width: 300px;';

    if (type === 'success') {
        toast.style.backgroundColor = '#10B981';
        toast.style.color = 'white';
        toast.innerHTML = `
            <span style="font-size: 20px; flex-shrink: 0;">✅</span>
            <div style="flex: 1; font-size: 14px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Success</p>
                <p style="opacity: 0.95;">${message}</p>
            </div>
        `;
    } else if (type === 'error') {
        toast.style.backgroundColor = '#EF4444';
        toast.style.color = 'white';
        toast.innerHTML = `
            <span style="font-size: 20px; flex-shrink: 0;">❌</span>
            <div style="flex: 1; font-size: 14px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Error</p>
                <p style="opacity: 0.95;">${message}</p>
            </div>
        `;
    } else if (type === 'info') {
        toast.style.backgroundColor = '#3B82F6';
        toast.style.color = 'white';
        toast.innerHTML = `
            <span style="font-size: 20px; flex-shrink: 0;">ℹ️</span>
            <div style="flex: 1; font-size: 14px;">
                <p style="font-weight: 600; margin-bottom: 4px;">Info</p>
                <p style="opacity: 0.95;">${message}</p>
            </div>
        `;
    }

    // Add animation styles if not already added
    if (!document.getElementById('toast-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-animation-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(400px); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    toastContainer.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

/**
 * Show status message in the modal
 */
function showDocUploadStatus(message, type = 'success') {
    const statusDiv = document.getElementById('doc-upload-status');
    if (!statusDiv) return;

    // Clear existing classes
    statusDiv.className = 'mb-4 p-4 rounded-lg';

    // Add type-specific styling
    if (type === 'success') {
        statusDiv.classList.add('bg-green-50', 'border-l-4', 'border-green-500', 'text-green-800');
        statusDiv.innerHTML = `
            <div class="flex items-start">
                <span class="text-green-500 text-xl mr-3">✅</span>
                <div class="text-sm">
                    <p class="font-semibold mb-1">Success!</p>
                    <p>${message}</p>
                </div>
            </div>
        `;
    } else if (type === 'error') {
        statusDiv.classList.add('bg-red-50', 'border-l-4', 'border-red-500', 'text-red-800');
        statusDiv.innerHTML = `
            <div class="flex items-start">
                <span class="text-red-500 text-xl mr-3">❌</span>
                <div class="text-sm">
                    <p class="font-semibold mb-1">Error</p>
                    <p>${message}</p>
                </div>
            </div>
        `;
    } else if (type === 'info') {
        statusDiv.classList.add('bg-blue-50', 'border-l-4', 'border-blue-500', 'text-blue-800');
        statusDiv.innerHTML = `
            <div class="flex items-start">
                <span class="text-blue-500 text-xl mr-3">ℹ️</span>
                <div class="text-sm">
                    <p class="font-semibold mb-1">Info</p>
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    // Show the status div
    statusDiv.classList.remove('hidden');

    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
}

/**
 * Hide status message in the modal
 */
function hideDocUploadStatus() {
    const statusDiv = document.getElementById('doc-upload-status');
    if (statusDiv) {
        statusDiv.classList.add('hidden');
    }
}

/**
 * Close upload document modal
 */
function closeUploadDocumentModal() {
    const modal = document.getElementById('uploadDocumentModal');
    if (!modal) return;

    // Hide status message
    hideDocUploadStatus();

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

    // GUARD: Prevent attaching multiple event listeners
    if (form.dataset.handlerAttached === 'true') {
        console.log('⚠️ Form handler already attached, skipping...');
        return;
    }

    // Mark form as having handler attached
    form.dataset.handlerAttached = 'true';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Hide any previous status messages
        hideDocUploadStatus();

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

            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.disabled = true;
            submitButton.innerHTML = `<span class="flex items-center justify-center gap-2"><span>⏳</span><span>${isEditMode ? 'Updating...' : 'Uploading...'}</span></span>`;

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

                // Show success message
                showDocUploadStatus(
                    `Your ${uploadedDocument.document_type} credential "${uploadedDocument.title}" has been updated successfully.`,
                    'success'
                );

                // Update UI
                updateCredentialCounts();
                displayCredentials(currentCredentialType);

                // Close modal after showing success message
                setTimeout(() => {
                    closeUploadDocumentModal();
                }, 2000);

            } else {
                // Upload new credential
                uploadedDocument = await uploadCredential(formData);

                // Add to cache
                allCredentials.push(uploadedDocument);
                allDocuments = allCredentials; // Keep in sync

                console.log('✅ Credential uploaded:', uploadedDocument);

                // Show success message
                showDocUploadStatus(
                    `Your ${uploadedDocument.document_type} credential "${uploadedDocument.title}" has been submitted for verification. You'll be notified once it's reviewed by our admin team.`,
                    'success'
                );

                // Update UI
                updateCredentialCounts();
                displayCredentials(currentCredentialType);

                // Close modal after showing success message
                setTimeout(() => {
                    closeUploadDocumentModal();
                }, 2500);
            }

        } catch (error) {
            console.error('❌ Error:', error);

            // Show error message in modal
            showDocUploadStatus(
                `${isEditMode ? 'Update' : 'Upload'} failed: ${error.message}. Please try again or contact support if the issue persists.`,
                'error'
            );

            // Reset button
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = isEditMode
                ? '<span class="flex items-center justify-center gap-2"><span>💾</span><span>Update Document</span></span>'
                : '<span class="flex items-center justify-center gap-2"><span>📤</span><span>Upload Document</span></span>';
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
        showToastNotification('Credential file not available', 'error', 4000);
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
 * Delete document with confirmation
 */
async function deleteDocumentConfirm(documentId) {
    const docData = allDocuments.find(d => d.id === documentId);
    if (!docData) {
        console.error('Document not found:', documentId);
        return;
    }

    const confirmed = confirm(
        `Delete Document?\n\n` +
        `Title: ${docData.title}\n` +
        `Type: ${getCredentialTypeName(docData.document_type)}\n` +
        `Status: ${docData.verification_status}\n\n` +
        `This action cannot be undone. Are you sure?`
    );

    if (!confirmed) return;

    try {
        // Show loading
        console.log(`🗑️ Deleting document ${documentId}...`);

        // Delete from API
        await deleteDocument(documentId);

        // Remove from cache
        allCredentials = allCredentials.filter(d => d.id !== documentId);
        allDocuments = allCredentials;

        // Update UI
        updateCredentialCounts();
        displayCredentials(currentCredentialType);

        // Show success toast
        showToastNotification('Document deleted successfully', 'success');

    } catch (error) {
        console.error('❌ Error deleting document:', error);
        showToastNotification(`Delete failed: ${error.message}`, 'error', 5000);
    }
}

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
 * This feature is fully functional - featured credentials show on view-tutor.html
 */
function handleFeaturedToggle(checkbox) {
    // Simply allow the toggle to work normally
    // The is_featured value will be sent with the form data
    console.log('[CredentialManager] Featured toggle:', checkbox.checked ? 'ON' : 'OFF');

    // Optional: Show a tooltip/info message when first enabled
    if (checkbox.checked) {
        // You can add a subtle notification here if desired
        console.log('[CredentialManager] ⭐ This credential will be featured on your public profile');
    }
}

// Expose to window for HTML onclick
window.handleFeaturedToggle = handleFeaturedToggle;

// ============================================================================
// COMING SOON MODAL FUNCTIONS
// ============================================================================
// These functions are defined here because inline scripts in dynamically
// loaded HTML modals don't execute. This ensures the functions are available.

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

// Legacy aliases for backward compatibility
window.switchDocumentSection = switchCredentialSection;
window.initializeDocumentManager = initializeCredentialManager;
window.safeInitializeDocumentManager = safeInitializeCredentialManager;

console.log('✅ Credential Manager script loaded');
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
