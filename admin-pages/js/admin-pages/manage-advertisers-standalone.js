/**
 * MANAGE ADVERTISERS - STANDALONE NAVIGATION & PANEL MANAGEMENT
 * Complete standalone script for manage-advertisers.html
 * Handles: Mode switching (Brand/Campaign), Sidebar navigation, Panel switching, Theme management
 *
 * Database Tables:
 * - Brand Mode: brand_profile table from astegni_user_db
 * - Campaign Mode: campaign_profile table from astegni_user_db
 *
 * API Endpoints:
 * - GET /api/admin-advertisers/brands - Get brands list
 * - GET /api/admin-advertisers/brands/counts - Get brand counts by status
 * - GET /api/admin-advertisers/campaigns - Get campaigns list
 * - GET /api/admin-advertisers/campaigns/counts - Get campaign counts by status
 * - GET /api/admin-advertisers/stats - Get combined stats
 */

// API Base URL - use existing if defined, otherwise set default
const ADVERTISERS_API_URL = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:8000';

// ==================== SECTION 1: MODE MANAGER ====================
const ModeManager = {
    currentMode: 'campaign', // 'brand' or 'campaign'

    init() {
        // Get mode from URL or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const modeFromUrl = urlParams.get('mode');
        const modeFromStorage = localStorage.getItem('advertiserMode');

        if (modeFromUrl && ['brand', 'campaign'].includes(modeFromUrl)) {
            this.currentMode = modeFromUrl;
        } else if (modeFromStorage && ['brand', 'campaign'].includes(modeFromStorage)) {
            this.currentMode = modeFromStorage;
        }

        this.applyMode(this.currentMode);
        console.log(`[ModeManager] Initialized with mode: ${this.currentMode}`);
    },

    switchMode(mode) {
        if (!['brand', 'campaign'].includes(mode)) {
            console.error(`[ModeManager] Invalid mode: ${mode}`);
            return;
        }

        if (mode === this.currentMode) {
            // Already in this mode, just switch to dashboard
            PanelManager.switchPanel(`${mode}-dashboard`);
            return;
        }

        this.currentMode = mode;
        localStorage.setItem('advertiserMode', mode);

        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('mode', mode);
        url.searchParams.delete('panel'); // Reset panel when switching mode
        window.history.pushState({ mode: mode }, '', url);

        this.applyMode(mode);

        // Switch to dashboard of new mode
        PanelManager.switchPanel(`${mode}-dashboard`);

        console.log(`[ModeManager] Switched to mode: ${mode}`);
    },

    applyMode(mode) {
        // Update mode link buttons
        const brandLink = document.getElementById('brand-mode-link');
        const campaignLink = document.getElementById('campaign-mode-link');

        if (brandLink && campaignLink) {
            brandLink.classList.remove('active', 'brand-mode');
            campaignLink.classList.remove('active');

            if (mode === 'brand') {
                brandLink.classList.add('active', 'brand-mode');
            } else {
                campaignLink.classList.add('active');
            }
        }

        // Update sidebar mode indicator
        const modeIndicator = document.getElementById('sidebar-mode-indicator');
        if (modeIndicator) {
            modeIndicator.classList.remove('brand-mode', 'campaign-mode');
            if (mode === 'brand') {
                modeIndicator.classList.add('brand-mode');
                modeIndicator.innerHTML = '<i class="fas fa-building mr-2"></i> Brand Mode';
            } else {
                modeIndicator.classList.add('campaign-mode');
                modeIndicator.innerHTML = '<i class="fas fa-bullhorn mr-2"></i> Campaign Mode';
            }
        }

        // Update logo subtitle
        const logoSubtitle = document.getElementById('logo-subtitle');
        if (logoSubtitle) {
            logoSubtitle.textContent = mode === 'brand' ? 'Manage Brands' : 'Manage Campaigns';
        }

        // Update sidebar links visibility
        const brandSidebarLinks = document.getElementById('brand-sidebar-links');
        const campaignSidebarLinks = document.getElementById('campaign-sidebar-links');

        if (brandSidebarLinks && campaignSidebarLinks) {
            if (mode === 'brand') {
                brandSidebarLinks.classList.add('active');
                brandSidebarLinks.style.display = 'block';
                campaignSidebarLinks.classList.remove('active');
                campaignSidebarLinks.style.display = 'none';
            } else {
                campaignSidebarLinks.classList.add('active');
                campaignSidebarLinks.style.display = 'block';
                brandSidebarLinks.classList.remove('active');
                brandSidebarLinks.style.display = 'none';
            }
        }

        // Update all mode-specific content visibility
        this.updateModeContent(mode);

        // Load data for the current mode
        this.loadModeData(mode);
    },

    updateModeContent(mode) {
        // Show/hide brand content
        const brandContent = document.querySelectorAll('.brand-content');
        const campaignContent = document.querySelectorAll('.campaign-content');

        brandContent.forEach(el => {
            if (mode === 'brand') {
                el.classList.add('active');
                el.style.display = '';
            } else {
                el.classList.remove('active');
                el.style.display = 'none';
            }
        });

        campaignContent.forEach(el => {
            if (mode === 'campaign') {
                el.classList.add('active');
                el.style.display = '';
            } else {
                el.classList.remove('active');
                el.style.display = 'none';
            }
        });
    },

    loadModeData(mode) {
        // This would load data from the appropriate database table
        // brand_profile or campaign_profile from astegni_user_db
        console.log(`[ModeManager] Loading data for ${mode} mode from ${mode}_profile table`);

        if (mode === 'brand') {
            this.loadBrandData();
        } else {
            this.loadCampaignData();
        }
    },

    async loadBrandData() {
        // Load brand data from brand_profile table via API
        try {
            const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/brands/counts`);

            let counts;
            if (response.ok) {
                counts = await response.json();
                console.log('[ModeManager] Brand counts from API:', counts);
            } else {
                // Fallback to placeholder data if API fails
                console.warn('[ModeManager] API failed, using placeholder data');
                counts = {
                    verified: 0,
                    pending: 0,
                    rejected: 0,
                    suspended: 0,
                    total: 0
                };
            }

            // Update UI elements
            const verifiedEl = document.getElementById('brand-verified-count');
            const pendingEl = document.getElementById('brand-pending-count');
            const rejectedEl = document.getElementById('brand-rejected-count');
            const suspendedEl = document.getElementById('brand-suspended-count');
            const totalEl = document.getElementById('brand-total-count');
            const modeCountEl = document.getElementById('brand-count');

            if (verifiedEl) verifiedEl.textContent = counts.verified || 0;
            if (pendingEl) pendingEl.textContent = counts.pending || 0;
            if (rejectedEl) rejectedEl.textContent = counts.rejected || 0;
            if (suspendedEl) suspendedEl.textContent = counts.suspended || 0;
            if (totalEl) totalEl.textContent = counts.total || 0;
            if (modeCountEl) modeCountEl.textContent = counts.pending || 0;

            // Update quota widget
            this.updateBrandQuotaWidget(counts);

            // Load recent brand requests for the live widget
            await this.loadRecentBrands();

            console.log('[ModeManager] Brand data loaded');
        } catch (error) {
            console.error('[ModeManager] Error loading brand data:', error);
            // Set zeros on error
            this.setDefaultBrandCounts();
        }
    },

    async loadRecentBrands() {
        try {
            const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/recent/brands?limit=5`);
            if (response.ok) {
                const brands = await response.json();
                this.updateLiveBrandWidget(brands);
            }
        } catch (error) {
            console.error('[ModeManager] Error loading recent brands:', error);
        }
    },

    updateLiveBrandWidget(brands) {
        const container = document.getElementById('live-brand-requests');
        if (!container) return;

        if (brands.length === 0) {
            container.innerHTML = `
                <div class="advertiser-request-item" style="text-align: center; padding: 2rem;">
                    <div class="text-gray-400 mb-2">
                        <i class="fas fa-inbox" style="font-size: 2rem;"></i>
                    </div>
                    <div class="text-sm text-gray-500">No brand requests yet</div>
                    <div class="text-xs text-gray-400 mt-1">New requests will appear here</div>
                </div>
            `;
            return;
        }

        // Create items HTML
        const itemsHtml = brands.map(brand => this.createBrandWidgetItem(brand)).join('');

        // Duplicate items for seamless infinite scroll (if more than 2 items)
        if (brands.length > 2) {
            container.innerHTML = itemsHtml + itemsHtml;
        } else {
            container.innerHTML = itemsHtml;
        }
    },

    createBrandWidgetItem(brand) {
        const brandDataStr = encodeURIComponent(JSON.stringify(brand));
        const timestamp = brand.created_at ? this.formatTimeAgo(brand.created_at) : '';
        const statusClass = (brand.verification_status || 'pending').toLowerCase();

        return `
            <div class="advertiser-request-item">
                <div class="request-content">
                    <div class="request-header">
                        <img src="${brand.brand_logo || '../system_images/default-brand.png'}" alt="${brand.brand_name}">
                        <span class="item-name">${brand.brand_name}</span>
                        <span class="status-tag ${statusClass}">${brand.verification_status || 'PENDING'}</span>
                    </div>
                    <div class="request-info">
                        <span class="brand-name">${brand.advertiser_name || 'Unknown Advertiser'}</span>
                    </div>
                    <div class="request-footer">
                        <span class="timestamp">${timestamp}</span>
                        <button class="action-btn" onclick="viewBrand('${brandDataStr}', 'pending')">Review</button>
                    </div>
                </div>
            </div>
        `;
    },

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    },

    setDefaultBrandCounts() {
        const verifiedEl = document.getElementById('brand-verified-count');
        const pendingEl = document.getElementById('brand-pending-count');
        const rejectedEl = document.getElementById('brand-rejected-count');
        const suspendedEl = document.getElementById('brand-suspended-count');
        const totalEl = document.getElementById('brand-total-count');
        const modeCountEl = document.getElementById('brand-count');

        if (verifiedEl) verifiedEl.textContent = '0';
        if (pendingEl) pendingEl.textContent = '0';
        if (rejectedEl) rejectedEl.textContent = '0';
        if (suspendedEl) suspendedEl.textContent = '0';
        if (totalEl) totalEl.textContent = '0';
        if (modeCountEl) modeCountEl.textContent = '0';
    },

    async loadCampaignData() {
        // Load campaign data from campaign_profile table via API
        try {
            const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/counts`);

            let counts;
            if (response.ok) {
                counts = await response.json();
                console.log('[ModeManager] Campaign counts from API:', counts);
            } else {
                // Fallback to placeholder data if API fails
                console.warn('[ModeManager] API failed, using placeholder data');
                counts = {
                    verified: 0,
                    pending: 0,
                    rejected: 0,
                    suspended: 0,
                    total: 0
                };
            }

            // Update UI elements
            const verifiedEl = document.getElementById('campaign-verified-count');
            const pendingEl = document.getElementById('campaign-pending-count');
            const rejectedEl = document.getElementById('campaign-rejected-count');
            const suspendedEl = document.getElementById('campaign-suspended-count');
            const modeCountEl = document.getElementById('campaign-count');

            if (verifiedEl) verifiedEl.textContent = counts.verified || 0;
            if (pendingEl) pendingEl.textContent = counts.pending || 0;
            if (rejectedEl) rejectedEl.textContent = counts.rejected || 0;
            if (suspendedEl) suspendedEl.textContent = counts.suspended || 0;
            if (modeCountEl) modeCountEl.textContent = counts.pending || 0;

            // Update quota widget
            this.updateCampaignQuotaWidget(counts);

            // Load recent campaign requests for the live widget
            await this.loadRecentCampaigns();

            console.log('[ModeManager] Campaign data loaded');
        } catch (error) {
            console.error('[ModeManager] Error loading campaign data:', error);
            // Set zeros on error
            this.setDefaultCampaignCounts();
        }
    },

    async loadRecentCampaigns() {
        try {
            // Fetch only pending campaigns (those submitted for verification)
            const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns?status=pending&limit=5`);
            if (response.ok) {
                const data = await response.json();
                // Extract campaigns array from response
                const campaigns = data.campaigns || [];
                this.updateLiveCampaignWidget(campaigns);
            }
        } catch (error) {
            console.error('[ModeManager] Error loading recent campaigns:', error);
        }
    },

    updateLiveCampaignWidget(campaigns) {
        const container = document.getElementById('live-campaign-requests');
        if (!container) return;

        if (campaigns.length === 0) {
            container.innerHTML = `
                <div class="advertiser-request-item" style="text-align: center; padding: 2rem;">
                    <div class="text-gray-400 mb-2">
                        <i class="fas fa-inbox" style="font-size: 2rem;"></i>
                    </div>
                    <div class="text-sm text-gray-500">No campaign requests yet</div>
                    <div class="text-xs text-gray-400 mt-1">New requests will appear here</div>
                </div>
            `;
            return;
        }

        // Create items HTML
        const itemsHtml = campaigns.map(campaign => this.createCampaignWidgetItem(campaign)).join('');

        // Duplicate items for seamless infinite scroll (if more than 2 items)
        if (campaigns.length > 2) {
            container.innerHTML = itemsHtml + itemsHtml;
        } else {
            container.innerHTML = itemsHtml;
        }
    },

    createCampaignWidgetItem(campaign) {
        const campaignDataStr = encodeURIComponent(JSON.stringify(campaign));
        const timestamp = campaign.created_at ? this.formatTimeAgo(campaign.created_at) : '';
        const statusClass = (campaign.verification_status || 'pending').toLowerCase();

        return `
            <div class="advertiser-request-item">
                <div class="request-content">
                    <div class="request-header">
                        <span class="item-name">${campaign.campaign_name}</span>
                        <span class="status-tag ${statusClass}">${campaign.verification_status || 'PENDING'}</span>
                    </div>
                    <div class="request-info">
                        <span class="brand-name">${campaign.brand_name || 'Unknown Brand'}</span>
                    </div>
                    <div class="request-footer">
                        <span class="timestamp">${timestamp}</span>
                        <button class="action-btn" onclick="viewCampaign('${campaignDataStr}', 'pending')">Review</button>
                    </div>
                </div>
            </div>
        `;
    },

    setDefaultCampaignCounts() {
        const verifiedEl = document.getElementById('campaign-verified-count');
        const pendingEl = document.getElementById('campaign-pending-count');
        const rejectedEl = document.getElementById('campaign-rejected-count');
        const suspendedEl = document.getElementById('campaign-suspended-count');
        const modeCountEl = document.getElementById('campaign-count');

        if (verifiedEl) verifiedEl.textContent = '0';
        if (pendingEl) pendingEl.textContent = '0';
        if (rejectedEl) rejectedEl.textContent = '0';
        if (suspendedEl) suspendedEl.textContent = '0';
        if (modeCountEl) modeCountEl.textContent = '0';
    },

    getStatusClass(status) {
        switch (status) {
            case 'verified':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'suspended':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            default:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        }
    },

    updateBrandQuotaWidget(counts) {
        const total = counts.total || 1; // Avoid division by zero

        // Update values
        const quotaVerified = document.getElementById('quota-brand-verified');
        const quotaPending = document.getElementById('quota-brand-pending');
        const quotaRejected = document.getElementById('quota-brand-rejected');
        const totalWidget = document.getElementById('brand-total-widget');

        if (quotaVerified) quotaVerified.textContent = counts.verified || 0;
        if (quotaPending) quotaPending.textContent = counts.pending || 0;
        if (quotaRejected) quotaRejected.textContent = counts.rejected || 0;
        if (totalWidget) totalWidget.textContent = counts.total || 0;

        // Update progress bars
        const verifiedBar = document.getElementById('quota-brand-verified-bar');
        const pendingBar = document.getElementById('quota-brand-pending-bar');
        const rejectedBar = document.getElementById('quota-brand-rejected-bar');

        if (verifiedBar) verifiedBar.style.width = `${Math.round((counts.verified / total) * 100)}%`;
        if (pendingBar) pendingBar.style.width = `${Math.round((counts.pending / total) * 100)}%`;
        if (rejectedBar) rejectedBar.style.width = `${Math.round((counts.rejected / total) * 100)}%`;
    },

    updateCampaignQuotaWidget(counts) {
        const total = counts.total || 1; // Avoid division by zero

        // Update values
        const quotaVerified = document.getElementById('quota-campaign-verified');
        const quotaPending = document.getElementById('quota-campaign-pending');
        const quotaRejected = document.getElementById('quota-campaign-rejected');
        const quotaSuspended = document.getElementById('quota-campaign-suspended');
        const totalWidget = document.getElementById('campaign-total-widget');

        if (quotaVerified) quotaVerified.textContent = counts.verified || 0;
        if (quotaPending) quotaPending.textContent = counts.pending || 0;
        if (quotaRejected) quotaRejected.textContent = counts.rejected || 0;
        if (quotaSuspended) quotaSuspended.textContent = counts.suspended || 0;
        // Show only campaigns submitted for verification (regardless of verification status)
        if (totalWidget) totalWidget.textContent = counts.submitted_for_verification || 0;

        // Update progress bars
        const verifiedBar = document.getElementById('quota-campaign-verified-bar');
        const pendingBar = document.getElementById('quota-campaign-pending-bar');
        const rejectedBar = document.getElementById('quota-campaign-rejected-bar');
        const suspendedBar = document.getElementById('quota-campaign-suspended-bar');

        if (verifiedBar) verifiedBar.style.width = `${Math.round((counts.verified / total) * 100)}%`;
        if (pendingBar) pendingBar.style.width = `${Math.round((counts.pending / total) * 100)}%`;
        if (rejectedBar) rejectedBar.style.width = `${Math.round((counts.rejected / total) * 100)}%`;
        if (suspendedBar) suspendedBar.style.width = `${Math.round((counts.suspended / total) * 100)}%`;
    }
};

