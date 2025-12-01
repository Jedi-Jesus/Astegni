/**
 * Manage Tutors - Data Loading from Database
 * Loads tutors from backend API for different status panels
 */

// Use existing API_BASE_URL if defined, otherwise set it
if (typeof API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'https://api.astegni.com';
}

/**
 * Load pending tutors from database
 */
async function loadPendingTutors(page = 1, search = '') {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        let url = `${API_BASE_URL}/api/admin/tutors/pending?page=${page}&limit=15`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load pending tutors: ${response.status}`);
        }

        const data = await response.json();

        // Render the tutors in the table
        renderPendingTutors(data.tutors, search);

        // Update stats if available
        updatePanelStats('requested', data.total);

        // Show search results message
        if (search) {
            showSearchResultsMessage('requested-panel', data.tutors.length, search);
        }

    } catch (error) {
        console.error('Error loading pending tutors:', error);
        showErrorMessage('requested-panel', 'Failed to load pending tutors');
    }
}

/**
 * Load verified tutors from database
 */
async function loadVerifiedTutors(page = 1, search = '') {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        let url = `${API_BASE_URL}/api/admin/tutors/verified?page=${page}&limit=15`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load verified tutors: ${response.status}`);
        }

        const data = await response.json();

        // Render the tutors in the table
        renderVerifiedTutors(data.tutors, search);

        // Update stats
        updatePanelStats('verified', data.total);

        // Show search results message
        if (search) {
            showSearchResultsMessage('verified-panel', data.tutors.length, search);
        }

    } catch (error) {
        console.error('Error loading verified tutors:', error);
        showErrorMessage('verified-panel', 'Failed to load verified tutors');
    }
}

/**
 * Load rejected tutors from database
 */
async function loadRejectedTutors(page = 1, search = '') {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        let url = `${API_BASE_URL}/api/admin/tutors/rejected?page=${page}&limit=15`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load rejected tutors: ${response.status}`);
        }

        const data = await response.json();

        // Render the tutors in the table
        renderRejectedTutors(data.tutors, search);

        // Update stats
        updatePanelStats('rejected', data.total);

        // Show search results message
        if (search) {
            showSearchResultsMessage('rejected-panel', data.tutors.length, search);
        }

    } catch (error) {
        console.error('Error loading rejected tutors:', error);
        showErrorMessage('rejected-panel', 'Failed to load rejected tutors');
    }
}

/**
 * Load suspended tutors from database
 */
async function loadSuspendedTutors(page = 1, search = '') {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        let url = `${API_BASE_URL}/api/admin/tutors/suspended?page=${page}&limit=15`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load suspended tutors: ${response.status}`);
        }

        const data = await response.json();

        // Render the tutors in the table
        renderSuspendedTutors(data.tutors, search);

        // Update stats
        updatePanelStats('suspended', data.total);

        // Show search results message
        if (search) {
            showSearchResultsMessage('suspended-panel', data.tutors.length, search);
        }

    } catch (error) {
        console.error('Error loading suspended tutors:', error);
        showErrorMessage('suspended-panel', 'Failed to load suspended tutors');
    }
}

/**
 * Render pending tutors in the table
 */
