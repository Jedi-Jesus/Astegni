// advertiser-profile.js - Premium Dashboard JavaScript

// Global State Management
const AppState = {
    theme: localStorage.getItem('theme') || 'light',
    user: {
        name: 'EduAds Inc.',
        email: 'contact@eduads.com',
        location: 'Addis Ababa, Ethiopia',
        phone: '+251 912 345 680',
        profilePic: 'https://via.placeholder.com/200',
        coverPic: 'https://via.placeholder.com/1920x400/F59E0B/FFFFFF?text=Cover',
        verified: true,
        premium: true,
        level: 12
    },
    campaigns: [],
    filteredCampaigns: [],
    notifications: {
        all: [],
        unread: [],
        campaigns: [],
        system: []
    },
    analytics: {
        totalLikes: 142800,
        impressions: 2400000,
        clickRate: 8.7,
        conversions: 12847
    },
    currentCampaignId: null,
    timelineDay: 20,
    campaignDuration: 30
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    initializeApp();
    initializeTheme();
    initializeSidebar();
    initializeProfile();
    initializeCampaigns();
    initializeEventListeners();
    initializeNotifications();
    initializeActivityFeed();
    initializeInsights();
    
    // Ensure Chart.js is loaded before initializing charts
    let chartCheckInterval = setInterval(() => {
        if (typeof Chart !== 'undefined') {
            console.log('Chart.js is loaded, initializing charts...');
            clearInterval(chartCheckInterval);
            
            // Initialize all charts
            setTimeout(() => {
                initializeCharts();
                initializeTimeline();
            }, 100);
        } else {
            console.log('Waiting for Chart.js to load...');
        }
    }, 100);
    
    // Fallback: Try to load charts after 3 seconds anyway
    setTimeout(() => {
        if (typeof Chart !== 'undefined' && !window.chartsInitialized) {
            console.log('Fallback chart initialization...');
            initializeCharts();
            initializeTimeline();
        }
    }, 3000);
    
    hideLoadingScreen();
});

// App Initialization
function initializeApp() {
    document.documentElement.setAttribute('data-theme', AppState.theme);
    initializeTooltips();
    initializeLazyLoading();
    initializeAnimations();
}

// Theme Management
function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle-btn');
    const currentTheme = AppState.theme;
    
    updateThemeUI(currentTheme);
    themeToggle?.addEventListener('click', toggleTheme);
}

function toggleTheme() {
    const newTheme = AppState.theme === 'light' ? 'dark' : 'light';
    AppState.theme = newTheme;
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeUI(newTheme);
    updateChartsTheme();
}

function updateThemeUI(theme) {
    const sunIcon = document.querySelector('.sun-icon');
    const moonIcon = document.querySelector('.moon-icon');
    
    if (theme === 'dark') {
        sunIcon?.classList.add('hidden');
        moonIcon?.classList.remove('hidden');
    } else {
        moonIcon?.classList.add('hidden');
        sunIcon?.classList.remove('hidden');
    }
}

// Profile Dropdown Fix
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown-menu');
    const arrow = document.querySelector('.dropdown-arrow');

    if (dropdown) {
        const isOpen = dropdown.classList.contains('show');
        if (isOpen) {
            dropdown.classList.remove('show');
            arrow?.classList.remove('rotate-180');
        } else {
            dropdown.classList.add('show');
            arrow?.classList.add('rotate-180');
        }
    }
}

// Sidebar Management
function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mainWrapper = document.getElementById('main-wrapper');
    
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
    mainWrapper?.classList.remove('sidebar-open');
    
    window.addEventListener('scroll', updateSidebarHeight);
    updateSidebarHeight();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mainWrapper = document.getElementById('main-wrapper');
    const hamburger = document.getElementById('hamburger');
    
    const isOpen = sidebar?.classList.contains('active');
    
    if (isOpen) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mainWrapper = document.getElementById('main-wrapper');
    const hamburger = document.getElementById('hamburger');
    
    sidebar?.classList.add('active');
    overlay?.classList.add('active');
    mainWrapper?.classList.add('sidebar-open');
    hamburger?.classList.add('active');
    
    animateHamburger(true);
    trapFocus(sidebar);
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const mainWrapper = document.getElementById('main-wrapper');
    const hamburger = document.getElementById('hamburger');
    
    sidebar?.classList.remove('active');
    overlay?.classList.remove('active');
    mainWrapper?.classList.remove('sidebar-open');
    hamburger?.classList.remove('active');
    
    animateHamburger(false);
    restoreFocus();
    document.body.style.overflow = '';
}

function animateHamburger(isOpen) {
    const hamburger = document.getElementById('hamburger');
    if (!hamburger) return;
    
    const spans = hamburger.querySelectorAll('span');
    if (isOpen) {
        spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
    } else {
        spans[0].style.transform = '';
        spans[1].style.opacity = '1';
        spans[2].style.transform = '';
    }
}

function updateSidebarHeight() {
    const sidebar = document.getElementById('sidebar');
    const footer = document.querySelector('.footer-section');
    
    if (!sidebar || !footer) return;
    
    const footerRect = footer.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const footerVisible = Math.max(0, windowHeight - footerRect.top);
    
    if (footerVisible > 0) {
        sidebar.style.height = `calc(100vh - ${footerVisible}px)`;
    } else {
        sidebar.style.height = '100vh';
    }
}

// Profile Management
function initializeProfile() {
    updateProfileUI();
    loadProfileStats();
}

function updateProfileUI() {
    document.getElementById('hero-name').textContent = AppState.user.name;
    document.getElementById('hero-avatar').src = AppState.user.profilePic;
    document.getElementById('hero-cover').src = AppState.user.coverPic;
    document.getElementById('nav-profile-name').textContent = AppState.user.name;
    document.getElementById('nav-profile-pic').src = AppState.user.profilePic;
}

function loadProfileStats() {
    // Update total likes instead of revenue
    animateValue('stat-likes', 0, AppState.analytics.totalLikes, 2000);
    animateValue('stat-total-impressions', 0, AppState.analytics.impressions, 2000);
    animateValue('stat-ctr', 0, AppState.analytics.clickRate, 2000);
    animateValue('stat-conversions', 0, AppState.analytics.conversions, 2000);
    
    // Update hero stats
    document.getElementById('stat-campaigns').textContent = '247';
    document.getElementById('stat-impressions').textContent = '2.4M';
    document.getElementById('stat-followers').textContent = '12.5K';
    document.getElementById('stat-success').textContent = '98%';
    document.getElementById('stat-rating').textContent = '4.9/5';
}

// Enhanced Campaign Management
function initializeCampaigns() {
    loadCampaigns();
    renderCampaigns();
}

