/**
 * MANAGE TUTORS - STANDALONE NAVIGATION & PANEL MANAGEMENT
 * Complete standalone script for manage-tutors.html
 * Includes: Sidebar navigation, Panel switching, Theme management, Modal handling
 */

// ==================== SECTION 1: SIDEBAR NAVIGATION MANAGER ====================
const SidebarManager = {
    sidebar: null,
    hamburger: null,
    sidebarClose: null,
    overlay: null,
    isOpen: false,

    init() {
        this.sidebar = document.getElementById('sidebar');
        this.hamburger = document.getElementById('hamburger');
        this.sidebarClose = document.getElementById('sidebar-close');

        // Create overlay if it doesn't exist
        if (!document.querySelector('.sidebar-overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'sidebar-overlay';
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.querySelector('.sidebar-overlay');
        }

        this.bindEvents();
    },

    bindEvents() {
        // Hamburger click
        if (this.hamburger) {
            this.hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }

        // Close button click
        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', (e) => {
                e.stopPropagation();
                this.close();
            });
        }

        // Overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.close();
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Close sidebar when clicking sidebar links
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.close();
            });
        });
    },

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        if (!this.sidebar || !this.overlay) return;

        this.sidebar.classList.add('active');
        this.overlay.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    },

    close() {
        if (!this.sidebar || !this.overlay) return;

        this.sidebar.classList.remove('active');
        this.overlay.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
    }
};

// ==================== SECTION 2: PANEL NAVIGATION MANAGER ====================
const PanelManager = {
    currentPanel: 'dashboard',
    panels: ['dashboard', 'verified', 'requested', 'rejected', 'suspended', 'reviews'],

    init() {
        // Get panel from URL or default to dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const panelFromUrl = urlParams.get('panel');

        if (panelFromUrl && this.panels.includes(panelFromUrl)) {
            this.currentPanel = panelFromUrl;
        }

        this.showPanel(this.currentPanel);
        this.updateActiveLink(this.currentPanel);

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.panel) {
                this.showPanel(e.state.panel, false);
            }
        });
    },

    switchPanel(panelName) {
        console.log('PanelManager.switchPanel called with:', panelName);
        console.log('Valid panels:', this.panels);
        console.log('Panel is valid:', this.panels.includes(panelName));

        if (!this.panels.includes(panelName)) {
            console.warn('Invalid panel name:', panelName);
            return;
        }

        console.log('Showing panel:', panelName);
        this.showPanel(panelName);
        this.updateActiveLink(panelName);

        // Update URL and browser history
        const url = new URL(window.location);
        url.searchParams.set('panel', panelName);
        window.history.pushState({ panel: panelName }, '', url);
        console.log('Panel switched successfully to:', panelName);
    },

    showPanel(panelName, updateHistory = true) {
        console.log('PanelManager.showPanel called with:', panelName);

        // Hide all panels
        this.panels.forEach(panel => {
            const panelEl = document.getElementById(`${panel}-panel`);
            if (panelEl) {
                panelEl.classList.remove('active');
                panelEl.classList.add('hidden');
                console.log(`Hidden panel: ${panel}-panel`);
            }
        });

        // Show selected panel
        const selectedPanel = document.getElementById(`${panelName}-panel`);
        console.log('Selected panel element:', selectedPanel);
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
            selectedPanel.classList.add('active');
            console.log(`Shown panel: ${panelName}-panel`);
        } else {
            console.error(`Panel element not found: ${panelName}-panel`);
        }

        this.currentPanel = panelName;

        // Update history if needed
        if (updateHistory) {
            const url = new URL(window.location);
            url.searchParams.set('panel', panelName);
            window.history.replaceState({ panel: panelName }, '', url);
        }
    },

    updateActiveLink(panelName) {
        // Remove active class from all sidebar links
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current panel link
        const activeLink = document.querySelector(`.sidebar-link[onclick*="${panelName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
};

// ==================== SECTION 3: THEME MANAGER ====================
const ThemeManager = {
    currentTheme: 'light',
    themeToggleBtn: null,

    init() {
        this.themeToggleBtn = document.getElementById('theme-toggle-btn');

        // Load saved theme or default to light
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(this.currentTheme);

        // Bind toggle button
        if (this.themeToggleBtn) {
            this.themeToggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        localStorage.setItem('theme', this.currentTheme);
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;

        // Update body background
        if (theme === 'dark') {
            document.body.style.backgroundColor = '#1E1E1E';
            document.documentElement.style.backgroundColor = '#1E1E1E';
        } else {
            document.body.style.backgroundColor = '#ffffff';
            document.documentElement.style.backgroundColor = '#ffffff';
        }
    }
};

// ==================== SECTION 4: MODAL MANAGER ====================
const ModalManager = {
    modals: {
        'edit-profile-modal': null,
        'upload-profile-modal': null,
        'upload-cover-modal': null,
        'tutor-review-modal': null
    },

    init() {
        // Get all modal elements
        Object.keys(this.modals).forEach(modalId => {
            this.modals[modalId] = document.getElementById(modalId);
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    },

    openModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            document.body.style.overflow = '';
        }
    },

    closeAllModals() {
        Object.keys(this.modals).forEach(modalId => {
            this.closeModal(modalId);
        });
    }
};

// ==================== SECTION 5: GLOBAL WINDOW FUNCTIONS ====================
// These functions are called by HTML onclick attributes

// Panel Switching
window.switchPanel = function(panelName) {
    PanelManager.switchPanel(panelName);
};

// Profile Modals
// NOTE: Profile modal functions (openEditProfileModal, closeEditProfileModal,
// openUploadProfileModal, closeUploadProfileModal, openUploadCoverModal, closeUploadCoverModal)
// are defined in manage-tutor-documents-profile.js to ensure proper data population
// Do NOT redefine them here to avoid conflicts - those functions handle:
// - Loading data from admin_profile and manage_tutors_profile tables
// - Populating form fields correctly
// - Handling image uploads with proper admin_id

// Tutor Review Modal
window.openTutorReviewModal = function(tutorId) {
    ModalManager.openModal('tutor-review-modal');
    console.log('Review tutor:', tutorId);
};

window.closeTutorReviewModal = function() {
    ModalManager.closeModal('tutor-review-modal');
};

// Sidebar Actions
window.openSchoolReports = function() {
    alert('School Reports feature - Coming soon!');
};

window.openVerificationGuidelines = function() {
    alert('Verification Guidelines - Coming soon!');
};

window.openSchoolSettings = function() {
    alert('School Settings - Coming soon!');
};

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../index.html';
    }
};

// Profile Update Handler, Preview, and Upload functions
// NOTE: All profile-related functions (handleProfileUpdate, previewProfilePicture,
// handleProfilePictureUpload, previewCoverImage, handleCoverImageUpload)
// are defined in manage-tutor-documents-profile.js with proper API integration
// Do NOT redefine them here

// Cover Image Upload functions also defined in manage-tutor-documents-profile.js
// (covered by the note above)

// ==================== SECTION 6: INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all managers
    SidebarManager.init();
    PanelManager.init();
    ThemeManager.init();
    ModalManager.init();

    console.log('Manage Tutors - Standalone Navigation Initialized');
});