function renderPendingTutors(tutors, searchTerm = '') {
    const tableBody = document.querySelector('#requested-panel tbody');
    if (!tableBody) return;

    if (tutors.length === 0) {
        const message = searchTerm
            ? `No tutors found matching "${searchTerm}"`
            : 'No pending tutor requests';
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="p-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>${message}</p>
                    ${searchTerm ? '<button onclick="clearSearch(\'requested\')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Clear Search</button>' : ''}
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = tutors.map(tutor => {
        const highlightedName = highlightSearchTerm(tutor.name, searchTerm);
        const highlightedLocation = highlightSearchTerm(tutor.location || 'Not specified', searchTerm);

        return `
        <tr class="hover:bg-gray-50">
            <td class="p-4">
                <div>
                    <div class="font-semibold">${highlightedName}</div>
                    <div class="text-sm text-gray-500">ID: ${tutor.id}</div>
                </div>
            </td>
            <td class="p-4">${tutor.courses ? tutor.courses.join(', ') : 'Not specified'}</td>
            <td class="p-4">${highlightedLocation}</td>
            <td class="p-4">${formatDate(tutor.created_at)}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    ${tutor.id_document_url ? 'Complete' : 'Pending'}
                </span>
            </td>
            <td class="p-4">
                <div class="flex gap-2">
                    <button onclick="reviewTutorRequest(${tutor.id}, 'requested')"
                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        <i class="fas fa-eye mr-1"></i>View
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

/**
 * Render verified tutors in the table
 */
function renderVerifiedTutors(tutors, searchTerm = '') {
    const tableBody = document.querySelector('#verified-panel tbody');
    if (!tableBody) return;

    if (tutors.length === 0) {
        const message = searchTerm
            ? `No tutors found matching "${searchTerm}"`
            : 'No verified tutors found';
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="p-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>${message}</p>
                    ${searchTerm ? '<button onclick="clearSearch(\'verified\')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Clear Search</button>' : ''}
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = tutors.map(tutor => {
        const profileImg = tutor.profile_picture ||
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='40' height='40' fill='%23e5e7eb'/%3E%3C/svg%3E";

        const rating = tutor.rating || 0;
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));

        const highlightedName = highlightSearchTerm(tutor.name, searchTerm);
        const highlightedLocation = highlightSearchTerm(tutor.location || '-', searchTerm);

        return `
            <tr class="hover:bg-gray-50">
                <td class="p-4">
                    <div class="flex items-center gap-3">
                        <img src="${profileImg}" alt="Tutor"
                            class="w-10 h-10 rounded">
                        <div>
                            <div class="font-semibold">${highlightedName}</div>
                            <div class="text-sm text-gray-500">ID: ${tutor.id}</div>
                        </div>
                    </div>
                </td>
                <td class="p-4">${tutor.courses ? tutor.courses.join(', ') : '-'}</td>
                <td class="p-4">${highlightedLocation}</td>
                <td class="p-4">${tutor.total_students || 0}</td>
                <td class="p-4">
                    <div class="flex items-center gap-1">
                        <span class="text-yellow-500">${stars}</span>
                        <span class="text-sm">(${rating.toFixed(1)})</span>
                    </div>
                </td>
                <td class="p-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Verified</span>
                </td>
                <td class="p-4">
                    <div class="flex gap-2">
                        <button onclick="reviewTutorRequest(${tutor.id}, 'verified')"
                            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            title="View details">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Render rejected tutors in the table
 */
function renderRejectedTutors(tutors, searchTerm = '') {
    const tableBody = document.querySelector('#rejected-panel tbody');
    if (!tableBody) return;

    if (tutors.length === 0) {
        const message = searchTerm
            ? `No tutors found matching "${searchTerm}"`
            : 'No rejected tutors';
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>${message}</p>
                    ${searchTerm ? '<button onclick="clearSearch(\'rejected\')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Clear Search</button>' : ''}
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = tutors.map(tutor => {
        const highlightedName = highlightSearchTerm(tutor.name, searchTerm);
        const highlightedCourses = tutor.courses ? highlightSearchTerm(tutor.courses.join(', '), searchTerm) : '-';

        return `
        <tr class="hover:bg-gray-50">
            <td class="p-4">
                <div>
                    <div class="font-semibold">${highlightedName}</div>
                    <div class="text-sm text-gray-500">ID: ${tutor.id}</div>
                </div>
            </td>
            <td class="p-4">${highlightedCourses}</td>
            <td class="p-4">${formatDate(tutor.updated_at)}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800"
                      title="${tutor.rejection_reason || 'No reason provided'}">
                    ${truncateText(tutor.rejection_reason || 'No reason', 30)}
                </span>
            </td>
            <td class="p-4">
                <div class="flex gap-2">
                    <button onclick="reviewTutorRequest(${tutor.id}, 'rejected')"
                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        title="View details">
                        <i class="fas fa-eye mr-1"></i>View
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

/**
 * Render suspended tutors in the table
 */
function renderSuspendedTutors(tutors, searchTerm = '') {
    const tableBody = document.querySelector('#suspended-panel tbody');
    if (!tableBody) return;

    if (tutors.length === 0) {
        const message = searchTerm
            ? `No tutors found matching "${searchTerm}"`
            : 'No suspended tutors';
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="p-8 text-center text-gray-500">
                    <i class="fas fa-inbox text-4xl mb-2"></i>
                    <p>${message}</p>
                    ${searchTerm ? '<button onclick="clearSearch(\'suspended\')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Clear Search</button>' : ''}
                </td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = tutors.map(tutor => {
        const highlightedName = highlightSearchTerm(tutor.name, searchTerm);
        const highlightedCourses = tutor.courses ? highlightSearchTerm(tutor.courses.join(', '), searchTerm) : '-';

        return `
        <tr class="hover:bg-gray-50">
            <td class="p-4">
                <div>
                    <div class="font-semibold">${highlightedName}</div>
                    <div class="text-sm text-gray-500">ID: ${tutor.id}</div>
                </div>
            </td>
            <td class="p-4">${highlightedCourses}</td>
            <td class="p-4">${formatDate(tutor.updated_at)}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800"
                      title="${tutor.suspension_reason || 'No reason provided'}">
                    ${truncateText(tutor.suspension_reason || 'Under Review', 30)}
                </span>
            </td>
            <td class="p-4">
                <div class="flex gap-2">
                    <button onclick="reviewTutorRequest(${tutor.id}, 'suspended')"
                        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        title="View details">
                        <i class="fas fa-eye mr-1"></i>View
                    </button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

/**
 * Update panel statistics
 */
function updatePanelStats(panel, count) {
    // Update dashboard stats (main stats at top)
    const statCards = {
        'requested': document.querySelector('.dashboard-grid .card:nth-child(2) .text-2xl'),
        'verified': document.querySelector('.dashboard-grid .card:nth-child(1) .text-2xl'),
        'rejected': document.querySelector('.dashboard-grid .card:nth-child(3) .text-2xl'),
        'suspended': document.querySelector('.dashboard-grid .card:nth-child(4) .text-2xl')
    };

    if (statCards[panel]) {
        statCards[panel].textContent = count;
    }

    // Update panel-specific stats (stats within each panel)
    updateSpecificPanelStats(panel, count);
}

/**
 * Update panel-specific stat cards (the stats shown within each panel)
 */
function updateSpecificPanelStats(panel, count) {
    switch(panel) {
        case 'requested':
            // Update "Pending Requests" stat in requested panel
            const requestedStats = document.querySelector('#requested-panel-stats .card:first-child .text-2xl');
            if (requestedStats) {
                requestedStats.textContent = count;
            }
            break;

        case 'verified':
            // Update "Total Verified" stat in verified panel
            const verifiedStats = document.querySelector('#verified-panel-stats .card:first-child .text-2xl');
            if (verifiedStats) {
                verifiedStats.textContent = count;
            }
            break;

        case 'rejected':
            // Update "Total Rejected" stat in rejected panel
            const rejectedStats = document.querySelector('#rejected-panel-stats .card:first-child .text-2xl');
            if (rejectedStats) {
                rejectedStats.textContent = count;
            }
            break;

        case 'suspended':
            // Update "Currently Suspended" stat in suspended panel
            const suspendedStats = document.querySelector('#suspended-panel-stats .card:first-child .text-2xl');
            if (suspendedStats) {
                suspendedStats.textContent = count;
            }
            break;
    }
}

/**
 * Reconsider a rejected tutor (change status back to pending)
 */
async function reconsiderTutor(tutorId) {
    if (!confirm('Reconsider this application and move it back to pending?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/tutor/${tutorId}/reconsider`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to reconsider tutor: ${response.status}`);
        }

        const result = await response.json();
        showNotification('Tutor application moved back to pending for review', 'success');

        // Reload the data
        await loadRejectedTutors();
        await loadPendingTutors();
        await loadDashboardStats();

    } catch (error) {
        console.error('Error reconsidering tutor:', error);
        showNotification('Failed to reconsider tutor application', 'error');
    }
}

/**
 * Reinstate a suspended tutor
 */
async function reinstateTutor(tutorId) {
    if (!confirm('Reinstate this tutor and reactivate their account?')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/tutor/${tutorId}/reinstate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to reinstate tutor: ${response.status}`);
        }

        const result = await response.json();
        showNotification('Tutor reinstated successfully', 'success');

        // Reload the data
        await loadSuspendedTutors();
        await loadVerifiedTutors();
        await loadDashboardStats();

    } catch (error) {
        console.error('Error reinstating tutor:', error);
        showNotification('Failed to reinstate tutor', 'error');
    }
}

/**
 * Suspend a verified tutor
 */
async function suspendTutor(tutorId) {
    const reason = prompt('Please provide a reason for suspension:');
    if (!reason || !reason.trim()) {
        showNotification('Suspension reason is required', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to suspend this tutor?\n\nReason: ${reason}`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/admin/tutor/${tutorId}/suspend`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason: reason.trim() })
        });

        if (!response.ok) {
            throw new Error(`Failed to suspend tutor: ${response.status}`);
        }

        const result = await response.json();
        console.log('Tutor suspended successfully:', result);
        showNotification('Tutor suspended successfully. Switching to Suspended panel...', 'success');

        // Reload the data
        await loadVerifiedTutors();
        await loadSuspendedTutors();
        await loadDashboardStats();

        // Switch to suspended panel to show the suspended tutor
        console.log('Attempting to switch to suspended panel...');
        console.log('switchPanel function exists:', typeof switchPanel);
        console.log('window.switchPanel function exists:', typeof window.switchPanel);

        setTimeout(() => {
            if (typeof window.switchPanel === 'function') {
                console.log('Calling window.switchPanel("suspended")');
                window.switchPanel('suspended');
            } else if (typeof switchPanel === 'function') {
                console.log('Calling switchPanel("suspended")');
                switchPanel('suspended');
            } else {
                console.error('switchPanel function not found!');
            }
        }, 1000);

    } catch (error) {
        console.error('Error suspending tutor:', error);
        showNotification('Failed to suspend tutor', 'error');
    }
}

/**
 * Utility: Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white z-50 animate-fadeIn`;

    // Set background color based on type
    switch(type) {
        case 'success':
            notification.style.backgroundColor = '#10b981';
            break;
        case 'error':
            notification.style.backgroundColor = '#ef4444';
            break;
        case 'warning':
            notification.style.backgroundColor = '#f59e0b';
            break;
        default:
            notification.style.backgroundColor = '#3b82f6';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('animate-fadeOut');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Utility: Format date
 * Use window object to avoid duplicate declaration errors
 */
window.formatDate = window.formatDate || function(dateString) {
    if (!dateString) return 'Not available';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
};
const formatDate = window.formatDate;

/**
 * Utility: Truncate text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * Utility: Show error message in panel
 */
function showErrorMessage(panelId, message) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    const tableBody = panel.querySelector('tbody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="p-8 text-center text-red-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-2"></i>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg">
                        Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Utility: Show search results message
 */
function showSearchResultsMessage(panelId, count, searchTerm) {
    showNotification(`Found ${count} tutor${count !== 1 ? 's' : ''} matching "${searchTerm}"`, 'info');
}

/**
 * Utility: Highlight search term in text
 */
function highlightSearchTerm(text, searchTerm) {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #fef3c7; padding: 2px 4px; border-radius: 2px;">$1</mark>');
}

/**
 * Clear search for a specific panel
 */
function clearSearch(panelName) {
    // Clear the search input
    const searchInput = document.getElementById(`${panelName}-search-input`);
    if (searchInput) {
        searchInput.value = '';
    }

    // Clear filters
    if (window.clearPanelFilters) {
        window.clearPanelFilters();
    }

    // Reload panel data
    switch(panelName) {
        case 'verified':
            window.loadVerifiedTutors(1, '');
            break;
        case 'requested':
            window.loadPendingTutors(1, '');
            break;
        case 'rejected':
            window.loadRejectedTutors(1, '');
            break;
        case 'suspended':
            window.loadSuspendedTutors(1, '');
            break;
    }
}

/**
 * Initialize data loading when panels are switched
 * NOTE: Removed auto-loading here - panel manager will handle it
 */
console.log('Manage Tutors Data module loaded - functions ready');

// Export functions for global access
window.loadPendingTutors = loadPendingTutors;
window.loadVerifiedTutors = loadVerifiedTutors;
window.loadRejectedTutors = loadRejectedTutors;
window.loadSuspendedTutors = loadSuspendedTutors;
window.reconsiderTutor = reconsiderTutor;
window.reinstateTutor = reinstateTutor;
window.suspendTutor = suspendTutor;
window.showNotification = showNotification;
window.clearSearch = clearSearch;

// Helper function for loading dashboard stats
async function loadDashboardStats() {
    // Call the stats loading function from manage-tutors-complete.js if available
    if (window.loadDashboardStats && window.loadDashboardStats !== loadDashboardStats) {
        return await window.loadDashboardStats();
    }
    // Otherwise just reload the data
    return Promise.all([
        loadPendingTutors(),
        loadVerifiedTutors(),
        loadRejectedTutors(),
        loadSuspendedTutors()
    ]);
}
