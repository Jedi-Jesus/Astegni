/**
 * Manage Campaigns - Table Loader Module
 * Dynamically loads campaign data from database with search and filters
 */

(function() {
    'use strict';

    const API_BASE_URL = 'https://api.astegni.com';

    // Current filters for each panel
    const panelFilters = {
        requested: { search: '', industry: '', ad_type: '' },
        verified: { search: '', industry: '', ad_type: '' },
        rejected: { search: '', industry: '', ad_type: '' },
        suspended: { search: '', industry: '', ad_type: '' }
    };

    // Store admin data
    let currentAdminId = null;

    /**
     * Initialize table loaders
     */
    function initializeTableLoaders() {
        // Get admin ID from session
        const adminData = getAdminDataFromSession();
        if (adminData) {
            currentAdminId = adminData.id;
        }

        // Set up search inputs with debouncing
        setupSearchInputs();

        // Set up filter dropdowns
        setupFilterDropdowns();

        // Load initial data for all panels
        loadPanelData('requested');
        loadPanelData('verified');
        loadPanelData('rejected');
        loadPanelData('suspended');

        // Load live requests widget
        loadLiveRequests();

        // Refresh live requests every 30 seconds
        setInterval(loadLiveRequests, 30000);
    }

    /**
     * Get admin data from session
     */
    function getAdminDataFromSession() {
        const adminSession = localStorage.getItem('adminSession');
        if (adminSession) {
            try {
                return JSON.parse(adminSession);
            } catch (e) {
                console.error('Failed to parse admin session:', e);
            }
        }
        return null;
    }

    /**
     * Setup search inputs with debouncing
     */
    function setupSearchInputs() {
        const panels = ['requested', 'verified', 'rejected', 'suspended'];

        panels.forEach(panel => {
            const searchInput = document.querySelector(`#${panel}-panel .search-input`);
            if (searchInput) {
                let debounceTimer;
                searchInput.addEventListener('input', function(e) {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        panelFilters[panel].search = e.target.value.trim();
                        loadPanelData(panel);
                    }, 300);
                });
            }
        });
    }

    /**
     * Setup filter dropdowns
     */
    function setupFilterDropdowns() {
        const panels = ['requested', 'verified', 'rejected', 'suspended'];

        panels.forEach(panel => {
            // Industry filter
            const industrySelect = document.querySelector(`#${panel}-panel .industry-filter`);
            if (industrySelect) {
                industrySelect.addEventListener('change', function(e) {
                    panelFilters[panel].industry = e.target.value;
                    loadPanelData(panel);
                });
            }

            // Ad type filter
            const adTypeSelect = document.querySelector(`#${panel}-panel .ad-type-filter`);
            if (adTypeSelect) {
                adTypeSelect.addEventListener('change', function(e) {
                    panelFilters[panel].ad_type = e.target.value;
                    loadPanelData(panel);
                });
            }
        });
    }

    /**
     * Load campaigns for a specific panel
     */
    async function loadPanelData(panelName) {
        try {
            // Map panel names to API status values
            const statusMap = {
                'requested': 'pending',
                'verified': 'verified',
                'rejected': 'rejected',
                'suspended': 'suspended'
            };

            const status = statusMap[panelName];
            const filters = panelFilters[panelName];

            // Build query parameters
            const params = new URLSearchParams({
                status: status,
                limit: 50,
                offset: 0
            });

            if (filters.search) params.append('search', filters.search);
            if (filters.industry) params.append('industry', filters.industry);
            if (filters.ad_type) params.append('ad_type', filters.ad_type);
            if (currentAdminId) params.append('admin_id', currentAdminId);

            const response = await fetch(`${API_BASE_URL}/api/manage-campaigns/campaigns?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Update the table for this panel
            updatePanelTable(panelName, data.campaigns);

            // Update panel stats
            updatePanelStatsFromData(panelName, data);

            console.log(`✓ Loaded ${data.campaigns.length} campaigns for ${panelName} panel`);

        } catch (error) {
            console.error(`Failed to load ${panelName} campaigns:`, error);
            showNotification(`Failed to load ${panelName} campaigns`, 'error');
        }
    }

    /**
     * Update panel table with campaign data
     */
    function updatePanelTable(panelName, campaigns) {
        const panel = document.getElementById(`${panelName}-panel`);
        if (!panel) return;

        const tbody = panel.querySelector('tbody');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        if (campaigns.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="p-8 text-center text-gray-500">
                        <div class="text-4xl mb-4">📭</div>
                        <div class="text-lg font-semibold mb-2">No campaigns found</div>
                        <div class="text-sm">Try adjusting your search or filters</div>
                    </td>
                </tr>
            `;
            return;
        }

        // Create rows for each campaign
        campaigns.forEach(campaign => {
            const row = createCampaignRow(campaign, panelName);
            tbody.appendChild(row);
        });
    }

    /**
     * Create a table row for a campaign
     */
    function createCampaignRow(campaign, panelName) {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50';

        // Format dates
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            return new Date(dateString).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        const submittedDate = formatDate(campaign.submitted_date);
        const rejectedDate = formatDate(campaign.rejected_date);
        const suspendedDate = formatDate(campaign.suspended_date);

        // Get campaign name (handle both 'name' and 'campaign_name' fields)
        const campaignName = campaign.campaign_name || campaign.name || 'Unnamed Campaign';

        // Format target audience
        const targetAudience = Array.isArray(campaign.target_audience)
            ? campaign.target_audience.join(', ')
            : campaign.target_audience || 'N/A';

        // Build row HTML based on panel - New simplified structure with dates
        if (panelName === 'requested') {
            tr.innerHTML = `
                <td class="p-4">${escapeHtml(campaign.company_name || 'Unknown')}</td>
                <td class="p-4">${escapeHtml(campaignName)}</td>
                <td class="p-4">${escapeHtml(campaign.ad_type || 'N/A')}</td>
                <td class="p-4">${escapeHtml(targetAudience)}</td>
                <td class="p-4 text-sm text-gray-600">${submittedDate}</td>
                <td class="p-4">
                    <div class="flex gap-2">
                        <button onclick="viewCampaign(${campaign.id})"
                            class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            `;
        } else if (panelName === 'verified') {
            tr.innerHTML = `
                <td class="p-4">${escapeHtml(campaign.company_name || 'Unknown')}</td>
                <td class="p-4">${escapeHtml(campaignName)}</td>
                <td class="p-4">${escapeHtml(campaign.ad_type || 'N/A')}</td>
                <td class="p-4">${escapeHtml(targetAudience)}</td>
                <td class="p-4">
                    <div class="flex gap-2">
                        <button onclick="viewCampaign(${campaign.id})"
                            class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            `;
        } else if (panelName === 'rejected') {
            // Truncate reason for table display
            const truncatedReason = campaign.rejected_reason
                ? (campaign.rejected_reason.length > 50
                    ? campaign.rejected_reason.substring(0, 50) + '...'
                    : campaign.rejected_reason)
                : 'N/A';

            tr.innerHTML = `
                <td class="p-4">${escapeHtml(campaign.company_name || 'Unknown')}</td>
                <td class="p-4">${escapeHtml(campaignName)}</td>
                <td class="p-4">${escapeHtml(campaign.ad_type || 'N/A')}</td>
                <td class="p-4 text-sm text-gray-600">${rejectedDate}</td>
                <td class="p-4 text-sm text-gray-600" title="${escapeHtml(campaign.rejected_reason || 'N/A')}">${escapeHtml(truncatedReason)}</td>
                <td class="p-4">
                    <div class="flex gap-2">
                        <button onclick="viewCampaign(${campaign.id})"
                            class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            `;
        } else if (panelName === 'suspended') {
            // Truncate reason for table display
            const truncatedReason = campaign.suspended_reason
                ? (campaign.suspended_reason.length > 50
                    ? campaign.suspended_reason.substring(0, 50) + '...'
                    : campaign.suspended_reason)
                : 'N/A';

            tr.innerHTML = `
                <td class="p-4">${escapeHtml(campaign.company_name || 'Unknown')}</td>
                <td class="p-4">${escapeHtml(campaignName)}</td>
                <td class="p-4">${escapeHtml(campaign.ad_type || 'N/A')}</td>
                <td class="p-4 text-sm text-gray-600">${suspendedDate}</td>
                <td class="p-4 text-sm text-gray-600" title="${escapeHtml(campaign.suspended_reason || 'N/A')}">${escapeHtml(truncatedReason)}</td>
                <td class="p-4">
                    <div class="flex gap-2">
                        <button onclick="viewCampaign(${campaign.id})"
                            class="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </td>
            `;
        }

        return tr;
    }

    /**
     * Get status badge HTML
     */
    function getStatusBadge(status) {
        const badges = {
            'pending': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>',
            'verified': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Verified</span>',
            'rejected': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Rejected</span>',
            'suspended': '<span class="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Suspended</span>'
        };
        return badges[status] || badges['pending'];
    }

    /**
     * Update panel stats from loaded data
     */
    function updatePanelStatsFromData(panelName, data) {
        const panel = document.getElementById(`${panelName}-panel`);
        if (!panel) return;

        const statsCards = panel.querySelectorAll('.dashboard-grid .card');
        if (statsCards.length > 0) {
            // Update first stat card with total count
            const countEl = statsCards[0].querySelector('.text-2xl');
            if (countEl) {
                countEl.textContent = data.total_count || 0;
            }
        }
    }

    /**
     * Load live campaign requests for widget
     */
    async function loadLiveRequests() {
        try {
            const params = new URLSearchParams({
                limit: 20
            });

            if (currentAdminId) {
                params.append('admin_id', currentAdminId);
            }

            const response = await fetch(`${API_BASE_URL}/api/manage-campaigns/campaigns/live-requests?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Update live widget
            updateLiveWidget(data.requests);

            console.log(`✓ Loaded ${data.requests.length} live campaign requests`);

        } catch (error) {
            console.error('Failed to load live requests:', error);
        }
    }

    /**
     * Update live campaign requests widget
     */
    function updateLiveWidget(requests) {
        const container = document.querySelector('.campaign-requests-scroll');
        if (!container) return;

        // Clear existing items
        container.innerHTML = '';

        // Icon mapping
        const iconMap = {
            'brand_awareness': 'fa-bullhorn',
            'lead_generation': 'fa-users',
            'conversions': 'fa-shopping-cart',
            'engagement': 'fa-heart',
            'student_enrollment': 'fa-graduation-cap',
            'app_downloads': 'fa-mobile-alt',
            'website_traffic': 'fa-globe'
        };

        const colorMap = {
            'pending': 'blue',
            'verified': 'green',
            'rejected': 'red',
            'suspended': 'orange'
        };

        // Create items
        requests.forEach(request => {
            const icon = iconMap[request.objective] || 'fa-bullhorn';
            const color = colorMap[request.status] || 'blue';

            const statusTag = request.status.toUpperCase();
            let statusClass = 'new';
            if (request.status === 'verified') statusClass = 'approved';
            else if (request.status === 'rejected') statusClass = 'rejected';
            else if (request.status === 'pending') statusClass = 'pending';

            const budget = new Intl.NumberFormat('en-ET', {
                maximumFractionDigits: 0
            }).format(request.budget);

            const item = document.createElement('div');
            item.className = 'campaign-request-item';
            item.innerHTML = `
                <div class="request-content">
                    <div class="request-header">
                        <i class="fas ${icon} text-${color}-600"></i>
                        <span class="campaign-name">${escapeHtml(request.name)}</span>
                        <span class="status-tag ${statusClass}">${statusTag}</span>
                    </div>
                    <div class="request-info">
                        <span class="campaign-type">${escapeHtml(request.ad_type || 'Ad')}</span>
                        <span class="budget">${budget} ETB</span>
                    </div>
                    <div class="request-footer">
                        <span class="timestamp">${request.time_ago}</span>
                        <button class="action-btn" onclick="viewCampaign(${request.id})">Review</button>
                    </div>
                </div>
            `;

            container.appendChild(item);
        });

        // Duplicate all items for seamless scrolling
        const items = Array.from(container.children);
        items.forEach(item => {
            const clone = item.cloneNode(true);
            container.appendChild(clone);
        });
    }

    /**
     * Update campaign status (approve, reject, suspend, reinstate)
     */
    async function updateCampaignStatus(campaignId, newStatus, reason = null) {
        try {
            const body = {
                new_status: newStatus
            };

            // Add reason if provided
            if (reason) {
                body.reason = reason;
            }

            if (currentAdminId) {
                body.admin_id = currentAdminId;
            }

            const response = await fetch(
                `${API_BASE_URL}/api/manage-campaigns/campaigns/${campaignId}/status`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // IMMEDIATE table updates - reload all panels to reflect changes
            console.log(`✓ Campaign ${campaignId} status updated to ${newStatus}`);
            loadPanelData('requested');
            loadPanelData('verified');
            loadPanelData('rejected');
            loadPanelData('suspended');

            // Reload live widget
            loadLiveRequests();

            return result;

        } catch (error) {
            console.error('Failed to update campaign status:', error);
            throw error;
        }
    }

    /**
     * Global action handlers
     */
    window.viewCampaign = async function(campaignId) {
        try {
            // Open modal
            const modal = document.getElementById('view-campaign-modal');
            const loading = document.getElementById('campaign-loading');
            const content = document.getElementById('campaign-details-content');

            if (modal) {
                modal.classList.remove('hidden');
                loading.classList.remove('hidden');
                content.classList.add('hidden');
            }

            // Fetch campaign details
            const params = new URLSearchParams();
            if (currentAdminId) params.append('admin_id', currentAdminId);

            const response = await fetch(`${API_BASE_URL}/api/manage-campaigns/campaigns/${campaignId}?${params}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const campaign = await response.json();

            // Populate modal with campaign data
            populateCampaignModal(campaign);

            // Hide loading, show content
            loading.classList.add('hidden');
            content.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to load campaign details:', error);
            showNotification('Failed to load campaign details', 'error');
            closeViewCampaignModal();
        }
    };

    /**
     * Populate campaign modal with data
     */
    function populateCampaignModal(campaign) {
        // Store current campaign data globally for action buttons
        window.currentCampaign = campaign;

        // Basic info
        const campaignName = campaign.campaign_name || campaign.name || 'Unnamed Campaign';
        document.getElementById('detail-campaign-name').textContent = campaignName;
        document.getElementById('detail-company-name').textContent = campaign.company_name || 'N/A';
        document.getElementById('detail-campaign-id').textContent = campaign.id || 'N/A';
        document.getElementById('detail-ad-type').textContent = campaign.ad_type || 'N/A';
        document.getElementById('detail-campaign-objective').textContent = campaign.campaign_objective || 'N/A';

        // Format target audience (now in Target Demographics section)
        const targetAudience = Array.isArray(campaign.target_audience)
            ? campaign.target_audience.join(', ')
            : campaign.target_audience || 'N/A';
        document.getElementById('detail-target-audience').textContent = targetAudience;

        // Format target age range
        let targetAgeRange = 'N/A';
        if (campaign.target_age_range) {
            if (typeof campaign.target_age_range === 'object' && !Array.isArray(campaign.target_age_range)) {
                // Handle object format like {min: 18, max: 65}
                targetAgeRange = `${campaign.target_age_range.min || 'N/A'} - ${campaign.target_age_range.max || 'N/A'} years`;
            } else if (Array.isArray(campaign.target_age_range)) {
                targetAgeRange = campaign.target_age_range.join(', ');
            } else {
                targetAgeRange = String(campaign.target_age_range);
            }
        }
        const ageRangeEl = document.getElementById('detail-target-age-range');
        if (ageRangeEl) ageRangeEl.textContent = targetAgeRange;

        // Format target location (support both target_region and target_location)
        const targetLocationData = campaign.target_location || campaign.target_region;
        const targetLocation = Array.isArray(targetLocationData)
            ? targetLocationData.join(', ')
            : targetLocationData || 'N/A';
        const locationEl = document.getElementById('detail-target-location');
        if (locationEl) locationEl.textContent = targetLocation;

        // Dates
        if (campaign.start_date) {
            const startDate = new Date(campaign.start_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('detail-start-date').textContent = startDate;
        } else {
            document.getElementById('detail-start-date').textContent = 'N/A';
        }

        if (campaign.end_date) {
            const endDate = new Date(campaign.end_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            document.getElementById('detail-end-date').textContent = endDate;
        } else {
            document.getElementById('detail-end-date').textContent = 'N/A';
        }

        // Description
        document.getElementById('detail-description').textContent = campaign.description || 'No description provided';

        // Creative Media Preview (Images/Videos from Backblaze B2)
        const creativeMediaSection = document.getElementById('creative-media-section');
        const creativeMediaContainer = document.getElementById('detail-creative-media');
        const mediaPlaceholder = document.getElementById('media-placeholder');

        if (campaign.creative_urls && campaign.creative_urls.length > 0) {
            // Hide placeholder and show media
            if (mediaPlaceholder) mediaPlaceholder.classList.add('hidden');

            // Clear existing content except placeholder
            Array.from(creativeMediaContainer.children).forEach(child => {
                if (child.id !== 'media-placeholder') {
                    child.remove();
                }
            });

            campaign.creative_urls.forEach((url, index) => {
                const mediaWrapper = document.createElement('div');
                mediaWrapper.className = 'border rounded-lg overflow-hidden bg-gray-50';

                // Determine if it's a video or image based on file extension
                const isVideo = /\.(mp4|webm|mov|avi)$/i.test(url);
                const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

                if (isVideo) {
                    // Video player
                    mediaWrapper.innerHTML = `
                        <div class="p-2">
                            <div class="text-sm font-semibold mb-2 text-gray-700">
                                <i class="fas fa-video"></i> Video ${index + 1}
                            </div>
                            <video controls class="w-full rounded" style="max-height: 400px;">
                                <source src="${escapeHtml(url)}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                            <div class="mt-2 text-xs text-gray-500 truncate" title="${escapeHtml(url)}">
                                <i class="fas fa-link"></i> ${escapeHtml(url)}
                            </div>
                        </div>
                    `;
                } else if (isImage) {
                    // Image viewer
                    mediaWrapper.innerHTML = `
                        <div class="p-2">
                            <div class="text-sm font-semibold mb-2 text-gray-700">
                                <i class="fas fa-image"></i> Image ${index + 1}
                            </div>
                            <img src="${escapeHtml(url)}"
                                 alt="Campaign Image ${index + 1}"
                                 class="w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                                 style="max-height: 400px; object-fit: contain;"
                                 onclick="window.open('${escapeHtml(url)}', '_blank')">
                            <div class="mt-2 text-xs text-gray-500 truncate" title="${escapeHtml(url)}">
                                <i class="fas fa-link"></i> ${escapeHtml(url)}
                            </div>
                        </div>
                    `;
                } else {
                    // Unknown file type - show link
                    mediaWrapper.innerHTML = `
                        <div class="p-4">
                            <div class="text-sm font-semibold mb-2 text-gray-700">
                                <i class="fas fa-file"></i> Media File ${index + 1}
                            </div>
                            <a href="${escapeHtml(url)}" target="_blank"
                               class="text-blue-500 hover:text-blue-600 text-sm break-all">
                                <i class="fas fa-external-link-alt"></i> ${escapeHtml(url)}
                            </a>
                        </div>
                    `;
                }

                creativeMediaContainer.appendChild(mediaWrapper);
            });
        } else {
            // Show placeholder when no media
            if (mediaPlaceholder) mediaPlaceholder.classList.remove('hidden');

            // Remove any media elements (keep placeholder)
            Array.from(creativeMediaContainer.children).forEach(child => {
                if (child.id !== 'media-placeholder') {
                    child.remove();
                }
            });
        }

        // Campaign Socials
        const socialsContainer = document.getElementById('detail-campaign-socials');
        if (campaign.campaign_socials && Object.keys(campaign.campaign_socials).length > 0) {
            socialsContainer.innerHTML = '';
            for (const [platform, url] of Object.entries(campaign.campaign_socials)) {
                if (url) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.target = '_blank';
                    link.className = 'text-blue-500 hover:text-blue-600 flex items-center gap-2';
                    link.innerHTML = `<i class="fab fa-${platform.toLowerCase()}"></i> ${platform}: ${url}`;
                    socialsContainer.appendChild(link);
                }
            }
        } else {
            socialsContainer.innerHTML = '<p class="text-gray-500">No social media links provided</p>';
        }

        // Verification Status
        const statusBadge = getStatusBadge(campaign.verification_status);
        document.getElementById('detail-verification-status').innerHTML = statusBadge;

        // Reason sections - Show/Hide based on availability
        const rejectedReasonSection = document.getElementById('rejected-reason-section');
        const suspendedReasonSection = document.getElementById('suspended-reason-section');

        if (campaign.rejected_reason || campaign.rejected_date) {
            if (campaign.rejected_date) {
                const rejectedDate = new Date(campaign.rejected_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                document.getElementById('detail-rejected-date').textContent = rejectedDate;
            } else {
                document.getElementById('detail-rejected-date').textContent = 'N/A';
            }
            document.getElementById('detail-rejected-reason').textContent = campaign.rejected_reason || 'No rejection reason provided';
            rejectedReasonSection.classList.remove('hidden');
        } else {
            rejectedReasonSection.classList.add('hidden');
        }

        if (campaign.suspended_reason || campaign.suspended_date) {
            if (campaign.suspended_date) {
                const suspendedDate = new Date(campaign.suspended_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                document.getElementById('detail-suspended-date').textContent = suspendedDate;
            } else {
                document.getElementById('detail-suspended-date').textContent = 'N/A';
            }
            document.getElementById('detail-suspended-reason').textContent = campaign.suspended_reason || 'No suspension reason provided';
            suspendedReasonSection.classList.remove('hidden');
        } else {
            suspendedReasonSection.classList.add('hidden');
        }

        // Metadata - Submitted Date
        const submittedDateEl = document.getElementById('detail-submitted-date');
        if (submittedDateEl) {
            if (campaign.submitted_date || campaign.created_at) {
                const submittedDate = new Date(campaign.submitted_date || campaign.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                submittedDateEl.textContent = submittedDate;
            } else {
                submittedDateEl.textContent = 'N/A';
            }
        }

        // Dynamic action buttons based on verification status
        renderModalActionButtons(campaign.verification_status, campaign.id);
    }

    /**
     * Render dynamic action buttons in modal footer based on verification status
     */
    function renderModalActionButtons(status, campaignId) {
        const modalFooter = document.querySelector('#view-campaign-modal .modal-footer');
        if (!modalFooter) return;

        // Clear existing action buttons (keep close button)
        const existingButtons = modalFooter.querySelectorAll('button:not(.btn-secondary)');
        existingButtons.forEach(btn => btn.remove());

        // Create action buttons based on status
        let actionButtons = '';

        if (status === 'pending') {
            // Requested panel: Approve and Reject buttons
            actionButtons = `
                <button onclick="handleModalApprove(${campaignId})"
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button onclick="handleModalReject(${campaignId})"
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        } else if (status === 'verified') {
            // Verified panel: Reject and Suspend buttons
            actionButtons = `
                <button onclick="handleModalRejectVerified(${campaignId})"
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-ban"></i> Reject
                </button>
                <button onclick="handleModalSuspend(${campaignId})"
                    class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                    <i class="fas fa-pause"></i> Suspend
                </button>
            `;
        } else if (status === 'rejected') {
            // Rejected panel: Reconsider button
            actionButtons = `
                <button onclick="handleModalReconsider(${campaignId})"
                    class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                    <i class="fas fa-undo"></i> Reconsider
                </button>
            `;
        } else if (status === 'suspended') {
            // Suspended panel: Reject and Reinstate buttons
            actionButtons = `
                <button onclick="handleModalRejectSuspended(${campaignId})"
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                    <i class="fas fa-ban"></i> Reject
                </button>
                <button onclick="handleModalReinstate(${campaignId})"
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                    <i class="fas fa-check-circle"></i> Reinstate
                </button>
            `;
        }

        // Insert action buttons before close button
        const closeButton = modalFooter.querySelector('.btn-secondary');
        if (closeButton && actionButtons) {
            closeButton.insertAdjacentHTML('afterend', actionButtons);
        }
    }

    /**
     * Close campaign details modal
     */
    window.closeViewCampaignModal = function() {
        const modal = document.getElementById('view-campaign-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    };

    /**
     * Modal Action Handlers - With reason prompts and immediate updates
     */

    // From requested panel (pending status)
    window.handleModalApprove = async function(campaignId) {
        if (confirm('Are you sure you want to approve this campaign?')) {
            try {
                await updateCampaignStatus(campaignId, 'verified');
                showNotification('Campaign approved successfully!', 'success');
                closeViewCampaignModal();
            } catch (error) {
                showNotification('Failed to approve campaign', 'error');
            }
        }
    };

    window.handleModalReject = async function(campaignId) {
        const reason = prompt('Enter rejection reason (required):');
        if (reason && reason.trim()) {
            try {
                await updateCampaignStatus(campaignId, 'rejected', reason.trim());
                showNotification('Campaign rejected', 'warning');
                closeViewCampaignModal();
            } catch (error) {
                showNotification('Failed to reject campaign', 'error');
            }
        } else if (reason !== null) {
            alert('Rejection reason is required');
        }
    };

    // From verified panel
    window.handleModalRejectVerified = async function(campaignId) {
        const reason = prompt('Enter rejection reason (required):');
        if (reason && reason.trim()) {
            try {
                await updateCampaignStatus(campaignId, 'rejected', reason.trim());
                showNotification('Campaign rejected', 'warning');
                closeViewCampaignModal();
            } catch (error) {
                showNotification('Failed to reject campaign', 'error');
            }
        } else if (reason !== null) {
            alert('Rejection reason is required');
        }
    };

    window.handleModalSuspend = async function(campaignId) {
        const reason = prompt('Enter suspension reason (required):');
        if (reason && reason.trim()) {
            try {
                await updateCampaignStatus(campaignId, 'suspended', reason.trim());
                showNotification('Campaign suspended', 'warning');
                closeViewCampaignModal();
            } catch (error) {
                showNotification('Failed to suspend campaign', 'error');
            }
        } else if (reason !== null) {
            alert('Suspension reason is required');
        }
    };

    // From rejected panel
    window.handleModalReconsider = async function(campaignId) {
        if (confirm('Reconsider this rejected campaign and move it back to pending?')) {
            try {
                await updateCampaignStatus(campaignId, 'pending');
                showNotification('Campaign moved back to pending for reconsideration', 'info');
                closeViewCampaignModal();
            } catch (error) {
                showNotification('Failed to reconsider campaign', 'error');
            }
        }
    };

    // From suspended panel
    window.handleModalRejectSuspended = async function(campaignId) {
        const reason = prompt('Enter rejection reason (required):');
        if (reason && reason.trim()) {
            try {
                await updateCampaignStatus(campaignId, 'rejected', reason.trim());
                showNotification('Campaign rejected', 'warning');
                closeViewCampaignModal();
            } catch (error) {
                showNotification('Failed to reject campaign', 'error');
            }
        } else if (reason !== null) {
            alert('Rejection reason is required');
        }
    };

    window.handleModalReinstate = async function(campaignId) {
        if (confirm('Reinstate this suspended campaign and mark it as verified?')) {
            try {
                await updateCampaignStatus(campaignId, 'verified');
                showNotification('Campaign reinstated successfully!', 'success');
                closeViewCampaignModal();
            } catch (error) {
                showNotification('Failed to reinstate campaign', 'error');
            }
        }
    };

    /**
     * Utility: Escape HTML
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show notification
     */
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

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        if (window.location.href.includes('manage-campaigns.html')) {
            console.log('Initializing Campaign Table Loaders...');
            initializeTableLoaders();
        }
    });

    // Expose reload functions globally
    window.reloadCampaignPanel = loadPanelData;
    window.reloadLiveCampaigns = loadLiveRequests;

})();