function loadCampaigns() {
    AppState.campaigns = [
        {
            id: 1,
            name: 'Summer Education Drive',
            status: 'active',
            budget: 45000,
            spent: 32000,
            impressions: 450000,
            clicks: 28000,
            conversions: 1250,
            followers: 2340,
            likes: 18500,
            startDate: '2025-06-01',
            endDate: '2025-08-31',
            performance: 'excellent'
        },
        {
            id: 2,
            name: 'Back to School Campaign',
            status: 'scheduled',
            budget: 75000,
            spent: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            followers: 0,
            likes: 0,
            startDate: '2025-09-01',
            endDate: '2025-09-30',
            performance: 'pending'
        },
        {
            id: 3,
            name: 'Math Tutoring Promo',
            status: 'active',
            budget: 25000,
            spent: 18500,
            impressions: 280000,
            clicks: 15000,
            conversions: 850,
            followers: 1120,
            likes: 12300,
            startDate: '2025-07-15',
            endDate: '2025-08-15',
            performance: 'good'
        },
        {
            id: 4,
            name: 'Online Learning Platform',
            status: 'completed',
            budget: 50000,
            spent: 50000,
            impressions: 620000,
            clicks: 45000,
            conversions: 2100,
            followers: 3450,
            likes: 28900,
            startDate: '2025-04-01',
            endDate: '2025-05-31',
            performance: 'excellent'
        },
        {
            id: 5,
            name: 'STEM Workshop Series',
            status: 'draft',
            budget: 30000,
            spent: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            followers: 0,
            likes: 0,
            startDate: '2025-10-01',
            endDate: '2025-10-31',
            performance: 'pending'
        },
        {
            id: 6,
            name: 'Language Learning App',
            status: 'under-review',
            budget: 40000,
            spent: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            followers: 0,
            likes: 0,
            startDate: '2025-09-15',
            endDate: '2025-10-15',
            performance: 'pending'
        },
        {
            id: 7,
            name: 'Career Guidance Program',
            status: 'approved',
            budget: 35000,
            spent: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            followers: 0,
            likes: 0,
            startDate: '2025-08-20',
            endDate: '2025-09-20',
            performance: 'pending'
        },
        {
            id: 8,
            name: 'Art & Design Course',
            status: 'rejected',
            budget: 20000,
            spent: 0,
            impressions: 0,
            clicks: 0,
            conversions: 0,
            followers: 0,
            likes: 0,
            startDate: '2025-07-01',
            endDate: '2025-07-31',
            performance: 'failed'
        }
    ];
    AppState.filteredCampaigns = [...AppState.campaigns];
}

function renderCampaigns() {
    const grid = document.getElementById('campaigns-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (AppState.filteredCampaigns.length === 0) {
        grid.innerHTML = `
            <div class="no-campaigns" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p style="color: var(--text-muted);">No campaigns found</p>
            </div>
        `;
        return;
    }
    
    AppState.filteredCampaigns.forEach((campaign, index) => {
        const card = createEnhancedCampaignCard(campaign, index);
        grid.appendChild(card);
    });
}

function createEnhancedCampaignCard(campaign, index) {
    const card = document.createElement('div');
    card.className = `campaign-card gradient-${(index % 4) + 1}`;
    card.style.animationDelay = `${index * 0.1}s`;
    
    card.innerHTML = `
        <div class="campaign-header">
            <h3 class="campaign-name">${campaign.name}</h3>
            <span class="campaign-status ${campaign.status}">${campaign.status.replace('-', ' ')}</span>
        </div>
        
        <div class="social-metrics">
            <div class="social-metric">
                <div class="social-metric-icon followers">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                    </svg>
                </div>
                <div class="social-metric-value">
                    <span class="social-metric-number">${formatNumber(campaign.followers)}</span>
                    <span class="social-metric-label">New Followers</span>
                </div>
            </div>
            <div class="social-metric">
                <div class="social-metric-icon likes">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                    </svg>
                </div>
                <div class="social-metric-value">
                    <span class="social-metric-number">${formatNumber(campaign.likes)}</span>
                    <span class="social-metric-label">Total Likes</span>
                </div>
            </div>
        </div>
        
        <div class="campaign-metrics">
            <div class="metric">
                <span class="metric-label">Budget</span>
                <span class="metric-value">${formatCurrency(campaign.budget)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Spent</span>
                <span class="metric-value">${formatCurrency(campaign.spent)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Impressions</span>
                <span class="metric-value">${formatNumber(campaign.impressions)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">Clicks</span>
                <span class="metric-value">${formatNumber(campaign.clicks)}</span>
            </div>
            <div class="metric">
                <span class="metric-label">CTR</span>
                <span class="metric-value">${calculateCTR(campaign.clicks, campaign.impressions)}%</span>
            </div>
            <div class="metric">
                <span class="metric-label">Conversions</span>
                <span class="metric-value">${formatNumber(campaign.conversions)}</span>
            </div>
        </div>
        
        <div class="campaign-progress">
            <div class="progress-header">
                <span class="progress-label">Budget Utilization</span>
                <span class="progress-percentage">${Math.round(campaign.spent / campaign.budget * 100)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(campaign.spent / campaign.budget * 100)}%"></div>
            </div>
        </div>
        
        <div class="campaign-actions">
            <button class="btn-campaign primary" onclick="viewCampaignDetails(${campaign.id})">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
                View
            </button>
            <button class="btn-campaign secondary" onclick="editCampaignDetails(${campaign.id})">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
                Edit
            </button>
            <button class="btn-campaign accent" onclick="viewCampaignAnalytics(${campaign.id})">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                Analytics
            </button>
        </div>
    `;
    
    return card;
}

// Campaign Filtering
function filterCampaigns(status) {
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter campaigns
    if (status === 'all') {
        AppState.filteredCampaigns = [...AppState.campaigns];
    } else {
        AppState.filteredCampaigns = AppState.campaigns.filter(c => c.status === status);
    }
    
    renderCampaigns();
}

function searchCampaigns() {
    const searchTerm = document.getElementById('campaign-search').value.toLowerCase();
    
    if (searchTerm === '') {
        AppState.filteredCampaigns = [...AppState.campaigns];
    } else {
        AppState.filteredCampaigns = AppState.campaigns.filter(campaign => 
            campaign.name.toLowerCase().includes(searchTerm)
        );
    }
    
    renderCampaigns();
}

