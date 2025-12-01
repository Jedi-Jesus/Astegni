// Ripple Effect Module
(function() {
    'use strict';

    function createRipple(event) {
        const button = event.currentTarget;

        // Create ripple element
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        // Calculate position
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - radius;
        const y = event.clientY - rect.top - radius;

        // Set styles
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
        circle.classList.add('ripple');

        // Remove any existing ripples
        const ripple = button.querySelector('.ripple');
        if (ripple) {
            ripple.remove();
        }

        // Add new ripple
        button.appendChild(circle);

        // Remove after animation
        setTimeout(() => {
            circle.remove();
        }, 600);
    }

    function initializeRippleEffects() {
        // Add ripple effect to buttons
        const rippleElements = document.querySelectorAll(
            '.cta-button, .nav-btn, .submit-btn, .video-action-btn, .filter-chip, .category-btn, .view-more-btn, .partner-btn'
        );

        rippleElements.forEach(element => {
            // Ensure element has position relative for ripple positioning
            if (getComputedStyle(element).position === 'static') {
                element.style.position = 'relative';
            }
            element.style.overflow = 'hidden';

            element.addEventListener('click', createRipple);
        });

        // Add CSS for ripple animation if not exists
        if (!document.getElementById('ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                .ripple {
                    position: absolute;
                    border-radius: 50%;
                    transform: scale(0);
                    animation: ripple 600ms ease-out;
                    background-color: rgba(255, 255, 255, 0.5);
                    pointer-events: none;
                }

                @keyframes ripple {
                    to {
                        transform: scale(4);
                        opacity: 0;
                    }
                }

                /* Dark mode ripple */
                [data-theme="dark"] .ripple {
                    background-color: rgba(255, 255, 255, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Initialize on DOM load
    document.addEventListener('DOMContentLoaded', initializeRippleEffects);

    // Reinitialize when new elements are added dynamically
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                setTimeout(initializeRippleEffects, 100);
            }
        });
    });

    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Export for global use
    window.rippleEffect = {
        init: initializeRippleEffects,
        createRipple
    };
})();