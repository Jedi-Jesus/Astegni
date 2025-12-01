/**
 * View Student Credentials Manager
 * Handles fetching and displaying achievements, certifications, and extracurricular credentials
 * Uses the unified /api/view/student/{profile_id}/documents endpoint
 */

// API_BASE_URL is already defined in view-student-reviews.js
let currentStudentUserId = null;
let currentStudentProfileId = null;

// Store fetched credentials
let studentCredentials = {
    achievements: [],
    certifications: [],
    extracurricular: []
};

/**
 * Fetch student credentials from API
 * Uses the unified /api/view/student/{profile_id}/documents endpoint
 */
async function fetchStudentCredentials(studentProfileId, credentialType = null) {
    try {
        const typeParam = credentialType ? `?document_type=${credentialType}` : '';
        // Use unified view documents endpoint
        const response = await fetch(`${API_BASE_URL}/api/view/student/${studentProfileId}/documents${typeParam}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const credentials = await response.json();
        console.log(`Fetched ${credentials.length} credentials for type: ${credentialType || 'all'}`);
        return credentials;
    } catch (error) {
        console.error('Error fetching student credentials:', error);
        return [];
    }
}

/**
 * Render achievements section
 */
function renderAchievements(credentials) {
    const section = document.getElementById('achievements-section');
    if (!section) return;

    if (credentials.length === 0) {
        section.innerHTML = `
            <div class="col-span-full card p-6 text-center text-gray-500">
                <i class="fas fa-trophy text-3xl mb-3" style="color: #fbbf24; opacity: 0.5;"></i>
                <p>No achievements yet</p>
                <p class="text-sm mt-2">This student hasn't added any achievements yet</p>
            </div>
        `;
        return;
    }

    // Render achievement cards
    const achievementsHTML = credentials.map(cred => {
        const issueDate = new Date(cred.date_of_issue).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        return `
            <div class="card" style="padding: 1.5rem; border-radius: 12px; background: var(--card-bg); border: 1px solid var(--border-color); transition: var(--transition); box-shadow: var(--shadow-sm);">
                <!-- Achievement Header -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1)); display: flex; align-items: center; justify-content: center; border: 3px solid #fbbf24; box-shadow: var(--shadow-sm);">
                        <span style="font-size: 2rem;">🏆</span>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 700; font-size: 1.125rem; margin: 0 0 0.25rem 0; color: var(--heading);">
                            ${cred.title || 'Untitled Achievement'}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-award" style="color: #fbbf24;"></i>
                                ${cred.issued_by || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${cred.description ? `
                <div style="margin-bottom: 1.25rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">${cred.description}</p>
                </div>
                ` : ''}

                <!-- Date Info -->
                <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Issue Date</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">
                            <i class="fas fa-calendar-alt" style="margin-right: 0.5rem; color: #fbbf24;"></i>${issueDate}
                        </p>
                    </div>
                </div>

                <!-- Action Button -->
                ${cred.document_url ? `
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${cred.document_url}" target="_blank"
                        class="btn-primary"
                        style="flex: 1; padding: 0.625rem; font-size: 0.875rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; text-decoration: none; color: white;">
                        <i class="fas fa-external-link-alt"></i> View Certificate
                    </a>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');

    section.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${achievementsHTML}
        </div>
    `;
}

/**
 * Render certifications section
 */
function renderCertifications(credentials) {
    const section = document.getElementById('certifications-section');
    if (!section) return;

    if (credentials.length === 0) {
        section.innerHTML = `
            <div class="col-span-full card p-6 text-center text-gray-500">
                <i class="fas fa-certificate text-3xl mb-3" style="color: #3b82f6; opacity: 0.5;"></i>
                <p>No certifications yet</p>
                <p class="text-sm mt-2">This student hasn't added any certifications yet</p>
            </div>
        `;
        return;
    }

    // Render certification cards
    const certificationsHTML = credentials.map(cred => {
        const issueDate = new Date(cred.date_of_issue).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const expiryDate = cred.expiry_date ? new Date(cred.expiry_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : null;

        return `
            <div class="card" style="padding: 1.5rem; border-radius: 12px; background: var(--card-bg); border: 1px solid var(--border-color); transition: var(--transition); box-shadow: var(--shadow-sm);">
                <!-- Certification Header -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1)); display: flex; align-items: center; justify-content: center; border: 3px solid #3b82f6; box-shadow: var(--shadow-sm);">
                        <span style="font-size: 2rem;">📜</span>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 700; font-size: 1.125rem; margin: 0 0 0.25rem 0; color: var(--heading);">
                            ${cred.title || 'Untitled Certificate'}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-university" style="color: #3b82f6;"></i>
                                ${cred.issued_by || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${cred.description ? `
                <div style="margin-bottom: 1.25rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">${cred.description}</p>
                </div>
                ` : ''}

                <!-- Date Info -->
                <div style="display: grid; grid-template-columns: ${expiryDate ? '1fr 1fr' : '1fr'}; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Issue Date</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">
                            <i class="fas fa-calendar-check" style="margin-right: 0.5rem; color: #3b82f6;"></i>${issueDate}
                        </p>
                    </div>
                    ${expiryDate ? `
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Expiry Date</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">
                            <i class="fas fa-calendar-times" style="margin-right: 0.5rem; color: #ef4444;"></i>${expiryDate}
                        </p>
                    </div>
                    ` : ''}
                </div>

                <!-- Action Button -->
                ${cred.document_url ? `
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${cred.document_url}" target="_blank"
                        class="btn-primary"
                        style="flex: 1; padding: 0.625rem; font-size: 0.875rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; text-decoration: none; color: white;">
                        <i class="fas fa-external-link-alt"></i> View Certificate
                    </a>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');

    section.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${certificationsHTML}
        </div>
    `;
}

/**
 * Render extracurricular section
 */
function renderExtracurricular(credentials) {
    const section = document.getElementById('extracurricular-section');
    if (!section) return;

    if (credentials.length === 0) {
        section.innerHTML = `
            <div class="col-span-full card p-6 text-center text-gray-500">
                <i class="fas fa-theater-masks text-3xl mb-3" style="color: #8b5cf6; opacity: 0.5;"></i>
                <p>No extracurricular activities yet</p>
                <p class="text-sm mt-2">This student hasn't added any extracurricular activities yet</p>
            </div>
        `;
        return;
    }

    // Render extracurricular cards
    const extracurricularHTML = credentials.map(cred => {
        const startDate = new Date(cred.date_of_issue).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const endDate = cred.expiry_date ? new Date(cred.expiry_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : 'Present';

        return `
            <div class="card" style="padding: 1.5rem; border-radius: 12px; background: var(--card-bg); border: 1px solid var(--border-color); transition: var(--transition); box-shadow: var(--shadow-sm);">
                <!-- Activity Header -->
                <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color);">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1)); display: flex; align-items: center; justify-content: center; border: 3px solid #8b5cf6; box-shadow: var(--shadow-sm);">
                        <span style="font-size: 2rem;">🎭</span>
                    </div>
                    <div style="flex: 1;">
                        <h4 style="font-weight: 700; font-size: 1.125rem; margin: 0 0 0.25rem 0; color: var(--heading);">
                            ${cred.title || 'Untitled Activity'}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-users" style="color: #8b5cf6;"></i>
                                ${cred.issued_by || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${cred.description ? `
                <div style="margin-bottom: 1.25rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">${cred.description}</p>
                </div>
                ` : ''}

                <!-- Date Info -->
                <div style="display: grid; grid-template-columns: 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="background: var(--activity-bg); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                        <p style="font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 0.25rem 0; font-weight: 500;">Duration</p>
                        <p style="font-weight: 600; margin: 0; color: var(--text-primary); font-size: 0.875rem;">
                            <i class="fas fa-clock" style="margin-right: 0.5rem; color: #8b5cf6;"></i>${startDate} - ${endDate}
                        </p>
                    </div>
                </div>

                <!-- Action Button -->
                ${cred.document_url ? `
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${cred.document_url}" target="_blank"
                        class="btn-primary"
                        style="flex: 1; padding: 0.625rem; font-size: 0.875rem; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; text-decoration: none; color: white;">
                        <i class="fas fa-external-link-alt"></i> View Details
                    </a>
                </div>
                ` : ''}
            </div>
        `;
    }).join('');

    section.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${extracurricularHTML}
        </div>
    `;
}

/**
 * Show loading state
 */
function showLoadingState(sectionName) {
    const section = document.getElementById(`${sectionName}-section`);
    if (!section) return;

    section.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; background: var(--card-bg); border-radius: 16px;">
            <div style="display: inline-block; width: 50px; height: 50px; border: 4px solid rgba(0, 0, 0, 0.1); border-left-color: var(--button-bg); border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 1rem; color: var(--text-secondary);">Loading ${sectionName}...</p>
        </div>
    `;
}

/**
 * Show error state
 */
function showErrorState(sectionName) {
    const section = document.getElementById(`${sectionName}-section`);
    if (!section) return;

    section.innerHTML = `
        <div style="text-align: center; padding: 4rem 2rem; background: var(--card-bg); border-radius: 16px;">
            <span style="font-size: 4rem; display: block; margin-bottom: 1rem; opacity: 0.5;">!</span>
            <h3 style="font-size: 1.5rem; color: var(--heading); margin-bottom: 0.5rem;">Error Loading Data</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Failed to load ${sectionName}. Please try again later.</p>
            <button onclick="loadCredentialSection('${sectionName}')" style="padding: 0.5rem 1.5rem; background: var(--button-bg); color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
        </div>
    `;
}

/**
 * Load specific credential section
 */
async function loadCredentialSection(sectionName) {
    if (!currentStudentProfileId) {
        console.error('No student profile ID available');
        return;
    }

    showLoadingState(sectionName);

    // Map section names to credential types
    const typeMap = {
        'achievements': 'achievement',
        'certifications': 'academic_certificate',
        'extracurricular': 'extracurricular'
    };

    const credentialType = typeMap[sectionName];
    const credentials = await fetchStudentCredentials(currentStudentProfileId, credentialType);

    // Store credentials
    studentCredentials[sectionName] = credentials;

    // Render based on section
    if (sectionName === 'achievements') {
        renderAchievements(credentials);
    } else if (sectionName === 'certifications') {
        renderCertifications(credentials);
    } else if (sectionName === 'extracurricular') {
        renderExtracurricular(credentials);
    }
}

/**
 * Switch credential section and load data if needed
 */
function switchCredentialSection(sectionName) {
    // Hide all credential sections
    const sections = document.querySelectorAll('.credential-section');
    sections.forEach(section => section.classList.add('hidden'));

    // Remove active class from all credential cards
    const cards = document.querySelectorAll('.credential-type-card');
    cards.forEach(card => card.classList.remove('active'));

    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }

    // Add active class to selected card
    const selectedCard = document.getElementById(`cred-card-${sectionName}`);
    if (selectedCard) {
        selectedCard.classList.add('active');

        // Update active styling
        cards.forEach(card => {
            card.style.opacity = '0.6';
            card.style.transform = 'scale(0.98)';
        });

        selectedCard.style.opacity = '1';
        selectedCard.style.transform = 'scale(1)';
    }

    // Load data for this section if not already loaded
    if (studentCredentials[sectionName].length === 0) {
        loadCredentialSection(sectionName);
    }
}

/**
 * Update credential count badges
 */
async function updateCredentialCounts(studentProfileId) {
    try {
        // Fetch all credentials to get counts
        const allCredentials = await fetchStudentCredentials(studentProfileId);

        // Count by credential type
        const counts = {
            achievement: 0,
            academic_certificate: 0,
            extracurricular: 0
        };

        allCredentials.forEach(cred => {
            if (counts.hasOwnProperty(cred.document_type)) {
                counts[cred.document_type]++;
            }
        });

        // Update achievement count
        const achievementsCountEl = document.getElementById('achievements-count');
        if (achievementsCountEl) {
            const count = counts.achievement;
            achievementsCountEl.textContent = count === 0 ? 'No Awards' : count === 1 ? '1 Award' : `${count} Awards`;
        }

        // Update certification count
        const certificationsCountEl = document.getElementById('certifications-count');
        if (certificationsCountEl) {
            const count = counts.academic_certificate;
            certificationsCountEl.textContent = count === 0 ? 'No Certificates' : count === 1 ? '1 Certificate' : `${count} Certificates`;
        }

        // Update extracurricular count
        const extracurricularCountEl = document.getElementById('extracurricular-count');
        if (extracurricularCountEl) {
            const count = counts.extracurricular;
            extracurricularCountEl.textContent = count === 0 ? 'No Activities' : count === 1 ? '1 Activity' : `${count} Activities`;
        }

        console.log('Credential counts updated:', counts);
    } catch (error) {
        console.error('Error updating credential counts:', error);
        // Set default text on error
        const achievementsCountEl = document.getElementById('achievements-count');
        const certificationsCountEl = document.getElementById('certifications-count');
        const extracurricularCountEl = document.getElementById('extracurricular-count');

        if (achievementsCountEl) achievementsCountEl.textContent = '0 Awards';
        if (certificationsCountEl) certificationsCountEl.textContent = '0 Certificates';
        if (extracurricularCountEl) extracurricularCountEl.textContent = '0 Activities';
    }
}

/**
 * Initialize credential loading
 * @param {number} studentProfileId - The student profile ID (from student_profiles table)
 */
async function initializeStudentCredentials(studentProfileId) {
    currentStudentProfileId = studentProfileId;
    console.log('Initializing student credentials for profile ID:', studentProfileId);

    // Update credential counts first
    await updateCredentialCounts(studentProfileId);

    // Load achievements by default
    await loadCredentialSection('achievements');
}

// Make functions globally available immediately (not wrapped in condition)
window.switchCredentialSection = switchCredentialSection;
window.initializeStudentCredentials = initializeStudentCredentials;
window.loadCredentialSection = loadCredentialSection;
window.updateCredentialCounts = updateCredentialCounts;

// Add loading spinner animation styles immediately
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .credential-section.hidden {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
})();