// Campaign Actions
function viewCampaignDetails(id) {
    const campaign = AppState.campaigns.find(c => c.id === id);
    if (!campaign) return;
    
    AppState.currentCampaignId = id;
    
    const content = document.getElementById('campaign-details-content');
    content.innerHTML = `
        <div class="campaign-details">
            <div class="detail-header">
                <h3>${campaign.name}</h3>
                <span class="campaign-status ${campaign.status}">${campaign.status.replace('-', ' ')}</span>
            </div>
            
            <div class="detail-grid">
                <div class="detail-card">
                    <h4>Campaign Overview</h4>
                    <div class="detail-item">
                        <span>Start Date:</span>
                        <strong>${formatDate(campaign.startDate)}</strong>
                    </div>
                    <div class="detail-item">
                        <span>End Date:</span>
                        <strong>${formatDate(campaign.endDate)}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Total Budget:</span>
                        <strong>${formatCurrency(campaign.budget)}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Amount Spent:</span>
                        <strong>${formatCurrency(campaign.spent)}</strong>
                    </div>
                </div>
                
                <div class="detail-card">
                    <h4>Performance Metrics</h4>
                    <div class="detail-item">
                        <span>Impressions:</span>
                        <strong>${formatNumber(campaign.impressions)}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Clicks:</span>
                        <strong>${formatNumber(campaign.clicks)}</strong>
                    </div>
                    <div class="detail-item">
                        <span>CTR:</span>
                        <strong>${calculateCTR(campaign.clicks, campaign.impressions)}%</strong>
                    </div>
                    <div class="detail-item">
                        <span>Conversions:</span>
                        <strong>${formatNumber(campaign.conversions)}</strong>
                    </div>
                </div>
                
                <div class="detail-card">
                    <h4>Social Impact</h4>
                    <div class="detail-item">
                        <span>New Followers:</span>
                        <strong>${formatNumber(campaign.followers)}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Total Likes:</span>
                        <strong>${formatNumber(campaign.likes)}</strong>
                    </div>
                    <div class="detail-item">
                        <span>Engagement Rate:</span>
                        <strong>${((campaign.likes / campaign.impressions) * 100).toFixed(2)}%</strong>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    openModal('view-campaign-modal');
}

function editCampaignDetails(id) {
    const campaign = AppState.campaigns.find(c => c.id === id);
    if (!campaign) return;
    
    // Populate edit form
    document.getElementById('campaign-name').value = campaign.name;
    document.getElementById('campaign-budget').value = campaign.budget;
    
    openModal('create-campaign-modal');
}

function viewCampaignAnalytics(id) {
    const campaign = AppState.campaigns.find(c => c.id === id);
    if (!campaign) return;
    
    AppState.currentCampaignId = id;
    
    const content = document.getElementById('campaign-analytics-content');
    content.innerHTML = `
        <div class="analytics-overview">
            <h3>${campaign.name} - Analytics</h3>
            
            <div class="analytics-metrics-grid">
                <div class="analytics-metric-card">
                    <div class="analytics-metric-value">${formatNumber(campaign.impressions)}</div>
                    <div class="analytics-metric-label">Total Impressions</div>
                </div>
                <div class="analytics-metric-card">
                    <div class="analytics-metric-value">${formatNumber(campaign.clicks)}</div>
                    <div class="analytics-metric-label">Total Clicks</div>
                </div>
                <div class="analytics-metric-card">
                    <div class="analytics-metric-value">${calculateCTR(campaign.clicks, campaign.impressions)}%</div>
                    <div class="analytics-metric-label">Click-Through Rate</div>
                </div>
                <div class="analytics-metric-card">
                    <div class="analytics-metric-value">${formatNumber(campaign.conversions)}</div>
                    <div class="analytics-metric-label">Conversions</div>
                </div>
            </div>
            
            <div class="analytics-chart-container">
                <h4>Performance Over Time</h4>
                <canvas id="campaign-performance-chart"></canvas>
            </div>
            
            <div class="analytics-chart-container">
                <h4>Audience Demographics</h4>
                <canvas id="campaign-demographics-chart"></canvas>
            </div>
        </div>
    `;
    
    openModal('campaign-analytics-modal');
    
    // Initialize charts after modal opens
    setTimeout(() => {
        initializeCampaignAnalyticsCharts();
    }, 300);
}

function initializeCampaignAnalyticsCharts() {
    // Performance chart
    const perfCanvas = document.getElementById('campaign-performance-chart');
    if (perfCanvas) {
        new Chart(perfCanvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Impressions',
                    data: [50000, 120000, 180000, 250000],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Clicks',
                    data: [2000, 5500, 8500, 12000],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    
    // Demographics chart
    const demoCanvas = document.getElementById('campaign-demographics-chart');
    if (demoCanvas) {
        new Chart(demoCanvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Students', 'Parents', 'Educators', 'Others'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Notifications Management
function initializeNotifications() {
    // Sample notifications
    AppState.notifications.all = [
        {
            id: 1,
            type: 'success',
            title: 'Campaign Approved',
            message: 'Your "Summer Education" campaign has been approved and is now live.',
            time: '2 hours ago',
            category: 'campaigns',
            unread: true
        },
        {
            id: 2,
            type: 'info',
            title: 'New Feature Available',
            message: 'Check out our new AI-powered campaign optimization tool.',
            time: '1 day ago',
            category: 'system',
            unread: true
        },
        {
            id: 3,
            type: 'warning',
            title: 'Budget Alert',
            message: 'Your "Math Tutoring Promo" campaign has used 75% of its budget.',
            time: '3 days ago',
            category: 'campaigns',
            unread: false
        },
        {
            id: 4,
            type: 'success',
            title: 'Milestone Reached',
            message: 'Congratulations! You\'ve reached 1 million impressions.',
            time: '1 week ago',
            category: 'system',
            unread: false
        }
    ];
    
    updateNotificationCategories();
    updateNotificationBadge();
}

function updateNotificationCategories() {
    AppState.notifications.unread = AppState.notifications.all.filter(n => n.unread);
    AppState.notifications.campaigns = AppState.notifications.all.filter(n => n.category === 'campaigns');
    AppState.notifications.system = AppState.notifications.all.filter(n => n.category === 'system');
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-count');
    const unreadCount = AppState.notifications.unread.length;
    
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

function filterNotifications(filter) {
    // Update active tab
    document.querySelectorAll('.notif-filter').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Get filtered notifications
    let filtered = [];
    switch(filter) {
        case 'all':
            filtered = AppState.notifications.all;
            break;
        case 'unread':
            filtered = AppState.notifications.unread;
            break;
        case 'campaigns':
            filtered = AppState.notifications.campaigns;
            break;
        case 'system':
            filtered = AppState.notifications.system;
            break;
        default:
            filtered = AppState.notifications.all;
    }
    
    renderNotifications(filtered);
}

function renderNotifications(notifications) {
    const list = document.querySelector('.notification-list');
    if (!list) return;
    
    list.innerHTML = '';
    
    if (notifications.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                No notifications found
            </div>
        `;
        return;
    }
    
    notifications.forEach(notif => {
        const item = document.createElement('div');
        item.className = `notification-item ${notif.unread ? 'unread' : ''}`;
        item.innerHTML = `
            <div class="notif-icon ${notif.type}">
                ${getNotificationIcon(notif.type)}
            </div>
            <div class="notif-content">
                <h4>${notif.title}</h4>
                <p>${notif.message}</p>
                <span class="notif-time">${notif.time}</span>
            </div>
        `;
        list.appendChild(item);
    });
}

function getNotificationIcon(type) {
    const icons = {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>',
        error: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>'
    };
    return icons[type] || icons.info;
}

function openNotificationCenter() {
    openModal('notification-center-modal');
    renderNotifications(AppState.notifications.all);
}

function markAllRead() {
    AppState.notifications.all.forEach(n => n.unread = false);
    updateNotificationCategories();
    updateNotificationBadge();
    renderNotifications(AppState.notifications.all);
    notifications.show('All notifications marked as read', 'success');
}