// Global mode switch function
function switchMode(mode) {
    ModeManager.switchMode(mode);
}

// ==================== SECTION 2: SIDEBAR NAVIGATION MANAGER ====================
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

        console.log('[SidebarManager] Elements found:', {
            sidebar: !!this.sidebar,
            hamburger: !!this.hamburger,
            sidebarClose: !!this.sidebarClose
        });

        // Create overlay if it doesn't exist
        if (!document.querySelector('.sidebar-overlay')) {
            this.overlay = document.createElement('div');
            this.overlay.className = 'sidebar-overlay';
            document.body.appendChild(this.overlay);
        } else {
            this.overlay = document.querySelector('.sidebar-overlay');
        }

        this.bindEvents();
        console.log('[SidebarManager] Initialized');
    },

    bindEvents() {
        if (this.hamburger) {
            this.hamburger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SidebarManager] Hamburger clicked');
                this.toggle();
            });
        }

        if (this.sidebarClose) {
            this.sidebarClose.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[SidebarManager] Close button clicked');
                this.close();
            });
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                console.log('[SidebarManager] Overlay clicked');
                this.close();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        const sidebarLinks = document.querySelectorAll('.sidebar-link');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.close();
            });
        });
    },

    toggle() {
        console.log('[SidebarManager] Toggle called, isOpen:', this.isOpen);
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    open() {
        if (!this.sidebar || !this.overlay) {
            console.error('[SidebarManager] Cannot open - missing elements');
            return;
        }

        console.log('[SidebarManager] Opening sidebar');
        this.sidebar.classList.add('active');
        this.overlay.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    },

    close() {
        if (!this.sidebar || !this.overlay) {
            console.error('[SidebarManager] Cannot close - missing elements');
            return;
        }

        console.log('[SidebarManager] Closing sidebar');
        this.sidebar.classList.remove('active');
        this.overlay.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
    }
};

