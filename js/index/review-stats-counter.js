// Review Statistics Counter Animation Module
(function() {
    'use strict';

    // Counter animation function
    function animateCounter(element, start, end, duration) {
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;

        const timer = setInterval(() => {
            current += increment;

            // Format number with comma separator
            element.textContent = current.toLocaleString();

            // Add animation effect
            element.style.transform = 'scale(1.05)';
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 100);

            if (current >= end) {
                clearInterval(timer);
                element.textContent = end.toLocaleString();

                // Add completion effect
                element.style.color = 'var(--button-bg)';
                setTimeout(() => {
                    element.style.color = '';
                }, 500);
            }
        }, stepTime);
    }

    // Initialize counters when element comes into view
    function initializeReviewCounters() {
        const reviewStats = document.getElementById('reviewStats');
        if (!reviewStats) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !entry.target.dataset.counted) {
                    entry.target.dataset.counted = 'true';

                    // Find all stat numbers
                    const statNumbers = entry.target.querySelectorAll('.stat-number');

                    statNumbers.forEach(statEl => {
                        const targetValue = parseInt(statEl.textContent.replace(/[^0-9]/g, ''));

                        // Reset to 0 and animate
                        statEl.textContent = '0';

                        // Add transition for smooth scaling
                        statEl.style.transition = 'transform 0.2s ease, color 0.3s ease';

                        // Start animation after a short delay
                        setTimeout(() => {
                            animateCounter(statEl, 0, targetValue, 2000);
                        }, 200);
                    });
                }
            });
        }, {
            threshold: 0.3
        });

        observer.observe(reviewStats);
    }

    // Initialize professional review statistics
    function initializeProfessionalReviewStats() {
        const statsContainer = document.getElementById('reviewStats');
        if (!statsContainer) return;

        const stats = [
            { value: 4.8, label: 'Average Rating', icon: '⭐' },
            { value: 1250, label: 'Total Reviews', icon: '💬' },
            { value: 95, label: 'Satisfaction Rate', suffix: '%', icon: '😊' },
            { value: 500, label: 'Expert Endorsements', icon: '🏆' }
        ];

        // Clear existing content
        statsContainer.innerHTML = '';

        stats.forEach((stat, index) => {
            const statItem = document.createElement('div');
            statItem.className = 'stat-item';
            statItem.style.opacity = '0';
            statItem.style.transform = 'translateY(20px)';

            statItem.innerHTML = `
                <span class="stat-icon">${stat.icon}</span>
                <span class="stat-number">${stat.value}</span>${stat.suffix || ''}
                <span class="stat-label">${stat.label}</span>
            `;

            statsContainer.appendChild(statItem);

            // Animate appearance
            setTimeout(() => {
                statItem.style.transition = 'all 0.5s ease';
                statItem.style.opacity = '1';
                statItem.style.transform = 'translateY(0)';
            }, index * 100);
        });

        // Initialize counter animation
        setTimeout(() => {
            initializeReviewCounters();
        }, 500);
    }

    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', () => {
        initializeProfessionalReviewStats();
    });

    // Export functions for global use
    window.reviewStatsCounter = {
        animateCounter,
        initializeReviewCounters,
        initializeProfessionalReviewStats
    };
})();