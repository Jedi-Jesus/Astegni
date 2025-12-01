// ============================================
// STATS COUNTER ANIMATION MODULE
// ============================================

const StatsCounter = {
    init() {
        this.initializeStatsCounter();
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