/**
 * Ad Rotation Manager
 * Handles smooth 10-second ad rotation with fade transitions
 * Works with .promo-container.premium-promo structure
 */

class AdRotationManager {
    constructor(options = {}) {
        this.rotationInterval = options.interval || 10000; // 10 seconds default
        this.transitionDuration = options.transitionDuration || 800; // 0.8s fade
        this.pauseOnHover = options.pauseOnHover !== false;
        this.autoPlay = options.autoPlay !== false;

        this.containers = new Map();
        this.isInitialized = false;
    }

    /**
     * Initialize all ad containers on the page
     */
    init() {
        if (this.isInitialized) return;

        // Find all ad containers with slides
        const adContainers = document.querySelectorAll('.promo-container.premium-promo');

        adContainers.forEach((container, index) => {
            const slides = container.querySelectorAll('.promo-slide');
            if (slides.length > 1) {
                this.initContainer(container, `ad-${index}`);
            }
        });

        this.isInitialized = true;
        console.log(`[AdRotationManager] Initialized ${this.containers.size} rotating ad container(s)`);
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
            .promo-container.premium-promo {
                position: relative;
            }

            .promo-container.premium-promo .promo-slide {
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

            .promo-container.premium-promo .promo-slide.active {
                position: relative;
                opacity: 1;
                visibility: visible;
                z-index: 2;
            }

            .promo-container.premium-promo .promo-slide.fade-out {
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
            .promo-container.premium-promo:hover .ad-indicator.active .ad-indicator-progress {
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
