/**
 * Manage Contents - Content Management JavaScript with Database Integration
 * Handles filtering, search, and actions for content management panels
 */

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'https://api.astegni.com';

// ============================================================================
// Content Data Management
// ============================================================================

const contentData = {
    requested: [],
    verified: [],
    rejected: [],
    flagged: [],
    stats: null
};

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Manage Contents initializing...');
    loadDashboardStats();
    initializeContentFilters();

    // Load content data for all panels
    loadContentByStatus('pending');
    loadContentByStatus('verified');
    loadContentByStatus('rejected');
    loadContentByStatus('suspended');
});

// ============================================================================
// API Functions
// ============================================================================

/**
 * Load dashboard statistics from API
 */
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/stats`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const stats = await response.json();
        contentData.stats = stats;

        // Update dashboard stat cards
        updateDashboardStats(stats);

        console.log('Dashboard stats loaded:', stats);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showErrorMessage('Failed to load dashboard statistics');
    }
}

/**
 * Update dashboard stat cards with real data
 */
function updateDashboardStats(stats) {
    // Find all stat cards in dashboard and update them
    const dashboardPanel = document.getElementById('dashboard-panel');
    if (!dashboardPanel) return;

    const statCards = dashboardPanel.querySelectorAll('.dashboard-grid .card');

    // Verified Contents
    if (statCards[0]) {
        statCards[0].querySelector('.text-2xl').textContent = stats.verified_contents;
        statCards[0].querySelector('.text-sm').textContent = 'Approved and published';
    }

    // Requested/Pending Contents
    if (statCards[1]) {
        statCards[1].querySelector('.text-2xl').textContent = stats.pending_contents;
        statCards[1].querySelector('.text-sm').textContent = 'Awaiting review';
    }

    // Rejected Contents
    if (statCards[2]) {
        statCards[2].querySelector('.text-2xl').textContent = stats.rejected_contents;
        statCards[2].querySelector('.text-sm').textContent = 'Quality issues';
    }

    // Flagged/Suspended Contents
    if (statCards[3]) {
        statCards[3].querySelector('.text-2xl').textContent = stats.suspended_contents;
        statCards[3].querySelector('.text-sm').textContent = 'Under investigation';
    }

    // Total Storage
    if (statCards[4]) {
        const storageMB = stats.total_storage_mb;
        const storageGB = (storageMB / 1024).toFixed(2);
        statCards[4].querySelector('.text-2xl').textContent = `${storageGB} GB`;
        statCards[4].querySelector('.text-sm').textContent = `${storageMB.toFixed(0)} MB total`;
    }

    // Approval Rate
    if (statCards[5]) {
        const totalProcessed = stats.verified_contents + stats.rejected_contents;
        const approvalRate = totalProcessed > 0
            ? ((stats.verified_contents / totalProcessed) * 100).toFixed(1)
            : 0;
        statCards[5].querySelector('.text-2xl').textContent = `${approvalRate}%`;
        statCards[5].querySelector('.text-sm').textContent = `${stats.verified_contents} approved of ${totalProcessed}`;
    }

    // Content Type Breakdown (replacing "Avg Processing")
    if (statCards[6]) {
        statCards[6].querySelector('h3').textContent = 'Total Videos';
        statCards[6].querySelector('.text-2xl').textContent = stats.total_videos;
        statCards[6].querySelector('.text-sm').textContent = 'Video content';
    }

    // Content Type Breakdown (replacing "User Satisfaction")
    if (statCards[7]) {
        statCards[7].querySelector('h3').textContent = 'Total Images';
        statCards[7].querySelector('.text-2xl').textContent = stats.total_images;
        statCards[7].querySelector('.text-sm').textContent = 'Image content';
    }
}

/**
 * Load content by verification status
 * @param {string} status - pending, verified, rejected, suspended
 */
async function loadContentByStatus(status) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents?verification_status=${status}&limit=100`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const contents = await response.json();

        // Map status to panel name
        const panelName = status === 'pending' ? 'requested' :
                          status === 'suspended' ? 'flagged' : status;

        contentData[panelName] = contents;

        // Update panel stats and table
        updatePanelStats(panelName, contents);
        renderContentTable(panelName, contents);

        console.log(`Loaded ${contents.length} ${status} contents`);
    } catch (error) {
        console.error(`Error loading ${status} contents:`, error);
        showErrorMessage(`Failed to load ${status} contents`);
    }
}

/**
 * Update panel-specific statistics
 */
