/**
 * View Extension Modals for view-tutor.html
 * Handles viewing achievements, certifications, and experience in detail modals
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

// Store data globally for modal access
window.viewTutorExtensionsData = {
    achievements: [],
    certifications: [],
    experience: []
};

/**
 * View Achievement Details
 */
window.viewAchievementDetails = async function(achievementId) {
    const achievement = window.viewTutorExtensionsData.achievements.find(a => a.id === achievementId);
    if (!achievement) {
        console.error('Achievement not found:', achievementId);
        return;
    }

    // Populate modal
    document.getElementById('view-ach-icon').textContent = achievement.icon || '🏆';
    document.getElementById('view-ach-title').textContent = achievement.title || '';
    document.getElementById('view-ach-category').textContent = achievement.category || '';
    document.getElementById('view-ach-year').textContent = achievement.year || '';
    document.getElementById('view-ach-issuer').textContent = achievement.issuer || '';
    document.getElementById('view-ach-description').textContent = achievement.description || '';

    // Status badge
    const statusEl = document.getElementById('view-ach-status');
    if (achievement.is_verified) {
        statusEl.innerHTML = '<span class="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">✓ Verified</span>';
    } else {
        statusEl.innerHTML = '<span class="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-semibold">⏳ Pending</span>';
    }

    // Certificate preview
    const certPreview = document.getElementById('view-ach-certificate-preview');
    const iconFallback = document.getElementById('view-ach-icon-fallback');
    if (achievement.certificate_url) {
        certPreview.classList.remove('hidden');
        iconFallback.classList.add('hidden');
        certPreview.innerHTML = `<img src="${achievement.certificate_url}" alt="Certificate" class="w-full rounded-lg border-2">`;
    } else {
        certPreview.classList.add('hidden');
        iconFallback.classList.remove('hidden');
    }

    // Show modal
    document.getElementById('viewAchievementModal').classList.remove('hidden');
};

/**
 * View Certification Details
 */
window.viewCertificationDetails = async function(certificationId) {
    const cert = window.viewTutorExtensionsData.certifications.find(c => c.id === certificationId);
    if (!cert) {
        console.error('Certification not found:', certificationId);
        return;
    }

    // Populate modal
    document.getElementById('view-cert-name').textContent = cert.name || '';
    document.getElementById('view-cert-organization').textContent = cert.issuing_organization || '';
    document.getElementById('view-cert-field').textContent = cert.field_of_study || '';
    document.getElementById('view-cert-credential-id').textContent = cert.credential_id || '';
    document.getElementById('view-cert-description').textContent = cert.description || '';

    // Dates
    if (cert.issue_date) {
        document.getElementById('view-cert-issue-date').textContent = new Date(cert.issue_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        document.getElementById('view-cert-issue-date').textContent = 'N/A';
    }

    if (cert.expiry_date) {
        document.getElementById('view-cert-expiry-date').textContent = new Date(cert.expiry_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        document.getElementById('view-cert-expiry-date').textContent = 'No expiry';
    }

    // Status badge
    const statusEl = document.getElementById('view-cert-status');
    if (cert.is_verified) {
        statusEl.innerHTML = '<span class="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">✓ Verified</span>';
    } else {
        statusEl.innerHTML = '<span class="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-semibold">⏳ Pending</span>';
    }

    // Certificate preview
    const certPreview = document.getElementById('view-cert-certificate-preview');
    const iconFallback = document.getElementById('view-cert-icon-fallback');
    if (cert.certificate_image_url) {
        certPreview.classList.remove('hidden');
        iconFallback.classList.add('hidden');
        certPreview.innerHTML = `<img src="${cert.certificate_image_url}" alt="Certificate" class="w-full rounded-lg border-2">`;
    } else {
        certPreview.classList.add('hidden');
        iconFallback.classList.remove('hidden');
    }

    // Show modal
    document.getElementById('viewCertificationModal').classList.remove('hidden');
};

/**
 * View Experience Details
 */
window.viewExperienceDetails = async function(experienceId) {
    const exp = window.viewTutorExtensionsData.experience.find(e => e.id === experienceId);
    if (!exp) {
        console.error('Experience not found:', experienceId);
        return;
    }

    // Populate modal
    document.getElementById('view-exp-job-title').textContent = exp.job_title || '';
    document.getElementById('view-exp-institution').textContent = exp.institution || '';
    document.getElementById('view-exp-location').textContent = exp.location || '';
    document.getElementById('view-exp-employment-type').textContent = exp.employment_type || '';
    document.getElementById('view-exp-description').textContent = exp.description || '';
    document.getElementById('view-exp-responsibilities').textContent = exp.responsibilities || '';
    document.getElementById('view-exp-achievements').textContent = exp.achievements || '';

    // Dates
    if (exp.start_date) {
        document.getElementById('view-exp-start-date').textContent = new Date(exp.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        document.getElementById('view-exp-start-date').textContent = 'N/A';
    }

    if (exp.is_current) {
        document.getElementById('view-exp-end-date').textContent = 'Present';
    } else if (exp.end_date) {
        document.getElementById('view-exp-end-date').textContent = new Date(exp.end_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else {
        document.getElementById('view-exp-end-date').textContent = 'N/A';
    }

    // Status badge
    const statusEl = document.getElementById('view-exp-status');
    if (exp.is_verified) {
        statusEl.innerHTML = '<span class="bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold">✓ Verified</span>';
    } else {
        statusEl.innerHTML = '<span class="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-semibold">⏳ Pending</span>';
    }

    // Certificate preview
    const certPreview = document.getElementById('view-exp-certificate-preview');
    const iconFallback = document.getElementById('view-exp-icon-fallback');
    if (exp.certificate_url) {
        certPreview.classList.remove('hidden');
        iconFallback.classList.add('hidden');
        certPreview.innerHTML = `<img src="${exp.certificate_url}" alt="Certificate" class="w-full rounded-lg border-2">`;
    } else {
        certPreview.classList.add('hidden');
        iconFallback.classList.remove('hidden');
    }

    // Show modal
    document.getElementById('viewExperienceModal').classList.remove('hidden');
};

/**
 * Close Modal Functions
 */
window.closeViewAchievementModal = function() {
    document.getElementById('viewAchievementModal').classList.add('hidden');
};

window.closeViewCertificationModal = function() {
    document.getElementById('viewCertificationModal').classList.add('hidden');
};

window.closeViewExperienceModal = function() {
    document.getElementById('viewExperienceModal').classList.add('hidden');
};

// ESC key handler
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeViewAchievementModal();
        closeViewCertificationModal();
        closeViewExperienceModal();
    }
});
