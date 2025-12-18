/**
 * View Tutor Credentials Manager
 *
 * Handles credentials display for the public view-tutor.html page.
 * Uses the public /api/view/tutor/{profile_id}/documents endpoint.
 *
 * Features:
 * - Load credentials from the unified credentials table
 * - Switch between credential types (achievement, academic, experience)
 * - Display credentials in a read-only grid (no edit/delete for viewers)
 */

const VIEW_CRED_API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';
let viewCredCurrentType = 'achievement';
let viewCredAllCredentials = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize view tutor credentials panel
 * @param {number} profileId - The tutor profile ID
 */
async function initializeViewTutorCredentials(profileId) {
    console.log('📜 Initializing View Tutor Credentials for profile_id:', profileId);

    if (!profileId) {
        console.error('No profile ID provided');
        return;
    }

    // Store profile ID globally for credential operations
    window.viewTutorProfileId = profileId;

    // Load all credentials from the public endpoint
    await loadViewTutorCredentials(profileId);

    // Display achievement credentials by default
    switchViewCredentialSection('achievement');

    console.log('View Tutor Credentials initialized');
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Load credentials for a tutor from the public endpoint
 */
async function loadViewTutorCredentials(profileId) {
    try {
        console.log(`Fetching credentials for tutor profile ${profileId}...`);

        const response = await fetch(
            `${VIEW_CRED_API_BASE_URL}/api/view/tutor/${profileId}/documents`
        );

        if (!response.ok) {
            console.warn(`Failed to load credentials: ${response.status}`);
            viewCredAllCredentials = [];
            return;
        }

        viewCredAllCredentials = await response.json();
        console.log(`Loaded ${viewCredAllCredentials.length} credentials`);

        // Update credential counts
        updateViewCredentialCounts();

    } catch (error) {
        console.error('Error loading credentials:', error);
        viewCredAllCredentials = [];
    }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================

/**
 * Switch between credential types (achievement, academic, experience)
 */
function switchViewCredentialSection(credentialType) {
    console.log(`Switching to ${credentialType} credentials`);

    viewCredCurrentType = credentialType;

    // Update active card styling
    document.querySelectorAll('.credential-type-card').forEach(card => {
        card.classList.remove('active', 'ring-4', 'ring-yellow-400', 'ring-blue-400', 'ring-green-400');
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
    displayViewCredentials(credentialType);
}

/**
 * Display credentials of a specific type (read-only view)
 */
function displayViewCredentials(credentialType) {
    const credentialsGrid = document.getElementById('credentials-grid');
    if (!credentialsGrid) {
        console.error('Credentials grid not found');
        return;
    }

    // Filter credentials by type
    const filteredCredentials = viewCredAllCredentials.filter(cred => cred.document_type === credentialType);

    console.log(`Displaying ${filteredCredentials.length} ${credentialType} credentials`);

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
                <div class="text-6xl mb-4">${getViewCredIcon(credentialType)}</div>
                <p class="text-lg font-semibold mb-2">No ${getViewCredName(credentialType).toLowerCase()} yet</p>
                <p class="text-sm">This tutor hasn't uploaded any ${getViewCredName(credentialType).toLowerCase()} credentials.</p>
            </div>
        `;
        return;
    }

    // Render credential cards (read-only, no edit/delete buttons)
    filteredCredentials.forEach(credential => {
        const card = createViewCredentialCard(credential);
        credentialsGrid.insertAdjacentHTML('beforeend', card);
    });
}

/**
 * Create a read-only credential card HTML
 */
function createViewCredentialCard(cred) {
    const statusBadges = {
        pending: '<span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">Pending</span>',
        verified: '<span class="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">Verified</span>',
        rejected: '<span class="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">Rejected</span>'
    };

    const typeColors = {
        achievement: 'from-yellow-50 to-amber-50 border-yellow-200',
        academic: 'from-blue-50 to-indigo-50 border-blue-200',
        experience: 'from-green-50 to-emerald-50 border-green-200'
    };

    const issueDate = cred.date_of_issue
        ? new Date(cred.date_of_issue).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
        : 'N/A';

    return `
        <div class="card p-5 bg-gradient-to-br ${typeColors[cred.document_type]} hover:shadow-lg transition-all duration-200 ${cred.is_featured ? 'ring-2 ring-purple-400 ring-offset-2' : ''}">
            <!-- Header with status badge and featured star -->
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">${getViewCredIcon(cred.document_type)}</span>
                    ${cred.is_featured ? '<span class="text-xl" title="Featured Credential">*</span>' : ''}
                </div>
                <div class="flex flex-col gap-1 items-end">
                    ${statusBadges[cred.verification_status] || ''}
                    ${cred.is_featured ? '<span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">Featured</span>' : ''}
                </div>
            </div>

            <!-- Title -->
            <h3 class="text-lg font-bold text-gray-800 mb-2 line-clamp-2">${cred.title}</h3>

            <!-- Issued By -->
            ${cred.issued_by ? `
                <p class="text-sm text-gray-600 mb-1">
                    <span class="font-semibold">Issued by:</span> ${cred.issued_by}
                </p>
            ` : ''}

            <!-- Date -->
            <p class="text-sm text-gray-600 mb-3">
                <span class="font-semibold">Date:</span> ${issueDate}
            </p>

            ${cred.description ? `
                <p class="text-sm text-gray-600 mb-3 line-clamp-2">${cred.description}</p>
            ` : ''}

            <!-- View button only (no edit/delete for public view) -->
            ${cred.document_url ? `
                <div class="mt-4">
                    <a href="${cred.document_url}" target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold text-sm transition-all">
                        View Credential
                    </a>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Update credential counts on the type selector cards
 */
function updateViewCredentialCounts() {
    const achievementCount = viewCredAllCredentials.filter(d => d.document_type === 'achievement').length;
    const academicCount = viewCredAllCredentials.filter(d => d.document_type === 'academic').length;
    const experienceCount = viewCredAllCredentials.filter(d => d.document_type === 'experience').length;

    const achievementBadge = document.getElementById('achievement-count');
    const academicBadge = document.getElementById('academic-count');
    const experienceBadge = document.getElementById('experience-count');

    if (achievementBadge) achievementBadge.textContent = achievementCount;
    if (academicBadge) academicBadge.textContent = academicCount;
    if (experienceBadge) experienceBadge.textContent = experienceCount;

    console.log(`Credential counts - Achievements: ${achievementCount}, Academic: ${academicCount}, Experience: ${experienceCount}`);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getViewCredIcon(credentialType) {
    const icons = {
        achievement: '🏆',
        academic: '🎓',
        experience: '💼'
    };
    return icons[credentialType] || '📜';
}

function getViewCredName(credentialType) {
    const names = {
        achievement: 'Achievement',
        academic: 'Academic Certificate',
        experience: 'Work Experience'
    };
    return names[credentialType] || 'Credential';
}

// ============================================================================
// EXPOSE TO WINDOW
// ============================================================================

// Override credential manager functions for view page
window.switchCredentialSection = switchViewCredentialSection;
window.initializeViewTutorCredentials = initializeViewTutorCredentials;
window.loadViewTutorCredentials = loadViewTutorCredentials;

console.log('View Tutor Credentials script loaded');
