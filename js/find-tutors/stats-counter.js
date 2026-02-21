// ============================================
// STATS COUNTER ANIMATION MODULE
// Fetches platform stats from database API
// ============================================

const StatsCounter = {
    // Default fallback values if API fails
    defaultStats: {
        tutors_count: 500,
        courses_count: 50,
        schools_count: 10,
        average_rating: 4.5,
        unique_countries: 1
    },

    async init() {
        // First fetch stats from API, then initialize counter animation
        await this.fetchPlatformStats();
        this.initializeStatsCounter();
    },

    async fetchPlatformStats() {
        try {
            // Use the global API_BASE_URL if available, otherwise default to localhost
            const baseUrl = window.API_BASE_URL ? `${window.API_BASE_URL}/api` : 'http://localhost:8000/api';
            const response = await fetch(`${baseUrl}/platform-stats`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const stats = await response.json();
            console.log('Platform stats loaded from database:', stats);

            // Update the data-target attributes with real values from database
            this.updateStatTargets(stats);
        } catch (error) {
            console.warn('Failed to fetch platform stats, using defaults:', error);
            // Use default values if API fails
            this.updateStatTargets(this.defaultStats);
        }
    },

    updateStatTargets(stats) {
        // Update tutors count (use nullish coalescing to allow 0 values)
        const tutorsEl = document.getElementById('stat-tutors');
        if (tutorsEl) {
            tutorsEl.setAttribute('data-target', stats.tutors_count ?? this.defaultStats.tutors_count);
        }

        // Update courses count
        const coursesEl = document.getElementById('stat-courses');
        if (coursesEl) {
            coursesEl.setAttribute('data-target', stats.courses_count ?? this.defaultStats.courses_count);
        }

        // Update schools count
        const schoolsEl = document.getElementById('stat-schools');
        if (schoolsEl) {
            schoolsEl.setAttribute('data-target', stats.schools_count ?? this.defaultStats.schools_count);
        }

        // Update average rating
        const ratingEl = document.getElementById('stat-rating');
        if (ratingEl) {
            ratingEl.setAttribute('data-target', stats.average_rating ?? this.defaultStats.average_rating);
        }

        // Update countries count
        const countriesEl = document.getElementById('stat-countries');
        if (countriesEl) {
            countriesEl.setAttribute('data-target', stats.unique_countries ?? this.defaultStats.unique_countries);
        }
    },

    initializeStatsCounter() {
        const statNumbers = document.querySelectorAll('.stat-number');
        if (statNumbers.length === 0) return;

        // Use IntersectionObserver to trigger animation when stats come into view
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                    observer.unobserve(entry.target); // Only animate once
                }
            });
        }, {
            threshold: 0.5 // Trigger when 50% of element is visible
        });

        statNumbers.forEach(statNumber => {
            observer.observe(statNumber);
        });
    },

    animateCounter(element) {
        const target = parseFloat(element.getAttribute('data-target'));

        // Skip elements without a valid numeric target (e.g., "Coming Soon" stats)
        if (isNaN(target)) {
            return;
        }

        const suffix = element.getAttribute('data-suffix') || '';
        const decimal = parseInt(element.getAttribute('data-decimal')) || 0;
        const duration = 2000; // 2 seconds
        const start = 0;
        const startTime = Date.now();

        const updateCounter = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (target - start) * easeOutQuart;

            // Format number with appropriate decimal places
            const displayValue = decimal > 0 ? current.toFixed(decimal) : Math.floor(current);
            element.textContent = displayValue + suffix;

            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                // Ensure final value is exact
                const finalValue = decimal > 0 ? target.toFixed(decimal) : target;
                element.textContent = finalValue + suffix;
            }
        };

        requestAnimationFrame(updateCounter);
    }
};
