/**
 * View Tutor Documents Manager
 *
 * Handles document display for the public view-tutor.html page.
 * Uses the public /api/view/tutor/{profile_id}/documents endpoint.
 *
 * Features:
 * - Load documents from the unified documents table
 * - Switch between document types (achievement, academic, experience)
 * - Display documents in a read-only grid (no edit/delete for viewers)
 */

const VIEW_DOC_API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';
let viewDocCurrentType = 'achievement';
let viewDocAllDocuments = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize view tutor documents panel
 * @param {number} profileId - The tutor profile ID
 */
async function initializeViewTutorDocuments(profileId) {
    console.log('📄 Initializing View Tutor Documents for profile_id:', profileId);

    if (!profileId) {
        console.error('❌ No profile ID provided');
        return;
    }

    // Store profile ID globally for document operations
    window.viewTutorProfileId = profileId;

    // Load all documents from the public endpoint
    await loadViewTutorDocuments(profileId);

    // Display achievement documents by default
    switchViewDocumentSection('achievement');

    console.log('✅ View Tutor Documents initialized');
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Load documents for a tutor from the public endpoint
 */
async function loadViewTutorDocuments(profileId) {
    try {
        console.log(`📡 Fetching documents for tutor profile ${profileId}...`);

        const response = await fetch(
            `${VIEW_DOC_API_BASE_URL}/api/view/tutor/${profileId}/documents`
        );

        if (!response.ok) {
            console.warn(`⚠️ Failed to load documents: ${response.status}`);
            viewDocAllDocuments = [];
            return;
        }

        viewDocAllDocuments = await response.json();
        console.log(`✅ Loaded ${viewDocAllDocuments.length} documents`);

        // Update document counts
        updateViewDocumentCounts();

    } catch (error) {
        console.error('❌ Error loading documents:', error);
        viewDocAllDocuments = [];
    }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Switch between document types (achievement, academic, experience)
 */
function switchViewDocumentSection(documentType) {
    console.log(`🔄 Switching to ${documentType} documents`);

    viewDocCurrentType = documentType;

    // Update active card styling
    document.querySelectorAll('.document-type-card').forEach(card => {
        card.classList.remove('active', 'ring-4', 'ring-yellow-400', 'ring-blue-400', 'ring-green-400');
    });

    const activeCard = document.getElementById(`doc-card-${documentType}`);
    if (activeCard) {
        activeCard.classList.add('active', 'ring-4');
        if (documentType === 'achievement') {
            activeCard.classList.add('ring-yellow-400');
        } else if (documentType === 'academic') {
            activeCard.classList.add('ring-blue-400');
        } else if (documentType === 'experience') {
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

    const titleElement = document.getElementById('current-doc-type-title');
    if (titleElement) {
        titleElement.textContent = `${icons[documentType]} ${titles[documentType]}`;
    }

    // Display documents of this type
    displayViewDocuments(documentType);
}

/**
 * Display documents of a specific type (read-only view)
 */
function displayViewDocuments(documentType) {
    const documentsGrid = document.getElementById('documents-grid');
    if (!documentsGrid) {
        console.error('Documents grid not found');
        return;
    }

    // Filter documents by type
    const filteredDocuments = viewDocAllDocuments.filter(doc => doc.document_type === documentType);

    console.log(`📊 Displaying ${filteredDocuments.length} ${documentType} documents`);

    // Update count
    const countElement = document.getElementById('current-doc-count');
    if (countElement) {
        countElement.textContent = `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''}`;
    }

    // Clear grid
    documentsGrid.innerHTML = '';

    // Show empty state if no documents
    if (filteredDocuments.length === 0) {
        documentsGrid.innerHTML = `
            <div class="text-center text-gray-500 py-12 col-span-full" id="documents-empty-state">
                <div class="text-6xl mb-4">${getViewDocIcon(documentType)}</div>
                <p class="text-lg font-semibold mb-2">No ${getViewDocName(documentType).toLowerCase()} yet</p>
                <p class="text-sm">This tutor hasn't uploaded any ${getViewDocName(documentType).toLowerCase()} documents.</p>
            </div>
        `;
        return;
    }

    // Render document cards (read-only, no edit/delete buttons)
    filteredDocuments.forEach(document => {
        const card = createViewDocumentCard(document);
        documentsGrid.insertAdjacentHTML('beforeend', card);
    });
}

/**
 * Create a read-only document card HTML
 */
function createViewDocumentCard(doc) {
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

    const issueDate = doc.date_of_issue
        ? new Date(doc.date_of_issue).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : 'N/A';

    return `
        <div class="card p-5 bg-gradient-to-br ${typeColors[doc.document_type]} hover:shadow-lg transition-all duration-200 ${doc.is_featured ? 'ring-2 ring-purple-400 ring-offset-2' : ''}">
            <!-- Header with status badge and featured star -->
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${getViewDocIcon(doc.document_type)}</span>
                    ${doc.is_featured ? '<span class="text-xl" title="Featured Document">⭐</span>' : ''}
                </div>
                <div class="flex flex-col gap-1 items-end">
                    ${statusBadges[doc.verification_status] || ''}
                    ${doc.is_featured ? '<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">Featured</span>' : ''}
                </div>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">${doc.title}</h3>

            <!-- Issued By -->
            ${doc.issued_by ? `
                <p class="text-sm text-gray-600 mb-1">
                    <span class="font-semibold">Issued by:</span> ${doc.issued_by}
                </p>
            ` : ''}

            <!-- Date -->
            <p class="text-sm text-gray-600 mb-3">
                <span class="font-semibold">Date:</span> ${issueDate}
            </p>

            ${doc.description ? `
                <p class="text-sm text-gray-600 mb-3 line-clamp-2">${doc.description}</p>
            ` : ''}

            <!-- View button only (no edit/delete for public view) -->
            ${doc.document_url ? `
                <div class="mt-4">
                    <a href="${doc.document_url}" target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm transition-all">
                        👁️ View Document
                    </a>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Update document counts on the type selector cards
 */
function updateViewDocumentCounts() {
    const achievementCount = viewDocAllDocuments.filter(d => d.document_type === 'achievement').length;
    const academicCount = viewDocAllDocuments.filter(d => d.document_type === 'academic').length;
    const experienceCount = viewDocAllDocuments.filter(d => d.document_type === 'experience').length;

    const achievementBadge = document.getElementById('achievement-count');
    const academicBadge = document.getElementById('academic-count');
    const experienceBadge = document.getElementById('experience-count');

    if (achievementBadge) achievementBadge.textContent = achievementCount;
    if (academicBadge) academicBadge.textContent = academicCount;
    if (experienceBadge) experienceBadge.textContent = experienceCount;

    console.log(`📊 Document counts - Achievements: ${achievementCount}, Academic: ${academicCount}, Experience: ${experienceCount}`);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getViewDocIcon(documentType) {
    const icons = {
        achievement: '🏆',
        academic: '🎓',
        experience: '💼'
    };
    return icons[documentType] || '📄';
}

function getViewDocName(documentType) {
    const names = {
        achievement: 'Achievement',
        academic: 'Academic Certificate',
        experience: 'Work Experience'
    };
    return names[documentType] || 'Document';
}

// ============================================================================
// EXPOSE TO WINDOW
// ============================================================================

// Override document manager functions for view page
window.switchDocumentSection = switchViewDocumentSection;
window.initializeViewTutorDocuments = initializeViewTutorDocuments;
window.loadViewTutorDocuments = loadViewTutorDocuments;

console.log('✅ View Tutor Documents script loaded');
