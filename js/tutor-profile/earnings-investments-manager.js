/**
 * Earnings & Investments Manager
 * Handles earnings tracking and investment portfolio for tutor profiles
 */

const EarningsInvestmentsManager = {
    API_BASE_URL: window.API_BASE_URL || 'http://localhost:8000',
    charts: {},
    currentPeriod: {
        affiliate: 6,
        tutoring: 6,
        total: 6
    },
    currentSection: 'total', // Track which section is active (total, affiliate, tutoring)
    currentAffiliateTab: 'advertisement', // Track affiliate sub-tab (advertisement, subscription, commission)
    affiliateTiers: [], // Cache affiliate tiers from admin db
    selectedTierLevel: null, // Currently selected tier level filter (null = All)

    /**
     * Initialize the manager
     */
    init() {
        console.log('Initializing Earnings & Investments Manager...');
        this.loadAffiliateTiers(); // Load affiliate tier levels from admin db
        this.loadEarningsSummary();
        this.loadInvestmentsSummary();

        // Load Chart.js if not already loaded
        if (typeof Chart === 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
            script.onload = () => {
                console.log('Chart.js loaded successfully');
                this.initializeCharts();
            };
            document.head.appendChild(script);
        } else {
            this.initializeCharts();
        }
    },

    /**
     * Load affiliate tiers from admin database
     */
    async loadAffiliateTiers() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/affiliate/tiers`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load affiliate tiers:', response.status);
                return;
            }

            const data = await response.json();
            this.affiliateTiers = Array.isArray(data) ? data : (data.tiers || []);
            this.renderAffiliateTierCards();
        } catch (error) {
            console.error('Error loading affiliate tiers:', error);
        }
    },

    /**
     * Render affiliate tier cards in all affiliate tabs (Advertisement, Subscription, Commission)
     * Cards are clickable to filter earnings by tier level
     */
    renderAffiliateTierCards() {
        const advertisementContainer = document.getElementById('advertisement-affiliate-levels');
        const subscriptionContainer = document.getElementById('subscription-affiliate-levels');
        const commissionContainer = document.getElementById('commission-affiliate-levels');

        if (!this.affiliateTiers.length) {
            const emptyMessage = '<p class="text-gray-500 text-sm">Affiliate tiers not configured.</p>';
            if (advertisementContainer) advertisementContainer.innerHTML = emptyMessage;
            if (subscriptionContainer) subscriptionContainer.innerHTML = emptyMessage;
            if (commissionContainer) commissionContainer.innerHTML = emptyMessage;
            return;
        }

        // Create tier card HTML generator for each tab type
        const createTierCards = (tabType) => {
            const isAllSelected = this.selectedTierLevel === null;

            // "All" card first
            let cards = `
                <div class="tier-filter-card px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-2 ${isAllSelected ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}"
                     onclick="EarningsInvestmentsManager.filterByTier(null, '${tabType}')">
                    <span class="text-sm">📊</span>
                    <span class="font-medium text-sm">All Levels</span>
                </div>
            `;

            // Individual tier cards with static Tailwind classes (dynamic classes don't work with JIT)
            const colorClasses = {
                blue: {
                    selected: 'bg-blue-600 text-white shadow-md',
                    unselected: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                },
                purple: {
                    selected: 'bg-purple-600 text-white shadow-md',
                    unselected: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                },
                green: {
                    selected: 'bg-green-600 text-white shadow-md',
                    unselected: 'bg-green-50 hover:bg-green-100 text-green-800 border border-green-200'
                }
            };
            const colorKeys = ['blue', 'purple', 'green'];

            cards += this.affiliateTiers.map((tier, index) => {
                const colorKey = colorKeys[index % colorKeys.length];
                const classes = colorClasses[colorKey];
                const icons = ['🥇', '🥈', '🥉'];
                const icon = icons[index] || '⭐';
                const isSelected = this.selectedTierLevel === tier.tier_level;

                return `
                    <div class="tier-filter-card px-4 py-2 rounded-lg cursor-pointer transition-all duration-200 flex items-center gap-2 ${isSelected ? classes.selected : classes.unselected}"
                         onclick="EarningsInvestmentsManager.filterByTier(${tier.tier_level}, '${tabType}')">
                        <span class="text-sm">${icon}</span>
                        <span class="font-medium text-sm">${tier.tier_name}</span>
                        <span class="text-xs opacity-75">${tier.commission_rate}%</span>
                    </div>
                `;
            }).join('');

            return cards;
        };

        if (advertisementContainer) advertisementContainer.innerHTML = createTierCards('advertisement');
        if (subscriptionContainer) subscriptionContainer.innerHTML = createTierCards('subscription');
        if (commissionContainer) commissionContainer.innerHTML = createTierCards('commission');
    },

    /**
     * Filter earnings by tier level
     */
    filterByTier(tierLevel, tabType) {
        this.selectedTierLevel = tierLevel;
        console.log(`Filtering ${tabType} earnings by tier level:`, tierLevel === null ? 'All' : tierLevel);

        // Re-render tier cards to update selected state
        this.renderAffiliateTierCards();

        // Reload data for the current tab with tier filter
        switch (tabType) {
            case 'advertisement':
                this.loadAdvertisementData();
                this.initializeAdvertisementChart();
                break;
            case 'subscription':
                this.loadSubscriptionData();
                this.initializeSubscriptionChart();
                break;
            case 'commission':
                this.loadCommissionData();
                this.initializeCommissionChart();
                break;
        }
    },

    /**
     * Get auth headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('token') || localStorage.getItem('access_token');
        if (!token) {
            console.warn('No auth token found in localStorage');
        }
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    },

    /**
     * Load earnings summary
     */
    async loadEarningsSummary() {
        try {
            // First try the new combined summary endpoint
            const response = await fetch(`${this.API_BASE_URL}/api/earnings/combined-summary?months=6&role=tutor`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                // Fallback to old endpoint
                const fallbackResponse = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/summary?months=6`, {
                    headers: this.getAuthHeaders()
                });
                if (fallbackResponse.ok) {
                    const data = await fallbackResponse.json();
                    this.updateEarningsSummaryUI(data);
                }
            } else {
                const data = await response.json();
                this.updateEarningsSummaryUI(data.summary);
            }
            this.loadEarningsDetails();
        } catch (error) {
            console.error('Error loading earnings summary:', error);
        }
    },

    /**
     * Update earnings summary UI
     */
    updateEarningsSummaryUI(data) {
        if (!data) return;

        // Handle both old and new data structures
        const totalEarnings = data.total_earnings || 0;
        const affiliateEarnings = data.affiliate_earnings ||
                                  ((data.total_advertisement || 0) +
                                   (data.total_subscription || 0) +
                                   (data.total_commission || 0)) ||
                                  ((data.advertisement_earnings || 0) +
                                   (data.subscription_earnings || 0) +
                                   (data.commission_earnings || 0));
        const tutoringEarnings = data.tutoring_earnings || data.total_tutoring || 0;

        // Total earnings
        const totalEarningsEl = document.getElementById('total-earnings');
        if (totalEarningsEl) {
            totalEarningsEl.textContent = `${totalEarnings.toFixed(2)} ${CurrencyManager.getSymbol()}`;
        }

        // Combined affiliate earnings
        const affiliateEarningsEl = document.getElementById('affiliate-earnings');
        if (affiliateEarningsEl) {
            affiliateEarningsEl.textContent = `${affiliateEarnings.toFixed(2)} ${CurrencyManager.getSymbol()}`;
        }

        // Tutoring earnings
        const tutoringEarningsEl = document.getElementById('tutoring-earnings');
        if (tutoringEarningsEl) {
            tutoringEarningsEl.textContent = `${tutoringEarnings.toFixed(2)} ${CurrencyManager.getSymbol()}`;
        }

        // Update widget in sidebar
        const monthEarningsEl = document.getElementById('current-month-earnings');
        if (monthEarningsEl) {
            const currentMonth = data.monthly_data && data.monthly_data[0];
            if (currentMonth) {
                monthEarningsEl.textContent = (currentMonth.total_earnings || 0).toFixed(2);
            }
        }
    },

    /**
     * Load earnings details (lists)
     */
    async loadEarningsDetails() {
        await Promise.all([
            this.loadTotalEarningsData(),
            this.loadAdvertisementData(),
            this.loadSubscriptionData(),
            this.loadCommissionData(),
            this.loadTutoringData()
        ]);
    },

    /**
     * Load advertisement earnings data
     */
    async loadAdvertisementData() {
        try {
            let url = `${this.API_BASE_URL}/api/affiliate/earnings/advertisement?limit=20`;
            if (this.selectedTierLevel !== null) {
                url += `&tier_level=${this.selectedTierLevel}`;
            }
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load advertisement data:', response.status);
                this.renderAdvertisementList([]);
                return;
            }

            const data = await response.json();
            this.renderAdvertisementList(data.earnings || []);
        } catch (error) {
            console.error('Error loading advertisement data:', error);
            this.renderAdvertisementList([]);
        }
    },

    /**
     * Render advertisement earnings list
     */
    renderAdvertisementList(data) {
        const container = document.getElementById('advertisement-earnings-list');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">📺</div>
                    <p>No advertisement earnings yet</p>
                    <p class="text-sm mt-1">Earnings from ads on your profile will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-xl">📺</div>
                    <div>
                        <p class="font-semibold text-gray-800">${item.ad_name || 'Advertisement'}</p>
                        <p class="text-sm text-gray-600">${item.impressions?.toLocaleString() || 0} impressions</p>
                        <p class="text-xs text-gray-500">${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-blue-600">${item.amount?.toFixed(2) || '0.00'} ${CurrencyManager.getSymbol()}</p>
                    <p class="text-xs text-gray-600">CPM: ${item.cpm?.toFixed(2) || '0.00'} ${CurrencyManager.getSymbol()}</p>
                    <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }">${item.status || 'pending'}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load subscription affiliate earnings data
     */
    async loadSubscriptionData() {
        try {
            let url = `${this.API_BASE_URL}/api/affiliate/earnings/subscription?limit=20`;
            if (this.selectedTierLevel !== null) {
                url += `&tier_level=${this.selectedTierLevel}`;
            }
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load subscription data:', response.status);
                this.renderSubscriptionList([]);
                return;
            }

            const data = await response.json();
            this.renderSubscriptionList(data.earnings || []);
        } catch (error) {
            console.error('Error loading subscription data:', error);
            this.renderSubscriptionList([]);
        }
    },

    /**
     * Render subscription affiliate earnings list
     */
    renderSubscriptionList(data) {
        const container = document.getElementById('subscription-earnings-list');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">⭐</div>
                    <p>No subscription earnings yet</p>
                    <p class="text-sm mt-1">Commission from referred users who subscribe will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-4">
                    <img src="../${item.referred_user_picture || 'uploads/system_images/system_profile_pictures/man-user.png'}"
                        alt="${item.referred_user_name}"
                        class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-semibold text-gray-800">${item.referred_user_name || 'User'}</p>
                        <p class="text-sm text-gray-600">${item.plan_name || 'Premium'} subscription</p>
                        <p class="text-xs text-gray-500">Level ${item.tier_level || 1} • ${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-purple-600">${item.amount?.toFixed(2) || '0.00'} ${CurrencyManager.getSymbol()}</p>
                    <p class="text-xs text-gray-600">${item.commission_rate || 0}% commission</p>
                    <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }">${item.status || 'pending'}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load commission earnings data (tutor-student connections)
     */
    async loadCommissionData() {
        try {
            let url = `${this.API_BASE_URL}/api/affiliate/earnings/commission?limit=20`;
            if (this.selectedTierLevel !== null) {
                url += `&tier_level=${this.selectedTierLevel}`;
            }
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load commission data:', response.status);
                this.renderCommissionList([]);
                return;
            }

            const data = await response.json();
            this.renderCommissionList(data.earnings || []);
        } catch (error) {
            console.error('Error loading commission data:', error);
            this.renderCommissionList([]);
        }
    },

    /**
     * Render commission earnings list
     */
    renderCommissionList(data) {
        const container = document.getElementById('commission-earnings-list');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">🔗</div>
                    <p>No commission earnings yet</p>
                    <p class="text-sm mt-1">Your share from tutor-student connections will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 mb-1">${item.tutor_name || 'Tutor'} ↔ ${item.student_name || 'Student'}</p>
                    <p class="text-sm text-gray-600">Level ${item.tier_level || 1} connection • ${item.session_count || 0} sessions</p>
                    <p class="text-xs text-gray-500">${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-green-600">${item.amount?.toFixed(2) || '0.00'} ${CurrencyManager.getSymbol()}</p>
                    <p class="text-xs text-gray-600">${item.commission_rate || 0}% of ${item.transaction_amount?.toFixed(2) || '0.00'} ${CurrencyManager.getSymbol()}</p>
                    <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }">${item.status || 'pending'}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load tutoring data
     */
    async loadTutoringData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/tutoring?limit=25`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.renderTutoringList(data);
        } catch (error) {
            console.error('Error loading tutoring data:', error);
        }
    },

    /**
     * Render tutoring list
     */
    renderTutoringList(data) {
        const container = document.getElementById('tutoring-earnings-list');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No tutoring earnings yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-4">
                    <img src="../${item.student_profile_picture || 'uploads/system_images/system_profile_pictures/student-college-boy.jpg'}"
                        alt="${item.student_name}"
                        class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-semibold text-gray-800">${item.student_name}</p>
                        <p class="text-sm text-gray-600">${item.subject || 'General'} • ${item.session_type || 'Session'}</p>
                        <p class="text-xs text-gray-500">${item.session_duration ? `${item.session_duration} min • ` : ''}${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-orange-600">${item.amount.toFixed(2)} ${CurrencyManager.getSymbol()}</p>
                    <p class="text-xs text-gray-600">${item.payment_method || 'Payment'}</p>
                    <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }">${item.status}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load total earnings data (combined from all sources)
     */
    async loadTotalEarningsData() {
        try {
            const [advertisementData, subscriptionData, commissionData, tutoringData] = await Promise.all([
                fetch(`${this.API_BASE_URL}/api/affiliate/earnings/advertisement?limit=50`, {
                    headers: this.getAuthHeaders()
                }).then(res => res.ok ? res.json() : { earnings: [] }),
                fetch(`${this.API_BASE_URL}/api/affiliate/earnings/subscription?limit=50`, {
                    headers: this.getAuthHeaders()
                }).then(res => res.ok ? res.json() : { earnings: [] }),
                fetch(`${this.API_BASE_URL}/api/affiliate/earnings/commission?limit=50`, {
                    headers: this.getAuthHeaders()
                }).then(res => res.ok ? res.json() : { earnings: [] }),
                fetch(`${this.API_BASE_URL}/api/tutor/earnings/tutoring?limit=50`, {
                    headers: this.getAuthHeaders()
                }).then(res => res.ok ? res.json() : [])
            ]);

            this.renderTotalEarningsList(
                advertisementData.earnings || [],
                subscriptionData.earnings || [],
                commissionData.earnings || [],
                Array.isArray(tutoringData) ? tutoringData : []
            );
        } catch (error) {
            console.error('Error loading total earnings data:', error);
            this.renderTotalEarningsList([], [], [], []);
        }
    },

    /**
     * Render total earnings list (all sources combined)
     */
    renderTotalEarningsList(advertisementData, subscriptionData, commissionData, tutoringData) {
        const container = document.getElementById('total-earnings-list');
        if (!container) return;

        // Combine all data sources and add type indicator
        const combinedData = [
            ...advertisementData.map(item => ({ ...item, type: 'advertisement', sortDate: new Date(item.earned_date || Date.now()) })),
            ...subscriptionData.map(item => ({ ...item, type: 'subscription', sortDate: new Date(item.earned_date || Date.now()) })),
            ...commissionData.map(item => ({ ...item, type: 'commission', sortDate: new Date(item.earned_date || Date.now()) })),
            ...tutoringData.map(item => ({ ...item, type: 'tutoring', sortDate: new Date(item.earned_date || Date.now()) }))
        ];

        // Sort by date (newest first)
        combinedData.sort((a, b) => b.sortDate - a.sortDate);

        if (combinedData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="text-4xl mb-2">💰</div>
                    <p>No earnings yet</p>
                    <p class="text-sm mt-1">Your earnings from all sources will appear here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = combinedData.map(item => {
            let content = '';

            if (item.type === 'advertisement') {
                content = `
                    <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">📺</div>
                            <div>
                                <p class="font-semibold text-gray-800">${item.ad_name || 'Advertisement'}</p>
                                <p class="text-sm text-gray-600">Ad Revenue • ${item.impressions?.toLocaleString() || 0} impressions</p>
                                <p class="text-xs text-gray-500">${new Date(item.earned_date || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-bold text-blue-600">${(item.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</p>
                            <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }">${item.status || 'pending'}</span>
                        </div>
                    </div>
                `;
            } else if (item.type === 'subscription') {
                content = `
                    <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">⭐</div>
                            <div>
                                <p class="font-semibold text-gray-800">${item.referred_user_name || 'User'}</p>
                                <p class="text-sm text-gray-600">Subscription • Level ${item.tier_level || 1}</p>
                                <p class="text-xs text-gray-500">${new Date(item.earned_date || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-bold text-purple-600">${(item.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</p>
                            <p class="text-xs text-gray-600">${item.commission_rate || 0}% commission</p>
                            <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }">${item.status || 'pending'}</span>
                        </div>
                    </div>
                `;
            } else if (item.type === 'commission') {
                content = `
                    <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg">🔗</div>
                            <div>
                                <p class="font-semibold text-gray-800">${item.tutor_name || 'Tutor'} ↔ ${item.student_name || 'Student'}</p>
                                <p class="text-sm text-gray-600">Commission • Level ${item.tier_level || 1}</p>
                                <p class="text-xs text-gray-500">${new Date(item.earned_date || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-bold text-green-600">${(item.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</p>
                            <p class="text-xs text-gray-600">${item.commission_rate || 0}% commission</p>
                            <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }">${item.status || 'pending'}</span>
                        </div>
                    </div>
                `;
            } else { // tutoring
                content = `
                    <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">📚</div>
                            <img src="../${item.student_profile_picture || 'uploads/system_images/system_profile_pictures/student-college-boy.jpg'}"
                                alt="${item.student_name}"
                                class="w-12 h-12 rounded-full object-cover">
                            <div>
                                <p class="font-semibold text-gray-800">${item.student_name || 'Student'}</p>
                                <p class="text-sm text-gray-600">Tutoring Session • ${item.subject || 'General'}</p>
                                <p class="text-xs text-gray-500">${item.session_duration ? `${item.session_duration} min • ` : ''}${new Date(item.earned_date || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-bold text-orange-600">${(item.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</p>
                            <p class="text-xs text-gray-600">${item.payment_method || 'Payment'}</p>
                            <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }">${item.status || 'pending'}</span>
                        </div>
                    </div>
                `;
            }

            return content;
        }).join('');
    },

    /**
     * Initialize charts
     */
    initializeCharts() {
        this.initializeTotalEarningsChart();
        this.initializeAdvertisementChart();
        this.initializeSubscriptionChart();
        this.initializeCommissionChart();
        this.initializeTutoringChart();
    },

    /**
     * Initialize advertisement earnings chart
     */
    async initializeAdvertisementChart() {
        const ctx = document.getElementById('advertisement-earnings-chart');
        if (!ctx) return;

        try {
            let url = `${this.API_BASE_URL}/api/affiliate/earnings/advertisement?months=6&role=tutor`;
            if (this.selectedTierLevel !== null) {
                url += `&tier_level=${this.selectedTierLevel}`;
            }
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load advertisement chart data:', response.status);
                return;
            }

            const data = await response.json();
            if (!data.monthly_data || !Array.isArray(data.monthly_data)) {
                return;
            }
            const monthlyData = [...data.monthly_data].reverse();

            const labels = monthlyData.map(d => {
                const date = new Date(d.year, d.month - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });

            const values = monthlyData.map(d => d.amount || 0);

            if (this.charts.advertisement) {
                this.charts.advertisement.destroy();
            }

            this.charts.advertisement = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Advertisement Earnings (ETB)',
                        data: values,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            display: true,
                            title: { display: true, text: 'Date', font: { size: 12 } },
                            ticks: { font: { size: 11 } }
                        },
                        y: { beginAtZero: true, ticks: { callback: v => v.toFixed(0) + ' ' + (CurrencyManager.getSymbol()) } }
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing advertisement chart:', error);
        }
    },

    /**
     * Initialize subscription earnings chart
     */
    async initializeSubscriptionChart() {
        const ctx = document.getElementById('subscription-earnings-chart');
        if (!ctx) return;

        try {
            let url = `${this.API_BASE_URL}/api/affiliate/earnings/subscription?months=6&role=tutor`;
            if (this.selectedTierLevel !== null) {
                url += `&tier_level=${this.selectedTierLevel}`;
            }
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load subscription chart data:', response.status);
                return;
            }

            const data = await response.json();
            if (!data.monthly_data || !Array.isArray(data.monthly_data)) {
                return;
            }
            const monthlyData = [...data.monthly_data].reverse();

            const labels = monthlyData.map(d => {
                const date = new Date(d.year, d.month - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });

            const values = monthlyData.map(d => d.amount || 0);

            if (this.charts.subscription) {
                this.charts.subscription.destroy();
            }

            this.charts.subscription = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Subscription Earnings (ETB)',
                        data: values,
                        borderColor: 'rgb(168, 85, 247)',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            display: true,
                            title: { display: true, text: 'Date', font: { size: 12 } },
                            ticks: { font: { size: 11 } }
                        },
                        y: { beginAtZero: true, ticks: { callback: v => v.toFixed(0) + ' ' + (CurrencyManager.getSymbol()) } }
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing subscription chart:', error);
        }
    },

    /**
     * Initialize commission earnings chart
     */
    async initializeCommissionChart() {
        const ctx = document.getElementById('commission-earnings-chart');
        if (!ctx) return;

        try {
            let url = `${this.API_BASE_URL}/api/affiliate/earnings/commission?months=6&role=tutor`;
            if (this.selectedTierLevel !== null) {
                url += `&tier_level=${this.selectedTierLevel}`;
            }
            const response = await fetch(url, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load commission chart data:', response.status);
                return;
            }

            const data = await response.json();
            if (!data.monthly_data || !Array.isArray(data.monthly_data)) {
                return;
            }
            const monthlyData = [...data.monthly_data].reverse();

            const labels = monthlyData.map(d => {
                const date = new Date(d.year, d.month - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });

            const values = monthlyData.map(d => d.amount || 0);

            if (this.charts.commission) {
                this.charts.commission.destroy();
            }

            this.charts.commission = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Commission Earnings (ETB)',
                        data: values,
                        borderColor: 'rgb(34, 197, 94)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: {
                            display: true,
                            title: { display: true, text: 'Date', font: { size: 12 } },
                            ticks: { font: { size: 11 } }
                        },
                        y: { beginAtZero: true, ticks: { callback: v => v.toFixed(0) + ' ' + (CurrencyManager.getSymbol()) } }
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing commission chart:', error);
        }
    },

    /**
     * Initialize total earnings chart (all sources combined)
     */
    async initializeTotalEarningsChart() {
        const ctx = document.getElementById('total-earnings-chart');
        if (!ctx) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/summary?months=6`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load earnings data for chart:', response.status);
                return;
            }

            const data = await response.json();
            if (!data.monthly_data || !Array.isArray(data.monthly_data)) {
                console.warn('No monthly data available for chart');
                return;
            }
            const monthlyData = data.monthly_data.reverse();

            const labels = monthlyData.map(d => {
                const date = new Date(d.year, d.month - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });

            // Only show total earnings
            const totalValues = monthlyData.map(d => d.total_earnings);

            if (this.charts.totalEarnings) {
                this.charts.totalEarnings.destroy();
            }

            this.charts.totalEarnings = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Total Earnings (ETB)',
                            data: totalValues,
                            borderColor: 'rgb(34, 197, 94)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            borderWidth: 3,
                            tension: 0.4,
                            fill: true,
                            pointRadius: 5,
                            pointHoverRadius: 7,
                            pointBackgroundColor: 'rgb(34, 197, 94)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                                size: 14,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 13
                            },
                            callbacks: {
                                label: function(context) {
                                    if (context.parsed.y !== null) {
                                        return 'Total Earnings: ' + context.parsed.y.toFixed(2) + ' ' + (CurrencyManager.getSymbol());
                                    }
                                    return '';
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(0) + ' ' + (CurrencyManager.getSymbol());
                                },
                                font: {
                                    size: 11
                                }
                            },
                            grid: {
                                color: 'rgba(0, 0, 0, 0.05)',
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                font: {
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing total earnings chart:', error);
        }
    },

    /**
     * Initialize tutoring earnings chart
     */
    async initializeTutoringChart() {
        const ctx = document.getElementById('tutoring-earnings-chart');
        if (!ctx) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/summary?months=6`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                console.warn('Failed to load earnings data for tutoring chart:', response.status);
                return;
            }

            const data = await response.json();
            if (!data.monthly_data || !Array.isArray(data.monthly_data)) {
                console.warn('No monthly data available for tutoring chart');
                return;
            }
            const monthlyData = data.monthly_data.reverse();

            const labels = monthlyData.map(d => {
                const date = new Date(d.year, d.month - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });

            const values = monthlyData.map(d => d.tutoring_earnings);

            if (this.charts.tutoring) {
                this.charts.tutoring.destroy();
            }

            this.charts.tutoring = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Tutoring Earnings (ETB)',
                        data: values,
                        borderColor: 'rgb(249, 115, 22)',
                        backgroundColor: 'rgba(249, 115, 22, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return value.toFixed(0) + ' ' + (CurrencyManager.getSymbol());
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error initializing tutoring chart:', error);
        }
    },

    /**
     * Load investments summary
     */
    async loadInvestmentsSummary() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/investments/summary`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.updateInvestmentsSummaryUI(data);
            this.renderInvestmentsList(data.investments);
        } catch (error) {
            console.error('Error loading investments summary:', error);
        }
    },

    /**
     * Update investments summary UI
     */
    updateInvestmentsSummaryUI(data) {
        const totalInvestedEl = document.getElementById('total-invested');
        const totalImpressionsEl = document.getElementById('total-impressions');
        const avgCpmEl = document.getElementById('average-cpm');

        if (totalInvestedEl) {
            totalInvestedEl.textContent = `${data.total_invested.toFixed(2)} ${CurrencyManager.getSymbol()}`;
        }

        if (totalImpressionsEl) {
            totalImpressionsEl.textContent = data.total_impressions || 0;
        }

        if (avgCpmEl) {
            // Calculate average CPM
            const avgCpm = data.total_impressions > 0 ? (data.total_invested / data.total_impressions) * 1000 : 0;
            avgCpmEl.textContent = `${avgCpm.toFixed(2)} ${CurrencyManager.getSymbol()}`;
        }
    },

    /**
     * Render investments list
     */
    renderInvestmentsList(investments) {
        const container = document.getElementById('investments-list');
        if (!container) return;

        if (investments.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No investments yet</p>
                    <p class="text-sm mt-2">Click "Add Investment" to get started</p>
                </div>
            `;
            return;
        }

        container.innerHTML = investments.map(inv => {
            // Calculate CPM for this specific investment
            const impressions = inv.impressions || 0;
            const cpm = impressions > 0 ? (inv.amount / impressions) * 1000 : 0;

            return `
                <div class="p-6 bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex-1">
                            <h4 class="text-lg font-bold text-gray-800 mb-1">${inv.investment_name || 'Advertisement'}</h4>
                            <p class="text-sm text-gray-600 mb-2">${inv.investment_type || 'Ad Campaign'}</p>
                            ${inv.content ? `<p class="text-sm text-gray-700 leading-relaxed">${inv.content}</p>` : ''}
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-6 mt-4">
                        <div>
                            <p class="text-xs text-gray-600 mb-1">Invested</p>
                            <p class="text-2xl font-bold text-blue-600">${inv.amount.toFixed(2)} ${CurrencyManager.getSymbol()}</p>
                            <p class="text-xs text-gray-500 mt-1">${new Date(inv.investment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-600 mb-1">Total Impressions</p>
                            <p class="text-2xl font-bold text-gray-800">${impressions.toLocaleString()}</p>
                            <p class="text-xs text-gray-500 mt-1">CPM: <span class="font-semibold text-green-600">${cpm.toFixed(2)} ${CurrencyManager.getSymbol()}</span></p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    /**
     * Load student subscriptions
     */
    async loadStudentSubscriptions() {
        const container = document.getElementById('subscriptions-list');
        const loading = document.getElementById('subscriptions-loading');
        const empty = document.getElementById('subscriptions-empty');

        if (!container) return;

        try {
            loading?.classList.remove('hidden');
            container.classList.add('hidden');
            empty?.classList.add('hidden');

            // Determine endpoint based on current user role
            const currentUserRole = localStorage.getItem('userRole');
            const isTutor = currentUserRole === 'tutor';
            const endpoint = isTutor
                ? `${this.API_BASE_URL}/api/tutor/subscriptions`
                : `${this.API_BASE_URL}/api/student/subscriptions`;

            const response = await fetch(endpoint, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const subscriptions = Array.isArray(data) ? data : (data.subscriptions || []);

            loading?.classList.add('hidden');

            if (subscriptions.length === 0) {
                container.classList.add('hidden');
                empty?.classList.remove('hidden');
                return;
            }

            container.classList.remove('hidden');
            this.renderSubscriptionsList(subscriptions);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            loading?.classList.add('hidden');
            empty?.classList.remove('hidden');
        }
    },

    /**
     * Render subscriptions list
     */
    renderSubscriptionsList(subscriptions) {
        const container = document.getElementById('subscriptions-list');
        if (!container) return;

        const totalSubs = document.getElementById('total-subscriptions');
        if (totalSubs) totalSubs.textContent = subscriptions.length;

        // Get current role to determine which buttons to show
        const currentUserRole = localStorage.getItem('userRole');
        const isTutor = currentUserRole === 'tutor';

        container.innerHTML = subscriptions.map((sub, index) => {
            const startDate = new Date(sub.start_date || sub.created_at);
            const endDate = sub.end_date ? new Date(sub.end_date) : null;
            const isActive = sub.status === 'active';
            const daysLeft = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : 0;

            // Calculate CPI (Cost Per Impression) for tutors
            const totalImpressions = sub.total_impressions || 0;
            const cpi = totalImpressions > 0 ? (sub.amount / totalImpressions) : 0;

            return `
                <div class="card p-6 hover:shadow-lg transition-all duration-300 border-l-4 ${isActive ? 'border-green-500' : 'border-gray-400'}">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-4 flex-1">
                            <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-2xl">
                                📋
                            </div>
                            <div class="flex-1">
                                <h4 class="font-bold text-lg text-gray-800 mb-1">${sub.plan_name || 'Subscription Plan'}</h4>
                                <p class="text-sm text-gray-600">${sub.description || 'Premium access'}</p>
                                <div class="flex items-center gap-2 mt-2">
                                    <span class="bg-${isActive ? 'green' : 'gray'}-100 text-${isActive ? 'green' : 'gray'}-800 text-xs px-3 py-1 rounded-full font-semibold">
                                        ${isActive ? 'Active' : 'Expired'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-blue-600">${(sub.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</div>
                            <div class="text-xs text-gray-500 mt-1">${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                        <div>
                            <div class="text-xs text-gray-500 mb-1">Start Date</div>
                            <div class="font-semibold text-gray-800">${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        ${endDate ? `
                            <div>
                                <div class="text-xs text-gray-500 mb-1">${isActive ? 'Days Remaining' : 'End Date'}</div>
                                <div class="font-semibold ${isActive ? 'text-green-600' : 'text-gray-800'}">${isActive ? `${daysLeft} days` : endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                        ` : ''}
                        <div>
                            <div class="text-xs text-gray-500 mb-1">Status</div>
                            <div class="font-semibold text-${isActive ? 'green' : 'gray'}-600">${sub.status || 'N/A'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 mb-1">Payment Method</div>
                            <div class="font-semibold text-gray-800">${sub.payment_method || 'N/A'}</div>
                        </div>
                    </div>

                    <div class="flex gap-2">
                        ${isTutor ? `
                            <!-- Tutor: Show Performance Metrics and Invoice -->
                            <button onclick="openPerformanceMetricsModal(${index})" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                                Performance Metrics
                            </button>
                            <button onclick="downloadSubscriptionInvoice(${index})" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Invoice
                            </button>
                        ` : `
                            <!-- Student: Show View Details and Invoice -->
                            <button onclick="viewSubscriptionDetails(${index})" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                View Details
                            </button>
                            <button onclick="downloadSubscriptionInvoice(${index})" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                                Invoice
                            </button>
                        `}
                    </div>
                </div>
            `;
        }).join('');

        // Store subscriptions data globally for modal access
        window.currentSubscriptions = subscriptions;
    },

    /**
     * Load student tutoring packages
     */
    async loadStudentTutoringPackages() {
        const container = document.getElementById('investments-list');
        const loading = document.getElementById('investments-loading');
        const empty = document.getElementById('investments-empty');

        if (!container) return;

        try {
            loading?.classList.remove('hidden');
            container.classList.add('hidden');
            empty?.classList.add('hidden');

            const response = await fetch(`${this.API_BASE_URL}/api/student/tutoring-packages`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const packages = Array.isArray(data) ? data : (data.packages || []);

            loading?.classList.add('hidden');

            if (packages.length === 0) {
                container.classList.add('hidden');
                empty?.classList.remove('hidden');
                return;
            }

            container.classList.remove('hidden');
            this.renderTutoringPackagesList(packages);
        } catch (error) {
            console.error('Error loading tutoring packages:', error);
            loading?.classList.add('hidden');
            empty?.classList.remove('hidden');
        }
    },

    /**
     * Render tutoring packages list
     */
    renderTutoringPackagesList(packages) {
        const container = document.getElementById('investments-list');
        if (!container) return;

        const totalPackages = document.getElementById('total-tutoring-packages');
        if (totalPackages) totalPackages.textContent = packages.length;

        container.innerHTML = packages.map(pkg => {
            const purchaseDate = new Date(pkg.purchase_date || pkg.created_at);
            const isInProgress = pkg.status === 'in_progress' || pkg.status === 'active';
            const isCompleted = pkg.status === 'completed';
            const sessionsCompleted = pkg.sessions_completed || 0;
            const totalSessions = pkg.total_sessions || 10;
            const progressPercent = (sessionsCompleted / totalSessions) * 100;

            return `
                <div class="card p-6 hover:shadow-lg transition-all duration-300 border-l-4 ${isCompleted ? 'border-green-500' : isInProgress ? 'border-purple-500' : 'border-blue-500'}">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-4 flex-1">
                            <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white text-2xl">
                                🎯
                            </div>
                            <div class="flex-1">
                                <h4 class="font-bold text-lg text-gray-800 mb-1">${pkg.package_name || 'Tutoring Session Package'}</h4>
                                <p class="text-sm text-gray-600">${totalSessions} Sessions${pkg.tutor_name ? ` with ${pkg.tutor_name}` : ''}</p>
                                <div class="flex items-center gap-2 mt-2">
                                    <span class="bg-${isCompleted ? 'green' : isInProgress ? 'yellow' : 'blue'}-100 text-${isCompleted ? 'green' : isInProgress ? 'yellow' : 'blue'}-800 text-xs px-3 py-1 rounded-full font-semibold">
                                        ${isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Scheduled'}
                                    </span>
                                    <span class="bg-purple-100 text-purple-800 text-xs px-3 py-1 rounded-full font-semibold">
                                        Tutoring
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-purple-600">${(pkg.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</div>
                            <div class="text-xs text-gray-500 mt-1">${purchaseDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                        <div>
                            <div class="text-xs text-gray-500 mb-1">Amount</div>
                            <div class="font-semibold text-gray-800">${(pkg.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 mb-1">Date</div>
                            <div class="font-semibold text-gray-800">${purchaseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 mb-1">Status</div>
                            <div class="font-semibold text-${isCompleted ? 'green' : isInProgress ? 'yellow' : 'blue'}-600">${pkg.status || 'Active'}</div>
                        </div>
                        <div>
                            <div class="text-xs text-gray-500 mb-1">Payment Method</div>
                            <div class="font-semibold text-gray-800">${pkg.payment_method || 'N/A'}</div>
                        </div>
                    </div>

                    ${isInProgress ? `
                        <div class="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div class="flex items-center gap-2 text-sm">
                                <span class="font-semibold text-blue-800">Progress:</span>
                                <span class="text-blue-600">${sessionsCompleted} of ${totalSessions} sessions completed</span>
                            </div>
                            <div class="w-full bg-blue-200 rounded-full h-2 mt-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    ` : ''}

                    <div class="flex gap-2">
                        ${isInProgress ? `
                            <button class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium">
                                View Schedule
                            </button>
                        ` : `
                            <button class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                                View Details
                            </button>
                        `}
                        <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                            Download Invoice
                        </button>
                        ${isInProgress && pkg.tutor_id ? `
                            <button class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium">
                                Contact Tutor
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }
};

/**
 * Switch between earnings and investments tabs
 */
function switchEarningsTab(tab) {
    // Update tab buttons
    const earningsTab = document.getElementById('earnings-tab');
    const investmentsTab = document.getElementById('investments-tab');
    const earningsContent = document.getElementById('earnings-tab-content');
    const investmentsContent = document.getElementById('investments-tab-content');

    if (tab === 'earnings') {
        earningsTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        earningsTab.classList.remove('text-gray-500');
        investmentsTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        investmentsTab.classList.add('text-gray-500');
        earningsContent.classList.remove('hidden');
        investmentsContent.classList.add('hidden');
    } else {
        investmentsTab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        investmentsTab.classList.remove('text-gray-500');
        earningsTab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        earningsTab.classList.add('text-gray-500');
        investmentsContent.classList.remove('hidden');
        earningsContent.classList.add('hidden');

        // Show subscriptions section when investments tab is clicked
        const subscriptionsSection = document.getElementById('subscriptions-section');
        if (subscriptionsSection) {
            subscriptionsSection.classList.remove('hidden');
        }

        // Load subscriptions when switching to investments tab
        EarningsInvestmentsManager.loadStudentSubscriptions();
    }
}

/**
 * Global reload functions for period selectors
 */
function loadTotalEarningsData() {
    EarningsInvestmentsManager.loadTotalEarningsData();
    EarningsInvestmentsManager.initializeTotalEarningsChart();
}

function loadAffiliateData() {
    // Reload data based on current affiliate tab
    const currentTab = EarningsInvestmentsManager.currentAffiliateTab;
    if (currentTab === 'advertisement') {
        EarningsInvestmentsManager.loadAdvertisementData();
        EarningsInvestmentsManager.initializeAdvertisementChart();
    } else if (currentTab === 'subscription') {
        EarningsInvestmentsManager.loadSubscriptionData();
        EarningsInvestmentsManager.initializeSubscriptionChart();
    } else if (currentTab === 'commission') {
        EarningsInvestmentsManager.loadCommissionData();
        EarningsInvestmentsManager.initializeCommissionChart();
    }
}

function loadTutoringData() {
    EarningsInvestmentsManager.loadTutoringData();
    EarningsInvestmentsManager.initializeTutoringChart();
}

/**
 * Switch between affiliate sub-tabs (Advertisement, Subscription, Commission)
 */
function switchAffiliateTab(tab) {
    console.log('Switching affiliate tab to:', tab);
    EarningsInvestmentsManager.currentAffiliateTab = tab;

    // Get all tab buttons and content
    const tabs = ['advertisement', 'subscription', 'commission'];

    tabs.forEach(t => {
        const tabBtn = document.getElementById(`${t}-tab`);
        const tabContent = document.getElementById(`${t}-tab-content`);

        if (t === tab) {
            // Active tab
            if (tabBtn) {
                tabBtn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
                tabBtn.classList.remove('text-gray-500');
            }
            if (tabContent) {
                tabContent.classList.remove('hidden');
            }
        } else {
            // Inactive tabs
            if (tabBtn) {
                tabBtn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
                tabBtn.classList.add('text-gray-500');
            }
            if (tabContent) {
                tabContent.classList.add('hidden');
            }
        }
    });

    // Load data for the selected tab
    loadAffiliateData();
}

/**
 * Toggle earnings sections - show only the selected section (total, affiliate, tutoring)
 */
function toggleEarningsSection(section) {
    console.log('Toggling section:', section);

    // Update current section
    EarningsInvestmentsManager.currentSection = section;

    // Get all sections and cards (now 3 sections: total, affiliate, tutoring)
    const sections = {
        total: document.getElementById('total-earnings-section'),
        affiliate: document.getElementById('affiliate-earnings-section'),
        tutoring: document.getElementById('tutoring-earnings-section')
    };

    const cards = document.querySelectorAll('.earnings-tab-content .card.cursor-pointer');

    // Hide all sections first
    Object.values(sections).forEach(sec => {
        if (sec) sec.classList.add('hidden');
    });

    // Remove active state from all cards
    cards.forEach(card => {
        card.classList.remove('active-earnings-card', 'ring-2', 'ring-blue-500');
    });

    // Show the selected section
    if (sections[section]) {
        sections[section].classList.remove('hidden');
    }

    // Add active state to the clicked card (now 3 cards)
    const cardIndex = { total: 0, affiliate: 1, tutoring: 2 };
    if (cards[cardIndex[section]]) {
        cards[cardIndex[section]].classList.add('active-earnings-card', 'ring-2', 'ring-blue-500');
    }

    // If affiliate section, initialize the default tab
    if (section === 'affiliate') {
        switchAffiliateTab(EarningsInvestmentsManager.currentAffiliateTab || 'advertisement');
    }
}

/**
 * Show subscription history (filter investments list)
 */
function showSubscriptionHistory() {
    const icon = document.getElementById('investments-list-icon');
    const title = document.getElementById('investments-list-title');

    if (icon) icon.textContent = '📅';
    if (title) title.textContent = 'Subscription History';

    EarningsInvestmentsManager.loadStudentSubscriptions();
}

/**
 * Show tutoring packages (filter investments list)
 * For students/parents only
 */
function showTutoringPackages() {
    const icon = document.getElementById('investments-list-icon');
    const title = document.getElementById('investments-list-title');

    if (icon) icon.textContent = '👨‍🏫';
    if (title) title.textContent = 'Tutoring Packages';

    EarningsInvestmentsManager.loadStudentTutoringPackages();
}

/**
 * Show course materials (filter investments list)
 * For tutors only
 */
function showCourseMaterials() {
    const icon = document.getElementById('investments-list-icon');
    const title = document.getElementById('investments-list-title');
    const container = document.getElementById('investments-list');
    const loading = document.getElementById('investments-loading');
    const empty = document.getElementById('investments-empty');

    if (icon) icon.textContent = '📚';
    if (title) title.textContent = 'Course Materials';

    // For now, show coming soon message
    // Later, this can be connected to an API endpoint
    if (loading) loading.classList.add('hidden');
    if (empty) empty.classList.add('hidden');

    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">📚</div>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">Course Materials</h3>
                <p class="text-gray-600 mb-4">Purchased teaching materials and resources will appear here.</p>
                <p class="text-sm text-gray-500">This feature is coming soon!</p>
            </div>
        `;
    }

    // Update total count
    const totalMaterials = document.getElementById('total-course-materials');
    if (totalMaterials) totalMaterials.textContent = '0';
}

/**
 * Show purchase history (Coming Soon)
 */
function showPurchaseHistory() {
    const icon = document.getElementById('investments-list-icon');
    const title = document.getElementById('investments-list-title');
    const container = document.getElementById('investments-list');
    const loading = document.getElementById('investments-loading');
    const empty = document.getElementById('investments-empty');

    if (icon) icon.textContent = '🛒';
    if (title) title.textContent = 'Purchase History';

    if (loading) loading.classList.add('hidden');
    if (empty) empty.classList.add('hidden');

    if (container) {
        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-6xl mb-4">🚧</div>
                <h3 class="text-2xl font-bold text-gray-800 mb-2">Coming Soon</h3>
                <p class="text-gray-600 mb-4">Purchase history for materials and resources will be available soon.</p>
                <p class="text-sm text-gray-500">Stay tuned for updates!</p>
            </div>
        `;
    }
}

/**
 * Reset investment filter (show all)
 */
function resetInvestmentFilter() {
    const icon = document.getElementById('investments-list-icon');
    const title = document.getElementById('investments-list-title');
    const container = document.getElementById('investments-list');
    const loading = document.getElementById('investments-loading');
    const empty = document.getElementById('investments-empty');

    if (icon) icon.textContent = '💰';
    if (title) title.textContent = 'All Investments';

    // Show all investments - for students this would combine subscriptions and tutoring packages
    // For now, let's show subscriptions by default
    showSubscriptionHistory();
}

// ============================================
// MODAL FUNCTIONS FOR SUBSCRIPTION DETAILS & PERFORMANCE METRICS
// ============================================


/**
 * Populate Metrics Sidebar
 */
function populateMetricsSidebar(subscriptions, selectedIndex = 0) {
    const sidebarList = document.getElementById('metrics-sidebar-list');
    if (!sidebarList) return;

    if (!subscriptions || subscriptions.length === 0) {
        sidebarList.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p class="text-sm">No subscriptions found</p>
            </div>
        `;
        return;
    }

    sidebarList.innerHTML = subscriptions.map((sub, index) => {
        const isActive = sub.status === 'active';
        const isSelected = index === selectedIndex;
        const startDate = new Date(sub.start_date || sub.created_at);

        return `
            <div onclick="switchMetricsView(${index})" class="bg-white rounded-lg p-4 cursor-pointer hover:shadow-md transition-all border-l-4 ${isSelected ? 'border-green-500 shadow-md' : 'border-gray-300'}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold ${isActive ? 'text-green-600' : 'text-gray-500'}">${isActive ? 'ACTIVE' : 'EXPIRED'}</span>
                    <span class="text-xs text-gray-500">${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                </div>
                <h4 class="font-bold text-gray-800 mb-1 text-sm">${sub.plan_name || 'Subscription Plan'}</h4>
                <p class="text-sm text-gray-600">${(sub.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</p>
            </div>
        `;
    }).join('');
}

/**
 * Switch Metrics View in Modal
 */
function switchMetricsView(subscriptionIndex) {
    openPerformanceMetricsModal(subscriptionIndex);
}


/**
 * Show Metrics Modal State
 */
function showMetricsModalState(state) {
    const states = ['metrics-loading-state', 'metrics-empty-state', 'metrics-error-state', 'metrics-content'];
    states.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add('hidden');
    });

    const activeState = document.getElementById(state);
    if (activeState) activeState.classList.remove('hidden');
}

/**
 * Retry Load Metrics
 */
async function retryLoadMetrics() {
    window.currentSubscriptions = null;
    await openPerformanceMetricsModal(0);
}

/**
 * Open Performance Metrics Modal
 */
async function openPerformanceMetricsModal(subscriptionIndex = 0) {
    const modal = document.getElementById('performance-metrics-modal');
    if (!modal) {
        console.error('Performance metrics modal not found');
        return;
    }

    // Show modal immediately with loading state
    modal.classList.remove('hidden');
    showMetricsModalState('metrics-loading-state');

    try {
        // Load subscriptions if not already loaded
        if (!window.currentSubscriptions) {
            await EarningsInvestmentsManager.loadStudentSubscriptions();
        }

        const subscriptions = window.currentSubscriptions;
        if (!subscriptions || subscriptions.length === 0) {
            showMetricsModalState('metrics-empty-state');
            populateMetricsSidebar([], 0);
            return;
        }

        // Show content
        showMetricsModalState('metrics-content');

        // Use first subscription if index is out of bounds
        const index = subscriptionIndex < subscriptions.length ? subscriptionIndex : 0;
        const sub = subscriptions[index];

        // Populate sidebar with all subscriptions
        populateMetricsSidebar(subscriptions, index);

    const startDate = new Date(sub.start_date || sub.created_at);
    const endDate = sub.end_date ? new Date(sub.end_date) : null;

    // Calculate metrics
    const totalImpressions = sub.total_impressions || 0;
    const clicks = sub.clicks || 0;
    const profileViews = sub.profile_views || 0;
    const studentConnections = sub.student_connections || 0;
    const amount = sub.amount || 0;

    const cpi = totalImpressions > 0 ? (amount / totalImpressions) : 0;
    const cpc = clicks > 0 ? (amount / clicks) : 0;
    const costPerConnection = studentConnections > 0 ? (amount / studentConnections) : 0;
    const ctr = totalImpressions > 0 ? ((clicks / totalImpressions) * 100) : 0;
    const conversionRate = profileViews > 0 ? ((studentConnections / profileViews) * 100) : 0;

    // ROI calculation (assuming 100 ${CurrencyManager.getSymbol()} estimated value per connection)
    const valuePerConnection = 100;
    const estimatedValue = studentConnections * valuePerConnection;
    const netGain = estimatedValue - amount;
    const roi = amount > 0 ? ((netGain / amount) * 100) : 0;

    // Progress bars
    const profileViewsPercent = clicks > 0 ? ((profileViews / clicks) * 100) : 0;
    const connectionsPercent = profileViews > 0 ? ((studentConnections / profileViews) * 100) : 0;

    // Populate modal header
    document.getElementById('metrics-plan-name').textContent = sub.plan_name || 'Subscription Plan';
    document.getElementById('metrics-amount').textContent = `${amount.toFixed(2)} ${CurrencyManager.getSymbol()}`;
    document.getElementById('metrics-period').textContent = endDate
        ? `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        : startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Key metrics summary
    document.getElementById('metrics-impressions').textContent = totalImpressions.toLocaleString();
    document.getElementById('metrics-cpi').textContent = cpi.toFixed(4);
    document.getElementById('metrics-clicks').textContent = clicks.toLocaleString();
    document.getElementById('metrics-roi').textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;

    // Engagement metrics
    document.getElementById('metrics-profile-views').textContent = profileViews.toLocaleString();
    document.getElementById('metrics-connections').textContent = studentConnections.toLocaleString();
    document.getElementById('metrics-ctr').textContent = `${ctr.toFixed(1)}%`;

    document.getElementById('metrics-profile-views-bar').style.width = `${profileViewsPercent}%`;
    document.getElementById('metrics-connections-bar').style.width = `${connectionsPercent}%`;
    document.getElementById('metrics-ctr-bar').style.width = `${Math.min(ctr * 10, 100)}%`;

    // ROI breakdown
    document.getElementById('roi-investment').textContent = `${amount.toFixed(2)} ${CurrencyManager.getSymbol()}`;
    document.getElementById('roi-value').textContent = `${estimatedValue.toFixed(2)} ${CurrencyManager.getSymbol()}`;
    document.getElementById('roi-gain').textContent = `${netGain >= 0 ? '+' : ''}${netGain.toFixed(2)} ${CurrencyManager.getSymbol()}`;
    document.getElementById('roi-percentage').textContent = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
    document.getElementById('roi-per-connection').textContent = `${valuePerConnection} ${CurrencyManager.getSymbol()}`;

    // Cost analysis
    document.getElementById('cost-cpi').textContent = `${cpi.toFixed(4)} ${CurrencyManager.getSymbol()}`;
    document.getElementById('cost-cpc').textContent = `${cpc.toFixed(2)} ${CurrencyManager.getSymbol()}`;
    document.getElementById('cost-connection').textContent = `${costPerConnection.toFixed(2)} ${CurrencyManager.getSymbol()}`;

    // Performance tips
    document.getElementById('tips-ctr').textContent = `${ctr.toFixed(1)}%`;
    document.getElementById('tips-conversion').textContent = `${conversionRate.toFixed(1)}%`;

    const ctrComparison = document.getElementById('tips-ctr-comparison');
    if (ctr >= 2.0) {
        ctrComparison.textContent = 'above average';
        ctrComparison.className = 'font-semibold text-green-600';
    } else {
        ctrComparison.textContent = 'below average';
        ctrComparison.className = 'font-semibold text-orange-600';
    }

        // Store current subscription for actions
        window.currentMetricsSubscription = sub;

    } catch (error) {
        console.error('Error loading performance metrics:', error);
        showMetricsModalState('metrics-error-state');
    }
}

/**
 * Close Performance Metrics Modal
 */
function closePerformanceMetricsModal() {
    const modal = document.getElementById('performance-metrics-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Download Subscription Invoice
 */
function downloadSubscriptionInvoice(subscriptionIndex) {
    const subscriptions = window.currentSubscriptions;
    if (!subscriptions || !subscriptions[subscriptionIndex]) {
        console.error('Subscription not found');
        return;
    }

    const sub = subscriptions[subscriptionIndex];
    alert(`Invoice download feature coming soon for subscription: ${sub.plan_name}`);
    // TODO: Implement invoice download API call
}

/**
 * View Subscription Details (For Students)
 * Shows detailed information about a subscription without performance metrics
 */
function viewSubscriptionDetails(subscriptionIndex) {
    const subscriptions = window.currentSubscriptions;
    if (!subscriptions || !subscriptions[subscriptionIndex]) {
        console.error('Subscription not found');
        return;
    }

    const sub = subscriptions[subscriptionIndex];
    const startDate = new Date(sub.start_date || sub.created_at);
    const endDate = sub.end_date ? new Date(sub.end_date) : null;
    const isActive = sub.status === 'active';

    // Create modal content
    const modalHTML = `
        <div id="subscription-details-modal" class="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">📋</span>
                        <div>
                            <h3 class="text-2xl font-bold">Subscription Details</h3>
                            <p class="text-blue-100 text-sm">View your subscription information</p>
                        </div>
                    </div>
                    <button onclick="closeSubscriptionDetailsModal()" class="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div class="p-6">
                    <div class="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="text-lg font-bold text-gray-800">${sub.plan_name || 'Subscription Plan'}</h4>
                                <p class="text-sm text-gray-600">${sub.description || 'Premium access'}</p>
                            </div>
                            <div class="text-right">
                                <div class="text-2xl font-bold text-blue-600">${(sub.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</div>
                                <span class="bg-${isActive ? 'green' : 'gray'}-100 text-${isActive ? 'green' : 'gray'}-800 text-xs px-3 py-1 rounded-full font-semibold">
                                    ${isActive ? 'Active' : 'Expired'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm text-gray-500 mb-2">Start Date</div>
                            <div class="text-lg font-semibold text-gray-800">${startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                        ${endDate ? `
                            <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div class="text-sm text-gray-500 mb-2">End Date</div>
                                <div class="text-lg font-semibold text-gray-800">${endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                        ` : ''}
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm text-gray-500 mb-2">Status</div>
                            <div class="text-lg font-semibold text-${isActive ? 'green' : 'gray'}-600">${sub.status || 'N/A'}</div>
                        </div>
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div class="text-sm text-gray-500 mb-2">Amount Paid</div>
                            <div class="text-lg font-semibold text-gray-800">${(sub.amount || 0).toFixed(2)} ${CurrencyManager.getSymbol()}</div>
                        </div>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
                        <div class="flex items-start gap-3">
                            <span class="text-2xl">ℹ️</span>
                            <div>
                                <h6 class="font-bold text-gray-800 mb-2">Subscription Information</h6>
                                <p class="text-sm text-gray-700">This subscription gives you access to premium features and content across the platform. Enjoy enhanced learning resources and priority support!</p>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-3">
                        <button onclick="downloadSubscriptionInvoice(${subscriptionIndex})" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Download Invoice
                        </button>
                        <button onclick="closeSubscriptionDetailsModal()" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Close Subscription Details Modal
 */
function closeSubscriptionDetailsModal() {
    const modal = document.getElementById('subscription-details-modal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Export Metrics Report
 */
function exportMetricsReport() {
    const sub = window.currentMetricsSubscription;
    if (!sub) return;

    alert(`Export metrics report feature coming soon for: ${sub.plan_name}`);
    // TODO: Implement metrics export (PDF/CSV)
}

// Initialize when switching to earnings-investments panel
document.addEventListener('DOMContentLoaded', () => {
    const originalSwitchPanel = window.switchPanel;
    window.switchPanel = function(panelName) {
        originalSwitchPanel(panelName);
        if (panelName === 'earnings-investments') {
            setTimeout(() => {
                EarningsInvestmentsManager.init();
                // Set initial section to total
                toggleEarningsSection('total');
            }, 100);
        }
    };
});

/**
 * Toggle subscriptions section visibility
 */
function toggleSubscriptionsSection() {
    const subscriptionsSection = document.getElementById('subscriptions-section');
    const purchaseHistorySection = document.getElementById('purchase-history-section');

    if (subscriptionsSection) {
        // Toggle subscriptions section
        subscriptionsSection.classList.toggle('hidden');

        // Hide purchase history section
        if (purchaseHistorySection) {
            purchaseHistorySection.classList.add('hidden');
        }

        // If showing subscriptions, load the data
        if (!subscriptionsSection.classList.contains('hidden')) {
            EarningsInvestmentsManager.loadStudentSubscriptions();
        }
    }
}

/**
 * Toggle purchase history section visibility
 */
function togglePurchaseHistorySection() {
    const purchaseHistorySection = document.getElementById('purchase-history-section');
    const subscriptionsSection = document.getElementById('subscriptions-section');

    if (purchaseHistorySection) {
        // Toggle purchase history section
        purchaseHistorySection.classList.toggle('hidden');

        // Hide subscriptions section
        if (subscriptionsSection) {
            subscriptionsSection.classList.add('hidden');
        }
    }
}

// ============================================
// GLOBAL EXPORTS (for onclick handlers in HTML)
// ============================================

// Export main manager to window
window.EarningsInvestmentsManager = EarningsInvestmentsManager;

// Export global functions used in HTML onclick handlers
window.switchEarningsTab = switchEarningsTab;
window.switchAffiliateTab = switchAffiliateTab;
window.toggleEarningsSection = toggleEarningsSection;
window.loadTotalEarningsData = loadTotalEarningsData;
window.loadAffiliateData = loadAffiliateData;
window.loadTutoringData = loadTutoringData;
window.showSubscriptionHistory = showSubscriptionHistory;
window.showTutoringPackages = showTutoringPackages;
window.showCourseMaterials = showCourseMaterials;
window.showPurchaseHistory = showPurchaseHistory;
window.resetInvestmentFilter = resetInvestmentFilter;
window.populateMetricsSidebar = populateMetricsSidebar;
window.switchMetricsView = switchMetricsView;
window.showMetricsModalState = showMetricsModalState;
window.closePerformanceMetricsModal = closePerformanceMetricsModal;
window.downloadSubscriptionInvoice = downloadSubscriptionInvoice;
window.viewSubscriptionDetails = viewSubscriptionDetails;
window.closeSubscriptionDetailsModal = closeSubscriptionDetailsModal;
window.exportMetricsReport = exportMetricsReport;
window.toggleSubscriptionsSection = toggleSubscriptionsSection;
window.togglePurchaseHistorySection = togglePurchaseHistorySection;
