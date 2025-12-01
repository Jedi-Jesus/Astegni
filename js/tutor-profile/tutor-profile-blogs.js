/**
 * Tutor Profile Blogs Manager
 * Manages blog posts for the logged-in tutor's own profile
 * Same rendering as view pages but for own profile
 */

// Use the same rendering functions from view-tutor-blogs
// Category colors mapping
const TUTOR_BLOG_CATEGORY_COLORS = {
    'tutorial': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
    'education': { gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.05)' },
    'technology': { gradient: 'linear-gradient(135deg, #667eea, #764ba2)', border: '#667eea', bg: 'rgba(102, 126, 234, 0.05)' },
    'science': { gradient: 'linear-gradient(135deg, #10b981, #059669)', border: '#10b981', bg: 'rgba(16, 185, 129, 0.05)' },
    'lifestyle': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.05)' },
    'skills': { gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.05)' },
    'personal': { gradient: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '#22c55e', bg: 'rgba(34, 197, 94, 0.05)' },
    'default': { gradient: 'linear-gradient(135deg, #6b7280, #4b5563)', border: '#6b7280', bg: 'rgba(107, 114, 128, 0.05)' }
};

/**
 * Load tutor's own blogs
 */
async function loadMyTutorBlogs() {
    // Get current user's tutor profile ID
    const user = authManager.getCurrentUser();
    if (!user || !user.roles || !user.roles.tutor) {
        console.error('No tutor profile found for current user');
        return;
    }

    const tutorProfileId = user.roles.tutor;

    // Reuse the loadTutorBlogs function if it exists, or implement here
    if (typeof window.loadTutorBlogs === 'function') {
        await window.loadTutorBlogs(tutorProfileId);
    }
}

// Initialize when profile panel is accessed
window.loadMyTutorBlogs = loadMyTutorBlogs;
