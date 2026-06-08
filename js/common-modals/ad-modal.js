// Ad Analytics Modal Functions
// Update your button onclick to stop propagation
//
// NOTE: The legacy hardcoded "AdPackageManager" duration-package list was removed.
// Advertising pricing is now driven by CPI view tiers (cpi_settings.view_tier_premiums),
// rendered by the "View pricing" CTA in js/common-modals/advertise-with-us-cta.js.
// This file now only handles the ad-analytics modal open/close + banner behavior.


// Clean modal management - only define ad-specific functions
(function () {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function () {

        // Function to open ad analytics modal - NOW OPENS COMING SOON MODAL
        window.openAdAnalyticsModal = function (event) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }

            // Open coming soon modal instead of ad analytics
            if (typeof openComingSoonModal === 'function') {
                openComingSoonModal('Advertising');
            } else {
                console.error('openComingSoonModal function not found');
            }
            // Stop here - the ad-analytics modal now routes to the Coming Soon modal.
        };

        // Function to close ad modal
        window.closeAdAnalyticsModal = function () {
            const modal = document.getElementById('promoAnalyticsModal');
            if (!modal) return;

            modal.classList.remove('active', 'show');
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            document.body.style.overflow = '';

            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        };
    });
})();

// Setup ad button event listeners - NOW OPENS COMING SOON MODAL
document.addEventListener('DOMContentLoaded', function () {
    // For the ad container (clicking anywhere on it)
    document.querySelectorAll('.leaderboard-banner').forEach(container => {
        container.style.cursor = 'pointer';
        container.addEventListener('click', function (e) {
            // Don't trigger if clicking the button inside or promo-slide (which has its own onclick)
            if (!e.target.classList.contains('promo-cta') &&
                !e.target.classList.contains('ad-primary-btn') &&
                !e.target.classList.contains('promo-slide') &&
                !e.target.closest('.promo-slide')) {
                // Open coming soon modal instead of ad analytics
                if (typeof openComingSoonModal === 'function') {
                    openComingSoonModal('Advertising');
                } else {
                    console.error('openComingSoonModal function not found');
                }
            }
        });
    });

    // For the Learn More buttons (both classes)
    document.querySelectorAll('.promo-cta, .ad-primary-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            // Open coming soon modal instead of ad analytics
            if (typeof openComingSoonModal === 'function') {
                openComingSoonModal('Advertising');
            } else {
                console.error('openComingSoonModal function not found');
            }
        });
    });
});

// Wrapper function for opening ad modal - NOW OPENS COMING SOON MODAL
function openAdModal() {
    // Open coming soon modal instead of ad analytics
    if (typeof openComingSoonModal === 'function') {
        openComingSoonModal('Advertising');
    } else {
        console.error('openComingSoonModal function not found');
    }
}
// Initialize analytics when modal opens
function initializeAdAnalytics() {
    // Animate numbers on modal open
    animateAnalyticsNumbers();

    // Start rotating testimonials
    startTestimonialCarousel();
}

// Animate statistics numbers
function animateAnalyticsNumbers() {
    const statNumbers = document.querySelectorAll('.promo-stat-info h3');

    statNumbers.forEach(stat => {
        const finalValue = stat.textContent;
        const isPercentage = finalValue.includes('%');
        const isPrice = finalValue.includes('$');
        const numericValue = parseFloat(finalValue.replace(/[^0-9.]/g, ''));

        let currentValue = 0;
        const increment = numericValue / 50;
        const timer = setInterval(() => {
            currentValue += increment;

            if (currentValue >= numericValue) {
                currentValue = numericValue;
                clearInterval(timer);
                stat.textContent = finalValue; // Restore original format
            } else {
                let displayValue = currentValue.toFixed(1);
                if (finalValue.includes('M')) {
                    displayValue = (currentValue / 1).toFixed(1) + 'M';
                } else if (finalValue.includes('K')) {
                    displayValue = Math.round(currentValue) + 'K';
                } else if (isPercentage) {
                    displayValue = currentValue.toFixed(1) + '%';
                } else if (isPrice) {
                    displayValue = '$' + currentValue.toFixed(2);
                }
                stat.textContent = displayValue;
            }
        }, 30);
    });
}

// Testimonial carousel
function startTestimonialCarousel() {
    const testimonials = document.querySelectorAll('.testimonial-card');
    let currentIndex = 0;

    if (testimonials.length <= 1) return;

    // Hide all except first
    testimonials.forEach((card, index) => {
        card.style.display = index === 0 ? 'block' : 'none';
    });

    setInterval(() => {
        testimonials[currentIndex].style.display = 'none';
        currentIndex = (currentIndex + 1) % testimonials.length;
        testimonials[currentIndex].style.display = 'block';
        testimonials[currentIndex].style.animation = 'fadeInSlide 0.5s ease';
    }, 5000);
}

// Start advertising (action button)
function startAdvertising() {
    // Close modal first
    closeAdAnalyticsModal();

    // Redirect to advertising campaign creation or contact form
    // You can customize this based on your needs
    alert('Redirecting to campaign creation...');
    // window.location.href = '/create-campaign';
}

