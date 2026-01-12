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
            totalEarningsEl.textContent = `${totalEarnings.toFixed(2)} ETB`;
        }

        // Combined affiliate earnings
        const affiliateEarningsEl = document.getElementById('affiliate-earnings');
        if (affiliateEarningsEl) {
            affiliateEarningsEl.textContent = `${affiliateEarnings.toFixed(2)} ETB`;
        }

        // Tutoring earnings
        const tutoringEarningsEl = document.getElementById('tutoring-earnings');
        if (tutoringEarningsEl) {
            tutoringEarningsEl.textContent = `${tutoringEarnings.toFixed(2)} ETB`;
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
                    <p class="text-xl font-bold text-blue-600">${item.amount?.toFixed(2) || '0.00'} ETB</p>
                    <p class="text-xs text-gray-600">CPM: ${item.cpm?.toFixed(2) || '0.00'} ETB</p>
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
                    <p class="text-xl font-bold text-purple-600">${item.amount?.toFixed(2) || '0.00'} ETB</p>
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
                    <p class="text-xl font-bold text-green-600">${item.amount?.toFixed(2) || '0.00'} ETB</p>
                    <p class="text-xs text-gray-600">${item.commission_rate || 0}% of ${item.transaction_amount?.toFixed(2) || '0.00'} ETB</p>
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
                    <p class="text-xl font-bold text-orange-600">${item.amount.toFixed(2)} ETB</p>
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
                            <p class="text-xl font-bold text-blue-600">${(item.amount || 0).toFixed(2)} ETB</p>
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
                            <p class="text-xl font-bold text-purple-600">${(item.amount || 0).toFixed(2)} ETB</p>
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
                            <p class="text-xl font-bold text-green-600">${(item.amount || 0).toFixed(2)} ETB</p>
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
                            <p class="text-xl font-bold text-orange-600">${(item.amount || 0).toFixed(2)} ETB</p>
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
                        y: { beginAtZero: true, ticks: { callback: v => v.toFixed(0) + ' ETB' } }
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
                        y: { beginAtZero: true, ticks: { callback: v => v.toFixed(0) + ' ETB' } }
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
                        y: { beginAtZero: true, ticks: { callback: v => v.toFixed(0) + ' ETB' } }
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
                                        return 'Total Earnings: ' + context.parsed.y.toFixed(2) + ' ETB';
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
                                    return value.toFixed(0) + ' ETB';
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
                                    return value.toFixed(0) + ' ETB';
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
        document.getElementById('total-invested').textContent = `${data.total_invested.toFixed(2)} ETB`;
        document.getElementById('total-impressions').textContent = data.total_impressions || 0;

        // Calculate average CPM
        const avgCpm = data.total_impressions > 0 ? (data.total_invested / data.total_impressions) * 1000 : 0;
        document.getElementById('average-cpm').textContent = `${avgCpm.toFixed(2)} ETB`;
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
                            <p class="text-2xl font-bold text-blue-600">${inv.amount.toFixed(2)} ETB</p>
                            <p class="text-xs text-gray-500 mt-1">${new Date(inv.investment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-600 mb-1">Total Impressions</p>
                            <p class="text-2xl font-bold text-gray-800">${impressions.toLocaleString()}</p>
                            <p class="text-xs text-gray-500 mt-1">CPM: <span class="font-semibold text-green-600">${cpm.toFixed(2)} ETB</span></p>
                        </div>
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