// ==================== SECTION 3: PANEL NAVIGATION MANAGER ====================
const PanelManager = {
    currentPanel: 'campaign-dashboard',
    brandPanels: ['brand-dashboard', 'brand-requested', 'brand-verified', 'brand-rejected', 'brand-suspended'],
    campaignPanels: ['campaign-dashboard', 'campaign-requested', 'campaign-verified', 'campaign-rejected', 'campaign-suspended'],
    sharedPanels: ['credentials', 'reviews', 'portfolio', 'settings'],

    init() {
        const urlParams = new URLSearchParams(window.location.search);
        const panelFromUrl = urlParams.get('panel');
        const mode = ModeManager.currentMode;

        // Determine valid panels for current mode
        const validPanels = mode === 'brand'
            ? [...this.brandPanels, ...this.sharedPanels]
            : [...this.campaignPanels, ...this.sharedPanels];

        if (panelFromUrl && validPanels.includes(panelFromUrl)) {
            this.currentPanel = panelFromUrl;
        } else {
            // Default to dashboard for current mode
            this.currentPanel = `${mode}-dashboard`;
        }

        this.showPanel(this.currentPanel);
        this.updateActiveLink(this.currentPanel);

        window.addEventListener('popstate', (e) => {
            if (e.state) {
                if (e.state.mode) {
                    ModeManager.applyMode(e.state.mode);
                }
                if (e.state.panel) {
                    this.showPanel(e.state.panel, false);
                }
            }
        });

        console.log('[PanelManager] Initialized with panel:', this.currentPanel);
    },

    getAllPanels() {
        return [...this.brandPanels, ...this.campaignPanels, ...this.sharedPanels];
    },

    switchPanel(panelName) {
        const allPanels = this.getAllPanels();
        if (!allPanels.includes(panelName)) {
            console.error(`[PanelManager] Invalid panel: ${panelName}`);
            return;
        }

        console.log('[PanelManager] Switching to panel:', panelName);
        this.showPanel(panelName);
        this.updateActiveLink(panelName);

        const url = new URL(window.location);
        url.searchParams.set('panel', panelName);
        window.history.pushState({ panel: panelName, mode: ModeManager.currentMode }, '', url);
    },

    showPanel(panelName, updateHistory = true) {
        const allPanels = this.getAllPanels();

        // Hide all panels
        allPanels.forEach(panel => {
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
            this.currentPanel = panelName;

            // Load panel-specific data
            this.loadPanelData(panelName);
        } else {
            console.error('[PanelManager] Panel not found:', panelName);
        }
    },

    updateActiveLink(panelName) {
        // Remove active class from all sidebar links
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to matching link
        const activeLink = document.querySelector(`.sidebar-link[data-panel="${panelName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    },

    async loadPanelData(panelName) {
        console.log(`[PanelManager] Loading data for panel: ${panelName}`);

        // Determine status based on panel name
        let status = null;
        let type = null;

        if (panelName.includes('brand-')) {
            type = 'brand';
            if (panelName === 'brand-requested') status = 'pending';
            else if (panelName === 'brand-verified') status = 'verified';
            else if (panelName === 'brand-rejected') status = 'rejected';
            else if (panelName === 'brand-suspended') status = 'suspended';
        } else if (panelName.includes('campaign-')) {
            type = 'campaign';
            if (panelName === 'campaign-requested') status = 'pending';
            else if (panelName === 'campaign-verified') status = 'verified';
            else if (panelName === 'campaign-rejected') status = 'rejected';
            else if (panelName === 'campaign-suspended') status = 'suspended';
        }

        // Load data for specific panels (not dashboard)
        if (type && status) {
            await DataLoader.loadList(type, status, panelName);
        }

        // Load reviews panel data
        if (panelName === 'reviews') {
            loadReviewsStats();
            loadReviews(1);
        }
    }
};

// ==================== DATA LOADER ====================
const DataLoader = {
    // Map panel names to table body IDs
    getTableBodyId(panelName) {
        const mapping = {
            'brand-requested': 'brand-requests-table-body',
            'brand-verified': 'brand-verified-table-body',
            'brand-rejected': 'brand-rejected-table-body',
            'brand-suspended': 'brand-suspended-table-body',
            'campaign-requested': 'campaign-requests-table-body',
            'campaign-verified': 'campaign-verified-table-body',
            'campaign-rejected': 'campaign-rejected-table-body',
            'campaign-suspended': 'campaign-suspended-table-body'
        };
        return mapping[panelName] || `${panelName}-table-body`;
    },

    async loadList(type, status, panelName) {
        try {
            const endpoint = type === 'brand'
                ? `${ADVERTISERS_API_URL}/api/admin-advertisers/brands?status=${status}`
                : `${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns?status=${status}`;

            console.log(`[DataLoader] Loading ${type} list from: ${endpoint}`);

            const response = await fetch(endpoint);
            if (!response.ok) {
                console.error(`[DataLoader] Failed to load ${type} list:`, response.statusText);
                this.renderEmptyState(type, status, panelName, 'Failed to load data');
                return;
            }

            const data = await response.json();
            const items = type === 'brand' ? data.brands : data.campaigns;

            console.log(`[DataLoader] Loaded ${items?.length || 0} ${type}s`);
            this.renderList(type, status, items, panelName);
        } catch (error) {
            console.error(`[DataLoader] Error loading ${type} list:`, error);
            this.renderEmptyState(type, status, panelName, 'Error loading data');
        }
    },

    renderEmptyState(type, status, panelName, message) {
        const tableBodyId = this.getTableBodyId(panelName);
        const container = document.getElementById(tableBodyId);
        if (!container) {
            console.warn(`[DataLoader] Container not found: ${tableBodyId}`);
            return;
        }

        container.innerHTML = `
            <tr>
                <td colspan="4" class="p-8 text-center text-gray-500">
                    <div class="text-4xl mb-4">📭</div>
                    <div>${message || `No ${type}s found with status: ${status}`}</div>
                </td>
            </tr>
        `;
    },

    renderList(type, status, items, panelName) {
        const tableBodyId = this.getTableBodyId(panelName);
        const container = document.getElementById(tableBodyId);
        if (!container) {
            console.warn(`[DataLoader] Container not found: ${tableBodyId}`);
            return;
        }

        if (!items || items.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="4" class="p-8 text-center text-gray-500">
                        <div class="text-4xl mb-4">📭</div>
                        <div>No ${type}s found with status: ${status}</div>
                    </td>
                </tr>
            `;
            return;
        }

        if (type === 'brand') {
            container.innerHTML = items.map(brand => this.renderBrandRow(brand, status)).join('');
        } else {
            container.innerHTML = items.map(campaign => this.renderCampaignRow(campaign, status)).join('');
        }
    },

    // Table row renderers for tbody elements - Only View button in table, other actions in modal
    renderBrandRow(brand, status) {
        // Use status_at for verified/rejected/suspended, created_at for pending
        let dateValue = brand.created_at;
        if (status === 'verified' || status === 'rejected' || status === 'suspended') {
            dateValue = brand.status_at || brand.created_at;
        }
        const displayDate = dateValue ? new Date(dateValue).toLocaleDateString() : 'N/A';

        // Store brand data as JSON for the view function
        const brandDataStr = encodeURIComponent(JSON.stringify(brand));

        return `
            <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick="viewBrand('${brandDataStr}', '${status}')">
                <td class="p-4">
                    <div class="flex items-center">
                        <img src="${brand.advertiser_logo || '../system_images/default-company.png'}" alt="${brand.advertiser_name}" class="w-10 h-10 rounded-full mr-3">
                        <div class="font-semibold">${brand.advertiser_name || 'N/A'}</div>
                    </div>
                </td>
                <td class="p-4">
                    <div class="flex items-center">
                        <img src="${brand.brand_logo || '../system_images/default-brand.png'}" alt="${brand.brand_name}" class="w-10 h-10 rounded-full mr-3">
                        <div class="font-semibold">${brand.brand_name || 'N/A'}</div>
                    </div>
                </td>
                <td class="p-4">${brand.package_name || 'No Package'}</td>
                <td class="p-4">${displayDate}</td>
                <td class="p-4">
                    <button onclick="event.stopPropagation(); viewBrand('${brandDataStr}', '${status}')"
                        class="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                </td>
            </tr>
        `;
    },

    renderCampaignRow(campaign, status) {
        // Use status_at for verified/rejected/suspended, created_at for pending
        let dateValue = campaign.created_at;
        if (status === 'verified' || status === 'rejected' || status === 'suspended') {
            dateValue = campaign.status_at || campaign.created_at;
        }
        const displayDate = dateValue ? new Date(dateValue).toLocaleDateString() : 'N/A';

        // Store campaign data as JSON for the view function
        const campaignDataStr = encodeURIComponent(JSON.stringify(campaign));

        return `
            <tr class="border-b hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer" onclick="viewCampaign('${campaignDataStr}', '${status}')">
                <td class="p-4">
                    <div class="flex items-center">
                        <img src="${campaign.brand_logo || '../system_images/default-brand.png'}" alt="${campaign.brand_name}" class="w-10 h-10 rounded-full mr-3">
                        <div class="font-semibold">${campaign.brand_name || 'Unknown Brand'}</div>
                    </div>
                </td>
                <td class="p-4">
                    <div class="flex items-center">
                        <img src="${campaign.campaign_image || '../system_images/default-campaign.png'}" alt="${campaign.campaign_name}" class="w-10 h-10 rounded mr-3">
                        <div class="font-semibold">${campaign.campaign_name}</div>
                    </div>
                </td>
                <td class="p-4">${displayDate}</td>
                <td class="p-4">
                    <button onclick="event.stopPropagation(); viewCampaign('${campaignDataStr}', '${status}')"
                        class="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        <i class="fas fa-eye mr-1"></i> View
                    </button>
                </td>
            </tr>
        `;
    },

    // Card renderers for live widgets (keeping for backward compatibility)
    renderBrandCard(brand, status) {
        const actions = this.getActions('brand', brand.id, status);
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                <div class="flex items-start justify-between">
                    <div class="flex items-center">
                        <img src="${brand.brand_logo || '../system_images/default-brand.png'}" alt="${brand.brand_name}" class="w-12 h-12 rounded-full mr-4">
                        <div>
                            <h3 class="font-semibold text-lg">${brand.brand_name}</h3>
                            <p class="text-gray-500 text-sm">${brand.industry || 'No industry'} · ${brand.location || 'No location'}</p>
                            <p class="text-gray-400 text-xs">${brand.email || ''}</p>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs ${ModeManager.getStatusClass(brand.verification_status)}">${brand.verification_status}</span>
                </div>
                ${brand.description ? `<p class="text-gray-600 dark:text-gray-300 text-sm mt-3">${brand.description.substring(0, 150)}...</p>` : ''}
                <div class="flex justify-end mt-4 space-x-2">
                    ${actions}
                </div>
            </div>
        `;
    },

    renderCampaignCard(campaign, status) {
        const actions = this.getActions('campaign', campaign.id, status);
        return `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
                <div class="flex items-start justify-between">
                    <div class="flex items-center">
                        <img src="${campaign.campaign_image || '../system_images/default-campaign.png'}" alt="${campaign.campaign_name}" class="w-12 h-12 rounded mr-4">
                        <div>
                            <h3 class="font-semibold text-lg">${campaign.campaign_name}</h3>
                            <p class="text-gray-500 text-sm">${campaign.brand_name || 'Unknown Brand'}</p>
                            <p class="text-gray-400 text-xs">${campaign.campaign_type || 'Standard'} · Budget: ${campaign.budget || 0} ETB</p>
                        </div>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs ${ModeManager.getStatusClass(campaign.verification_status)}">${campaign.verification_status}</span>
                </div>
                ${campaign.description ? `<p class="text-gray-600 dark:text-gray-300 text-sm mt-3">${campaign.description.substring(0, 150)}...</p>` : ''}
                <div class="flex items-center justify-between mt-4">
                    <div class="text-xs text-gray-500">
                        <span class="mr-4"><i class="fas fa-eye mr-1"></i>${campaign.impressions || 0} impressions</span>
                        <span><i class="fas fa-mouse-pointer mr-1"></i>${campaign.clicks || 0} clicks</span>
                    </div>
                    <div class="space-x-2">
                        ${actions}
                    </div>
                </div>
            </div>
        `;
    },

    getActions(type, id, status) {
        const actions = [];

        // View button always available
        actions.push(`<button onclick="viewItem('${type}', ${id})" class="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">View</button>`);

        // Status-specific actions
        if (status === 'pending') {
            actions.push(`<button onclick="verifyItem('${type}', ${id})" class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">Verify</button>`);
            actions.push(`<button onclick="rejectItem('${type}', ${id})" class="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Reject</button>`);
        } else if (status === 'verified') {
            actions.push(`<button onclick="suspendItem('${type}', ${id})" class="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">Suspend</button>`);
        } else if (status === 'rejected' || status === 'suspended') {
            actions.push(`<button onclick="restoreItem('${type}', ${id})" class="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">Restore</button>`);
        }

        return actions.join('');
    }
};

// ==================== VIEW MODAL FUNCTIONS ====================

// Store currently viewed item for action functions
let currentViewedItem = null;
let currentViewedType = null;
let currentViewedStatus = null;

/**
 * View Brand Details - Opens the brand view modal
 */
function viewBrand(brandDataStr, status) {
    try {
        const brand = JSON.parse(decodeURIComponent(brandDataStr));
        currentViewedItem = brand;
        currentViewedType = 'brand';
        currentViewedStatus = status;

        console.log('[ViewModal] Opening brand modal:', brand);

        // Populate modal fields
        document.getElementById('view-brand-name').textContent = brand.brand_name || 'Unknown Brand';
        document.getElementById('view-brand-id').textContent = `ID: BRD-${brand.id}`;
        document.getElementById('view-brand-logo').src = brand.brand_logo || '../system_images/default-brand.png';
        document.getElementById('view-brand-industry').textContent = brand.industry || 'N/A';
        document.getElementById('view-brand-type').textContent = brand.company_type || 'N/A';
        document.getElementById('view-brand-location').textContent = brand.location || 'N/A';
        document.getElementById('view-brand-email').textContent = brand.email || 'N/A';
        document.getElementById('view-brand-phone').textContent = brand.phone || 'N/A';
        document.getElementById('view-brand-website').textContent = brand.website || 'N/A';
        document.getElementById('view-brand-description').textContent = brand.description || 'No description available.';

        // Format submitted date
        const submittedDate = brand.created_at ? formatRelativeTime(new Date(brand.created_at)) : 'N/A';
        document.getElementById('view-brand-submitted').textContent = submittedDate;

        // Status badge
        const statusEl = document.getElementById('view-brand-status');
        statusEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-semibold ${ModeManager.getStatusClass(status)}">${status}</span>`;

        // Show/hide reason section based on status
        const reasonSection = document.getElementById('view-brand-reason-section');
        const reasonLabel = document.getElementById('view-brand-reason-label');
        const reasonText = document.getElementById('view-brand-reason');

        if (status === 'rejected' && brand.rejection_reason) {
            reasonSection.classList.remove('hidden');
            reasonLabel.textContent = 'Rejection Reason';
            reasonText.textContent = brand.rejection_reason;
        } else if (status === 'suspended' && brand.suspension_reason) {
            reasonSection.classList.remove('hidden');
            reasonLabel.textContent = 'Suspension Reason';
            reasonText.textContent = brand.suspension_reason;
        } else {
            reasonSection.classList.add('hidden');
        }

        // Show stats section for verified brands
        const statsSection = document.getElementById('view-brand-stats-section');
        if (status === 'verified') {
            statsSection.classList.remove('hidden');
            document.getElementById('view-brand-campaigns').textContent = brand.total_campaigns || 0;
            document.getElementById('view-brand-impressions').textContent = formatNumber(brand.total_impressions || 0);
            document.getElementById('view-brand-clicks').textContent = formatNumber(brand.total_clicks || 0);
            document.getElementById('view-brand-spent').textContent = `${formatNumber(brand.total_spent || 0)} ETB`;
        } else {
            statsSection.classList.add('hidden');
        }

        // Generate action buttons based on status
        const actionsContainer = document.getElementById('view-brand-actions');
        actionsContainer.innerHTML = getBrandActionButtons(brand.id, status);

        // Open modal
        openViewBrandModal();

    } catch (error) {
        console.error('[ViewModal] Error parsing brand data:', error);
        alert('Failed to load brand details');
    }
}

/**
 * View Campaign Details - Opens the campaign view modal
 */
async function viewCampaign(campaignDataStr, status) {
    try {
        const campaignFromList = JSON.parse(decodeURIComponent(campaignDataStr));

        console.log('[ViewModal] Fetching campaign details for ID:', campaignFromList.id);
        console.log('[ViewModal] API URL:', `${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignFromList.id}`);

        // Fetch full campaign details from API
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignFromList.id}`);

        let campaign;
        if (response.ok) {
            const data = await response.json();
            console.log('[ViewModal] API Response:', data);
            campaign = data.campaign || data; // Handle both {campaign: {...}} and direct response
        } else {
            console.error('[ViewModal] API request failed:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('[ViewModal] Error response:', errorText);
            // Fallback to list data if detail endpoint fails
            campaign = campaignFromList;
        }

        currentViewedItem = campaign;
        currentViewedType = 'campaign';
        currentViewedStatus = status;

        console.log('[ViewModal] Final campaign data:', campaign);

        // A. Populate Brand Details (Header)
        const brandLogo = document.getElementById('view-brand-logo');
        if (brandLogo) brandLogo.src = campaign.brand_logo || '../system_images/default-brand.png';

        const brandName = document.getElementById('view-campaign-brand');
        if (brandName) brandName.textContent = campaign.brand_name || 'Unknown Brand';

        const brandDescription = document.getElementById('view-brand-description');
        if (brandDescription) brandDescription.textContent = campaign.brand_description || 'No description available';

        const brandCategory = document.getElementById('view-brand-category');
        if (brandCategory) brandCategory.textContent = campaign.brand_category || 'N/A';

        const brandWebsite = document.getElementById('view-brand-website');
        if (brandWebsite) brandWebsite.textContent = campaign.brand_website || 'N/A';

        // B. Populate Campaign Details
        const campaignName = document.getElementById('view-campaign-name');
        if (campaignName) campaignName.textContent = campaign.campaign_name || 'Unknown Campaign';

        const campaignId = document.getElementById('view-campaign-id');
        if (campaignId) campaignId.textContent = `ID: CMP-${campaign.id}`;

        const campaignType = document.getElementById('view-campaign-type');
        if (campaignType) campaignType.textContent = campaign.ad_type || campaign.campaign_type || 'Standard';

        const campaignAudience = document.getElementById('view-campaign-audience');
        if (campaignAudience) {
            // Handle both array and string formats
            let audienceText = 'All';
            if (Array.isArray(campaign.target_audience) && campaign.target_audience.length > 0) {
                audienceText = campaign.target_audience.join(', ');
            } else if (typeof campaign.target_audience === 'string') {
                audienceText = campaign.target_audience;
            }
            campaignAudience.textContent = audienceText;
        }

        const campaignDescription = document.getElementById('view-campaign-description');
        if (campaignDescription) campaignDescription.textContent = campaign.description || 'No description available.';

        // Format dates
        const startDate = campaign.start_date ? new Date(campaign.start_date).toLocaleDateString() : 'N/A';
        const endDate = campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'N/A';

        const campaignStart = document.getElementById('view-campaign-start');
        if (campaignStart) campaignStart.textContent = startDate;

        const campaignEnd = document.getElementById('view-campaign-end');
        if (campaignEnd) campaignEnd.textContent = endDate;

        // Status badge
        const statusEl = document.getElementById('view-campaign-status');
        if (statusEl) {
            statusEl.innerHTML = `<span class="px-3 py-1 rounded-full text-xs font-semibold ${ModeManager.getStatusClass(status)}">${status}</span>`;
        }

        // Show/hide reason section based on status
        const reasonSection = document.getElementById('view-campaign-reason-section');
        const reasonLabel = document.getElementById('view-campaign-reason-label');
        const reasonText = document.getElementById('view-campaign-reason');

        if (status === 'rejected' && campaign.rejection_reason) {
            if (reasonSection) reasonSection.classList.remove('hidden');
            if (reasonLabel) reasonLabel.textContent = 'Rejection Reason';
            if (reasonText) reasonText.textContent = campaign.rejection_reason;
        } else if (status === 'suspended' && campaign.suspension_reason) {
            if (reasonSection) reasonSection.classList.remove('hidden');
            if (reasonLabel) reasonLabel.textContent = 'Suspension Reason';
            if (reasonText) reasonText.textContent = campaign.suspension_reason;
        } else {
            if (reasonSection) reasonSection.classList.add('hidden');
        }

        // Show stats section for verified campaigns
        const statsSection = document.getElementById('view-campaign-stats-section');
        if (status === 'verified') {
            if (statsSection) statsSection.classList.remove('hidden');

            const impressions = document.getElementById('view-campaign-impressions');
            if (impressions) impressions.textContent = formatNumber(campaign.impressions || 0);

            const clicks = document.getElementById('view-campaign-clicks');
            if (clicks) clicks.textContent = formatNumber(campaign.clicks || 0);

            const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : 0;
            const ctrEl = document.getElementById('view-campaign-ctr');
            if (ctrEl) ctrEl.textContent = `${ctr}%`;

            const spent = document.getElementById('view-campaign-spent');
            if (spent) spent.textContent = `${formatNumber(campaign.spent || 0)} ETB`;
        } else {
            if (statsSection) statsSection.classList.add('hidden');
        }

        // C. Populate Campaign Media
        loadCampaignMedia(campaign.id);

        // Generate action buttons based on status
        const actionsContainer = document.getElementById('view-campaign-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = getCampaignActionButtons(campaign.id, status);
        }

        // Open modal
        openViewCampaignModal();

    } catch (error) {
        console.error('[ViewModal] Error parsing campaign data:', error);
        alert('Failed to load campaign details');
    }
}

/**
 * Load campaign media (images and videos)
 */
async function loadCampaignMedia(campaignId) {
    try {
        // Fetch campaign media from API
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignId}/media`);

        if (response.ok) {
            const data = await response.json();
            const media = data.media || [];

            // Separate images and videos
            const images = media.filter(m => m.media_type === 'image');
            const videos = media.filter(m => m.media_type === 'video');

            // Populate images grid
            const imagesGrid = document.getElementById('campaign-images-grid');
            if (imagesGrid) {
                if (images.length === 0) {
                    imagesGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-8">No images uploaded</p>';
                } else {
                    imagesGrid.innerHTML = images.map(img => `
                        <div class="relative group">
                            <img src="${img.file_url}" alt="Campaign Image"
                                class="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-600">
                            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                                <button onclick="window.open('${img.file_url}', '_blank')"
                                    class="opacity-0 group-hover:opacity-100 px-3 py-1 bg-white text-gray-800 rounded-lg text-sm">
                                    View Full Size
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
            }

            // Populate videos grid
            const videosGrid = document.getElementById('campaign-videos-grid');
            if (videosGrid) {
                if (videos.length === 0) {
                    videosGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-8">No videos uploaded</p>';
                } else {
                    videosGrid.innerHTML = videos.map(video => `
                        <div class="relative">
                            <video controls class="w-full h-48 rounded-lg border border-gray-200 dark:border-gray-600">
                                <source src="${video.file_url}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    `).join('');
                }
            }
        } else {
            // If endpoint doesn't exist (404), show placeholder message
            console.log('[ViewModal] Campaign media endpoint not available yet');

            const imagesGrid = document.getElementById('campaign-images-grid');
            if (imagesGrid) {
                imagesGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-8">Media gallery coming soon</p>';
            }

            const videosGrid = document.getElementById('campaign-videos-grid');
            if (videosGrid) {
                videosGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-8">Media gallery coming soon</p>';
            }
        }
    } catch (error) {
        console.error('[ViewModal] Error loading campaign media:', error);

        // Show placeholder for missing endpoint
        const imagesGrid = document.getElementById('campaign-images-grid');
        if (imagesGrid) {
            imagesGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-8">Media gallery coming soon</p>';
        }

        const videosGrid = document.getElementById('campaign-videos-grid');
        if (videosGrid) {
            videosGrid.innerHTML = '<p class="text-gray-500 text-sm col-span-full text-center py-8">Media gallery coming soon</p>';
        }
    }
}

