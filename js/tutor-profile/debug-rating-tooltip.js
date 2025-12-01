        document.addEventListener('DOMContentLoaded', function () {
            const ratingWrapper = document.getElementById('rating-hover-trigger');
            const ratingTooltip = document.getElementById('rating-tooltip');

            if (ratingWrapper && ratingTooltip) {
                console.log('✅ Rating elements found');

                ratingWrapper.addEventListener('mouseenter', function () {
                    console.log('🖱️ Mouse entered rating wrapper');
                    ratingTooltip.classList.add('visible');  // Add visible class for solid background
                    console.log('Tooltip opacity:', window.getComputedStyle(ratingTooltip).opacity);
                    console.log('Tooltip visibility:', window.getComputedStyle(ratingTooltip).visibility);
                    console.log('Tooltip background:', window.getComputedStyle(ratingTooltip).backgroundColor);
                });

                ratingWrapper.addEventListener('mouseleave', function () {
                    console.log('🖱️ Mouse left rating wrapper');
                    ratingTooltip.classList.remove('visible');  // Remove visible class
                });
            } else {
                console.error('❌ Rating elements not found!');
            }

            // Debug Font Awesome Loading
            const testIcon = document.createElement('i');
            testIcon.className = 'fab fa-facebook-f';
            testIcon.style.display = 'none';
            document.body.appendChild(testIcon);

            setTimeout(() => {
                const computed = window.getComputedStyle(testIcon, '::before');
                if (computed.content && computed.content !== 'none') {
                    console.log('✅ Font Awesome icons loaded successfully');
                } else {
                    console.warn('⚠️ Font Awesome may not be loaded correctly');
                }
                document.body.removeChild(testIcon);
            }, 500);

            // TEST: Add sample social links after 2 seconds to verify visibility
            setTimeout(() => {
                const socialContainer = document.getElementById('social-links-container');
                if (socialContainer && socialContainer.innerHTML.includes('No social links')) {
                    console.log('🧪 TEST: Adding sample social links to verify styling...');
                    socialContainer.innerHTML = `
                        <a href="https://facebook.com" class="social-link" title="Facebook" target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-facebook-f"></i>
                        </a>
                        <a href="https://twitter.com" class="social-link" title="Twitter" target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-twitter"></i>
                        </a>
                        <a href="https://linkedin.com" class="social-link" title="LinkedIn" target="_blank" rel="noopener noreferrer">
                            <i class="fab fa-linkedin-in"></i>
                        </a>
                    `;
                    console.log('✅ Sample social links added for testing');
                }
            }, 2000);
        });