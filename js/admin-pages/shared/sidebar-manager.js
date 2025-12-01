/**
 * Sidebar Manager - Shared functionality for admin sidebar
 * Handles hamburger menu, responsive behavior, and sidebar state
 */

class SidebarManager {
    constructor() {
        this.sidebar = null;
        this.hamburger = null;
        this.closeBtn = null;
        this.overlay = null;
        this.isOpen = false;
    }

    /**
     * Initialize sidebar manager
     */
    initialize() {
        this.sidebar = document.getElementById('sidebar');
        this.hamburger = document.getElementById('hamburger');
        this.closeBtn = document.getElementById('sidebar-close');

        if (!this.sidebar) {
            console.warn('Sidebar element not found');
            return;
        }

        this.createOverlay();
        this.attachEventListeners();
        this.handleResponsive();
    }

    /**
     * Create overlay element for mobile sidebar
     */
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'sidebar-overlay';
        this.overlay.style.cssText = `
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 998;
        `;
        document.body.appendChild(this.overlay);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Hamburger menu toggle
        if (this.hamburger) {
            this.hamburger.addEventListener('click', () => this.toggleSidebar());
        }

        // Close button
        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.closeSidebar());
        }

        // Overlay click
        this.overlay.addEventListener('click', () => this.closeSidebar());

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeSidebar();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => this.handleResponsive());
    }

    /**
     * Toggle sidebar visibility
     */
    toggleSidebar() {
        if (this.isOpen) {
            this.closeSidebar();
        } else {
            this.openSidebar();
        }
    }

    /**
     * Open sidebar
     */
    openSidebar() {
        if (!this.sidebar) return;

        this.sidebar.classList.add('active');
        this.overlay.style.display = 'block';
        this.isOpen = true;

        // Add animation class to hamburger
        if (this.hamburger) {
            this.hamburger.classList.add('active');
        }

        // YouTube-style: Animate entire page when sidebar opens (full 280px push)
        document.body.classList.add('sidebar-active');

        const mainContainer = document.querySelector('.main-container');
        const sections = document.querySelectorAll('section');
        const adPlaceholders = document.querySelectorAll('.ad-placeholder, .ad-placeholder-section, .ad-container');

        if (mainContainer) {
            mainContainer.classList.add('sidebar-active');
        }

        sections.forEach(section => {
            section.classList.add('sidebar-active');
        });

        adPlaceholders.forEach(ad => {
            ad.classList.add('sidebar-active');
        });

        // Prevent body scroll on mobile
        if (window.innerWidth < 768) {
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Close sidebar
     */
    closeSidebar() {
        if (!this.sidebar) return;

        this.sidebar.classList.remove('active');
        this.overlay.style.display = 'none';
        this.isOpen = false;

        // Remove animation class from hamburger
        if (this.hamburger) {
            this.hamburger.classList.remove('active');
        }

        // Remove animation classes from main content
        document.body.classList.remove('sidebar-active');

        const mainContainer = document.querySelector('.main-container');
        const sections = document.querySelectorAll('section');
        const adPlaceholders = document.querySelectorAll('.ad-placeholder, .ad-placeholder-section, .ad-container');

        if (mainContainer) {
            mainContainer.classList.remove('sidebar-active');
        }

        sections.forEach(section => {
            section.classList.remove('sidebar-active');
        });

        adPlaceholders.forEach(ad => {
            ad.classList.remove('sidebar-active');
        });

        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Handle responsive behavior
     */
    handleResponsive() {
        if (window.innerWidth >= 768) {
            // Desktop: sidebar always visible
            this.closeSidebar();
            if (this.sidebar) {
                this.sidebar.style.transform = 'translateX(0)';
            }
        } else {
            // Mobile: sidebar hidden by default
            if (!this.isOpen && this.sidebar) {
                this.sidebar.style.transform = 'translateX(-100%)';
            }
        }
    }
}

// Create global instance
const sidebarManager = new SidebarManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        sidebarManager.initialize();
    });
} else {
    sidebarManager.initialize();
}

// Make sidebarManager globally available
window.sidebarManager = sidebarManager;
window.SidebarManager = SidebarManager;