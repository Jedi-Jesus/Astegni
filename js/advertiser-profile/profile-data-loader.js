// ============================================
// ADVERTISER PROFILE DATA LOADER
// Loads and populates all advertiser profile data from backend
// ============================================

const AdvertiserProfileDataLoader = {
    currentAdvertiserId: null,
    profileData: null,

    // Initialize and load profile
    async init() {
        try {
            // Get advertiser ID from URL (optional - if viewing another advertiser's profile)
            this.currentAdvertiserId = this.getAdvertiserIdFromURL();

            // If no advertiser ID in URL, this is the logged-in advertiser viewing their own profile
            if (!this.currentAdvertiserId) {
                console.log('Loading profile for logged-in advertiser');
            } else {
                console.log('Loading profile for advertiser ID:', this.currentAdvertiserId);
            }

            // Load all data
            await this.loadCompleteProfile();
        } catch (error) {
            console.error('Error initializing advertiser profile:', error);
        }
    },

    // Get advertiser ID from URL parameters
    getAdvertiserIdFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('advertiser_id') || urlParams.get('id');
    },

    // Load complete profile data
    async loadCompleteProfile() {
        try {
            // Show loading state
            this.showLoading();

            console.log('🔄 Loading advertiser profile from database...');

            // Fetch complete profile
            this.profileData = await AdvertiserProfileAPI.getAdvertiserProfile(this.currentAdvertiserId);

            console.log('✅ Profile data loaded from API:', this.profileData);

            if (!this.profileData) {
                throw new Error('No profile data returned from API');
            }

            // Set the advertiser ID from the loaded profile
            if (!this.currentAdvertiserId && this.profileData.id) {
                this.currentAdvertiserId = this.profileData.id;
            }

            // Update AppState
            if (typeof AppState !== 'undefined') {
                this.syncToAppState(this.profileData);
            }

            // Populate all sections
            this.populateProfileHeader();

            // Hide loading state
            this.hideLoading();

            console.log('✅ Profile UI updated successfully');

        } catch (error) {
            console.error('❌ Error loading profile from database:', error);

            // Show error to user - DON'T use fallback data silently
            this.showError('Failed to load profile from database. Please refresh the page or contact support.');
            this.hideLoading();

            // Re-throw error so calling code knows it failed
            throw error;
        }
    },

    // Sync profile data to AppState
    syncToAppState(data) {
        if (!AppState.user) {
            AppState.user = {};
        }

        AppState.user.name = data.company_name || data.name || 'Advertiser';
        AppState.user.email = data.email || '';
        AppState.user.phone = data.phone || '';
        AppState.user.location = data.location || '';
        AppState.user.website = data.website || '';
        AppState.user.profilePic = data.profile_picture || data.logo || '';
        AppState.user.coverPic = data.cover_image || '';
        AppState.user.verified = data.is_verified || false;
        AppState.user.premium = data.is_premium || false;

        // Analytics data
        if (typeof AppState.analytics !== 'undefined') {
            AppState.analytics.totalLikes = data.total_likes || 0;
            AppState.analytics.impressions = data.total_impressions || 0;
            AppState.analytics.clickRate = data.average_ctr || 0;
            AppState.analytics.conversions = data.total_conversions || 0;
        }
    },

    // Fallback data if API fails
    getFallbackData() {
        return {
            id: 1,
            company_name: 'EduAds Inc.',
            bio: 'Leading educational advertising agency',
            location: 'Addis Ababa, Ethiopia',
            email: 'contact@eduads.com',
            phone: '+251 912 345 680',
            profile_picture: 'https://via.placeholder.com/200',
            cover_image: 'https://via.placeholder.com/1920x400/F59E0B/FFFFFF?text=Cover',
            is_verified: true,
            is_premium: true,
            total_campaigns: 0,
            active_campaigns: 0,
            total_impressions: 0,
            total_clicks: 0,
            total_conversions: 0,
            total_likes: 0,
            total_followers: 0,
            rating: 0.0
        };
    },

    // Populate profile header section
    populateProfileHeader() {
        const data = this.profileData;

        // Company name
        if (data.company_name) {
            // FIXED: Use specific ID selector to target profile header, NOT nav bar
            this.updateElement('hero-name', data.company_name);
        }

        // Bio
        if (data.bio) {
            this.updateElement('hero-bio', data.bio);
            this.updateElement('advertiser-bio', data.bio);
        }

        // Quote
        if (data.quote) {
            this.updateElement('advertiser-quote', data.quote);
        }

        // Location
        if (data.location) {
            this.updateElement('advertiser-location', data.location);
            this.updateElement('hero-location', data.location);
        }

        // Website
        if (data.website) {
            this.updateElement('advertiser-website', data.website);
        }

        // Email
        if (data.email) {
            this.updateElement('advertiser-email', data.email);
        }

        // Phone
        if (data.phone) {
            this.updateElement('advertiser-phone', data.phone);
        }

        // Images
        if (data.profile_picture || data.logo) {
            const profilePic = data.profile_picture || data.logo;
            this.updateImage('hero-avatar', profilePic);
            this.updateImage('nav-profile-pic', profilePic);
            const profileAvatars = document.querySelectorAll('.profile-avatar');
            profileAvatars.forEach(img => {
                if (img) img.src = profilePic;
            });
        }

        if (data.cover_image) {
            this.updateImage('hero-cover', data.cover_image);
            const coverImages = document.querySelectorAll('.cover-img');
            coverImages.forEach(img => {
                if (img) img.src = data.cover_image;
            });
        }

        // Stats
        this.updateElement('stat-campaigns', data.total_campaigns || '0');
        this.updateElement('stat-impressions', this.formatNumber(data.total_impressions) || '0');
        this.updateElement('stat-followers', this.formatNumber(data.total_followers) || '0');

        // Rating
        if (data.rating) {
            this.updateElement('stat-rating', data.rating.toFixed(1) + '/5');
            this.updateElement('advertiser-rating', data.rating.toFixed(1));
        }

        // Success rate
        if (data.success_rate) {
            this.updateElement('stat-success', data.success_rate.toFixed(0) + '%');
        }

        // Verified badge
        const verifiedBadges = document.querySelectorAll('.verified-badge');
        verifiedBadges.forEach(badge => {
            if (badge) {
                badge.style.display = data.is_verified ? 'inline-flex' : 'none';
            }
        });

        // Premium badge
        const premiumBadges = document.querySelectorAll('.premium-badge');
        premiumBadges.forEach(badge => {
            if (badge) {
                badge.style.display = data.is_premium ? 'inline-flex' : 'none';
            }
        });
    },

    // Utility functions
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element && value !== null && value !== undefined) {
            element.textContent = value;
        }
    },

    updateImage(id, src) {
        const element = document.getElementById(id);
        if (element && src) {
            element.src = src;
        }
    },

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },

    showLoading() {
        console.log('📥 Loading advertiser profile data...');
        const loadingElement = document.getElementById('profile-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
    },

    hideLoading() {
        console.log('✅ Advertiser profile data loaded successfully');
        const loadingElement = document.getElementById('profile-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    },

    showError(message) {
        console.error('❌ Profile Error:', message);
        const errorElement = document.getElementById('profile-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }
};
