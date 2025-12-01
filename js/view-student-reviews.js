/**
 * Student Reviews Manager
 * Handles loading and displaying student reviews from tutors and parents
 */

const API_BASE_URL = 'https://api.astegni.com';

// Color schemes for different review types
const REVIEW_COLORS = {
    positive: { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05)', badge: '#22c55e' },
    improvement: { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)', badge: '#3b82f6' },
    neutral: { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.05)', badge: '#8b5cf6' },
    concern: { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.05)', badge: '#f59e0b' }
};

const REVIEW_TYPE_LABELS = {
    positive: 'Positive',
    improvement: 'Improvement',
    neutral: 'Neutral',
    concern: 'Area for Growth'
};

/**
 * Get student ID from URL
 */
function getStudentIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('student_id') || params.get('id');
}

/**
 * Format date to relative time (e.g., "3 days ago")
 */
function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

/**
 * Generate star rating HTML
 */
function generateStarsHTML(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let html = '';
    for (let i = 0; i < fullStars; i++) html += '★';
    if (hasHalfStar) html += '⭐';
    for (let i = 0; i < emptyStars; i++) html += '☆';

    return html;
}

/**
 * Generate reviewer link based on role
 */
function getReviewerLink(reviewerRole, reviewerProfileId) {
    if (reviewerRole === 'tutor') {
        return `view-tutor.html?id=${reviewerProfileId}`;
    } else if (reviewerRole === 'parent') {
        return `view-parent.html?id=${reviewerProfileId}`;
    }
    return '#';
}

/**
 * Create feedback card HTML
 */
