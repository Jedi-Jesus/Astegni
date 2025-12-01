/**
 * MANAGE SCHOOLS - STANDALONE NAVIGATION & PANEL MANAGEMENT
 * Complete standalone script for manage-schools.html
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
    panels: ['dashboard', 'verified', 'requested', 'rejected', 'suspended'],

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
        'edit-profile-modal': null,
        'upload-profile-modal': null,
        'upload-cover-modal': null,
        'add-school-modal': null,
        'view-school-modal': null,
        'edit-school-modal': null,
        'approve-school-modal': null,
        'reject-school-modal': null
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

// School Modals
window.openAddSchoolModal = function() {
    ModalManager.openModal('add-school-modal');
};

window.closeAddSchoolModal = function() {
    ModalManager.closeModal('add-school-modal');
};

window.openViewSchoolModal = function(schoolId) {
    ModalManager.openModal('view-school-modal');
    // Populate modal with school data
    // This would typically fetch data from API
    console.log('View school:', schoolId);
};

window.closeViewSchoolModal = function() {
    ModalManager.closeModal('view-school-modal');
};

window.openEditSchoolModal = function(schoolId) {
    ModalManager.openModal('edit-school-modal');
    // Populate form with school data
    console.log('Edit school:', schoolId);
};

window.closeEditSchoolModal = function() {
    ModalManager.closeModal('edit-school-modal');
};

window.openApproveSchoolModal = function(schoolId) {
    ModalManager.openModal('approve-school-modal');
    document.getElementById('approveSchoolId').value = schoolId;
    // Set school name for confirmation
    console.log('Approve school:', schoolId);
};

window.closeApproveSchoolModal = function() {
    ModalManager.closeModal('approve-school-modal');
};

window.openRejectSchoolModal = function(schoolId) {
    ModalManager.openModal('reject-school-modal');
    document.getElementById('rejectSchoolId').value = schoolId;
    // Set school name for confirmation
    console.log('Reject school:', schoolId);
};

window.closeRejectSchoolModal = function() {
    ModalManager.closeModal('reject-school-modal');
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

// Profile Update Handler
window.handleProfileUpdate = function(event) {
    event.preventDefault();

    const adminName = document.getElementById('adminNameInput').value;
    const department = document.getElementById('departmentInput').value;
    const bio = document.getElementById('bioInput').value;
    const quote = document.getElementById('quoteInput').value;

    // Update profile header
    const profileName = document.getElementById('adminName');
    if (profileName) {
        profileName.textContent = adminName;
    }

    console.log('Profile updated:', { adminName, department, bio, quote });

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

// School Document Upload
window.handleSchoolDocumentSelect = function(event) {
    const file = event.target.files[0];
    if (file) {
        const preview = document.getElementById('documentPreview');
        const docName = document.getElementById('documentName');
        const docSize = document.getElementById('documentSize');

        if (preview && docName && docSize) {
            docName.textContent = file.name;
            docSize.textContent = (file.size / 1024).toFixed(2) + ' KB';
            preview.classList.remove('hidden');
        }
    }
};

window.removeSchoolDocument = function() {
    const fileInput = document.getElementById('schoolDocument');
    const preview = document.getElementById('documentPreview');

    if (fileInput) fileInput.value = '';
    if (preview) preview.classList.add('hidden');
};

// School CRUD Operations
window.saveSchool = function() {
    const schoolName = document.getElementById('schoolName').value;
    const schoolType = document.getElementById('schoolType').value;
    const schoolLevel = document.getElementById('schoolLevel').value;
    const schoolLocation = document.getElementById('schoolLocation').value;
    const schoolEmail = document.getElementById('schoolEmail').value;
    const schoolPhone = document.getElementById('schoolPhone').value;

    if (!schoolName || !schoolType || !schoolLevel || !schoolLocation || !schoolEmail || !schoolPhone) {
        alert('Please fill in all required fields');
        return;
    }

    console.log('Saving school:', {
        schoolName,
        schoolType,
        schoolLevel,
        schoolLocation,
        schoolEmail,
        schoolPhone
    });

    alert('School added successfully!');
    closeAddSchoolModal();

    // Clear form
    document.getElementById('schoolName').value = '';
    document.getElementById('schoolType').value = '';
    document.getElementById('schoolLevel').value = '';
    document.getElementById('schoolLocation').value = '';
    document.getElementById('schoolEmail').value = '';
    document.getElementById('schoolPhone').value = '';
};

window.handleSchoolUpdate = function(event) {
    event.preventDefault();

    const schoolId = document.getElementById('editSchoolId').value;
    const schoolName = document.getElementById('editSchoolName').value;
    const schoolType = document.getElementById('editSchoolType').value;
    const schoolLevel = document.getElementById('editSchoolLevel').value;
    const schoolLocation = document.getElementById('editSchoolLocation').value;

    console.log('Updating school:', schoolId, {
        schoolName,
        schoolType,
        schoolLevel,
        schoolLocation
    });

    alert('School updated successfully!');
    closeEditSchoolModal();
};

window.confirmApproveSchool = function() {
    const schoolId = document.getElementById('approveSchoolId').value;
    console.log('Approving school:', schoolId);

    alert('School approved successfully!');
    closeApproveSchoolModal();
};

window.confirmRejectSchool = function() {
    const schoolId = document.getElementById('rejectSchoolId').value;
    const reason = document.getElementById('rejectSchoolReason').value;

    if (!reason.trim()) {
        alert('Please provide a reason for rejection');
        return;
    }

    console.log('Rejecting school:', schoolId, 'Reason:', reason);

    alert('School rejected successfully!');
    closeRejectSchoolModal();
};

// ==================== SECTION 6: INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all managers
    SidebarManager.init();
    PanelManager.init();
    ThemeManager.init();
    ModalManager.init();

    console.log('Manage Schools - Standalone Navigation Initialized');
});
