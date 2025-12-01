/**
 * Parent Profile Blogs Manager
 * Manages blog posts for the logged-in parent's own profile
 * Same rendering as view pages but for own profile
 */

/**
 * Load parent's own blogs
 */
async function loadMyParentBlogs() {
    // Get current user's parent profile ID
    const user = authManager.getCurrentUser();
    if (!user || !user.roles || !user.roles.parent) {
        console.error('No parent profile found for current user');
        return;
    }

    const parentProfileId = user.roles.parent;

    // Reuse the loadParentBlogs function if it exists
    if (typeof window.loadParentBlogs === 'function') {
        await window.loadParentBlogs(parentProfileId);
    }
}

// Initialize when profile panel is accessed
window.loadMyParentBlogs = loadMyParentBlogs;
