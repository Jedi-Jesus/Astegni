/**
 * Manage Contents - Content Management JavaScript
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
    flagged: []
};

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
                filterContent(panel, e.target.value, document.getElementById(`${panel}-type-filter`).value);
            });
        }

        // Type filter dropdown
        const typeFilter = document.getElementById(`${panel}-type-filter`);
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                filterContent(panel, document.getElementById(`${panel}-search`).value, e.target.value);
            });
        }
    });
}

/**
 * Filter content based on search query and type
 * @param {string} panel - Panel name (requested, verified, rejected, flagged)
 * @param {string} searchQuery - Search query string
 * @param {string} typeFilter - Content type filter (image, video, document)
 */
function filterContent(panel, searchQuery, typeFilter) {
    const table = document.getElementById(`${panel}-content-table`);
    if (!table) return;

    const rows = table.getElementsByTagName('tr');

    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const filename = row.querySelector('.font-semibold')?.textContent.toLowerCase() || '';
        const type = row.cells[1]?.textContent.toLowerCase() || '';
        const uploader = row.cells[2]?.textContent.toLowerCase() || '';
        const id = row.querySelector('.text-gray-500')?.textContent.toLowerCase() || '';

        const matchesSearch = !searchQuery ||
            filename.includes(searchQuery.toLowerCase()) ||
            uploader.includes(searchQuery.toLowerCase()) ||
            id.includes(searchQuery.toLowerCase());

        const matchesType = !typeFilter || type.includes(typeFilter.toLowerCase());

        row.style.display = (matchesSearch && matchesType) ? '' : 'none';
    }
}

// ============================================================================
// Content Actions
// ============================================================================

/**
 * Preview content in modal
 * @param {string} contentId - Content ID
 */
function previewContent(contentId) {
    console.log('Previewing content:', contentId);
    // TODO: Implement preview modal
    alert(`Preview content: ${contentId}\n\nThis will open a preview modal with the content.`);
}

/**
 * Approve content
 * @param {string} contentId - Content ID
 */
function approveContent(contentId) {
    console.log('Approving content:', contentId);
    if (confirm(`Are you sure you want to approve content ${contentId}?`)) {
        // TODO: Implement API call to approve content
        alert(`Content ${contentId} has been approved successfully.`);
        // Refresh the panel
        location.reload();
    }
}

/**
 * Reject content
 * @param {string} contentId - Content ID
 */
function rejectContent(contentId) {
    console.log('Rejecting content:', contentId);
    const reason = prompt(`Please provide a reason for rejecting ${contentId}:`);
    if (reason) {
        // TODO: Implement API call to reject content
        alert(`Content ${contentId} has been rejected.\nReason: ${reason}`);
        // Refresh the panel
        location.reload();
    }
}

/**
 * Flag content for review
 * @param {string} contentId - Content ID
 */
function flagContent(contentId) {
    console.log('Flagging content:', contentId);
    const reason = prompt(`Please provide a reason for flagging ${contentId}:`);
    if (reason) {
        // TODO: Implement API call to flag content
        alert(`Content ${contentId} has been flagged for review.\nReason: ${reason}`);
        // Refresh the panel
        location.reload();
    }
}

/**
 * Delete content permanently
 * @param {string} contentId - Content ID
 */
function deleteContent(contentId) {
    console.log('Deleting content:', contentId);
    if (confirm(`⚠️ WARNING: Are you sure you want to permanently delete ${contentId}?\n\nThis action cannot be undone.`)) {
        // TODO: Implement API call to delete content
        alert(`Content ${contentId} has been deleted permanently.`);
        // Refresh the panel
        location.reload();
    }
}

/**
 * Remove flagged content
 * @param {string} contentId - Content ID
 */
function removeContent(contentId) {
    console.log('Removing flagged content:', contentId);
    if (confirm(`Are you sure you want to remove ${contentId}?`)) {
        // TODO: Implement API call to remove content
        alert(`Content ${contentId} has been removed.`);
        // Refresh the panel
        location.reload();
    }
}

/**
 * Re-review previously rejected content
 * @param {string} contentId - Content ID
 */
function reReviewContent(contentId) {
    console.log('Re-reviewing content:', contentId);
    if (confirm(`Move ${contentId} back to requested for re-review?`)) {
        // TODO: Implement API call to move content to requested
        alert(`Content ${contentId} has been moved to requested for re-review.`);
        // Refresh the panel
        location.reload();
    }
}

/**
 * Review flagged content
 * @param {string} contentId - Content ID
 */
function reviewContent(contentId) {
    console.log('Reviewing flagged content:', contentId);
    previewContent(contentId);
}

// ============================================================================
// Export Functions
// ============================================================================

/**
 * Export content data to CSV
 * @param {string} panel - Panel name (requested, verified, rejected, flagged)
 */
