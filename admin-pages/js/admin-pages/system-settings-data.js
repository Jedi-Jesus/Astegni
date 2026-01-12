/**
 * System Settings Data Manager
 * Handles all database interactions for manage-system-settings.html
 * All data comes from backend - no hardcoded values
 * Returns 0 or empty values if no data exists in database
 */

// API Configuration (set on window object to share across files)
if (typeof window.API_BASE_URL === 'undefined') {
    window.API_BASE_URL = 'http://localhost:8000';
}
// Use window.API_BASE_URL directly throughout this file

class SystemSettingsDataManager {
    constructor() {
        this.token = localStorage.getItem('token');
    }

    /**
     * Generic fetch method with authentication
     */
    async fetchAPI(endpoint, options = {}) {
        // Get fresh token from localStorage in case it was refreshed
        this.token = localStorage.getItem('token');

        if (!this.token) {
            console.error('No token found in localStorage - user may not be logged in');
            return null;
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            console.log(`Fetching: ${endpoint}`);
            const response = await fetch(`${window.API_BASE_URL}${endpoint}`, defaultOptions);

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn(`⚠️ 401 Unauthorized on ${endpoint}`);
                    console.warn('Token exists:', !!this.token);
                    console.warn('Token length:', this.token?.length);
                    console.warn('Token preview:', this.token?.substring(0, 20) + '...');

                    // Don't redirect - just return null and let the calling function handle it
                    // This prevents automatic logout when clicking different panels
                    return null;
                }
                console.error(`HTTP ${response.status} error on ${endpoint}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log(`✓ Successfully fetched: ${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return null;
        }
    }

    // ============================================================================
    // DASHBOARD DATA
    // ============================================================================

    async getDashboardData() {
        const response = await this.fetchAPI('/api/admin/system/dashboard');

        if (!response || !response.success) {
            return {
                total_users: 0,
                total_students: 0,
                total_tutors: 0,
                total_parents: 0,
                total_advertisers: 0,
                total_admins: 0,
                active_users_today: 0,
                new_users_today: 0,
                total_videos: 0,
                total_courses: 0,
                total_reviews: 0,
                total_revenue: 0,
                storage_used_gb: 0,
                bandwidth_used_gb: 0,
                api_calls_today: 0,
                error_count_today: 0,
                avg_response_time_ms: 0
            };
        }

        return response.data;
    }

    // ============================================================================
    // GENERAL SETTINGS
    // ============================================================================

    async getGeneralSettings() {
        const response = await this.fetchAPI('/api/admin/system/general-settings');

        if (!response || !response.success) {
            return {
                platform_name: 'Astegni',
                platform_tagline: '',
                platform_description: '',
                primary_language: 'English',
                timezone: 'Africa/Addis_Ababa',
                contact_email: '',
                contact_phone: ''
            };
        }

        return response.data;
    }

    async updateGeneralSettings(settings) {
        return await this.fetchAPI('/api/admin/system/general-settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // ============================================================================
    // MEDIA MANAGEMENT
    // ============================================================================

    async getMediaSettings() {
        const response = await this.fetchAPI('/api/admin/system/media-settings');

        if (!response || !response.success) {
            return [];
        }

        return response.data;
    }

    async updateMediaSettings(tierName, settings) {
        return await this.fetchAPI(`/api/admin/system/media-settings/${tierName}`, {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    /**
     * Get system media (images/videos uploaded through media panel)
     * Uses /api/admin/media/system-media endpoint (connects to astegni_admin_db)
     */
    async getSystemMedia(filters = {}) {
        // Updated to use admin media endpoint
        let endpoint = '/api/admin/media/system-media';
        const params = new URLSearchParams();

        if (filters.media_type) params.append('media_type', filters.media_type);
        if (filters.file_type) params.append('file_type', filters.file_type);
        if (filters.target) params.append('target', filters.target);

        const queryString = params.toString();
        if (queryString) {
            endpoint += '?' + queryString;
        }

        const response = await this.fetchAPI(endpoint);

        if (!response || !response.success) {
            return [];
        }

        // Response contains {images: [], videos: []} - combine them for backward compatibility
        const allMedia = [
            ...(response.images || []).map(m => ({ ...m, media_type: 'image' })),
            ...(response.videos || []).map(m => ({ ...m, media_type: 'video' }))
        ];

        return allMedia;
    }

    /**
     * Delete system media by ID
     * Uses /api/admin/media/{type}/{id} endpoint (connects to astegni_admin_db)
     */
    async deleteSystemMedia(mediaId, mediaType = 'image') {
        return await this.fetchAPI(`/api/admin/media/${mediaType}/${mediaId}`, {
            method: 'DELETE'
        });
    }

    // ============================================================================
    // IMPRESSIONS
    // ============================================================================

    async getImpressionStats() {
        const response = await this.fetchAPI('/api/admin/system/impressions');

        if (!response || !response.success) {
            return {
                video: { total: 0, unique_users: 0, avg_duration: 0 },
                course: { total: 0, unique_users: 0, avg_duration: 0 },
                blog: { total: 0, unique_users: 0, avg_duration: 0 },
                ad: { total: 0, unique_users: 0, avg_duration: 0 }
            };
        }

        return response.data;
    }

    // ============================================================================
    // EMAIL CONFIGURATION
    // ============================================================================

    async getEmailConfig() {
        const response = await this.fetchAPI('/api/admin/system/email-config');

        if (!response || !response.success) {
            return {
                smtp_host: '',
                smtp_port: 587,
                smtp_username: '',
                from_email: '',
                from_name: 'Astegni',
                enabled: false
            };
        }

        return response.data;
    }

    async getEmailTemplates() {
        const response = await this.fetchAPI('/api/admin/system/email-templates');

        if (!response || !response.success) {
            return [];
        }

        return response.data;
    }

    // ============================================================================
    // PRICING MANAGEMENT
    // ============================================================================

    async getPaymentGateways() {
        const response = await this.fetchAPI('/api/admin/system/payment-gateways');

        if (!response || !response.success) {
            return [];
        }

        return response.data;
    }

    async getSubscriptionTiers() {
        const response = await this.fetchAPI('/api/admin/system/subscription-tiers');

        if (!response || !response.success) {
            return [];
        }

        return response.data;
    }

    async getAffiliateSettings() {
        const response = await this.fetchAPI('/api/admin/system/affiliate-settings');

        if (!response || !response.success) {
            return {
                program_name: 'Astegni Affiliate Program',
                commission_rate: 0,
                min_payout: 0,
                cookie_duration_days: 30,
                enabled: false
            };
        }

        return response.data;
    }

    // ============================================================================
    // SECURITY & PRIVACY
    // ============================================================================

    async getSecuritySettings() {
        const response = await this.fetchAPI('/api/admin/system/security-settings');

        if (!response || !response.success) {
            return {
                two_factor_auth_enabled: false,
                session_timeout_minutes: 30,
                max_login_attempts: 5,
                password_min_length: 8,
                rate_limiting_enabled: true
            };
        }

        return response.data;
    }

    // ============================================================================
    // BACKUP & RESTORE
    // ============================================================================

    async getBackupConfig() {
        const response = await this.fetchAPI('/api/admin/system/backup-config');

        if (!response || !response.success) {
            return {
                auto_backup_enabled: true,
                backup_frequency: 'daily',
                backup_retention_days: 30,
                include_database: true
            };
        }

        return response.data;
    }

    async getBackupHistory() {
        const response = await this.fetchAPI('/api/admin/system/backup-history');

        if (!response || !response.success) {
            return [];
        }

        return response.data;
    }

    // ============================================================================
    // API & INTEGRATIONS
    // ============================================================================

    async getAPISettings() {
        const response = await this.fetchAPI('/api/admin/system/api-settings');

        if (!response || !response.success) {
            return {
                api_enabled: true,
                rate_limit_per_minute: 100,
                require_api_key: true
            };
        }

        return response.data;
    }

    // ============================================================================
    // MAINTENANCE MODE
    // ============================================================================

    async getMaintenanceMode() {
        const response = await this.fetchAPI('/api/admin/system/maintenance');

        if (!response || !response.success) {
            return {
                is_active: false,
                message: '',
                scheduled_start: null,
                scheduled_end: null
            };
        }

        return response.data;
    }

    async updateMaintenanceMode(maintenanceData) {
        return await this.fetchAPI('/api/admin/system/maintenance', {
            method: 'PUT',
            body: JSON.stringify(maintenanceData)
        });
    }

    // ============================================================================
    // SYSTEM LOGS
    // ============================================================================

    async getSystemLogs(limit = 100, logLevel = null) {
        let endpoint = `/api/admin/system/logs?limit=${limit}`;
        if (logLevel) {
            endpoint += `&log_level=${logLevel}`;
        }

        const response = await this.fetchAPI(endpoint);

        if (!response || !response.success) {
            return [];
        }

        return response.data;
    }

    // ============================================================================
    // PERFORMANCE MONITOR
    // ============================================================================

    async getPerformanceMetrics() {
        const response = await this.fetchAPI('/api/admin/system/performance');

        if (!response || !response.success) {
            return {
                cpu_usage: { avg: 0, max: 0, min: 0 },
                memory_usage: { avg: 0, max: 0, min: 0 },
                disk_usage: { avg: 0, max: 0, min: 0 },
                response_time: { avg: 0, max: 0, min: 0 }
            };
        }

        return response.data;
    }
}

// ============================================================================
// UI UPDATE FUNCTIONS
// ============================================================================

/**
 * Load and display dashboard data
 */
async function loadDashboardData() {
    const manager = new SystemSettingsDataManager();
    const stats = await manager.getDashboardData();

    if (stats) {
        updateDashboardStats(stats);
    }
}

/**
 * Update dashboard statistics in UI
 */
function updateDashboardStats(stats) {
    // Update stat cards if they exist
    const statElements = {
        'total-users': stats.total_users,
        'total-students': stats.total_students,
        'total-tutors': stats.total_tutors,
        'total-videos': stats.total_videos,
        'total-courses': stats.total_courses,
        'total-revenue': `${stats.total_revenue} ETB`,
        'stat-revenue': `${stats.total_revenue} ETB`,
        'active-users': stats.active_users_today,
        'new-users': stats.new_users_today,
        'storage-used': stats.storage_used_gb,
        'api-calls': stats.api_calls_today,
        'count-students': stats.total_students,
        'count-tutors': stats.total_tutors,
        'count-parents': stats.total_parents,
        'count-advertisers': stats.total_advertisers
    };

    for (const [id, value] of Object.entries(statElements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

/**
 * Update admin profile in UI
 */
function updateAdminProfile(profile) {
    // Update profile fields if they exist
    if (document.getElementById('admin-username')) {
        document.getElementById('admin-username').textContent = profile.username || 'Admin';
    }
    if (document.getElementById('admin-email')) {
        document.getElementById('admin-email').textContent = profile.email || '';
    }
    if (document.getElementById('admin-phone')) {
        document.getElementById('admin-phone').textContent = profile.phone || '';
    }
    if (document.getElementById('admin-name')) {
        document.getElementById('admin-name').textContent = profile.full_name || profile.username || '';
    }
}

/**
 * Load and display general settings
 */
async function loadGeneralSettings() {
    console.log('📊 loadGeneralSettings() called - fetching from database...');

    // Check if general panel is visible
    const generalPanel = document.getElementById('general-panel');
    if (!generalPanel) {
        console.error('❌ general-panel element not found in DOM!');
        return;
    }

    const isVisible = !generalPanel.classList.contains('hidden');
    console.log(`  Panel visibility: ${isVisible ? 'VISIBLE ✓' : 'HIDDEN ✗'}`);

    const manager = new SystemSettingsDataManager();
    const settings = await manager.getGeneralSettings();
    console.log('✅ General settings received from API:', settings);

    if (settings) {
        // Populate single-value form fields
        const fields = {
            'platform-name': settings.platform_name,
            'site-url': settings.site_url || '',
            'platform-tagline': settings.platform_tagline,
            'platform-description': settings.platform_description
        };

        for (const [id, value] of Object.entries(fields)) {
            const element = document.getElementById(id);
            if (element) {
                element.value = value || '';
                console.log(`  ✓ Set field "${id}" = "${value}"`);
            } else {
                console.warn(`  ⚠️ Field "${id}" not found in DOM!`);
            }
        }

        // Handle multiple contact phones (now JSON arrays from API)
        const contactPhone = document.getElementById('contact-phone');
        const additionalPhonesContainer = document.getElementById('additional-phones');

        if (contactPhone && additionalPhonesContainer) {
            // Clear existing additional phones
            additionalPhonesContainer.innerHTML = '';

            // settings.contact_phone is now an array from the API
            const phones = Array.isArray(settings.contact_phone) ? settings.contact_phone : [];

            if (phones.length > 0) {
                contactPhone.value = phones[0];

                // Add additional phones
                for (let i = 1; i < phones.length; i++) {
                    const phoneDiv = document.createElement('div');
                    phoneDiv.className = 'flex gap-2';
                    phoneDiv.innerHTML = `
                        <input type="phone" value="${phones[i]}" class="flex-1 p-2 border rounded-lg" placeholder="+251 911 234 567">
                        <button onclick="removeContactField(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                            <i class="fas fa-minus"></i>
                        </button>
                    `;
                    additionalPhonesContainer.appendChild(phoneDiv);
                }
            }
        }

        // Handle multiple contact emails (now JSON arrays from API)
        const contactEmail = document.getElementById('contact-email');
        const additionalEmailsContainer = document.getElementById('additional-emails');

        if (contactEmail && additionalEmailsContainer) {
            // Clear existing additional emails
            additionalEmailsContainer.innerHTML = '';

            // settings.contact_email is now an array from the API
            const emails = Array.isArray(settings.contact_email) ? settings.contact_email : [];

            if (emails.length > 0) {
                contactEmail.value = emails[0];

                // Add additional emails
                for (let i = 1; i < emails.length; i++) {
                    const emailDiv = document.createElement('div');
                    emailDiv.className = 'flex gap-2';
                    emailDiv.innerHTML = `
                        <input type="email" value="${emails[i]}" class="flex-1 p-2 border rounded-lg" placeholder="contact@astegni.com">
                        <button onclick="removeContactField(this)" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                            <i class="fas fa-minus"></i>
                        </button>
                    `;
                    additionalEmailsContainer.appendChild(emailDiv);
                }
            }
        }
    }
}

/**
 * Load and display media settings
 */
async function loadMediaSettings() {
    const manager = new SystemSettingsDataManager();
    const tiers = await manager.getMediaSettings();

    if (tiers && tiers.length > 0) {
        tiers.forEach(tier => {
            // Update UI for each tier
            updateTierUI(tier);
        });
    }

    // Also load uploaded system media
    await loadUploadedMedia();
}

function updateTierUI(tier) {
    // Validate tier object before accessing properties
    if (!tier || typeof tier.tier_name !== 'string') {
        console.warn('updateTierUI: Invalid tier object or tier_name is not a string', tier);
        return;
    }

    // Update tier fields in UI based on tier_name
    const prefix = tier.tier_name.toLowerCase();

    // Map of form field IDs to values
    const fields = {
        [`${prefix}-image-single`]: tier.max_image_size_mb,
        [`${prefix}-video-single`]: tier.max_video_size_mb,
        [`${prefix}-image-limit`]: tier.max_image_storage_mb || Math.round(tier.storage_limit_gb * 1024 / 2), // Use dedicated field if available, fallback to half
        [`${prefix}-video-limit`]: tier.max_video_storage_mb || Math.round(tier.storage_limit_gb * 1024 / 2)  // Use dedicated field if available, fallback to half
    };

    for (const [id, value] of Object.entries(fields)) {
        const element = document.getElementById(id);
        if (element) {
            element.value = value || 0;
        }
    }
}

/**
 * Load and display uploaded system media
 */
async function loadUploadedMedia() {
    const manager = new SystemSettingsDataManager();
    const media = await manager.getSystemMedia();

    // Separate images and videos
    const images = media.filter(m => m.media_type === 'image');
    const videos = media.filter(m => m.media_type === 'video');

    // Display them
    displayUploadedImages(images);
    displayUploadedVideos(videos);
}

/**
 * Display uploaded images in the media panel
 */
function displayUploadedImages(images) {
    const container = document.getElementById('uploaded-images-list');
    if (!container) return;

    if (!images || images.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No images uploaded yet.</p>';
        return;
    }

    let html = '<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">';
    images.forEach(img => {
        html += `
            <div class="border rounded-lg p-3 relative group">
                <img src="${img.file_url}" alt="${img.title}" class="w-full h-32 object-cover rounded mb-2">
                <p class="text-sm font-semibold truncate">${img.title}</p>
                <p class="text-xs text-gray-500">${img.file_type}</p>
                <p class="text-xs text-gray-400">Targets: ${(img.targets || []).join(', ')}</p>
                <button onclick="deleteSystemMedia(${img.id}, 'image')"
                        class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

/**
 * Display uploaded videos in the media panel
 */
function displayUploadedVideos(videos) {
    const container = document.getElementById('uploaded-videos-list');
    if (!container) return;

    if (!videos || videos.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No videos uploaded yet.</p>';
        return;
    }

    let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">';
    videos.forEach(vid => {
        html += `
            <div class="border rounded-lg p-3 relative group">
                <img src="${vid.thumbnail_url || '/placeholder-video.jpg'}"
                     alt="${vid.title}" class="w-full h-32 object-cover rounded mb-2">
                <p class="text-sm font-semibold truncate">${vid.title}</p>
                <p class="text-xs text-gray-500">${vid.file_type}${vid.classification ? ' - ' + vid.classification : ''}</p>
                <p class="text-xs text-gray-400">Targets: ${(vid.targets || []).join(', ')}</p>
                <button onclick="deleteSystemMedia(${vid.id}, 'video')"
                        class="absolute top-2 right-2 bg-red-500 text-white p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

/**
 * Load and display impression stats
 */
async function loadImpressionStats() {
    const manager = new SystemSettingsDataManager();
    const impressions = await manager.getImpressionStats();

    if (impressions) {
        updateImpressionUI(impressions);
    }
}

function updateImpressionUI(impressions) {
    for (const [type, data] of Object.entries(impressions)) {
        const totalEl = document.getElementById(`${type}-impressions-total`);
        const usersEl = document.getElementById(`${type}-impressions-users`);
        const durationEl = document.getElementById(`${type}-impressions-duration`);

        if (totalEl) totalEl.textContent = data.total || 0;
        if (usersEl) usersEl.textContent = data.unique_users || 0;
        if (durationEl) durationEl.textContent = (data.avg_duration || 0).toFixed(1);
    }
}

/**
 * Load and display system logs
 */
async function loadSystemLogs() {
    const manager = new SystemSettingsDataManager();
    const logs = await manager.getSystemLogs(100);

    const container = document.getElementById('system-logs-container');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--text-secondary);">No logs available</p>';
        return;
    }

    // Render logs
    let html = '<div class="logs-list">';
    logs.forEach(log => {
        html += `
            <div class="log-entry log-${log.log_level}">
                <span class="log-time">${new Date(log.created_at).toLocaleString()}</span>
                <span class="log-level">${log.log_level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `;
    });
    html += '</div>';

    container.innerHTML = html;
}

/**
 * Load and display performance metrics
 */
async function loadPerformanceMetrics() {
    const manager = new SystemSettingsDataManager();
    const metrics = await manager.getPerformanceMetrics();

    if (metrics) {
        updatePerformanceUI(metrics);
    }
}

function updatePerformanceUI(metrics) {
    for (const [type, data] of Object.entries(metrics)) {
        const avgEl = document.getElementById(`${type}-avg`);
        const maxEl = document.getElementById(`${type}-max`);
        const minEl = document.getElementById(`${type}-min`);

        if (avgEl) avgEl.textContent = (data.avg || 0).toFixed(2);
        if (maxEl) maxEl.textContent = (data.max || 0).toFixed(2);
        if (minEl) minEl.textContent = (data.min || 0).toFixed(2);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize data loading based on current panel
 */
function initializeSystemSettingsData(panel = 'dashboard') {
    switch (panel) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'general':
            loadGeneralSettings();
            break;
        case 'media':
            loadMediaSettings();
            break;
        case 'email':
            // Load email accounts as cards
            if (typeof loadEmailAccounts === 'function') {
                loadEmailAccounts();
            }
            // Load email templates
            if (typeof loadEmailTemplates === 'function') {
                loadEmailTemplates();
            }
            break;
        case 'sms':
            // Load SMS providers list (new card-based interface)
            if (typeof loadSMSProviders === 'function') {
                loadSMSProviders();
            }
            // Also load SMS statistics
            if (typeof loadSMSStatistics === 'function') {
                loadSMSStatistics();
            }
            break;
        case 'impressions':
            loadImpressionStats();
            break;
        case 'logs':
            loadSystemLogs();
            break;
        case 'performance':
            loadPerformanceMetrics();
            break;
        default:
            console.log(`Panel ${panel} data loading not implemented yet`);
    }
}

// NOTE: Data loading is now handled by initializeSystemSettingsData()
// which is called from manage-system-settings.js after proper initialization.
// This prevents race conditions where data loads before panels are ready.
// The dashboard data will be loaded when the dashboard panel is active.