/**
 * Generate action buttons for brand modal based on status
 */
function getBrandActionButtons(brandId, status) {
    let buttons = '';

    if (status === 'pending') {
        buttons = `
            <button onclick="verifyBrand(${brandId})"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-check mr-2"></i>Verify
            </button>
            <button onclick="rejectBrand(${brandId})"
                class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                <i class="fas fa-times mr-2"></i>Reject
            </button>
        `;
    } else if (status === 'verified') {
        buttons = `
            <button onclick="suspendBrand(${brandId})"
                class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <i class="fas fa-pause mr-2"></i>Suspend
            </button>
        `;
    } else if (status === 'rejected') {
        buttons = `
            <button onclick="reconsiderBrand(${brandId})"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-redo mr-2"></i>Reconsider
            </button>
        `;
    } else if (status === 'suspended') {
        buttons = `
            <button onclick="reinstateBrand(${brandId})"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-play mr-2"></i>Reinstate
            </button>
        `;
    }

    return buttons;
}

/**
 * Generate action buttons for campaign modal based on status
 */
function getCampaignActionButtons(campaignId, status) {
    let buttons = '';

    if (status === 'pending') {
        buttons = `
            <button onclick="verifyCampaign(${campaignId})"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-check mr-2"></i>Verify
            </button>
            <button onclick="rejectCampaign(${campaignId})"
                class="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                <i class="fas fa-times mr-2"></i>Reject
            </button>
        `;
    } else if (status === 'verified') {
        buttons = `
            <button onclick="suspendCampaign(${campaignId})"
                class="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                <i class="fas fa-pause mr-2"></i>Suspend
            </button>
        `;
    } else if (status === 'rejected') {
        buttons = `
            <button onclick="reconsiderCampaign(${campaignId})"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-redo mr-2"></i>Reconsider
            </button>
        `;
    } else if (status === 'suspended') {
        buttons = `
            <button onclick="reinstateCampaign(${campaignId})"
                class="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-play mr-2"></i>Reinstate
            </button>
        `;
    }

    return buttons;
}

