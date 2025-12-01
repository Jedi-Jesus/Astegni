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

    // Load live upload feed
    loadLiveUploadFeed();

    // Auto-refresh live feed every 30 seconds
    setInterval(loadLiveUploadFeed, 30000);
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
 * Load live upload feed widget
 */
async function loadLiveUploadFeed() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/recent/uploads?limit=10`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const recentUploads = await response.json();
        renderLiveUploadFeed(recentUploads);

        console.log(`Loaded ${recentUploads.length} recent uploads for live feed`);
    } catch (error) {
        console.error('Error loading live upload feed:', error);
        const feedContainer = document.getElementById('live-upload-feed');
        if (feedContainer) {
            feedContainer.innerHTML = `
                <div class="text-center p-4 text-red-500">
                    <i class="fas fa-exclamation-circle text-2xl mb-2 block"></i>
                    <p class="text-sm">Failed to load feed</p>
                </div>
            `;
        }
    }
}

/**
 * Render live upload feed items
 */
function renderLiveUploadFeed(uploads) {
    const feedContainer = document.getElementById('live-upload-feed');
    if (!feedContainer) return;

    if (uploads.length === 0) {
        feedContainer.innerHTML = `
            <div class="text-center p-8 text-gray-500">
                <i class="fas fa-inbox text-3xl mb-3 block"></i>
                <p class="text-sm">No recent uploads</p>
            </div>
        `;
        return;
    }

    feedContainer.innerHTML = '';

    uploads.forEach(upload => {
        const uploadItem = createUploadFeedItem(upload);
        feedContainer.appendChild(uploadItem);
    });
}

/**
 * Create a single upload feed item
 */
function createUploadFeedItem(upload) {
    const div = document.createElement('div');
    div.className = 'upload-activity-item p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer';

    // Determine panel based on verification status
    const panel = upload.verification_status === 'pending' ? 'requested' :
                  upload.verification_status === 'suspended' ? 'flagged' :
                  upload.verification_status;

    div.onclick = () => viewContent(upload.id, panel);

    // Format time ago
    const uploadDate = new Date(upload.uploaded_at);
    const timeAgo = getTimeAgo(uploadDate);

    // Format file size
    const fileSizeMB = (upload.file_size / (1024 * 1024)).toFixed(1);

    // Determine icon and color based on type
    let typeIcon = '';
    let typeColor = '';

    if (upload.content_type === 'video') {
        typeIcon = '🎥';
        typeColor = 'text-purple-600';
    } else if (upload.content_type === 'image') {
        typeIcon = '🖼️';
        typeColor = 'text-blue-600';
    }

    // Status badge
    let statusBadge = '';
    if (upload.verification_status === 'verified') {
        statusBadge = '<span class="text-xs text-green-600">✓</span>';
    } else if (upload.verification_status === 'pending') {
        statusBadge = '<span class="text-xs text-yellow-600">⏳</span>';
    } else if (upload.verification_status === 'rejected') {
        statusBadge = '<span class="text-xs text-red-600">✗</span>';
    } else if (upload.verification_status === 'suspended') {
        statusBadge = '<span class="text-xs text-orange-600">🚩</span>';
    }

    div.innerHTML = `
        <div class="flex items-start gap-2">
            <span class="text-xl flex-shrink-0">${typeIcon}</span>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <p class="font-semibold text-sm truncate ${typeColor}">${upload.title}</p>
                    ${statusBadge}
                </div>
                <p class="text-xs text-gray-600 truncate">${upload.uploader_name || 'Unknown'}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-gray-500">${fileSizeMB} MB</span>
                    <span class="text-xs text-gray-400">•</span>
                    <span class="text-xs text-gray-500">${timeAgo}</span>
                </div>
            </div>
        </div>
    `;

    return div;
}

/**
 * Get human-readable time ago
 */
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else if (diffDays < 7) {
        return `${diffDays}d ago`;
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
            <button onclick="viewContent(${content.id}, '${panel}')"
                    class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                View
            </button>
        </td>
    `;

    return tr;
}

/**
 * Get action buttons based on panel and content status
 * NOTE: Actions column only shows "View" button - all actions are in the modal
 */
function getActionButtons(content, panel) {
    // Actions column only has View button
    // All other actions appear in the modal
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
 * @param {number} contentId - The ID of the content to view
 * @param {string} panel - The panel from which the content was opened (requested, verified, rejected, flagged)
 */
async function viewContent(contentId, panel = null) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/contents/${contentId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const content = await response.json();

        // If panel is not provided, determine it from content status
        if (!panel) {
            panel = content.verification_status === 'pending' ? 'requested' :
                    content.verification_status === 'suspended' ? 'flagged' :
                    content.verification_status;
        }

        openContentModal(content, panel);
    } catch (error) {
        console.error('Error loading content details:', error);
        showErrorMessage('Failed to load content details');
    }
}

/**
 * Open content modal with content data
 * @param {object} content - The content object
 * @param {string} panel - The panel from which the modal was opened (requested, verified, rejected, flagged)
 */
function openContentModal(content, panel = 'requested') {
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

    // Update modal footer with dynamic action buttons based on panel
    const modalFooter = modal.querySelector('.modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = getModalActionButtons(content.id, panel);
    }

    // Show modal
    modal.classList.remove('hidden');
}

/**
 * Get modal action buttons based on panel
 * @param {number} contentId - The ID of the content
 * @param {string} panel - The panel from which the modal was opened
 * @returns {string} HTML for action buttons
 */
function getModalActionButtons(contentId, panel) {
    let actionButtons = '';

    if (panel === 'requested') {
        // Requested panel: Approve and Reject buttons
        actionButtons = `
            <button onclick="approveContent(${contentId})"
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                <i class="fas fa-check mr-2"></i>Approve
            </button>
            <button onclick="rejectContent(${contentId})"
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                <i class="fas fa-times mr-2"></i>Reject
            </button>
        `;
    } else if (panel === 'verified') {
        // Verified panel: Flag and Reject buttons
        actionButtons = `
            <button onclick="suspendContent(${contentId})"
                    class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                <i class="fas fa-flag mr-2"></i>Flag
            </button>
            <button onclick="rejectContent(${contentId})"
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                <i class="fas fa-times mr-2"></i>Reject
            </button>
        `;
    } else if (panel === 'rejected') {
        // Rejected panel: Reconsider button
        actionButtons = `
            <button onclick="reconsiderContent(${contentId})"
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <i class="fas fa-redo mr-2"></i>Reconsider
            </button>
        `;
    } else if (panel === 'flagged') {
        // Flagged panel: Reinstate and Reject buttons
        actionButtons = `
            <button onclick="unflagContent(${contentId})"
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                <i class="fas fa-check-circle mr-2"></i>Reinstate
            </button>
            <button onclick="rejectContent(${contentId})"
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                <i class="fas fa-times mr-2"></i>Reject
            </button>
        `;
    }

    // Always include Close button
    return `
        <button class="btn-secondary px-4 py-2 border rounded-lg hover:bg-gray-100"
                onclick="closeContentModal()">Close</button>
        ${actionButtons}
    `;
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
