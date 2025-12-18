/**
 * Manage Credentials - Standalone Script
 * Handles navigation, panel management, and data loading from credentials table
 * Reads from credentials table in astegni_user_db
 */

(function() {
    'use strict';

    // API Configuration
    const API_BASE_URL_CRED = window.API_BASE_URL || 'http://localhost:8000';

    // State
    let currentPanel = 'dashboard';
    let credentialsData = {
        pending: [],
        verified: [],
        rejected: [],
        suspended: []
    };

    // ============================================================
    // INITIALIZATION
    // ============================================================

    function initPage() {
        console.log('Initializing Manage Credentials page...');

        // Set up sidebar navigation
        setupSidebar();

        // Set up hamburger menu
        setupHamburger();

        // Set up live clock
        startClock();

        // Check URL for panel parameter
        const urlParams = new URLSearchParams(window.location.search);
        const panelParam = urlParams.get('panel');
        if (panelParam) {
            switchPanel(panelParam);
        }

        // Load initial data
        loadDashboardStats();
        loadPendingCredentials();

        // Load live credentials widget
        loadLiveCredentialsWidget();

        console.log('Manage Credentials page initialized');
    }

    // ============================================================
    // SIDEBAR & NAVIGATION
    // ============================================================

    // Sidebar state
    let sidebarOverlay = null;

    function setupSidebar() {
        // Create overlay if it doesn't exist
        if (!document.querySelector('.sidebar-overlay')) {
            sidebarOverlay = document.createElement('div');
            sidebarOverlay.className = 'sidebar-overlay';
            document.body.appendChild(sidebarOverlay);
        } else {
            sidebarOverlay = document.querySelector('.sidebar-overlay');
        }

        const sidebarClose = document.getElementById('sidebar-close');
        if (sidebarClose) {
            sidebarClose.addEventListener('click', function(e) {
                e.stopPropagation();
                closeSidebar();
            });
        }

        // Overlay click to close
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                closeSidebar();
            });
        }

        // Close sidebar when clicking outside
        document.addEventListener('click', function(e) {
            const sidebar = document.getElementById('sidebar');
            const hamburger = document.getElementById('hamburger');
            if (sidebar && hamburger &&
                !sidebar.contains(e.target) &&
                !hamburger.contains(e.target) &&
                sidebar.classList.contains('active')) {
                closeSidebar();
            }
        });

        // ESC key to close sidebar
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    closeSidebar();
                }
            }
        });

        // Close sidebar when clicking sidebar links
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                closeSidebar();
            });
        });
    }

    function setupHamburger() {
        const hamburger = document.getElementById('hamburger');
        if (hamburger) {
            hamburger.addEventListener('click', function(e) {
                e.stopPropagation();
                toggleSidebar();
            });
        }
    }

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            if (sidebar.classList.contains('active')) {
                closeSidebar();
            } else {
                openSidebar();
            }
        }
    }

    function openSidebar() {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger');
        if (sidebar) {
            sidebar.classList.add('active');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.add('active');
        }
        if (hamburger) {
            hamburger.classList.add('active');
        }
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.getElementById('hamburger');
        if (sidebar) {
            sidebar.classList.remove('active');
        }
        if (sidebarOverlay) {
            sidebarOverlay.classList.remove('active');
        }
        if (hamburger) {
            hamburger.classList.remove('active');
        }
        document.body.style.overflow = '';
    }

    // ============================================================
    // PANEL SWITCHING
    // ============================================================

    window.switchPanel = function(panelName) {
        console.log('Switching to panel:', panelName);

        // Handle 'my-credentials' -> 'credentials' mapping
        const panelId = panelName === 'my-credentials' ? 'credentials' : panelName;

        // Hide all panels
        const panels = document.querySelectorAll('.panel-content');
        panels.forEach(panel => {
            panel.classList.add('hidden');
            panel.classList.remove('active');
        });

        // Show selected panel
        const targetPanel = document.getElementById(`${panelId}-panel`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
            targetPanel.classList.add('active');
            currentPanel = panelName;

            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('panel', panelName);
            window.history.pushState({}, '', url);

            // Update sidebar active state
            updateSidebarActive(panelName);

            // Load panel-specific data
            loadPanelData(panelName);
        } else {
            console.warn('Panel not found:', `${panelId}-panel`);
        }

        // Close sidebar on mobile
        closeSidebar();
    };

    function updateSidebarActive(panelName) {
        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            const onclick = link.getAttribute('onclick');
            if (onclick && onclick.includes(`'${panelName}'`)) {
                link.classList.add('active');
            }
        });
    }

    function loadPanelData(panelName) {
        switch (panelName) {
            case 'dashboard':
                loadDashboardStats();
                break;
            case 'requested':
                loadPendingCredentials();
                break;
            case 'verified':
                loadVerifiedCredentials();
                break;
            case 'rejected':
                loadRejectedCredentials();
                break;
            case 'suspended':
                loadSuspendedCredentials();
                break;
            case 'reviews':
                if (typeof loadAllReviews === 'function') {
                    loadAllReviews();
                }
                break;
            case 'my-credentials':
                if (typeof loadCredentials === 'function') {
                    loadCredentials();
                }
                break;
            case 'portfolio':
                // Portfolio panel - Coming Soon
                console.log('Portfolio panel loaded');
                break;
            case 'settings':
                // Settings panel - loaded
                console.log('Settings panel loaded');
                break;
        }
    }

    // ============================================================
    // API CALLS - LOAD CREDENTIALS
    // ============================================================

    function getAuthToken() {
        // Admin pages should use adminToken from admin login (astegni_admin_db)
        // Priority: adminToken > admin_access_token (fallback for compatibility)
        const token = localStorage.getItem('adminToken') ||
                     localStorage.getItem('admin_access_token');

        // Log which token sources were found for debugging
        console.log('Admin Token sources:', {
            adminToken: localStorage.getItem('adminToken') ? 'found' : 'not found',
            admin_access_token: localStorage.getItem('admin_access_token') ? 'found' : 'not found'
        });

        // Check if token is expired (JWT tokens have 3 parts separated by dots)
        if (token) {
            try {
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    const exp = payload.exp;
                    const now = Math.floor(Date.now() / 1000);
                    if (exp && exp < now) {
                        console.error('TOKEN EXPIRED! Expiry:', new Date(exp * 1000).toLocaleString(), 'Now:', new Date().toLocaleString());
                        console.log('Please log out and log back in to get a fresh token.');
                        // Optionally clear expired tokens
                        // localStorage.removeItem('token');
                        // localStorage.removeItem('access_token');
                    } else {
                        console.log('Token valid until:', new Date(exp * 1000).toLocaleString());
                    }
                }
            } catch (e) {
                console.warn('Could not parse token expiry:', e);
            }
        }

        console.log('Auth token retrieved:', token ? `${token.substring(0, 30)}...` : 'null');

        return token;
    }

    async function loadDashboardStats() {
        try {
            const token = getAuthToken();
            if (!token) {
                console.warn('No auth token found');
                return;
            }

            // Load stats from the credentials stats endpoint
            const statsResponse = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                updateDashboardStats(stats);
            } else {
                console.error('Failed to load stats:', statsResponse.status);
                // Fallback to loading pending only
                const pendingResponse = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/pending`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (pendingResponse.ok) {
                    const pending = await pendingResponse.json();
                    credentialsData.pending = pending;
                    updateDashboardStats({ pending: pending.length, verified: 0, rejected: 0 });
                }
            }

        } catch (error) {
            console.error('Error loading dashboard stats:', error);
            // Show fallback data
            updateDashboardStats({ pending: 0, verified: 0, rejected: 0, by_type: {} });
        }
    }

    function updateDashboardStats(stats) {
        const pending = stats.pending || 0;
        const verified = stats.verified || 0;
        const rejected = stats.rejected || 0;
        const total = stats.total_credentials || (pending + verified + rejected);
        const byType = stats.by_type || {};

        // Calculate approval rate
        const processed = verified + rejected;
        const approvalRate = processed > 0 ? Math.round((verified / processed) * 100) : 0;

        // Update UI elements
        const statElements = {
            'stat-verified': verified,
            'stat-pending': pending,
            'stat-rejected': rejected,
            'stat-suspended': 0, // Not tracked yet
            'stat-academic': byType.academic || 0,
            'stat-experience': byType.experience || 0,
            'stat-approval-rate': `${approvalRate}%`,
            'stat-avg-processing': processed > 0 ? '< 24h' : '-'
        };

        for (const [id, value] of Object.entries(statElements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }
    }

    async function loadPendingCredentials() {
        try {
            const token = getAuthToken();
            if (!token) {
                console.warn('No auth token found');
                renderCredentialsTable('pending-credentials-tbody', []);
                return;
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const credentials = await response.json();
                credentialsData.pending = credentials;
                renderCredentialsTable('pending-credentials-tbody', credentials, 'pending');

                // Update stats
                const totalElement = document.getElementById('pending-total');
                if (totalElement) totalElement.textContent = credentials.length;
            } else {
                console.error('Failed to load pending credentials:', response.status);
                renderCredentialsTable('pending-credentials-tbody', []);
            }

        } catch (error) {
            console.error('Error loading pending credentials:', error);
            renderCredentialsTable('pending-credentials-tbody', []);
        }
    }

    async function loadVerifiedCredentials() {
        try {
            const token = getAuthToken();
            if (!token) {
                renderCredentialsTable('verified-credentials-tbody', []);
                return;
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/verified`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const credentials = await response.json();
                credentialsData.verified = credentials;
                renderCredentialsTable('verified-credentials-tbody', credentials, 'verified');

                // Update stats
                const totalElement = document.getElementById('verified-total');
                if (totalElement) totalElement.textContent = credentials.length;
            } else {
                console.error('Failed to load verified credentials:', response.status);
                renderCredentialsTable('verified-credentials-tbody', []);
            }

        } catch (error) {
            console.error('Error loading verified credentials:', error);
            renderCredentialsTable('verified-credentials-tbody', []);
        }
    }

    async function loadRejectedCredentials() {
        try {
            const token = getAuthToken();
            if (!token) {
                renderCredentialsTable('rejected-credentials-tbody', []);
                return;
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/rejected`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const credentials = await response.json();
                credentialsData.rejected = credentials;
                renderCredentialsTable('rejected-credentials-tbody', credentials, 'rejected');

                const totalElement = document.getElementById('rejected-total');
                if (totalElement) totalElement.textContent = credentials.length;
            } else {
                console.error('Failed to load rejected credentials:', response.status);
                renderCredentialsTable('rejected-credentials-tbody', []);
            }

        } catch (error) {
            console.error('Error loading rejected credentials:', error);
            renderCredentialsTable('rejected-credentials-tbody', []);
        }
    }

    async function loadSuspendedCredentials() {
        try {
            const token = getAuthToken();
            if (!token) {
                renderCredentialsTable('suspended-credentials-tbody', [], 'suspended');
                return;
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/suspended`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const credentials = await response.json();
                credentialsData.suspended = credentials;
                renderCredentialsTable('suspended-credentials-tbody', credentials, 'suspended');

                const totalElement = document.getElementById('suspended-total');
                if (totalElement) totalElement.textContent = credentials.length;
            } else {
                console.error('Failed to load suspended credentials:', response.status);
                renderCredentialsTable('suspended-credentials-tbody', [], 'suspended');
            }
        } catch (error) {
            console.error('Error loading suspended credentials:', error);
            renderCredentialsTable('suspended-credentials-tbody', [], 'suspended');
        }
    }

    // ============================================================
    // LIVE CREDENTIALS WIDGET
    // ============================================================

    async function loadLiveCredentialsWidget() {
        const container = document.getElementById('live-credential-requests-scroll');
        if (!container) {
            console.warn('Live credentials container not found');
            return;
        }

        // Show loading state
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
                <p class="text-sm text-gray-500">Loading credentials...</p>
            </div>
        `;

        try {
            const token = getAuthToken();
            if (!token) {
                renderEmptyLiveWidget(container, 'Please log in to view credentials');
                return;
            }

            console.log('Fetching pending credentials from:', `${API_BASE_URL_CRED}/api/admin/credentials/pending`);
            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/pending`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const credentials = await response.json();
                console.log('Credentials loaded:', credentials.length);
                renderLiveCredentialsWidget(container, credentials);
            } else if (response.status === 401 || response.status === 403) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Auth error:', response.status, errorData);
                renderEmptyLiveWidget(container, errorData.detail || 'Authentication required - please log in again');
            } else {
                console.error('Failed to load live credentials:', response.status);
                renderEmptyLiveWidget(container, 'Failed to load credentials');
            }

        } catch (error) {
            console.error('Error loading live credentials:', error);
            renderEmptyLiveWidget(container, 'Connection error');
        }
    }

    function renderLiveCredentialsWidget(container, credentials) {
        if (!credentials || credentials.length === 0) {
            renderEmptyLiveWidget(container, null);
            return;
        }

        // Sort by most recent first
        const sortedCredentials = [...credentials].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        container.innerHTML = sortedCredentials.map(cred => {
            const timeAgo = formatTimeAgo(cred.created_at);
            const typeIcon = getCredentialIcon(cred.document_type);
            const typeLabel = getCredentialTypeLabel(cred.document_type);
            const statusTag = getStatusTag(cred.verification_status || 'pending');

            const credStatus = cred.verification_status || 'pending';
            return `
                <div class="school-request-item" onclick="viewCredentialDetails(${cred.id}, '${credStatus}')">
                    <div class="request-content">
                        <div class="request-header">
                            <i class="fas ${typeIcon}"></i>
                            <span class="school-name">${escapeHtml(cred.title)}</span>
                            <span class="status-tag ${statusTag.class}">${statusTag.text}</span>
                        </div>
                        <div class="request-info">
                            <span class="school-type">${escapeHtml(typeLabel)}</span>
                            <span class="location">${escapeHtml(cred.issued_by || 'Unknown')}</span>
                        </div>
                        <div class="request-footer">
                            <span class="timestamp">${timeAgo}</span>
                            <button onclick="event.stopPropagation(); viewCredentialDetails(${cred.id}, '${credStatus}')" class="action-btn">Review</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getStatusTag(status) {
        const statusMap = {
            'pending': { text: 'NEW', class: 'new' },
            'verified': { text: 'APPROVED', class: 'approved' },
            'rejected': { text: 'REJECTED', class: 'rejected' },
            'suspended': { text: 'SUSPENDED', class: 'suspended' }
        };
        return statusMap[status] || statusMap['pending'];
    }

    function renderEmptyLiveWidget(container, message) {
        const displayMessage = message || 'No pending credentials';
        const isError = message && message !== null;

        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 px-4">
                <div class="w-20 h-20 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-4">
                    <i class="fas ${isError ? 'fa-exclamation-circle text-yellow-400' : 'fa-certificate text-gray-300'} text-3xl"></i>
                </div>
                <h4 class="text-base font-medium text-gray-700 mb-1">${isError ? 'Oops!' : 'All Clear!'}</h4>
                <p class="text-sm text-gray-500 text-center">${escapeHtml(displayMessage)}</p>
                ${!isError ? `
                    <p class="text-xs text-gray-400 mt-2 text-center">New credential requests will appear here automatically</p>
                ` : `
                    <button onclick="loadLiveCredentialsWidget()" class="mt-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <i class="fas fa-refresh mr-1"></i> Retry
                    </button>
                `}
            </div>
        `;
    }

    function formatTimeAgo(dateString) {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    // Expose for manual refresh
    window.loadLiveCredentialsWidget = loadLiveCredentialsWidget;

    // ============================================================
    // RENDER CREDENTIALS TABLE
    // ============================================================

    function renderCredentialsTable(tbodyId, credentials, status = 'pending') {
        const tbody = document.getElementById(tbodyId);
        if (!tbody) {
            console.warn(`Table body not found: ${tbodyId}`);
            return;
        }

        if (!credentials || credentials.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="p-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-folder-open text-4xl mb-4 text-gray-300"></i>
                            <p class="text-lg font-medium">No credentials found</p>
                            <p class="text-sm">Credentials will appear here when submitted</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = credentials.map(cred => {
            const date = cred.created_at ? new Date(cred.created_at).toLocaleDateString() : '-';
            const typeLabel = getCredentialTypeLabel(cred.document_type);
            const credStatus = cred.verification_status || status;

            // Show admin who changed status (verified_by_admin_id), or '-' if never processed
            const statusByValue = cred.verified_by_admin_id ? `Admin #${cred.verified_by_admin_id}` : '-';

            return `
                <tr class="border-b hover:bg-gray-50 transition-colors">
                    <td class="p-4">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <i class="fas ${getCredentialIcon(cred.document_type)} text-blue-600"></i>
                            </div>
                            <div>
                                <p class="font-medium">${escapeHtml(cred.title)}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-4">
                        <span class="px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeClass(cred.document_type)}">
                            ${typeLabel}
                        </span>
                    </td>
                    <td class="p-4">
                        <div class="flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <i class="fas fa-user text-gray-500 text-xs"></i>
                            </div>
                            <div>
                                <p class="text-sm font-medium">${escapeHtml(cred.uploader_role || '-')}</p>
                                <p class="text-xs text-gray-500">ID: ${cred.uploader_id}</p>
                            </div>
                        </div>
                    </td>
                    <td class="p-4 text-sm text-gray-600">${statusByValue}</td>
                    <td class="p-4 text-sm text-gray-600">${date}</td>
                    <td class="p-4">
                        <div class="flex gap-2">
                            <button onclick="viewCredentialDetails(${cred.id}, '${credStatus}')"
                                class="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2" title="View Details">
                                <i class="fas fa-eye"></i>
                                <span class="text-sm font-medium">View</span>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================================
    // CREDENTIAL VIEW MODAL & ACTIONS
    // ============================================================

    // Store current credential data for modal actions
    let currentCredential = null;
    let allCredentials = {}; // Cache credentials by ID

    // Open View Credential Modal
    window.viewCredentialDetails = async function(credentialId, status = 'pending') {
        console.log('Viewing credential:', credentialId, 'Status:', status);

        // Try to find credential in cache first
        let credential = allCredentials[credentialId];

        // If not in cache, fetch from appropriate list
        if (!credential) {
            try {
                const token = getAuthToken();
                // Try to get from the correct endpoint based on status
                const endpoint = status === 'verified' ? 'verified' :
                                status === 'rejected' ? 'rejected' :
                                status === 'suspended' ? 'suspended' : 'pending';

                const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/${endpoint}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const credentials = await response.json();
                    credential = credentials.find(c => c.id === credentialId);
                    if (credential) {
                        allCredentials[credentialId] = credential;
                    }
                }
            } catch (error) {
                console.error('Error fetching credential:', error);
            }
        }

        if (!credential) {
            showNotification('Credential not found', 'error');
            return;
        }

        // Update credential status from the panel it was clicked from
        // This ensures buttons match the panel context (e.g., verified panel shows suspend/reject)
        if (status && credential.verification_status !== status) {
            console.log('Updating credential status from', credential.verification_status, 'to', status);
            credential.verification_status = status;
            allCredentials[credentialId] = credential; // Update cache
        }

        currentCredential = credential;
        populateViewCredentialModal(credential);
        openViewCredentialModal();
    };

    // Populate modal with credential data
    function populateViewCredentialModal(cred) {
        // Title and ID
        document.getElementById('view-credential-title').textContent = cred.title || 'Untitled Credential';
        document.getElementById('view-credential-id').textContent = `ID: CRED-${String(cred.id).padStart(6, '0')}`;

        // Type badge
        const typeBadge = document.getElementById('view-credential-type-badge');
        const typeLabel = getCredentialTypeLabel(cred.document_type);
        const typeIcon = getCredentialIcon(cred.document_type);
        typeBadge.innerHTML = `<i class="fas ${typeIcon} mr-2"></i>${typeLabel}`;
        typeBadge.className = `px-4 py-2 rounded-full text-sm font-semibold ${getTypeBadgeClass(cred.document_type)}`;

        // Status badge
        const statusBadge = document.getElementById('view-credential-status-badge');
        const status = cred.verification_status || 'pending';
        const statusConfig = {
            'pending': { icon: 'fa-clock', text: 'Pending Review', class: 'bg-yellow-100 text-yellow-800' },
            'verified': { icon: 'fa-check-circle', text: 'Verified', class: 'bg-green-100 text-green-800' },
            'rejected': { icon: 'fa-times-circle', text: 'Rejected', class: 'bg-red-100 text-red-800' },
            'suspended': { icon: 'fa-pause-circle', text: 'Suspended', class: 'bg-orange-100 text-orange-800' }
        };
        const statusInfo = statusConfig[status] || statusConfig['pending'];
        statusBadge.innerHTML = `<i class="fas ${statusInfo.icon} mr-2"></i>${statusInfo.text}`;
        statusBadge.className = `px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.class}`;

        // Basic info
        document.getElementById('view-credential-issuer').textContent = cred.issued_by || 'Not specified';
        document.getElementById('view-credential-issue-date').textContent = cred.date_of_issue ?
            new Date(cred.date_of_issue).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Not specified';
        document.getElementById('view-credential-expiry-date').textContent = cred.expiry_date ?
            new Date(cred.expiry_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'No Expiry';
        document.getElementById('view-credential-submitted').textContent = cred.created_at ?
            getTimeAgo(new Date(cred.created_at)) : 'Unknown';

        // Uploader info
        document.getElementById('view-credential-uploader-name').textContent = cred.uploader_name || 'Unknown User';
        document.getElementById('view-credential-uploader-info').textContent =
            `Role: ${capitalizeFirst(cred.uploader_role || 'user')} | ID: ${cred.uploader_id || '-'}`;

        // Description
        document.getElementById('view-credential-description').textContent =
            cred.description || 'No description provided for this credential.';

        // Document section
        const docSection = document.getElementById('view-credential-document-section');
        if (cred.document_url) {
            docSection.classList.remove('hidden');
            document.getElementById('view-credential-document-link').href = cred.document_url;
            document.getElementById('view-credential-document-name').textContent =
                cred.document_url.split('/').pop() || 'View Document';
        } else {
            docSection.classList.add('hidden');
        }

        // Rejection/Suspension reason section
        const reasonSection = document.getElementById('view-credential-reason-section');
        if (status === 'rejected' || status === 'suspended') {
            reasonSection.classList.remove('hidden');
            const reasonLabel = document.getElementById('view-credential-reason-label');
            const reasonBox = reasonSection.querySelector('div > div');

            if (status === 'rejected') {
                reasonLabel.textContent = 'Rejection Reason';
                reasonBox.className = 'bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-700';
            } else {
                reasonLabel.textContent = 'Suspension Reason';
                reasonBox.className = 'bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-700';
            }

            document.getElementById('view-credential-reason').textContent = cred.rejection_reason || 'No reason provided';
            document.getElementById('view-credential-reason-date').textContent =
                status === 'rejected' && cred.rejected_at ?
                    `Rejected on: ${new Date(cred.rejected_at).toLocaleDateString()}` :
                    `${capitalizeFirst(status)} on: ${cred.updated_at ? new Date(cred.updated_at).toLocaleDateString() : '-'}`;
        } else {
            reasonSection.classList.add('hidden');
        }

        // Verification section (for verified credentials)
        const verificationSection = document.getElementById('view-credential-verification-section');
        if (status === 'verified') {
            verificationSection.classList.remove('hidden');
            document.getElementById('view-credential-verified-date').textContent =
                `Verified on: ${cred.updated_at ? new Date(cred.updated_at).toLocaleDateString() : '-'}`;
            document.getElementById('view-credential-verified-by').textContent =
                `Verified by: Admin #${cred.verified_by_admin_id || '-'}`;
        } else {
            verificationSection.classList.add('hidden');
        }

        // Action buttons based on status
        renderModalActionButtons(status);
    }

    // Render action buttons based on credential status
    function renderModalActionButtons(status) {
        const actionsContainer = document.getElementById('view-credential-actions');

        const buttons = {
            'pending': `
                <button onclick="verifyCredentialFromModal()" class="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-check"></i> Verify
                </button>
                <button onclick="openRejectionReasonModal()" class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-times"></i> Reject
                </button>
            `,
            'verified': `
                <button onclick="openSuspensionReasonModal()" class="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-pause"></i> Suspend
                </button>
                <button onclick="openRejectionReasonModal()" class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-times"></i> Reject
                </button>
            `,
            'rejected': `
                <button onclick="reconsiderCredential()" class="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-undo"></i> Reconsider
                </button>
                <button onclick="verifyCredentialFromModal()" class="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-check"></i> Verify Anyway
                </button>
            `,
            'suspended': `
                <button onclick="reinstateCredential()" class="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-undo"></i> Reinstate
                </button>
                <button onclick="openRejectionReasonModal()" class="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium">
                    <i class="fas fa-times"></i> Reject
                </button>
            `
        };

        actionsContainer.innerHTML = buttons[status] || '';
    }

    // Modal control functions
    function openViewCredentialModal() {
        const modal = document.getElementById('view-credential-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    window.closeViewCredentialModal = function() {
        const modal = document.getElementById('view-credential-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
        currentCredential = null;
    };

    // Rejection reason modal
    window.openRejectionReasonModal = function() {
        const modal = document.getElementById('rejection-reason-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('rejection-reason-input').value = '';
            document.getElementById('rejection-reason-input').focus();
        }
    };

    window.closeRejectionReasonModal = function() {
        const modal = document.getElementById('rejection-reason-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    // Suspension reason modal
    window.openSuspensionReasonModal = function() {
        const modal = document.getElementById('suspension-reason-modal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
            document.getElementById('suspension-reason-input').value = '';
            document.getElementById('suspension-reason-input').focus();
        }
    };

    window.closeSuspensionReasonModal = function() {
        const modal = document.getElementById('suspension-reason-modal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    };

    // ============================================================
    // CREDENTIAL ACTION HANDLERS (from modal)
    // ============================================================

    window.verifyCredentialFromModal = async function() {
        if (!currentCredential) return;

        try {
            const token = getAuthToken();
            const adminId = parseInt(localStorage.getItem('adminId'));

            if (!adminId) {
                throw new Error('Admin ID not found. Please log in again.');
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/${currentCredential.id}/verify`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'verify',
                    admin_id: adminId
                })
            });

            if (response.ok) {
                showNotification('Credential verified successfully!', 'success');
                closeViewCredentialModal();
                refreshAllCredentialLists();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to verify credential');
            }
        } catch (error) {
            console.error('Error verifying credential:', error);
            showNotification(error.message || 'Error verifying credential', 'error');
        }
    };

    window.confirmRejectCredential = async function() {
        if (!currentCredential) return;

        const reason = document.getElementById('rejection-reason-input').value.trim();
        if (!reason) {
            showNotification('Please provide a rejection reason', 'warning');
            return;
        }

        try {
            const token = getAuthToken();
            const adminId = parseInt(localStorage.getItem('adminId'));

            if (!adminId) {
                throw new Error('Admin ID not found. Please log in again.');
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/${currentCredential.id}/verify`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'reject',
                    reason: reason,
                    admin_id: adminId
                })
            });

            if (response.ok) {
                showNotification('Credential rejected', 'info');
                closeRejectionReasonModal();
                closeViewCredentialModal();
                refreshAllCredentialLists();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to reject credential');
            }
        } catch (error) {
            console.error('Error rejecting credential:', error);
            showNotification(error.message || 'Error rejecting credential', 'error');
        }
    };

    window.confirmSuspendCredential = async function() {
        if (!currentCredential) return;

        const reason = document.getElementById('suspension-reason-input').value.trim();
        if (!reason) {
            showNotification('Please provide a suspension reason', 'warning');
            return;
        }

        try {
            const token = getAuthToken();
            const adminId = parseInt(localStorage.getItem('adminId'));

            if (!adminId) {
                throw new Error('Admin ID not found. Please log in again.');
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/${currentCredential.id}/verify`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'suspend',
                    reason: reason,
                    admin_id: adminId
                })
            });

            if (response.ok) {
                showNotification('Credential suspended', 'warning');
                closeSuspensionReasonModal();
                closeViewCredentialModal();
                refreshAllCredentialLists();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to suspend credential');
            }
        } catch (error) {
            console.error('Error suspending credential:', error);
            showNotification(error.message || 'Error suspending credential', 'error');
        }
    };

    window.reinstateCredential = async function() {
        if (!currentCredential) return;

        if (!confirm('Are you sure you want to reinstate this credential to verified status?')) return;

        try {
            const token = getAuthToken();
            const adminId = parseInt(localStorage.getItem('adminId'));

            if (!adminId) {
                throw new Error('Admin ID not found. Please log in again.');
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/${currentCredential.id}/verify`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'reactivate',
                    admin_id: adminId
                })
            });

            if (response.ok) {
                showNotification('Credential reinstated successfully!', 'success');
                closeViewCredentialModal();
                refreshAllCredentialLists();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to reinstate credential');
            }
        } catch (error) {
            console.error('Error reinstating credential:', error);
            showNotification(error.message || 'Error reinstating credential', 'error');
        }
    };

    window.reconsiderCredential = async function() {
        if (!currentCredential) return;

        if (!confirm('Move this credential back to pending for reconsideration?')) return;

        try {
            const token = getAuthToken();
            const adminId = parseInt(localStorage.getItem('adminId'));

            if (!adminId) {
                throw new Error('Admin ID not found. Please log in again.');
            }

            const response = await fetch(`${API_BASE_URL_CRED}/api/admin/credentials/${currentCredential.id}/verify`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'reconsider',
                    admin_id: adminId
                })
            });

            if (response.ok) {
                showNotification('Credential moved to pending for reconsideration', 'info');
                closeViewCredentialModal();
                refreshAllCredentialLists();
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to reconsider credential');
            }
        } catch (error) {
            console.error('Error reconsidering credential:', error);
            showNotification(error.message || 'Error reconsidering credential', 'error');
        }
    };

    // Refresh all lists after an action
    function refreshAllCredentialLists() {
        loadPendingCredentials();
        loadVerifiedCredentials();
        loadRejectedCredentials();
        loadSuspendedCredentials();
        loadDashboardStats();
        loadLiveCredentialsWidget();
    }

    // Helper: Get time ago string
    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
            }
        }
        return 'Just now';
    }

    // Helper: Capitalize first letter
    function capitalizeFirst(str) {
        return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    }

    // ============================================================
    // FILTER FUNCTIONS
    // ============================================================

    window.clearVerifiedFilters = function() {
        document.getElementById('verified-search-input').value = '';
        document.getElementById('verified-type-filter').value = '';
        document.getElementById('verified-role-filter').value = '';
        loadVerifiedCredentials();
    };

    window.clearRequestedFilters = function() {
        document.getElementById('requested-search-input').value = '';
        document.getElementById('requested-type-filter').value = '';
        document.getElementById('requested-role-filter').value = '';
        loadPendingCredentials();
    };

    window.clearRejectedFilters = function() {
        document.getElementById('rejected-search-input').value = '';
        document.getElementById('rejected-type-filter').value = '';
        document.getElementById('rejected-role-filter').value = '';
        loadRejectedCredentials();
    };

    window.clearSuspendedFilters = function() {
        document.getElementById('suspended-search-input').value = '';
        document.getElementById('suspended-type-filter').value = '';
        document.getElementById('suspended-role-filter').value = '';
        loadSuspendedCredentials();
    };

    // ============================================================
    // PLACEHOLDER FUNCTIONS FOR SIDEBAR LINKS
    // ============================================================

    window.openCredentialReports = function() {
        alert('Credential Reports - Coming Soon');
    };

    window.openVerificationGuidelines = function() {
        alert('Verification Guidelines - Coming Soon');
    };

    window.openCredentialSettings = function() {
        alert('Credential Settings - Coming Soon');
    };

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    function getCredentialTypeLabel(type) {
        const labels = {
            'academic': 'Academic',
            'achievement': 'Achievement',
            'experience': 'Experience',
            'certification': 'Certification',
            'academic_certificate': 'Academic Certificate',
            'extracurricular': 'Extracurricular'
        };
        return labels[type] || type || 'Unknown';
    }

    function getCredentialIcon(type) {
        const icons = {
            'academic': 'fa-graduation-cap',
            'achievement': 'fa-trophy',
            'experience': 'fa-briefcase',
            'certification': 'fa-certificate',
            'academic_certificate': 'fa-scroll',
            'extracurricular': 'fa-running'
        };
        return icons[type] || 'fa-file-alt';
    }

    function getTypeBadgeClass(type) {
        const classes = {
            'academic': 'bg-blue-100 text-blue-700',
            'achievement': 'bg-yellow-100 text-yellow-700',
            'experience': 'bg-purple-100 text-purple-700',
            'certification': 'bg-green-100 text-green-700'
        };
        return classes[type] || 'bg-gray-100 text-gray-700';
    }

    function getStatusBadge(status) {
        const badges = {
            'pending': '<span class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Pending</span>',
            'verified': '<span class="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Verified</span>',
            'rejected': '<span class="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Rejected</span>',
            'suspended': '<span class="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Suspended</span>'
        };
        return badges[status] || badges['pending'];
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' :
                       type === 'error' ? 'bg-red-500' :
                       type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

        notification.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${bgColor} text-white transition-all duration-300`;
        notification.innerHTML = `
            <div class="flex items-center gap-2">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('translate-x-full', 'opacity-0');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // ============================================================
    // LIVE CLOCK
    // ============================================================

    function startClock() {
        updateClock();
        setInterval(updateClock, 1000);
    }

    function updateClock() {
        const timeElement = document.getElementById('current-time');
        const dateElement = document.getElementById('current-date');

        if (timeElement && dateElement) {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            dateElement.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    }

    // ============================================================
    // THEME TOGGLE
    // ============================================================

    window.toggleTheme = function() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Toggle icons
        const moonIcon = document.getElementById('moon-icon');
        const sunIcon = document.getElementById('sun-icon');
        if (moonIcon && sunIcon) {
            if (newTheme === 'dark') {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'inline';
            } else {
                moonIcon.style.display = 'inline';
                sunIcon.style.display = 'none';
            }
        }
    };

    // Initialize theme from localStorage
    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        const moonIcon = document.getElementById('moon-icon');
        const sunIcon = document.getElementById('sun-icon');
        if (moonIcon && sunIcon) {
            if (savedTheme === 'dark') {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'inline';
            } else {
                moonIcon.style.display = 'inline';
                sunIcon.style.display = 'none';
            }
        }
    }

    // ============================================================
    // PROFILE DROPDOWN
    // ============================================================

    window.toggleProfileDropdown = function() {
        const menu = document.getElementById('profile-dropdown-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    };

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const dropdown = document.getElementById('profile-dropdown-menu');
        const toggle = document.getElementById('profile-dropdown-toggle');
        if (dropdown && toggle && !toggle.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    // ============================================================
    // SETTINGS PANEL FUNCTIONS
    // ============================================================

    window.openVerifyPersonalInfoModal = function() {
        console.log('Verify Personal Information - Coming Soon');
    };

    window.openAddPaymentMethodModal = function() {
        console.log('Add Payment Method - Coming Soon');
    };

    window.openLeaveRequestModal = function() {
        console.log('File Leave Request - Coming Soon');
    };

    window.openResignModal = function() {
        console.log('Resign - Coming Soon');
    };

    // ============================================================
    // INITIALIZE ON DOM READY
    // ============================================================

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initTheme();
            initPage();
        });
    } else {
        initTheme();
        initPage();
    }

    console.log('Manage Credentials Standalone script loaded');

})();
