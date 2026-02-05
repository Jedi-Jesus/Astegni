/**
 * ═══════════════════════════════════════════════════════════
 * SCHOOL REQUEST MANAGER
 * Handles the school request modal functionality with smart validation
 * ═══════════════════════════════════════════════════════════
 */

// Use existing API_BASE_URL if available, otherwise define it
const SCHOOL_REQUEST_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : (window.API_BASE_URL || 'http://localhost:8000');

/**
 * Open the school request modal
 */
window.openSchoolRequestModal = async function() {
    let modal = document.getElementById('school-request-modal');

    // If modal not in DOM, try to load it
    if (!modal) {
        try {
            const response = await fetch('../modals/common-modals/school-request-modal.html');
            if (response.ok) {
                const html = await response.text();
                const container = document.getElementById('modal-container') || document.body;
                container.insertAdjacentHTML('beforeend', html);
                modal = document.getElementById('school-request-modal');
            }
        } catch (e) {
            console.error('[SchoolRequestManager] Failed to fetch modal:', e);
        }
    }

    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        document.body.style.overflow = 'hidden';

        // Reset form
        resetSchoolRequestForm();

        // Update submit button text based on page context
        updateSchoolSubmitButtonText();
    } else {
        console.error('[SchoolRequestManager] School request modal not found');
        alert('Failed to load school request modal. Please refresh the page and try again.');
    }
};

/**
 * Update submit button text based on page context
 */
function updateSchoolSubmitButtonText() {
    const submitBtn = document.getElementById('submitSchoolRequestBtn');
    if (!submitBtn) return;

    // Check if we're on tutor-profile page
    const isTutorProfile = window.location.pathname.includes('tutor-profile');

    if (isTutorProfile) {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit for Approval';
    } else {
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Request';
    }
}

/**
 * Close the school request modal
 */
window.closeSchoolRequestModal = function(event) {
    // Stop event propagation if event is provided
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const modal = document.getElementById('school-request-modal');
    if (modal) {
        console.log('[SchoolRequestManager] Closing modal...');
        console.log('[SchoolRequestManager] Modal current display:', window.getComputedStyle(modal).display);
        console.log('[SchoolRequestManager] Modal current visibility:', window.getComputedStyle(modal).visibility);

        // Force hide with setProperty to override inline styles
        modal.style.setProperty('display', 'none', 'important');
        modal.style.setProperty('visibility', 'hidden', 'important');
        modal.style.setProperty('opacity', '0', 'important');

        modal.classList.add('hidden');
        modal.classList.remove('active');
        document.body.style.overflow = '';

        console.log('[SchoolRequestManager] Modal after close - display:', window.getComputedStyle(modal).display);
        console.log('[SchoolRequestManager] Modal closed successfully');
    } else {
        console.warn('[SchoolRequestManager] Modal element not found when trying to close');
    }
};

/**
 * Reset the school request form
 */
function resetSchoolRequestForm() {
    const form = document.getElementById('schoolRequestForm');
    if (form) form.reset();
}

/**
 * Validate if school already exists or is similar
 */
async function validateSchoolExists(schoolName) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        const response = await fetch(`${SCHOOL_REQUEST_API_URL}/api/schools?search=${encodeURIComponent(schoolName)}&limit=20`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (response.ok) {
            const schools = await response.json();

            // Check for exact match
            const exactMatch = schools.find(s =>
                s.name && s.name.toLowerCase() === schoolName.toLowerCase()
            );

            if (exactMatch) {
                return {
                    exists: true,
                    exact: true,
                    match: exactMatch,
                    message: `School "${exactMatch.name}" already exists in the system.`
                };
            }

            // Check for similar matches using Levenshtein distance
            const similarSchools = schools.filter(s => {
                if (!s.name) return false;
                const similarity = calculateSimilarity(schoolName.toLowerCase(), s.name.toLowerCase());
                return similarity > 0.6; // 60% similarity threshold
            });

            if (similarSchools.length > 0) {
                return {
                    exists: false,
                    similar: true,
                    matches: similarSchools,
                    message: `Similar school${similarSchools.length > 1 ? 's' : ''} found: ${similarSchools.map(s => s.name).join(', ')}`
                };
            }

            return { exists: false, similar: false };
        }

        return { exists: false, similar: false };
    } catch (error) {
        console.error('Error validating school:', error);
        return { exists: false, similar: false };
    }
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

/**
 * Get Levenshtein edit distance between two strings
 */
function getEditDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Submit school request
 */
window.submitSchoolRequest = async function() {
    const name = document.getElementById('schoolRequestName')?.value?.trim();
    const type = document.getElementById('schoolRequestType')?.value;
    const level = document.getElementById('schoolRequestLevel')?.value;
    const location = document.getElementById('schoolRequestLocation')?.value?.trim();
    const email = document.getElementById('schoolRequestEmail')?.value?.trim();
    const phone = document.getElementById('schoolRequestPhone')?.value?.trim();

    // Validate required fields
    if (!name) {
        alert('Please enter a school name');
        return;
    }
    if (!type) {
        alert('Please select a school type');
        return;
    }
    if (!level) {
        alert('Please select a level');
        return;
    }

    // Show loading state on submit button
    const submitBtn = document.getElementById('submitSchoolRequestBtn');
    const originalContent = submitBtn?.innerHTML;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
    }

    // Validate if school already exists or is similar
    const validation = await validateSchoolExists(name);

    if (validation.exists && validation.exact) {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
        alert(`❌ ${validation.message}\n\nPlease search for this school in the system instead of requesting it again.`);
        return;
    }

    if (validation.similar) {
        const proceed = confirm(
            `⚠️ ${validation.message}\n\n` +
            `Did you mean one of these schools?\n\n` +
            `Click "Cancel" to review, or "OK" to continue with your request anyway.`
        );

        if (!proceed) {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
            return;
        }
    }

    // Update button text to "Submitting..."
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    }

    // Prepare school data
    const schoolData = {
        name: name,
        type: type,
        level: level,
        location: location || null,
        email: email || null,
        phone: phone || null
    };

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            alert('You must be logged in to submit a school request.');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
            return;
        }

        const response = await fetch(`${SCHOOL_REQUEST_API_URL}/api/schools/request`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(schoolData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('School request submitted:', result);

            // Show success message
            alert('School request submitted successfully! It will be reviewed by an admin.');

            // Close modal
            closeSchoolRequestModal();

            // Refresh requests panel if function exists
            if (typeof loadTutorRequests === 'function') {
                loadTutorRequests();
            }
        } else {
            const error = await response.text();
            console.error('Failed to submit school request:', error);
            alert('Failed to submit school request. Please try again.');
        }
    } catch (error) {
        console.error('Error submitting school request:', error);
        alert('Error submitting school request. Please try again.');
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    }
};

// Close modal on ESC key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('school-request-modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeSchoolRequestModal();
        }
    }
});
