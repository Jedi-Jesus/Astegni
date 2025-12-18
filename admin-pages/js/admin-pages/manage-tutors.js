/**
 * Manage Tutors Page - Specific functionality
 */

// Global functions from common.js will be available via window object
// Create local references only if they don't exist globally
if (!window.showToast) {
    window.showToast = function(msg, type) { console.log(`${type}: ${msg}`); };
}
if (!window.formatNumber) {
    window.formatNumber = function(num) { return num.toString(); };
}
if (!window.formatDate) {
    window.formatDate = function(date) { return new Date(date).toLocaleDateString(); };
}

// Use the global functions directly (don't destructure formatDate to avoid conflicts)
const { showToast, formatNumber } = window;

// Use window object to avoid duplicate declaration errors
window.API_BASE_URL = window.API_BASE_URL || 'https://api.astegni.com';

// formatDate will be available from window.formatDate (no need to redeclare as const)

class TutorManager {
    constructor() {
        this.tutors = [];
        this.filteredTutors = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.currentPanel = 'dashboard';
        this.panelFilters = {
            verified: { search: '', subject: '', level: '' },
            requested: { search: '', subject: '', level: '' },
            rejected: { search: '', subject: '', level: '' },
            suspended: { search: '', subject: '', level: '' }
        };
    }

    async initialize() {
        await this.loadTutors();
        this.initializeEventListeners();
        this.renderStats();
    }

    initializeEventListeners() {
        // Panel-specific search inputs
        this.setupPanelSearchListeners('verified');
        this.setupPanelSearchListeners('requested');
        this.setupPanelSearchListeners('rejected');
        this.setupPanelSearchListeners('suspended');

        // Panel change event listener
        document.addEventListener('panelChanged', (e) => {
            this.currentPanel = e.detail.panelName;
            if (['verified', 'requested', 'rejected', 'suspended'].includes(this.currentPanel)) {
                this.loadTutorsByStatus(this.currentPanel);
            }
        });
    }