function createFeedbackCardHTML(review) {
    const colors = REVIEW_COLORS[review.review_type] || REVIEW_COLORS.neutral;
    const profilePic = review.reviewer_profile_picture || '../uploads/system_images/system_profile_pictures/man-user.png';
    const reviewerLink = getReviewerLink(review.reviewer_role, review.reviewer_id);

    return `
        <div style="border-left: 4px solid ${colors.border}; padding-left: 1.5rem; background: linear-gradient(135deg, ${colors.bg}); padding: 1.25rem; padding-left: 1.5rem; border-radius: 0 12px 12px 0; transition: all 0.3s ease;">
            <div style="display: flex; gap: 1rem; margin-bottom: 0.75rem;">
                <!-- Reviewer Profile Picture -->
                <a href="${reviewerLink}" style="flex-shrink: 0;">
                    <img src="${profilePic}" alt="${review.reviewer_name}"
                         style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid ${colors.border}; cursor: pointer; transition: transform 0.2s;"
                         onmouseover="this.style.transform='scale(1.05)'"
                         onmouseout="this.style.transform='scale(1)'">
                </a>

                <!-- Review Content -->
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div>
                            <h4 style="font-weight: 600; font-size: 1.125rem; margin-bottom: 0.25rem; color: var(--heading);">${review.review_title || 'Feedback'}</h4>
                            <p style="font-size: 0.875rem; color: var(--text-secondary);">
                                From: <a href="${reviewerLink}" style="color: ${colors.border}; text-decoration: none; font-weight: 600;"
                                         onmouseover="this.style.textDecoration='underline'"
                                         onmouseout="this.style.textDecoration='none'">${review.reviewer_name}</a>
                                - ${review.reviewer_role.charAt(0).toUpperCase() + review.reviewer_role.slice(1)}
                            </p>
                        </div>
                        <div style="display: flex; align-items: center; color: #f59e0b; font-size: 1.25rem;">
                            ${generateStarsHTML(review.rating || 5)}
                        </div>
                    </div>

                    <!-- Rating Badges -->
                    ${review.subject_understanding || review.discipline || review.punctuality ? `
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
                        ${review.subject_understanding ? `<span style="padding: 0.25rem 0.5rem; background: rgba(99, 102, 241, 0.1); color: #6366f1; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Understanding: ${review.subject_understanding.toFixed(1)}</span>` : ''}
                        ${review.discipline ? `<span style="padding: 0.25rem 0.5rem; background: rgba(34, 197, 94, 0.1); color: #22c55e; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Discipline: ${review.discipline.toFixed(1)}</span>` : ''}
                        ${review.punctuality ? `<span style="padding: 0.25rem 0.5rem; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Punctuality: ${review.punctuality.toFixed(1)}</span>` : ''}
                        ${review.participation ? `<span style="padding: 0.25rem 0.5rem; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Participation: ${review.participation.toFixed(1)}</span>` : ''}
                        ${review.communication_skills ? `<span style="padding: 0.25rem 0.5rem; background: rgba(139, 92, 246, 0.1); color: #8b5cf6; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Communication: ${review.communication_skills.toFixed(1)}</span>` : ''}
                        ${review.class_activity ? `<span style="padding: 0.25rem 0.5rem; background: rgba(245, 158, 11, 0.1); color: #f59e0b; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">Class Activity: ${review.class_activity.toFixed(1)}</span>` : ''}
                    </div>
                    ` : ''}

                    <p style="color: var(--text); line-height: 1.6; margin-bottom: 0.75rem;">"${review.review_text}"</p>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">📅 ${formatRelativeTime(review.created_at)}</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Create behavioral note card HTML
 */
function createBehavioralNoteHTML(review) {
    const colors = REVIEW_COLORS[review.review_type] || REVIEW_COLORS.neutral;
    const profilePic = review.reviewer_profile_picture || '../uploads/system_images/system_profile_pictures/man-user.png';
    const reviewerLink = getReviewerLink(review.reviewer_role, review.reviewer_id);
    const typeLabel = REVIEW_TYPE_LABELS[review.review_type] || 'Note';

    return `
        <div style="background: linear-gradient(135deg, ${colors.bg}); border-radius: 12px; padding: 1.5rem; border-left: 4px solid ${colors.border};">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <!-- Reviewer Profile Picture -->
                    <a href="${reviewerLink}">
                        <img src="${profilePic}" alt="${review.reviewer_name}"
                             style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid ${colors.border}; cursor: pointer; transition: transform 0.2s;"
                             onmouseover="this.style.transform='scale(1.05)'"
                             onmouseout="this.style.transform='scale(1)'">
                    </a>
                    <div>
                        <h4 style="font-weight: 600; color: var(--heading); margin: 0; font-size: 1.125rem;">${review.review_title || 'Behavioral Note'}</h4>
                        <p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0;">
                            <a href="${reviewerLink}" style="color: ${colors.border}; text-decoration: none; font-weight: 600;"
                               onmouseover="this.style.textDecoration='underline'"
                               onmouseout="this.style.textDecoration='none'">${review.reviewer_name}</a>
                            - ${review.reviewer_role.charAt(0).toUpperCase() + review.reviewer_role.slice(1)}
                        </p>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem;">
                    <span style="background: ${colors.badge}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">${typeLabel}</span>
                    ${review.rating ? `<div style="color: #f59e0b; font-size: 1rem;">${generateStarsHTML(review.rating)}</div>` : ''}
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">${formatRelativeTime(review.created_at)}</span>
                </div>
            </div>
            <p style="color: var(--text); line-height: 1.7; font-size: 0.95rem;">${review.review_text}</p>
        </div>
    `;
}

/**
 * Load student reviews from API
 * NOTE: URL contains user_id but reviews API needs student_profile_id
 */
async function loadStudentReviews() {
    const userIdFromURL = getStudentIdFromURL();
    if (!userIdFromURL) {
        console.error('No student ID found in URL');
        return;
    }

    // Show loading state
    showLoadingState();

    try {
        // Step 1: Convert user_id to student_profile_id
        const profileResponse = await fetch(`${API_BASE_URL}/api/student/user/${userIdFromURL}/profile-id`);
        if (!profileResponse.ok) {
            console.error('Student profile not found');
            showErrorState('Student profile not found');
            return;
        }

        const { student_profile_id } = await profileResponse.json();
        console.log(`Converted user_id ${userIdFromURL} to student_profile_id ${student_profile_id}`);

        // Step 2: Fetch reviews using student_profile_id
        const response = await fetch(`${API_BASE_URL}/api/student/${student_profile_id}/reviews?limit=10`);
        if (!response.ok) {
            showErrorState('Failed to load reviews');
            return;
        }

        const reviews = await response.json();
        console.log(`Loaded ${reviews.length} reviews for student profile ${student_profile_id}`);

        // Show populated or empty state based on reviews
        if (reviews.length === 0) {
            showEmptyState();
        } else {
            // Load recent feedback (first 6 for dashboard)
            loadRecentFeedback(reviews.slice(0, 6));

            // Load behavioral notes (all reviews)
            loadBehavioralNotes(reviews);
        }

    } catch (error) {
        console.error('Error loading reviews:', error);
        showErrorState('An error occurred while loading reviews');
    }
}

/**
 * Load recent feedback section in dashboard
 */
function loadRecentFeedback(reviews) {
    const container = document.getElementById('recent-feedback-container');
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">No feedback yet</p>
                <p style="font-size: 0.875rem;">Reviews from tutors and parents will appear here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => createFeedbackCardHTML(review)).join('');
}

/**
 * Load behavioral notes section
 */
function loadBehavioralNotes(reviews) {
    const container = document.getElementById('behavioral-notes-container');
    if (!container) return;

    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p style="font-size: 1.125rem; margin-bottom: 0.5rem;">No behavioral notes yet</p>
                <p style="font-size: 0.875rem;">Notes from tutors and parents will appear here</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => createBehavioralNoteHTML(review)).join('');
}

/**
 * Show loading state
 */
function showLoadingState() {
    const feedbackContainer = document.getElementById('recent-feedback-container');
    const notesContainer = document.getElementById('behavioral-notes-container');

    const loadingHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
            <p style="font-size: 1rem; font-weight: 500;">Loading reviews...</p>
        </div>
    `;

    const loadingHTMLSingle = `
        <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
            <p style="font-size: 1rem; font-weight: 500;">Loading behavioral notes...</p>
        </div>
    `;

    if (feedbackContainer) feedbackContainer.innerHTML = loadingHTML;
    if (notesContainer) notesContainer.innerHTML = loadingHTMLSingle;

    // Add spinner animation if not already added
    if (!document.getElementById('spinner-style')) {
        const style = document.createElement('style');
        style.id = 'spinner-style';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Show empty state (no reviews)
 */
function showEmptyState() {
    const feedbackContainer = document.getElementById('recent-feedback-container');
    const notesContainer = document.getElementById('behavioral-notes-container');

    const emptyFeedbackHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📝</div>
            <p style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--heading);">No reviews yet</p>
            <p style="font-size: 0.95rem; max-width: 400px; margin: 0 auto; line-height: 1.6;">Reviews and feedback from tutors and parents will appear here once they submit their evaluations.</p>
        </div>
    `;

    const emptyNotesHTML = `
        <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📋</div>
            <p style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--heading);">No behavioral notes yet</p>
            <p style="font-size: 0.95rem; max-width: 400px; margin: 0 auto; line-height: 1.6;">Behavioral observations and notes from tutors and parents will be displayed here.</p>
        </div>
    `;

    if (feedbackContainer) feedbackContainer.innerHTML = emptyFeedbackHTML;
    if (notesContainer) notesContainer.innerHTML = emptyNotesHTML;
}

/**
 * Show error state
 */
function showErrorState(message = 'Failed to load reviews') {
    const feedbackContainer = document.getElementById('recent-feedback-container');
    const notesContainer = document.getElementById('behavioral-notes-container');

    const errorHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">⚠️</div>
            <p style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #ef4444;">${message}</p>
            <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Please try again later or contact support if the problem persists.</p>
            <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Reload Page
            </button>
        </div>
    `;

    const errorHTMLSingle = `
        <div style="text-align: center; padding: 3rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">⚠️</div>
            <p style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #ef4444;">${message}</p>
            <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem;">Please try again later or contact support if the problem persists.</p>
            <button onclick="location.reload()" style="padding: 0.75rem 1.5rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; font-weight: 600; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
                Reload Page
            </button>
        </div>
    `;

    if (feedbackContainer) feedbackContainer.innerHTML = errorHTML;
    if (notesContainer) notesContainer.innerHTML = errorHTMLSingle;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    loadStudentReviews();
});