// Timeline Slider
function initializeTimeline() {
    const slider = document.getElementById('timeline-slider');
    if (!slider) return;
    
    slider.addEventListener('input', updateTimeline);
    updateTimeline();
}

function updateTimeline() {
    const slider = document.getElementById('timeline-slider');
    const daySpan = document.getElementById('timeline-day');
    const statusSpan = document.getElementById('timeline-status');
    
    const day = parseInt(slider.value);
    AppState.timelineDay = day;
    
    daySpan.textContent = `Day ${day}`;
    
    if (day < 20) {
        statusSpan.textContent = 'Past';
        statusSpan.className = 'timeline-status past';
    } else if (day === 20) {
        statusSpan.textContent = 'Current';
        statusSpan.className = 'timeline-status';
    } else if (day <= 30) {
        statusSpan.textContent = 'Forecast';
        statusSpan.className = 'timeline-status future';
    } else {
        statusSpan.textContent = 'Future Projection';
        statusSpan.className = 'timeline-status future';
    }
    
    updateAnalyticsCharts(day);
}

// Initialize Charts with Timeline
function initializeCharts() {
    console.log('InitializeCharts called');
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.error('Chart.js is not loaded! Please check if chart.min.js is included');
        
        // Try to load Chart.js from CDN as fallback
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => {
            console.log('Chart.js loaded from CDN');
            setTimeout(() => {
                initializeCharts();
            }, 100);
        };
        document.head.appendChild(script);
        return;
    }
    
    // Mark charts as initialized
    window.chartsInitialized = true;
    
    console.log('Chart.js version:', Chart.version || 'Unknown');
    
    // Initialize stat charts
    initializeStatCharts();
    
    // Initialize analytics charts with data
    initializeAnalyticsChartsWithData();
}

function initializeAnalyticsChartsWithData() {
    console.log('Initializing analytics charts with data...');
    
    // Success Rate Chart
    const successCanvas = document.getElementById('success-rate-chart');
    console.log('Success canvas element:', successCanvas);
    
    if (successCanvas && successCanvas.getContext) {
        try {
            const ctx = successCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.successRateChart) {
                window.successRateChart.destroy();
            }
            
            window.successRateChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Day 0', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30', 'Day 35', 'Day 40', 'Day 45', 'Day 50', 'Day 55', 'Day 60'],
                    datasets: [{
                        label: 'Actual Success Rate (%)',
                        data: [0.5, 0.55, 0.62, 0.71, 0.85, null, null, null, null, null, null, null, null],
                        borderColor: 'rgb(16, 185, 129)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        tension: 0.4
                    }, {
                        label: 'Forecast Success Rate (%)',
                        data: [null, null, null, null, 0.85, 0.92, 0.98, 1.05, 1.12, 1.18, 1.23, 1.28, 1.32],
                        borderColor: 'rgb(139, 92, 246)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        tension: 0.4
                    }, {
                        label: 'Conversion Rate (%)',
                        data: [8.5, 8.7, 9.0, 9.3, 9.8, 10.2, 10.6, 11.0, 11.3, 11.6, 11.9, 12.2, 12.5],
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            beginAtZero: true,
                            max: 1.5,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            beginAtZero: true,
                            max: 15,
                            grid: {
                                drawOnChartArea: false
                            },
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            console.log('Success Rate chart created successfully');
        } catch (error) {
            console.error('Error creating Success Rate chart:', error);
        }
    } else {
        console.error('Success Rate canvas not found or invalid');
    }
    
    // Traffic Sources Chart
    const trafficCanvas = document.getElementById('traffic-sources-chart');
    console.log('Traffic canvas element:', trafficCanvas);
    
    if (trafficCanvas && trafficCanvas.getContext) {
        try {
            const ctx = trafficCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.trafficChart) {
                window.trafficChart.destroy();
            }
            
            window.trafficChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Organic Search', 'Social Media', 'Direct Traffic', 'Referral', 'Email'],
                    datasets: [{
                        data: [35, 28, 18, 14, 5],
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(239, 68, 68, 0.8)'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 10,
                                font: {
                                    size: 11
                                }
                            }
                        }
                    }
                }
            });
            console.log('Traffic Sources chart created successfully');
        } catch (error) {
            console.error('Error creating Traffic Sources chart:', error);
        }
    } else {
        console.error('Traffic Sources canvas not found or invalid');
    }
    
    // Device Distribution Chart
    const deviceCanvas = document.getElementById('device-chart');
    console.log('Device canvas element:', deviceCanvas);
    
    if (deviceCanvas && deviceCanvas.getContext) {
        try {
            const ctx = deviceCanvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (window.deviceChart) {
                window.deviceChart.destroy();
            }
            
            window.deviceChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Desktop', 'Mobile', 'Tablet'],
                    datasets: [{
                        label: 'Usage',
                        data: [58, 35, 7],
                        backgroundColor: [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)'
                        ],
                        borderColor: [
                            'rgb(59, 130, 246)',
                            'rgb(16, 185, 129)',
                            'rgb(245, 158, 11)'
                        ],
                        borderWidth: 2
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
                            max: 70,
                            ticks: {
                                callback: function(value) {
                                    return value + '%';
                                }
                            }
                        }
                    }
                }
            });
            console.log('Device Distribution chart created successfully');
        } catch (error) {
            console.error('Error creating Device Distribution chart:', error);
        }
    } else {
        console.error('Device Distribution canvas not found or invalid');
    }
    
    console.log('All analytics charts initialization attempted');
}

function initializeStatCharts() {
    // Likes chart (replacing revenue)
    const likesCanvas = document.getElementById('likes-chart');
    if (likesCanvas) {
        createSparklineChart(likesCanvas, generateLikesData(), '#ef4444');
    }
    
    // Other stat charts
    const chartConfigs = [
        { id: 'impressions-chart', data: generateImpressionsData(), color: '#3b82f6' },
        { id: 'ctr-chart', data: generateCTRData(), color: '#f59e0b' },
        { id: 'conversion-chart', data: generateConversionData(), color: '#8b5cf6' }
    ];
    
    chartConfigs.forEach(config => {
        const canvas = document.getElementById(config.id);
        if (canvas) {
            createSparklineChart(canvas, config.data, config.color);
        }
    });
}

function createSparklineChart(canvas, data, color) {
    const ctx = canvas.getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.values,
                borderColor: color,
                backgroundColor: `${color}20`,
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            scales: {
                x: { display: false },
                y: { display: false }
            }
        }
    });
}

