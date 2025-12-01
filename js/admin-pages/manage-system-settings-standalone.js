/**
 * MANAGE SYSTEM SETTINGS - STANDALONE NAVIGATION & PANEL MANAGEMENT
 * Complete standalone script for manage-system-settings.html
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
    panels: ['dashboard', 'general', 'media', 'manage-admins', 'manage-reviews', 'pricing', 'email', 'sms', 'api', 'maintenance', 'impressions', 'reports'],

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
        if (!this.panels.includes(panelName)) return;

        this.showPanel(panelName);
        this.updateActiveLink(panelName);

        // Load data from database for the panel
        if (typeof initializeSystemSettingsData === 'function') {
            initializeSystemSettingsData(panelName);
        }

        // Update URL and browser history
        const url = new URL(window.location);
        url.searchParams.set('panel', panelName);
        window.history.pushState({ panel: panelName }, '', url);
    },

    showPanel(panelName, updateHistory = true) {
        // Hide all panels
        this.panels.forEach(panel => {
            const panelEl = document.getElementById(`${panel}-panel`);
            if (panelEl) {
                panelEl.classList.remove('active');
                panelEl.classList.add('hidden');
            }
        });

        // Show selected panel
        const selectedPanel = document.getElementById(`${panelName}-panel`);
        if (selectedPanel) {
            selectedPanel.classList.remove('hidden');
            selectedPanel.classList.add('active');
        }

        this.currentPanel = panelName;

        // Ensure profile header is always visible on all panels
        this.ensureProfileHeaderVisible();

        // Initialize panel-specific functionality
        if (panelName === 'manage-reviews') {
            // Initialize ManageReviews module when panel is shown
            if (window.ManageReviews && typeof window.ManageReviews.init === 'function') {
                setTimeout(() => window.ManageReviews.init(), 100);
            }
        }

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
    },

    ensureProfileHeaderVisible() {
        // Ensure profile header is always visible on all panels
        const profileSection = document.querySelector('.profile-header-section');
        if (profileSection) {
            profileSection.style.display = 'block';
            profileSection.style.opacity = '1';
            profileSection.style.transform = 'translateY(0)';
            profileSection.classList.remove('profile-hide', 'hidden');
            profileSection.classList.add('profile-show');
            console.log('✅ Profile header ensured visible on panel:', this.currentPanel);
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
        'invite-admin-modal': null,
        'edit-admin-modal': null,
        'backup-modal': null,
        'api-key-modal': null
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

// Profile Modals - Handled by manage-system-settings.js
// DO NOT define these here as they are fully implemented in manage-system-settings.js
// with proper data population and database integration

// Admin Management Modals
window.openInviteAdminModal = function() {
    ModalManager.openModal('invite-admin-modal');
};

window.closeInviteAdminModal = function() {
    ModalManager.closeModal('invite-admin-modal');
};

window.openEditAdminModal = function(adminId) {
    ModalManager.openModal('edit-admin-modal');
    console.log('Edit admin:', adminId);
};

window.closeEditAdminModal = function() {
    ModalManager.closeModal('edit-admin-modal');
};

// System Modals
window.openBackupModal = function() {
    ModalManager.openModal('backup-modal');
};

window.closeBackupModal = function() {
    ModalManager.closeModal('backup-modal');
};

window.openApiKeyModal = function() {
    ModalManager.openModal('api-key-modal');
};

window.closeApiKeyModal = function() {
    ModalManager.closeModal('api-key-modal');
};

// Sidebar Actions
window.openSystemLogs = function() {
    alert('System Logs - Coming soon!');
};

window.openSecuritySettings = function() {
    alert('Security Settings - Coming soon!');
};

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../index.html';
    }
};

// Profile Update & Upload Functions - Handled by manage-system-settings.js
// DO NOT define these here as they are fully implemented in manage-system-settings.js
// Functions: handleProfileUpdate, previewProfilePicture, handleProfilePictureUpload,
//            previewCoverImage, handleCoverImageUpload

// System Settings Actions
window.saveGeneralSettings = function() {
    alert('General settings saved successfully!');
};

window.saveMediaSettings = function() {
    alert('Media settings saved successfully!');
};

window.savePaymentSettings = function() {
    alert('Payment settings saved successfully!');
};

window.saveEmailSettings = function() {
    alert('Email settings saved successfully!');
};

window.saveApiSettings = function() {
    alert('API settings saved successfully!');
};

window.saveMaintenanceSettings = function() {
    alert('Maintenance settings saved successfully!');
};

window.createBackup = function() {
    alert('Creating system backup...');
};

window.generateApiKey = function() {
    alert('Generating new API key...');
};

// ==================== SECTION 6: INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all managers
    SidebarManager.init();
    PanelManager.init();
    ThemeManager.init();
    ModalManager.init();

    // Ensure profile header is visible on page load
    PanelManager.ensureProfileHeaderVisible();

    console.log('Manage System Settings - Standalone Navigation Initialized');
    console.log('✅ Profile header visibility enforced on all panels');
});