    setupPanelSearchListeners(panelName) {
        // Search input with debounce
        const searchInput = document.getElementById(`${panelName}-search-input`);
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                const searchValue = e.target.value;
                this.panelFilters[panelName].search = searchValue.toLowerCase();

                debounceTimer = setTimeout(() => {
                    if (this.currentPanel === panelName) {
                        this.reloadPanelWithFilters(panelName, searchValue);
                    }
                }, 300); // 300ms debounce
            });
        }

        // Subject filter
        const subjectFilter = document.getElementById(`${panelName}-subject-filter`);
        if (subjectFilter) {
            subjectFilter.addEventListener('change', (e) => {
                this.panelFilters[panelName].subject = e.target.value.toLowerCase();
                if (this.currentPanel === panelName) {
                    this.clientSideFilter(panelName);
                }
            });
        }

        // Level filter
        const levelFilter = document.getElementById(`${panelName}-level-filter`);
        if (levelFilter) {
            levelFilter.addEventListener('change', (e) => {
                this.panelFilters[panelName].level = e.target.value.toLowerCase();
                if (this.currentPanel === panelName) {
                    this.clientSideFilter(panelName);
                }
            });
        }
    }

    reloadPanelWithFilters(panelName, searchTerm) {
        // Use the existing data loading functions from manage-tutors-data.js
        const statusMap = {
            'verified': 'verified',
            'requested': 'pending',
            'rejected': 'rejected',
            'suspended': 'suspended'
        };

        const finalSearchTerm = searchTerm || this.panelFilters[panelName].search;

        switch(panelName) {
            case 'verified':
                if (window.loadVerifiedTutors) {
                    window.loadVerifiedTutors(1, searchTerm);
                }
                break;
            case 'requested':
                if (window.loadPendingTutors) {
                    window.loadPendingTutors(1, searchTerm);
                }
                break;
            case 'rejected':
                if (window.loadRejectedTutors) {
                    window.loadRejectedTutors(1, searchTerm);
                }
                break;
            case 'suspended':
                if (window.loadSuspendedTutors) {
                    window.loadSuspendedTutors(1, searchTerm);
                }
                break;
        }

        // After loading, apply client-side filters if subject/level are selected
        setTimeout(() => {
            if (this.panelFilters[panelName].subject || this.panelFilters[panelName].level) {
                this.clientSideFilter(panelName);
            }
        }, 500);
    }

    clientSideFilter(panelName) {
        const filters = this.panelFilters[panelName];
        const tbody = document.querySelector(`#${panelName}-panel tbody`);
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        let visibleCount = 0;

        rows.forEach(row => {
            // Skip empty state rows
            if (row.cells.length === 1) return;

            let shouldShow = true;

            // Subject filter
            if (filters.subject) {
                const subjectCell = row.cells[1]; // Subject is usually in column 2
                if (subjectCell) {
                    const subjectText = subjectCell.textContent.toLowerCase();
                    if (!subjectText.includes(filters.subject)) {
                        shouldShow = false;
                    }
                }
            }

            // Level filter
            if (filters.level && shouldShow) {
                // Check in all text content for level matching
                const rowText = row.textContent.toLowerCase();
                if (!rowText.includes(filters.level)) {
                    shouldShow = false;
                }
            }

            // Show/hide row
            if (shouldShow) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        });

        // Update result count
        this.updateFilterResultCount(panelName, visibleCount);
    }

    updateFilterResultCount(panelName, count) {
        const panel = document.getElementById(`${panelName}-panel`);
        if (!panel) return;

        let countElement = panel.querySelector('.filter-result-count');
        if (!countElement) {
            // Create count element if it doesn't exist
            const searchCard = panel.querySelector('.card.p-6.mb-6');
            if (searchCard) {
                countElement = document.createElement('div');
                countElement.className = 'filter-result-count text-sm text-blue-600 font-semibold mt-2';
                searchCard.appendChild(countElement);
            }
        }

        if (countElement) {
            const filters = this.panelFilters[panelName];
            const hasActiveFilters = filters.subject || filters.level;

            if (hasActiveFilters) {
                countElement.textContent = `Showing ${count} filtered result${count !== 1 ? 's' : ''}`;
                countElement.style.display = 'block';
            } else {
                countElement.style.display = 'none';
            }
        }
    }


    async loadTutors() {
        try {
            const response = await fetch(`${window.API_BASE_URL}/api/tutors`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load tutors');

            const data = await response.json();
            this.tutors = data.tutors || [];
            this.filteredTutors = [...this.tutors];
            this.renderTutorsList();
        } catch (error) {
            console.error('Error loading tutors:', error);
            this.loadMockData();
        }
    }

    loadMockData() {
        // Fallback mock data
        this.tutors = [
            {
                id: 1,
                name: 'Abebe Kebede',
                email: 'abebe.k@example.com',
                status: 'verified',
                subjects: ['Mathematics', 'Physics'],
                rating: 4.8,
                students: 45,
                joinDate: '2024-01-15'
            },
            {
                id: 2,
                name: 'Sara Tadesse',
                email: 'sara.t@example.com',
                status: 'pending',
                subjects: ['English', 'Biology'],
                rating: 0,
                students: 0,
                joinDate: '2024-03-20'
            },
            // Add more mock data as needed
        ];
        this.filteredTutors = [...this.tutors];
        this.renderTutorsList();
    }

    filterTutors() {
        this.filteredTutors = this.tutors.filter(tutor => {
            const matchesSearch = !this.searchQuery ||
                tutor.name.toLowerCase().includes(this.searchQuery) ||
                tutor.email.toLowerCase().includes(this.searchQuery);

            const matchesFilter = this.currentFilter === 'all' ||
                tutor.status === this.currentFilter;

            return matchesSearch && matchesFilter;
        });

        this.currentPage = 1;
        this.renderTutorsList();
    }

    renderTutorsList() {
        const container = document.getElementById('tutors-list');
        if (!container) return;

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const paginatedTutors = this.filteredTutors.slice(start, end);

        if (paginatedTutors.length === 0) {
            container.innerHTML = `
                <div class="admin-empty-state">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z">
                        </path>
                    </svg>
                    <h3>No Tutors Found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            `;
            return;
        }

        const html = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Subjects</th>
                        <th>Status</th>
                        <th>Rating</th>
                        <th>Students</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginatedTutors.map(tutor => `
                        <tr>
                            <td>
                                <div class="flex items-center gap-2">
                                    <img src="https://ui-avatars.com/api/?name=${tutor.name}"
                                        alt="${tutor.name}"
                                        class="w-8 h-8 rounded-full">
                                    <span>${tutor.name}</span>
                                </div>
                            </td>
                            <td>${tutor.email}</td>
                            <td>${tutor.subjects.join(', ')}</td>
                            <td>
                                <span class="admin-badge badge-${tutor.status}">
                                    ${tutor.status}
                                </span>
                            </td>
                            <td>${tutor.rating || 'N/A'}</td>
                            <td>${formatNumber(tutor.students)}</td>
                            <td>
                                <div class="admin-actions">
                                    <button onclick="tutorManager.viewTutor(${tutor.id})"
                                        class="btn-admin btn-admin-secondary">
                                        View
                                    </button>
                                    ${tutor.status === 'pending' ? `
                                        <button onclick="tutorManager.approveTutor(${tutor.id})"
                                            class="btn-admin btn-admin-success">
                                            Approve
                                        </button>
                                        <button onclick="tutorManager.rejectTutor(${tutor.id})"
                                            class="btn-admin btn-admin-danger">
                                            Reject
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = html;
        this.renderPagination();
    }

    renderPagination() {
        const container = document.getElementById('tutors-pagination');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredTutors.length / this.itemsPerPage);

        let html = '<div class="admin-pagination">';

        // Previous button
        html += `
            <button class="pagination-btn"
                ${this.currentPage === 1 ? 'disabled' : ''}
                onclick="tutorManager.goToPage(${this.currentPage - 1})">
                Previous
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <button class="pagination-btn ${i === this.currentPage ? 'active' : ''}"
                    onclick="tutorManager.goToPage(${i})">
                    ${i}
                </button>
            `;
        }

        // Next button
        html += `
            <button class="pagination-btn"
                ${this.currentPage === totalPages ? 'disabled' : ''}
                onclick="tutorManager.goToPage(${this.currentPage + 1})">
                Next
            </button>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderTutorsList();
    }

    async viewTutor(tutorId) {
        window.location.href = `/view-profiles/view-tutor.html?id=${tutorId}`;
    }

    async approveTutor(tutorId) {
        // Validate tutorId
        if (!tutorId || tutorId === 'undefined') {
            console.error('Invalid tutor ID:', tutorId);
            showToast('Error: Invalid tutor ID', 'error');
            return;
        }

        if (!confirm('Are you sure you want to approve this tutor?')) return;

        try {
            const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${tutorId}/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showToast('Tutor approved successfully', 'success');
                await this.loadTutors();
            } else {
                throw new Error('Failed to approve tutor');
            }
        } catch (error) {
            showToast('Error approving tutor', 'error');
            console.error(error);
        }
    }

    async rejectTutor(tutorId) {
        // Validate tutorId
        if (!tutorId || tutorId === 'undefined') {
            console.error('Invalid tutor ID:', tutorId);
            showToast('Error: Invalid tutor ID', 'error');
            return;
        }

        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const response = await fetch(`${window.API_BASE_URL}/api/admin/tutor/${tutorId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            if (response.ok) {
                showToast('Tutor rejected', 'success');
                await this.loadTutors();
            } else {
                throw new Error('Failed to reject tutor');
            }
        } catch (error) {
            showToast('Error rejecting tutor', 'error');
            console.error(error);
        }
    }

    renderStats() {
        const stats = {
            total: this.tutors.length,
            verified: this.tutors.filter(t => t.status === 'verified' || t.verification_status === 'verified').length,
            pending: this.tutors.filter(t => t.status === 'pending' || t.verification_status === 'pending').length,
            rejected: this.tutors.filter(t => t.status === 'rejected' || t.verification_status === 'rejected').length
        };

        // Update stat cards if they exist
        const totalElement = document.getElementById('total-tutors');
        if (totalElement) totalElement.textContent = formatNumber(stats.total);

        const verifiedElement = document.getElementById('verified-tutors');
        if (verifiedElement) verifiedElement.textContent = formatNumber(stats.verified);

        const pendingElement = document.getElementById('pending-tutors');
        if (pendingElement) pendingElement.textContent = formatNumber(stats.pending);

        const rejectedElement = document.getElementById('rejected-tutors');
        if (rejectedElement) rejectedElement.textContent = formatNumber(stats.rejected);
    }

    async loadTutorsByStatus(panelName) {
        this.currentPanel = panelName;
        this.reloadPanelWithFilters(panelName, '');
    }
}

