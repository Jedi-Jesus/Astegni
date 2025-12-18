/**
 * MANAGE CONTENTS - STANDALONE NAVIGATION & PANEL MANAGEMENT
 * Complete standalone script for manage-contents.html
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
    panels: ['dashboard', 'verified', 'requested', 'rejected', 'flagged', 'credentials'],

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

        // Update URL and browser history
        const url = new URL(window.location);
        url.searchParams.set('panel', panelName);
        window.history.pushState({ panel: panelName }, '', url);

        // Load data for non-dashboard panels
        if (panelName !== 'dashboard' && typeof loadContentTable === 'function') {
            setTimeout(() => {
                loadContentTable(panelName);
                loadPanelStatistics(panelName);
            }, 300);
        }
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
        'content-details-modal': null,
        'approve-content-modal': null,
        'reject-content-modal': null
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
window.openEditProfileModal = function() {
    ModalManager.openModal('edit-profile-modal');
};

window.closeEditProfileModal = function() {
    ModalManager.closeModal('edit-profile-modal');
};

window.openUploadProfileModal = function() {
    ModalManager.openModal('upload-profile-modal');
};

window.closeUploadProfileModal = function() {
    ModalManager.closeModal('upload-profile-modal');
};

window.openUploadCoverModal = function() {
    ModalManager.openModal('upload-cover-modal');
};

window.closeUploadCoverModal = function() {
    ModalManager.closeModal('upload-cover-modal');
};

// Content Management Modals
window.openContentDetailsModal = function(contentId) {
    ModalManager.openModal('content-details-modal');
    console.log('View content:', contentId);
};

window.closeContentDetailsModal = function() {
    ModalManager.closeModal('content-details-modal');
};

window.openApproveContentModal = function(contentId) {
    ModalManager.openModal('approve-content-modal');
    console.log('Approve content:', contentId);
};

window.closeApproveContentModal = function() {
    ModalManager.closeModal('approve-content-modal');
};

window.openRejectContentModal = function(contentId) {
    ModalManager.openModal('reject-content-modal');
    console.log('Reject content:', contentId);
};

window.closeRejectContentModal = function() {
    ModalManager.closeModal('reject-content-modal');
};

// Sidebar Actions
window.openContentGuidelines = function() {
    alert('Content Guidelines - Coming soon!');
};

window.openContentReports = function() {
    alert('Content Reports - Coming soon!');
};

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        window.location.href = '../index.html';
    }
};

// Profile Update Handler
window.handleProfileUpdate = async function(event) {
    event.preventDefault();

    // Helper to get input value
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    };

    // Get languages from checkboxes
    const languages = [];
    ['English', 'Amharic', 'Oromo', 'Tigrinya', 'Somali'].forEach(lang => {
        const checkbox = document.getElementById(`lang${lang}`);
        if (checkbox && checkbox.checked) {
            languages.push(lang);
        }
    });

    // Get hero_title and location arrays
    const heroTitles = typeof getHeroTitles === 'function' ? getHeroTitles() : [];
    const locations = typeof getLocations === 'function' ? getLocations() : [];

    const profileData = {
        username: getVal('editUsername'),
        bio: getVal('editBio'),
        quote: getVal('editQuote'),
        location: locations,
        hero_title: heroTitles,
        hero_subtitle: getVal('editHeroSubtitle'),
        languages: languages
    };

    console.log('Profile updated:', profileData);

    // TODO: Send to API when endpoint is ready
    // Close modal
    closeEditProfileModal();

    // Show success message
    alert('Profile updated successfully!');
};

// Profile Picture Upload
window.previewProfilePicture = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('profilePreview');
            const previewImg = document.getElementById('profilePreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
};

window.handleProfilePictureUpload = function() {
    const fileInput = document.getElementById('profilePictureInput');
    if (fileInput.files.length > 0) {
        console.log('Uploading profile picture:', fileInput.files[0].name);
        alert('Profile picture uploaded successfully!');
        closeUploadProfileModal();
    } else {
        alert('Please select a file first');
    }
};

// Cover Image Upload
window.previewCoverImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const preview = document.getElementById('coverPreview');
            const previewImg = document.getElementById('coverPreviewImg');
            if (preview && previewImg) {
                previewImg.src = e.target.result;
                preview.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    }
};

window.handleCoverImageUpload = function() {
    const fileInput = document.getElementById('coverImageInput');
    if (fileInput.files.length > 0) {
        console.log('Uploading cover image:', fileInput.files[0].name);
        alert('Cover image uploaded successfully!');
        closeUploadCoverModal();
    } else {
        alert('Please select a file first');
    }
};

// Content Actions
window.confirmApproveContent = function() {
    console.log('Content approved');
    alert('Content approved successfully!');
    closeApproveContentModal();
};

window.confirmRejectContent = function() {
    const reason = document.getElementById('rejectContentReason');
    if (reason && !reason.value.trim()) {
        alert('Please provide a reason for rejection');
        return;
    }
    console.log('Content rejected:', reason ? reason.value : '');
    alert('Content rejected successfully!');
    closeRejectContentModal();
};

// ==================== SECTION 6: INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all managers
    SidebarManager.init();
    PanelManager.init();
    ThemeManager.init();
    ModalManager.init();

    console.log('Manage Contents - Standalone Navigation Initialized');
});
