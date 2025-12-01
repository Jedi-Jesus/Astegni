/**
 * Enhanced Panel Manager - Shows/hides profile header based on active panel
 * Profile header only visible in dashboard panel
 */

class EnhancedPanelManager extends PanelManager {
    constructor() {
        super();
    }

    /**
     * Show or hide profile header based on panel
     * @param {string} panelName - Name of the active panel
     */
    toggleProfileHeader(panelName) {
        const profileSection = document.querySelector('.profile-header-section');
        if (!profileSection) return;

        if (panelName === 'dashboard') {
            // Show profile header for dashboard
            profileSection.style.display = 'block';
            profileSection.classList.add('profile-show');
            profileSection.classList.remove('profile-hide');

            // Add fade-in animation
            setTimeout(() => {
                profileSection.style.opacity = '1';
                profileSection.style.transform = 'translateY(0)';
            }, 10);
        } else {
            // Hide profile header for other panels
            profileSection.classList.add('profile-hide');
            profileSection.classList.remove('profile-show');

            // Add fade-out animation
            profileSection.style.opacity = '0';
            profileSection.style.transform = 'translateY(-20px)';

            setTimeout(() => {
                profileSection.style.display = 'none';
            }, 300);
        }
    }

    /**
     * Override switchPanel to show/hide profile header
     * @param {string} panelName - Name of the panel to switch to
     */
    switchPanel(panelName) {
        // Call parent switchPanel
        super.switchPanel(panelName);

        // Show or hide profile header based on panel
        this.toggleProfileHeader(panelName);
    }
}

// Create enhanced panel manager instance
const enhancedPanelManager = new EnhancedPanelManager();

// Override global switchPanel function
window.switchPanel = function(panelName) {
    enhancedPanelManager.switchPanel(panelName);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        enhancedPanelManager.initialize();
    });
} else {
    enhancedPanelManager.initialize();
}

// Make enhanced manager globally available
window.enhancedPanelManager = enhancedPanelManager;
window.panelManager = enhancedPanelManager; // Override the basic panel manager

// Add CSS for smooth transitions
const panelManagerStyle = document.createElement('style');
panelManagerStyle.textContent = `
    .profile-header-section {
        transition: opacity 0.3s ease, transform 0.3s ease;
    }

    .profile-header-section.profile-hide {
        pointer-events: none;
    }

    .profile-header-section.profile-show {
        pointer-events: auto;
    }

    /* Ensure panels container has no top margin when profile is hidden */
    .profile-header-section.profile-hide + .panels-container,
    .profile-header-section[style*="display: none"] + .panels-container {
        margin-top: 0 !important;
    }

    /* Animation for panel content */
    .panel-content {
        animation: panelFadeIn 0.3s ease-in-out;
    }

    @keyframes panelFadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* Adjust spacing when profile header is hidden */
    .panels-container {
        transition: margin-top 0.3s ease;
    }
`;
document.head.appendChild(panelManagerStyle);