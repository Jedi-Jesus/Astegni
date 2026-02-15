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

            // Load connections count from database
            await this.loadConnectionsCount();

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

        console.log('[AdvertiserProfileDataLoader] Starting to populate profile header with data:', data);

        // Full Name - constructed from users table (first_name + father_name + grandfather_name)
        // OR use full_name if available
        if (data.full_name) {
            this.updateElement('advertiserName', data.full_name);
            console.log('[AdvertiserProfileDataLoader] ✓ Full name set:', data.full_name);
        } else {
            console.warn('[AdvertiserProfileDataLoader] ⚠ Missing full_name in data');
        }

        // Username - display below name (replaces hero-title in profile header)
        if (data.username) {
            this.updateElement('advertiser-username-display', `@${data.username}`);
            console.log('[AdvertiserProfileDataLoader] ✓ Username set:', data.username);
        } else {
            // Hide username display if no username
            const usernameEl = document.getElementById('advertiser-username-display');
            if (usernameEl) {
                usernameEl.style.display = 'none';
            }
            console.log('[AdvertiserProfileDataLoader] ⚠ No username found');
        }

        // Hero Section Title (array) - displayed in top hero banner with typing effect
        if (data.hero_title && Array.isArray(data.hero_title) && data.hero_title.length > 0) {
            const heroTitleText = data.hero_title.join(' ');
            this.updateElement('typedText', heroTitleText);
            console.log('[AdvertiserProfileDataLoader] ✓ Hero title set:', heroTitleText);
        }

        // Hero Subtitle (array) - displayed in top hero banner below title
        if (data.hero_subtitle && Array.isArray(data.hero_subtitle) && data.hero_subtitle.length > 0) {
            const subtitleText = data.hero_subtitle.join(' ');
            this.updateElement('hero-subtitle', subtitleText);
            console.log('[AdvertiserProfileDataLoader] ✓ Hero subtitle set:', subtitleText);
        }

        // Bio - update in About section and show it
        if (data.bio) {
            this.updateElement('advertiser-bio', data.bio);
            // Show About section
            const aboutSection = document.getElementById('about-section');
            if (aboutSection) {
                aboutSection.style.display = 'block';
            }
            console.log('[AdvertiserProfileDataLoader] ✓ Bio set');
        }

        // Quote/Tagline
        if (data.quote) {
            this.updateElement('advertiser-quote', `"${data.quote}"`);
            console.log('[AdvertiserProfileDataLoader] ✓ Quote set:', data.quote);
        }

        // Location - handle both array and string formats
        if (data.location) {
            let locationText = '';
            if (Array.isArray(data.location) && data.location.length > 0) {
                locationText = data.location.join(', ');
            } else if (typeof data.location === 'string' && data.location.trim() !== '') {
                locationText = data.location;
            }

            if (locationText) {
                this.updateElement('advertiser-location', locationText);
                console.log('[AdvertiserProfileDataLoader] ✓ Location set:', locationText);
            } else {
                this.updateElement('advertiser-location', 'No location yet');
            }
        } else {
            this.updateElement('advertiser-location', 'No location yet');
        }

        // Email (from user data if available)
        if (data.email) {
            this.updateElement('advertiser-email', data.email);
            console.log('[AdvertiserProfileDataLoader] ✓ Email set:', data.email);
        } else {
            this.updateElement('advertiser-email', 'No email yet');
        }

        // Phone (from user data if available)
        if (data.phone) {
            this.updateElement('advertiser-phone', data.phone);
            console.log('[AdvertiserProfileDataLoader] ✓ Phone set:', data.phone);
        } else {
            this.updateElement('advertiser-phone', 'No phone yet');
        }

        // Hobbies & Interests - always show, with "No hobbies yet" if empty
        const hobbiesEl = document.getElementById('advertiser-hobbies');
        if (hobbiesEl) {
            if (data.hobbies && Array.isArray(data.hobbies) && data.hobbies.length > 0) {
                const hobbiesText = data.hobbies.join(', ');
                hobbiesEl.textContent = hobbiesText;
                hobbiesEl.style.color = 'var(--text)';
                hobbiesEl.style.fontStyle = 'normal';
            } else if (data.hobbies && typeof data.hobbies === 'string' && data.hobbies.trim() !== '') {
                hobbiesEl.textContent = data.hobbies;
                hobbiesEl.style.color = 'var(--text)';
                hobbiesEl.style.fontStyle = 'normal';
            } else {
                hobbiesEl.textContent = 'No hobbies yet';
                hobbiesEl.style.color = 'var(--text-muted)';
                hobbiesEl.style.fontStyle = 'italic';
            }
        }

        // Social links (JSONB object) - handle both 'socials' and 'social_links' field names
        const socialLinksData = data.socials || data.social_links;
        if (socialLinksData && typeof socialLinksData === 'object' && Object.keys(socialLinksData).length > 0) {
            this.populateSocialLinks(socialLinksData);
            console.log('[AdvertiserProfileDataLoader] ✓ Social links populated');
        } else {
            console.log('[AdvertiserProfileDataLoader] ⚠ No social links found');
        }

        // Profile picture - update avatar
        if (data.profile_picture) {
            this.updateImage('profile-avatar', data.profile_picture);
            // Also update nav profile pics
            const profileAvatars = document.querySelectorAll('.profile-avatar, #profile-pic, #dropdown-profile-pic');
            profileAvatars.forEach(img => {
                if (img) img.src = data.profile_picture;
            });
            console.log('[AdvertiserProfileDataLoader] ✓ Profile picture set');
        } else {
            console.log('[AdvertiserProfileDataLoader] ⚠ No profile picture found, using default');
        }

        // Cover image
        if (data.cover_image) {
            this.updateImage('cover-img', data.cover_image);
            const coverImages = document.querySelectorAll('.cover-img');
            coverImages.forEach(img => {
                if (img) img.src = data.cover_image;
            });
            console.log('[AdvertiserProfileDataLoader] ✓ Cover image set');
        } else {
            console.log('[AdvertiserProfileDataLoader] ⚠ No cover image found, using default');
        }

        // Verified badge
        const verificationBadge = document.getElementById('verification-badge');
        if (verificationBadge) {
            verificationBadge.style.display = data.is_verified ? 'inline-flex' : 'none';
            console.log('[AdvertiserProfileDataLoader] ✓ Verification badge set:', data.is_verified);
        }

        // Member since date (created_at from advertiser_profiles)
        if (data.created_at) {
            const joinDate = new Date(data.created_at);
            // Validate the date is real and not in the future
            if (!isNaN(joinDate.getTime()) && joinDate <= new Date()) {
                const formattedDate = joinDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                this.updateElement('advertiser-joined', formattedDate);
                console.log('[AdvertiserProfileDataLoader] ✓ Member since date set:', formattedDate);
            } else {
                console.warn('[AdvertiserProfileDataLoader] ⚠ Invalid created_at date:', data.created_at);
                this.updateElement('advertiser-joined', 'Recently');
            }
        } else {
            console.log('[AdvertiserProfileDataLoader] ⚠ No created_at date found');
            this.updateElement('advertiser-joined', 'Recently');
        }

        // Rating data from advertiser_reviews table
        if (data.rating_data) {
            this.populateRatingSection(data.rating_data);
        } else {
            // Set default rating display
            this.updateElement('advertiser-rating', '0.0');
            this.updateElement('rating-stars', '☆☆☆☆☆');
            this.updateElement('rating-count', '(No reviews yet)');
            console.log('[AdvertiserProfileDataLoader] ⚠ No rating data found, using defaults');
        }

        console.log('[AdvertiserProfileDataLoader] ✅ Profile header populated with database data');
    },

    // Populate rating section from advertiser_reviews
    populateRatingSection(ratingData) {
        // Overall rating
        if (ratingData.overall_rating !== undefined) {
            const rating = parseFloat(ratingData.overall_rating).toFixed(1);
            this.updateElement('advertiser-rating', rating);

            // Update star display
            const stars = Math.round(ratingData.overall_rating);
            const starsDisplay = '★'.repeat(stars) + '☆'.repeat(5 - stars);
            this.updateElement('rating-stars', starsDisplay);
        }

        // Review count
        if (ratingData.review_count !== undefined) {
            this.updateElement('rating-count', `(${ratingData.review_count} reviews)`);
        }

        // Update individual rating metrics in tooltip
        const metrics = {
            'campaign_quality': ratingData.campaign_quality || 0,
            'response_time': ratingData.response_time || 0,
            'professionalism': ratingData.professionalism || 0,
            'value_for_money': ratingData.value_for_money || 0
        };

        // Update metric scores and bars (these should match the HTML IDs in the tooltip)
        Object.keys(metrics).forEach(metric => {
            const score = parseFloat(metrics[metric]).toFixed(1);
            const percentage = (metrics[metric] / 5) * 100;

            // You can add individual metric updates here if needed
            console.log(`[Rating] ${metric}: ${score} (${percentage}%)`);
        });
    },

    // Populate social links from socials JSONB
    populateSocialLinks(socials) {
        const socialLinksSection = document.getElementById('social-links-section');
        let hasAnySocial = false;

        // Map of social key to element ID
        const socialMap = {
            website: 'socialWebsite',
            facebook: 'socialFacebook',
            twitter: 'socialTwitter',
            linkedin: 'socialLinkedin',
            instagram: 'socialInstagram',
            youtube: 'socialYoutube',
            tiktok: 'socialTiktok'
        };

        for (const [key, elementId] of Object.entries(socialMap)) {
            const element = document.getElementById(elementId);
            if (element && socials[key]) {
                element.href = socials[key];
                element.style.display = 'flex';
                hasAnySocial = true;
            }
        }

        // Show/hide the entire social links section
        if (socialLinksSection) {
            socialLinksSection.style.display = hasAnySocial ? 'flex' : 'none';
        }
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
    },

    // Load connections count from database
    async loadConnectionsCount() {
        try {
            const connectionsData = await AdvertiserProfileAPI.getConnectionsCount();
            if (connectionsData && connectionsData.count !== undefined) {
                this.updateElement('connections-count', connectionsData.count);
                console.log(`[AdvertiserProfileDataLoader] Connections count loaded: ${connectionsData.count}`);
            }
        } catch (error) {
            console.error('[AdvertiserProfileDataLoader] Error loading connections count:', error);
            this.updateElement('connections-count', '0'); // Fallback
        }
    }
};