function exportContent(panel) {
    console.log('Exporting content from:', panel);
    // TODO: Implement CSV export functionality
    alert(`Exporting ${panel} content to CSV...\n\nThis feature will be implemented soon.`);
}

// ============================================================================
// Storage Analytics
// ============================================================================

/**
 * Open storage analytics modal
 */
function openStorageAnalytics() {
    console.log('Opening storage analytics');
    alert('Storage Analytics\n\n' +
          'Total Storage: 470 GB\n' +
          'Images: 45 GB\n' +
          'Videos: 380 GB\n' +
          'Documents: 45 GB\n\n' +
          'This will open a detailed analytics dashboard.');
}

/**
 * Open content settings modal
 */
function openContentSettings() {
    console.log('Opening content settings');
    alert('Content Settings\n\n' +
          '• Upload Limits\n' +
          '• File Type Restrictions\n' +
          '• Auto-moderation Rules\n' +
          '• Storage Quotas\n\n' +
          'This will open the settings panel.');
}

/**
 * Open content policy modal
 */
function openContentPolicy() {
    console.log('Opening content policy');
    alert('Content Policy\n\n' +
          '• Acceptable Content Guidelines\n' +
          '• Prohibited Content\n' +
          '• Copyright Rules\n' +
          '• User Conduct\n\n' +
          'This will display the full content policy.');
}

// ============================================================================
// Profile Upload Functions (from dashboard)
// ============================================================================

// Note: Profile modal functions (openEditProfileModal, openUploadProfileModal, openUploadCoverModal)
// are now handled by manage-contents-profile-loader.js

/**
 * Logout function
 */
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        // Redirect to login/home
        window.location.href = '../index.html';
    }
}

// ============================================================================
// Database Loading Functions
// ============================================================================

/**
 * Load live upload feed from database
 */
async function loadLiveUploadFeed() {
    const feedContainer = document.getElementById('live-upload-feed');
    if (!feedContainer) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/content/live-uploads`);

        if (!response.ok) {
            throw new Error('Failed to fetch live uploads');
        }

        const uploads = await response.json();

        if (uploads.length === 0) {
            feedContainer.innerHTML = `
                <div class="text-center p-8 text-gray-500">
                    <i class="fas fa-inbox text-3xl mb-3 block"></i>
                    <p>No recent uploads</p>
                </div>
            `;
            return;
        }

        // Duplicate items for seamless scrolling
        const duplicatedUploads = [...uploads, ...uploads];

        feedContainer.innerHTML = duplicatedUploads.map(upload => `
            <div class="upload-activity-item">
                <div class="activity-content">
                    <div class="activity-header">
                        <i class="fas ${getFileIcon(upload.file_type)} ${getFileIconColor(upload.file_type)}"></i>
                        <span class="user-name">${escapeHtml(upload.uploader_name)}</span>
                        <span class="status-tag ${getStatusClass(upload.status)}">${upload.status.toUpperCase()}</span>
                    </div>
                    <div class="file-info">
                        <span class="file-name">${escapeHtml(upload.file_name)}</span>
                        <span class="file-size">${formatFileSize(upload.file_size)}</span>
                    </div>
                    <div class="activity-footer">
                        <span class="timestamp">${formatTimeAgo(upload.upload_date)}</span>
                        <button class="view-btn" onclick="previewContent('${upload.content_id}')">View</button>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading live upload feed:', error);
        feedContainer.innerHTML = `
            <div class="text-center p-8 text-gray-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-3 block"></i>
                <p>Failed to load uploads</p>
            </div>
        `;
    }
}

/**
 * Load content table data from database
 */
async function loadContentTable(panel) {
    const tableBody = document.getElementById(`${panel}-content-table`);
    if (!tableBody) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/content/${panel}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${panel} content`);
        }

        const contents = await response.json();

        if (contents.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-8 text-center text-gray-500">
                        <i class="fas fa-inbox text-4xl mb-3 block"></i>
                        <p>No ${panel} content found</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = contents.map(content => {
            return generateContentRow(content, panel);
        }).join('');

    } catch (error) {
        console.error(`Error loading ${panel} content:`, error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="p-8 text-center text-gray-500">
                    <i class="fas fa-exclamation-triangle text-4xl mb-3 block"></i>
                    <p>Failed to load content</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Load panel statistics from database
 */
async function loadPanelStatistics(panel) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/content/stats/${panel}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch ${panel} statistics`);
        }

        const stats = await response.json();

        // Update stat cards
        document.getElementById(`${panel}-total-count`).textContent = stats.total || 0;
        document.getElementById(`${panel}-images-count`).textContent = stats.images || 0;
        document.getElementById(`${panel}-videos-count`).textContent = stats.videos || 0;
        document.getElementById(`${panel}-documents-count`).textContent = stats.documents || 0;

    } catch (error) {
        console.error(`Error loading ${panel} statistics:`, error);
    }
}

