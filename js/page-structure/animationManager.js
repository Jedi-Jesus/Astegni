
// ============================================
// ENHANCED ANIMATIONS MANAGER
// ============================================
class AnimationsManager {
    constructor(options = {}) {
        this.options = {
            enableParallax: true,
            enableHover: true,
            enableReveal: true,
            enableMagnetic: false,
            parallaxIntensity: 0.3,
            hoverIntensity: 15,
            revealDuration: 600,
            throttleDelay: 16,
            ...options
        };
        
        this.observers = [];
        this.rafId = null;
        this.scrollY = 0;
        this.mouseX = 0;
        this.mouseY = 0;
        
        this.init();
    }

    init() {
        if (this.options.enableReveal) this.setupRevealAnimations();
        if (this.options.enableHover) this.setupHoverEffects();
        if (this.options.enableParallax) this.setupParallaxEffects();
        if (this.options.enableMagnetic) this.setupMagneticEffects();
        this.setupScrollListener();
        this.setupResizeListener();
    }

    // Advanced reveal animations with multiple styles
    setupRevealAnimations() {
        const options = {
            threshold: 0.05,
            rootMargin: "0px 0px -10% 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting && !entry.target.classList.contains('revealed')) {
                    const delay = this.calculateStaggerDelay(entry.target, index);
                    const animationType = entry.target.dataset.animation || 'fadeUp';
                    
                    setTimeout(() => {
                        entry.target.classList.add('revealed', `reveal-${animationType}`);
                        this.triggerCountAnimation(entry.target);
                    }, delay);
                }
            });
        }, options);

        // Select all animatable elements
        const elements = document.querySelectorAll(
            '.stat-card, .award-card, .follow-card, .class-card, .video-card, .blog-card, [data-animate]'
        );
        
        elements.forEach((el, index) => {
            // Add initial state classes
            el.classList.add('reveal-item');
            
            // Set animation type based on element type or data attribute
            if (!el.dataset.animation) {
                if (el.classList.contains('stat-card')) {
                    el.dataset.animation = 'scale';
                } else if (el.classList.contains('award-card')) {
                    el.dataset.animation = 'rotate';
                } else {
                    el.dataset.animation = 'fadeUp';
                }
            }
            
            observer.observe(el);
        });
        
        this.observers.push(observer);
    }

    // Calculate smart stagger delays based on position
    calculateStaggerDelay(element, index) {
        const rect = element.getBoundingClientRect();
        const row = Math.floor(rect.top / 200);
        const col = Math.floor(rect.left / 200);
        const zigzag = (row + col) * 50;
        return Math.min(zigzag, 400);
    }

    // Enhanced hover effects with spring physics
    setupHoverEffects() {
        const cards = document.querySelectorAll(
            '.stat-card, .award-card, .class-card, [data-hover="3d"]'
        );

        cards.forEach(card => {
            let currentX = 0;
            let currentY = 0;
            let targetX = 0;
            let targetY = 0;
            let rafId = null;

            const updateTransform = () => {
                currentX += (targetX - currentX) * 0.1;
                currentY += (targetY - currentY) * 0.1;
                
                card.style.transform = `
                    perspective(1000px) 
                    rotateX(${currentX}deg) 
                    rotateY(${currentY}deg) 
                    translateZ(30px)
                    scale(1.02)
                `;
                
                if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
                    rafId = requestAnimationFrame(updateTransform);
                }
            };

            card.addEventListener('mouseenter', (e) => {
                card.style.transition = 'box-shadow 0.3s ease';
                card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2)';
                if (!card.querySelector('.shine')) {
                    this.addShineEffect(card);
                }
            });

            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                targetX = ((y - centerY) / centerY) * -this.options.hoverIntensity;
                targetY = ((x - centerX) / centerX) * this.options.hoverIntensity;
                
                if (!rafId) {
                    rafId = requestAnimationFrame(updateTransform);
                }

                // Update shine position
                const shine = card.querySelector('.shine');
                if (shine) {
                    const shineX = (x / rect.width) * 100;
                    const shineY = (y / rect.height) * 100;
                    shine.style.background = `
                        radial-gradient(
                            circle at ${shineX}% ${shineY}%,
                            rgba(255,255,255,0.3) 0%,
                            transparent 60%
                        )
                    `;
                }
            });

            card.addEventListener('mouseleave', () => {
                targetX = 0;
                targetY = 0;
                card.style.boxShadow = '';
                
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                
                requestAnimationFrame(updateTransform);
                
                const shine = card.querySelector('.shine');
                if (shine) {
                    setTimeout(() => shine.remove(), 300);
                }
            });
        });
    }

    // Add shine overlay effect
    addShineEffect(element) {
        const shine = document.createElement('div');
        shine.className = 'shine';
        shine.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            opacity: 0;
            animation: fadeIn 0.3s forwards;
            z-index: 10;
            border-radius: inherit;
        `;
        element.style.position = 'relative';
        element.appendChild(shine);
    }

    // Smooth parallax without the dropping effect
    setupParallaxEffects() {
        const parallaxElements = [
            { selector: '.cover-img', speed: 0.5, offset: 0 },
            { selector: '.hero-section', speed: 0.3, offset: 0 },
            { selector: '[data-parallax]', speed: 0.2, offset: 0 }
        ];

        this.parallaxElements = parallaxElements.map(config => ({
            ...config,
            elements: document.querySelectorAll(config.selector)
        })).filter(config => config.elements.length > 0);
    }

    // Magnetic cursor effect for interactive elements
    setupMagneticEffects() {
        const magneticElements = document.querySelectorAll('[data-magnetic], .btn, .follow-card');
        
        magneticElements.forEach(elem => {
            let currentX = 0;
            let currentY = 0;
            
            elem.addEventListener('mousemove', (e) => {
                const rect = elem.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                currentX = x * 0.3;
                currentY = y * 0.3;
                
                elem.style.transform = `translate(${currentX}px, ${currentY}px)`;
                elem.style.transition = 'transform 0.1s ease-out';
            });
            
            elem.addEventListener('mouseleave', () => {
                elem.style.transform = 'translate(0, 0)';
                elem.style.transition = 'transform 0.3s ease-out';
            });
        });
    }

    // Optimized scroll handling
    setupScrollListener() {
        let ticking = false;
        
        const updateScroll = () => {
            this.scrollY = window.pageYOffset;
            
            if (this.options.enableParallax) {
                this.updateParallax();
            }
            
            this.updateScrollProgress();
            ticking = false;
        };
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateScroll);
                ticking = true;
            }
        });
    }

    // Update parallax positions (upward float effect instead of dropping)
    updateParallax() {
        if (!this.parallaxElements) return;
        
        this.parallaxElements.forEach(config => {
            config.elements.forEach(elem => {
                const rect = elem.getBoundingClientRect();
                const speed = parseFloat(elem.dataset.parallaxSpeed) || config.speed;
                const offset = parseFloat(elem.dataset.parallaxOffset) || config.offset;
                
                // Calculate parallax based on element's position in viewport
                const viewportHeight = window.innerHeight;
                const elementCenter = rect.top + rect.height / 2;
                const centerOffset = elementCenter - viewportHeight / 2;
                
                // Upward floating effect instead of dropping
                const yPos = -(centerOffset * speed * this.options.parallaxIntensity) + offset;
                
                elem.style.transform = `translateY(${yPos}px)`;
                elem.style.willChange = 'transform';
            });
        });
    }

    // Scroll progress indicator
    updateScrollProgress() {
        const progress = this.scrollY / (document.body.scrollHeight - window.innerHeight);
        document.documentElement.style.setProperty('--scroll-progress', progress);
    }

    // Number counting animation for stats
    triggerCountAnimation(element) {
        const countElements = element.querySelectorAll('[data-count]');
        
        countElements.forEach(countEl => {
            const target = parseInt(countEl.dataset.count);
            const duration = parseInt(countEl.dataset.duration) || 2000;
            const start = 0;
            const startTime = performance.now();
            
            const updateCount = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function for smooth animation
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = Math.floor(start + (target - start) * easeOutQuart);
                
                countEl.textContent = current.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(updateCount);
                } else {
                    countEl.textContent = target.toLocaleString();
                }
            };
            
            requestAnimationFrame(updateCount);
        });
    }

    // Handle window resize
    setupResizeListener() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
    }

    handleResize() {
        // Recalculate positions if needed
        if (this.options.enableParallax) {
            this.updateParallax();
        }
    }

    // Cleanup method
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
    }
}

// Initialize with custom options
const animations = new AnimationsManager({
    enableParallax: true,
    enableHover: true,
    enableReveal: true,
    enableMagnetic: true,
    parallaxIntensity: 0.2,
    hoverIntensity: 12,
    revealDuration: 500
});

// Required CSS for animations (add to your stylesheet)
const animationStyles = `
    .reveal-item {
        opacity: 0;
        will-change: transform, opacity;
    }
    
    .reveal-item.revealed {
        opacity: 1;
        transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .reveal-fadeUp {
        transform: translateY(30px);
    }
    
    .reveal-fadeUp.revealed {
        transform: translateY(0);
    }
    
    .reveal-scale {
        transform: scale(0.9);
    }
    
    .reveal-scale.revealed {
        transform: scale(1);
    }
    
    .reveal-rotate {
        transform: rotate(-5deg) scale(0.9);
    }
    
    .reveal-rotate.revealed {
        transform: rotate(0) scale(1);
    }
    
    @keyframes fadeIn {
        to { opacity: 1; }
    }
`;