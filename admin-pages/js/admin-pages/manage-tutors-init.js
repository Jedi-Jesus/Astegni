/**
 * Initialization script for manage-tutors page
 * This ensures all panels load correctly when opening file directly
 */

// Global state
window.TutorManagementState = {
    currentPanel: 'dashboard',
    filters: {},
    pagination: {
        pending: { page: 1, limit: 15 },
        verified: { page: 1, limit: 15 },
        rejected: { page: 1, limit: 15 },
        suspended: { page: 1, limit: 15 }
    }
};

// Define switchPanel globally IMMEDIATELY
window.switchPanel = function(panelName) {
    console.log('Switching to panel:', panelName);

    // Hide all panels
    document.querySelectorAll('.panel-content').forEach(panel => {
        panel.classList.add('hidden');
    });

    // Show target panel
    const targetPanel = document.getElementById(`${panelName}-panel`);
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
        console.log('Panel shown:', panelName);
    } else {
        console.error('Panel not found:', panelName);
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`.sidebar-link[onclick*="${panelName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Update current panel state
    window.TutorManagementState.currentPanel = panelName;

    // Load data for the panel
    loadPanelData(panelName);
};

// Load data for specific panel
function loadPanelData(panelName) {
    console.log('Loading data for panel:', panelName);

    switch(panelName) {
        case 'dashboard':
            // Dashboard doesn't need specific data loading
            break;
        case 'requested':
            if (window.loadPendingTutors) {
                window.loadPendingTutors();
            }
            break;
        case 'verified':
            if (window.loadVerifiedTutors) {
                window.loadVerifiedTutors();
            }
            break;
        case 'rejected':
            if (window.loadRejectedTutors) {
                window.loadRejectedTutors();
            }
            break;
        case 'suspended':
            if (window.loadSuspendedTutors) {
                window.loadSuspendedTutors();
            }
            break;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Manage Tutors Init - DOM Loaded');

    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('No authentication token found');
        // Optionally redirect to login
        // window.location.href = '/login.html';
        // return;
    }

    // Get panel from URL or default to dashboard
    const urlParams = new URLSearchParams(window.location.search);
    const initialPanel = urlParams.get('panel') || 'dashboard';

    // Initialize with the correct panel
    setTimeout(() => {
        window.switchPanel(initialPanel);
    }, 100);

    console.log('Initialization complete');
});

// Make functions globally available
window.loadPanelData = loadPanelData;