function initializeAnalyticsCharts() {
    console.log('Creating analytics charts...');
    
    // Wait for Chart.js to be available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded, retrying...');
        setTimeout(initializeAnalyticsCharts, 500);
        return;
    }
    
    // Create Success Rate Trend Chart
    const successCanvas = document.getElementById('success-rate-chart');
    if (successCanvas) {
        const ctx = successCanvas.getContext('2d');
        
        // Generate success rate data (conversions/impressions * 100)
        const days = [];
        const actualSuccessRate = [];
        const forecastSuccessRate = [];
        const conversionRate = [];
        
        for (let i = 0; i <= 60; i += 5) {
            days.push(`Day ${i}`);
            
            if (i <= 20) {
                // Actual data - Success Rate (objectives achieved)
                const baseRate = 0.5 + (i * 0.02); // Growing from 0.5% to ~0.9%
                const variation = Math.random() * 0.1 - 0.05;
                actualSuccessRate.push(parseFloat((baseRate + variation).toFixed(2)));
                
                // Conversion Rate (clicks to objectives)
                const convRate = 8.5 + (i * 0.1) + (Math.random() * 0.5 - 0.25);
                conversionRate.push(parseFloat(convRate.toFixed(2)));
                
                forecastSuccessRate.push(null);
            } else {
                // Forecast data
                actualSuccessRate.push(null);
                
                const baseRate = 0.9 + ((i - 20) * 0.015);
                const variation = Math.random() * 0.1 - 0.05;
                forecastSuccessRate.push(parseFloat((baseRate + variation).toFixed(2)));
                
                const convRate = 9.5 + ((i - 20) * 0.08) + (Math.random() * 0.5 - 0.25);
                conversionRate.push(parseFloat(convRate.toFixed(2)));
            }
        }
        
        window.successRateChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Actual Success Rate (%)',
                    data: actualSuccessRate,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Forecast Success Rate (%)',
                    data: forecastSuccessRate,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    borderDash: [5, 5],
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Conversion Rate (%)',
                    data: conversionRate,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
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
                        display: true,
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y + '%';
                                }
                                return label;
                            },
                            afterLabel: function(context) {
                                if (context.dataset.label.includes('Success Rate')) {
                                    const impressions = 100000 * (context.dataIndex + 1);
                                    const conversions = Math.floor(impressions * context.parsed.y / 100);
                                    return `Conversions: ${conversions.toLocaleString()} / ${impressions.toLocaleString()}`;
                                }
                                return '';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        max: 1.5,
                        title: {
                            display: true,
                            text: 'Success Rate (%)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        max: 15,
                        title: {
                            display: true,
                            text: 'Conversion Rate (%)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        console.log('Success Rate chart created');
    } else {
        console.error('Success Rate canvas not found');
    }
    
    // Create Traffic Sources Chart
    const trafficCanvas = document.getElementById('traffic-sources-chart');
    if (trafficCanvas) {
        const ctx = trafficCanvas.getContext('2d');
        
        window.trafficChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Organic Search', 'Social Media', 'Direct Traffic', 'Referral', 'Email Campaign'],
                datasets: [{
                    data: [35, 28, 18, 14, 5],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(239, 68, 68, 0.8)'
                    ],
                    borderColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#8b5cf6',
                        '#ef4444'
                    ],
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            usePointStyle: true,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return label + ': ' + percentage + '%';
                            }
                        }
                    }
                }
            }
        });
        console.log('Traffic sources chart created');
    } else {
        console.error('Traffic sources canvas not found');
    }
    
    // Create Device Distribution Chart  
    const deviceCanvas = document.getElementById('device-chart');
    if (deviceCanvas) {
        const ctx = deviceCanvas.getContext('2d');
        
        window.deviceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Desktop', 'Mobile', 'Tablet'],
                datasets: [{
                    label: 'Device Usage',
                    data: [58, 35, 7],
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    barThickness: 60
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: false 
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return context.label + ': ' + context.parsed.y + '%';
                            },
                            afterLabel: function(context) {
                                const totalUsers = 240000; // Example total
                                const users = Math.floor(totalUsers * context.parsed.y / 100);
                                return 'Users: ' + users.toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 70,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            },
                            stepSize: 10
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        console.log('Device chart created');
    } else {
        console.error('Device chart canvas not found');
    }
}

function createRevenueTrendChart() {
    const canvas = document.getElementById('revenue-trend-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Initial data for the chart
    const initialLabels = ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30', 'Day 35', 'Day 40', 'Day 45', 'Day 50', 'Day 55', 'Day 60'];
    const actualData = [2500, 8500, 15000, 22000, 31000, null, null, null, null, null, null, null, null];
    const forecastData = [null, null, null, null, 31000, 38000, 45000, 52000, 58000, 63000, 68000, 72000, 75000];
    
    window.revenueTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [{
                label: 'Actual Revenue',
                data: actualData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }, {
                label: 'Forecast',
                data: forecastData,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function createTrafficSourcesChart() {
    const canvas = document.getElementById('traffic-sources-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    window.trafficChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Organic Search', 'Social Media', 'Direct Traffic', 'Referral', 'Email Campaign'],
            datasets: [{
                data: [35, 28, 18, 14, 5],
                backgroundColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b',
                    '#8b5cf6',
                    '#ef4444'
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed + '%';
                        }
                    }
                }
            }
        }
    });
}

