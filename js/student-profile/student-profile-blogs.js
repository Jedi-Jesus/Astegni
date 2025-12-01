/**
 * Student Profile Blogs Manager
 * Manages blog posts for the logged-in student's own profile
 * Same rendering as view pages but for own profile
 */

/**
 * Load student's own blogs
 */
async function loadMyStudentBlogs() {
    // Get current user's student profile ID
    const user = authManager.getCurrentUser();
    if (!user || !user.roles || !user.roles.student) {
        console.error('No student profile found for current user');
        return;
    }

    const studentProfileId = user.roles.student;

    // Reuse the loadStudentBlogs function if it exists
    if (typeof window.loadStudentBlogs === 'function') {
        await window.loadStudentBlogs(studentProfileId);
    }
}

// Initialize when profile panel is accessed
window.loadMyStudentBlogs = loadMyStudentBlogs;
