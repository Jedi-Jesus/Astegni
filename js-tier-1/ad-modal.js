// Ad Analytics Modal Functions
// Update your button onclick to stop propagation

// Clean modal management
(function () {
    // Wait for DOM and other scripts to load
    window.addEventListener('load', function () {

        // Function to open ad analytics modal
        // Also update the window.openAdAnalyticsModal function
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

            // Show modal
            modal.style.display = 'block';
            requestAnimationFrame(() => {
                modal.classList.add('active');
            });

            document.body.style.overflow = 'hidden';

            // Check if AdPackageManager exists and render packages
            if (typeof AdPackageManager !== 'undefined' && AdPackageManager.renderPackages) {
                AdPackageManager.renderPackages();
            }

            // Initialize content
            setTimeout(() => {
                animateAnalyticsNumbers();
                startTestimonialCarousel();
            }, 100);
        };

        // Function to close modal
        window.closeAdAnalyticsModal = function () {
            const modal = document.getElementById('adAnalyticsModal');
            if (!modal) return;

            modal.classList.remove('active');
            document.body.style.overflow = '';

            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        };

        // Update the event listener section in ad-modal.js
        document.querySelectorAll('.ad-cta, .ad-primary-btn').forEach(btn => {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                openAdModal();
            });
        });

        document.querySelectorAll('.ad-cta').forEach(btn => {
            btn.onclick = function (e) {
                e.stopPropagation();
                window.openAdAnalyticsModal(e);
            };
        });

        // ESC key to close
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                window.closeAdAnalyticsModal();
            }
        });
    });
})();

// Override the conflicting functions
document.addEventListener('DOMContentLoaded', function () {
    // Remove any existing event listeners
    const adButtons = document.querySelectorAll('.ad-cta, .ad-container, .ad-primary-btn');

    adButtons.forEach(button => {
        // Clone to remove all event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });

    // Re-attach correct event listeners
    setTimeout(() => {
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
    }, 100);
});

// Update the openAdModal function
function openAdModal() {
    const modal = document.getElementById('adAnalyticsModal');
    if (modal) {
        modal.style.display = 'block';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Check if AdPackageManager exists and render packages
        if (typeof AdPackageManager !== 'undefined' && AdPackageManager.renderPackages) {
            AdPackageManager.renderPackages();
        }

        // Initialize animations
        setTimeout(() => {
            animateAnalyticsNumbers();
            startTestimonialCarousel();
        }, 100);
    }
}

// Update close function
function closeAdAnalyticsModal() {
    const modal = document.getElementById('adAnalyticsModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
        document.body.style.overflow = '';
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

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAdAnalyticsModal();
    }
});

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', closeAdAnalyticsModal);
    }
});