function createDeviceChart() {
    const canvas = document.getElementById('device-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    window.deviceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Desktop', 'Mobile', 'Tablet'],
            datasets: [{
                label: 'Device Usage',
                data: [58, 35, 7],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)'
                ],
                borderColor: [
                    '#3b82f6',
                    '#10b981',
                    '#f59e0b'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: false 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ' + context.parsed.y + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function updateAnalyticsCharts(day) {
    console.log('Updating charts for day:', day);
    
    // Update Success Rate chart
    if (window.successRateChart) {
        const days = [];
        const actualSuccessRate = [];
        const forecastSuccessRate = [];
        const conversionRate = [];
        
        for (let i = 0; i <= 60; i += 5) {
            days.push(`Day ${i}`);
            
            if (i <= day) {
                // Actual data
                const baseRate = 0.5 + (i * 0.02);
                const variation = Math.random() * 0.1 - 0.05;
                actualSuccessRate.push(parseFloat((baseRate + variation).toFixed(2)));
                
                const convRate = 8.5 + (i * 0.1) + (Math.random() * 0.5 - 0.25);
                conversionRate.push(parseFloat(convRate.toFixed(2)));
                
                forecastSuccessRate.push(null);
            } else {
                // Forecast
                actualSuccessRate.push(null);
                
                const baseRate = 0.5 + (day * 0.02) + ((i - day) * 0.015);
                const variation = Math.random() * 0.1 - 0.05;
                forecastSuccessRate.push(parseFloat((baseRate + variation).toFixed(2)));
                
                const convRate = 8.5 + (day * 0.1) + ((i - day) * 0.08) + (Math.random() * 0.5 - 0.25);
                conversionRate.push(parseFloat(convRate.toFixed(2)));
            }
        }
        
        window.successRateChart.data.labels = days;
        window.successRateChart.data.datasets[0].data = actualSuccessRate;
        window.successRateChart.data.datasets[1].data = forecastSuccessRate;
        window.successRateChart.data.datasets[2].data = conversionRate;
        window.successRateChart.update();
    }
    
    // Update traffic sources based on timeline with realistic changes
    if (window.trafficChart) {
        let organicBase = 35;
        let socialBase = 28;
        let directBase = 18;
        let referralBase = 14;
        let emailBase = 5;
        
        // Adjust percentages based on campaign progress
        if (day > 20) {
            const progress = (day - 20) / 40;
            organicBase += progress * 5;
            socialBase += progress * 3;
            directBase -= progress * 2;
            referralBase -= progress * 4;
            emailBase -= progress * 2;
        }
        
        const total = organicBase + socialBase + directBase + referralBase + emailBase;
        const normalizedData = [
            Math.round((organicBase / total) * 100),
            Math.round((socialBase / total) * 100),
            Math.round((directBase / total) * 100),
            Math.round((referralBase / total) * 100),
            Math.round((emailBase / total) * 100)
        ];
        
        window.trafficChart.data.datasets[0].data = normalizedData;
        window.trafficChart.update();
    }
    
    // Update device distribution based on timeline
    if (window.deviceChart) {
        let desktopBase = 58;
        let mobileBase = 35;
        let tabletBase = 7;
        
        // Mobile usage increases over time
        if (day > 15) {
            const progress = (day - 15) / 45;
            desktopBase -= progress * 8;
            mobileBase += progress * 10;
            tabletBase -= progress * 2;
        }
        
        window.deviceChart.data.datasets[0].data = [
            Math.round(desktopBase),
            Math.round(mobileBase),
            Math.round(tabletBase)
        ];
        window.deviceChart.update();
    }
}

// Activity Feed
function initializeActivityFeed() {
    const activities = [
        {
            type: 'success',
            text: 'Campaign "Summer Education Drive" reached 100K impressions',
            time: '2 hours ago'
        },
        {
            type: 'info',
            text: 'New campaign "Career Guidance Program" approved',
            time: '3 days ago'
        }
    ];
    
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon ${activity.type}">
                ${getActivityIcon(activity.type)}
            </div>
            <div class="activity-content">
                <p class="activity-text">${activity.text}</p>
                <span class="activity-time">${activity.time}</span>
            </div>
        `;
        activityList.appendChild(item);
    });
}

function getActivityIcon(type) {
    const icons = {
        success: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        info: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
        warning: '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>'
    };
    return icons[type] || icons.info;
}

// AI Insights
function initializeInsights() {
    const insights = [
        {
            badge: 'Trending',
            score: '+24%',
            text: 'Your education campaigns are performing 24% better than industry average. Consider increasing budget allocation.',
            action: 'Optimize Budget'
        },
        {
            badge: 'Opportunity',
            score: '85%',
            text: 'Mobile users show high engagement. Optimize your campaigns for mobile devices to increase conversions.',
            action: 'Optimize Mobile'
        },
        {
            badge: 'Alert',
            score: '3 days',
            text: 'Your "Math Tutoring Promo" campaign ends in 3 days. Consider extending for continued momentum.',
            action: 'Extend Campaign'
        }
    ];
    
    const insightCards = document.getElementById('insight-cards');
    if (!insightCards) return;
    
    insightCards.innerHTML = '';
    insights.forEach(insight => {
        const card = document.createElement('div');
        card.className = 'insight-card';
        card.innerHTML = `
            <div class="insight-header">
                <span class="insight-badge">${insight.badge}</span>
                <span class="insight-score">${insight.score}</span>
            </div>
            <p class="insight-text">${insight.text}</p>
            <button class="insight-action">${insight.action}</button>
        `;
        insightCards.appendChild(card);
    });
}

// Upload Modal Functions
// NOTE: Upload functions are now handled by upload-modal-handler.js
// Commenting out these old functions to prevent conflicts
// The new upload-modal-handler.js provides:
// - openCoverUploadModal()
// - openProfileUploadModal()
// - closeCoverUploadModal()
// - closeProfileUploadModal()
// - handleImageSelect()
// - uploadImage()
// with full Backblaze integration

// Modal Management
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // initializationManager.js sets inline style="display: none" on all modals
        // So we need to change style.display, not just remove the 'hidden' class
        modal.classList.remove('hidden');
        modal.style.display = 'flex'; // Override inline style
        trapFocus(modal);
        document.body.style.overflow = 'hidden';

        // Handle specific modal initializations
        if (modalId === 'notification-center-modal') {
            renderNotifications(AppState.notifications.all);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        modal.style.display = 'none'; // Set inline style back to none
        restoreFocus();
        document.body.style.overflow = '';
    }
}

// Other Modal Functions
// NOTE: openEditProfileModal is defined in the inline <script> in advertiser-profile.html
// because it needs access to advertiserData and has custom population logic.
// Commenting out this version to prevent conflicts.
// function openEditProfileModal() {
//     openModal('edit-profile-modal');
// }

// Improved handleNavLinkClick function for coming soon features
window.handleNavLinkClick = function(e, link) {
    // Define coming soon features
    const comingSoonFeatures = ['news', 'store', 'find-jobs'];
    
    // Check if it's a coming soon feature
    if (comingSoonFeatures.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        openComingSoonModal(link);
        return false;
    }
    
    // Existing protected pages logic
    if (APP_STATE.isLoggedIn) return true;
    
    const protectedPages = ['find-tutors', 'reels'];
    if (protectedPages.includes(link)) {
        e.preventDefault();
        e.stopPropagation();
        showToast(`Please login to access ${link.replace("-", " ")}`, "warning");
        openModal("login-modal");
        return false;
    }
    
    return true;
};

function saveProfile() {
    const name = document.getElementById('edit-company-name').value;
    const email = document.getElementById('edit-email').value;
    const phone = document.getElementById('edit-phone').value;
    const location = document.getElementById('edit-location').value;
    
    AppState.user.name = name;
    AppState.user.email = email;
    AppState.user.phone = phone;
    AppState.user.location = location;
    
    updateProfileUI();
    notifications.show('Profile updated successfully!', 'success');
    closeModal('edit-profile-modal');
}

function openShareModal() {
    openModal('share-modal');
}

function switchShareImage(type) {
    document.querySelectorAll('.share-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.share-image').forEach(img => img.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`share-image-${type}`).classList.add('active');
}

function copyShareLink() {
    const input = document.querySelector('.share-link-input');
    input.select();
    document.execCommand('copy');
    
    const btn = event.target.closest('button');
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.style.background = '#10b981';
    
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
    }, 2000);
    
    notifications.show('Link copied to clipboard!', 'success');
}

function openContactModal() {
    openModal('contact-modal');
}

function startLiveChat() {
    notifications.show('Connecting to support agent...', 'info');
    setTimeout(() => {
        notifications.show('Chat session started!', 'success');
    }, 2000);
}

function sendMessage() {
    const subject = document.getElementById('contact-subject').value;
    const message = document.getElementById('contact-message').value;
    
    if (!subject || !message) {
        notifications.show('Please fill in all fields', 'error');
        return;
    }
    
    notifications.show('Message sent successfully!', 'success');
    closeModal('contact-modal');
}

function openCreateCampaignModal() {
    openModal('create-campaign-modal');
}

async function saveCampaign() {
    const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8000';

    // Get form values
    const name = document.getElementById('campaignName')?.value;
    const description = document.getElementById('campaignDescription')?.value;
    const type = document.getElementById('campaignType')?.value;
    const startDate = document.getElementById('campaignStartDate')?.value;
    const endDate = document.getElementById('campaignEndDate')?.value;
    const goal = document.getElementById('campaignGoal')?.value;
    const targetCTR = document.getElementById('campaignTargetCTR')?.value;
    const url = document.getElementById('campaignURL')?.value;
    const mediaFile = document.getElementById('campaignMediaFile')?.files[0];

    // Get target audience (multiple select)
    const audienceSelect = document.getElementById('campaignAudience');
    const targetAudience = Array.from(audienceSelect.selectedOptions).map(opt => opt.value);

    // Get target regions (multiple select)
    const regionsSelect = document.getElementById('campaignRegions');
    const locations = Array.from(regionsSelect.selectedOptions).map(opt => opt.value);

    // Validate required fields
    if (!name || !type || !startDate || !endDate || !mediaFile || targetAudience.length === 0) {
        notifications.show('Please fill in all required fields', 'error');
        return;
    }

    try {
        notifications.show('Uploading campaign media...', 'info');

        // Step 1: Upload media file
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('file_type', type === 'video' ? 'videos' : 'images');
        formData.append('category', 'ad');

        const token = localStorage.getItem('token');
        if (!token) {
            notifications.show('Please login first', 'error');
            return;
        }

        const uploadResponse = await fetch(`${API_BASE_URL}/api/upload/campaign-media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload media');
        }

        const uploadData = await uploadResponse.json();
        const creativeUrls = [uploadData.file_url || uploadData.url];

        notifications.show('Creating campaign...', 'info');

        // Step 2: Create campaign
        const campaignData = {
            name: name,
            description: description || '',
            objective: goal || 'brand_awareness',
            start_date: startDate,
            end_date: endDate,
            target_audience: targetAudience,
            locations: locations,
            ad_type: type,
            call_to_action: 'Learn More',
            landing_page_url: url || '',
            creative_urls: creativeUrls
        };

        const campaignResponse = await fetch(`${API_BASE_URL}/api/advertiser/campaigns`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(campaignData)
        });

        if (!campaignResponse.ok) {
            const errorData = await campaignResponse.json();
            throw new Error(errorData.detail || 'Failed to create campaign');
        }

        const result = await campaignResponse.json();

        notifications.show('Campaign submitted for verification successfully!', 'success');
        closeModal('create-campaign-modal');

        // Reset form
        document.getElementById('createCampaignForm').reset();
        document.getElementById('mediaPreview').innerHTML = 'No media selected';

        // Reload campaigns if function exists
        if (typeof loadCampaigns === 'function') {
            loadCampaigns();
        }
        if (typeof renderCampaigns === 'function') {
            renderCampaigns();
        }

    } catch (error) {
        console.error('Campaign creation error:', error);
        notifications.show(error.message || 'Failed to create campaign', 'error');
    }
}