/**
 * Modal open/close functions
 */
function openViewBrandModal() {
    const modal = document.getElementById('view-brand-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeViewBrandModal() {
    const modal = document.getElementById('view-brand-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    currentViewedItem = null;
    currentViewedType = null;
    currentViewedStatus = null;
}

function openViewCampaignModal() {
    const modal = document.getElementById('view-campaign-modal');
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeViewCampaignModal() {
    const modal = document.getElementById('view-campaign-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
    currentViewedItem = null;
    currentViewedType = null;
    currentViewedStatus = null;
}

/**
 * Helper functions
 */
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

// ==================== BRAND ACTION FUNCTIONS ====================

async function verifyBrand(brandId) {
    if (!confirm('Are you sure you want to verify this brand?')) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/brands/${brandId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert('Brand verified successfully');
            closeViewBrandModal();
            ModeManager.loadModeData('brand');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to verify: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error verifying brand:', error);
        alert('An error occurred while verifying the brand');
    }
}

async function rejectBrand(brandId) {
    const reason = prompt('Enter rejection reason for this brand:');
    if (!reason) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/brands/${brandId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        if (response.ok) {
            alert('Brand rejected');
            closeViewBrandModal();
            ModeManager.loadModeData('brand');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to reject: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error rejecting brand:', error);
        alert('An error occurred while rejecting the brand');
    }
}

async function suspendBrand(brandId) {
    const reason = prompt('Enter suspension reason for this brand:');
    if (!reason) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/brands/${brandId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        if (response.ok) {
            alert('Brand suspended');
            closeViewBrandModal();
            ModeManager.loadModeData('brand');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to suspend: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error suspending brand:', error);
        alert('An error occurred while suspending the brand');
    }
}

async function reconsiderBrand(brandId) {
    if (!confirm('Are you sure you want to reconsider this brand? It will be moved back to pending status.')) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/brands/${brandId}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert('Brand moved to pending for reconsideration');
            closeViewBrandModal();
            ModeManager.loadModeData('brand');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to reconsider: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error reconsidering brand:', error);
        alert('An error occurred');
    }
}

async function reinstateBrand(brandId) {
    if (!confirm('Are you sure you want to reinstate this brand? It will be moved back to verified status.')) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/brands/${brandId}/reinstate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert('Brand reinstated successfully');
            closeViewBrandModal();
            ModeManager.loadModeData('brand');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to reinstate: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error reinstating brand:', error);
        alert('An error occurred');
    }
}

// ==================== CAMPAIGN ACTION FUNCTIONS ====================

async function verifyCampaign(campaignId) {
    if (!confirm('Are you sure you want to verify this campaign?')) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert('Campaign verified successfully');
            closeViewCampaignModal();
            ModeManager.loadModeData('campaign');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to verify: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error verifying campaign:', error);
        alert('An error occurred while verifying the campaign');
    }
}

async function rejectCampaign(campaignId) {
    const reason = prompt('Enter rejection reason for this campaign:');
    if (!reason) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        if (response.ok) {
            alert('Campaign rejected');
            closeViewCampaignModal();
            ModeManager.loadModeData('campaign');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to reject: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error rejecting campaign:', error);
        alert('An error occurred while rejecting the campaign');
    }
}

async function suspendCampaign(campaignId) {
    const reason = prompt('Enter suspension reason for this campaign:');
    if (!reason) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignId}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        if (response.ok) {
            alert('Campaign suspended');
            closeViewCampaignModal();
            ModeManager.loadModeData('campaign');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to suspend: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error suspending campaign:', error);
        alert('An error occurred while suspending the campaign');
    }
}

async function reconsiderCampaign(campaignId) {
    if (!confirm('Are you sure you want to reconsider this campaign? It will be moved back to pending status.')) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignId}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert('Campaign moved to pending for reconsideration');
            closeViewCampaignModal();
            ModeManager.loadModeData('campaign');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to reconsider: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error reconsidering campaign:', error);
        alert('An error occurred');
    }
}

async function reinstateCampaign(campaignId) {
    if (!confirm('Are you sure you want to reinstate this campaign? It will be moved back to verified status.')) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/campaigns/${campaignId}/reinstate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert('Campaign reinstated successfully');
            closeViewCampaignModal();
            ModeManager.loadModeData('campaign');
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to reinstate: ${error.detail || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('[Action] Error reinstating campaign:', error);
        alert('An error occurred');
    }
}

// ==================== LEGACY ACTION FUNCTIONS (for backward compatibility) ====================
async function viewItem(type, id) {
    console.log(`[Action] View ${type} ${id} - Use viewBrand or viewCampaign instead`);
}