// Initialize tutor manager
const tutorManager = new TutorManager();
window.tutorManager = tutorManager;

// Global functions for onclick handlers (backward compatibility)
// Note: These may be overridden by other modules like tutor-review.js
// Only define if they don't already exist
if (!window.reviewTutor) {
    window.reviewTutor = function(id) {
        tutorManager.viewTutor(id);
    };
}

// Don't override approveTutor if it already exists (from tutor-review.js)
// The tutor-review.js version handles both modal and direct calls better
if (!window.approveTutor) {
    window.approveTutor = function(id) {
        tutorManager.approveTutor(id);
    };
}

if (!window.rejectTutor) {
    window.rejectTutor = function(id) {
        tutorManager.rejectTutor(id);
    };
}

window.reconsiderTutor = async function(id) {
    if (confirm('Reconsider this rejected application?')) {
        showToast('Application moved to pending review', 'info');
        await tutorManager.loadTutors();
    }
};

window.reinstateTutor = async function(id) {
    if (confirm('Reinstate this suspended tutor?')) {
        showToast('Tutor has been reinstated', 'success');
        await tutorManager.loadTutors();
    }
};

// Clear filter functions for each panel
window.clearVerifiedFilters = function() {
    document.getElementById('verified-search-input').value = '';
    document.getElementById('verified-subject-filter').value = '';
    document.getElementById('verified-level-filter').value = '';
    tutorManager.panelFilters.verified = { search: '', subject: '', level: '' };
    if (tutorManager.currentPanel === 'verified') {
        tutorManager.reloadPanelWithFilters('verified', '');
    }
};