/**
 * Generate content table row HTML
 */
function generateContentRow(content, panel) {
    const actionsHTML = {
        requested: `
            <button onclick="previewContent('${content.id}')" class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="approveContent('${content.id}')" class="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200">
                <i class="fas fa-check"></i>
            </button>
            <button onclick="rejectContent('${content.id}')" class="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                <i class="fas fa-times"></i>
            </button>
        `,
        verified: `
            <button onclick="previewContent('${content.id}')" class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="flagContent('${content.id}')" class="p-2 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200">
                <i class="fas fa-flag"></i>
            </button>
            <button onclick="deleteContent('${content.id}')" class="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                <i class="fas fa-trash"></i>
            </button>
        `,
        rejected: `
            <button onclick="previewContent('${content.id}')" class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="reReviewContent('${content.id}')" class="p-2 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200">
                <i class="fas fa-redo"></i>
            </button>
            <button onclick="deleteContent('${content.id}')" class="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                <i class="fas fa-trash"></i>
            </button>
        `,
        flagged: `
            <button onclick="previewContent('${content.id}')" class="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200">
                <i class="fas fa-eye"></i>
            </button>
            <button onclick="approveContent('${content.id}')" class="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200">
                <i class="fas fa-check"></i>
            </button>
            <button onclick="removeContent('${content.id}')" class="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200">
                <i class="fas fa-trash"></i>
            </button>
        `
    };

    const reasonColumn = panel === 'rejected' || panel === 'flagged' ? `
        <td class="p-4">
            <span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                ${escapeHtml(content.reason || 'Not specified')}
            </span>
        </td>
    ` : '';

    const dateColumn = panel === 'rejected' ? `<td class="p-4">${formatDate(content.rejected_date)}</td>` :
                       panel === 'verified' ? `<td class="p-4">${formatDate(content.verified_date)}</td>` :
                       `<td class="p-4">${formatTimeAgo(content.upload_date)}</td>`;

    return `
        <tr class="hover:bg-gray-50">
            <td class="p-4">
                <div class="flex items-center gap-3">
                    <i class="fas ${getFileIcon(content.type)} ${getFileIconColor(content.type)}"></i>
                    <div>
                        <div class="font-semibold">${escapeHtml(content.filename)}</div>
                        <div class="text-sm text-gray-500">ID: ${content.id}</div>
                    </div>
                </div>
            </td>
            <td class="p-4">${capitalizeFirst(content.type)}</td>
            <td class="p-4">${escapeHtml(content.uploader)}</td>
            ${panel === 'requested' ? '' : reasonColumn}
            ${panel === 'requested' ? `<td class="p-4">${formatFileSize(content.size)}</td>` : ''}
            ${dateColumn}
            <td class="p-4">
                <div class="flex gap-2">
                    ${actionsHTML[panel] || ''}
                </div>
            </td>
        </tr>
    `;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get file icon class based on file type
 */
function getFileIcon(type) {
    const icons = {
        image: 'fa-image',
        video: 'fa-video',
        document: 'fa-file-pdf',
        audio: 'fa-file-audio',
        word: 'fa-file-word',
        excel: 'fa-file-excel',
        powerpoint: 'fa-file-powerpoint',
        archive: 'fa-file-archive'
    };
    return icons[type] || 'fa-file';
}

/**
 * Get file icon color based on file type
 */
function getFileIconColor(type) {
    const colors = {
        image: 'text-blue-500',
        video: 'text-purple-500',
        document: 'text-red-500',
        audio: 'text-pink-500',
        word: 'text-blue-600',
        excel: 'text-green-600',
        powerpoint: 'text-orange-500',
        archive: 'text-yellow-600'
    };
    return colors[type] || 'text-gray-500';
}

/**
 * Get status badge class
 */
function getStatusClass(status) {
    const classes = {
        new: 'new',
        pending: 'pending',
        verified: 'verified',
        rejected: 'rejected',
        flagged: 'flagged'
    };
    return classes[status.toLowerCase()] || 'pending';
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateString);
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Manage Contents page initialized');

    // Initialize content filters
    initializeContentFilters();

    // Load live upload feed
    setTimeout(loadLiveUploadFeed, 1000);

    // Load panel data when panel switches
    const urlParams = new URLSearchParams(window.location.search);
    const currentPanel = urlParams.get('panel') || 'dashboard';
    console.log('Current panel:', currentPanel);

    // Load data for non-dashboard panels
    if (currentPanel !== 'dashboard') {
        setTimeout(() => {
            loadContentTable(currentPanel);
            loadPanelStatistics(currentPanel);
        }, 1000);
    }
});
