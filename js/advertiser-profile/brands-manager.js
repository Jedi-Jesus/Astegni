// ============================================
// BRANDS MANAGER
// Handles brand cards and campaign modal with card-dealing animation
// ============================================

// Use existing API_BASE_URL from config.js or window, with fallback
const BRANDS_API_URL = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : null)
    || window.API_BASE_URL
    || 'http://localhost:8000';

console.log('🏷️ Brands Manager loaded, API URL:', BRANDS_API_URL);

const BrandsManager = {
    // Current state
    currentBrand: null,
    currentCampaign: null,
    currentPlacementType: null,
    brands: [],
    campaigns: [],
    currentFilter: 'all',
    isEditMode: false,  // Track if we're editing an existing campaign
    editingCampaignId: null,  // ID of campaign being edited
    isEditingBrand: false,  // Track if we're editing a brand
    editingBrandId: null,  // ID of brand being edited

    // Initialize brands manager
    initialize() {
        console.log('🏷️ BrandsManager.initialize() called');
        this.loadBrands();
        this.loadModals();
        this.initAnalyticsFilterListeners();
    },

    // Load modals HTML
    async loadModals() {
        try {
            // Load campaign modal (includes media upload modal)
            const campaignResponse = await fetch('../modals/advertiser-profile/campaign-modal.html');
            const campaignHtml = await campaignResponse.text();

            if (!document.getElementById('campaign-modal-overlay')) {
                const container = document.createElement('div');
                container.innerHTML = campaignHtml;
                // Append ALL elements (campaign modal + media upload modal)
                while (container.firstElementChild) {
                    document.body.appendChild(container.firstElementChild);
                }
            }

            // Load create brand modal
            const createBrandResponse = await fetch('../modals/advertiser-profile/create-brand-modal.html');
            const createBrandHtml = await createBrandResponse.text();

            if (!document.getElementById('create-brand-modal-overlay')) {
                const container = document.createElement('div');
                container.innerHTML = createBrandHtml;
                document.body.appendChild(container.firstElementChild);
            }

            // Load campaign creation confirmation modal
            const confirmationResponse = await fetch('../modals/advertiser-profile/campaign-creation-confirmation-modal.html');
            if (!confirmationResponse.ok) {
                throw new Error(`Failed to load confirmation modal: ${confirmationResponse.status}`);
            }
            const confirmationHtml = await confirmationResponse.text();

            if (!document.getElementById('campaign-creation-confirmation-overlay')) {
                const container = document.createElement('div');
                container.innerHTML = confirmationHtml;

                // Extract scripts before removing them from container
                const scripts = container.querySelectorAll('script');
                const scriptContent = Array.from(scripts).map(script => script.textContent).join('\n');

                // Remove script tags from container (they'll be re-added properly)
                scripts.forEach(script => script.remove());

                // Append ALL elements (HTML, styles, etc.) - not just the first element
                while (container.firstElementChild) {
                    document.body.appendChild(container.firstElementChild);
                }

                // Execute scripts in global scope
                if (scriptContent) {
                    const scriptEl = document.createElement('script');
                    scriptEl.textContent = scriptContent;
                    document.body.appendChild(scriptEl);
                }

                console.log('[BrandsManager] Campaign creation confirmation modal loaded successfully');

                // Verify CampaignCreationConfirmation is defined
                setTimeout(() => {
                    if (typeof CampaignCreationConfirmation !== 'undefined') {
                        console.log('[BrandsManager] CampaignCreationConfirmation object is now available');
                    } else {
                        console.error('[BrandsManager] CampaignCreationConfirmation object NOT available after loading modal!');
                    }
                }, 100);
            }

            // Add ESC key handler
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.closeCampaignModal();
                    this.closeCreateBrandModal();
                    // Also close confirmation modal if open
                    if (typeof window.CampaignCreationConfirmation !== 'undefined') {
                        window.CampaignCreationConfirmation.close();
                    }
                }
            });

            // Add color picker change event
            const colorInput = document.getElementById('brand-color-input');
            if (colorInput) {
                colorInput.addEventListener('input', (e) => {
                    const colorValue = document.getElementById('brand-color-value');
                    if (colorValue) colorValue.textContent = e.target.value.toUpperCase();
                });
            }
        } catch (error) {
            console.error('Error loading modals:', error);
        }
    },

    // Load brands from API
    async loadBrands() {
        console.log('🏷️ Loading brands from API...');
        try {
            const token = localStorage.getItem('token');
            const apiUrl = BRANDS_API_URL || API_BASE_URL || 'http://localhost:8000';
            console.log('🏷️ API URL:', apiUrl);

            const response = await fetch(`${apiUrl}/api/advertiser/brands`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.brands = data.brands || [];
                console.log('🏷️ Loaded brands from API:', this.brands.length);
            } else {
                console.warn('🏷️ API returned non-OK status:', response.status);
                // Use sample data for now
                this.brands = this.getSampleBrands();
            }

            this.renderBrands();
        } catch (error) {
            console.error('🏷️ Error loading brands:', error);
            // Use sample data on error
            this.brands = this.getSampleBrands();
            this.renderBrands();
        }
    },

    // Get sample brands data
    getSampleBrands() {
        return [
            {
                id: 1,
                name: 'Astegni Education',
                logo: null,
                industry: 'Education Technology',
                status: 'active',
                description: 'Ethiopia\'s premier educational platform connecting students with expert tutors.',
                campaigns_count: 5,
                impressions: 245000,
                revenue: 125000
            },
            {
                id: 2,
                name: 'EthioTech Solutions',
                logo: null,
                industry: 'Technology',
                status: 'active',
                description: 'Innovative tech solutions for Ethiopian businesses and enterprises.',
                campaigns_count: 3,
                impressions: 180000,
                revenue: 85000
            },
            {
                id: 3,
                name: 'Addis Academy',
                logo: null,
                industry: 'Education',
                status: 'paused',
                description: 'Premium tutoring and coaching services for university students.',
                campaigns_count: 2,
                impressions: 95000,
                revenue: 45000
            }
        ];
    },

    // Render brands grid
    renderBrands() {
        console.log('🏷️ Rendering brands...');
        const container = document.getElementById('brandsGrid');
        if (!container) {
            console.error('🏷️ brandsGrid container not found in DOM!');
            return;
        }
        console.log('🏷️ brandsGrid found, rendering', this.brands.length, 'brands');

        // Clear container
        container.innerHTML = '';

        // Add new brand card first
        const newBrandCardHTML = this.createNewBrandCard();
        console.log('🏷️ Creating new brand card, HTML length:', newBrandCardHTML.length);
        container.innerHTML = newBrandCardHTML;

        // Add brand cards
        const filteredBrands = this.filterBrands(this.brands);

        if (filteredBrands.length === 0 && this.currentFilter !== 'all') {
            container.innerHTML += `
                <div class="brands-empty-state">
                    <div class="brands-empty-icon">
                        <i class="fas fa-filter"></i>
                    </div>
                    <h3>No brands match this filter</h3>
                    <p>Try selecting a different filter or create a new brand</p>
                </div>
            `;
        } else {
            filteredBrands.forEach(brand => {
                container.innerHTML += this.createBrandCard(brand);
            });
        }

        // Update stats
        this.updateBrandStats();
    },

    // Filter brands
    filterBrands(brands) {
        if (this.currentFilter === 'all') return brands;
        return brands.filter(brand => brand.status === this.currentFilter);
    },

    // Create new brand card HTML
    createNewBrandCard() {
        return `
            <div class="brand-card new-brand" onclick="BrandsManager.openCreateBrandModal()">
                <div class="new-brand-content">
                    <div class="new-brand-icon">
                        <i class="fas fa-plus"></i>
                    </div>
                    <h3>Create New Brand</h3>
                    <p>Add a new brand to manage campaigns</p>
                </div>
            </div>
        `;
    },

    // Create brand card HTML
    createBrandCard(brand) {
        const statusClass = brand.status || 'active';
        const logoContent = brand.logo
            ? `<img src="${brand.logo}" alt="${brand.name}">`
            : `<i class="fas fa-building"></i>`;

        return `
            <div class="brand-card" onclick="BrandsManager.openCampaignModal(${brand.id})">
                <div class="brand-card-header">
                    <div class="brand-logo">${logoContent}</div>
                    <div class="brand-info">
                        <h3 class="brand-name">${brand.name}</h3>
                        <span class="brand-industry">
                            <i class="fas fa-industry"></i>
                            ${brand.industry || 'General'}
                        </span>
                        <span class="brand-status ${statusClass}">
                            <i class="fas fa-circle" style="font-size: 0.5rem;"></i>
                            ${this.capitalizeFirst(statusClass)}
                        </span>
                    </div>
                </div>
                <p class="brand-description">${brand.description || 'No description available'}</p>
                <div class="brand-stats-row">
                    <div class="brand-stat">
                        <div class="brand-stat-value">${brand.campaigns_count || 0}</div>
                        <div class="brand-stat-label">Campaigns</div>
                    </div>
                    <div class="brand-stat">
                        <div class="brand-stat-value">${this.formatNumber(brand.impressions || 0)}</div>
                        <div class="brand-stat-label">Impressions</div>
                    </div>
                    <div class="brand-stat">
                        <div class="brand-stat-value">${this.formatNumber(brand.revenue || 0)}</div>
                        <div class="brand-stat-label">ETB</div>
                    </div>
                </div>
            </div>
        `;
    },

    // Update brand stats in header
    updateBrandStats() {
        const totalBrands = this.brands.length;
        const totalCampaigns = this.brands.reduce((sum, b) => sum + (b.campaigns_count || 0), 0);
        const totalImpressions = this.brands.reduce((sum, b) => sum + (b.impressions || 0), 0);
        const totalRevenue = this.brands.reduce((sum, b) => sum + (b.revenue || 0), 0);

        this.setElementText('stat-total-brands', totalBrands);
        this.setElementText('stat-total-campaigns', totalCampaigns);
        this.setElementText('stat-total-impressions', this.formatNumber(totalImpressions));
        this.setElementText('stat-total-revenue', this.formatNumber(totalRevenue));
    },

    // Open campaign modal for a brand
    async openCampaignModal(brandId) {
        const brand = this.brands.find(b => b.id === brandId);
        if (!brand) return;

        this.currentBrand = brand;

        // Update modal header
        this.setElementText('campaign-modal-brand-name', brand.name);
        this.setElementText('campaign-modal-brand-industry', brand.industry || 'General');

        const logoEl = document.getElementById('campaign-modal-brand-logo');
        if (logoEl) {
            logoEl.innerHTML = brand.logo
                ? `<img src="${brand.logo}" alt="${brand.name}">`
                : '<i class="fas fa-building"></i>';
        }

        // Load campaigns for this brand
        await this.loadBrandCampaigns(brandId);

        // Show modal
        const overlay = document.getElementById('campaign-modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Close sidebar when clicking overlay (mobile only)
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay && overlay.classList.contains('sidebar-active')) {
                    this.toggleCampaignSidebar();
                }
            });
        }

        // Reset to campaign list view
        this.resetCampaignView();
    },

    // Load campaigns for a brand
    async loadBrandCampaigns(brandId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/advertiser/brands/${brandId}/campaigns`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.campaigns = data.campaigns || [];
            } else {
                // Use sample campaigns
                this.campaigns = this.getSampleCampaigns(brandId);
            }
        } catch (error) {
            console.error('Error loading campaigns:', error);
            this.campaigns = this.getSampleCampaigns(brandId);
        }

        this.renderCampaignList();
        this.updateCampaignStats();
    },

    // Get sample campaigns (with targeting data for analytics filters)
    getSampleCampaigns(brandId) {
        const campaigns = [
            {
                id: 1,
                brand_id: brandId,
                name: 'Back to School 2024',
                status: 'active',
                budget: 50000,
                spent: 32500,
                impressions: 125000,
                clicks: 8750,
                ctr: 7.0,
                start_date: '2024-01-15',
                end_date: '2024-03-15',
                // Targeting: All audiences, National location, All placements
                target_audiences: ['tutor', 'student', 'parent', 'advertiser', 'user'],
                target_location: 'national',
                target_regions: [],
                target_placements: ['placeholder', 'widget', 'popup', 'insession']
            },
            {
                id: 2,
                brand_id: brandId,
                name: 'University Prep Campaign',
                status: 'active',
                budget: 35000,
                spent: 18200,
                impressions: 85000,
                clicks: 5950,
                ctr: 7.0,
                start_date: '2024-02-01',
                end_date: '2024-04-30',
                // Targeting: Only students, Regional (Addis + Oromia), Widget + Popup only
                target_audiences: ['student'],
                target_location: 'regional',
                target_regions: ['addis-ababa', 'oromia'],
                target_placements: ['widget', 'popup']
            },
            {
                id: 3,
                brand_id: brandId,
                name: 'Summer Tutoring Promo',
                status: 'paused',
                budget: 25000,
                spent: 12000,
                impressions: 45000,
                clicks: 2700,
                ctr: 6.0,
                start_date: '2024-06-01',
                end_date: '2024-08-31',
                // Targeting: Tutors only, Global location, All placements
                target_audiences: ['tutor'],
                target_location: 'global',
                target_regions: [],
                target_placements: ['placeholder', 'widget', 'popup', 'insession']
            },
            {
                id: 4,
                brand_id: brandId,
                name: 'Holiday Special 2023',
                status: 'completed',
                budget: 20000,
                spent: 20000,
                impressions: 95000,
                clicks: 7600,
                ctr: 8.0,
                start_date: '2023-12-01',
                end_date: '2024-01-05',
                // Targeting: Parents + Students, National, Placeholder + Widget
                target_audiences: ['parent', 'student'],
                target_location: 'national',
                target_regions: [],
                target_placements: ['placeholder', 'widget']
            }
        ];
        return campaigns;
    },

    // Render campaign list
    renderCampaignList() {
        const container = document.getElementById('campaign-cards-container');
        if (!container) return;

        if (this.campaigns.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
                    <i class="fas fa-bullhorn" style="font-size: 2rem; opacity: 0.3; margin-bottom: 12px;"></i>
                    <p>No campaigns yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.campaigns.map(campaign => this.createCampaignCardSmall(campaign)).join('');

        // Update count
        this.setElementText('campaign-list-count', this.campaigns.length);
    },

    // Create small campaign card HTML
    createCampaignCardSmall(campaign) {
        const statusClass = campaign.status || 'draft';

        return `
            <div class="campaign-card-small" data-campaign-id="${campaign.id}" onclick="BrandsManager.selectCampaign(${campaign.id})">
                <div class="campaign-card-small-header">
                    <h4 class="campaign-card-small-name">${campaign.name}</h4>
                    <span class="campaign-card-small-status ${statusClass}">${this.capitalizeFirst(statusClass)}</span>
                </div>
                <div class="campaign-card-small-meta">
                    <span><i class="fas fa-coins"></i> ${this.formatNumber(campaign.budget || 0)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</span>
                    <span><i class="fas fa-eye"></i> ${this.formatNumber(campaign.impressions || 0)}</span>
                </div>
            </div>
        `;
    },

    // Update campaign stats in modal
    updateCampaignStats() {
        const totalCampaigns = this.campaigns.length;
        const activeCampaigns = this.campaigns.filter(c => c.status === 'active').length;
        const totalImpressions = this.campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
        const totalRevenue = this.campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);

        this.setElementText('brand-total-campaigns', totalCampaigns);
        this.setElementText('brand-active-campaigns', activeCampaigns);
        this.setElementText('brand-total-impressions', this.formatNumber(totalImpressions));
        this.setElementText('brand-total-revenue', this.formatNumber(totalRevenue));
    },

    // Select a campaign (card dealing animation)
    selectCampaign(campaignId) {
        const campaign = this.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;

        this.currentCampaign = campaign;
        this.currentPlacementType = 'all'; // Default to all placements

        // Update active state on cards
        document.querySelectorAll('.campaign-card-small').forEach(card => {
            card.classList.remove('active');
            if (parseInt(card.dataset.campaignId) === campaignId) {
                card.classList.add('active');
            }
        });

        // On mobile, animate the list away
        if (window.innerWidth <= 768) {
            this.animateCampaignDeal();
        }

        // Show campaign details directly (no placement selection step)
        this.showCampaignDetails(campaign, 'all');
    },

    // ============================================
    // ANALYTICS FILTER HANDLERS
    // ============================================

    // Current analytics filters state
    analyticsFilters: {
        audience: 'all',
        location: 'global',
        placement: 'all'
    },

    // Toggle analytics filter dropdown
    toggleAnalyticsFilter(filterType) {
        const card = document.getElementById(`filter-card-${filterType}`);
        if (!card) return;

        // Close other dropdowns
        document.querySelectorAll('.analytics-filter-card').forEach(c => {
            if (c.id !== `filter-card-${filterType}`) {
                c.classList.remove('open');
            }
        });

        // Toggle this dropdown
        card.classList.toggle('open');
    },

    // Select an analytics filter option
    selectAnalyticsFilter(filterType, value, label) {
        // Update filter state
        this.analyticsFilters[filterType] = value;

        // Update the display value
        const valueEl = document.getElementById(`filter-${filterType}-value`);
        if (valueEl) valueEl.textContent = label;

        // Update active state on options
        const dropdown = document.getElementById(`filter-dropdown-${filterType}`);
        if (dropdown) {
            dropdown.querySelectorAll('.filter-option').forEach(opt => {
                opt.classList.remove('active');
                if (opt.dataset.value === value) {
                    opt.classList.add('active');
                }
            });
        }

        // Close the dropdown
        const card = document.getElementById(`filter-card-${filterType}`);
        if (card) card.classList.remove('open');

        // Refresh analytics with new filters
        this.refreshAnalyticsWithFilters();
    },

    // Reset all analytics filters
    resetAnalyticsFilters() {
        this.analyticsFilters = {
            audience: 'all',
            location: 'global',
            placement: 'all'
        };

        // Reset display values
        this.setElementText('filter-audience-value', 'All Users');
        this.setElementText('filter-location-value', 'Global');
        this.setElementText('filter-placement-value', 'All Placements');

        // Reset active states
        ['audience', 'location', 'placement'].forEach(filterType => {
            const dropdown = document.getElementById(`filter-dropdown-${filterType}`);
            if (dropdown) {
                dropdown.querySelectorAll('.filter-option').forEach(opt => {
                    opt.classList.remove('active');
                    if (opt.dataset.value === 'all' || opt.dataset.value === 'global') {
                        opt.classList.add('active');
                    }
                });
            }
        });

        // Refresh analytics
        this.refreshAnalyticsWithFilters();
    },

    // Refresh analytics data based on current filters
    refreshAnalyticsWithFilters() {
        if (!this.currentCampaign) return;

        const { audience, location, placement } = this.analyticsFilters;

        // In a real implementation, this would call the API with filters
        // For now, we'll simulate filtered data by applying multipliers
        let baseImpressions = this.currentCampaign.impressions || 245892;
        let baseClicks = this.currentCampaign.clicks || 18456;

        // Apply audience filter multiplier
        const audienceMultipliers = {
            'all': 1,
            'tutor': 0.15,
            'student': 0.45,
            'parent': 0.25,
            'advertiser': 0.05,
            'user': 0.10
        };

        // Apply location filter multiplier (includes regional options)
        const locationMultipliers = {
            'global': 1,
            'national': 0.85,
            'all-regions': 0.75,
            'addis-ababa': 0.35,
            'oromia': 0.25,
            'amhara': 0.15,
            'tigray': 0.08,
            'snnpr': 0.12,
            'somali': 0.06,
            'afar': 0.03,
            'benishangul-gumuz': 0.02,
            'gambela': 0.02,
            'harari': 0.03,
            'dire-dawa': 0.05,
            'sidama': 0.08
        };

        // Apply placement filter multiplier
        const placementMultipliers = {
            'all': 1,
            'placeholder': 0.45,
            'widget': 0.35,
            'popup': 0.12,
            'insession': 0.08
        };

        const totalMultiplier = (audienceMultipliers[audience] || 1) *
                               (locationMultipliers[location] || 1) *
                               (placementMultipliers[placement] || 1);

        const filteredImpressions = Math.floor(baseImpressions * totalMultiplier);
        const filteredClicks = Math.floor(baseClicks * totalMultiplier);
        const ctr = filteredImpressions > 0 ? ((filteredClicks / filteredImpressions) * 100).toFixed(1) : 0;
        const conversions = Math.floor(filteredClicks * 0.067); // ~6.7% conversion rate

        // Update analytics display
        this.setElementText('analytics-impressions', this.formatNumber(filteredImpressions));
        this.setElementText('analytics-clicks', this.formatNumber(filteredClicks));
        this.setElementText('analytics-ctr', `${ctr}%`);
        this.setElementText('analytics-conversions', this.formatNumber(conversions));
    },

    // Close dropdowns when clicking outside
    initAnalyticsFilterListeners() {
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.analytics-filter-card')) {
                document.querySelectorAll('.analytics-filter-card').forEach(card => {
                    card.classList.remove('open');
                });
            }
        });
    },

    // Populate analytics filter dropdowns based on campaign targeting
    populateAnalyticsFilters(campaign) {
        if (!campaign) return;

        // Config mappings
        const audienceConfig = {
            students: 'Students',
            tutors: 'Tutors',
            parents: 'Parents',
            institutes: 'Institutes'
        };

        const placementConfig = {
            placeholder: 'Ad Placeholder',
            widget: 'Ad Widget',
            popup: 'WB Pop-up',
            insession: 'WB In-Session'
        };

        // Get campaign targeting data
        const audiences = campaign.target_audiences || [];
        const placements = campaign.target_placements || [];
        const locations = campaign.target_locations || [];
        const targetLocation = campaign.target_location || 'global';

        // Populate Audience filter
        const audienceFilter = document.getElementById('analytics-audience-filter');
        if (audienceFilter) {
            const allOption = audiences.length > 1 ? '<option value="all">All Audiences</option>' : '';
            audienceFilter.innerHTML = allOption +
                audiences.map(a => `<option value="${a}">${audienceConfig[a] || a}</option>`).join('');
        }

        // Populate Placement filter
        const placementFilter = document.getElementById('analytics-placement-filter');
        if (placementFilter) {
            const allOption = placements.length > 1 ? '<option value="all">All Placements</option>' : '';
            placementFilter.innerHTML = allOption +
                placements.map(pl => `<option value="${pl}">${placementConfig[pl] || pl}</option>`).join('');
        }

        // Handle Location filter (only show if regional targeting)
        const locationFilterGroup = document.getElementById('analytics-location-filter-group');
        const locationFilter = document.getElementById('analytics-location-filter');

        if (targetLocation === 'regional' && locations.length > 0) {
            // Show location filter for regional campaigns
            if (locationFilterGroup) locationFilterGroup.style.display = 'flex';
            if (locationFilter) {
                const allOption = locations.length > 1 ? '<option value="all">All Locations</option>' : '';
                locationFilter.innerHTML = allOption +
                    locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
            }
        } else {
            // Hide location filter for global campaigns
            if (locationFilterGroup) locationFilterGroup.style.display = 'none';
        }

        console.log('📊 Analytics filters populated for campaign:', campaign.name, {
            audiences, placements, locations, targetLocation
        });
    },

    // Update modal header with campaign info
    updateModalHeaderCampaign(campaign) {
        const campaignInfo = document.getElementById('header-campaign-info');
        const campaignName = document.getElementById('header-campaign-name');
        const campaignStatus = document.getElementById('header-campaign-status');
        const campaignDates = document.getElementById('header-campaign-dates');
        const campaignPlacement = document.getElementById('header-campaign-placement');
        const campaignLocation = document.getElementById('header-campaign-location');
        const campaignAudience = document.getElementById('header-campaign-audience');

        if (campaignInfo) campaignInfo.style.display = 'flex';

        if (campaignName) {
            campaignName.textContent = campaign.name;
        }

        if (campaignStatus) {
            const statusColor = {
                'active': '#10b981',
                'paused': '#f59e0b',
                'completed': '#6b7280',
                'draft': '#3b82f6'
            };
            campaignStatus.innerHTML = `<i class="fas fa-circle" style="color: ${statusColor[campaign.status] || '#6b7280'}; font-size: 0.5rem;"></i> ${this.capitalizeFirst(campaign.status)}`;
            campaignStatus.className = `header-campaign-status ${campaign.status}`;
        }

        if (campaignDates) {
            campaignDates.innerHTML = `<i class="fas fa-calendar"></i> ${this.formatDate(campaign.start_date)} - ${this.formatDate(campaign.end_date)}`;
        }

        // Ad placement type
        if (campaignPlacement) {
            const placementInfo = this.getPlacementTypeInfo(this.currentPlacementType || 'overall');
            campaignPlacement.innerHTML = `<i class="${placementInfo.icon}"></i> ${placementInfo.name}`;
        }

        // Target location
        if (campaignLocation) {
            const location = campaign.target_location || campaign.location || 'Ethiopia';
            campaignLocation.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${location}`;
        }

        // Target audience
        if (campaignAudience) {
            const audience = campaign.target_audience || campaign.audience || 'All Users';
            campaignAudience.innerHTML = `<i class="fas fa-users"></i> ${this.capitalizeFirst(audience)}`;
        }
    },

    // Clear modal header campaign info
    clearModalHeaderInfo() {
        const divider = document.getElementById('header-divider');
        const campaignInfo = document.getElementById('header-campaign-info');

        if (divider) divider.style.display = 'none';
        if (campaignInfo) campaignInfo.style.display = 'none';
    },

    // Back to campaign list (replaces deprecated backToPlacementSelection)
    backToPlacementSelection() {
        // Placement selection removed - just reset the view
        this.resetCampaignView();
    },

    // Animate campaign deal (mobile)
    animateCampaignDeal() {
        const listSection = document.getElementById('campaign-list-section');
        const detailsSection = document.getElementById('campaign-details-section');
        const backBtn = document.getElementById('campaign-back-btn');

        if (listSection) {
            listSection.classList.add('dealing');
            setTimeout(() => {
                // On mobile, remove 'active' class to hide sidebar instead of 'collapsed'
                // This allows the toggle button to still work
                listSection.classList.remove('active');
                listSection.classList.remove('dealing');
            }, 500);
        }

        if (detailsSection) {
            detailsSection.classList.add('dealing-in');
            setTimeout(() => {
                detailsSection.classList.remove('dealing-in');
            }, 500);
        }

        if (backBtn) {
            backBtn.classList.add('visible');
        }
    },

    // Back to campaign list (mobile)
    backToCampaignList() {
        const listSection = document.getElementById('campaign-list-section');
        const backBtn = document.getElementById('campaign-back-btn');

        if (listSection) {
            // Show the sidebar by adding active class
            listSection.classList.add('active');
            listSection.classList.remove('collapsed');
        }

        if (backBtn) {
            backBtn.classList.remove('visible');
        }

        this.resetCampaignView();
    },

    // Reset campaign view
    resetCampaignView() {
        const placeholder = document.getElementById('campaign-details-placeholder');
        const content = document.getElementById('campaign-details-content');
        const listSection = document.getElementById('campaign-list-section');
        const backBtn = document.getElementById('campaign-back-btn');

        if (placeholder) placeholder.style.display = 'flex';
        if (content) content.classList.remove('active');
        if (listSection) listSection.classList.remove('collapsed');
        if (backBtn) backBtn.classList.remove('visible');

        // Reset analytics filters
        this.resetAnalyticsFilters();

        // Clear modal header info
        this.clearModalHeaderInfo();

        // Clear active state
        document.querySelectorAll('.campaign-card-small').forEach(card => {
            card.classList.remove('active');
        });

        this.currentCampaign = null;
        this.currentPlacementType = null;
    },

    // Get placement type display name and icon
    getPlacementTypeInfo(placementType) {
        const types = {
            'overall': { name: 'Overall', icon: 'fa-chart-pie', color: '#8b5cf6' },
            'main-ads': { name: 'Main Ads', icon: 'fa-rectangle-ad', color: '#3b82f6' },
            'widget-ads': { name: 'Widget Ads', icon: 'fa-window-restore', color: '#10b981' },
            'pop-ups': { name: 'Pop-ups', icon: 'fa-window-maximize', color: '#f59e0b' },
            'in-session-ads': { name: 'In-Session Ads', icon: 'fa-chalkboard-user', color: '#ef4444' }
        };
        return types[placementType] || types['overall'];
    },

    // Calculate placement-specific analytics
    getPlacementAnalytics(campaign, placementType) {
        const totalImpressions = campaign.impressions || 0;
        const totalClicks = campaign.clicks || 0;
        const totalCtr = campaign.ctr || 0;

        // Placement type multipliers (mock data - in real implementation, this comes from API)
        const multipliers = {
            'overall': 1.0,
            'main-ads': 0.45,
            'widget-ads': 0.35,
            'pop-ups': 0.12,
            'in-session-ads': 0.08
        };

        // CTR variations by placement type
        const ctrMultipliers = {
            'overall': 1.0,
            'main-ads': 1.2,      // Main ads have higher CTR
            'widget-ads': 0.9,    // Widget ads slightly lower
            'pop-ups': 1.5,       // Pop-ups have highest engagement
            'in-session-ads': 0.7 // In-session ads lowest (during teaching)
        };

        const mult = multipliers[placementType] || 1.0;
        const ctrMult = ctrMultipliers[placementType] || 1.0;

        return {
            impressions: Math.floor(totalImpressions * mult),
            clicks: Math.floor(totalClicks * mult),
            ctr: (totalCtr * ctrMult).toFixed(1),
            conversions: Math.floor((totalClicks * mult) * 0.067)
        };
    },

    // Show campaign details
    showCampaignDetails(campaign, placementType = 'overall') {
        const placeholder = document.getElementById('campaign-details-placeholder');
        const content = document.getElementById('campaign-details-content');

        if (placeholder) placeholder.style.display = 'none';
        if (content) content.classList.add('active');

        // Update modal header with campaign info
        this.updateModalHeaderCampaign(campaign);

        // Populate analytics filters based on campaign's targeting configuration
        this.populateAnalyticsFilters(campaign);

        // Get placement-specific analytics
        const analytics = this.getPlacementAnalytics(campaign, placementType);

        // Update analytics with placement-specific data
        this.setElementText('analytics-impressions', this.formatNumber(analytics.impressions));
        this.setElementText('analytics-clicks', this.formatNumber(analytics.clicks));
        this.setElementText('analytics-ctr', analytics.ctr + '%');
        this.setElementText('analytics-conversions', this.formatNumber(analytics.conversions));

        // Switch to images tab (default active tab)
        this.switchCampaignTab('images');

        // Populate media filters based on campaign targeting
        this.populateMediaFilters();

        // Update footer buttons based on campaign status
        this.updateFooterButtons();

        // Update finances from campaign total_budget
        this.updateFinancesFromCampaign(campaign);

        // Render activity timeline
        this.renderActivityTimeline();
    },

    // Update finances tab with campaign data
    updateFinancesFromCampaign(campaign) {
        if (!campaign) return;

        const totalBudget = campaign.total_budget || campaign.budget || 0;
        const amountUsed = campaign.amount_used || 0;
        const remaining = totalBudget - amountUsed;
        const usedPercentage = totalBudget > 0 ? ((amountUsed / totalBudget) * 100).toFixed(1) : 0;
        const remainingPercentage = totalBudget > 0 ? ((remaining / totalBudget) * 100).toFixed(1) : 100;

        // Update Total Investment
        this.setElementText('finance-total-investment', this.formatCurrency(totalBudget));

        // Update Amount Used
        this.setElementText('finance-amount-used', this.formatCurrency(amountUsed));
        this.setElementText('finance-used-percentage', `${usedPercentage}%`);
        const usedProgress = document.getElementById('finance-used-progress');
        if (usedProgress) usedProgress.style.width = `${usedPercentage}%`;

        // Update Remaining Balance
        this.setElementText('finance-remaining-balance', this.formatCurrency(remaining));
        this.setElementText('finance-remaining-percentage', `${remainingPercentage}%`);
        const remainingProgress = document.getElementById('finance-remaining-progress');
        if (remainingProgress) remainingProgress.style.width = `${remainingPercentage}%`;
    },

    // Switch campaign tab
    switchCampaignTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.campaign-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update tab content
        document.querySelectorAll('.campaign-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeContent = document.getElementById(`tab-${tabName}`);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    },

    // Close campaign modal
    closeCampaignModal() {
        const overlay = document.getElementById('campaign-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Make sure form is hidden when closing
        this.hideCreateCampaignForm();

        this.currentBrand = null;
        this.currentCampaign = null;
        this.campaigns = [];
    },

    // Set brand filter by status (renamed from filterBrands to avoid conflict with array filter function)
    setStatusFilter(status) {
        this.currentFilter = status;

        // Update filter buttons
        document.querySelectorAll('.brands-filter-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === status) {
                btn.classList.add('active');
            }
        });

        this.renderBrands();
    },

    // Search brands
    searchBrands(query) {
        const searchQuery = query.toLowerCase().trim();

        if (!searchQuery) {
            this.renderBrands();
            return;
        }

        const container = document.getElementById('brandsGrid');
        if (!container) return;

        const filteredBrands = this.brands.filter(brand =>
            brand.name.toLowerCase().includes(searchQuery) ||
            (brand.industry && brand.industry.toLowerCase().includes(searchQuery)) ||
            (brand.description && brand.description.toLowerCase().includes(searchQuery))
        );

        container.innerHTML = this.createNewBrandCard();

        if (filteredBrands.length === 0) {
            container.innerHTML += `
                <div class="brands-empty-state">
                    <div class="brands-empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3>No brands found</h3>
                    <p>No brands match "${query}"</p>
                </div>
            `;
        } else {
            filteredBrands.forEach(brand => {
                container.innerHTML += this.createBrandCard(brand);
            });
        }
    },

    // Open create brand modal
    openCreateBrandModal() {
        const overlay = document.getElementById('create-brand-modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Reset edit mode
            this.isEditingBrand = false;
            this.editingBrandId = null;

            // Update modal for create mode
            this.updateBrandModalMode('create');

            // Reset form
            const form = document.getElementById('create-brand-form');
            if (form) form.reset();
            // Reset logo preview
            const preview = document.getElementById('brand-logo-preview');
            if (preview) preview.innerHTML = '<i class="fas fa-building"></i>';
            // Reset color value display
            const colorValue = document.getElementById('brand-color-value');
            if (colorValue) colorValue.textContent = '#8B5CF6';
            // Collapse social links
            const collapsible = document.querySelector('.create-brand-collapsible');
            if (collapsible) collapsible.classList.remove('expanded');
        }
    },

    // Update brand modal for create or edit mode
    updateBrandModalMode(mode) {
        const title = document.querySelector('.create-brand-modal-title');
        const subtitle = document.querySelector('.create-brand-modal-subtitle');
        const submitBtn = document.getElementById('create-brand-submit-btn');

        if (mode === 'edit') {
            if (title) title.textContent = 'Edit Brand';
            if (subtitle) subtitle.textContent = 'Update your brand information';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        } else {
            if (title) title.textContent = 'Create New Brand';
            if (subtitle) subtitle.textContent = 'Add a new brand to manage your campaigns';
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus"></i> Create Brand';
            }
        }
    },

    // Close create brand modal
    closeCreateBrandModal() {
        const overlay = document.getElementById('create-brand-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Toggle social links collapsible
    toggleSocialLinks() {
        const collapsible = document.querySelector('.create-brand-collapsible');
        if (collapsible) {
            collapsible.classList.toggle('expanded');
        }
    },

    // Preview brand logo
    previewBrandLogo(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const preview = document.getElementById('brand-logo-preview');
                if (preview) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="Brand Logo">`;
                }
            };
            reader.readAsDataURL(file);
        }
    },

    // Update campaign modal header with brand info
    updateCampaignModalHeader(brand) {
        this.setElementText('campaign-modal-brand-name', brand.name);
        this.setElementText('campaign-modal-brand-industry', brand.industry || 'General');

        const logoEl = document.getElementById('campaign-modal-brand-logo');
        if (logoEl) {
            if (brand.logo || brand.logo_url) {
                logoEl.innerHTML = `<img src="${brand.logo || brand.logo_url}" alt="${brand.name}">`;
            } else {
                logoEl.innerHTML = '<i class="fas fa-building"></i>';
            }
        }
    },

    // Submit create brand form
    async submitCreateBrand(event) {
        event.preventDefault();

        const submitBtn = document.getElementById('create-brand-submit-btn');
        const originalText = submitBtn.innerHTML;
        const isEditing = this.isEditingBrand && this.editingBrandId;

        submitBtn.disabled = true;
        submitBtn.innerHTML = isEditing
            ? '<i class="fas fa-spinner fa-spin"></i> Saving...'
            : '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            const token = localStorage.getItem('token');

            // Gather form data
            const brandData = {
                name: document.getElementById('brand-name-input').value.trim(),
                industry: document.getElementById('brand-industry-input').value,
                bio: document.getElementById('brand-description-input').value.trim(),
                website: document.getElementById('brand-website-input').value.trim(),
                brand_color: document.getElementById('brand-color-input').value,
                status: document.getElementById('brand-status-input').value,
                social_links: {
                    facebook: document.getElementById('brand-facebook-input')?.value.trim() || null,
                    instagram: document.getElementById('brand-instagram-input')?.value.trim() || null,
                    twitter: document.getElementById('brand-twitter-input')?.value.trim() || null,
                    linkedin: document.getElementById('brand-linkedin-input')?.value.trim() || null,
                    youtube: document.getElementById('brand-youtube-input')?.value.trim() || null,
                    tiktok: document.getElementById('brand-tiktok-input')?.value.trim() || null
                }
            };

            // Remove empty social links
            Object.keys(brandData.social_links).forEach(key => {
                if (!brandData.social_links[key]) delete brandData.social_links[key];
            });

            // Use PUT for edit, POST for create
            const url = isEditing
                ? `${API_BASE_URL}/api/advertiser/brands/${this.editingBrandId}`
                : `${API_BASE_URL}/api/advertiser/brands`;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(brandData)
            });

            if (response.ok) {
                const result = await response.json();

                // Handle logo upload if file was selected
                const logoInput = document.getElementById('brand-logo-input');
                const brandId = isEditing ? this.editingBrandId : result.brand_id;
                if (logoInput.files.length > 0 && brandId) {
                    await this.uploadBrandLogo(brandId, logoInput.files[0]);
                }

                // Reset edit mode
                this.isEditingBrand = false;
                this.editingBrandId = null;

                // Close modal and reload brands
                this.closeCreateBrandModal();
                this.loadBrands();

                // Update currentBrand if we were editing it
                if (isEditing && this.currentBrand && this.currentBrand.id === brandId) {
                    // Merge updated data into currentBrand
                    Object.assign(this.currentBrand, brandData);
                    // Update the campaign modal header with new brand info
                    this.updateCampaignModalHeader(this.currentBrand);
                }

                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification(isEditing ? 'Brand updated successfully!' : 'Brand created successfully!', 'success');
                }
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create brand');
            }
        } catch (error) {
            console.error('Error creating brand:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message || 'Failed to create brand', 'error');
            } else {
                alert(error.message || 'Failed to create brand');
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    },

    // Upload brand logo
    async uploadBrandLogo(brandId, file) {
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);

            await fetch(`${API_BASE_URL}/api/advertiser/brands/${brandId}/logo`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
        } catch (error) {
            console.error('Error uploading brand logo:', error);
        }
    },

    // Edit current brand
    editCurrentBrand() {
        if (!this.currentBrand) return;

        // Set edit mode
        this.isEditingBrand = true;
        this.editingBrandId = this.currentBrand.id;

        // Open the modal
        const overlay = document.getElementById('create-brand-modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Update modal for edit mode
            this.updateBrandModalMode('edit');

            // Populate form with brand data
            this.populateBrandEditForm(this.currentBrand);
        }
    },

    // Populate brand form with existing data
    populateBrandEditForm(brand) {
        // Basic fields
        const nameInput = document.getElementById('brand-name-input');
        const industryInput = document.getElementById('brand-industry-input');
        const descriptionInput = document.getElementById('brand-description-input');
        const websiteInput = document.getElementById('brand-website-input');
        const colorInput = document.getElementById('brand-color-input');
        const colorValue = document.getElementById('brand-color-value');
        const statusInput = document.getElementById('brand-status-input');

        if (nameInput) nameInput.value = brand.name || '';
        if (industryInput) industryInput.value = brand.industry || '';
        if (descriptionInput) descriptionInput.value = brand.bio || brand.description || '';
        if (websiteInput) websiteInput.value = brand.website || '';
        if (colorInput) colorInput.value = brand.brand_color || '#8B5CF6';
        if (colorValue) colorValue.textContent = brand.brand_color || '#8B5CF6';
        if (statusInput) statusInput.value = brand.status || 'active';

        // Logo preview
        const preview = document.getElementById('brand-logo-preview');
        if (preview) {
            if (brand.logo || brand.logo_url) {
                preview.innerHTML = `<img src="${brand.logo || brand.logo_url}" alt="Brand Logo">`;
            } else {
                preview.innerHTML = '<i class="fas fa-building"></i>';
            }
        }

        // Social links
        const socialLinks = brand.social_links || {};
        const facebookInput = document.getElementById('brand-facebook-input');
        const instagramInput = document.getElementById('brand-instagram-input');
        const twitterInput = document.getElementById('brand-twitter-input');
        const linkedinInput = document.getElementById('brand-linkedin-input');
        const youtubeInput = document.getElementById('brand-youtube-input');
        const tiktokInput = document.getElementById('brand-tiktok-input');

        if (facebookInput) facebookInput.value = socialLinks.facebook || '';
        if (instagramInput) instagramInput.value = socialLinks.instagram || '';
        if (twitterInput) twitterInput.value = socialLinks.twitter || '';
        if (linkedinInput) linkedinInput.value = socialLinks.linkedin || '';
        if (youtubeInput) youtubeInput.value = socialLinks.youtube || '';
        if (tiktokInput) tiktokInput.value = socialLinks.tiktok || '';

        // Expand social links section if any are filled
        const hasSocialLinks = Object.values(socialLinks).some(v => v);
        if (hasSocialLinks) {
            const collapsible = document.querySelector('.create-brand-collapsible');
            if (collapsible) collapsible.classList.add('expanded');
        }
    },

    // Open brand settings
    openBrandSettings() {
        if (!this.currentBrand) return;
        // TODO: Implement brand settings
        alert('Brand Settings feature coming soon!');
    },

    // Show create campaign form (inline in campaign modal)
    showCreateCampaignForm() {
        const listView = document.getElementById('campaign-list-view');
        const formSection = document.getElementById('create-campaign-form-section');

        // Hide list view, show form (footer is now inside form section)
        if (listView) listView.style.display = 'none';
        if (formSection) formSection.style.display = 'flex';

        // Reset edit mode
        this.isEditMode = false;
        this.editingCampaignId = null;

        // Reset form
        const form = document.getElementById('create-campaign-form');
        if (form) form.reset();

        // Reset all checkboxes to checked (default state for new campaign)
        this.resetFormCheckboxes();

        // Update form title and button for create mode
        this.updateFormMode('create');

        // Set default start date to today
        const startDateInput = document.getElementById('campaign-start-date-input');
        if (startDateInput) {
            const today = new Date().toISOString().split('T')[0];
            startDateInput.value = today;
        }

        // NOTE: loadAdvertiserBalance() removed - using 20% deposit model with external payment gateway

        // Load CPI rate
        this.loadCpiRate();
    },

    // Reset all form checkboxes to default checked state
    resetFormCheckboxes() {
        // Objectives
        const objectiveAll = document.getElementById('objective-all');
        const objectiveAwareness = document.getElementById('objective-awareness');
        const objectiveTraffic = document.getElementById('objective-traffic');
        const objectiveEngagement = document.getElementById('objective-engagement');
        if (objectiveAll) objectiveAll.checked = true;
        if (objectiveAwareness) objectiveAwareness.checked = true;
        if (objectiveTraffic) objectiveTraffic.checked = true;
        if (objectiveEngagement) objectiveEngagement.checked = true;

        // Audiences
        const audienceAll = document.getElementById('audience-all');
        const audienceTutor = document.getElementById('audience-tutor');
        const audienceStudent = document.getElementById('audience-student');
        const audienceParent = document.getElementById('audience-parent');
        const audienceAdvertiser = document.getElementById('audience-advertiser');
        const audienceUser = document.getElementById('audience-user');
        if (audienceAll) audienceAll.checked = true;
        if (audienceTutor) audienceTutor.checked = true;
        if (audienceStudent) audienceStudent.checked = true;
        if (audienceParent) audienceParent.checked = true;
        if (audienceAdvertiser) audienceAdvertiser.checked = true;
        if (audienceUser) audienceUser.checked = true;

        // Placements
        const placementAll = document.getElementById('placement-all');
        const placementPlaceholder = document.getElementById('placement-placeholder');
        const placementWidget = document.getElementById('placement-widget');
        const placementPopup = document.getElementById('placement-popup');
        const placementInsession = document.getElementById('placement-insession');
        if (placementAll) placementAll.checked = true;
        if (placementPlaceholder) placementPlaceholder.checked = true;
        if (placementWidget) placementWidget.checked = true;
        if (placementPopup) placementPopup.checked = true;
        if (placementInsession) placementInsession.checked = true;

        // Location - reset to global
        const locationInput = document.getElementById('campaign-location-input');
        if (locationInput) locationInput.value = 'global';

        // Hide regional selection
        const regionalSelection = document.getElementById('regional-selection');
        if (regionalSelection) regionalSelection.style.display = 'none';
    },

    // Update form title and button based on mode (create/edit)
    updateFormMode(mode) {
        const formTitle = document.querySelector('.create-campaign-form-title span');
        const formIcon = document.querySelector('.create-campaign-form-title i');
        const submitBtn = document.getElementById('campaign-create-btn');

        if (mode === 'edit') {
            if (formTitle) formTitle.textContent = 'Edit Campaign';
            if (formIcon) {
                formIcon.classList.remove('fa-rocket');
                formIcon.classList.add('fa-edit');
            }
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            }
        } else {
            if (formTitle) formTitle.textContent = 'New Campaign';
            if (formIcon) {
                formIcon.classList.remove('fa-edit');
                formIcon.classList.add('fa-rocket');
            }
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Review & Create';
            }
        }
    },

    // Show edit campaign form (populated with existing data)
    showEditCampaignForm(campaign) {
        const listView = document.getElementById('campaign-list-view');
        const formSection = document.getElementById('create-campaign-form-section');

        // Hide list view, show form
        if (listView) listView.style.display = 'none';
        if (formSection) formSection.style.display = 'flex';

        // Set edit mode
        this.isEditMode = true;
        this.editingCampaignId = campaign.id;

        // Update form title and button for edit mode
        this.updateFormMode('edit');

        // Populate form with campaign data
        this.populateEditForm(campaign);

        // NOTE: loadAdvertiserBalance() removed - using 20% deposit model with external payment gateway

        // Load CPI rate
        this.loadCpiRate();
    },

    // Populate form with existing campaign data
    populateEditForm(campaign) {
        // Basic fields
        const nameInput = document.getElementById('campaign-name-input');
        const descInput = document.getElementById('campaign-description-input');
        const budgetInput = document.getElementById('campaign-budget-input');
        const startDateInput = document.getElementById('campaign-start-date-input');
        const locationInput = document.getElementById('campaign-location-input');

        if (nameInput) nameInput.value = campaign.name || '';
        if (descInput) descInput.value = campaign.description || '';

        // For budget, use remaining_balance instead of campaign_budget
        // This allows them to see/adjust the remaining budget
        if (budgetInput) {
            const remainingBalance = campaign.remaining_balance || campaign.campaign_budget || 0;
            budgetInput.value = remainingBalance;
            // Update the estimated impressions display
            this.calculateEstimatedImpressions(remainingBalance);
        }

        // Start date
        if (startDateInput && campaign.start_date) {
            // Parse date string and format as YYYY-MM-DD for input
            const dateStr = campaign.start_date.split(' ')[0]; // Get just the date part
            startDateInput.value = dateStr;
        }

        // Location
        if (locationInput) {
            locationInput.value = campaign.target_location || 'global';
            // Trigger location change to show/hide regional selection
            this.onLocationChange();
        }

        // Populate checkboxes
        this.populateCheckboxes(campaign);

        // Show info about used budget if any
        if (campaign.amount_used > 0) {
            this.showUsedBudgetInfo(campaign);
        }
    },

    // Populate checkbox fields from campaign data
    populateCheckboxes(campaign) {
        // Target Audiences
        const audiences = campaign.target_audiences || ['tutor', 'student', 'parent', 'advertiser', 'user'];
        const allAudiences = ['tutor', 'student', 'parent', 'advertiser', 'user'];

        allAudiences.forEach(audience => {
            const checkbox = document.getElementById(`audience-${audience}`);
            if (checkbox) {
                checkbox.checked = audiences.includes(audience);
            }
        });

        // Update "All" checkbox
        const audienceAll = document.getElementById('audience-all');
        if (audienceAll) {
            audienceAll.checked = audiences.length === allAudiences.length;
        }

        // Target Placements
        const placements = campaign.target_placements || ['placeholder', 'widget', 'popup', 'insession'];
        const allPlacements = ['placeholder', 'widget', 'popup', 'insession'];

        allPlacements.forEach(placement => {
            const checkbox = document.getElementById(`placement-${placement}`);
            if (checkbox) {
                checkbox.checked = placements.includes(placement);
            }
        });

        // Update "All" checkbox
        const placementAll = document.getElementById('placement-all');
        if (placementAll) {
            placementAll.checked = placements.length === allPlacements.length;
        }

        // Objectives (these are stored in the 'objective' field as comma-separated or array)
        // For now, we'll default to all checked since objectives aren't stored as array in DB
        const objectiveAll = document.getElementById('objective-all');
        const objectiveAwareness = document.getElementById('objective-awareness');
        const objectiveTraffic = document.getElementById('objective-traffic');
        const objectiveEngagement = document.getElementById('objective-engagement');

        // Default all to checked if no specific objective data
        if (objectiveAll) objectiveAll.checked = true;
        if (objectiveAwareness) objectiveAwareness.checked = true;
        if (objectiveTraffic) objectiveTraffic.checked = true;
        if (objectiveEngagement) objectiveEngagement.checked = true;

        // Trigger selection updates for CPI calculation
        this.updateAudienceSelection();
        this.updatePlacementSelection();
    },

    // Show info about already used budget
    showUsedBudgetInfo(campaign) {
        const budgetGroup = document.querySelector('#campaign-budget-input').closest('.campaign-form-group');

        // Remove existing info if any
        const existingInfo = budgetGroup.querySelector('.used-budget-info');
        if (existingInfo) existingInfo.remove();

        // Create info element
        const infoDiv = document.createElement('div');
        infoDiv.id = 'used-budget-info';
        infoDiv.className = 'used-budget-info';
        infoDiv.style.cssText = 'margin-top: 8px; padding: 10px; background: rgba(255, 152, 0, 0.1); border-radius: 6px; border-left: 3px solid #ff9800; font-size: 0.85rem;';
        infoDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <i class="fas fa-info-circle" style="color: #ff9800;"></i>
                <strong style="color: #ff9800;">Budget Already Used</strong>
            </div>
            <div style="color: var(--text-secondary);">
                Original budget: <strong>${campaign.campaign_budget.toLocaleString()} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</strong><br>
                Already spent: <strong>${campaign.amount_used.toLocaleString()} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</strong> (non-refundable)<br>
                Remaining: <strong>${campaign.remaining_balance.toLocaleString()} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}</strong>
            </div>
        `;

        budgetGroup.appendChild(infoDiv);
    },

    // DEPRECATED: Balance checking removed - using 20% deposit model with external payment gateway
    // loadAdvertiserBalance() function removed - no longer needed

    // Load CPI (Cost Per Impression) rates from admin database
    async loadCpiRate() {
        const badge = document.getElementById('cpi-rate-badge');
        const valueEl = document.getElementById('cpi-rate-value');

        if (!badge || !valueEl) return;

        // Set loading state
        badge.classList.add('loading');
        valueEl.textContent = 'Loading...';

        try {
            // Fetch full CPI rates (base + premiums)
            const response = await fetch(`${API_BASE_URL}/api/cpi/full-rates`);

            if (response.ok) {
                const data = await response.json();

                if (data.success) {
                    // Store all CPI rates (including JSONB region exclusion premiums)
                    this.cpiRates = {
                        baseRate: data.baseRate || 0.05,
                        audiencePremiums: data.audiencePremiums || {
                            tutor: 0.02,
                            student: 0.015,
                            parent: 0.018
                        },
                        locationPremiums: data.locationPremiums || {
                            national: 0.01,
                            regional: 0.025
                        },
                        regionExclusionPremiums: data.regionExclusionPremiums || {},  // JSONB format by country
                        countryRegions: data.countryRegions || {},  // Country configuration
                        placementPremiums: data.placementPremiums || {
                            placeholder: 0.01,
                            widget: 0.02,
                            popup: 0.05,
                            insession: 0.10
                        },
                        currency: data.currency || 'ETB'
                    };

                    badge.classList.remove('loading');

                    // Calculate initial CPI based on current form selections
                    this.updateCpiDisplay();

                    // Add event listeners to update CPI when selections change
                    this.setupCpiListeners();
                } else {
                    throw new Error('Failed to load CPI');
                }
            } else {
                throw new Error('API error');
            }
        } catch (error) {
            console.error('Error loading CPI rates:', error);
            // Use defaults with empty region premiums
            this.cpiRates = {
                baseRate: 0.05,
                audiencePremiums: { tutor: 0.02, student: 0.015, parent: 0.018 },
                locationPremiums: { national: 0.01, regional: 0.025 },
                regionExclusionPremiums: {},  // Will be empty until loaded
                countryRegions: {},
                placementPremiums: { placeholder: 0.01, widget: 0.02, popup: 0.05, insession: 0.10 },
                currency: window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'
            };
            badge.classList.remove('loading');
            this.updateCpiDisplay();
            this.setupCpiListeners();
        }
    },

    // Setup event listeners for CPI recalculation
    setupCpiListeners() {
        const audienceSelect = document.getElementById('campaign-audience-input');
        const locationSelect = document.getElementById('campaign-location-input');

        if (audienceSelect) {
            audienceSelect.removeEventListener('change', this.handleCpiChange);
            audienceSelect.addEventListener('change', () => this.updateCpiDisplay());
        }

        if (locationSelect) {
            locationSelect.removeEventListener('change', this.handleCpiChange);
            locationSelect.addEventListener('change', () => this.updateCpiDisplay());
        }
    },

    // Calculate and update CPI display based on form selections
    updateCpiDisplay() {
        const badge = document.getElementById('cpi-rate-badge');
        const valueEl = document.getElementById('cpi-rate-value');

        if (!valueEl || !this.cpiRates) return;

        // Get location value
        const location = document.getElementById('campaign-location-input')?.value || 'global';

        // Calculate audience exclusion premium based on checkboxes (EXCLUSION LOGIC)
        // If "All" is checked OR all individual audiences are checked = base CPI (no premium)
        // If specific audiences are UNCHECKED (excluded), add their exclusion premium
        // This works exactly like placement exclusion premiums
        let audiencePremium = 0;
        const tutorCheck = document.getElementById('audience-tutor');
        const studentCheck = document.getElementById('audience-student');
        const parentCheck = document.getElementById('audience-parent');
        const advertiserCheck = document.getElementById('audience-advertiser');
        const userCheck = document.getElementById('audience-user');

        // Add premium for each audience that is UNCHECKED (excluded)
        if (tutorCheck && !tutorCheck.checked) {
            audiencePremium += this.cpiRates.audiencePremiums?.tutor || 0;
        }
        if (studentCheck && !studentCheck.checked) {
            audiencePremium += this.cpiRates.audiencePremiums?.student || 0;
        }
        if (parentCheck && !parentCheck.checked) {
            audiencePremium += this.cpiRates.audiencePremiums?.parent || 0;
        }
        if (advertiserCheck && !advertiserCheck.checked) {
            audiencePremium += this.cpiRates.audiencePremiums?.advertiser || 0;
        }
        if (userCheck && !userCheck.checked) {
            audiencePremium += this.cpiRates.audiencePremiums?.user || 0;
        }

        // Update audience CPI notice
        const audienceNotice = document.getElementById('audience-cpi-notice');
        const audienceAmountEl = document.getElementById('audience-premium-amount');
        if (audienceNotice) {
            if (audiencePremium > 0) {
                audienceNotice.style.display = 'flex';
                if (audienceAmountEl) {
                    audienceAmountEl.textContent = `+${audiencePremium.toFixed(3)} ${this.cpiRates.currency || 'ETB'}`;
                }
            } else {
                audienceNotice.style.display = 'none';
            }
        }

        // Calculate location premium
        // - Global: No premium (base rate only)
        // - National: Add national premium
        // - Regional: Add national premium + region exclusion premiums
        let locationPremium = 0;
        if (location === 'national' || location === 'regional') {
            // Both national and regional include the national premium
            locationPremium = this.cpiRates.locationPremiums?.national || 0;
        }

        // Calculate region exclusion premium (REVERSE LOGIC: unchecking adds premium)
        // When location is 'regional', unchecking regions adds exclusion premium ON TOP of national
        // Uses dynamic JSONB format: {"ET": {"addis-ababa": 1.0, ...}, "KE": {...}}
        // Formula: Regional CPI = Base + National + Region Exclusion Premiums
        let regionExclusionPremium = 0;
        if (location === 'regional') {
            // Get the country selector value (defaults to ET for Ethiopia)
            const countrySelector = document.getElementById('campaign-country');
            const countryCode = countrySelector?.value || 'ET';

            // Get region premiums for this country
            const countryPremiums = this.cpiRates.regionExclusionPremiums?.[countryCode] || {};

            // Find all region checkboxes and calculate exclusion premium for unchecked ones
            const regionCheckboxes = document.querySelectorAll('.region-checkbox');
            regionCheckboxes.forEach(checkbox => {
                const regionId = checkbox.dataset.regionId || checkbox.id?.replace('region-', '');
                if (regionId && !checkbox.checked) {
                    // Unchecked region = add exclusion premium
                    regionExclusionPremium += countryPremiums[regionId] || 0;
                }
            });
        }

        // Update location CPI notice to include region exclusion
        const locationNotice = document.getElementById('location-cpi-notice');
        const locationAmountEl = document.getElementById('location-premium-amount');
        const totalLocationPremium = locationPremium + regionExclusionPremium;
        if (locationNotice) {
            if (totalLocationPremium > 0) {
                locationNotice.style.display = 'flex';
                if (locationAmountEl) {
                    locationAmountEl.textContent = `+${totalLocationPremium.toFixed(3)} ${this.cpiRates.currency || 'ETB'}`;
                }
            } else {
                locationNotice.style.display = 'none';
            }
        }

        // Calculate placement premium (REVERSE LOGIC: unchecking adds premium)
        // When "All" is checked, all individual checkboxes are checked = base CPI (no premium)
        // When a placement is UNCHECKED, it adds premium (advertiser is being more specific)
        let placementPremium = 0;
        const placeholderCheck = document.getElementById('placement-placeholder');
        const widgetCheck = document.getElementById('placement-widget');
        const popupCheck = document.getElementById('placement-popup');
        const insessionCheck = document.getElementById('placement-insession');

        if (placeholderCheck && !placeholderCheck.checked) {
            placementPremium += this.cpiRates.placementPremiums?.placeholder || 0;
        }
        if (widgetCheck && !widgetCheck.checked) {
            placementPremium += this.cpiRates.placementPremiums?.widget || 0;
        }
        if (popupCheck && !popupCheck.checked) {
            placementPremium += this.cpiRates.placementPremiums?.popup || 0;
        }
        if (insessionCheck && !insessionCheck.checked) {
            placementPremium += this.cpiRates.placementPremiums?.insession || 0;
        }

        // Calculate total CPI
        const totalCpi = this.cpiRates.baseRate + audiencePremium + locationPremium + regionExclusionPremium + placementPremium;
        const currency = this.cpiRates.currency || 'ETB';

        // Update display
        valueEl.textContent = `${totalCpi.toFixed(3)} ${currency}`;

        // Update badge color based on premium level
        const premiumCount = (audiencePremium > 0 ? 1 : 0) + (totalLocationPremium > 0 ? 1 : 0) + (placementPremium > 0 ? 1 : 0);

        if (badge) {
            badge.classList.remove('cpi-base', 'cpi-premium', 'cpi-high');
            if (premiumCount >= 2) {
                badge.classList.add('cpi-high'); // Multiple premiums
            } else if (premiumCount === 1) {
                badge.classList.add('cpi-premium'); // One premium
            } else {
                badge.classList.add('cpi-base'); // Base rate only
            }
        }

        // Update placement CPI notice
        this.updatePlacementCpiNotice(placementPremium, currency);

        // Store current calculated CPI
        this.currentCpiRate = totalCpi;
        this.cpiCurrency = currency;
    },

    // Update the CPI notice for placement exclusions
    updatePlacementCpiNotice(placementPremium, currency) {
        const notice = document.getElementById('placement-cpi-notice');
        const amountEl = document.getElementById('placement-premium-amount');

        if (!notice) return;

        if (placementPremium > 0) {
            notice.style.display = 'flex';
            if (amountEl) {
                amountEl.textContent = `+${placementPremium.toFixed(3)} ${currency}`;
            }
        } else {
            notice.style.display = 'none';
        }
    },

    // Toggle all placement checkboxes (master checkbox)
    toggleAllPlacements(checked) {
        const placements = ['placeholder', 'widget', 'popup', 'insession'];

        placements.forEach(placement => {
            const checkbox = document.getElementById(`placement-${placement}`);
            if (checkbox) {
                checkbox.checked = checked;
            }
        });

        // Recalculate CPI
        this.updateCpiDisplay();
        this.updatePlacementTabBadge();
    },

    // Update placement selection when individual checkbox changes
    updatePlacementSelection() {
        const allCheck = document.getElementById('placement-all');
        const placements = ['placeholder', 'widget', 'popup', 'insession'];

        // Check if all individual placements are checked
        const allChecked = placements.every(placement => {
            const checkbox = document.getElementById(`placement-${placement}`);
            return checkbox && checkbox.checked;
        });

        // Update "All" checkbox based on individual states
        if (allCheck) {
            allCheck.checked = allChecked;
        }

        // Recalculate CPI
        this.updateCpiDisplay();
        this.updatePlacementTabBadge();
    },

    // ============================================
    // OBJECTIVE CHECKBOX HANDLERS
    // ============================================

    // Toggle all objective checkboxes
    toggleAllObjectives(checked) {
        const objectives = ['awareness', 'traffic', 'engagement'];
        objectives.forEach(obj => {
            const checkbox = document.getElementById(`objective-${obj}`);
            if (checkbox) checkbox.checked = checked;
        });
    },

    // Update objective selection when individual checkbox changes
    updateObjectiveSelection() {
        const allCheck = document.getElementById('objective-all');
        const objectives = ['awareness', 'traffic', 'engagement'];

        const allChecked = objectives.every(obj => {
            const checkbox = document.getElementById(`objective-${obj}`);
            return checkbox && checkbox.checked;
        });

        if (allCheck) allCheck.checked = allChecked;
    },

    // Get selected objectives as array
    getSelectedObjectives() {
        const objectives = ['awareness', 'traffic', 'engagement'];
        return objectives.filter(obj => {
            const checkbox = document.getElementById(`objective-${obj}`);
            return checkbox && checkbox.checked;
        });
    },

    // ============================================
    // AUDIENCE CHECKBOX HANDLERS
    // ============================================

    // Toggle all audience checkboxes
    toggleAllAudiences(checked) {
        const audiences = ['tutor', 'student', 'parent', 'advertiser', 'user'];
        audiences.forEach(aud => {
            const checkbox = document.getElementById(`audience-${aud}`);
            if (checkbox) checkbox.checked = checked;
        });
        this.updateCpiDisplay();
        this.updateAudienceTabBadge();
    },

    // Update audience selection when individual checkbox changes
    updateAudienceSelection() {
        const allCheck = document.getElementById('audience-all');
        const audiences = ['tutor', 'student', 'parent', 'advertiser', 'user'];

        const allChecked = audiences.every(aud => {
            const checkbox = document.getElementById(`audience-${aud}`);
            return checkbox && checkbox.checked;
        });

        if (allCheck) allCheck.checked = allChecked;
        this.updateCpiDisplay();
        this.updateAudienceTabBadge();
    },

    // Get selected audiences as array
    getSelectedAudiences() {
        const audiences = ['tutor', 'student', 'parent', 'advertiser', 'user'];
        return audiences.filter(aud => {
            const checkbox = document.getElementById(`audience-${aud}`);
            return checkbox && checkbox.checked;
        });
    },

    // ============================================
    // TARGETING TAB HANDLERS
    // ============================================

    // Switch targeting tab (audience, location, placement)
    switchTargetingTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.targeting-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Update panels
        document.querySelectorAll('.targeting-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const activePanel = document.getElementById(`targeting-panel-${tabName}`);
        if (activePanel) {
            activePanel.classList.add('active');
        }
    },

    // Select location type (global, national, regional) via card click
    selectLocationType(locationType) {
        // Update location type cards
        document.querySelectorAll('.location-type-card').forEach(card => {
            card.classList.remove('active');
            if (card.dataset.location === locationType) {
                card.classList.add('active');
            }
        });

        // Update hidden select for form submission
        const locationSelect = document.getElementById('campaign-location-input');
        if (locationSelect) {
            locationSelect.value = locationType;
        }

        // Update tab badge
        const badge = document.getElementById('location-tab-badge');
        if (badge) {
            const labels = { global: 'Global', national: 'National', regional: 'Regional' };
            badge.textContent = labels[locationType] || 'Global';
        }

        // Trigger the existing location change handler
        this.handleLocationChange();
    },

    // Update audience tab badge
    updateAudienceTabBadge() {
        const badge = document.getElementById('audience-tab-badge');
        if (!badge) return;

        const allChecked = document.getElementById('audience-all')?.checked;
        if (allChecked) {
            badge.textContent = 'All';
        } else {
            const audiences = ['tutor', 'student', 'parent', 'advertiser', 'user'];
            const checkedCount = audiences.filter(aud => {
                const checkbox = document.getElementById(`audience-${aud}`);
                return checkbox && checkbox.checked;
            }).length;
            badge.textContent = checkedCount === 0 ? 'None' : `${checkedCount}/${audiences.length}`;
        }
    },

    // Update placement tab badge
    updatePlacementTabBadge() {
        const badge = document.getElementById('placement-tab-badge');
        if (!badge) return;

        const allChecked = document.getElementById('placement-all')?.checked;
        if (allChecked) {
            badge.textContent = 'All';
        } else {
            const placements = ['placeholder', 'widget', 'popup', 'insession'];
            const checkedCount = placements.filter(pl => {
                const checkbox = document.getElementById(`placement-${pl}`);
                return checkbox && checkbox.checked;
            }).length;
            badge.textContent = checkedCount === 0 ? 'None' : `${checkedCount}/${placements.length}`;
        }
    },

    // ============================================
    // LOCATION & REGION HANDLERS (Dynamic, Country-Agnostic)
    // ============================================

    // Handle location dropdown change (called from HTML onchange)
    onLocationChange() {
        this.handleLocationChange();
    },

    // Handle location dropdown change
    handleLocationChange() {
        const locationSelect = document.getElementById('campaign-location-input');
        const regionalSection = document.getElementById('regional-selection');
        const locationNotice = document.getElementById('location-cpi-notice');

        if (!locationSelect) return;

        const value = locationSelect.value;

        // Show/hide regional checkboxes
        if (regionalSection) {
            if (value === 'regional') {
                regionalSection.style.display = 'block';
                // Render regions for selected country
                this.renderRegionsForCountry();
            } else {
                regionalSection.style.display = 'none';
            }
        }

        // Show/hide location CPI notice
        if (locationNotice) {
            if (value === 'national' || value === 'regional') {
                locationNotice.style.display = 'flex';
                const amountEl = document.getElementById('location-premium-amount');
                if (amountEl && this.cpiRates) {
                    const premium = value === 'national'
                        ? this.cpiRates.locationPremiums.national || 0
                        : this.cpiRates.locationPremiums.regional || 0;
                    amountEl.textContent = `+${premium.toFixed(3)} ${this.cpiRates.currency || 'ETB'}`;
                }
            } else {
                locationNotice.style.display = 'none';
            }
        }

        this.updateCpiDisplay();
    },

    // Handle country selector change
    onCountryChange() {
        // Render regions for the newly selected country
        this.renderRegionsForCountry();
        this.updateCpiDisplay();
    },

    // Render regions dynamically based on selected country
    renderRegionsForCountry() {
        const container = document.getElementById('dynamic-regions-container');
        if (!container) return;

        const countrySelector = document.getElementById('campaign-country');
        const countryCode = countrySelector?.value || 'ET';

        // Get country configuration from cpiRates
        const countryData = this.cpiRates?.countryRegions?.[countryCode];

        if (!countryData || !countryData.regions) {
            container.innerHTML = `
                <div class="col-span-2 text-center py-2 text-gray-500">
                    <i class="fas fa-exclamation-triangle text-amber-500 mr-2"></i>
                    No regions configured for this country
                </div>
            `;
            return;
        }

        // Generate HTML for each region
        let html = '';
        countryData.regions.forEach(region => {
            html += `
                <div class="campaign-checkbox-item">
                    <label class="campaign-checkbox-label">
                        <input type="checkbox"
                               id="region-${region.id}"
                               data-region-id="${region.id}"
                               class="region-checkbox"
                               checked
                               onchange="BrandsManager.updateRegionSelection()">
                        <span class="campaign-checkbox-custom"></span>
                        <span class="campaign-checkbox-text">${region.name}</span>
                    </label>
                </div>
            `;
        });

        container.innerHTML = html;
        console.log(`Rendered ${countryData.regions.length} regions for ${countryCode}`);
    },

    // Toggle all region checkboxes (dynamic version)
    toggleAllRegions(checked) {
        const regionCheckboxes = document.querySelectorAll('.region-checkbox');
        regionCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateCpiDisplay();
    },

    // Update region selection when individual checkbox changes
    updateRegionSelection() {
        const allCheck = document.getElementById('region-all');
        const regionCheckboxes = document.querySelectorAll('.region-checkbox');

        // Check if all individual checkboxes are checked
        const allChecked = Array.from(regionCheckboxes).every(checkbox => checkbox.checked);

        if (allCheck) allCheck.checked = allChecked;
        this.updateCpiDisplay();
    },

    // Get selected regions as array (dynamic version)
    getSelectedRegions() {
        const regionCheckboxes = document.querySelectorAll('.region-checkbox');
        return Array.from(regionCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.dataset.regionId || checkbox.id.replace('region-', ''));
    },

    // Hide create campaign form (back to list)
    hideCreateCampaignForm() {
        const listView = document.getElementById('campaign-list-view');
        const formSection = document.getElementById('create-campaign-form-section');

        // Show list view, hide form (footer is now inside form section)
        if (listView) listView.style.display = 'block';
        if (formSection) formSection.style.display = 'none';

        // Reset edit mode state
        this.isEditMode = false;
        this.editingCampaignId = null;

        // Remove used-budget-info element if present (from edit mode)
        const usedBudgetInfo = document.getElementById('used-budget-info');
        if (usedBudgetInfo) {
            usedBudgetInfo.remove();
        }
    },

    // Submit create/edit campaign form
    async submitCreateCampaign(event) {
        console.log('[BrandsManager] submitCreateCampaign called, isEditMode:', this.isEditMode);
        event.preventDefault();

        if (!this.currentBrand) {
            alert('No brand selected');
            return;
        }

        console.log('[BrandsManager] Current brand:', this.currentBrand);

        // If in edit mode, update the campaign directly (no confirmation modal needed)
        if (this.isEditMode && this.editingCampaignId) {
            await this.executeUpdate();
            return;
        }

        // CREATE MODE - Show confirmation modal

        // Gather form data
        const selectedObjectives = this.getSelectedObjectives();
        const selectedAudiences = this.getSelectedAudiences();
        const selectedRegions = this.getSelectedRegions();
        const location = document.getElementById('campaign-location-input')?.value || 'global';
        const budget = parseFloat(document.getElementById('campaign-budget-input').value) || 0;

        console.log('[BrandsManager] Form data gathered:', { selectedObjectives, selectedAudiences, location, budget });

        // NOTE: Balance validation removed - using 20% deposit model with external payment gateway
        // Campaign creation proceeds directly to backend, which returns Chapa payment link

        // Calculate CPI breakdown
        const cpiBreakdown = this.calculateCpiBreakdown();
        console.log('[BrandsManager] CPI breakdown:', cpiBreakdown);

        // Prepare confirmation data
        const confirmationData = {
            campaign_name: document.getElementById('campaign-name-input').value.trim(),
            start_date: document.getElementById('campaign-start-date-input').value,

            // Targeting summary
            audiences: this.formatAudiencesForDisplay(selectedAudiences),
            location: this.formatLocationForDisplay(location, selectedRegions),
            placements: this.formatPlacementsForDisplay(),

            // CPI breakdown
            base_cpi: cpiBreakdown.baseRate,
            audience_premium: cpiBreakdown.audiencePremium,
            location_premium: cpiBreakdown.locationPremium + cpiBreakdown.regionExclusionPremium,
            placement_premium: cpiBreakdown.placementPremium,
            total_cpi: cpiBreakdown.totalCpi,

            // Budget info
            deposit_amount: budget,
            estimated_impressions: Math.floor(budget / cpiBreakdown.totalCpi),

            // Terms
            cancellation_fee_percent: 5,
            min_threshold: 100,
            currency: this.cpiCurrency || 'ETB'
        };

        console.log('[BrandsManager] Confirmation data prepared:', confirmationData);

        // Show confirmation modal
        if (typeof window.CampaignCreationConfirmation !== 'undefined') {
            console.log('[BrandsManager] Opening confirmation modal...');
            try {
                window.CampaignCreationConfirmation.open(confirmationData);
            } catch (error) {
                console.error('[BrandsManager] Error opening confirmation modal:', error);
                alert('Error opening confirmation modal. Check console for details.');
            }
        } else {
            console.error('[BrandsManager] CampaignCreationConfirmation not defined!');
            console.error('Modal overlay element exists:', !!document.getElementById('campaign-creation-confirmation-overlay'));
            console.error('Available in window:', typeof window.CampaignCreationConfirmation);
            alert('Confirmation modal not loaded. Please refresh the page and try again.');
        }
    },

    // Execute campaign update (for edit mode)
    async executeUpdate() {
        console.log('[BrandsManager] executeUpdate called for campaign:', this.editingCampaignId);

        const submitBtn = document.getElementById('campaign-create-btn');
        const originalText = submitBtn?.innerHTML;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        }

        try {
            const token = localStorage.getItem('token');

            // Gather form data
            const selectedObjectives = this.getSelectedObjectives();
            const selectedAudiences = this.getSelectedAudiences();
            const selectedRegions = this.getSelectedRegions();
            const location = document.getElementById('campaign-location-input')?.value || 'global';

            // Get selected placements
            const placements = ['placeholder', 'widget', 'popup', 'insession'];
            const selectedPlacements = placements.filter(pl => {
                const checkbox = document.getElementById(`placement-${pl}`);
                return checkbox && checkbox.checked;
            });

            // For edit mode, budget input contains the NEW remaining balance to add
            // We need to calculate the budget change
            const newBudgetInput = parseFloat(document.getElementById('campaign-budget-input').value) || 0;

            const updateData = {
                name: document.getElementById('campaign-name-input').value.trim(),
                description: document.getElementById('campaign-description-input').value.trim(),
                objective: selectedObjectives.join(', '),
                target_audiences: selectedAudiences,
                target_placements: selectedPlacements,
                target_location: location,
                target_regions: location === 'regional' ? selectedRegions : [],
                start_date: document.getElementById('campaign-start-date-input').value,
                // Only update budget if it's different from current remaining_balance
                campaign_budget: newBudgetInput
            };

            console.log('[BrandsManager] Update data:', updateData);

            const response = await fetch(`${API_BASE_URL}/api/advertiser/campaigns/${this.editingCampaignId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const result = await response.json();
                console.log('[BrandsManager] Campaign updated:', result);

                // Log activity before resetting edit mode
                this.addCampaignActivity('edit', 'Campaign Edited', 'Campaign settings were updated');

                // Reset edit mode
                this.isEditMode = false;
                this.editingCampaignId = null;

                // Hide form and reload campaigns
                this.hideCreateCampaignForm();
                await this.loadBrandCampaigns(this.currentBrand.id);

                // Show success notification
                if (typeof showNotification === 'function') {
                    showNotification('Campaign updated successfully!', 'success');
                } else {
                    alert('Campaign updated successfully!');
                }
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to update campaign');
            }
        } catch (error) {
            console.error('Error updating campaign:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message || 'Failed to update campaign', 'error');
            } else {
                alert(error.message || 'Failed to update campaign');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    },

    // Calculate CPI breakdown for confirmation modal
    calculateCpiBreakdown() {
        const location = document.getElementById('campaign-location-input')?.value || 'global';

        // Base rate
        const baseRate = this.cpiRates?.baseRate || 0.05;

        // Audience premium (exclusion logic)
        let audiencePremium = 0;
        const tutorCheck = document.getElementById('audience-tutor');
        const studentCheck = document.getElementById('audience-student');
        const parentCheck = document.getElementById('audience-parent');
        const advertiserCheck = document.getElementById('audience-advertiser');
        const userCheck = document.getElementById('audience-user');

        if (tutorCheck && !tutorCheck.checked) audiencePremium += this.cpiRates.audiencePremiums?.tutor || 0;
        if (studentCheck && !studentCheck.checked) audiencePremium += this.cpiRates.audiencePremiums?.student || 0;
        if (parentCheck && !parentCheck.checked) audiencePremium += this.cpiRates.audiencePremiums?.parent || 0;
        if (advertiserCheck && !advertiserCheck.checked) audiencePremium += this.cpiRates.audiencePremiums?.advertiser || 0;
        if (userCheck && !userCheck.checked) audiencePremium += this.cpiRates.audiencePremiums?.user || 0;

        // Location premium
        let locationPremium = 0;
        if (location === 'national' || location === 'regional') {
            locationPremium = this.cpiRates?.locationPremiums?.national || 0;
        }

        // Region exclusion premium
        let regionExclusionPremium = 0;
        if (location === 'regional') {
            const countrySelector = document.getElementById('campaign-country');
            const countryCode = countrySelector?.value || 'ET';
            const countryPremiums = this.cpiRates?.regionExclusionPremiums?.[countryCode] || {};

            const regionCheckboxes = document.querySelectorAll('.region-checkbox');
            regionCheckboxes.forEach(checkbox => {
                const regionId = checkbox.dataset.regionId || checkbox.id?.replace('region-', '');
                if (regionId && !checkbox.checked) {
                    regionExclusionPremium += countryPremiums[regionId] || 0;
                }
            });
        }

        // Placement premium (exclusion logic)
        let placementPremium = 0;
        const placeholderCheck = document.getElementById('placement-placeholder');
        const widgetCheck = document.getElementById('placement-widget');
        const popupCheck = document.getElementById('placement-popup');
        const insessionCheck = document.getElementById('placement-insession');

        if (placeholderCheck && !placeholderCheck.checked) placementPremium += this.cpiRates?.placementPremiums?.placeholder || 0;
        if (widgetCheck && !widgetCheck.checked) placementPremium += this.cpiRates?.placementPremiums?.widget || 0;
        if (popupCheck && !popupCheck.checked) placementPremium += this.cpiRates?.placementPremiums?.popup || 0;
        if (insessionCheck && !insessionCheck.checked) placementPremium += this.cpiRates?.placementPremiums?.insession || 0;

        const totalCpi = baseRate + audiencePremium + locationPremium + regionExclusionPremium + placementPremium;

        return {
            baseRate,
            audiencePremium,
            locationPremium,
            regionExclusionPremium,
            placementPremium,
            totalCpi
        };
    },

    // Format audiences for display
    formatAudiencesForDisplay(selectedAudiences) {
        const audienceMap = {
            'tutor': 'Tutors',
            'student': 'Students',
            'parent': 'Parents',
            'advertiser': 'Advertisers',
            'user': 'General Users'
        };

        if (selectedAudiences.length === 0 || selectedAudiences.length === 5) {
            return ['All Users'];
        }

        return selectedAudiences.map(aud => audienceMap[aud] || aud);
    },

    // Format location for display
    formatLocationForDisplay(location, selectedRegions) {
        if (location === 'global') {
            return { type: 'Global', regions: [] };
        } else if (location === 'national') {
            return { type: 'National (Ethiopia)', regions: [] };
        } else if (location === 'regional') {
            // Get region names from checkboxes
            const regionNames = [];
            const regionCheckboxes = document.querySelectorAll('.region-checkbox');
            regionCheckboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    const label = checkbox.closest('.campaign-checkbox-label')?.querySelector('.campaign-checkbox-text')?.textContent;
                    if (label) regionNames.push(label.trim());
                }
            });
            return { type: 'Regional', regions: regionNames };
        }
        return { type: 'Global', regions: [] };
    },

    // Format placements for display
    formatPlacementsForDisplay() {
        const placementMap = {
            'placeholder': 'Ad Placeholder',
            'widget': 'Widget',
            'popup': 'Pop-up',
            'insession': 'In-Session'
        };

        const placements = ['placeholder', 'widget', 'popup', 'insession'];
        const selected = placements.filter(pl => {
            const checkbox = document.getElementById(`placement-${pl}`);
            return checkbox && checkbox.checked;
        });

        if (selected.length === 0 || selected.length === 4) {
            return ['All Placements'];
        }

        return selected.map(pl => placementMap[pl] || pl);
    },

    // Execute campaign creation (called from confirmation modal)
    async executeCreate(confirmationData) {
        const submitBtn = document.getElementById('campaign-create-btn');
        const originalText = submitBtn?.innerHTML;

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
        }

        try {
            const token = localStorage.getItem('token');

            // Gather full form data
            const selectedObjectives = this.getSelectedObjectives();
            const selectedAudiences = this.getSelectedAudiences();
            const selectedRegions = this.getSelectedRegions();
            const location = document.getElementById('campaign-location-input')?.value || 'global';

            // Get selected placements
            const placements = ['placeholder', 'widget', 'popup', 'insession'];
            const selectedPlacements = placements.filter(pl => {
                const checkbox = document.getElementById(`placement-${pl}`);
                return checkbox && checkbox.checked;
            });

            const campaignData = {
                brand_id: this.currentBrand.id,
                name: document.getElementById('campaign-name-input').value.trim(),
                description: document.getElementById('campaign-description-input').value.trim(),
                objective: selectedObjectives.join(', '),
                target_audiences: selectedAudiences,
                target_placements: selectedPlacements,
                planned_budget: parseFloat(document.getElementById('campaign-budget-input').value) || 0,
                start_date: document.getElementById('campaign-start-date-input').value,
                target_location: location,
                target_regions: location === 'regional' ? selectedRegions : [],
                cpi_rate: confirmationData.total_cpi
            };

            // Use new 20% deposit endpoint
            const response = await fetch(`${API_BASE_URL}/api/advertiser/campaigns/create-with-deposit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(campaignData)
            });

            if (response.ok) {
                const result = await response.json();

                // Backend returns payment link - redirect to Chapa
                if (result.payment && result.payment.payment_url) {
                    alert('Campaign created! Redirecting to payment gateway for 20% deposit...');

                    // TODO: Replace placeholder with actual Chapa integration
                    console.log('Payment URL:', result.payment.payment_url);
                    console.log('Deposit amount:', result.payment.deposit_amount);

                    // For now, just show success and reload
                    this.hideCreateCampaignForm();
                    await this.loadBrandCampaigns(this.currentBrand.id);

                    if (typeof showNotification === 'function') {
                        showNotification(`Campaign created! Please complete ${result.payment.deposit_amount} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'} deposit payment.`, 'success');
                    }

                    // In production, redirect to payment gateway:
                    // window.location.href = result.payment.payment_url;
                } else {
                    throw new Error('Payment link not received from server');
                }
            } else {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to create campaign');
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            if (typeof showNotification === 'function') {
                showNotification(error.message || 'Failed to create campaign', 'error');
            } else {
                alert(error.message || 'Failed to create campaign');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    },

    // Calculate estimated impressions for budget input
    calculateEstimatedImpressions(budget) {
        const budgetValue = parseFloat(budget);
        const estimateEl = document.getElementById('budget-estimate');

        if (!estimateEl || !budgetValue || budgetValue <= 0) {
            if (estimateEl) {
                estimateEl.textContent = `Estimated: ~0 impressions at 0.00 ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}/impression`;
            }
            return;
        }

        // Calculate CPI based on current form selections
        const cpiBreakdown = this.calculateCpiBreakdown();
        const cpiRate = cpiBreakdown.totalCpi;
        const estimatedImpressions = Math.floor(budgetValue / cpiRate);
        const currency = this.cpiCurrency || 'ETB';

        estimateEl.textContent = `Estimated: ~${this.formatNumber(estimatedImpressions)} impressions at ${cpiRate.toFixed(3)} ${currency}/impression`;
    },

    // Update budget breakdown showing 20% advance and 80% remaining
    updateBudgetBreakdown(budget) {
        const budgetValue = parseFloat(budget);
        const breakdownDiv = document.getElementById('budget-breakdown');
        const advanceAmountEl = document.getElementById('advance-payment-amount');
        const remainingAmountEl = document.getElementById('remaining-payment-amount');

        if (!breakdownDiv || !advanceAmountEl || !remainingAmountEl) {
            return;
        }

        // Show/hide breakdown based on budget value
        if (!budgetValue || budgetValue <= 0) {
            breakdownDiv.style.display = 'none';
            return;
        }

        // Calculate 20% and 80%
        const advancePayment = budgetValue * 0.20;
        const remainingPayment = budgetValue * 0.80;

        // Update amounts with proper formatting
        advanceAmountEl.textContent = advancePayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        remainingAmountEl.textContent = remainingPayment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Show the breakdown
        breakdownDiv.style.display = 'block';
    },

    // Open create campaign for brand (legacy - now uses inline form)
    openCreateCampaignForBrand() {
        this.showCreateCampaignForm();
    },

    // Pause current campaign
    pauseCurrentCampaign() {
        if (!this.currentCampaign) return;

        const campaign = this.currentCampaign;

        const confirmed = confirm(`Pause campaign "${campaign.name}"?\n\nYou can resume it at any time.`);

        if (confirmed) {
            // TODO: Implement actual API call to pause campaign
            campaign.status = 'paused';

            // Update header status
            const headerStatus = document.getElementById('header-campaign-status');
            if (headerStatus) {
                headerStatus.innerHTML = `<i class="fas fa-circle" style="color: #f59e0b; font-size: 0.5rem;"></i> Paused`;
                headerStatus.className = 'header-campaign-status paused';
            }

            // Update card in list
            const card = document.querySelector(`.campaign-card-small[data-campaign-id="${campaign.id}"]`);
            if (card) {
                const statusBadge = card.querySelector('.campaign-card-small-status');
                if (statusBadge) {
                    statusBadge.className = 'campaign-card-small-status paused';
                    statusBadge.textContent = 'Paused';
                }
            }

            // Update footer buttons (hide Pause, show Resume)
            this.updateFooterButtons();

            // Log activity
            this.addCampaignActivity('pause', 'Campaign Paused', 'Campaign was paused and is no longer running');

            alert(`Campaign "${campaign.name}" has been paused.`);
        }
    },

    // Edit current campaign
    editCurrentCampaign() {
        if (!this.currentCampaign) return;

        // Show the edit form with campaign data (campaign details stay visible)
        this.showEditCampaignForm(this.currentCampaign);
    },

    // Launch current campaign
    launchCurrentCampaign() {
        if (!this.currentCampaign) return;

        // Check if campaign is already active
        if (this.currentCampaign.status === 'active') {
            alert('This campaign is already launched and active!');
            return;
        }

        // Confirm launch
        const confirmed = confirm(`Are you sure you want to launch "${this.currentCampaign.name}"?\n\nOnce launched, the campaign will start running and your budget will be spent.`);

        if (confirmed) {
            // TODO: Implement actual API call to launch campaign
            this.currentCampaign.status = 'active';

            // Update modal header status
            const headerStatus = document.getElementById('header-campaign-status');
            if (headerStatus) {
                headerStatus.innerHTML = `<i class="fas fa-circle" style="color: #10b981; font-size: 0.5rem;"></i> Active`;
                headerStatus.className = 'header-campaign-status active';
            }

            // Update card in list
            const card = document.querySelector(`.campaign-card-small[data-campaign-id="${this.currentCampaign.id}"]`);
            if (card) {
                const statusBadge = card.querySelector('.campaign-card-small-status');
                if (statusBadge) {
                    statusBadge.className = 'campaign-card-small-status active';
                    statusBadge.textContent = 'Active';
                }
            }

            // Update footer buttons for active campaign
            this.updateFooterButtons();

            // Log activity
            this.addCampaignActivity('launch', 'Campaign Launched', 'Campaign was launched and is now running');

            alert(`Campaign "${this.currentCampaign.name}" has been launched successfully!`);
        }
    },

    // Handle primary action button (Launch or Cancel based on status)
    handlePrimaryAction() {
        if (!this.currentCampaign) return;

        const status = this.currentCampaign.status;

        if (status === 'active' || status === 'running') {
            // Campaign is active - show cancellation modal
            this.openCancellationModal();
        } else if (status === 'paused') {
            // Resume paused campaign
            this.resumeCampaign();
        } else {
            // Launch draft/pending campaign
            this.launchCurrentCampaign();
        }
    },

    // Update footer buttons based on campaign status
    updateFooterButtons() {
        const campaign = this.currentCampaign;
        if (!campaign) return;

        const pauseBtn = document.getElementById('campaign-pause-btn');
        const primaryBtn = document.getElementById('campaign-primary-action-btn');
        const primaryIcon = document.getElementById('campaign-primary-action-icon');
        const primaryText = document.getElementById('campaign-primary-action-text');

        const status = campaign.status;

        if (status === 'active' || status === 'running') {
            // Show Pause button, change primary to Cancel
            if (pauseBtn) pauseBtn.style.display = 'inline-flex';
            if (primaryIcon) primaryIcon.className = 'fas fa-ban';
            if (primaryText) primaryText.textContent = 'Cancel';
            if (primaryBtn) primaryBtn.classList.add('danger');
        } else if (status === 'paused') {
            // Hide Pause button, change primary to Resume
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (primaryIcon) primaryIcon.className = 'fas fa-play';
            if (primaryText) primaryText.textContent = 'Resume';
            if (primaryBtn) primaryBtn.classList.remove('danger');
        } else if (status === 'cancelled') {
            // Cancelled - Hide Pause, show Launch (to relaunch)
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (primaryIcon) primaryIcon.className = 'fas fa-rocket';
            if (primaryText) primaryText.textContent = 'Launch';
            if (primaryBtn) primaryBtn.classList.remove('danger');
        } else {
            // Draft/pending - Hide Pause, show Launch
            if (pauseBtn) pauseBtn.style.display = 'none';
            if (primaryIcon) primaryIcon.className = 'fas fa-rocket';
            if (primaryText) primaryText.textContent = 'Launch';
            if (primaryBtn) primaryBtn.classList.remove('danger');
        }
    },

    // Resume paused campaign
    resumeCampaign() {
        if (!this.currentCampaign) return;

        const campaign = this.currentCampaign;

        const confirmed = confirm(`Resume campaign "${campaign.name}"?`);
        if (confirmed) {
            // TODO: Implement actual API call to resume campaign
            campaign.status = 'active';

            // Update header status
            const headerStatus = document.getElementById('header-campaign-status');
            if (headerStatus) {
                headerStatus.innerHTML = `<i class="fas fa-circle" style="color: #10b981; font-size: 0.5rem;"></i> Active`;
                headerStatus.className = 'header-campaign-status active';
            }

            // Update card in list
            const card = document.querySelector(`.campaign-card-small[data-campaign-id="${campaign.id}"]`);
            if (card) {
                const statusBadge = card.querySelector('.campaign-card-small-status');
                if (statusBadge) {
                    statusBadge.className = 'campaign-card-small-status active';
                    statusBadge.textContent = 'Active';
                }
            }

            this.updateFooterButtons();

            // Log activity
            this.addCampaignActivity('resume', 'Campaign Resumed', 'Campaign was resumed and is now running');

            alert(`Campaign "${campaign.name}" has been resumed!`);
        }
    },

    // Open Creative Hub coming soon modal
    openCreativeHubComingSoon() {
        // Use the common coming soon modal
        if (typeof openComingSoonModal === 'function') {
            openComingSoonModal('Creative Hub', 'Design tools and creative asset management are coming soon!');
        } else {
            alert('Creative Hub - Coming Soon!\n\nDesign tools and creative asset management features are under development.');
        }
    },

    // ============================================
    // CANCELLATION MODAL
    // ============================================

    // Open cancellation modal
    openCancellationModal() {
        const overlay = document.getElementById('cancellation-modal-overlay');
        if (overlay) {
            overlay.classList.add('active');
            this.populateCancellationModal();
        }
    },

    // Close cancellation modal
    closeCancellationModal() {
        const overlay = document.getElementById('cancellation-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    },

    // Populate cancellation modal with campaign data
    populateCancellationModal() {
        const campaign = this.currentCampaign;
        if (!campaign) return;

        // Get finance data
        const totalBudget = campaign.total_budget || campaign.budget || 0;
        const amountUsed = campaign.amount_used || 0;
        const remaining = totalBudget - amountUsed;
        const feePercentage = 5; // Default 5%, could be based on advertiser tier
        const fee = remaining * (feePercentage / 100);
        const refund = remaining - fee;

        // Update modal elements
        this.setElementText('cancel-remaining-balance', this.formatCurrency(remaining));
        this.setElementText('cancel-fee-badge', `${feePercentage}%`);
        this.setElementText('cancel-fee-reason', 'New advertiser');
        this.setElementText('cancel-fee-amount', this.formatCurrency(fee));
        this.setElementText('cancel-refund-amount', this.formatCurrency(refund));

        // Check grace period (within 24 hours of launch)
        const gracePeriod = document.getElementById('cancel-grace-period-notice');
        if (gracePeriod) {
            // TODO: Check actual launch time
            gracePeriod.style.display = 'none';
        }
    },

    // Confirm campaign cancellation
    confirmCancelCampaign() {
        const campaign = this.currentCampaign;
        if (!campaign) return;

        const totalBudget = campaign.total_budget || campaign.budget || 0;
        const amountUsed = campaign.amount_used || 0;
        const remaining = totalBudget - amountUsed;
        const feePercentage = 5;
        const refund = remaining * (1 - feePercentage / 100);

        const confirmed = confirm(
            `Are you sure you want to cancel "${campaign.name}"?\n\n` +
            `You will receive ${this.formatCurrency(refund)} as a refund.\n\n` +
            `This action cannot be undone.`
        );

        if (confirmed) {
            // TODO: Implement actual API call to cancel campaign
            campaign.status = 'cancelled';
            this.closeCancellationModal();

            // Update UI
            const headerStatus = document.getElementById('header-campaign-status');
            if (headerStatus) {
                headerStatus.innerHTML = `<i class="fas fa-circle" style="color: #ef4444; font-size: 0.5rem;"></i> Cancelled`;
                headerStatus.className = 'header-campaign-status cancelled';
            }

            // Update card in list
            const card = document.querySelector(`.campaign-card-small[data-campaign-id="${campaign.id}"]`);
            if (card) {
                const statusBadge = card.querySelector('.campaign-card-small-status');
                if (statusBadge) {
                    statusBadge.className = 'campaign-card-small-status cancelled';
                    statusBadge.textContent = 'Cancelled';
                }
            }

            // Update footer buttons (Cancel → Launch, hide Pause)
            this.updateFooterButtons();

            // Log activity
            this.addCampaignActivity('cancel', 'Campaign Cancelled', `Campaign was cancelled. Refund of ${this.formatCurrency(refund)} will be processed.`);

            alert(`Campaign "${campaign.name}" has been cancelled.\n\nRefund of ${this.formatCurrency(refund)} will be processed.`);
        }
    },

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-ET', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount) + ` ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}`;
    },

    // ============================================
    // ACTIVITY LOGGING
    // ============================================

    // Add activity to the campaign's activity log
    addCampaignActivity(type, title, description) {
        if (!this.currentCampaign) return;

        // Initialize activities array if not exists
        if (!this.currentCampaign.activities) {
            this.currentCampaign.activities = [];
        }

        // Activity type icons and colors
        const activityConfig = {
            launch: { icon: 'fas fa-rocket', color: '#10b981' },
            pause: { icon: 'fas fa-pause', color: '#f59e0b' },
            resume: { icon: 'fas fa-play', color: '#10b981' },
            cancel: { icon: 'fas fa-ban', color: '#ef4444' },
            edit: { icon: 'fas fa-edit', color: '#8B5CF6' },
            upload_image: { icon: 'fas fa-image', color: '#3b82f6' },
            upload_video: { icon: 'fas fa-video', color: '#ec4899' },
            created: { icon: 'fas fa-plus-circle', color: '#8B5CF6' }
        };

        const config = activityConfig[type] || { icon: 'fas fa-circle', color: '#6b7280' };

        // Create activity object
        const activity = {
            id: Date.now(),
            type: type,
            title: title,
            description: description,
            icon: config.icon,
            color: config.color,
            timestamp: new Date().toISOString()
        };

        // Add to beginning of array (newest first)
        this.currentCampaign.activities.unshift(activity);

        // Update the activity timeline UI
        this.renderActivityTimeline();
    },

    // Render the activity timeline
    renderActivityTimeline() {
        const timeline = document.getElementById('campaign-activity-timeline');
        const emptyState = document.getElementById('activity-empty-state');

        if (!timeline) return;

        const activities = this.currentCampaign?.activities || [];

        if (activities.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Build timeline HTML
        let html = '';
        activities.forEach(activity => {
            const timeAgo = this.getTimeAgo(activity.timestamp);
            html += `
                <div class="timeline-item">
                    <div class="timeline-icon" style="background: ${activity.color};">
                        <i class="${activity.icon}"></i>
                    </div>
                    <div class="timeline-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                        <span class="timeline-time">${timeAgo}</span>
                    </div>
                </div>
            `;
        });

        // Keep empty state element but hide it
        timeline.innerHTML = html + '<div class="activity-empty-state" id="activity-empty-state" style="display: none;"><i class="fas fa-history"></i><p>No activity recorded yet</p></div>';
    },

    // Get time ago string
    getTimeAgo(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
        return date.toLocaleDateString();
    },

    // ============================================
    // SIDEBAR TOGGLE & CAMPAIGN SEARCH
    // ============================================

    // Toggle campaign sidebar visibility
    toggleCampaignSidebar() {
        const sidebar = document.getElementById('campaign-list-section');
        const toggleBtn = document.getElementById('campaign-sidebar-toggle');
        const modalOverlay = document.getElementById('campaign-modal-overlay');
        const isMobile = window.innerWidth <= 768;

        if (sidebar) {
            if (isMobile) {
                // Mobile: Toggle .active class (overlay behavior)
                sidebar.classList.toggle('active');

                // Toggle overlay for mobile
                if (modalOverlay) {
                    modalOverlay.classList.toggle('sidebar-active');
                }
            } else {
                // Desktop: Toggle .collapsed class (width animation)
                sidebar.classList.toggle('collapsed');
            }

            // Update toggle button icon
            if (toggleBtn) {
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    const isVisible = isMobile
                        ? sidebar.classList.contains('active')
                        : !sidebar.classList.contains('collapsed');

                    if (isVisible) {
                        icon.className = 'fas fa-times';
                        toggleBtn.title = 'Hide sidebar';
                    } else {
                        icon.className = 'fas fa-bars';
                        toggleBtn.title = 'Show sidebar';
                    }
                }
            }
        }
    },

    // Filter campaigns by name (live search)
    filterCampaigns(query) {
        const searchQuery = query.toLowerCase().trim();
        const clearBtn = document.getElementById('campaign-search-clear');
        const container = document.getElementById('campaign-cards-container');

        // Show/hide clear button
        if (clearBtn) {
            clearBtn.style.display = searchQuery ? 'flex' : 'none';
        }

        if (!container) return;

        // If empty query, render all campaigns
        if (!searchQuery) {
            this.renderCampaignList();
            return;
        }

        // Filter campaigns by name
        const filteredCampaigns = this.campaigns.filter(campaign =>
            campaign.name.toLowerCase().includes(searchQuery)
        );

        if (filteredCampaigns.length === 0) {
            container.innerHTML = `
                <div class="campaign-search-empty">
                    <i class="fas fa-search"></i>
                    <p>No campaigns match "${query}"</p>
                </div>
            `;
        } else {
            container.innerHTML = filteredCampaigns.map(campaign =>
                this.createCampaignCardSmall(campaign)
            ).join('');
        }

        // Update count
        this.setElementText('campaign-list-count', filteredCampaigns.length);
    },

    // Clear campaign search
    clearCampaignSearch() {
        const input = document.getElementById('campaign-search-input');
        const clearBtn = document.getElementById('campaign-search-clear');

        if (input) {
            input.value = '';
            input.focus();
        }

        if (clearBtn) {
            clearBtn.style.display = 'none';
        }

        // Re-render all campaigns
        this.renderCampaignList();
    },

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    setElementText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    },

    capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    // ============================================
    // MEDIA UPLOAD FUNCTIONS (Images & Videos)
    // ============================================

    // Trigger image file input
    triggerImageUpload() {
        const input = document.getElementById('campaign-image-upload');
        if (input) input.click();
    },

    // Trigger video file input
    triggerVideoUpload() {
        const input = document.getElementById('campaign-video-upload');
        if (input) input.click();
    },

    // Handle image upload
    handleImageUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const gallery = document.getElementById('campaign-images-gallery');
        if (!gallery) return;

        // Remove empty state if present
        const emptyState = gallery.querySelector('.media-empty-state');
        if (emptyState) emptyState.remove();

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert('Please select only image files.');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                alert(`Image "${file.name}" is too large. Max size is 5MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'media-item';
                mediaItem.innerHTML = `
                    <img src="${e.target.result}" alt="${file.name}">
                    <div class="media-item-overlay">
                        <button class="media-item-btn" onclick="BrandsManager.previewMedia('${e.target.result}', 'image')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="media-item-btn delete" onclick="BrandsManager.removeMediaItem(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                gallery.appendChild(mediaItem);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        event.target.value = '';
    },

    // Handle video upload
    handleVideoUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const gallery = document.getElementById('campaign-videos-gallery');
        if (!gallery) return;

        // Remove empty state if present
        const emptyState = gallery.querySelector('.media-empty-state');
        if (emptyState) emptyState.remove();

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('video/')) {
                alert('Please select only video files.');
                return;
            }

            if (file.size > 100 * 1024 * 1024) {
                alert(`Video "${file.name}" is too large. Max size is 100MB.`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const mediaItem = document.createElement('div');
                mediaItem.className = 'media-item';
                mediaItem.innerHTML = `
                    <video src="${e.target.result}" muted></video>
                    <div class="media-item-overlay">
                        <button class="media-item-btn" onclick="BrandsManager.previewMedia('${e.target.result}', 'video')">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="media-item-btn delete" onclick="BrandsManager.removeMediaItem(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                gallery.appendChild(mediaItem);
            };
            reader.readAsDataURL(file);
        });

        // Reset input
        event.target.value = '';
    },

    // Remove media item
    removeMediaItem(btn) {
        const mediaItem = btn.closest('.media-item');
        if (mediaItem) {
            mediaItem.remove();

            // Check if gallery is empty and show empty state
            const gallery = mediaItem.closest('.media-gallery');
            if (gallery && gallery.children.length === 0) {
                const isImages = gallery.id === 'campaign-images-gallery';
                gallery.innerHTML = `
                    <div class="media-empty-state">
                        <i class="fas fa-${isImages ? 'images' : 'video'}"></i>
                        <p>No ${isImages ? 'images' : 'videos'} uploaded yet</p>
                    </div>
                `;
            }
        }
    },

    // Preview media in modal (placeholder)
    previewMedia(src, type) {
        // TODO: Implement full-screen preview modal
        if (type === 'video') {
            window.open(src, '_blank');
        } else {
            window.open(src, '_blank');
        }
    },

    // Load cancellation calculator data for current campaign
    async loadCancellationCalculator() {
        if (!this.currentCampaign) return;

        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/campaign/cancellation-calculator/${this.currentCampaign.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateCancellationCalculatorUI(data);
            }
        } catch (error) {
            console.error('Error loading cancellation calculator:', error);
        }
    },

    // Update cancellation calculator UI with data
    updateCancellationCalculatorUI(data) {
        if (!data.success) return;

        const { finances, cancellation, breakdown } = data;

        // Update grace period notice
        const gracePeriodNotice = document.getElementById('grace-period-notice');
        const graceHoursEl = document.getElementById('grace-hours-remaining');

        if (cancellation.within_grace_period && gracePeriodNotice) {
            gracePeriodNotice.style.display = 'block';
            if (graceHoursEl) {
                graceHoursEl.textContent = cancellation.grace_period_remaining_hours.toFixed(1);
            }
        } else if (gracePeriodNotice) {
            gracePeriodNotice.style.display = 'none';
        }

        // Update fee tier display
        const feeBadge = document.getElementById('finance-fee-badge');
        const feeReason = document.getElementById('finance-fee-reason');
        const feeDisplay = document.getElementById('finance-fee-display');

        if (feeBadge) {
            const feePercent = cancellation.final_fee_percent || cancellation.base_fee_percent;
            feeBadge.textContent = `${feePercent}%`;

            // Color code based on tier
            if (feePercent === 0) {
                feeBadge.style.background = 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)';
            } else if (feePercent === 1) {
                feeBadge.style.background = 'linear-gradient(135deg, #66bb6a 0%, #4caf50 100%)';
            } else if (feePercent === 3) {
                feeBadge.style.background = 'linear-gradient(135deg, #ffa726 0%, #fb8c00 100%)';
            } else {
                feeBadge.style.background = 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)';
            }
        }

        if (feeReason) {
            feeReason.textContent = cancellation.fee_tier_reason || 'New advertiser';
        }

        if (feeDisplay) {
            const feePercent = cancellation.final_fee_percent || cancellation.base_fee_percent;
            if (cancellation.within_grace_period) {
                feeDisplay.innerHTML = `<strong style="color: #4caf50;">0% (Grace Period Active!)</strong>`;
            } else {
                feeDisplay.textContent = `${feePercent}% of remaining balance`;
            }
        }

        // Update cancellation calculation
        const calcEl = document.getElementById('finance-cancellation-calculation');
        if (calcEl) {
            const feePercent = cancellation.final_fee_percent || cancellation.base_fee_percent;
            calcEl.textContent = `Remaining: ${finances.remaining_balance.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'} × ${feePercent}% = ${cancellation.fee_amount.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'} fee`;
        }

        // Update refund amount
        const refundEl = document.getElementById('finance-refund-amount');
        if (refundEl) {
            refundEl.textContent = `${cancellation.refund_amount.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}`;
        }

        // Update used amount in note
        const usedNoteEl = document.getElementById('finance-used-in-note');
        if (usedNoteEl) {
            usedNoteEl.textContent = `${finances.amount_used.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}`;
        }
    },

    // Pause campaign (no fee)
    async pauseCampaign() {
        if (!this.currentCampaign) {
            alert('No campaign selected');
            return;
        }

        // Confirm pause
        const reason = prompt('Why are you pausing this campaign? (Optional)');
        if (reason === null) return; // User cancelled

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Not authenticated');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/campaign/pause/${this.currentCampaign.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert(`Campaign paused successfully!\n\nNo fee charged. Your budget (${data.finances.remaining_balance.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}) remains locked.\n\nYou can resume this campaign anytime or cancel to get a refund (minus cancellation fee).`);

                // Refresh campaign list
                this.loadBrands();
                this.hideCampaignModal();
            } else {
                alert(data.detail || 'Failed to pause campaign');
            }
        } catch (error) {
            console.error('Error pausing campaign:', error);
            alert('Error pausing campaign. Please try again.');
        }
    },

    // Cancel campaign (with tiered fee)
    async cancelCampaign() {
        if (!this.currentCampaign) {
            alert('No campaign selected');
            return;
        }

        // Get cancellation preview first
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Not authenticated');
                return;
            }

            const previewResponse = await fetch(`${API_BASE_URL}/api/campaign/cancellation-calculator/${this.currentCampaign.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const previewData = await previewResponse.json();

            if (!previewResponse.ok || !previewData.success) {
                alert('Failed to calculate cancellation fee');
                return;
            }

            const { finances, cancellation, breakdown } = previewData;
            const feePercent = cancellation.final_fee_percent || cancellation.base_fee_percent;

            // Confirmation message
            let confirmMsg = `Are you sure you want to CANCEL this campaign?\n\n`;
            confirmMsg += `Campaign Budget: ${breakdown.total_budget.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n`;
            confirmMsg += `Amount Used (non-refundable): ${breakdown.non_refundable_used.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n`;
            confirmMsg += `Remaining Balance: ${breakdown.remaining.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n\n`;

            if (cancellation.within_grace_period) {
                confirmMsg += `🎉 GRACE PERIOD ACTIVE!\n`;
                confirmMsg += `Cancellation Fee: 0.00 ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'} (0%)\n`;
                confirmMsg += `You will receive: ${breakdown.you_will_receive.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n\n`;
            } else {
                confirmMsg += `Cancellation Fee (${feePercent}%): ${breakdown.cancellation_fee.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n`;
                confirmMsg += `You will receive: ${breakdown.you_will_receive.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n\n`;
                confirmMsg += `💡 TIP: Use "Pause" instead to avoid fees!\n\n`;
            }

            confirmMsg += `This action cannot be undone.`;

            if (!confirm(confirmMsg)) return;

            // Ask for reason
            const reason = prompt('Reason for cancellation (optional):');
            if (reason === null) return; // User cancelled

            // Execute cancellation
            const cancelResponse = await fetch(`${API_BASE_URL}/api/campaign/cancel-enhanced/${this.currentCampaign.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const cancelData = await cancelResponse.json();

            if (cancelResponse.ok && cancelData.success) {
                const summary = cancelData.cancellation_summary;
                let successMsg = `Campaign cancelled successfully!\n\n`;
                successMsg += `Refund: ${summary.refund_amount.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n`;
                if (summary.cancellation_fee_amount > 0) {
                    successMsg += `Cancellation Fee (${summary.final_fee_percent}%): ${summary.cancellation_fee_amount.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}\n`;
                }
                successMsg += `\nYour new balance: ${cancelData.advertiser_balance.balance_after.toFixed(2)} ${window.CurrencyManager ? CurrencyManager.getCurrency() : 'ETB'}`;

                alert(successMsg);

                // Refresh campaign list
                this.loadBrands();
                this.hideCampaignModal();
            } else {
                alert(cancelData.detail || 'Failed to cancel campaign');
            }
        } catch (error) {
            console.error('Error cancelling campaign:', error);
            alert('Error cancelling campaign. Please try again.');
        }
    },

    // ============================================
    // MEDIA UPLOAD MODAL FUNCTIONS
    // ============================================

    // State for media upload
    mediaUploadState: {
        type: 'image', // 'image' or 'video'
        files: [],
        selectedAudiences: [],
        selectedLocations: [],
        selectedPlacements: []
    },

    // Open media upload modal
    openMediaUploadModal(type = 'image') {
        this.mediaUploadState.type = type;
        this.mediaUploadState.files = [];

        const overlay = document.getElementById('media-upload-modal-overlay');

        // Check if modal exists in DOM
        if (!overlay) {
            console.error('Media upload modal not found in DOM. Make sure campaign-modal.html is loaded.');
            alert('Upload modal not available. Please try again.');
            return;
        }

        const icon = document.getElementById('media-upload-modal-icon');
        const heading = document.getElementById('media-upload-modal-heading');
        const subheading = document.getElementById('media-upload-modal-subheading');
        const dropzoneHint = document.getElementById('dropzone-hint');
        const dropzoneIcon = document.getElementById('dropzone-icon');
        const fileInput = document.getElementById('media-upload-file-input');

        // Update modal content based on type (with null checks)
        if (type === 'video') {
            if (icon) icon.innerHTML = '<i class="fas fa-video"></i>';
            if (heading) heading.textContent = 'Upload Campaign Videos';
            if (subheading) subheading.textContent = 'Select targeting options and upload your video ads';
            if (dropzoneHint) dropzoneHint.innerHTML = '<i class="fas fa-info-circle"></i> Supports: MP4, WebM, MOV (max 100MB each)';
            if (dropzoneIcon) dropzoneIcon.innerHTML = '<i class="fas fa-film"></i>';
            if (fileInput) fileInput.setAttribute('accept', 'video/*');
        } else {
            if (icon) icon.innerHTML = '<i class="fas fa-images"></i>';
            if (heading) heading.textContent = 'Upload Campaign Images';
            if (subheading) subheading.textContent = 'Select targeting options and upload your media';
            if (dropzoneHint) dropzoneHint.innerHTML = '<i class="fas fa-info-circle"></i> Supports: JPG, PNG, GIF, WebP (max 10MB each)';
            if (dropzoneIcon) dropzoneIcon.innerHTML = '<i class="fas fa-cloud-upload-alt"></i>';
            if (fileInput) fileInput.setAttribute('accept', 'image/*');
        }

        // Populate targeting options based on current campaign
        this.populateUploadTargetingOptions();

        // Reset UI
        this.clearMediaUploadPreviews();
        this.updateUploadSummary();

        // Show modal
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    // Close media upload modal
    closeMediaUploadModal() {
        const overlay = document.getElementById('media-upload-modal-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        this.mediaUploadState.files = [];
    },

    // Populate targeting options in upload modal based on campaign settings
    populateUploadTargetingOptions() {
        const campaign = this.currentCampaign;
        if (!campaign) return;

        // Only placement selection is needed - audience/location are set at campaign level
        const placements = campaign.target_placements || [];

        console.log('📤 Upload modal placements from campaign:', placements);

        // Placement options
        const placementContainer = document.getElementById('upload-placement-options');
        const placementAllCheckbox = document.getElementById('upload-placement-all')?.closest('.targeting-checkbox-item.master');
        if (placementContainer) {
            const placementConfig = {
                placeholder: { icon: 'fa-rectangle-ad', label: 'Ad Placeholder', hint: 'Banner ads (1200x628)' },
                widget: { icon: 'fa-window-maximize', label: 'Ad Widget', hint: 'Sidebar widget (300x250)' },
                popup: { icon: 'fa-window-restore', label: 'WB Pop-up', hint: 'Whiteboard popup (600x400)' },
                insession: { icon: 'fa-chalkboard', label: 'WB In-Session', hint: 'During sessions (800x600)' }
            };

            placementContainer.innerHTML = placements.map(pl => `
                <div class="targeting-checkbox-item">
                    <label class="targeting-checkbox-label">
                        <input type="checkbox" id="upload-placement-${pl}" checked onchange="BrandsManager.updateUploadPlacementSelection()">
                        <span class="targeting-checkbox-custom"></span>
                        <span class="targeting-checkbox-text">
                            <i class="fas ${placementConfig[pl]?.icon || 'fa-ad'}"></i>
                            ${placementConfig[pl]?.label || pl}
                            <small class="placement-hint">${placementConfig[pl]?.hint || ''}</small>
                        </span>
                    </label>
                </div>
            `).join('');

            // Hide "All Placements" checkbox if only one placement
            if (placementAllCheckbox) {
                placementAllCheckbox.style.display = placements.length > 1 ? '' : 'none';
            }
        }

        // Also populate media filter dropdowns
        this.populateMediaFilters();
    },

    // Toggle all upload placements
    toggleAllUploadPlacements(checked) {
        document.querySelectorAll('#upload-placement-options input[type="checkbox"]').forEach(cb => {
            cb.checked = checked;
        });
        this.updateUploadSummary();
    },

    // Update placement selection state
    updateUploadPlacementSelection() {
        const checkboxes = document.querySelectorAll('#upload-placement-options input[type="checkbox"]');
        const allChecked = Array.from(checkboxes).every(cb => cb.checked);
        const masterCheckbox = document.getElementById('upload-placement-all');
        if (masterCheckbox) masterCheckbox.checked = allChecked;
        this.updateUploadSummary();
    },

    // Handle drag over
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        const dropzone = document.getElementById('media-upload-dropzone');
        if (dropzone) dropzone.classList.add('drag-over');
    },

    // Handle drag leave
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        const dropzone = document.getElementById('media-upload-dropzone');
        if (dropzone) dropzone.classList.remove('drag-over');
    },

    // Handle drop
    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        const dropzone = document.getElementById('media-upload-dropzone');
        if (dropzone) dropzone.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        this.processUploadFiles(files);
    },

    // Trigger file input
    triggerMediaUploadInput() {
        const input = document.getElementById('media-upload-file-input');
        if (input) input.click();
    },

    // Handle file selection
    handleMediaFileSelect(event) {
        const files = event.target.files;
        this.processUploadFiles(files);
    },

    // Process upload files
    processUploadFiles(files) {
        const type = this.mediaUploadState.type;
        const maxSize = type === 'video' ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for images
        const validTypes = type === 'video'
            ? ['video/mp4', 'video/webm', 'video/quicktime']
            : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

        Array.from(files).forEach(file => {
            // Validate file type
            if (!validTypes.some(t => file.type.startsWith(t.split('/')[0]))) {
                console.warn(`Invalid file type: ${file.type}`);
                return;
            }

            // Validate file size
            if (file.size > maxSize) {
                console.warn(`File too large: ${file.name}`);
                alert(`File "${file.name}" is too large. Maximum size is ${type === 'video' ? '100MB' : '10MB'}.`);
                return;
            }

            // Add to state
            this.mediaUploadState.files.push(file);
        });

        this.renderUploadPreviews();
        this.updateUploadSummary();
    },

    // Render upload previews
    renderUploadPreviews() {
        const previewArea = document.getElementById('media-upload-preview-area');
        const previewGrid = document.getElementById('media-upload-preview-grid');
        const previewCount = document.getElementById('preview-count');

        if (!previewArea || !previewGrid) return;

        const files = this.mediaUploadState.files;

        if (files.length === 0) {
            previewArea.style.display = 'none';
            return;
        }

        previewArea.style.display = 'block';
        previewCount.textContent = files.length;

        previewGrid.innerHTML = files.map((file, index) => {
            const isVideo = file.type.startsWith('video/');
            const url = URL.createObjectURL(file);
            const sizeFormatted = this.formatFileSize(file.size);

            return `
                <div class="preview-item" data-index="${index}">
                    ${isVideo
                        ? `<video src="${url}" muted></video>`
                        : `<img src="${url}" alt="${file.name}">`
                    }
                    <div class="preview-item-overlay">
                        <button class="preview-remove-btn" onclick="BrandsManager.removeUploadFile(${index})">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="preview-item-info">
                        <div class="preview-item-name">${file.name}</div>
                        <div class="preview-item-size">${sizeFormatted}</div>
                    </div>
                </div>
            `;
        }).join('');

        // Update submit button state
        const submitBtn = document.getElementById('media-upload-submit-btn');
        if (submitBtn) {
            submitBtn.disabled = files.length === 0;
        }
    },

    // Format file size
    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    },

    // Remove upload file
    removeUploadFile(index) {
        this.mediaUploadState.files.splice(index, 1);
        this.renderUploadPreviews();
        this.updateUploadSummary();
    },

    // Clear all upload previews
    clearMediaUploadPreviews() {
        this.mediaUploadState.files = [];
        this.renderUploadPreviews();
        this.updateUploadSummary();
    },

    // Update upload summary
    updateUploadSummary() {
        // Get total and selected counts for each category
        // Only placement summary needed - audience/location are set at campaign level
        const placementTotal = document.querySelectorAll('#upload-placement-options input[type="checkbox"]').length;
        const placementChecked = document.querySelectorAll('#upload-placement-options input[type="checkbox"]:checked');
        const placements = Array.from(placementChecked).map(cb => {
            // Get label text without the hint
            const labelSpan = cb.closest('.targeting-checkbox-label').querySelector('.targeting-checkbox-text');
            if (!labelSpan) return '';
            // Clone to avoid modifying the original, then remove the hint
            const clone = labelSpan.cloneNode(true);
            const hint = clone.querySelector('.placement-hint');
            if (hint) hint.remove();
            return clone.textContent.trim();
        });

        // Update summary display
        const summaryPlacement = document.getElementById('summary-placement');
        const summaryFiles = document.getElementById('summary-files');

        if (summaryPlacement) {
            const allSelected = placementChecked.length === placementTotal && placementTotal > 0;
            if (allSelected && placementTotal > 1) {
                summaryPlacement.textContent = 'All Placements';
            } else {
                summaryPlacement.textContent = placements.join(', ') || 'None selected';
            }
        }

        if (summaryFiles) {
            const fileCount = this.mediaUploadState.files.length;
            summaryFiles.textContent = fileCount === 0 ? '0 files ready' : `${fileCount} file${fileCount > 1 ? 's' : ''} ready`;
        }
    },

    // Submit media upload to Backblaze B2
    async submitMediaUpload() {
        const files = this.mediaUploadState.files;
        if (files.length === 0) {
            alert('Please select at least one file to upload.');
            return;
        }

        const campaign = this.currentCampaign;
        if (!campaign) {
            alert('No campaign selected.');
            return;
        }

        // Get selected placements (audience/location come from campaign)
        const placementCheckboxes = document.querySelectorAll('#upload-placement-options input[type="checkbox"]:checked');
        const selectedPlacements = Array.from(placementCheckboxes).map(cb => cb.id.replace('upload-placement-', ''));

        if (selectedPlacements.length === 0) {
            alert('Please select at least one ad placement.');
            return;
        }

        const submitBtn = document.getElementById('media-upload-submit-btn');
        const uploadBtnText = document.getElementById('upload-btn-text');
        const progressContainer = document.getElementById('upload-progress-container');
        const progressBar = document.getElementById('upload-progress-bar');
        const progressText = document.getElementById('upload-progress-text');

        try {
            // Show loading state
            if (submitBtn) submitBtn.disabled = true;
            if (uploadBtnText) uploadBtnText.textContent = 'Uploading...';
            if (progressContainer) progressContainer.style.display = 'block';

            const uploadedMedia = [];
            let successCount = 0;
            let failCount = 0;

            // Upload each file to Backblaze via API
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = Math.round(((i) / files.length) * 100);

                if (progressBar) progressBar.style.width = `${progress}%`;
                if (progressText) progressText.textContent = `Uploading ${i + 1} of ${files.length}...`;

                try {
                    // Get brand and campaign names for folder organization
                    const brandName = this.currentBrand?.name || 'Unknown_Brand';
                    const campaignName = campaign.name || 'Unknown_Campaign';
                    // Combine selected placements for folder name (e.g., "Feed_Stories_Reels")
                    const adPlacement = selectedPlacements.join('_') || 'General';

                    console.log(`📤 Uploading file ${i + 1}/${files.length}: ${file.name} to ${brandName}/${campaignName}/${adPlacement}/`);

                    // Upload to Backblaze via API with folder organization
                    const response = await AdvertiserProfileAPI.uploadCampaignMedia(file, brandName, campaignName, adPlacement);

                    if (response && response.url) {
                        console.log(`✅ Upload successful: ${file.name}`, response);

                        // Store uploaded media info with campaign context
                        const mediaItem = {
                            id: Date.now() + i,
                            url: response.url,
                            file_name: response.file_name || file.name,
                            file_type: response.file_type || this.mediaUploadState.type,
                            placements: selectedPlacements,
                            campaign_id: campaign.id,
                            uploaded_at: new Date().toISOString()
                        };

                        uploadedMedia.push(mediaItem);
                        successCount++;

                        // Add to campaign's media array (for UI display)
                        if (!campaign.media) campaign.media = [];
                        campaign.media.push(mediaItem);
                    } else {
                        throw new Error('No URL returned from upload');
                    }
                } catch (uploadError) {
                    console.error(`❌ Failed to upload ${file.name}:`, uploadError);
                    failCount++;
                }
            }

            // Complete progress
            if (progressBar) progressBar.style.width = '100%';
            if (progressText) progressText.textContent = 'Upload complete!';

            // Success handling
            if (successCount > 0) {
                const mediaType = this.mediaUploadState.type;
                const activityType = mediaType === 'image' ? 'upload_image' : 'upload_video';
                const mediaLabel = mediaType === 'image' ? 'image' : 'video';
                const placementLabels = selectedPlacements.map(p => {
                    const labels = { placeholder: 'Placeholder', widget: 'Widget', popup: 'Pop-up', insession: 'In-Session' };
                    return labels[p] || p;
                }).join(', ');

                // Log activity
                this.addCampaignActivity(
                    activityType,
                    `${successCount} ${mediaLabel}${successCount > 1 ? 's' : ''} Uploaded`,
                    `Uploaded to ${placementLabels} placement${selectedPlacements.length > 1 ? 's' : ''}`
                );

                // Show result message
                let message = `Successfully uploaded ${successCount} file(s) to Backblaze!`;
                if (failCount > 0) {
                    message += `\n${failCount} file(s) failed to upload.`;
                }

                setTimeout(() => {
                    alert(message);
                    this.closeMediaUploadModal();

                    // Add uploaded media to the gallery
                    this.addUploadedMediaToGallery(uploadedMedia, mediaType);
                }, 300);
            } else {
                alert('All uploads failed. Please try again.');
            }

        } catch (error) {
            console.error('Error uploading media:', error);
            alert(`Error uploading files: ${error.message || 'Please try again.'}`);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
            if (uploadBtnText) uploadBtnText.textContent = 'Upload';
            if (progressContainer) {
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    if (progressBar) progressBar.style.width = '0%';
                }, 1000);
            }
        }
    },

    // Add uploaded media to the gallery
    addUploadedMediaToGallery(uploadedMedia, mediaType) {
        const galleryId = mediaType === 'image' ? 'campaign-images-gallery' : 'campaign-videos-gallery';
        const gallery = document.getElementById(galleryId);

        if (!gallery) {
            console.warn('Gallery not found:', galleryId);
            return;
        }

        // Remove empty state if present
        const emptyState = gallery.querySelector('.media-empty-state');
        if (emptyState) emptyState.remove();

        // Add each uploaded media item to the gallery
        uploadedMedia.forEach(media => {
            const mediaItem = document.createElement('div');
            mediaItem.className = 'media-item';
            mediaItem.dataset.placements = JSON.stringify(media.placements || []);

            if (mediaType === 'image') {
                mediaItem.innerHTML = `
                    <img src="${media.url}" alt="${media.file_name}">
                    <div class="media-item-overlay">
                        <button class="media-item-btn" onclick="BrandsManager.previewMedia('${media.url}', 'image')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="media-item-btn delete" onclick="BrandsManager.removeMediaItem(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            } else {
                mediaItem.innerHTML = `
                    <video src="${media.url}" muted></video>
                    <div class="media-item-overlay">
                        <button class="media-item-btn" onclick="BrandsManager.previewMedia('${media.url}', 'video')">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="media-item-btn delete" onclick="BrandsManager.removeMediaItem(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
            }

            gallery.appendChild(mediaItem);
        });

        console.log(`✅ Added ${uploadedMedia.length} ${mediaType}(s) to gallery`);
    },

    // ============================================
    // MEDIA FILTER FUNCTIONS (Images & Videos Tabs)
    // ============================================

    // Populate media filter buttons (placement only - audience/location set at campaign level)
    populateMediaFilters() {
        const campaign = this.currentCampaign;
        if (!campaign) return;

        // Only placement filter is needed
        const placements = campaign.target_placements || [];

        console.log('🔍 Media filter placements from campaign:', placements);

        const placementConfig = {
            placeholder: { label: 'Placeholder', icon: 'fas fa-square' },
            widget: { label: 'Widget', icon: 'fas fa-puzzle-piece' },
            popup: { label: 'Pop-up', icon: 'fas fa-window-restore' },
            insession: { label: 'In-Session', icon: 'fas fa-chalkboard' }
        };

        // Initialize selected filters
        this.selectedMediaFilters = this.selectedMediaFilters || {};

        // Populate for both Images and Videos tabs
        ['images', 'videos'].forEach(tabType => {
            const filtersSection = document.getElementById(`${tabType}-filters-section`);
            const buttonsContainer = document.getElementById(`${tabType}-placement-buttons`);

            if (!buttonsContainer || !filtersSection) return;

            // Only show filters section if there are placements
            if (placements.length === 0) {
                filtersSection.style.display = 'none';
                return;
            }

            filtersSection.style.display = 'block';

            // Build button HTML - "All" button first if multiple placements
            let buttonsHTML = '';

            if (placements.length > 1) {
                buttonsHTML += `
                    <button class="placement-filter-btn active" data-placement="all" onclick="BrandsManager.selectPlacementFilter('${tabType}', 'all', this)">
                        <i class="fas fa-layer-group"></i>
                        <span>All</span>
                    </button>
                `;
                this.selectedMediaFilters[tabType] = 'all';
            }

            // Add button for each placement in campaign
            placements.forEach((pl, index) => {
                const config = placementConfig[pl] || { label: pl, icon: 'fas fa-ad' };
                const isActive = placements.length === 1 && index === 0;
                if (isActive) this.selectedMediaFilters[tabType] = pl;
                buttonsHTML += `
                    <button class="placement-filter-btn${isActive ? ' active' : ''}" data-placement="${pl}" onclick="BrandsManager.selectPlacementFilter('${tabType}', '${pl}', this)">
                        <i class="${config.icon}"></i>
                        <span>${config.label}</span>
                    </button>
                `;
            });

            buttonsContainer.innerHTML = buttonsHTML;
        });
    },

    // Handle placement filter button click
    selectPlacementFilter(tabType, placement, buttonElement) {
        // Update active state on buttons
        const container = document.getElementById(`${tabType}-placement-buttons`);
        if (container) {
            container.querySelectorAll('.placement-filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            buttonElement.classList.add('active');
        }

        // Store selected placement and filter
        this.selectedMediaFilters = this.selectedMediaFilters || {};
        this.selectedMediaFilters[tabType] = placement;

        // Apply filter
        this.filterCampaignMedia(tabType);
    },

    // Filter campaign media by placement
    filterCampaignMedia(tabType) {
        const placement = this.selectedMediaFilters?.[tabType] || 'all';

        console.log(`Filtering ${tabType} by placement:`, placement);

        // Get the gallery container
        const gallery = document.getElementById(`campaign-${tabType}-gallery`);
        if (!gallery) return;

        // Get all media items
        const mediaItems = gallery.querySelectorAll('.media-item');

        mediaItems.forEach(item => {
            const itemPlacement = item.dataset.placement || 'all';

            if (placement === 'all' || itemPlacement === placement) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });

        // Show/hide empty state based on visible items
        const visibleItems = gallery.querySelectorAll('.media-item:not([style*="display: none"])');
        const emptyState = gallery.querySelector('.media-empty-state');
        if (emptyState) {
            emptyState.style.display = visibleItems.length === 0 ? '' : 'none';
        }
    },

    // Reset media filter - clicks the "All" button or first button if no "All"
    resetMediaFilters(tabType) {
        const container = document.getElementById(`${tabType}-placement-buttons`);
        if (container) {
            const allBtn = container.querySelector('[data-placement="all"]');
            const firstBtn = container.querySelector('.placement-filter-btn');
            const targetBtn = allBtn || firstBtn;
            if (targetBtn) {
                this.selectPlacementFilter(tabType, targetBtn.dataset.placement, targetBtn);
            }
        }
    },

    // ============================================
    // ANALYTICS FILTER FUNCTIONS
    // ============================================

    // Filter analytics by audience, location, placement, and date
    filterAnalytics() {
        const audienceFilter = document.getElementById('analytics-audience-filter');
        const locationFilter = document.getElementById('analytics-location-filter');
        const placementFilter = document.getElementById('analytics-placement-filter');
        const dateFilter = document.getElementById('analytics-date-filter');

        const filters = {
            audience: audienceFilter?.value || 'all',
            location: locationFilter?.value || 'all',
            placement: placementFilter?.value || 'all',
            period: dateFilter?.value || '30d'
        };

        console.log('📊 Filtering analytics with:', filters);

        // TODO: In production, this would call API to get filtered analytics data
        // For now, just log the filter values
    },

    // Reset analytics filters
    resetAnalyticsFilters() {
        const audienceFilter = document.getElementById('analytics-audience-filter');
        const locationFilter = document.getElementById('analytics-location-filter');
        const placementFilter = document.getElementById('analytics-placement-filter');
        const dateFilter = document.getElementById('analytics-date-filter');

        if (audienceFilter) audienceFilter.value = 'all';
        if (locationFilter) locationFilter.value = 'all';
        if (placementFilter) placementFilter.value = 'all';
        if (dateFilter) dateFilter.value = '30d';

        this.filterAnalytics();
    },

    // Populate analytics placement filter (called when campaign is loaded)
    populateAnalyticsFilter() {
        const campaign = this.currentCampaign;
        if (!campaign) return;

        const placements = campaign.target_placements || [];
        const placementFilter = document.getElementById('analytics-placement-filter');

        if (placementFilter) {
            const placementConfig = {
                placeholder: 'Ad Placeholder',
                widget: 'Ad Widget',
                popup: 'WB Pop-up',
                insession: 'WB In-Session'
            };

            const allOption = placements.length > 1 ? '<option value="all">All Placements</option>' : '';
            placementFilter.innerHTML = allOption +
                placements.map(pl => `<option value="${pl}">${placementConfig[pl] || pl}</option>`).join('');
        }
    }
};

// ============================================
// GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================

function filterBrandsByStatus(status) {
    BrandsManager.setStatusFilter(status);
}

function searchBrandsInput(event) {
    BrandsManager.searchBrands(event.target.value);
}

// Export functions to window for HTML onclick handlers
window.filterBrandsByStatus = filterBrandsByStatus;
window.searchBrandsInput = searchBrandsInput;
window.BrandsManager = BrandsManager;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏷️ [BrandsManager] DOMContentLoaded fired');
    const brandsGrid = document.getElementById('brandsGrid');

    if (brandsGrid) {
        console.log('🏷️ [BrandsManager] brandsGrid found in DOM, initializing...');
        BrandsManager.initialize();
    } else {
        console.warn('🏷️ [BrandsManager] brandsGrid not found in DOM yet');
    }
});

// Also listen for panel switch events to re-initialize when brands panel is shown
window.addEventListener('panelSwitch', (event) => {
    if (event.detail && event.detail.panelName === 'brands') {
        console.log('🏷️ [BrandsManager] Panel switched to brands, ensuring initialization...');
        setTimeout(() => {
            if (typeof BrandsManager !== 'undefined' && typeof BrandsManager.renderBrands === 'function') {
                console.log('🏷️ [BrandsManager] Force rendering brands after panel switch...');
                const brandsGrid = document.getElementById('brandsGrid');
                if (brandsGrid) {
                    console.log('🏷️ [BrandsManager] brandsGrid found, current innerHTML length:', brandsGrid.innerHTML.length);
                }
                BrandsManager.renderBrands();

                // Double-check after render
                setTimeout(() => {
                    const cards = document.querySelectorAll('.brand-card');
                    const newBrandCard = document.querySelector('.brand-card.new-brand');
                    console.log('🏷️ [BrandsManager] After render - Total cards:', cards.length, '| New brand card:', newBrandCard ? 'FOUND' : 'MISSING');
                }, 100);
            }
        }, 150);
    }
});
