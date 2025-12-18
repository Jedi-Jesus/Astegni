/**
 * MANAGE ADMINS - STANDALONE NAVIGATION & PANEL MANAGEMENT
 * Complete standalone script for manage-admins.html
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
    panels: ['dashboard', 'active', 'invite', 'pending', 'rejected', 'suspended', 'reviews', 'activity', 'roles', 'portfolio', 'settings'],

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
        'invite-admin-modal': null,
        'admin-details-modal': null,
        'edit-admin-role-modal': null,
        'suspend-admin-modal': null,
        'revoke-admin-modal': null,
        'logout-modal': null,
        'edit-profile-modal': null,
        'upload-profile-modal': null,
        'upload-cover-modal': null
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

// ==================== SECTION 5: PROFILE DROPDOWN MANAGER ====================
const ProfileDropdownManager = {
    dropdownToggle: null,
    dropdownMenu: null,
    isOpen: false,

    init() {
        this.dropdownToggle = document.getElementById('profile-dropdown-toggle');
        this.dropdownMenu = document.getElementById('profile-dropdown-menu');

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (this.isOpen && this.dropdownToggle && this.dropdownMenu) {
                if (!this.dropdownToggle.contains(e.target) && !this.dropdownMenu.contains(e.target)) {
                    this.close();
                }
            }
        });

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
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
        if (!this.dropdownMenu) return;
        this.dropdownMenu.classList.remove('hidden');
        this.isOpen = true;
    },

    close() {
        if (!this.dropdownMenu) return;
        this.dropdownMenu.classList.add('hidden');
        this.isOpen = false;
    }
};

// ==================== SECTION 6: GLOBAL WINDOW FUNCTIONS ====================
// These functions are called by HTML onclick attributes

// Theme Toggle - Called from HTML onclick
window.toggleTheme = function() {
    ThemeManager.toggleTheme();

    // Update theme icons
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    if (ThemeManager.currentTheme === 'dark') {
        if (moonIcon) moonIcon.style.display = 'none';
        if (sunIcon) sunIcon.style.display = 'inline';
    } else {
        if (moonIcon) moonIcon.style.display = 'inline';
        if (sunIcon) sunIcon.style.display = 'none';
    }
};

// Profile Dropdown Toggle - Called from HTML onclick
window.toggleProfileDropdown = function() {
    ProfileDropdownManager.toggle();
};

// Panel Switching
window.switchPanel = function(panelName) {
    PanelManager.switchPanel(panelName);
};

// ==================== SECTION 7: INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    SidebarManager.init();
    PanelManager.init();
    ThemeManager.init();
    ModalManager.init();
    ProfileDropdownManager.init();

    // Apply saved theme on load
    const savedTheme = localStorage.getItem('theme') || 'light';
    ThemeManager.applyTheme(savedTheme);

    // Update theme icons based on current theme
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    if (savedTheme === 'dark') {
        if (moonIcon) moonIcon.style.display = 'none';
        if (sunIcon) sunIcon.style.display = 'inline';
    } else {
        if (moonIcon) moonIcon.style.display = 'inline';
        if (sunIcon) sunIcon.style.display = 'none';
    }

    // Initialize search functionality
    initializeSearch();

    // Initialize filter functionality
    initializeFilters();

    console.log('Manage Admins page initialized successfully');
});

// ==================== SECTION 8: SEARCH & FILTER FUNCTIONALITY ====================
function initializeSearch() {
    const searchInput = document.getElementById('admin-search');
    if (searchInput) {
        let debounceTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                filterAdmins();
            }, 300);
        });
    }
}

function initializeFilters() {
    const statusFilter = document.getElementById('admin-status-filter');
    const roleFilter = document.getElementById('admin-role-filter');

    if (statusFilter) {
        statusFilter.addEventListener('change', filterAdmins);
    }

    if (roleFilter) {
        roleFilter.addEventListener('change', filterAdmins);
    }
}

function filterAdmins() {
    const searchValue = document.getElementById('admin-search')?.value.toLowerCase() || '';
    const statusValue = document.getElementById('admin-status-filter')?.value || '';
    const roleValue = document.getElementById('admin-role-filter')?.value || '';

    const tableRows = document.querySelectorAll('#active-admins-table tr');

    tableRows.forEach(row => {
        const name = row.querySelector('td:first-child')?.textContent.toLowerCase() || '';
        const role = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
        const status = row.querySelector('td:nth-child(3)')?.textContent.toLowerCase() || '';

        let showRow = true;

        // Search filter
        if (searchValue && !name.includes(searchValue)) {
            showRow = false;
        }

        // Status filter
        if (statusValue && !status.includes(statusValue.toLowerCase())) {
            showRow = false;
        }

        // Role filter
        if (roleValue && !role.includes(roleValue.replace('-', ' ').toLowerCase())) {
            showRow = false;
        }

        row.style.display = showRow ? '' : 'none';
    });
}

// ==================== SECTION 9: DATA LOADING (Placeholder) ====================
// These functions would connect to the backend API in production

function loadAdminStats() {
    // In production, this would fetch from API
    // For now, the stats are hardcoded in HTML
    console.log('Loading admin stats...');
}

function loadActiveAdmins() {
    // In production, this would fetch from API
    console.log('Loading active admins...');
}

function loadPendingInvitations() {
    // In production, this would fetch from API
    console.log('Loading pending invitations...');
}

function loadSuspendedAdmins() {
    // In production, this would fetch from API
    console.log('Loading suspended admins...');
}

function loadActivityLog() {
    // In production, this would fetch from API
    console.log('Loading activity log...');
}

// ==================== SECTION 10: SETTINGS PANEL FUNCTIONS ====================
// Placeholder functions for settings cards

window.openVerifyPersonalInfoModal = function() {
    console.log('Verify Personal Information - Coming Soon');
    // TODO: Implement verification modal
};

window.openAddPaymentMethodModal = function() {
    console.log('Add Payment Method - Coming Soon');
    // TODO: Implement payment method modal
};

window.openLeaveRequestModal = function() {
    console.log('File Leave Request - Coming Soon');
    // TODO: Implement leave request modal
};

window.openResignModal = function() {
    console.log('Resign - Coming Soon');
    // TODO: Implement resignation modal
};
