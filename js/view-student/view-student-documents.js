/**
 * View Student Documents Manager
 * Handles fetching and displaying achievements, certifications, and extracurricular documents
 * Uses the unified /api/view/student/{profile_id}/documents endpoint
 */

// API_BASE_URL is already defined in view-student-reviews.js
let currentStudentUserId = null;
let currentStudentProfileId = null;

// Store fetched documents
let studentDocuments = {
    achievements: [],
    certifications: [],
    extracurricular: []
};

/**
 * Fetch student documents from API
 * Uses the unified /api/view/student/{profile_id}/documents endpoint
 */
async function fetchStudentDocuments(studentProfileId, documentType = null) {
    try {
        const typeParam = documentType ? `?document_type=${documentType}` : '';
        // Use unified view documents endpoint
        const response = await fetch(`${API_BASE_URL}/api/view/student/${studentProfileId}/documents${typeParam}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const documents = await response.json();
        console.log(`Fetched ${documents.length} documents for type: ${documentType || 'all'}`);
        return documents;
    } catch (error) {
        console.error('Error fetching student documents:', error);
        return [];
    }
}

/**
 * Render achievements section
 */
function renderAchievements(documents) {
    const section = document.getElementById('achievements-section');
    if (!section) return;

    if (documents.length === 0) {
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
    const achievementsHTML = documents.map(doc => {
        const issueDate = new Date(doc.date_of_issue).toLocaleDateString('en-US', {
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
                            ${doc.title || 'Untitled Achievement'}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-award" style="color: #fbbf24;"></i>
                                ${doc.issued_by || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${doc.description ? `
                <div style="margin-bottom: 1.25rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">${doc.description}</p>
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
                ${doc.document_url ? `
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${doc.document_url}" target="_blank"
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
function renderCertifications(documents) {
    const section = document.getElementById('certifications-section');
    if (!section) return;

    if (documents.length === 0) {
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
    const certificationsHTML = documents.map(doc => {
        const issueDate = new Date(doc.date_of_issue).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const expiryDate = doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('en-US', {
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
                            ${doc.title || 'Untitled Certificate'}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-university" style="color: #3b82f6;"></i>
                                ${doc.issued_by || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${doc.description ? `
                <div style="margin-bottom: 1.25rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">${doc.description}</p>
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
                ${doc.document_url ? `
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${doc.document_url}" target="_blank"
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
function renderExtracurricular(documents) {
    const section = document.getElementById('extracurricular-section');
    if (!section) return;

    if (documents.length === 0) {
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
    const extracurricularHTML = documents.map(doc => {
        const startDate = new Date(doc.date_of_issue).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        const endDate = doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('en-US', {
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
                            ${doc.title || 'Untitled Activity'}
                        </h4>
                        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
                            <span style="display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.875rem; color: var(--text-secondary);">
                                <i class="fas fa-users" style="color: #8b5cf6;"></i>
                                ${doc.issued_by || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Description -->
                ${doc.description ? `
                <div style="margin-bottom: 1.25rem;">
                    <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">${doc.description}</p>
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
                ${doc.document_url ? `
                <div style="display: flex; gap: 0.5rem;">
                    <a href="${doc.document_url}" target="_blank"
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
            <span style="font-size: 4rem; display: block; margin-bottom: 1rem; opacity: 0.5;">⚠️</span>
            <h3 style="font-size: 1.5rem; color: var(--heading); margin-bottom: 0.5rem;">Error Loading Data</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">Failed to load ${sectionName}. Please try again later.</p>
            <button onclick="loadDocumentSection('${sectionName}')" style="padding: 0.5rem 1.5rem; background: var(--button-bg); color: white; border: none; border-radius: 8px; cursor: pointer;">Retry</button>
        </div>
    `;
}

/**
 * Load specific document section
 */
async function loadDocumentSection(sectionName) {
    if (!currentStudentProfileId) {
        console.error('No student profile ID available');
        return;
    }

    showLoadingState(sectionName);

    // Map section names to document types
    const typeMap = {
        'achievements': 'achievement',
        'certifications': 'academic_certificate',
        'extracurricular': 'extracurricular'
    };

    const documentType = typeMap[sectionName];
    const documents = await fetchStudentDocuments(currentStudentProfileId, documentType);

    // Store documents
    studentDocuments[sectionName] = documents;

    // Render based on section
    if (sectionName === 'achievements') {
        renderAchievements(documents);
    } else if (sectionName === 'certifications') {
        renderCertifications(documents);
    } else if (sectionName === 'extracurricular') {
        renderExtracurricular(documents);
    }
}

/**
 * Switch document section and load data if needed
 */
function switchDocumentSection(sectionName) {
    // Hide all document sections
    const sections = document.querySelectorAll('.document-section');
    sections.forEach(section => section.classList.add('hidden'));

    // Remove active class from all document cards
    const cards = document.querySelectorAll('.document-type-card');
    cards.forEach(card => card.classList.remove('active'));

    // Show selected section
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }

    // Add active class to selected card
    const selectedCard = document.getElementById(`doc-card-${sectionName}`);
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
    if (studentDocuments[sectionName].length === 0) {
        loadDocumentSection(sectionName);
    }
}

/**
 * Update document count badges
 */
async function updateDocumentCounts(studentProfileId) {
    try {
        // Fetch all documents to get counts
        const allDocuments = await fetchStudentDocuments(studentProfileId);

        // Count by document type
        const counts = {
            achievement: 0,
            academic_certificate: 0,
            extracurricular: 0
        };

        allDocuments.forEach(doc => {
            if (counts.hasOwnProperty(doc.document_type)) {
                counts[doc.document_type]++;
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

        console.log('Document counts updated:', counts);
    } catch (error) {
        console.error('Error updating document counts:', error);
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
 * Initialize document loading
 * @param {number} studentProfileId - The student profile ID (from student_profiles table)
 */
async function initializeStudentDocuments(studentProfileId) {
    currentStudentProfileId = studentProfileId;
    console.log('Initializing student documents for profile ID:', studentProfileId);

    // Update document counts first
    await updateDocumentCounts(studentProfileId);

    // Load achievements by default
    await loadDocumentSection('achievements');
}

// Make functions globally available immediately (not wrapped in condition)
window.switchDocumentSection = switchDocumentSection;
window.initializeStudentDocuments = initializeStudentDocuments;
window.loadDocumentSection = loadDocumentSection;
window.updateDocumentCounts = updateDocumentCounts;

// Add loading spinner animation styles immediately
(function() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .document-section.hidden {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
})();
