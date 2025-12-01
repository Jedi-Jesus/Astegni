// Check authentication on page load
(async function () {
    const auth = window.AuthManager;

    if (!auth.isAuthenticated()) {
        // Try to restore session
        const restored = await auth.restoreSession();

        if (!restored) {
            alert('Please login to access this page');
            window.location.href = '../index.html';
            return;
        }
    }

    // Check if user has the right role
    const userRole = auth.getUserRole();
    if (userRole !== 'student') {
        alert('This page is for students only');
        window.location.href = '../index.html';
        return;
    }

    // Page is accessible, load user data
    const user = auth.getUser();
    console.log('Current user:', user);
})();