async function verifyItem(type, id) {
    if (!confirm(`Are you sure you want to verify this ${type}?`)) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/${type}s/${id}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert(`${type} verified successfully`);
            // Reload current mode data
            ModeManager.loadModeData(ModeManager.currentMode);
            // Reload current panel
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to verify: ${error.detail}`);
        }
    } catch (error) {
        console.error(`[Action] Error verifying ${type}:`, error);
        alert('An error occurred');
    }
}

async function rejectItem(type, id) {
    const reason = prompt(`Enter rejection reason for this ${type}:`);
    if (!reason) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/${type}s/${id}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        if (response.ok) {
            alert(`${type} rejected`);
            ModeManager.loadModeData(ModeManager.currentMode);
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to reject: ${error.detail}`);
        }
    } catch (error) {
        console.error(`[Action] Error rejecting ${type}:`, error);
        alert('An error occurred');
    }
}

async function suspendItem(type, id) {
    const reason = prompt(`Enter suspension reason for this ${type}:`);
    if (!reason) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/${type}s/${id}/suspend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        if (response.ok) {
            alert(`${type} suspended`);
            ModeManager.loadModeData(ModeManager.currentMode);
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to suspend: ${error.detail}`);
        }
    } catch (error) {
        console.error(`[Action] Error suspending ${type}:`, error);
        alert('An error occurred');
    }
}

async function restoreItem(type, id) {
    if (!confirm(`Are you sure you want to restore this ${type} to pending status?`)) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/${type}s/${id}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            alert(`${type} restored to pending`);
            ModeManager.loadModeData(ModeManager.currentMode);
            PanelManager.loadPanelData(PanelManager.currentPanel);
        } else {
            const error = await response.json();
            alert(`Failed to restore: ${error.detail}`);
        }
    } catch (error) {
        console.error(`[Action] Error restoring ${type}:`, error);
        alert('An error occurred');
    }
}

// Global panel switch function
function switchPanel(panelName) {
    PanelManager.switchPanel(panelName);
}

// ==================== SECTION 4: THEME MANAGER ====================
const ThemeManager = {
    currentTheme: 'light',

    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.applyTheme(savedTheme);
        console.log('[ThemeManager] Initialized with theme:', savedTheme);
    },

    toggle() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        console.log('[ThemeManager] Toggled to:', newTheme);
    },

    applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        const moonIcon = document.getElementById('moon-icon');
        const sunIcon = document.getElementById('sun-icon');

        if (moonIcon && sunIcon) {
            if (theme === 'dark') {
                moonIcon.style.display = 'none';
                sunIcon.style.display = 'inline';
            } else {
                moonIcon.style.display = 'inline';
                sunIcon.style.display = 'none';
            }
        }
    }
};

// Global theme toggle function
function toggleTheme() {
    ThemeManager.toggle();
}

// ==================== SECTION 5: CLOCK MANAGER ====================
const ClockManager = {
    init() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    },

    updateClock() {
        const now = new Date();

        const timeEl = document.getElementById('current-time');
        const dateEl = document.getElementById('current-date');

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }

        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }
};

// ==================== SECTION 6: PROFILE DROPDOWN MANAGER ====================
const ProfileDropdownManager = {
    isOpen: false,

    init() {
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('profile-dropdown-menu');
            const toggle = document.getElementById('profile-dropdown-toggle');

            if (dropdown && toggle && !toggle.contains(e.target) && !dropdown.contains(e.target)) {
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
        const dropdown = document.getElementById('profile-dropdown-menu');
        if (dropdown) {
            dropdown.classList.remove('hidden');
            this.isOpen = true;
        }
    },

    close() {
        const dropdown = document.getElementById('profile-dropdown-menu');
        if (dropdown) {
            dropdown.classList.add('hidden');
            this.isOpen = false;
        }
    }
};

// Global profile dropdown toggle
function toggleProfileDropdown() {
    ProfileDropdownManager.toggle();
}

// ==================== SECTION 6B: PROFILE HEADER MANAGER ====================

/**
 * ProfileHeaderManager
 * Loads admin profile data from admin_profile and manage_campaigns_profile tables
 * via /api/manage-campaigns/profile/{admin_id} endpoint
 */
const ProfileHeaderManager = {
    adminId: null,
    profileData: null,

    async init() {
        console.log('[ProfileHeaderManager] Initializing...');

        // Try to get admin ID from localStorage or session
        this.adminId = this.getAdminId();

        if (this.adminId) {
            await this.loadProfile();
        } else {
            console.log('[ProfileHeaderManager] No admin ID found, using default values');
            this.setDefaultProfile();
        }
    },

    getAdminId() {
        // Try to get admin ID from various sources
        try {
            // Check localStorage for adminUser
            const adminUser = localStorage.getItem('adminUser');
            if (adminUser) {
                const user = JSON.parse(adminUser);
                if (user.id) return user.id;
            }

            // Check localStorage for admin_id
            const adminId = localStorage.getItem('admin_id');
            if (adminId) return parseInt(adminId);

            // Check sessionStorage
            const sessionAdminId = sessionStorage.getItem('admin_id');
            if (sessionAdminId) return parseInt(sessionAdminId);

            // Default to first admin (id=3) for testing
            return 3;
        } catch (e) {
            console.error('[ProfileHeaderManager] Error getting admin ID:', e);
            return 3; // Default for testing
        }
    },

    async loadProfile() {
        try {
            console.log(`[ProfileHeaderManager] Loading profile for admin ID: ${this.adminId}`);

            const response = await fetch(`${ADVERTISERS_API_URL}/api/admin-advertisers/profile/${this.adminId}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.profileData = await response.json();
            console.log('[ProfileHeaderManager] Profile loaded:', this.profileData);

            this.updateUI();
        } catch (error) {
            console.error('[ProfileHeaderManager] Error loading profile:', error);
            this.setDefaultProfile();
        }
    },

    updateUI() {
        if (!this.profileData) return;

        const data = this.profileData;

        // Update username
        const usernameEl = document.getElementById('adminUsername');
        if (usernameEl) {
            usernameEl.textContent = data.username || `${data.first_name}_${data.father_name}`.toLowerCase();
        }

        // Update email (array - show first one)
        const emailEl = document.getElementById('profile-email');
        if (emailEl && data.email && data.email.length > 0) {
            emailEl.textContent = data.email[0];
        }

        // Update phone (array - show first one)
        const phoneEl = document.getElementById('profile-phone');
        if (phoneEl && data.phone_number && data.phone_number.length > 0) {
            phoneEl.textContent = data.phone_number[0];
        }

        // Update department
        const deptEl = document.getElementById('profile-department');
        if (deptEl && data.departments && data.departments.length > 0) {
            deptEl.textContent = this.formatDepartments(data.departments);
        }

        // Update employee ID
        const empIdEl = document.getElementById('profile-employee-id');
        if (empIdEl) {
            empIdEl.textContent = data.employee_id || `ADM-${data.id}`;
        }

        // Update joined date
        const joinedEl = document.getElementById('profile-joined');
        if (joinedEl && data.joined_date) {
            joinedEl.textContent = this.formatJoinedDate(data.joined_date);
        }

        // Update profile image
        const profileImg = document.getElementById('profile-avatar-img');
        if (profileImg && data.profile_image) {
            profileImg.src = data.profile_image;
        }

        // Update cover image
        const coverImg = document.getElementById('profile-cover-img');
        if (coverImg && data.cover_image) {
            coverImg.src = data.cover_image;
        }

        // Update quote
        const quoteEl = document.querySelector('.profile-quote span');
        if (quoteEl && data.quote) {
            quoteEl.textContent = `"${data.quote}"`;
        }

        // Update location from manage_advertisers_profile.location array
        const locationEl = document.querySelector('.profile-location span:last-child');
        if (locationEl) {
            if (data.location && Array.isArray(data.location) && data.location.length > 0) {
                // Show locations from profile (respecting display_location setting)
                // display_location = whether to show location publicly (default true)
                // allow_location = whether system can use GPS to detect location (separate setting)
                if (data.display_location !== false) {
                    locationEl.textContent = data.location.join(', ');
                } else {
                    locationEl.textContent = 'Location hidden';
                }
            } else if (data.location && typeof data.location === 'string') {
                locationEl.textContent = data.location;
            } else if (data.departments && data.departments.length > 0) {
                locationEl.textContent = data.departments.join(', ') + ' | Advertiser Management';
            } else {
                locationEl.textContent = 'Astegni Admin Panel | Advertiser Management';
            }
        }

        // Update rating
        const ratingValueEl = document.querySelector('.rating-value');
        const ratingCountEl = document.querySelector('.rating-count');
        if (ratingValueEl && data.rating !== undefined) {
            ratingValueEl.textContent = data.rating.toFixed(1);
        }
        if (ratingCountEl && data.total_reviews !== undefined) {
            ratingCountEl.textContent = `(${data.total_reviews} reviews)`;
        }

        // Update badges
        this.updateBadges(data);

        // Update bio/description
        const bioEl = document.querySelector('.profile-info-description p');
        if (bioEl && data.bio) {
            bioEl.textContent = data.bio;
        }

        console.log('[ProfileHeaderManager] UI updated successfully');
    },

    formatDepartments(departments) {
        if (!departments || departments.length === 0) return 'Staff';

        // Format department names nicely
        return departments.map(dept => {
            return dept.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }).join(', ');
    },

    formatJoinedDate(dateStr) {
        try {
            const date = new Date(dateStr);
            const options = { year: 'numeric', month: 'long' };
            return date.toLocaleDateString('en-US', options);
        } catch (e) {
            return dateStr;
        }
    },

    updateBadges(data) {
        const badgesContainer = document.querySelector('.badges-row');
        if (!badgesContainer) return;

        // Update existing badges based on data or clear and rebuild
        if (data.badges && data.badges.length > 0) {
            badgesContainer.innerHTML = data.badges.map(badge =>
                `<span class="profile-badge ${badge.type || ''}">${badge.icon || ''} ${badge.label}</span>`
            ).join('');
        } else {
            // Use default badges based on departments and position
            const badges = [];

            if (data.departments && data.departments.includes('manage-campaigns')) {
                badges.push('<span class="profile-badge campaign">📢 Campaign Management</span>');
            }
            if (data.departments && data.departments.includes('manage-system-settings')) {
                badges.push('<span class="profile-badge verified">⚙️ System Settings</span>');
            }
            if (data.position) {
                badges.push(`<span class="profile-badge expert">👤 ${data.position}</span>`);
            }

            if (badges.length > 0) {
                badgesContainer.innerHTML = badges.join('');
            }
        }
    },

    setDefaultProfile() {
        // Set default values if no profile is loaded
        console.log('[ProfileHeaderManager] Setting default profile values');

        const defaults = {
            username: 'admin_user',
            email: ['admin@astegni.et'],
            phone_number: ['+251911234567'],
            departments: ['manage-campaigns'],
            position: 'Staff',
            joined_date: new Date().toISOString().split('T')[0],
            rating: 0,
            total_reviews: 0
        };

        this.profileData = defaults;
        this.updateUI();
    }
};

