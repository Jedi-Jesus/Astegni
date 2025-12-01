// Ad Analytics Modal Functions
// Update your button onclick to stop propagation

        // ============================================
        // AD PACKAGE MANAGER - DYNAMIC PACKAGE SYSTEM
        // ============================================
        const AdPackageManager = {
            // Package configuration
            packages: [
                {
                    id: 'three-days',
                    title: 'Up to Three days',
                    pricePerDay: 2000,
                    currency: 'ETB',
                    duration: 3,
                    featured: false,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite'
                    ]
                },
                {
                    id: 'seven-days',
                    title: 'Up to Seven days',
                    pricePerDay: 1800,
                    currency: 'ETB',
                    duration: 7,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'fifteen-days',
                    title: 'Up to fifteen days',
                    pricePerDay: 1500,
                    currency: 'ETB',
                    duration: 15,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'one-month',
                    title: 'Up to one month',
                    pricePerDay: 1200,
                    currency: 'ETB',
                    duration: 30,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Full analytics suite'
                    ]
                },
                {
                    id: 'three-months',
                    title: 'Up to three months',
                    pricePerDay: 1000,
                    currency: 'ETB',
                    duration: 90,
                    featured: true,
                    badge: 'Most Popular',
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite'
                    ]
                },
                {
                    id: 'six-months',
                    title: 'Up to six months',
                    pricePerDay: 800,
                    currency: 'ETB',
                    duration: 180,
                    featured: true,
                    badge: 'Most Popular',
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'nine-months',
                    title: 'Up to nine months',
                    pricePerDay: 600,
                    currency: 'ETB',
                    duration: 270,
                    featured: true,
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite',
                    ]
                },
                {
                    id: 'yearly',
                    title: 'Up to a year',
                    pricePerDay: 500,
                    currency: 'ETB',
                    duration: 365,
                    featured: true,
                    badge: 'Most Popular',
                    features: [
                        'Unlimited impressions',
                        'Custom targeting',
                        'Priority placement',
                        'Full analytics suite',
                    ]
                },
                // ... rest of the packages array from my previous response ...
            ],

            renderPackages() {
                const packagesSection = document.querySelector('#adAnalyticsModal .ad-packages');
                if (!packagesSection) return;

                packagesSection.innerHTML = `
            <h3>Advertising Packages</h3>
            <div class="packages-grid">
                ${this.packages.map(pkg => this.createPackageCard(pkg)).join('')}
            </div>
        `;
            },

            createPackageCard(pkg) {
                const totalPrice = pkg.pricePerDay * pkg.duration;
                const savings = this.calculateSavings(pkg);

                return `
            <div class="package-card ${pkg.featured ? 'featured' : ''}" data-package-id="${pkg.id}">
                ${pkg.badge ? `<div class="featured-badge">${pkg.badge}</div>` : ''}
                <h4>${pkg.title}</h4>
                <div class="package-price">${pkg.pricePerDay.toLocaleString()} ${pkg.currency}/day</div>
                <div class="package-total">Total: ${totalPrice.toLocaleString()} ${pkg.currency}</div>
                ${savings > 0 ? `<div class="package-savings">Save ${savings.toLocaleString()} ${pkg.currency}</div>` : ''}
                <ul>
                    ${pkg.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <button class="btn-primary" onclick="selectPackage('${pkg.id}')">
                    Select Package
                </button>
            </div>
        `;
            },

            calculateSavings(pkg) {
                const basePrice = 2000;
                const actualTotal = pkg.pricePerDay * pkg.duration;
                const expectedTotal = basePrice * pkg.duration;
                return Math.max(0, expectedTotal - actualTotal);
            }
        };

        // Global function for package selection
        window.selectPackage = function (packageId) {
            const pkg = AdPackageManager.packages.find(p => p.id === packageId);
            if (!pkg) return;

            Utils.showToast(`✅ Selected: ${pkg.title} - ${pkg.pricePerDay} ${pkg.currency}/day`, "success");

            // You can add checkout redirection here
            setTimeout(() => {
                // window.location.href = `/checkout?package=${packageId}`;
                console.log('Proceed to checkout with:', pkg);
            }, 1500);
        };


// Clean modal management - only define ad-specific functions
(function () {
    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function () {

        // Function to open ad analytics modal
        window.openAdAnalyticsModal = function (event) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }

            const modal = document.getElementById('adAnalyticsModal');
            if (!modal) {
                console.error('Ad Analytics Modal not found');
                return;
            }

            // Show modal with flex display for centering
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
            modal.classList.add('active', 'show');
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';

            document.body.style.overflow = 'hidden';

            // Check if AdPackageManager exists and render packages
            if (typeof AdPackageManager !== 'undefined' && AdPackageManager.renderPackages) {
                AdPackageManager.renderPackages();
            }

            // Initialize content
            setTimeout(() => {
                if (typeof animateAnalyticsNumbers !== 'undefined') animateAnalyticsNumbers();
                if (typeof startTestimonialCarousel !== 'undefined') startTestimonialCarousel();
            }, 100);
        };

        // Function to close ad modal
        window.closeAdAnalyticsModal = function () {
            const modal = document.getElementById('adAnalyticsModal');
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

// Setup ad button event listeners
document.addEventListener('DOMContentLoaded', function () {
    // For the ad container (clicking anywhere on it)
    document.querySelectorAll('.ad-container').forEach(container => {
        container.style.cursor = 'pointer';
        container.addEventListener('click', function (e) {
            // Don't trigger if clicking the button inside
            if (!e.target.classList.contains('ad-cta') && !e.target.classList.contains('ad-primary-btn')) {
                openAdModal();
            }
        });
    });

    // For the Learn More buttons (both classes)
    document.querySelectorAll('.ad-cta, .ad-primary-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            openAdModal();
        });
    });
});

// Wrapper function for opening ad modal
function openAdModal() {
    if (typeof window.openAdAnalyticsModal === 'function') {
        window.openAdAnalyticsModal();
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
    const statNumbers = document.querySelectorAll('.ad-stat-info h3');

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

