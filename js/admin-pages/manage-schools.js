// manage-schools.js - School Management Module with Backend Integration
// Handles all school management functionality for the admin panel

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    // Current school being processed
    let currentSchool = null;

    // Store the uploaded document file
    let schoolDocumentFile = null;

    // Store all loaded data for statistics
    let allSchoolsData = {
        requested: [],
        verified: [],
        rejected: [],
        suspended: []
    };

    // ============================================
    // DATA LOADING FUNCTIONS
    // ============================================

    async function loadRequestedSchools() {
        try {
            const schools = await SchoolAPI.getRequestedSchools();
            allSchoolsData.requested = schools;
            populateRequestedSchoolsTable(schools);
            updateStatistics();
            populateLiveWidget(); // Refresh live widget
        } catch (error) {
            console.error('Error loading requested schools:', error);
            showNotification('Failed to load requested schools', 'error');
        }
    }

    async function loadVerifiedSchools() {
        try {
            const schools = await SchoolAPI.getVerifiedSchools();
            allSchoolsData.verified = schools;
            populateVerifiedSchoolsTable(schools);
            updateStatistics();
            populateLiveWidget(); // Refresh live widget
        } catch (error) {
            console.error('Error loading verified schools:', error);
            showNotification('Failed to load verified schools', 'error');
        }
    }

    async function loadRejectedSchools() {
        try {
            const schools = await SchoolAPI.getRejectedSchools();
            allSchoolsData.rejected = schools;
            populateRejectedSchoolsTable(schools);
            updateStatistics();
            populateLiveWidget(); // Refresh live widget
        } catch (error) {
            console.error('Error loading rejected schools:', error);
            showNotification('Failed to load rejected schools', 'error');
        }
    }

    async function loadSuspendedSchools() {
        try {
            const schools = await SchoolAPI.getSuspendedSchools();
            allSchoolsData.suspended = schools;
            populateSuspendedSchoolsTable(schools);
            updateStatistics();
            populateLiveWidget(); // Refresh live widget
        } catch (error) {
            console.error('Error loading suspended schools:', error);
            showNotification('Failed to load suspended schools', 'error');
        }
    }

    // ============================================
    // TABLE POPULATION FUNCTIONS
    // ============================================

    function populateRequestedSchoolsTable(schools) {
        const tbody = document.getElementById('requestedSchoolsTableBody');
        if (!tbody) return;

        if (schools.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-500">No pending school requests</td></tr>';
            return;
        }

        tbody.innerHTML = schools.map(school => `
            <tr class="hover:bg-gray-50">
                <td class="p-4">
                    <div>
                        <div class="font-semibold">${school.school_name}</div>
                        <div class="text-sm text-gray-500">ID: ${school.id}</div>
                    </div>
                </td>
                <td class="p-4">${school.school_type}</td>
                <td class="p-4">${school.location}</td>
                <td class="p-4">${formatDate(school.submitted_date)}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${school.documents && school.documents.length > 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${school.documents && school.documents.length > 0 ? 'Complete' : 'Pending'}
                    </span>
                </td>
                <td class="p-4">
                    <button onclick="viewSchoolFromTable(${school.id}, 'requested')" title="View Details"
                        class="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function populateVerifiedSchoolsTable(schools) {
        const tbody = document.getElementById('verifiedSchoolsTableBody');
        if (!tbody) return;

        if (schools.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-500">No verified schools</td></tr>';
            return;
        }

        tbody.innerHTML = schools.map(school => `
            <tr class="hover:bg-gray-50">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e5e7eb'/%3E%3C/svg%3E"
                            alt="School" class="w-10 h-10 rounded">
                        <div>
                            <div class="font-semibold">${school.school_name}</div>
                            <div class="text-sm text-gray-500">ID: ${school.id}</div>
                        </div>
                    </div>
                </td>
                <td class="p-4">${school.school_type}</td>
                <td class="p-4">${school.location}</td>
                <td class="p-4">${school.students_count ? school.students_count.toLocaleString() : '0'}</td>
                <td class="p-4">
                    <div class="flex items-center gap-1">
                        <span class="text-yellow-500">${'★'.repeat(Math.floor(school.rating || 0))}${'☆'.repeat(5 - Math.floor(school.rating || 0))}</span>
                        <span class="text-sm">(${(school.rating || 0).toFixed(1)})</span>
                    </div>
                </td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Verified</span>
                </td>
                <td class="p-4">
                    <button onclick="viewSchoolFromTable(${school.id}, 'verified')" title="View Details"
                        class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function populateRejectedSchoolsTable(schools) {
        const tbody = document.getElementById('rejectedSchoolsTableBody');
        if (!tbody) return;

        if (schools.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">No rejected schools</td></tr>';
            return;
        }

        tbody.innerHTML = schools.map(school => `
            <tr class="hover:bg-gray-50">
                <td class="p-4">
                    <div>
                        <div class="font-semibold">${school.school_name}</div>
                        <div class="text-sm text-gray-500">ID: ${school.id}</div>
                    </div>
                </td>
                <td class="p-4">${school.school_type}</td>
                <td class="p-4">${formatDate(school.rejected_date)}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        ${school.rejection_reason ? school.rejection_reason.substring(0, 30) + '...' : 'Rejected'}
                    </span>
                </td>
                <td class="p-4">
                    <button onclick="viewSchoolFromTable(${school.id}, 'rejected')" title="View Details"
                        class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    function populateSuspendedSchoolsTable(schools) {
        const tbody = document.getElementById('suspendedSchoolsTableBody');
        if (!tbody) return;

        if (schools.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">No suspended schools</td></tr>';
            return;
        }

        tbody.innerHTML = schools.map(school => `
            <tr class="hover:bg-gray-50">
                <td class="p-4">
                    <div>
                        <div class="font-semibold">${school.school_name}</div>
                        <div class="text-sm text-gray-500">ID: ${school.id}</div>
                    </div>
                </td>
                <td class="p-4">${school.school_type}</td>
                <td class="p-4">${formatDate(school.suspended_date)}</td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                        ${school.suspension_reason ? school.suspension_reason.substring(0, 30) + '...' : 'Suspended'}
                    </span>
                </td>
                <td class="p-4">
                    <button onclick="viewSchoolFromTable(${school.id}, 'suspended')" title="View Details"
                        class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function getStatusClass(status) {
        switch(status) {
            case 'Verified':
                return 'bg-green-100 text-green-800';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'Rejected':
                return 'bg-red-100 text-red-800';
            case 'Suspended':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    // Notification helper function
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0`;

        switch(type) {
            case 'success':
                notification.className += ' bg-green-500 text-white';
                break;
            case 'warning':
                notification.className += ' bg-yellow-500 text-white';
                break;
            case 'error':
                notification.className += ' bg-red-500 text-white';
                break;
            default:
                notification.className += ' bg-blue-500 text-white';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // ============================================
    // STATISTICS UPDATE FUNCTION
    // ============================================

    function updateStatistics() {
        // Calculate counts
        const verifiedCount = allSchoolsData.verified.length;
        const pendingCount = allSchoolsData.requested.length;
        const rejectedCount = allSchoolsData.rejected.length;
        const suspendedCount = allSchoolsData.suspended.length;
        const totalCount = verifiedCount + pendingCount + rejectedCount + suspendedCount;
        const approvalRate = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

        // Calculate verified school type breakdown
        const privateCount = allSchoolsData.verified.filter(s => s.school_type === 'Private').length;
        const governmentCount = allSchoolsData.verified.filter(s => s.school_type === 'Government').length;
        const internationalCount = allSchoolsData.verified.filter(s => s.school_type === 'International').length;

        // Calculate average rating
        const avgRating = allSchoolsData.verified.length > 0
            ? (allSchoolsData.verified.reduce((sum, s) => sum + (s.rating || 0), 0) / allSchoolsData.verified.length).toFixed(1)
            : '0.0';

        // ========== DASHBOARD PANEL STATS ==========
        updateStatCard('Verified Schools', verifiedCount, 'verified');
        updateStatCard('Pending Schools', pendingCount, 'requested');
        updateStatCard('Rejected Schools', rejectedCount, 'rejected');
        updateStatCard('Suspended Schools', suspendedCount, 'suspended');
        updateStatCard('Approval Rate', approvalRate + '%', null);
        updateStatCard('Archived Schools', 89, null); // Static for now
        updateStatCard('Avg Processing', '< 1hr', null); // Static for now
        updateStatCard('Client Satisfaction', '96%', null); // Static for now

        // ========== VERIFIED PANEL STATS ==========
        updateStatCard('Total Verified', verifiedCount, 'verified');
        updateStatCard('Private', privateCount, 'verified', 'Private');
        updateStatCard('Government', governmentCount, 'verified', 'Government');
        updateStatCard('Average Rating', avgRating + '/5', null);

        // ========== REQUESTED PANEL STATS ==========
        updateStatCard('Pending Requests', pendingCount, 'requested');
        // Note: "Under Review", "Approved Today", "Average Processing Time" would need additional tracking

        // ========== REJECTED PANEL STATS ==========
        updateStatCard('Total Rejected', rejectedCount, 'rejected');
        // Note: "This Month", "Reconsidered", "Main Reason" would need date filtering & tracking

        // ========== SUSPENDED PANEL STATS ==========
        updateStatCard('Currently Suspended', suspendedCount, 'suspended');
        // Note: "Policy Violations", "Under Investigation", "Reinstated This Year" need additional tracking
    }

    function updateStatCard(title, value, targetPanel = null, filterType = null) {
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            const heading = card.querySelector('h3');
            if (heading && heading.textContent.trim() === title) {
                const valueElement = card.querySelector('.text-2xl');
                if (valueElement) {
                    valueElement.textContent = value;
                }

                // Add click handler if target panel is specified
                if (targetPanel) {
                    card.style.cursor = 'pointer';
                    card.style.transition = 'all 0.3s ease';

                    // Add hover effect
                    card.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-2px)';
                        this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    });

                    card.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0)';
                        this.style.boxShadow = '';
                    });

                    // Remove old click listener if exists
                    const oldHandler = card._clickHandler;
                    if (oldHandler) {
                        card.removeEventListener('click', oldHandler);
                    }

                    // Create new click handler
                    const clickHandler = function() {
                        // Switch to the target panel
                        if (typeof window.switchPanel === 'function') {
                            window.switchPanel(targetPanel);

                            // Apply filter if specified
                            if (filterType) {
                                setTimeout(() => {
                                    applySchoolTypeFilter(targetPanel, filterType);
                                }, 100);
                            }
                        }
                    };

                    // Store reference to handler for cleanup
                    card._clickHandler = clickHandler;

                    // Add click event
                    card.addEventListener('click', clickHandler);

                    // Add visual indicator that card is clickable
                    if (!card.querySelector('.click-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'click-indicator';
                        indicator.innerHTML = '<i class="fas fa-arrow-right text-gray-400 text-xs"></i>';
                        indicator.style.position = 'absolute';
                        indicator.style.top = '10px';
                        indicator.style.right = '10px';
                        card.style.position = 'relative';
                        card.appendChild(indicator);
                    }
                }
            }
        });
    }

    // Helper function to apply school type filter
    function applySchoolTypeFilter(panel, schoolType) {
        // Find the appropriate select element based on the panel
        let selectElement;

        if (panel === 'verified') {
            selectElement = document.querySelector('#verified-panel select');
        } else if (panel === 'requested') {
            selectElement = document.querySelector('#requested-panel select');
        } else if (panel === 'rejected') {
            selectElement = document.querySelector('#rejected-panel select');
        } else if (panel === 'suspended') {
            selectElement = document.querySelector('#suspended-panel select');
        }

        if (selectElement) {
            // Set the filter value
            selectElement.value = schoolType.toLowerCase();

            // Trigger change event to apply filter
            const event = new Event('change', { bubbles: true });
            selectElement.dispatchEvent(event);

            // Show notification
            showNotification(`Filtering by ${schoolType} schools`, 'info');

            // Filter the table data
            filterTableByType(panel, schoolType);
        }
    }

    // Function to filter table data
    function filterTableByType(panel, schoolType) {
        let tableBody;
        let data;

        switch(panel) {
            case 'verified':
                tableBody = document.getElementById('verifiedSchoolsTableBody');
                data = allSchoolsData.verified;
                break;
            case 'requested':
                tableBody = document.getElementById('requestedSchoolsTableBody');
                data = allSchoolsData.requested;
                break;
            case 'rejected':
                tableBody = document.getElementById('rejectedSchoolsTableBody');
                data = allSchoolsData.rejected;
                break;
            case 'suspended':
                tableBody = document.getElementById('suspendedSchoolsTableBody');
                data = allSchoolsData.suspended;
                break;
        }

        if (data && tableBody) {
            // Filter data by school type
            const filteredData = schoolType ?
                data.filter(s => s.school_type === schoolType) :
                data;

            // Re-populate the appropriate table
            switch(panel) {
                case 'verified':
                    populateVerifiedSchoolsTable(filteredData);
                    break;
                case 'requested':
                    populateRequestedSchoolsTable(filteredData);
                    break;
                case 'rejected':
                    populateRejectedSchoolsTable(filteredData);
                    break;
                case 'suspended':
                    populateSuspendedSchoolsTable(filteredData);
                    break;
            }
        }
    }

    // ============================================
    // MODAL FUNCTIONS - ADD SCHOOL
    // ============================================

    window.openAddSchoolModal = function() {
        const modal = document.getElementById('add-school-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            // Clear form
            document.getElementById('schoolName').value = '';
            document.getElementById('schoolType').value = '';
            document.getElementById('schoolLevel').value = '';
            document.getElementById('schoolLocation').value = '';
            document.getElementById('schoolEmail').value = '';
            document.getElementById('schoolPhone').value = '';
            schoolDocumentFile = null;
            const preview = document.getElementById('documentPreview');
            if (preview) preview.classList.add('hidden');
        }
    };

    window.closeAddSchoolModal = function() {
        const modal = document.getElementById('add-school-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.handleSchoolDocumentSelect = function(event) {
        const file = event.target.files[0];
        if (file) {
            schoolDocumentFile = file;
            // Show preview
            const preview = document.getElementById('documentPreview');
            const nameEl = document.getElementById('documentName');
            const sizeEl = document.getElementById('documentSize');

            if (preview && nameEl && sizeEl) {
                preview.classList.remove('hidden');
                nameEl.textContent = file.name;
                sizeEl.textContent = formatFileSize(file.size);
            }
        }
    };

    window.removeSchoolDocument = function() {
        schoolDocumentFile = null;
        const fileInput = document.getElementById('schoolDocument');
        if (fileInput) fileInput.value = '';
        const preview = document.getElementById('documentPreview');
        if (preview) preview.classList.add('hidden');
    };

    window.saveSchool = async function() {
        try {
            const schoolData = {
                school_name: document.getElementById('schoolName').value,
                school_type: document.getElementById('schoolType').value,
                school_level: document.getElementById('schoolLevel').value,
                location: document.getElementById('schoolLocation').value,
                email: document.getElementById('schoolEmail').value,
                phone: document.getElementById('schoolPhone').value,
                submitted_date: new Date().toISOString()
            };

            // Validate
            if (!schoolData.school_name || !schoolData.school_type || !schoolData.school_level || !schoolData.location) {
                showNotification('Please fill in all required fields', 'warning');
                return;
            }

            // Create school request
            await SchoolAPI.createSchoolRequest(schoolData);
            showNotification('School added successfully!', 'success');
            closeAddSchoolModal();

            // Reload data
            await loadRequestedSchools();
        } catch (error) {
            console.error('Error saving school:', error);
            showNotification('Failed to add school: ' + error.message, 'error');
        }
    };

    // ============================================
    // MODAL FUNCTIONS - VIEW SCHOOL
    // ============================================

    window.viewSchoolFromTable = async function(schoolId, table) {
        try {
            const school = await SchoolAPI.getSchool(schoolId, table);
            currentSchool = { ...school, table };

            const modal = document.getElementById('view-school-modal');
            const content = document.getElementById('schoolDetailsContent');
            const actionButtons = document.getElementById('modalActionButtons');

            if (modal && content) {
                // Populate school details
                content.innerHTML = `
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2">
                            <h3 class="text-2xl font-bold mb-2">${school.school_name}</h3>
                            <p class="text-gray-600">${school.location}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-sm text-gray-600">Type</p>
                            <p class="font-semibold">${school.school_type}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-sm text-gray-600">Level</p>
                            <p class="font-semibold">${school.school_level || 'N/A'}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-sm text-gray-600">Email</p>
                            <p class="font-semibold">${school.email || 'N/A'}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-sm text-gray-600">Phone</p>
                            <p class="font-semibold">${school.phone || 'N/A'}</p>
                        </div>
                        ${school.students_count ? `
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-sm text-gray-600">Students</p>
                            <p class="font-semibold">${school.students_count.toLocaleString()}</p>
                        </div>` : ''}
                        ${school.rating ? `
                        <div class="bg-gray-50 p-3 rounded">
                            <p class="text-sm text-gray-600">Rating</p>
                            <p class="font-semibold">${school.rating.toFixed(1)} / 5.0</p>
                        </div>` : ''}
                        ${school.rejection_reason ? `
                        <div class="col-span-2 bg-red-50 p-3 rounded border border-red-200">
                            <p class="text-sm text-red-600 font-semibold">Rejection Reason</p>
                            <p class="text-gray-700 mt-1">${school.rejection_reason}</p>
                        </div>` : ''}
                        ${school.suspension_reason ? `
                        <div class="col-span-2 bg-orange-50 p-3 rounded border border-orange-200">
                            <p class="text-sm text-orange-600 font-semibold">Suspension Reason</p>
                            <p class="text-gray-700 mt-1">${school.suspension_reason}</p>
                        </div>` : ''}
                    </div>
                `;

                // Populate action buttons based on source panel
                if (actionButtons) {
                    let buttonsHTML = '';

                    switch(table) {
                        case 'requested':
                            buttonsHTML = `
                                <button onclick="approveSchoolFromModal(${school.id}, '${school.school_name.replace(/'/g, "\\'")}')"
                                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                    <i class="fas fa-check mr-1"></i> Approve
                                </button>
                                <button onclick="rejectSchoolFromModal(${school.id}, '${school.school_name.replace(/'/g, "\\'")}')"
                                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                                    <i class="fas fa-times mr-1"></i> Reject
                                </button>
                            `;
                            break;

                        case 'verified':
                            buttonsHTML = `
                                <button onclick="editSchoolFromModal(${school.id})"
                                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                                    <i class="fas fa-edit mr-1"></i> Edit
                                </button>
                                <button onclick="suspendSchoolFromModal(${school.id}, '${school.school_name.replace(/'/g, "\\'")}')"
                                    class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                                    <i class="fas fa-ban mr-1"></i> Suspend
                                </button>
                                <button onclick="rejectSchoolFromModal(${school.id}, '${school.school_name.replace(/'/g, "\\'")}')"
                                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                                    <i class="fas fa-times mr-1"></i> Reject
                                </button>
                            `;
                            break;

                        case 'rejected':
                            buttonsHTML = `
                                <button onclick="reconsiderSchoolFromModal(${school.id})"
                                    class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                                    <i class="fas fa-undo mr-1"></i> Reconsider
                                </button>
                            `;
                            break;

                        case 'suspended':
                            buttonsHTML = `
                                <button onclick="reinstateSchoolFromModal(${school.id})"
                                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                                    <i class="fas fa-check-circle mr-1"></i> Reinstate
                                </button>
                                <button onclick="rejectSchoolFromModal(${school.id}, '${school.school_name.replace(/'/g, "\\'")}')"
                                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                                    <i class="fas fa-ban mr-1"></i> Reject
                                </button>
                            `;
                            break;
                    }

                    actionButtons.innerHTML = buttonsHTML;
                }

                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        } catch (error) {
            console.error('Error viewing school:', error);
            showNotification('Failed to load school details', 'error');
        }
    };

    window.closeViewSchoolModal = function() {
        const modal = document.getElementById('view-school-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    // ============================================
    // MODAL FUNCTIONS - EDIT SCHOOL
    // ============================================

    window.editSchoolFromTable = async function(schoolId) {
        try {
            const school = await SchoolAPI.getSchool(schoolId, 'verified');
            currentSchool = { ...school, table: 'verified' };

            // Populate form
            document.getElementById('editSchoolId').value = school.id;
            document.getElementById('editSchoolName').value = school.school_name;
            document.getElementById('editSchoolType').value = school.school_type;
            document.getElementById('editSchoolLevel').value = school.school_level || '';
            document.getElementById('editSchoolLocation').value = school.location;
            document.getElementById('editSchoolEmail').value = school.email || '';
            document.getElementById('editSchoolPhone').value = school.phone || '';
            document.getElementById('editSchoolStudents').value = school.students_count || '';

            const modal = document.getElementById('edit-school-modal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        } catch (error) {
            console.error('Error loading school for edit:', error);
            showNotification('Failed to load school details', 'error');
        }
    };

    window.closeEditSchoolModal = function() {
        const modal = document.getElementById('edit-school-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.handleSchoolUpdate = async function(event) {
        event.preventDefault();

        try {
            const schoolId = document.getElementById('editSchoolId').value;
            const updateData = {
                school_name: document.getElementById('editSchoolName').value,
                school_type: document.getElementById('editSchoolType').value,
                school_level: document.getElementById('editSchoolLevel').value,
                location: document.getElementById('editSchoolLocation').value,
                email: document.getElementById('editSchoolEmail').value,
                phone: document.getElementById('editSchoolPhone').value,
                students_count: parseInt(document.getElementById('editSchoolStudents').value) || 0
            };

            await SchoolAPI.updateSchool(schoolId, updateData);
            showNotification('School updated successfully!', 'success');
            closeEditSchoolModal();
            await loadVerifiedSchools();
        } catch (error) {
            console.error('Error updating school:', error);
            showNotification('Failed to update school: ' + error.message, 'error');
        }
    };

    // ============================================
    // MODAL FUNCTIONS - APPROVE SCHOOL
    // ============================================

    window.approveSchoolFromTable = function(schoolId, schoolName) {
        currentSchool = { id: schoolId, school_name: schoolName };

        document.getElementById('approveSchoolId').value = schoolId;
        document.getElementById('approveSchoolName').textContent = schoolName;

        const modal = document.getElementById('approve-school-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeApproveSchoolModal = function() {
        const modal = document.getElementById('approve-school-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.confirmApproveSchool = async function() {
        try {
            const schoolId = document.getElementById('approveSchoolId').value;
            await SchoolAPI.approveSchool(schoolId);
            showNotification('School approved successfully!', 'success');
            closeApproveSchoolModal();

            // Reload both requested and verified
            await loadRequestedSchools();
            await loadVerifiedSchools();
        } catch (error) {
            console.error('Error approving school:', error);
            showNotification('Failed to approve school: ' + error.message, 'error');
        }
    };

    // ============================================
    // MODAL FUNCTIONS - REJECT SCHOOL
    // ============================================

    window.rejectSchoolFromTable = function(schoolId, schoolName) {
        currentSchool = { id: schoolId, school_name: schoolName };

        document.getElementById('rejectSchoolId').value = schoolId;
        document.getElementById('rejectSchoolName').textContent = schoolName;
        document.getElementById('rejectSchoolReason').value = '';

        const modal = document.getElementById('reject-school-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeRejectSchoolModal = function() {
        const modal = document.getElementById('reject-school-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.confirmRejectSchool = async function() {
        try {
            const schoolId = document.getElementById('rejectSchoolId').value;
            const reason = document.getElementById('rejectSchoolReason').value;

            if (!reason.trim()) {
                showNotification('Please provide a rejection reason', 'warning');
                return;
            }

            // Check if this is from verified table (from currentSchool.table)
            if (currentSchool && currentSchool.table === 'verified') {
                await SchoolAPI.rejectVerifiedSchool(schoolId, reason);
                showNotification('Verified school rejected successfully', 'success');
                closeRejectSchoolModal();
                await loadVerifiedSchools();
                await loadRejectedSchools();
            } else {
                // Default: reject from requested table
                await SchoolAPI.rejectSchool(schoolId, reason);
                showNotification('School rejected successfully', 'success');
                closeRejectSchoolModal();
                await loadRequestedSchools();
                await loadRejectedSchools();
            }
        } catch (error) {
            console.error('Error rejecting school:', error);
            showNotification('Failed to reject school: ' + error.message, 'error');
        }
    };

    // ============================================
    // ACTION FUNCTIONS
    // ============================================

    window.suspendSchoolFromTable = async function(schoolId) {
        const reason = prompt('Enter suspension reason:');
        if (!reason) return;

        try {
            await SchoolAPI.suspendSchool(schoolId, reason);
            showNotification('School suspended successfully', 'success');
            await loadVerifiedSchools();
            await loadSuspendedSchools();
        } catch (error) {
            console.error('Error suspending school:', error);
            showNotification('Failed to suspend school: ' + error.message, 'error');
        }
    };

    window.reconsiderSchoolFromTable = async function(schoolId) {
        if (!confirm('Reconsider this school application? It will be moved back to pending requests.')) return;

        try {
            // Check if this is from verified table (from currentSchool.table)
            if (currentSchool && currentSchool.table === 'verified') {
                await SchoolAPI.reconsiderVerifiedSchool(schoolId);
                showNotification('Verified school moved to pending', 'success');
                await loadVerifiedSchools();
                await loadRequestedSchools();
            } else {
                // Default: reconsider from rejected table
                await SchoolAPI.reconsiderSchool(schoolId);
                showNotification('School reconsidered - moved to pending', 'success');
                await loadRejectedSchools();
                await loadRequestedSchools();
            }
        } catch (error) {
            console.error('Error reconsidering school:', error);
            showNotification('Failed to reconsider school: ' + error.message, 'error');
        }
    };

    window.reinstateSchoolFromTable = async function(schoolId) {
        if (!confirm('Reinstate this school? It will be moved back to verified schools.')) return;

        try {
            await SchoolAPI.reinstateSchool(schoolId);
            showNotification('School reinstated successfully', 'success');
            await loadSuspendedSchools();
            await loadVerifiedSchools();
        } catch (error) {
            console.error('Error reinstating school:', error);
            showNotification('Failed to reinstate school: ' + error.message, 'error');
        }
    };

    window.deleteSchoolFromTable = async function(schoolId, table) {
        if (!confirm('Permanently delete this school? This action cannot be undone!')) return;

        try {
            await SchoolAPI.deleteSchool(schoolId, table);
            showNotification('School deleted permanently', 'success');

            // Reload appropriate table
            if (table === 'rejected') await loadRejectedSchools();
            if (table === 'suspended') await loadSuspendedSchools();
        } catch (error) {
            console.error('Error deleting school:', error);
            showNotification('Failed to delete school: ' + error.message, 'error');
        }
    };

    // ============================================
    // MODAL ACTION FUNCTIONS
    // ============================================

    window.approveSchoolFromModal = function(schoolId, schoolName) {
        closeViewSchoolModal();
        approveSchoolFromTable(schoolId, schoolName);
    };

    window.rejectSchoolFromModal = function(schoolId, schoolName) {
        // Preserve the table context from currentSchool
        const table = currentSchool ? currentSchool.table : 'requested';
        closeViewSchoolModal();

        // Set up rejection modal with table context
        document.getElementById('rejectSchoolId').value = schoolId;
        document.getElementById('rejectSchoolName').textContent = schoolName;
        document.getElementById('rejectSchoolReason').value = '';

        // Ensure currentSchool has the table property for confirmRejectSchool
        currentSchool = { id: schoolId, school_name: schoolName, table: table };

        const modal = document.getElementById('reject-school-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.reconsiderSchoolFromModal = async function(schoolId) {
        closeViewSchoolModal();
        await reconsiderSchoolFromTable(schoolId);
    };

    window.reinstateSchoolFromModal = async function(schoolId) {
        closeViewSchoolModal();
        await reinstateSchoolFromTable(schoolId);
    };

    window.suspendSchoolFromModal = function(schoolId, schoolName) {
        closeViewSchoolModal();
        suspendSchoolFromTable(schoolId);
    };

    window.editSchoolFromModal = function(schoolId) {
        closeViewSchoolModal();
        // Open edit modal
        editSchoolFromTable(schoolId);
    };

    window.deleteSchoolFromModal = async function(schoolId, table, schoolName) {
        closeViewSchoolModal();
        if (!confirm(`Are you sure you want to permanently delete "${schoolName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await SchoolAPI.deleteSchool(schoolId, table);
            showNotification(`School "${schoolName}" deleted successfully`, 'success');

            // Reload appropriate table
            switch(table) {
                case 'requested':
                    await loadRequestedSchools();
                    break;
                case 'verified':
                    await loadVerifiedSchools();
                    break;
                case 'rejected':
                    await loadRejectedSchools();
                    break;
                case 'suspended':
                    await loadSuspendedSchools();
                    break;
            }
        } catch (error) {
            console.error('Error deleting school:', error);
            showNotification('Failed to delete school: ' + error.message, 'error');
        }
    };

    // ============================================
    // PROFILE MODAL FUNCTIONS
    // ============================================

    let currentAdminProfile = null;

    window.openEditProfileModal = async function() {
        const modal = document.getElementById('edit-profile-modal');
        if (!modal) {
            console.error('Edit profile modal not found');
            return;
        }

        // Get admin email
        const adminEmail = window.getAdminEmailFromPage ? window.getAdminEmailFromPage() : null;
        if (!adminEmail) {
            showNotification('Could not identify logged-in admin', 'error');
            return;
        }

        console.log('Opening edit profile modal for email:', adminEmail);

        try {
            // Fetch current profile data
            const url = `${API_BASE_URL}/api/admin/manage-schools-profile/by-email/${encodeURIComponent(adminEmail)}`;
            console.log('Fetching profile from:', url);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }

            currentAdminProfile = await response.json();
            console.log('Loaded profile data:', currentAdminProfile);

            // Populate form fields
            populateEditForm(currentAdminProfile);

            // Show modal
            modal.classList.remove('hidden');
            modal.classList.add('flex');

        } catch (error) {
            console.error('Error opening edit profile modal:', error);
            showNotification('Error loading profile data', 'error');
        }
    };

    function populateEditForm(profile) {
        // Ethiopian name fields
        const firstNameInput = document.getElementById('firstNameInput');
        const fatherNameInput = document.getElementById('fatherNameInput');
        const grandfatherNameInput = document.getElementById('grandfatherNameInput');
        const adminUsernameInput = document.getElementById('adminUsernameInput');
        const emailInput = document.getElementById('emailInput');
        const phoneNumberInput = document.getElementById('phoneNumberInput');
        const bioInput = document.getElementById('bioInput');
        const quoteInput = document.getElementById('quoteInput');

        if (firstNameInput) firstNameInput.value = profile.first_name || '';
        if (fatherNameInput) fatherNameInput.value = profile.father_name || '';
        if (grandfatherNameInput) grandfatherNameInput.value = profile.grandfather_name || '';
        if (adminUsernameInput) adminUsernameInput.value = profile.username || '';
        if (emailInput) emailInput.value = profile.email || '';
        if (phoneNumberInput) phoneNumberInput.value = profile.phone_number || '';
        if (bioInput) bioInput.value = profile.bio || '';
        if (quoteInput) quoteInput.value = profile.quote || '';
    }

    window.closeEditProfileModal = function() {
        const modal = document.getElementById('edit-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.handleProfileUpdate = async function(event) {
        event.preventDefault();

        if (!currentAdminProfile || !currentAdminProfile.id) {
            showNotification('Profile data not loaded', 'error');
            return;
        }

        // Gather form data
        const updateData = {
            first_name: document.getElementById('firstNameInput').value.trim(),
            father_name: document.getElementById('fatherNameInput').value.trim(),
            grandfather_name: document.getElementById('grandfatherNameInput').value.trim(),
            phone_number: document.getElementById('phoneNumberInput').value.trim(),
            bio: document.getElementById('bioInput').value.trim(),
            quote: document.getElementById('quoteInput').value.trim()
        };

        // Validate required fields
        if (!updateData.first_name || !updateData.father_name) {
            showNotification('First name and father name are required', 'warning');
            return;
        }

        try {
            // Send update request
            const response = await fetch(`${API_BASE_URL}/api/admin/profile/${currentAdminProfile.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            const updatedProfile = await response.json();

            // Reload profile header
            if (window.reloadProfileHeader) {
                await window.reloadProfileHeader();
            }

            // Close modal
            closeEditProfileModal();

            // Show success message
            showNotification('Profile updated successfully!', 'success');

            console.log('Profile updated:', updatedProfile);

        } catch (error) {
            console.error('Error updating profile:', error);
            showNotification('Error updating profile. Please try again.', 'error');
        }
    };

    window.openUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeUploadProfileModal = function() {
        const modal = document.getElementById('upload-profile-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.previewProfilePicture = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('profilePreview');
                const img = document.getElementById('profilePreviewImg');
                if (preview && img) {
                    img.src = e.target.result;
                    preview.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    window.handleProfilePictureUpload = function() {
        showNotification('Profile picture uploaded successfully!', 'success');
        closeUploadProfileModal();
    };

    window.openUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    };

    window.closeUploadCoverModal = function() {
        const modal = document.getElementById('upload-cover-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    window.previewCoverImage = function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('coverPreview');
                const img = document.getElementById('coverPreviewImg');
                if (preview && img) {
                    img.src = e.target.result;
                    preview.classList.remove('hidden');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    window.handleCoverImageUpload = function() {
        showNotification('Cover image uploaded successfully!', 'success');
        closeUploadCoverModal();
    };

    // ============================================
    // SIDEBAR ACTION FUNCTIONS
    // ============================================

    window.openSchoolReports = function() {
        showNotification('School Reports feature coming soon!', 'info');
    };

    window.openVerificationGuidelines = function() {
        showNotification('Verification Guidelines feature coming soon!', 'info');
    };

    window.openSchoolSettings = function() {
        showNotification('School Settings feature coming soon!', 'info');
    };

    window.logout = function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '../index.html';
        }
    };

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    // Export functions to window for use in HTML onclick handlers
    window.loadRequestedSchools = loadRequestedSchools;
    window.loadVerifiedSchools = loadVerifiedSchools;
    window.loadRejectedSchools = loadRejectedSchools;
    window.loadSuspendedSchools = loadSuspendedSchools;

    // ============================================
    // RECENT REVIEWS FUNCTIONS
    // ============================================

    async function loadRecentReviews() {
        try {
            // Get admin email to fetch admin_id
            const adminEmail = window.getAdminEmailFromPage ? window.getAdminEmailFromPage() : null;
            if (!adminEmail) {
                console.error('Could not identify logged-in admin for reviews');
                return;
            }

            // Fetch admin profile to get admin_id
            const profileResponse = await fetch(`${API_BASE_URL}/api/admin/manage-schools-profile/by-email/${encodeURIComponent(adminEmail)}`);
            if (!profileResponse.ok) {
                throw new Error('Failed to fetch admin profile');
            }
            const adminProfile = await profileResponse.json();
            const adminId = adminProfile.id;

            // Fetch recent reviews filtered by admin_id and review_type='school'
            const reviewsResponse = await fetch(`${API_BASE_URL}/api/admin-reviews/recent?limit=5&admin_id=${adminId}`);
            if (!reviewsResponse.ok) {
                throw new Error('Failed to fetch reviews');
            }
            const reviewsData = await reviewsResponse.json();
            const allReviews = reviewsData.reviews || [];

            // Filter for only school-related reviews
            const schoolReviews = allReviews.filter(review => review.review_type === 'school');

            const container = document.getElementById('recentReviewsContainer');
            if (!container) return;

            if (schoolReviews.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <p>No school management reviews yet</p>
                    </div>
                `;
                return;
            }

            // Generate review HTML
            container.innerHTML = schoolReviews.map(review => {
                const borderColors = ['border-blue-500', 'border-green-500', 'border-purple-500', 'border-orange-500', 'border-indigo-500'];
                const borderColor = borderColors[Math.floor(Math.random() * borderColors.length)];
                const stars = renderStars(review.rating);
                const timeAgo = formatReviewTimeAgo(review.created_at);

                return `
                    <div class="border-l-4 ${borderColor} pl-4">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-semibold">${escapeHtml(review.comment ? review.comment.substring(0, 50) : 'Review')}</h4>
                                <p class="text-sm text-gray-600">From: ${escapeHtml(review.reviewer_name)}${review.reviewer_role ? ' - ' + escapeHtml(review.reviewer_role) : ''}</p>
                            </div>
                            <div class="flex items-center">
                                <span class="text-yellow-400">${stars}</span>
                            </div>
                        </div>
                        <p class="text-gray-700">"${escapeHtml(review.comment || 'No comment provided')}"</p>
                        <p class="text-xs text-gray-500 mt-2">${timeAgo}</p>
                    </div>
                `;
            }).join('');

        } catch (error) {
            console.error('Error loading recent reviews:', error);
            const container = document.getElementById('recentReviewsContainer');
            if (container) {
                container.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <p>Unable to load reviews</p>
                    </div>
                `;
            }
        }
    }

    function renderStars(rating) {
        const fullStars = Math.floor(rating);
        const emptyStars = 5 - fullStars;
        return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
    }

    function formatReviewTimeAgo(dateString) {
        if (!dateString) return 'Recently';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text ? text.replace(/[&<>"']/g, m => map[m]) : '';
    }

    // ============================================
    // LIVE WIDGET FUNCTIONS
    // ============================================

    async function populateLiveWidget() {
        try {
            // Fetch all schools data
            const [requested, verified, rejected, suspended] = await Promise.all([
                SchoolAPI.getRequestedSchools(),
                SchoolAPI.getVerifiedSchools(),
                SchoolAPI.getRejectedSchools(),
                SchoolAPI.getSuspendedSchools()
            ]);

            // Combine and sort by most recent
            const allSchools = [
                ...requested.map(s => ({...s, source: 'requested', statusTag: 'NEW', panel: 'requested'})),
                ...verified.map(s => ({...s, source: 'verified', statusTag: 'APPROVED', panel: 'verified'})),
                ...rejected.map(s => ({...s, source: 'rejected', statusTag: 'REJECTED', panel: 'rejected'})),
                ...suspended.map(s => ({...s, source: 'suspended', statusTag: 'SUSPENDED', panel: 'suspended'}))
            ];

            // Sort by most recent (using created_at or submitted_date)
            allSchools.sort((a, b) => {
                const dateA = new Date(a.submitted_date || a.created_at || a.approved_date);
                const dateB = new Date(b.submitted_date || b.created_at || b.approved_date);
                return dateB - dateA; // Most recent first
            });

            // Take top 5 schools
            const recentSchools = allSchools.slice(0, 5);

            if (recentSchools.length === 0) {
                console.log('No schools to display in live widget');
                return;
            }

            // Build HTML for live widget
            const schoolItems = recentSchools.map(school => {
                const icon = getSchoolIcon(school.school_type);
                const statusClass = getStatusClass(school.statusTag);
                const timeAgo = getTimeAgo(school.submitted_date || school.created_at || school.approved_date);

                return `
                    <div class="school-request-item">
                        <div class="request-content">
                            <div class="request-header">
                                <i class="${icon}"></i>
                                <span class="school-name">${school.school_name}</span>
                                <span class="status-tag ${statusClass}">${school.statusTag}</span>
                            </div>
                            <div class="request-info">
                                <span class="school-type">${school.school_type}</span>
                                <span class="location">${school.location}</span>
                            </div>
                            <div class="request-footer">
                                <span class="timestamp">${timeAgo}</span>
                                <button class="action-btn" onclick="switchPanel('${school.panel}')">
                                    ${school.source === 'requested' ? 'Review' : 'View'}
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // Duplicate for seamless scroll
            const scrollContent = schoolItems + schoolItems;

            // Update the widget
            const scrollContainer = document.querySelector('.school-requests-scroll');
            if (scrollContainer) {
                scrollContainer.innerHTML = scrollContent;
            }

        } catch (error) {
            console.error('Error populating live widget:', error);
        }
    }

    function getSchoolIcon(schoolType) {
        const icons = {
            'Private': 'fas fa-school text-blue-600',
            'Government': 'fas fa-university text-purple-600',
            'International': 'fas fa-graduation-cap text-green-600',
            'Religious': 'fas fa-church text-orange-600',
            'College': 'fas fa-book-reader text-indigo-600',
            'University': 'fas fa-university text-purple-600'
        };
        return icons[schoolType] || 'fas fa-school text-blue-600';
    }

    function getStatusClass(status) {
        const classes = {
            'NEW': 'new',
            'PENDING': 'pending',
            'APPROVED': 'approved',
            'REJECTED': 'rejected',
            'SUSPENDED': 'suspended'
        };
        return classes[status] || 'pending';
    }

    function getTimeAgo(dateString) {
        if (!dateString) return 'Recently';

        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-schools.html')) {
            console.log('School Management Module initialized');

            // Load all data
            loadRequestedSchools();
            loadVerifiedSchools();
            loadRejectedSchools();
            loadSuspendedSchools();

            // Load recent reviews
            loadRecentReviews();

            // Populate live widget with real data
            populateLiveWidget();

            // Refresh live widget every 30 seconds
            setInterval(populateLiveWidget, 30000);

            // Add keyboard shortcuts
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    closeAllModals();
                }
            });

            // Initialize panel state from URL
            const urlParams = new URLSearchParams(window.location.search);
            const panel = urlParams.get('panel');
            if (panel && typeof window.switchPanel === 'function') {
                window.switchPanel(panel);
            }

            // Setup search/filter listeners
            setupSearchFilters();
        }
    });

    function setupSearchFilters() {
        // Add search functionality for all filter inputs
        const searchInputs = document.querySelectorAll('input[type="text"][placeholder*="Search"]');
        searchInputs.forEach(input => {
            input.addEventListener('input', debounce(handleSearch, 300));
        });

        // Add filter functionality for select dropdowns
        const filterSelects = document.querySelectorAll('select');
        filterSelects.forEach(select => {
            select.addEventListener('change', handleFilter);
        });
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function handleSearch(event) {
        const searchTerm = event.target.value.toLowerCase().trim();

        // Determine which panel we're in
        const activePanel = document.querySelector('.panel-content.active');
        if (!activePanel) return;

        const panelId = activePanel.id.replace('-panel', '');

        // Get active filters (type and level selects)
        const filterSelects = activePanel.querySelectorAll('select');
        const activeFilters = {};

        filterSelects.forEach(select => {
            if (select.value) {
                const optionText = select.options[select.selectedIndex].text.toLowerCase();
                if (optionText.includes('type')) {
                    activeFilters.type = select.value;
                } else if (optionText.includes('level')) {
                    activeFilters.level = select.value;
                }
            }
        });

        // Get the data for the current panel
        let data = [];
        switch(panelId) {
            case 'verified':
                data = allSchoolsData.verified;
                break;
            case 'requested':
                data = allSchoolsData.requested;
                break;
            case 'rejected':
                data = allSchoolsData.rejected;
                break;
            case 'suspended':
                data = allSchoolsData.suspended;
                break;
        }

        // Apply filters first
        if (activeFilters.type) {
            data = data.filter(school =>
                school.school_type && school.school_type.toLowerCase() === activeFilters.type.toLowerCase()
            );
        }

        if (activeFilters.level) {
            data = data.filter(school =>
                school.school_level && school.school_level.toLowerCase() === activeFilters.level.toLowerCase().replace('-', ' ')
            );
        }

        // Apply search on top of filters
        if (searchTerm) {
            data = data.filter(school => {
                const nameMatch = school.school_name && school.school_name.toLowerCase().includes(searchTerm);
                const locationMatch = school.location && school.location.toLowerCase().includes(searchTerm);
                const typeMatch = school.school_type && school.school_type.toLowerCase().includes(searchTerm);
                const idMatch = school.id && school.id.toString().includes(searchTerm);
                const levelMatch = school.school_level && school.school_level.toLowerCase().includes(searchTerm);
                const emailMatch = school.email && school.email.toLowerCase().includes(searchTerm);

                return nameMatch || locationMatch || typeMatch || idMatch || levelMatch || emailMatch;
            });
        }

        // Populate table with filtered data
        switch(panelId) {
            case 'verified':
                populateVerifiedSchoolsTable(data);
                break;
            case 'requested':
                populateRequestedSchoolsTable(data);
                break;
            case 'rejected':
                populateRejectedSchoolsTable(data);
                break;
            case 'suspended':
                populateSuspendedSchoolsTable(data);
                break;
        }
    }

    function handleFilter(event) {
        const filterValue = event.target.value;

        // Determine which panel we're in
        const activePanel = document.querySelector('.panel-content.active');
        if (!activePanel) return;

        const panelId = activePanel.id.replace('-panel', '');

        // Get the search term if any
        const searchInput = activePanel.querySelector('input[type="text"][placeholder*="Search"]');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

        // Get the data for the current panel
        let data = [];
        switch(panelId) {
            case 'verified':
                data = allSchoolsData.verified;
                break;
            case 'requested':
                data = allSchoolsData.requested;
                break;
            case 'rejected':
                data = allSchoolsData.rejected;
                break;
            case 'suspended':
                data = allSchoolsData.suspended;
                break;
        }

        // Apply filter first
        if (filterValue && filterValue !== '') {
            data = data.filter(school => {
                const filterType = event.target.options[event.target.selectedIndex].text.toLowerCase();

                // Determine what we're filtering by based on the select
                if (filterType.includes('type') || ['private', 'government', 'international', 'religious'].includes(filterValue.toLowerCase())) {
                    return school.school_type && school.school_type.toLowerCase() === filterValue.toLowerCase();
                } else if (filterType.includes('level') || ['elementary', 'high school', 'college', 'university'].includes(filterValue.toLowerCase())) {
                    return school.school_level && school.school_level.toLowerCase() === filterValue.toLowerCase().replace('-', ' ');
                }
                return true;
            });
        }

        // Apply search on top of filter
        if (searchTerm) {
            data = data.filter(school => {
                const nameMatch = school.school_name && school.school_name.toLowerCase().includes(searchTerm);
                const locationMatch = school.location && school.location.toLowerCase().includes(searchTerm);
                const typeMatch = school.school_type && school.school_type.toLowerCase().includes(searchTerm);
                const idMatch = school.id && school.id.toString().includes(searchTerm);
                const levelMatch = school.school_level && school.school_level.toLowerCase().includes(searchTerm);
                const emailMatch = school.email && school.email.toLowerCase().includes(searchTerm);

                return nameMatch || locationMatch || typeMatch || idMatch || levelMatch || emailMatch;
            });
        }

        // Populate table with filtered/searched data
        switch(panelId) {
            case 'verified':
                populateVerifiedSchoolsTable(data);
                break;
            case 'requested':
                populateRequestedSchoolsTable(data);
                break;
            case 'rejected':
                populateRejectedSchoolsTable(data);
                break;
            case 'suspended':
                populateSuspendedSchoolsTable(data);
                break;
        }
    }

    function closeAllModals() {
        closeAddSchoolModal();
        closeEditProfileModal();
        closeUploadProfileModal();
        closeUploadCoverModal();
        closeViewSchoolModal();
        closeEditSchoolModal();
        closeApproveSchoolModal();
        closeRejectSchoolModal();
    }

})();