// ==================== SECTION 7: MODAL FUNCTIONS ====================

// Edit Profile Modal - Dynamic field helpers
let emailFieldCount = 0;
let phoneFieldCount = 0;
let heroTitleFieldCount = 0;

function createDynamicFieldHTML(type, value = '', index = 0) {
    const isFirst = index === 0;
    const placeholder = type === 'email' ? 'email@example.com' :
                       type === 'phone' ? '+251911234567' :
                       'Enter hero title...';
    const inputType = type === 'email' ? 'email' : 'text';

    return `
        <div class="flex gap-2 items-center dynamic-field" data-type="${type}" data-index="${index}">
            <input type="${inputType}" value="${value}"
                   class="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white ${type}-input"
                   placeholder="${placeholder}">
            ${!isFirst ? `
                <button type="button" onclick="removeDynamicField(this)"
                        class="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <i class="fas fa-trash-alt"></i>
                </button>
            ` : ''}
        </div>
    `;
}

function addEmailField(value = '') {
    const container = document.getElementById('email-fields-container');
    if (container) {
        const div = document.createElement('div');
        div.innerHTML = createDynamicFieldHTML('email', value, emailFieldCount);
        container.appendChild(div.firstElementChild);
        emailFieldCount++;
    }
}

function addPhoneField(value = '') {
    const container = document.getElementById('phone-fields-container');
    if (container) {
        const div = document.createElement('div');
        div.innerHTML = createDynamicFieldHTML('phone', value, phoneFieldCount);
        container.appendChild(div.firstElementChild);
        phoneFieldCount++;
    }
}

function addHeroTitleField(value = '') {
    const container = document.getElementById('hero-title-fields-container');
    if (container) {
        const div = document.createElement('div');
        div.innerHTML = createDynamicFieldHTML('hero-title', value, heroTitleFieldCount);
        container.appendChild(div.firstElementChild);
        heroTitleFieldCount++;
    }
}

function removeDynamicField(button) {
    const field = button.closest('.dynamic-field');
    if (field) {
        field.remove();
    }
}

function getFieldValues(containerSelector, inputClass) {
    const container = document.querySelector(containerSelector);
    if (!container) return [];

    const inputs = container.querySelectorAll(`.${inputClass}`);
    const values = [];
    inputs.forEach(input => {
        const value = input.value.trim();
        if (value) values.push(value);
    });
    return values;
}

// Location functions
function useCurrentLocation() {
    const locationInput = document.getElementById('edit-location');
    if (!locationInput) return;

    if (!navigator.geolocation) {
        showNotification('Geolocation is not supported by your browser', 'error');
        return;
    }

    locationInput.value = 'Getting location...';
    locationInput.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            try {
                // Use reverse geocoding to get address
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Try to get address using a free geocoding service
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
                const data = await response.json();

                if (data && data.display_name) {
                    // Extract city and country
                    const address = data.address || {};
                    const city = address.city || address.town || address.village || address.county || '';
                    const country = address.country || '';
                    locationInput.value = city && country ? `${city}, ${country}` : data.display_name;
                } else {
                    locationInput.value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                }
            } catch (error) {
                console.error('Error getting location:', error);
                locationInput.value = '';
                showNotification('Could not determine location', 'error');
            } finally {
                locationInput.disabled = false;
            }
        },
        (error) => {
            locationInput.value = '';
            locationInput.disabled = false;
            console.error('Geolocation error:', error);
            showNotification('Could not get your location. Please enable location access.', 'error');
        },
        { timeout: 10000, enableHighAccuracy: true }
    );
}

function toggleCurrentLocation(checkbox) {
    if (checkbox.checked) {
        useCurrentLocation();
    }
}

// Edit Profile Modal
function openEditProfileModal() {
    console.log('[EditProfileModal] Opening...');
    const modal = document.getElementById('edit-profile-modal');
    if (!modal) {
        console.error('[EditProfileModal] Modal element not found');
        return;
    }

    // Get profile data from ProfileHeaderManager
    const data = ProfileHeaderManager.profileData;
    if (!data) {
        console.error('[EditProfileModal] No profile data available');
        showNotification('Profile data not loaded yet', 'error');
        return;
    }

    // Reset field counters
    emailFieldCount = 0;
    phoneFieldCount = 0;
    heroTitleFieldCount = 0;

    // Clear dynamic field containers
    const emailContainer = document.getElementById('email-fields-container');
    const phoneContainer = document.getElementById('phone-fields-container');
    const heroTitleContainer = document.getElementById('hero-title-fields-container');

    if (emailContainer) emailContainer.innerHTML = '';
    if (phoneContainer) phoneContainer.innerHTML = '';
    if (heroTitleContainer) heroTitleContainer.innerHTML = '';

    // Populate basic fields
    const firstNameInput = document.getElementById('edit-first-name');
    const fatherNameInput = document.getElementById('edit-father-name');
    const grandfatherNameInput = document.getElementById('edit-grandfather-name');
    const usernameInput = document.getElementById('edit-username');
    const locationInput = document.getElementById('edit-location');
    const bioInput = document.getElementById('edit-bio');
    const quoteInput = document.getElementById('edit-quote');
    const heroSubtitleInput = document.getElementById('edit-hero-subtitle');
    const deptInput = document.getElementById('edit-department');
    const empIdInput = document.getElementById('edit-employee-id');

    // Set values
    if (firstNameInput) firstNameInput.value = data.first_name || '';
    if (fatherNameInput) fatherNameInput.value = data.father_name || '';
    if (grandfatherNameInput) grandfatherNameInput.value = data.grandfather_name || '';
    if (usernameInput) usernameInput.value = data.username || '';
    if (locationInput) locationInput.value = data.location || '';
    if (bioInput) bioInput.value = data.bio || '';
    if (quoteInput) quoteInput.value = data.quote ? data.quote.replace(/^"|"$/g, '') : '';
    if (heroSubtitleInput) heroSubtitleInput.value = data.hero_subtitle || '';

    // Set read-only values
    if (deptInput) deptInput.value = ProfileHeaderManager.formatDepartments(data.departments);
    if (empIdInput) empIdInput.value = data.employee_id || `ADM-${data.id}`;

    // Populate email fields (at least one)
    const emails = data.email && data.email.length > 0 ? data.email : [''];
    emails.forEach(email => addEmailField(email));

    // Populate phone fields (at least one)
    const phones = data.phone_number && data.phone_number.length > 0 ? data.phone_number : [''];
    phones.forEach(phone => addPhoneField(phone));

    // Populate hero title fields (at least one)
    const heroTitles = data.hero_title ? (Array.isArray(data.hero_title) ? data.hero_title : [data.hero_title]) : [''];
    heroTitles.forEach(title => addHeroTitleField(title));

    // Populate allow_location checkbox (GPS detection permission)
    const allowLocationCheckbox = document.getElementById('editAllowLocation');
    if (allowLocationCheckbox) {
        allowLocationCheckbox.checked = data.allow_location || false;
    }

    // Populate display_location checkbox (public visibility)
    const displayLocationCheckbox = document.getElementById('editDisplayLocation');
    if (displayLocationCheckbox) {
        displayLocationCheckbox.checked = data.display_location !== false; // Default to true
    }

    // Initialize geolocation UI (show/hide detect button based on allow_location state)
    if (typeof initGeolocationUI === 'function') {
        initGeolocationUI();
    }

    // Setup form submission handler
    const form = document.getElementById('edit-profile-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            await saveProfileChanges();
        };
    }

    // Show modal
    modal.classList.remove('hidden');
    console.log('[EditProfileModal] Modal opened and populated');
}

async function saveProfileChanges() {
    console.log('[EditProfileModal] Saving changes...');

    const adminId = ProfileHeaderManager.adminId;
    if (!adminId) {
        showNotification('Admin ID not found', 'error');
        return;
    }

    // Gather form data
    const emails = getFieldValues('#email-fields-container', 'email-input');
    const phones = getFieldValues('#phone-fields-container', 'phone-input');
    const heroTitles = getFieldValues('#hero-title-fields-container', 'hero-title-input');

    // Get locations as array - use shared array-field-utils if available, otherwise get from single input
    let locations = [];
    if (typeof getLocations === 'function') {
        locations = getLocations();
    } else {
        const locationVal = document.getElementById('edit-location')?.value?.trim();
        if (locationVal) {
            locations = [locationVal];
        }
    }

    // Get allow_location and display_location values
    const allowLocationCheckbox = document.getElementById('editAllowLocation');
    const displayLocationCheckbox = document.getElementById('editDisplayLocation');

    const updateData = {
        first_name: document.getElementById('edit-first-name')?.value?.trim() || null,
        father_name: document.getElementById('edit-father-name')?.value?.trim() || null,
        grandfather_name: document.getElementById('edit-grandfather-name')?.value?.trim() || null,
        username: document.getElementById('edit-username')?.value?.trim() || null,
        location: locations.length > 0 ? locations : null,
        bio: document.getElementById('edit-bio')?.value?.trim() || null,
        quote: document.getElementById('edit-quote')?.value?.trim() || null,
        hero_subtitle: document.getElementById('edit-hero-subtitle')?.value?.trim() || null,
        email: emails.length > 0 ? emails : null,
        phone_number: phones.length > 0 ? phones : null,
        hero_title: heroTitles.length > 0 ? heroTitles : null,
        allow_location: allowLocationCheckbox ? allowLocationCheckbox.checked : false,
        display_location: displayLocationCheckbox ? displayLocationCheckbox.checked : true
    };

    // Remove null values
    Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === '') {
            delete updateData[key];
        }
    });

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/manage-campaigns/profile/${adminId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to update profile');
        }

        const result = await response.json();
        console.log('[EditProfileModal] Profile updated:', result);

        // Reload profile data
        await ProfileHeaderManager.loadProfile();

        // Close modal
        closeEditProfileModal();

        showNotification('Profile updated successfully', 'success');

    } catch (error) {
        console.error('[EditProfileModal] Error saving profile:', error);
        showNotification(error.message || 'Failed to save changes', 'error');
    }
}

function closeEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');
    if (modal) modal.classList.add('hidden');
}

// Upload Profile Modal
function openUploadProfileModal() {
    console.log('Open upload profile modal');
}

function closeUploadProfileModal() {
    const modal = document.getElementById('upload-profile-modal');
    if (modal) modal.classList.add('hidden');
}

// Upload Cover Modal
function openUploadCoverModal() {
    console.log('Open upload cover modal');
}

function closeUploadCoverModal() {
    const modal = document.getElementById('upload-cover-modal');
    if (modal) modal.classList.add('hidden');
}

// Add Credential Modal
function openAddCredentialModal() {
    const modal = document.getElementById('add-credential-modal');
    if (modal) modal.classList.remove('hidden');
}

function closeAddCredentialModal() {
    const modal = document.getElementById('add-credential-modal');
    if (modal) modal.classList.add('hidden');
}

// Notification Modal
function openNotificationModal() {
    const modal = document.getElementById('notification-modal');
    if (modal) modal.classList.add('active');
}

// Logout Modal
function openLogoutModal() {
    const modal = document.getElementById('logout-modal');
    if (modal) modal.classList.add('active');
}

// Reports
function openReports() {
    const mode = ModeManager.currentMode;
    console.log(`Opening ${mode} reports`);
    // Implementation would vary based on mode
}

// Verification Guidelines
function openVerificationGuidelines() {
    const mode = ModeManager.currentMode;
    console.log(`Opening ${mode} verification guidelines`);
}

// Settings
function openSettings() {
    console.log('Opening advertiser settings');
}

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('adminUser');
        window.location.href = 'index.html';
    }
}

// ==================== SECTION 7B: REVIEWS MANAGEMENT ====================

let currentReviewsPage = 1;
let reviewsStats = null;

/**
 * Load reviews from the API
 */
async function loadReviews(page = 1) {
    currentReviewsPage = page;
    const roleFilter = document.getElementById('reviews-role-filter')?.value || '';
    const ratingFilter = document.getElementById('reviews-rating-filter')?.value || '';

    try {
        // Build URL with filters
        let url = `${ADVERTISERS_API_URL}/api/admin/reviews?page=${page}&limit=10`;
        if (roleFilter) url += `&role=${roleFilter}`;
        if (ratingFilter) url += `&rating=${ratingFilter}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load reviews');

        const reviews = await response.json();
        renderReviewsList(reviews);
        updateReviewsPagination(reviews.length);

    } catch (error) {
        console.error('[Reviews] Error loading reviews:', error);
        document.getElementById('reviews-list').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-exclamation-circle text-4xl mb-4"></i>
                <p>Failed to load reviews. Please try again.</p>
            </div>
        `;
    }
}

/**
 * Load reviews statistics
 */
async function loadReviewsStats() {
    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin/reviews/stats`);
        if (!response.ok) throw new Error('Failed to load review stats');

        reviewsStats = await response.json();

        // Update stat cards
        document.getElementById('reviews-total').textContent = reviewsStats.total_reviews || 0;
        document.getElementById('reviews-avg-rating').textContent = (reviewsStats.average_rating || 0).toFixed(1);
        document.getElementById('reviews-five-star').textContent = reviewsStats.five_star || 0;
        document.getElementById('reviews-featured').textContent = reviewsStats.featured_reviews || 0;

        // Update rating distribution bars
        const total = reviewsStats.total_reviews || 1;
        for (let i = 1; i <= 5; i++) {
            const count = reviewsStats[`${['one', 'two', 'three', 'four', 'five'][i-1]}_star`] || 0;
            const percentage = (count / total) * 100;
            document.getElementById(`rating-bar-${i}`).style.width = `${percentage}%`;
            document.getElementById(`rating-count-${i}`).textContent = count;
        }

    } catch (error) {
        console.error('[Reviews] Error loading stats:', error);
    }
}

/**
 * Render reviews list
 */
function renderReviewsList(reviews) {
    const container = document.getElementById('reviews-list');

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i class="fas fa-comment-slash text-4xl mb-4"></i>
                <p>No reviews found matching your filters.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => `
        <div class="review-item border rounded-lg p-4 hover:shadow-md transition-shadow" style="background: var(--admin-card-bg); border-color: var(--admin-border-color);">
            <div class="flex items-start gap-4">
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl ${getReviewerIconBg(review.reviewer_role)}">
                    ${getReviewerIcon(review.reviewer_role)}
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-semibold" style="color: var(--admin-text-color);">${review.reviewer_name}</h4>
                            <div class="flex gap-2 mt-1">
                                <span class="text-xs px-2 py-1 rounded-full ${getRoleBadgeClass(review.reviewer_role)}">${review.reviewer_role || 'Reviewer'}</span>
                                ${review.department ? `<span class="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">${formatDepartment(review.department)}</span>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <div class="flex text-yellow-400">
                                ${generateStars(review.rating)}
                            </div>
                        </div>
                    </div>
                    <p class="text-sm mb-2" style="color: var(--admin-text-secondary);">${review.review || review.comment || ''}</p>
                    <div class="flex justify-between items-center text-xs" style="color: var(--admin-text-secondary);">
                        <span>${formatReviewDate(review.created_at)}</span>
                        <div class="flex gap-2">
                            <button onclick="deleteReview(${review.id})" class="text-red-600 hover:text-red-800" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Get reviewer icon based on role
 */
function getReviewerIcon(role) {
    if (!role) return '<i class="fas fa-user"></i>';
    const roleLower = role.toLowerCase();
    if (roleLower.includes('manager')) return '<i class="fas fa-user-tie"></i>';
    if (roleLower.includes('department') || roleLower.includes('team')) return '<i class="fas fa-users"></i>';
    if (roleLower.includes('client')) return '<i class="fas fa-briefcase"></i>';
    if (roleLower.includes('staff')) return '<i class="fas fa-id-badge"></i>';
    return '<i class="fas fa-user"></i>';
}

/**
 * Get reviewer icon background class
 */
function getReviewerIconBg(role) {
    if (!role) return 'bg-gray-100 text-gray-600';
    const roleLower = role.toLowerCase();
    if (roleLower.includes('manager')) return 'bg-blue-100 text-blue-600';
    if (roleLower.includes('department') || roleLower.includes('team')) return 'bg-green-100 text-green-600';
    if (roleLower.includes('client')) return 'bg-purple-100 text-purple-600';
    if (roleLower.includes('staff')) return 'bg-orange-100 text-orange-600';
    return 'bg-gray-100 text-gray-600';
}

/**
 * Format department name for display
 */
function formatDepartment(dept) {
    if (!dept) return '';
    // Convert manage-contents to Manage Contents
    return dept.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

/**
 * Generate star HTML for rating
 */
function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star"></i>';
        } else {
            stars += '<i class="far fa-star"></i>';
        }
    }
    return stars;
}

/**
 * Get role badge class
 */
function getRoleBadgeClass(role) {
    const classes = {
        'student': 'bg-blue-100 text-blue-700',
        'tutor': 'bg-green-100 text-green-700',
        'parent': 'bg-orange-100 text-orange-700',
        'advertiser': 'bg-purple-100 text-purple-700',
        'user': 'bg-gray-100 text-gray-700'
    };
    return classes[role] || classes['user'];
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format review date
 */
function formatReviewDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Update pagination controls
 */
function updateReviewsPagination(resultsCount) {
    const pagination = document.getElementById('reviews-pagination');
    const prevBtn = document.getElementById('reviews-prev-btn');
    const nextBtn = document.getElementById('reviews-next-btn');
    const pageInfo = document.getElementById('reviews-page-info');

    if (resultsCount > 0 || currentReviewsPage > 1) {
        pagination.classList.remove('hidden');
        pageInfo.textContent = `Page ${currentReviewsPage}`;
        prevBtn.disabled = currentReviewsPage <= 1;
        nextBtn.disabled = resultsCount < 10;
    } else {
        pagination.classList.add('hidden');
    }
}

/**
 * Filter reviews (called on filter change)
 */
function filterReviews() {
    loadReviews(1); // Reset to page 1 when filtering
}

/**
 * Delete a review
 */
async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin/reviews/${reviewId}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete review');

        // Reload reviews and stats
        loadReviews(currentReviewsPage);
        loadReviewsStats();

        showNotification('Review deleted successfully', 'success');

    } catch (error) {
        console.error('[Reviews] Error deleting review:', error);
        showNotification('Failed to delete review', 'error');
    }
}

/**
 * Toggle featured status of a review
 */
async function toggleFeatured(reviewId) {
    try {
        const response = await fetch(`${ADVERTISERS_API_URL}/api/admin/reviews/featured`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_ids: [reviewId], display_location: 'all' })
        });

        if (!response.ok) throw new Error('Failed to toggle featured status');

        // Reload reviews and stats
        loadReviews(currentReviewsPage);
        loadReviewsStats();

        showNotification('Featured status updated', 'success');

    } catch (error) {
        console.error('[Reviews] Error toggling featured:', error);
        showNotification('Failed to update featured status', 'error');
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => notification.classList.add('translate-y-0', 'opacity-100'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('translate-y-2', 'opacity-0');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ==================== SECTION 8: SETTINGS PANEL FUNCTIONS ====================
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

// ==================== SECTION 9: INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[ManageAdvertisers] Initializing...');

    // Initialize all managers
    ThemeManager.init();
    ClockManager.init();
    ModeManager.init();
    SidebarManager.init();
    PanelManager.init();
    ProfileDropdownManager.init();

    // Load profile header from database (async)
    ProfileHeaderManager.init();

    console.log('[ManageAdvertisers] Initialization complete');
});