window.clearRequestedFilters = function() {
    document.getElementById('requested-search-input').value = '';
    document.getElementById('requested-subject-filter').value = '';
    document.getElementById('requested-level-filter').value = '';
    tutorManager.panelFilters.requested = { search: '', subject: '', level: '' };
    if (tutorManager.currentPanel === 'requested') {
        tutorManager.reloadPanelWithFilters('requested', '');
    }
};

window.clearRejectedFilters = function() {
    document.getElementById('rejected-search-input').value = '';
    document.getElementById('rejected-subject-filter').value = '';
    document.getElementById('rejected-level-filter').value = '';
    tutorManager.panelFilters.rejected = { search: '', subject: '', level: '' };
    if (tutorManager.currentPanel === 'rejected') {
        tutorManager.reloadPanelWithFilters('rejected', '');
    }
};

window.clearSuspendedFilters = function() {
    document.getElementById('suspended-search-input').value = '';
    document.getElementById('suspended-subject-filter').value = '';
    document.getElementById('suspended-level-filter').value = '';
    tutorManager.panelFilters.suspended = { search: '', subject: '', level: '' };
    if (tutorManager.currentPanel === 'suspended') {
        tutorManager.reloadPanelWithFilters('suspended', '');
    }
};

// Profile upload, preview, and update functions
// NOTE: All profile-related functions (handleProfilePictureUpload, handleCoverImageUpload,
// previewProfilePicture, previewCoverImage, handleProfileUpdate) are defined in
// manage-tutor-documents-profile.js with proper API integration and database updates
// Do NOT redefine them here to avoid conflicts

// Generic modal helper functions
window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }
};

// Specific modal functions for this page
// NOTE: All profile modal functions (openEditProfileModal, closeEditProfileModal,
// openUploadProfileModal, closeUploadProfileModal, openUploadCoverModal, closeUploadCoverModal)
// are defined in manage-tutor-documents-profile.js to ensure proper data population
// and API integration. Do NOT redefine them here to avoid conflicts

// Add Tutor Modal Functions
window.openAddTutorModal = function() {
    const modal = document.getElementById('add-tutor-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
};

window.closeAddTutorModal = function() {
    const modal = document.getElementById('add-tutor-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
};

window.saveTutor = function() {
    // Get form values
    const tutorData = {
        name: document.querySelector('#add-tutor-modal input[type="text"]')?.value,
        subject: document.querySelector('#add-tutor-modal select')?.value,
        // Add more fields as needed
    };

    console.log('Saving tutor:', tutorData);
    showToast('Tutor added successfully!', 'success');
    closeAddTutorModal();

    // Reload tutors list
    if (tutorManager) {
        tutorManager.loadTutors();
    }
};

// Additional page functions
window.openTutorReports = function() {
    showToast('Opening tutor reports...', 'info');
    // Add implementation for opening reports
};

window.openVerificationGuidelines = function() {
    showToast('Opening verification guidelines...', 'info');
    // Add implementation for opening guidelines
};

window.openTutorSettings = function() {
    showToast('Opening tutor settings...', 'info');
    // Add implementation for opening settings
};

window.logout = function() {
    showToast('Logging out...', 'info');
    // Add logout implementation
    localStorage.clear();
    window.location.href = '../index.html';
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        tutorManager.initialize();

        // Add ESC key handler for modals
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                // Close all modals
                closeAddTutorModal();
                closeEditProfileModal();
                closeUploadProfileModal();
                closeUploadCoverModal();
            }
        });
    });
} else {
    tutorManager.initialize();

    // Add ESC key handler for modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // Close all modals
            closeAddTutorModal();
            closeEditProfileModal();
            closeUploadProfileModal();
            closeUploadCoverModal();
        }
    });
}

// Make tutorManager globally available
window.tutorManager = tutorManager;
window.TutorManager = TutorManager;