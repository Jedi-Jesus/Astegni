/**
 * Panel Manager - Shared functionality for admin panel switching
 * Used across all admin pages for consistent panel navigation
 */

class PanelManager {
    constructor() {
        this.panels = new Map();
        this.sidebarLinks = new Map();
        this.activePanel = null;
    }

    /**
     * Initialize panel manager with panels found in the DOM
     */
    initialize() {
        // Find all panel elements
        const panelElements = document.querySelectorAll('.panel-content');
        panelElements.forEach(panel => {
            const panelId = panel.id;
            if (panelId) {
                const panelName = panelId.replace('-panel', '');
                this.panels.set(panelName, panel);
            }
        });

        // Find all sidebar links that switch panels
        const sidebarLinks = document.querySelectorAll('[onclick*="switchPanel"]');
        sidebarLinks.forEach(link => {
            const match = link.getAttribute('onclick').match(/switchPanel\(['"]([^'"]+)['"]\)/);
            if (match) {
                const panelName = match[1];
                this.sidebarLinks.set(panelName, link);
            }
        });

        // Set default panel if specified in URL or use 'dashboard'
        const urlParams = new URLSearchParams(window.location.search);
        const defaultPanel = urlParams.get('panel') || 'dashboard';
        this.switchPanel(defaultPanel);
    }

    /**
     * Switch to specified panel
     * @param {string} panelName - Name of the panel to switch to
     */
    switchPanel(panelName) {
        // Hide all panels
        this.panels.forEach((panel, name) => {
            panel.classList.remove('active');
        });

        // Remove active class from all sidebar links
        this.sidebarLinks.forEach((link, name) => {
            link.classList.remove('active');
        });

        // Show selected panel
        const targetPanel = this.panels.get(panelName);
        if (targetPanel) {
            targetPanel.classList.add('active');
            this.activePanel = panelName;

            // Activate corresponding sidebar link
            const activeLink = this.sidebarLinks.get(panelName);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Update URL without page reload
            const url = new URL(window.location);
            url.searchParams.set('panel', panelName);
            window.history.replaceState({}, '', url);

            // Emit custom event for panel change
            this.emitPanelChangeEvent(panelName);
        } else {
            console.warn(`Panel '${panelName}' not found`);
        }
    }

    /**
     * Emit custom event when panel changes
     * @param {string} panelName - Name of the new active panel
     */
    emitPanelChangeEvent(panelName) {
        const event = new CustomEvent('panelChanged', {
            detail: { panelName, previousPanel: this.activePanel }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get current active panel name
     * @returns {string|null} Current active panel name
     */
    getActivePanel() {
        return this.activePanel;
    }

    /**
     * Check if a panel exists
     * @param {string} panelName - Name of the panel to check
     * @returns {boolean} True if panel exists
     */
    hasPanel(panelName) {
        return this.panels.has(panelName);
    }
}

// Create global instance
const panelManager = new PanelManager();

// Global function for backward compatibility with onclick attributes
window.switchPanel = function(panelName) {
    panelManager.switchPanel(panelName);
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        panelManager.initialize();
    });
} else {
    panelManager.initialize();
}

// Make panelManager globally available
window.panelManager = panelManager;
window.PanelManager = PanelManager;

// Global function for onclick handlers
window.switchPanel = function(panelName) {
    return panelManager.switchPanel(panelName);
};