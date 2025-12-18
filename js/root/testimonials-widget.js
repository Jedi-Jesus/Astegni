/**
 * Testimonials Widget - Featured Reviews Display
 * Shows featured platform reviews in ad-placeholder sections
 */

const TestimonialsWidget = {
    API_BASE_URL: window.API_BASE_URL || 'http://localhost:8000',
    currentIndex: 0,
    testimonials: [],
    autoRotateInterval: null,

    /**
     * Initialize testimonials widget
     * @param {string} containerId - ID of the container element
     * @param {string} location - Display location (e.g., 'parent-profile', 'all')
     * @param {number} limit - Number of testimonials to fetch
     */
    async init(containerId, location = 'all', limit = 6) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} not found`);
            return;
        }

        try {
            await this.loadTestimonials(location, limit);
            this.render(containerId);
            this.startAutoRotate(containerId);
        } catch (error) {
            console.error('Error initializing testimonials:', error);
            this.renderError(containerId);
        }
    },

    /**
     * Load testimonials from API
     */
    async loadTestimonials(location, limit) {
        try {
            const response = await fetch(
                `${this.API_BASE_URL}/api/featured-reviews?location=${location}&limit=${limit}`
            );

            if (!response.ok) throw new Error('Failed to load testimonials');

            this.testimonials = await response.json();
            this.currentIndex = 0;
        } catch (error) {
            console.error('Error loading testimonials:', error);
            throw error;
        }
    },

    /**
     * Render testimonials widget
     */
    render(containerId) {
        const container = document.getElementById(containerId);
        if (!container || this.testimonials.length === 0) {
            this.renderEmpty(containerId);
            return;
        }

        container.innerHTML = `
            <div class="testimonials-widget">
                <div class="testimonials-header">
                    <h3 class="testimonials-title">
                        <i class="fas fa-quote-left"></i>
                        What Our Users Say
                    </h3>
                    <div class="testimonials-navigation">
                        <button onclick="TestimonialsWidget.previous('${containerId}')" class="nav-btn">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="testimonials-counter">
                            <span id="current-testimonial">1</span> / ${this.testimonials.length}
                        </span>
                        <button onclick="TestimonialsWidget.next('${containerId}')" class="nav-btn">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>

                <div class="testimonials-carousel" id="testimonials-carousel-${containerId}">
                    ${this.renderTestimonial(this.testimonials[0])}
                </div>

                <div class="testimonials-indicators" id="indicators-${containerId}">
                    ${this.testimonials.map((_, index) => `
                        <button class="indicator ${index === 0 ? 'active' : ''}"
                                onclick="TestimonialsWidget.goTo(${index}, '${containerId}')"
                                aria-label="Go to testimonial ${index + 1}">
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Render single testimonial
     */
    renderTestimonial(testimonial) {
        if (!testimonial) return '';

        const stars = this.renderStars(testimonial.rating);
        // Use UI Avatars as fallback - generates avatar based on name
        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.reviewer_name || 'User')}&background=4F46E5&color=fff&size=128`;

        return `
            <div class="testimonial-card">
                <div class="testimonial-rating">${stars}</div>
                <p class="testimonial-text">"${testimonial.review}"</p>
                <div class="testimonial-author">
                    <img src="${testimonial.reviewer_profile_picture || defaultAvatar}"
                         alt="${testimonial.reviewer_name}"
                         class="author-avatar"
                         onerror="this.src='https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff&size=128'">
                    <div class="author-info">
                        <div class="author-name">${testimonial.reviewer_name}</div>
                        <div class="author-role">
                            <i class="fas fa-${this.getRoleIcon(testimonial.reviewer_role)}"></i>
                            ${this.capitalizeFirst(testimonial.reviewer_role)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Render star rating
     */
    renderStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star"></i>';
            } else {
                stars += '<i class="far fa-star"></i>';
            }
        }
        return stars;
    },

    /**
     * Get role icon
     */
    getRoleIcon(role) {
        const icons = {
            student: 'user-graduate',
            tutor: 'chalkboard-teacher',
            parent: 'users',
            advertiser: 'bullhorn'
        };
        return icons[role] || 'user';
    },

    /**
     * Capitalize first letter
     */
    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Go to specific testimonial
     */
    goTo(index, containerId) {
        if (index < 0 || index >= this.testimonials.length) return;

        this.currentIndex = index;
        this.updateCarousel(containerId);
        this.resetAutoRotate(containerId);
    },

    /**
     * Go to next testimonial
     */
    next(containerId) {
        this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
        this.updateCarousel(containerId);
        this.resetAutoRotate(containerId);
    },

    /**
     * Go to previous testimonial
     */
    previous(containerId) {
        this.currentIndex = (this.currentIndex - 1 + this.testimonials.length) % this.testimonials.length;
        this.updateCarousel(containerId);
        this.resetAutoRotate(containerId);
    },

    /**
     * Update carousel display
     */
    updateCarousel(containerId) {
        const carousel = document.getElementById(`testimonials-carousel-${containerId}`);
        const counter = document.getElementById('current-testimonial');
        const indicators = document.querySelectorAll(`#indicators-${containerId} .indicator`);

        if (carousel) {
            carousel.innerHTML = this.renderTestimonial(this.testimonials[this.currentIndex]);
        }

        if (counter) {
            counter.textContent = this.currentIndex + 1;
        }

        indicators.forEach((indicator, index) => {
            if (index === this.currentIndex) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    },

    /**
     * Start auto-rotation
     */
    startAutoRotate(containerId) {
        if (this.testimonials.length <= 1) return;

        this.autoRotateInterval = setInterval(() => {
            this.next(containerId);
        }, 5000); // Rotate every 5 seconds
    },

    /**
     * Reset auto-rotation
     */
    resetAutoRotate(containerId) {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
        }
        this.startAutoRotate(containerId);
    },

    /**
     * Stop auto-rotation
     */
    stopAutoRotate() {
        if (this.autoRotateInterval) {
            clearInterval(this.autoRotateInterval);
            this.autoRotateInterval = null;
        }
    },

    /**
     * Render empty state
     */
    renderEmpty(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="testimonials-empty">
                <i class="fas fa-star fa-2x"></i>
                <p>No testimonials available</p>
            </div>
        `;
    },

    /**
     * Render error state
     */
    renderError(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="testimonials-error">
                <i class="fas fa-exclamation-triangle fa-2x"></i>
                <p>Unable to load testimonials</p>
            </div>
        `;
    }
};

// Make available globally
window.TestimonialsWidget = TestimonialsWidget;
