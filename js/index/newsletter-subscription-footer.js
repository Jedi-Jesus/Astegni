        // Newsletter form validation and submission
        const form = document.getElementById('newsletterForm');
        const emailInput = document.getElementById('emailInput');
        const submitBtn = document.getElementById('submitBtn');
        const feedback = document.getElementById('feedback');

        // Email validation regex
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Real-time validation
        emailInput.addEventListener('input', function () {
            if (this.value && !emailRegex.test(this.value)) {
                this.classList.add('error');
                this.classList.remove('success');
            } else if (this.value && emailRegex.test(this.value)) {
                this.classList.remove('error');
                this.classList.add('success');
            } else {
                this.classList.remove('error', 'success');
            }
        });

        // Form submission
        form.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = emailInput.value.trim();

            // Reset feedback
            feedback.classList.remove('show', 'error', 'success');

            // Validate email
            if (!email) {
                showFeedback('Please enter your email address', 'error');
                emailInput.classList.add('error');
                return;
            }

            if (!emailRegex.test(email)) {
                showFeedback('Please enter a valid email address', 'error');
                emailInput.classList.add('error');
                return;
            }

            // Show loading state
            submitBtn.classList.add('loading');
            submitBtn.textContent = 'Subscribing...';

            // Simulate API call
            setTimeout(() => {
                // Success response
                showFeedback('Successfully subscribed! Check your email.', 'success');
                emailInput.value = '';
                emailInput.classList.remove('error', 'success');
                submitBtn.classList.remove('loading');
                submitBtn.textContent = 'Subscribe';
            }, 1500);
        });

        function showFeedback(message, type) {
            feedback.textContent = message;
            feedback.classList.add('show', type);

            // Hide after 5 seconds
            setTimeout(() => {
                feedback.classList.remove('show');
            }, 5000);
        }

        // Add smooth scroll behavior for accessibility (only for hash links)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');

                // Only handle if it's a valid hash selector (starts with # and has content after)
                if (href && href.startsWith('#') && href.length > 1) {
                    e.preventDefault();
                    try {
                        const target = document.querySelector(href);
                        if (target) {
                            target.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                        }
                    } catch (error) {
                        console.warn('Invalid selector:', href);
                    }
                }
            });
        });

        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.animationPlayState = 'running';
                }
            });
        }, observerOptions);

        // Observe footer elements
        document.querySelectorAll('.footer-section-item').forEach(el => {
            el.style.animationPlayState = 'paused';
            observer.observe(el);
        });

        