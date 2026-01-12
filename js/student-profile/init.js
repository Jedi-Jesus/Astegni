// ============================================
// STUDENT PROFILE INITIALIZATION
// Coordinates all student profile modules
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initializing Student Profile...');

    try {
        // ============================================
        // AUTHENTICATION CHECK
        // ============================================
        // Check if user is authenticated
        if (typeof AuthManager === 'undefined' || typeof window.AuthManager === 'undefined') {
            console.error('❌ AuthManager not loaded! Redirecting to login...');
            alert('Authentication manager not loaded. Please refresh the page.');
            window.location.href = '../index.html';
            return;
        }

        // Wait for AuthManager to restore session
        await window.AuthManager.restoreSession();

        // Check if user is authenticated
        if (!window.AuthManager.isAuthenticated()) {
            console.warn('⚠️ User not authenticated. Redirecting to login...');
            alert('Please log in to access your student profile.');
            window.location.href = '../index.html';
            return;
        }

        // Check if user has student role
        const userRole = window.AuthManager.getUserRole();
        const user = window.AuthManager.getUser();

        // DEBUG: Log detailed role information
        console.log('🔍 Role Check Debug:', {
            userRole: userRole,
            user_active_role: user?.active_role,
            user_role: user?.role,
            user_roles: user?.roles,
            localStorage_userRole: localStorage.getItem('userRole')
        });

        // More defensive role check - handle undefined, null, and string "undefined"
        const normalizedRole = userRole && userRole !== 'undefined' && userRole !== 'null' ? userRole : null;

        if (normalizedRole !== 'student') {
            console.warn(`⚠️ [StudentProfile] User role is '${normalizedRole}', not 'student'. Redirecting...`);
            alert(`This page is for students only. You are logged in as: ${normalizedRole || 'unknown'}\n\nPlease switch to your student role or log in with a student account.`);
            window.location.href = '../index.html';
            return;
        }

        console.log('✅ [StudentProfile] Authentication verified for student role');

        // ============================================
        // INITIALIZE PROFILE
        // ============================================
        // Initialize profile data loader
        if (typeof StudentProfileDataLoader !== 'undefined') {
            await StudentProfileDataLoader.init();
            console.log('✅ StudentProfileDataLoader initialized');
        } else {
            console.error('❌ StudentProfileDataLoader not found');
        }

        // ============================================
        // LOAD RECENT FEEDBACK
        // ============================================
        // Load recent feedback from tutors
        if (typeof window.loadRecentFeedback === 'function') {
            await window.loadRecentFeedback();
            console.log('✅ Recent feedback loaded');
        } else {
            console.warn('⚠️ loadRecentFeedback function not found');
        }

        // ============================================
        // INITIALIZE FOLDER MANAGER
        // ============================================
        if (typeof initializeFolderManager === 'function') {
            initializeFolderManager('student');
            console.log('✅ FolderManager initialized for student');
        } else {
            console.warn('⚠️ initializeFolderManager function not found');
        }

        console.log('✅ Student Profile initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing student profile:', error);
    }
});
