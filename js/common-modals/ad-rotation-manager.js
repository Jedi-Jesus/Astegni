/**
 * Ad Rotation Manager
 * Handles ad fetching, rotation, and impression tracking
 * Works with dynamic campaign ads from API
 */

class AdRotationManager {
    constructor(options = {}) {
        this.rotationInterval = options.interval || 10000; // 10 seconds default
        this.transitionDuration = options.transitionDuration || 800; // 0.8s fade
        this.pauseOnHover = options.pauseOnHover !== false;
        this.autoPlay = options.autoPlay !== false;

        this.containers = new Map();
        this.isInitialized = false;
        this.trackedImpressions = new Set(); // Track which ads have been viewed
        this.impressionIds = new Map(); // Store impression IDs for click tracking
    }

    /**
     * Initialize all ad containers on the page
     */
    async init() {
        if (this.isInitialized) return;

        // Find all ad containers - check for data-placement attribute
        const adContainers = document.querySelectorAll('[data-placement]');

        for (const container of adContainers) {
            const placementType = container.dataset.placement;
            const profileType = container.dataset.profileType || null;
            const location = container.dataset.location || null;
            const audience = container.dataset.audience || null;

            // Fetch ads for this placement
            await this.loadAdsForPlacement(container, placementType, profileType, location, audience);
        }

        // Also handle legacy static ad containers
        const staticContainers = document.querySelectorAll('.leaderboard-banner.premium-promo');
        staticContainers.forEach((container, index) => {
            const slides = container.querySelectorAll('.promo-slide');
            if (slides.length > 1 && !container.dataset.placement) {
                this.initContainer(container, `static-ad-${index}`);
            }
        });

        this.isInitialized = true;
        console.log(`[AdRotationManager] Initialized ${this.containers.size} ad container(s)`);
    }

    /**
     * Fetch ads from API for a specific placement
     */
    async loadAdsForPlacement(container, placementType, profileType = null, location = null, audience = null) {
        try {
            // Build query params
            const params = new URLSearchParams({
                limit: '20'  // Fetch up to 20 ads for better rotation variety
            });
            if (profileType) params.append('profile_type', profileType);
            if (location) params.append('page_location', location);  // Changed from 'location' to 'page_location'
            if (audience) params.append('audience', audience);

            const response = await fetch(`${API_BASE_URL}/api/campaigns/ads/placement/${placementType}?${params}`);

            if (!response.ok) {
                console.warn(`[AdRotationManager] No ads available for ${placementType}`);
                return;
            }

            const data = await response.json();

            if (data.success && data.ads && data.ads.length > 0) {
                // Render ads into container
                this.renderAds(container, data.ads, placementType);

                // Initialize rotation
                const containerId = `${placementType}-${Date.now()}`;
                this.initContainer(container, containerId);
            } else {
                console.log(`[AdRotationManager] No ads for ${placementType}`);
            }
        } catch (error) {
            console.error(`[AdRotationManager] Error loading ads:`, error);
        }
    }

    /**
     * Render ads into container
     */
    renderAds(container, ads, placementType) {
        container.innerHTML = ''; // Clear existing content

        ads.forEach((ad, index) => {
            const slide = document.createElement('div');
            slide.className = 'promo-slide' + (index === 0 ? ' active' : '');
            slide.dataset.campaignId = ad.campaign_id;
            slide.dataset.mediaId = ad.media_id;
            slide.dataset.placement = placementType;
            slide.dataset.cpiRate = ad.cpi_rate;

            // Create ad content based on media type
            if (ad.media_type === 'video') {
                slide.innerHTML = `
                    <video class="promo-video" autoplay muted loop playsinline>
                        <source src="${ad.file_url}" type="${ad.file_type}">
                    </video>
                `;
            } else {
                slide.innerHTML = `
                    <img src="${ad.file_url}" alt="${ad.campaign_name}" class="promo-image">
                `;
            }

            // Add click tracking
            slide.addEventListener('click', () => {
                this.trackClick(ad.campaign_id, ad.media_id);
            });

            container.appendChild(slide);
        });

        // Track impression for first ad (after it becomes visible)
        setTimeout(() => {
            const firstAd = ads[0];
            this.trackImpression(firstAd.campaign_id, firstAd.media_id, placementType);
        }, 1000);
    }