function updatePanelStats(panel, contents) {
    // Count by content type
    const images = contents.filter(c => c.content_type === 'image').length;
    const videos = contents.filter(c => c.content_type === 'video').length;
    const total = contents.length;

    // Update stat cards in the panel
    const totalEl = document.getElementById(`${panel}-total-count`);
    const imagesEl = document.getElementById(`${panel}-images-count`);
    const videosEl = document.getElementById(`${panel}-videos-count`);

    if (totalEl) totalEl.textContent = total;
    if (imagesEl) imagesEl.textContent = images;
    if (videosEl) videosEl.textContent = videos;
}

/**
 * Render content table for a panel
 */
function renderContentTable(panel, contents) {
    const tbody = document.getElementById(`${panel}-content-table`);
    if (!tbody) return;

    tbody.innerHTML = '';

    if (contents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-8 text-gray-500">
                    No ${panel} contents found
                </td>
            </tr>
        `;
        return;
    }

    contents.forEach(content => {
        const row = createContentRow(content, panel);
        tbody.appendChild(row);
    });
}

/**
 * Create a table row for content
 */
function createContentRow(content, panel) {
    const tr = document.createElement('tr');
    tr.className = 'border-t hover:bg-gray-50';

    // Format file size
    const fileSizeMB = (content.file_size / (1024 * 1024)).toFixed(2);

    // Format date
    const uploadDate = new Date(content.uploaded_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    // Determine content type icon and label
    let typeIcon = '';
    let typeLabel = '';
    let typeBadgeClass = '';

    if (content.content_type === 'video') {
        typeIcon = '🎥';
        typeLabel = 'Video';
        typeBadgeClass = 'bg-purple-100 text-purple-800';
    } else if (content.content_type === 'image') {
        typeIcon = '🖼️';
        typeLabel = 'Image';
        typeBadgeClass = 'bg-blue-100 text-blue-800';
    }

    tr.innerHTML = `
        <td class="p-4">
            <div class="font-semibold">${content.title}</div>
            <div class="text-sm text-gray-500">ID: #${content.id}</div>
        </td>
        <td class="p-4">
            <span class="px-2 py-1 rounded text-xs font-semibold ${typeBadgeClass}">
                ${typeIcon} ${typeLabel}
            </span>
        </td>
        <td class="p-4">${content.uploader_name || 'Unknown'}</td>
        <td class="p-4">${fileSizeMB} MB</td>
        <td class="p-4">
            <div class="text-sm">${uploadDate}</div>
        </td>
        <td class="p-4">
            <div class="text-sm">${content.grade_level || 'N/A'}</div>
            <div class="text-xs text-gray-500">${content.course_type || 'N/A'}</div>
        </td>
        <td class="p-4">
            <div class="flex gap-2">
                <button onclick="viewContent(${content.id})"
                        class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                    View
                </button>
                ${getActionButtons(content, panel)}
            </div>
        </td>
    `;

    return tr;
}

/**
 * Get action buttons based on panel and content status
 */
function getActionButtons(content, panel) {
    if (panel === 'requested') {
        return `
            <button onclick="approveContent(${content.id})"
                    class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                Approve
            </button>
            <button onclick="rejectContent(${content.id})"
                    class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                Reject
            </button>
        `;
    } else if (panel === 'verified') {
        return `
            <button onclick="suspendContent(${content.id})"
                    class="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm">
                Flag
            </button>
        `;
    } else if (panel === 'rejected') {
        return `
            <button onclick="reconsiderContent(${content.id})"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                Reconsider
            </button>
        `;
    } else if (panel === 'flagged') {
        return `
            <button onclick="unflagContent(${content.id})"
                    class="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                Restore
            </button>
            <button onclick="deleteContent(${content.id})"
                    class="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                Delete
            </button>
        `;
    }
    return '';
}

// ============================================================================
// Search and Filter Functions
// ============================================================================

/**
 * Initialize search and filter listeners for all panels
 */
function initializeContentFilters() {
    const panels = ['requested', 'verified', 'rejected', 'flagged'];

    panels.forEach(panel => {
        // Search input
        const searchInput = document.getElementById(`${panel}-search`);
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const typeFilter = document.getElementById(`${panel}-type-filter`);
                filterContent(panel, e.target.value, typeFilter ? typeFilter.value : '');
            });
        }

        // Type filter dropdown
        const typeFilter = document.getElementById(`${panel}-type-filter`);
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                const searchInput = document.getElementById(`${panel}-search`);
                filterContent(panel, searchInput ? searchInput.value : '', e.target.value);
            });
        }
    });
}

/**
 * Filter content based on search query and type
 */
function filterContent(panel, searchQuery, typeFilter) {
    const tbody = document.getElementById(`${panel}-content-table`);
    if (!tbody) return;

    const rows = tbody.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.getElementsByTagName('td');

        if (cells.length === 0) continue;

        const title = cells[0]?.textContent.toLowerCase() || '';
        const type = cells[1]?.textContent.toLowerCase() || '';
        const uploader = cells[2]?.textContent.toLowerCase() || '';

        const matchesSearch = !searchQuery ||
            title.includes(searchQuery.toLowerCase()) ||
            uploader.includes(searchQuery.toLowerCase());

        const matchesType = !typeFilter || type.includes(typeFilter.toLowerCase());

        row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    }
}

// ============================================================================
// Content Actions
// ============================================================================

/**
 * View content details in modal
 */
async function viewContent(contentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const content = await response.json();
        openContentModal(content);
    } catch (error) {
        console.error('Error loading content details:', error);
        showErrorMessage('Failed to load content details');
    }
}

/**
 * Open content modal with content data
 */
function openContentModal(content) {
    const modal = document.getElementById('content-modal');
    if (!modal) {
        console.error('Content modal not found');
        return;
    }

    // Update modal title
    const modalTitle = modal.querySelector('.modal-header h2');
    if (modalTitle) {
        modalTitle.textContent = content.title;
    }

    // Update content display area
    const contentDisplay = modal.querySelector('#content-display');
    if (contentDisplay) {
        if (content.content_type === 'video') {
            contentDisplay.innerHTML = `
                <video controls class="w-full rounded-lg">
                    <source src="${content.file_path}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else if (content.content_type === 'image') {
            contentDisplay.innerHTML = `
                <img src="${content.file_path}" alt="${content.title}" class="w-full rounded-lg">
            `;
        }
    }

    // Update content details
    const detailsContainer = modal.querySelector('#content-details');
    if (detailsContainer) {
        const fileSizeMB = (content.file_size / (1024 * 1024)).toFixed(2);
        const uploadDate = new Date(content.uploaded_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let statusBadge = '';
        let statusClass = '';

        switch(content.verification_status) {
            case 'verified':
                statusClass = 'bg-green-100 text-green-800';
                statusBadge = '✓ Verified';
                break;
            case 'pending':
                statusClass = 'bg-yellow-100 text-yellow-800';
                statusBadge = '⏳ Pending';
                break;
            case 'rejected':
                statusClass = 'bg-red-100 text-red-800';
                statusBadge = '✗ Rejected';
                break;
            case 'suspended':
                statusClass = 'bg-orange-100 text-orange-800';
                statusBadge = '🚩 Flagged';
                break;
        }

        detailsContainer.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-gray-500">Content ID</p>
                    <p class="font-semibold">#${content.id}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Type</p>
                    <p class="font-semibold">${content.content_type}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Uploader</p>
                    <p class="font-semibold">${content.uploader_name || 'Unknown'}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">File Size</p>
                    <p class="font-semibold">${fileSizeMB} MB</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Upload Date</p>
                    <p class="font-semibold">${uploadDate}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-500">Status</p>
                    <span class="px-2 py-1 rounded text-xs font-semibold ${statusClass}">${statusBadge}</span>
                </div>
                <div class="col-span-2">
                    <p class="text-sm text-gray-500">Grade Level</p>
                    <p class="font-semibold">${content.grade_level || 'Not specified'}</p>
                </div>
                <div class="col-span-2">
                    <p class="text-sm text-gray-500">Course Type</p>
                    <p class="font-semibold">${content.course_type || 'Not specified'}</p>
                </div>
                ${content.description ? `
                <div class="col-span-2">
                    <p class="text-sm text-gray-500">Description</p>
                    <p class="font-semibold">${content.description}</p>
                </div>
                ` : ''}
                ${content.rejected_reason ? `
                <div class="col-span-2">
                    <p class="text-sm text-gray-500">Rejection Reason</p>
                    <p class="text-red-600 font-semibold">${content.rejected_reason}</p>
                </div>
                ` : ''}
                ${content.suspended_reason ? `
                <div class="col-span-2">
                    <p class="text-sm text-gray-500">Suspension Reason</p>
                    <p class="text-orange-600 font-semibold">${content.suspended_reason}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    // Show modal
    modal.classList.remove('hidden');
}

/**
 * Close content modal
 */
function closeContentModal() {
    const modal = document.getElementById('content-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Approve content
 */
async function approveContent(contentId) {
    if (!confirm('Are you sure you want to approve this content?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}/verify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                verification_status: 'verified',
                verified_by: 1 // TODO: Get actual admin ID from session
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccessMessage('Content approved successfully');

        // Refresh data
        await loadDashboardStats();
        await loadContentByStatus('pending');
        await loadContentByStatus('verified');
    } catch (error) {
        console.error('Error approving content:', error);
        showErrorMessage('Failed to approve content');
    }
}

/**
 * Reject content
 */
async function rejectContent(contentId) {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}/verify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                verification_status: 'rejected',
                reason: reason,
                verified_by: 1 // TODO: Get actual admin ID from session
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccessMessage('Content rejected');

        // Refresh data
        await loadDashboardStats();
        await loadContentByStatus('pending');
        await loadContentByStatus('rejected');
    } catch (error) {
        console.error('Error rejecting content:', error);
        showErrorMessage('Failed to reject content');
    }
}

/**
 * Suspend/Flag content
 */
async function suspendContent(contentId) {
    const reason = prompt('Please provide a reason for flagging this content:');
    if (!reason) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}/verify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                verification_status: 'suspended',
                reason: reason,
                verified_by: 1 // TODO: Get actual admin ID from session
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccessMessage('Content flagged successfully');

        // Refresh data
        await loadDashboardStats();
        await loadContentByStatus('verified');
        await loadContentByStatus('suspended');
    } catch (error) {
        console.error('Error flagging content:', error);
        showErrorMessage('Failed to flag content');
    }
}

/**
 * Reconsider rejected content
 */
async function reconsiderContent(contentId) {
    if (!confirm('Move this content back to pending for reconsideration?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}/verify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                verification_status: 'pending',
                verified_by: 1 // TODO: Get actual admin ID from session
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccessMessage('Content moved to pending for reconsideration');

        // Refresh data
        await loadDashboardStats();
        await loadContentByStatus('rejected');
        await loadContentByStatus('pending');
    } catch (error) {
        console.error('Error reconsidering content:', error);
        showErrorMessage('Failed to reconsider content');
    }
}

/**
 * Unflag/Restore content
 */
async function unflagContent(contentId) {
    if (!confirm('Restore this content to verified status?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}/verify`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                verification_status: 'verified',
                verified_by: 1 // TODO: Get actual admin ID from session
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccessMessage('Content restored to verified');

        // Refresh data
        await loadDashboardStats();
        await loadContentByStatus('suspended');
        await loadContentByStatus('verified');
    } catch (error) {
        console.error('Error restoring content:', error);
        showErrorMessage('Failed to restore content');
    }
}

/**
 * Delete content permanently
 */
async function deleteContent(contentId) {
    if (!confirm('Are you sure you want to permanently delete this content? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        showSuccessMessage('Content deleted successfully');

        // Refresh data
        await loadDashboardStats();
        await loadContentByStatus('suspended');
    } catch (error) {
        console.error('Error deleting content:', error);
        showErrorMessage('Failed to delete content');
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Show success message
 */
function showSuccessMessage(message) {
    // TODO: Implement proper notification system
    alert(message);
}

/**
 * Show error message
 */
function showErrorMessage(message) {
    // TODO: Implement proper notification system
    alert('Error: ' + message);
}

/**
 * Export content data
 */
function exportContent(panel) {
    const data = contentData[panel];
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Convert to CSV
    const headers = ['ID', 'Title', 'Type', 'Uploader', 'Size (MB)', 'Upload Date', 'Grade Level', 'Course Type', 'Status'];
    const rows = data.map(content => [
        content.id,
        content.title,
        content.content_type,
        content.uploader_name || 'Unknown',
        (content.file_size / (1024 * 1024)).toFixed(2),
        new Date(content.uploaded_at).toLocaleDateString(),
        content.grade_level || 'N/A',
        content.course_type || 'N/A',
        content.verification_status
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${panel}-contents-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ============================================================================
// Export functions for global access (for onclick handlers in HTML)
// ============================================================================

window.viewContent = viewContent;
window.closeContentModal = closeContentModal;
window.approveContent = approveContent;
window.rejectContent = rejectContent;
window.suspendContent = suspendContent;
window.reconsiderContent = reconsiderContent;
window.unflagContent = unflagContent;
window.deleteContent = deleteContent;
window.exportContent = exportContent;