function openSignOutModal() {
    closeAllDropdowns();
    openModal('signout-modal');
}

function confirmSignOut() {
    const password = document.getElementById('signout-password').value;
    
    if (!password) {
        notifications.show('Please enter your password', 'error');
        return;
    }
    
    notifications.show('Signing out...', 'info');
    
    setTimeout(() => {
        closeModal('signout-modal');
        notifications.show('You have been signed out successfully', 'success');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 1000);
    }, 1500);
}

function openQuickActions() {
    openModal('quick-actions-modal');
}

function quickCreateCampaign() {
    closeModal('quick-actions-modal');
    openCreateCampaignModal();
}

function quickUploadAsset() {
    closeModal('quick-actions-modal');
    openModal('upload-asset-modal');
}

function quickViewAnalytics() {
    closeModal('quick-actions-modal');
    document.querySelector('.analytics-section').scrollIntoView({ behavior: 'smooth' });
}

function quickSchedulePost() {
    closeModal('quick-actions-modal');
    openModal('schedule-post-modal');
}

function uploadAsset() {
    const name = document.getElementById('asset-name').value;
    const file = document.getElementById('asset-file').files[0];
    
    if (!name || !file) {
        notifications.show('Please provide asset name and file', 'error');
        return;
    }
    
    notifications.show('Uploading asset...', 'info');
    
    setTimeout(() => {
        notifications.show('Asset uploaded successfully!', 'success');
        closeModal('upload-asset-modal');
    }, 2000);
}

function schedulePost() {
    const content = document.getElementById('post-content').value;
    const date = document.getElementById('post-date').value;
    const time = document.getElementById('post-time').value;
    
    if (!content || !date || !time) {
        notifications.show('Please fill in all required fields', 'error');
        return;
    }
    
    notifications.show(`Post scheduled for ${date} at ${time}`, 'success');
    closeModal('schedule-post-modal');
}

function exportAnalytics() {
    notifications.show('Generating analytics report...', 'info');
    setTimeout(() => {
        notifications.show('Analytics report downloaded!', 'success');
    }, 2000);
}

// Event Listeners
function initializeEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('campaign-search');
    searchInput?.addEventListener('input', debounce(searchCampaigns, 300));

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Window resize
    window.addEventListener('resize', debounce(handleResize, 250));

    // Click outside handlers
    document.addEventListener('click', handleClickOutside);

    // Notification filters
    document.querySelectorAll('.notif-filter').forEach(filter => {
        filter.addEventListener('click', (e) => {
            const filterType = e.target.textContent.toLowerCase().replace(' ', '-');
            filterNotifications(filterType);
        });
    });

    // Campaign media preview
    const mediaFileInput = document.getElementById('campaignMediaFile');
    if (mediaFileInput) {
        mediaFileInput.addEventListener('change', handleMediaPreview);
    }
}

// Handle media file preview
function handleMediaPreview(event) {
    const file = event.target.files[0];
    const previewContainer = document.getElementById('mediaPreview');

    if (!file || !previewContainer) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        const fileType = file.type.split('/')[0]; // 'image' or 'video'

        if (fileType === 'image') {
            previewContainer.innerHTML = `
                <img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 200px; border-radius: 8px; object-fit: contain;">
            `;
        } else if (fileType === 'video') {
            previewContainer.innerHTML = `
                <video controls style="max-width: 100%; max-height: 200px; border-radius: 8px;">
                    <source src="${e.target.result}" type="${file.type}">
                    Your browser does not support video preview.
                </video>
            `;
        } else {
            previewContainer.innerHTML = `
                <div style="padding: 1rem; text-align: center;">
                    <p>📁 ${file.name}</p>
                    <p style="font-size: 0.875rem; color: var(--text-muted);">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
            `;
        }
    };

    reader.readAsDataURL(file);
}

// Utility Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' birr';
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateCTR(clicks, impressions) {
    if (impressions === 0) return 0;
    return ((clicks / impressions) * 100).toFixed(2);
}

