/**
 * Earnings & Investments Manager
 * Handles earnings tracking and investment portfolio for tutor profiles
 */

const EarningsInvestmentsManager = {
    API_BASE_URL: window.API_BASE_URL || 'http://localhost:8000',
    charts: {},
    currentPeriod: {
        direct: 6,
        indirect: 6,
        tutoring: 6,
        total: 6
    },
    currentSection: 'total', // Track which section is active

    /**
     * Initialize the manager
     */
    init() {
        console.log('Initializing Earnings & Investments Manager...');
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
     * Get auth headers
     */
    getAuthHeaders() {
        const token = localStorage.getItem('token');
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
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/summary?months=6`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.updateEarningsSummaryUI(data);
            this.loadEarningsDetails();
        } catch (error) {
            console.error('Error loading earnings summary:', error);
        }
    },

    /**
     * Update earnings summary UI
     */
    updateEarningsSummaryUI(data) {
        document.getElementById('total-earnings').textContent = `${data.total_earnings.toFixed(2)} ETB`;
        document.getElementById('direct-affiliate-earnings').textContent = `${data.total_direct_affiliate.toFixed(2)} ETB`;
        document.getElementById('indirect-affiliate-earnings').textContent = `${data.total_indirect_affiliate.toFixed(2)} ETB`;
        document.getElementById('tutoring-earnings').textContent = `${data.total_tutoring.toFixed(2)} ETB`;

        // Update widget in sidebar
        if (document.getElementById('current-month-earnings')) {
            const currentMonth = data.monthly_data[0];
            if (currentMonth) {
                document.getElementById('current-month-earnings').textContent = currentMonth.total_earnings.toFixed(2);
            }
        }
    },

    /**
     * Load earnings details (lists)
     */
    async loadEarningsDetails() {
        await Promise.all([
            this.loadTotalEarningsData(),
            this.loadDirectAffiliateData(),
            this.loadIndirectAffiliateData(),
            this.loadTutoringData()
        ]);
    },

    /**
     * Load direct affiliate data
     */
    async loadDirectAffiliateData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/direct-affiliate?limit=20`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.renderDirectAffiliateList(data);
        } catch (error) {
            console.error('Error loading direct affiliate data:', error);
        }
    },

    /**
     * Render direct affiliate list
     */
    renderDirectAffiliateList(data) {
        const container = document.getElementById('direct-affiliate-list');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No direct affiliate earnings yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex items-center gap-4">
                    <img src="../${item.referred_user_profile_picture || 'uploads/system_images/system_profile_pictures/man-user.png'}"
                        alt="${item.referred_user_name}"
                        class="w-12 h-12 rounded-full object-cover">
                    <div>
                        <p class="font-semibold text-gray-800">${item.referred_user_name}</p>
                        <p class="text-sm text-gray-600">${item.source || 'Referral'}</p>
                        <p class="text-xs text-gray-500">${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-blue-600">${item.amount.toFixed(2)} ETB</p>
                    <p class="text-xs text-gray-600">${item.commission_percentage}% commission</p>
                    <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }">${item.status}</span>
                </div>
            </div>
        `).join('');
    },

    /**
     * Load indirect affiliate data
     */
    async loadIndirectAffiliateData() {
        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/indirect-affiliate?limit=20`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.renderIndirectAffiliateList(data);
        } catch (error) {
            console.error('Error loading indirect affiliate data:', error);
        }
    },

    /**
     * Render indirect affiliate list
     */
    renderIndirectAffiliateList(data) {
        const container = document.getElementById('indirect-affiliate-list');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No indirect affiliate earnings yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(item => `
            <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div class="flex-1">
                    <p class="font-semibold text-gray-800 mb-1">${item.referred_by_name} → ${item.end_user_name}</p>
                    <p class="text-sm text-gray-600">${item.source || 'Indirect Referral'} • Level ${item.levels_deep}</p>
                    <p class="text-xs text-gray-500">${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
                <div class="text-right">
                    <p class="text-xl font-bold text-purple-600">${item.amount.toFixed(2)} ETB</p>
                    <p class="text-xs text-gray-600">${item.commission_percentage}% commission</p>
                    <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }">${item.status}</span>
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
            const [directData, indirectData, tutoringData] = await Promise.all([
                fetch(`${this.API_BASE_URL}/api/tutor/earnings/direct-affiliate?limit=50`, {
                    headers: this.getAuthHeaders()
                }).then(res => res.json()),
                fetch(`${this.API_BASE_URL}/api/tutor/earnings/indirect-affiliate?limit=50`, {
                    headers: this.getAuthHeaders()
                }).then(res => res.json()),
                fetch(`${this.API_BASE_URL}/api/tutor/earnings/tutoring?limit=50`, {
                    headers: this.getAuthHeaders()
                }).then(res => res.json())
            ]);

            this.renderTotalEarningsList(directData, indirectData, tutoringData);
        } catch (error) {
            console.error('Error loading total earnings data:', error);
        }
    },

    /**
     * Render total earnings list (all sources combined)
     */
    renderTotalEarningsList(directData, indirectData, tutoringData) {
        const container = document.getElementById('total-earnings-list');
        if (!container) return;

        // Combine all data sources and add type indicator
        const combinedData = [
            ...directData.map(item => ({ ...item, type: 'direct', sortDate: new Date(item.earned_date) })),
            ...indirectData.map(item => ({ ...item, type: 'indirect', sortDate: new Date(item.earned_date) })),
            ...tutoringData.map(item => ({ ...item, type: 'tutoring', sortDate: new Date(item.earned_date) }))
        ];

        // Sort by date (newest first)
        combinedData.sort((a, b) => b.sortDate - a.sortDate);

        if (combinedData.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <p>No earnings yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = combinedData.map(item => {
            let content = '';

            if (item.type === 'direct') {
                content = `
                    <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">👥</div>
                            <img src="../${item.referred_user_profile_picture || 'uploads/system_images/system_profile_pictures/man-user.png'}"
                                alt="${item.referred_user_name}"
                                class="w-12 h-12 rounded-full object-cover">
                            <div>
                                <p class="font-semibold text-gray-800">${item.referred_user_name}</p>
                                <p class="text-sm text-gray-600">Direct Affiliate • ${item.source || 'Referral'}</p>
                                <p class="text-xs text-gray-500">${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-bold text-blue-600">${item.amount.toFixed(2)} ETB</p>
                            <p class="text-xs text-gray-600">${item.commission_percentage}% commission</p>
                            <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }">${item.status}</span>
                        </div>
                    </div>
                `;
            } else if (item.type === 'indirect') {
                content = `
                    <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg">🔗</div>
                            <div>
                                <p class="font-semibold text-gray-800">${item.referred_by_name} → ${item.end_user_name}</p>
                                <p class="text-sm text-gray-600">Indirect Affiliate • Level ${item.levels_deep}</p>
                                <p class="text-xs text-gray-500">${new Date(item.earned_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-bold text-purple-600">${item.amount.toFixed(2)} ETB</p>
                            <p class="text-xs text-gray-600">${item.commission_percentage}% commission</p>
                            <span class="inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                                item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }">${item.status}</span>
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
                                <p class="font-semibold text-gray-800">${item.student_name}</p>
                                <p class="text-sm text-gray-600">Tutoring Session • ${item.subject || 'General'}</p>
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
        this.initializeDirectAffiliateChart();
        this.initializeIndirectAffiliateChart();
        this.initializeTutoringChart();
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

            const data = await response.json();
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
     * Initialize direct affiliate chart
     */
    async initializeDirectAffiliateChart() {
        const ctx = document.getElementById('direct-affiliate-chart');
        if (!ctx) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/summary?months=6`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            const monthlyData = data.monthly_data.reverse();

            const labels = monthlyData.map(d => {
                const date = new Date(d.year, d.month - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });

            const values = monthlyData.map(d => d.direct_affiliate_earnings);

            if (this.charts.directAffiliate) {
                this.charts.directAffiliate.destroy();
            }

            this.charts.directAffiliate = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Direct Affiliate Earnings (ETB)',
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
            console.error('Error initializing direct affiliate chart:', error);
        }
    },

    /**
     * Initialize indirect affiliate chart
     */
    async initializeIndirectAffiliateChart() {
        const ctx = document.getElementById('indirect-affiliate-chart');
        if (!ctx) return;

        try {
            const response = await fetch(`${this.API_BASE_URL}/api/tutor/earnings/summary?months=6`, {
                headers: this.getAuthHeaders()
            });

            const data = await response.json();
            const monthlyData = data.monthly_data.reverse();

            const labels = monthlyData.map(d => {
                const date = new Date(d.year, d.month - 1);
                return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            });

            const values = monthlyData.map(d => d.indirect_affiliate_earnings);

            if (this.charts.indirectAffiliate) {
                this.charts.indirectAffiliate.destroy();
            }

            this.charts.indirectAffiliate = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Indirect Affiliate Earnings (ETB)',
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
            console.error('Error initializing indirect affiliate chart:', error);
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

            const data = await response.json();
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

function loadDirectAffiliateData() {
    EarningsInvestmentsManager.loadDirectAffiliateData();
    EarningsInvestmentsManager.initializeDirectAffiliateChart();
}

function loadIndirectAffiliateData() {
    EarningsInvestmentsManager.loadIndirectAffiliateData();
    EarningsInvestmentsManager.initializeIndirectAffiliateChart();
}

function loadTutoringData() {
    EarningsInvestmentsManager.loadTutoringData();
    EarningsInvestmentsManager.initializeTutoringChart();
}

/**
 * Toggle earnings sections - show only the selected section
 */
function toggleEarningsSection(section) {
    console.log('Toggling section:', section);

    // Update current section
    EarningsInvestmentsManager.currentSection = section;

    // Get all sections and cards
    const sections = {
        total: document.getElementById('total-earnings-section'),
        direct: document.getElementById('direct-affiliate-section'),
        indirect: document.getElementById('indirect-affiliate-section'),
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

    // Add active state to the clicked card
    const cardIndex = { total: 0, direct: 1, indirect: 2, tutoring: 3 };
    if (cards[cardIndex[section]]) {
        cards[cardIndex[section]].classList.add('active-earnings-card', 'ring-2', 'ring-blue-500');
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