    /**
     * Track impression when ad becomes visible
     */
    async trackImpression(campaignId, mediaId, placement) {
        const impressionKey = `${campaignId}-${mediaId}-${placement}`;

        // Only track once per page load
        if (this.trackedImpressions.has(impressionKey)) {
            return;
        }

        this.trackedImpressions.add(impressionKey);

        try {
            const userData = JSON.parse(localStorage.getItem('user') || 'null');
            const profileType = localStorage.getItem('currentRole') || null;

            const response = await fetch(`${API_BASE_URL}/api/campaign/track-impression`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    campaign_id: campaignId,
                    user_id: userData?.id || null,
                    profile_id: userData?.profile_id || null,
                    profile_type: profileType,
                    placement: placement,
                    location: null,
                    audience: null,
                    region: null,
                    device_type: this.getDeviceType()
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`[AdRotationManager] Impression tracked:`, data);

                // Store impression ID for click tracking
                if (data.impression_id) {
                    const clickKey = `${campaignId}-${mediaId}`;
                    this.impressionIds.set(clickKey, data.impression_id);
                }
            }
        } catch (error) {
            console.error('[AdRotationManager] Error tracking impression:', error);
        }
    }

    /**
     * Track click on ad
     */
    async trackClick(campaignId, mediaId) {
        try {
            // Get impression ID from stored impressions
            const clickKey = `${campaignId}-${mediaId}`;
            const impressionId = this.impressionIds.get(clickKey);

            if (!impressionId) {
                console.warn(`[AdRotationManager] No impression ID found for campaign ${campaignId}, media ${mediaId}`);
                return;
            }

            const response = await fetch(`${API_BASE_URL}/api/campaign/track-click?campaign_id=${campaignId}&impression_id=${impressionId}`, {
                method: 'POST'
            });

            if (response.ok) {
                console.log(`[AdRotationManager] Click tracked for campaign ${campaignId}, impression ${impressionId}`);
            }
        } catch (error) {
            console.error('[AdRotationManager] Error tracking click:', error);
        }
    }

    /**
     * Get device type
     */
    getDeviceType() {
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) {
            return 'tablet';
        }
        if (/mobile|iphone|ipod|android|blackberry|opera mini|opera mobi|skyfire|maemo|windows phone|palm|iemobile|symbian|symbianos|fennec/i.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    /**
     * Initialize a single container with rotating slides
     */
    initContainer(container, id) {
        const slides = container.querySelectorAll('.promo-slide');
        if (slides.length <= 1) return;

        const containerData = {
            element: container,
            slides: Array.from(slides),
            indicators: [],
            currentIndex: 0,
            intervalId: null,
            isPaused: false
        };

        // Inject required styles if not already present
        this.injectStyles();

        // Create indicators
        this.createIndicators(container, containerData);

        // Set first slide as active
        slides.forEach((slide, i) => {
            if (i === 0) {
                slide.classList.add('active');
            } else {
                slide.classList.remove('active');
            }
        });

        // Add hover pause functionality
        if (this.pauseOnHover) {
            container.addEventListener('mouseenter', () => {
                containerData.isPaused = true;
            });

            container.addEventListener('mouseleave', () => {
                containerData.isPaused = false;
            });
        }

        // Start auto-rotation
        if (this.autoPlay) {
            this.startRotation(containerData);
        }

        this.containers.set(id, containerData);
    }

    /**
     * Inject CSS styles for slide transitions
     */
    injectStyles() {
        if (document.getElementById('ad-rotation-styles')) return;

        const styles = document.createElement('style');
        styles.id = 'ad-rotation-styles';
        styles.textContent = `
            /* Ad Slide Transitions */
            .leaderboard-banner.premium-promo {
                position: relative;
            }

            .leaderboard-banner.premium-promo .promo-slide {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.8s ease-in-out, visibility 0.8s ease-in-out;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .leaderboard-banner.premium-promo .promo-slide.active {
                position: relative;
                opacity: 1;
                visibility: visible;
                z-index: 2;
            }

            .leaderboard-banner.premium-promo .promo-slide.fade-out {
                opacity: 0;
                z-index: 1;
            }

            /* Ad Indicators */
            .ad-indicators {
                position: absolute;
                bottom: 1rem;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 0.5rem;
                z-index: 10;
            }

            .ad-indicator {
                width: 40px;
                height: 4px;
                background: rgba(255, 255, 255, 0.3);
                border-radius: 2px;
                overflow: hidden;
                cursor: pointer;
                transition: background 0.3s ease;
            }

            .ad-indicator:hover {
                background: rgba(255, 255, 255, 0.5);
            }

            .ad-indicator.active {
                background: rgba(255, 255, 255, 0.4);
            }

            .ad-indicator-progress {
                height: 100%;
                width: 0%;
                background: white;
                border-radius: 2px;
            }

            .ad-indicator.active .ad-indicator-progress {
                animation: adProgress 10s linear forwards;
            }

            @keyframes adProgress {
                from { width: 0%; }
                to { width: 100%; }
            }

            /* Pause progress on hover */
            .leaderboard-banner.premium-promo:hover .ad-indicator.active .ad-indicator-progress {
                animation-play-state: paused;
            }

            /* Slide content wrapper */
            .promo-slide .promo-animation,
            .promo-slide .promo-content,
            .promo-slide .promo-visual {
                pointer-events: auto;
            }

            /* Responsive indicators */
            @media (max-width: 480px) {
                .ad-indicators {
                    bottom: 0.5rem;
                }
                .ad-indicator {
                    width: 24px;
                    height: 3px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    /**
     * Create progress indicators
     */
    createIndicators(container, containerData) {
        let indicatorContainer = container.querySelector('.ad-indicators');

        if (!indicatorContainer) {
            indicatorContainer = document.createElement('div');
            indicatorContainer.className = 'ad-indicators';
            container.appendChild(indicatorContainer);
        }

        indicatorContainer.innerHTML = '';

        containerData.slides.forEach((slide, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'ad-indicator' + (index === 0 ? ' active' : '');
            indicator.innerHTML = '<div class="ad-indicator-progress"></div>';

            indicator.addEventListener('click', (e) => {
                e.stopPropagation();
                this.goToSlide(containerData, index);
            });

            indicatorContainer.appendChild(indicator);
            containerData.indicators.push(indicator);
        });
    }

    /**
     * Show a specific slide with smooth transition
     */
    showSlide(containerData, index) {
        const { slides, indicators, currentIndex } = containerData;

        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        if (index === currentIndex) return;

        // Fade out current slide
        slides[currentIndex].classList.add('fade-out');
        slides[currentIndex].classList.remove('active');

        // Fade in new slide
        slides[index].classList.remove('fade-out');
        slides[index].classList.add('active');

        // Track impression for new slide
        const newSlide = slides[index];
        if (newSlide.dataset.campaignId) {
            setTimeout(() => {
                this.trackImpression(
                    parseInt(newSlide.dataset.campaignId),
                    parseInt(newSlide.dataset.mediaId),
                    newSlide.dataset.placement
                );
            }, 1000); // Track after 1 second of visibility
        }

        // Update indicators
        indicators.forEach((ind, i) => {
            ind.classList.remove('active');
            const progress = ind.querySelector('.ad-indicator-progress');
            if (progress) {
                progress.style.animation = 'none';
                progress.offsetHeight; // Trigger reflow
                progress.style.animation = '';
            }
        });
        indicators[index].classList.add('active');

        containerData.currentIndex = index;

        // Restart timer
        if (this.autoPlay && !containerData.isPaused) {
            this.startRotation(containerData);
        }
    }

    /**
     * Go to specific slide
     */
    goToSlide(containerData, index) {
        this.showSlide(containerData, index);
    }

    /**
     * Go to next slide
     */
    nextSlide(containerData) {
        const nextIndex = (containerData.currentIndex + 1) % containerData.slides.length;
        this.showSlide(containerData, nextIndex);
    }

    /**
     * Start auto-rotation
     */
    startRotation(containerData) {
        if (containerData.intervalId) {
            clearInterval(containerData.intervalId);
        }

        containerData.intervalId = setInterval(() => {
            if (!containerData.isPaused) {
                this.nextSlide(containerData);
            }
        }, this.rotationInterval);
    }

    /**
     * Stop auto-rotation
     */
    stopRotation(containerData) {
        if (containerData.intervalId) {
            clearInterval(containerData.intervalId);
            containerData.intervalId = null;
        }
    }

    /**
     * Destroy all containers
     */
    destroy() {
        this.containers.forEach(containerData => {
            this.stopRotation(containerData);
        });
        this.containers.clear();
        this.isInitialized = false;
    }
}

// Create global instance
const adRotationManager = new AdRotationManager({
    interval: 10000,      // 10 seconds
    transitionDuration: 800,
    pauseOnHover: true,
    autoPlay: true
});

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        adRotationManager.init();
    }, 100);
});

// Re-initialize after dynamic content loads
window.initAdRotation = function() {
    adRotationManager.destroy();
    adRotationManager.init();
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdRotationManager, adRotationManager };
}