function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            current = end;
            clearInterval(timer);
        }
        
        if (id === 'stat-ctr') {
            element.textContent = current.toFixed(1) + '%';
        } else if (id === 'stat-likes') {
            element.textContent = formatNumber(Math.round(current));
        } else {
            element.textContent = formatNumber(Math.round(current));
        }
    }, 16);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Focus Management
let lastFocusedElement = null;

function trapFocus(element) {
    lastFocusedElement = document.activeElement;
    
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    element.addEventListener('keydown', function(e) {
        if (e.key !== 'Tab') return;
        
        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else {
            if (document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
    
    firstElement.focus();
}

function restoreFocus() {
    if (lastFocusedElement) {
        lastFocusedElement.focus();
        lastFocusedElement = null;
    }
}

// Keyboard Shortcuts
function handleKeyboardShortcuts(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.querySelector('.search-input')?.focus();
    }
    
    if (e.key === 'Escape') {
        closeAllModals();
        closeAllDropdowns();
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
        modal.classList.add('hidden');
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown.show').forEach(dropdown => {
        dropdown.classList.remove('show');
    });
    document.getElementById('profile-dropdown-menu')?.classList.remove('show');
    document.querySelector('.dropdown-arrow')?.classList.remove('rotate-180');
}

// Click Outside Handler
function handleClickOutside(e) {
    const profileDropdown = document.getElementById('profile-dropdown-menu');
    const profileBtn = document.getElementById('profile-dropdown-toggle');
    const profileContainer = document.getElementById('profile-container');

    if (profileDropdown && !profileContainer?.contains(e.target)) {
        profileDropdown.classList.remove('show');
        document.querySelector('.dropdown-arrow')?.classList.remove('rotate-180');
    }
}

// Responsive Handler
function handleResize() {
    const width = window.innerWidth;
    
    if (width < 768) {
        document.querySelector('.nav-center')?.classList.add('hidden');
    } else if (width < 1024) {
        document.querySelector('.nav-center')?.classList.add('hidden');
    } else {
        document.querySelector('.nav-center')?.classList.remove('hidden');
    }
    
    updateChartsSize();
}

// Chart Helpers
function generateLikesData() {
    return {
        labels: Array.from({length: 7}, (_, i) => ''),
        values: [15000, 18000, 22000, 25000, 28000, 32000, 35000]
    };
}

function generateImpressionsData() {
    return {
        labels: Array.from({length: 7}, (_, i) => ''),
        values: [120, 135, 125, 145, 160, 155, 175]
    };
}

function generateCTRData() {
    return {
        labels: Array.from({length: 7}, (_, i) => ''),
        values: [8.2, 8.5, 8.3, 8.7, 8.4, 8.6, 8.7]
    };
}

function generateConversionData() {
    return {
        labels: Array.from({length: 7}, (_, i) => ''),
        values: [450, 480, 465, 520, 545, 535, 580]
    };
}

function updateChartsTheme() {
    Chart.defaults.color = getComputedStyle(document.documentElement)
        .getPropertyValue('--text');
    
    Chart.helpers.each(Chart.instances, (instance) => {
        instance.update();
    });
}

function updateChartsSize() {
    Chart.helpers.each(Chart.instances, (instance) => {
        instance.resize();
    });
}

// Tooltip Management
function initializeTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const text = e.target.getAttribute('data-tooltip');
    const tooltip = createTooltip(text);
    
    positionTooltip(tooltip, e.target);
    document.body.appendChild(tooltip);
    
    setTimeout(() => tooltip.classList.add('show'), 10);
}

function hideTooltip() {
    const tooltip = document.querySelector('.tooltip');
    if (tooltip) {
        tooltip.classList.remove('show');
        setTimeout(() => tooltip.remove(), 300);
    }
}

function createTooltip(text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = text;
    return tooltip;
}

function positionTooltip(tooltip, target) {
    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    tooltip.style.top = `${rect.top - tooltipRect.height - 10}px`;
    tooltip.style.left = `${rect.left + (rect.width - tooltipRect.width) / 2}px`;
}

// Lazy Loading
function initializeLazyLoading() {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

// Animation Initialization
function initializeAnimations() {
    const animatedElements = document.querySelectorAll('[data-animate]');
    
    const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const animation = element.dataset.animate;
                element.classList.add(animation);
                animationObserver.unobserve(element);
            }
        });
    }, { threshold: 0.1 });
    
    animatedElements.forEach(el => animationObserver.observe(el));
}

// Loading Screen
function hideLoadingScreen() {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1500);
}

// Notification System
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.init();
    }
    
    init() {
        this.createContainer();
    }
    
    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = this.createNotification(message, type);
        this.container.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }
        
        return notification;
    }
    
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = this.getIcon(type);
        const closeBtn = this.createCloseButton(notification);
        
        notification.innerHTML = `
            <div class="notification-icon">${icon}</div>
            <div class="notification-message">${message}</div>
        `;
        
        notification.appendChild(closeBtn);
        
        return notification;
    }
    
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }
    
    createCloseButton(notification) {
        const button = document.createElement('button');
        button.className = 'notification-close';
        button.innerHTML = '×';
        button.onclick = () => this.remove(notification);
        return button;
    }
    
    remove(notification) {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }
}

// Initialize notification manager
const notifications = new NotificationManager();

// Export functions for global use
window.AppState = AppState;
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.toggleProfileDropdown = toggleProfileDropdown;
window.filterCampaigns = filterCampaigns;
window.filterNotifications = filterNotifications;
window.viewCampaignDetails = viewCampaignDetails;
window.editCampaignDetails = editCampaignDetails;
window.viewCampaignAnalytics = viewCampaignAnalytics;
window.openModal = openModal;
window.closeModal = closeModal;
// Upload modal functions are now in upload-modal-handler.js:
// - openCoverUploadModal
// - openProfileUploadModal
// - closeCoverUploadModal
// - closeProfileUploadModal
// - uploadImage
// window.openEditProfileModal is defined in inline script in advertiser-profile.html
window.saveProfile = saveProfile;
window.openShareModal = openShareModal;
window.switchShareImage = switchShareImage;
window.copyShareLink = copyShareLink;
window.openContactModal = openContactModal;
window.startLiveChat = startLiveChat;
window.sendMessage = sendMessage;
window.openCreateCampaignModal = openCreateCampaignModal;
window.saveCampaign = saveCampaign;
window.openSignOutModal = openSignOutModal;
window.confirmSignOut = confirmSignOut;
window.openNotificationCenter = openNotificationCenter;
window.markAllRead = markAllRead;
window.openQuickActions = openQuickActions;
window.quickCreateCampaign = quickCreateCampaign;
window.quickUploadAsset = quickUploadAsset;
window.quickViewAnalytics = quickViewAnalytics;
window.quickSchedulePost = quickSchedulePost;
window.uploadAsset = uploadAsset;
window.schedulePost = schedulePost;
window.exportAnalytics = exportAnalytics;
window.searchCampaigns = searchCampaigns;
window.notifications = notifications;

console.log('Advertiser Profile Dashboard Initialized Successfully');