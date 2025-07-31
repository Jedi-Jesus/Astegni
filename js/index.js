
        // Theme toggle
        const themeToggleBtn = document.getElementById('theme-toggle-btn');
        const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle-btn');
        themeToggleBtn.addEventListener('click', toggleTheme);
        mobileThemeToggleBtn.addEventListener('click', toggleTheme);

        function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            // Update theme icons
            const themeIcon = document.getElementById('theme-icon');
            const mobileThemeIcon = document.getElementById('mobile-theme-icon');
            if (newTheme === 'light') {
                themeIcon.querySelector('path').setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
                mobileThemeIcon.querySelector('path').setAttribute('d', 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z');
            } else {
                themeIcon.querySelector('path').setAttribute('d', 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z');
                mobileThemeIcon.querySelector('path').setAttribute('d', 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z');
            }
        }

        // Load theme from localStorage
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        // Mobile menu toggle
        const menuBtn = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        // Modal handling
        function openModal(modalId) {
            document.getElementById(modalId).style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modal.id);
            });
        });

        // Profile dropdown toggle
        function toggleProfileDropdown() {
            const dropdown = document.getElementById('profile-dropdown');
            const mobileDropdown = document.getElementById('mobile-profile-dropdown');
            dropdown.classList.toggle('hidden');
            mobileDropdown.classList.toggle('hidden');
        }


        function login() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            console.log('Login attempted with:', email, password);

            // Show hidden nav links
            document.getElementById('find-tutors-link').classList.remove('hidden');
            document.getElementById('reels-link').classList.remove('hidden');
            document.getElementById('store-link').classList.remove('hidden');
            document.getElementById('find-jobs-link').classList.remove('hidden');
            document.getElementById('mobile-find-tutors-link').classList.contains('hidden');
            document.getElementById('mobile-reels-link').classList.remove('hidden');
            document.getElementById('mobile-store-link').classList.remove('hidden');
            // Hide login/register buttons
            document.getElementById('login-btn').classList.add('hidden');
            document.getElementById('register-btn').classList.add('hidden');
            document.getElementById('mobile-login-btn').classList.add('hidden');
            document.getElementById('mobile-register-btn').classList.add('hidden');
            document.getElementById('hero-login-btn').classList.add('hidden');
            document.getElementById('hero-register-btn').classList.add('hidden');
            document.getElementById('profile-container').classList.remove('hidden');
            document.getElementById('mobile-profile-container').classList.remove('hidden');
            document.getElementById('notification-bell').classList.remove('hidden');
            document.getElementById('mobile-notification-bell').classList.remove('hidden');

            // Update quick links
            const quickLinks = document.getElementById('quick-links');
            quickLinks.innerHTML = `
        <li><a class="nav-link hover:underline" href="news.html">News</a></li>
        <li><a class="nav-link hover:underline" href="branch/find-tutors.html">Find Tutors</a></li>
        <li><a class="nav-link hover:underline" href="branch/reels.html">Reels</a></li>
        <li><a class="nav-link hover:underline" href="branch/store.html">Store</a></li>
    `;
            quickLinks.classList.add('flex', 'flex-row', 'flex-wrap', 'gap-4');
            quickLinks.classList.remove('space-y-2');
            closeModal('login-modal');
        }

        // Registration function
        function submitRegistration() {
            const registerAs = document.getElementById('register-as').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const repeatPassword = document.getElementById('register-repeat-password').value;
            if (password !== repeatPassword) {
                alert('Passwords do not match!');
                return;
            }
            console.log('Registration attempted as:', registerAs, 'with:', email, password);
            closeModal('register-modal');
        }

        // Toggle input fields for login/register
        function toggleInput(type, method) {
            const emailInput = document.getElementById(`${type}-email`);
            const phoneInput = document.getElementById(`${type}-phone`);
            const countryContainer = document.getElementById(`${type}-country-container`);
            const socialFields = document.getElementById(`${type}-social-fields`);
            const socialButton = document.getElementById(`${type}-social-button`);
            emailInput.classList.add('hidden');
            phoneInput.classList.add('hidden');
            countryContainer.classList.add('hidden');
            socialFields.classList.add('hidden');
            socialButton.classList.add('hidden');
            if (method === 'email') {
                emailInput.classList.remove('hidden');
            } else if (method === 'phone') {
                phoneInput.classList.remove('hidden');
                countryContainer.classList.remove('hidden');
            } else if (method === 'social') {
                socialFields.classList.remove('hidden');
                socialButton.classList.remove('hidden');
            }
        }

        // Update phone placeholder based on country code
        function updatePhonePlaceholder(type) {
            const countrySelect = document.getElementById(`${type}-country`);
            const phoneInput = document.getElementById(`${type}-phone`);
            phoneInput.placeholder = `${countrySelect.value}912345678`;
        }

        // Update social media placeholder
        function updateSocialPlaceholder(type) {
            const platformSelect = document.getElementById(`${type}-social-platform`);
            const addressInput = document.getElementById(`${type}-social-address`);
            addressInput.placeholder = `Enter ${platformSelect.value} address`;
        }

        // Toggle password visibility
        function togglePassword(id) {
            const input = document.getElementById(id);
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        // Toggle registration fields based on role
        function toggleRegisterFields() {
            const registerAs = document.getElementById('register-as').value;
            const genderField = document.getElementById('gender-field');
            const guardianTypeField = document.getElementById('guardian-type-field');
            const instituteTypeField = document.getElementById('institute-type');
            genderField.classList.add('hidden');
            guardianTypeField.classList.add('hidden');
            instituteTypeField.classList.add('hidden');
            if (['tutor', 'student'].includes(registerAs)) {
                genderField.classList.remove('hidden');
            } else if (registerAs === 'guardian') {
                guardianTypeField.classList.remove('hidden');
            } else if (registerAs === 'institute') {
                instituteTypeField.classList.remove('hidden');
            }
        }

        // Social login placeholder
        function socialLogin(platform) {
            console.log(`Logging in with ${platform}`);
        }

        // Video interaction functions
        function likeVideo(id) {
            const likes = document.getElementById(`likes-${id}`);
            likes.textContent = parseInt(likes.textContent) + 1;
        }

        function dislikeVideo(id) {
            const dislikes = document.getElementById(`dislikes-${id}`);
            dislikes.textContent = parseInt(dislikes.textContent) + 1;
        }

        function openShareModal(id) {
            openModal('share-modal');
            const shareLinks = document.querySelectorAll('#share-modal a');
            shareLinks.forEach(link => {
                link.href = `https://example.com/video/${id}`;
            });
        }

        function copyLink() {
            navigator.clipboard.write('https://example.com/video');
            alert('Link copied to clipboard!');
        }

        function openCommentModal(id) {
            const input = document.getElementById(`comment-input-${id}`);
            if (input.value.trim()) {
                openModal('comment-modal');
                const commentList = document.getElementById('modal-comment-list');
                commentList.innerHTML = '';
                const comment = document.createElement('div');
                comment.textContent = input.value;
                commentList.appendChild(comment);
                document.getElementById('modal-comment-input').dataset.videoId = id;
                input.value = '';
            }
        }

        function addModalComment() {
            const input = document.getElementById('modal-comment-input');
            const videoId = input.dataset.videoId;
            if (input.value.trim()) {
                const commentList = document.getElementById(`comments-${videoId}`);
                const comment = document.createElement('div');
                comment.textContent = input.value;
                commentList.appendChild(comment);
                input.value = '';
                closeModal('comment-modal');
            }
        }

        // Hero text rotation with backspace and typing animations
        const heroText = document.getElementById('hero-text');
        const heroTexts = [
            'Discover Expert Tutors with Astegni',
            'Advertise with us and .... ',
            'reach a highly diverse yet precisely targeted audiences',
            'Learn with us',
            ' connect with tutors, training centers, books and jobs!',
            'Advertise with us to ... ',
            'Connect with a highly diverse yet precisely targeted audience',
            'Expert tutors?',
            'Just one click away!',
            'Astegni - Ethiopia\'s first social media platform!',
            'Advertise',
            'access a broad spectrum of audiences, all sharply aligned with your goals',
            'Learn Anytime, Anywhere',
            'Astegni - your goto to Connect with',
            'Top Educators, training centers, books and jobs!'
        ];
        let currentHeroIndex = 0;


        function calculateTextWidth(text) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            ctx.font = window.getComputedStyle(heroText).font; // Match font for accurate width
            return ctx.measureText(text).width;
        }

        function typeHeroText() {
            const currentText = heroTexts[currentHeroIndex];
            const nextIndex = (currentHeroIndex + 1) % heroTexts.length;
            const nextText = heroTexts[nextIndex];

            // Ensure current text is set and visible
            heroText.textContent = currentText;
            heroText.style.setProperty('--text-width', `${calculateTextWidth(currentText)}px`);
            heroText.style.width = 'var(--text-width)'; // Ensure full width after typing
            heroText.style.animation = 'typing 3s steps(40, end), blink-caret 0.5s step-end infinite';

            // Apply backspace animation after pause
            setTimeout(() => {
                heroText.style.animation = 'backspace 1.5s steps(40, end), blink-caret 0.5s step-end infinite';

                // Switch to next text and type
                setTimeout(() => {
                    heroText.textContent = nextText;
                    heroText.style.setProperty('--text-width', `${calculateTextWidth(nextText)}px`);
                    heroText.style.width = '0'; // Reset width for typing
                    heroText.style.animation = 'typing 3s steps(40, end), blink-caret 0.5s step-end infinite';

                    // Update index for next iteration
                    currentHeroIndex = nextIndex;

                    // Schedule next transition
                    setTimeout(typeHeroText, 3000); // Wait 3s after typing
                }, 1500); // Wait 1.5s for backspace animation
            }, 3000); // Wait 3s after typing before backspacing
        }

        // Initialize first text
        heroText.textContent = heroTexts[0];
        heroText.style.setProperty('--text-width', `${calculateTextWidth(heroTexts[0])}px`);
        heroText.style.width = '0';
        heroText.style.animation = 'typing 3s steps(40, end), blink-caret 0.5s step-end infinite';
        setTimeout(() => {
            heroText.style.width = 'var(--text-width)'; // Ensure full width after initial typing
            setTimeout(typeHeroText, 3000); // Start cycle after initial 3s pause
        }, 3000); // Wait for initial typing



        const newsItems = [
            {
                title: 'New Tutor Program Launched!',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
            },
            {
                title: 'Partnership with Local Schools',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
            },
            {
                title: 'Upcoming Learning Webinar',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
            },
            {
                title: 'New Online Courses Available',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
            },
            {
                title: 'Expanded Tutoring Services',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
            },
            {
                title: 'Community Learning Event',
                content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
            }
        ];

        const newsCard = document.getElementById('news-card');
        const newsTitle = document.getElementById('news-title');
        const newsContent = document.getElementById('news-content');
        let currentNewsIndex = 0;

        function getAnimationDuration(text) {
            // 50ms per character for title, 15ms for content (faster)
            return text === newsTitle.textContent ? text.length * 50 : text.length * 15;
        }




        function showContent() {
            newsContent.classList.add('visible');
            const contentDuration = getAnimationDuration(newsContent.textContent);
            newsContent.style.animation = `typing ${contentDuration}ms steps(40, end) forwards`;
        }

        function rotateNews() {
            // Fade out and hide content
            newsCard.classList.remove('active');
            newsContent.classList.remove('visible');
            setTimeout(() => {
                // Update content
                currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
                newsTitle.textContent = newsItems[currentNewsIndex].title;
                newsContent.textContent = newsItems[currentNewsIndex].content;
                // Reset animations
                newsTitle.style.animation = 'none';
                newsContent.style.animation = 'none';
                void newsTitle.offsetWidth; // Trigger reflow
                void newsContent.offsetWidth; // Trigger reflow
                const titleDuration = getAnimationDuration(newsTitle.textContent);
                newsTitle.style.animation = `typing ${titleDuration}ms steps(40, end) forwards`;
                newsContent.classList.remove('visible'); // Ensure content is hidden
                // Fade in
                newsCard.classList.add('active');
                // Schedule content to appear after title
                setTimeout(showContent, titleDuration);
            }, 500); // Match fade-out duration
        }

        // Initial setup
        if (newsCard && newsTitle && newsContent) {
            const titleDuration = getAnimationDuration(newsTitle.textContent);
            newsTitle.style.animation = `typing ${titleDuration}ms steps(40, end) forwards`;
            newsContent.classList.remove('visible'); // Ensure content is hidden initially
            setTimeout(showContent, titleDuration);
            // Rotate after title + 0.5s gap + content + 0.5s fade-out
            setInterval(() => {
                const titleDuration = getAnimationDuration(newsItems[currentNewsIndex].title);
                const contentDuration = getAnimationDuration(newsItems[currentNewsIndex].content);
                const totalDuration = titleDuration + 500 + contentDuration + 500;
                rotateNews();
                // Update interval dynamically
                clearInterval(window.newsRotationInterval);
                window.newsRotationInterval = setInterval(rotateNews, totalDuration);
            }, getAnimationDuration(newsItems[0].title) + 500 + getAnimationDuration(newsItems[0].content) + 500);
        } else {
            console.error('News card elements not found in the DOM');
        }


        // Counter animation
        function animateCounter(id, end) {
            let start = 0;
            const element = document.getElementById(id);
            const duration = 2000;
            const stepTime = Math.abs(Math.floor(duration / end));
            const timer = setInterval(() => {
                start++;
                element.textContent = start + '+';
                if (start >= end) clearInterval(timer);
            }, stepTime);
        }

        animateCounter('counter-parents', 1000);
        animateCounter('counter-students', 5000);
        animateCounter('counter-tutors', 300);
        animateCounter('counter-centers', 50);
        animateCounter('counter-advertisers', 20);
        animateCounter('counter-books', 100);
        animateCounter('counter-jobs', 10);

        // Placeholder functions
        function goToProfile() {
            console.log('Navigating to profile');
        }

        function toggleVerification() {
            console.log('Toggling verification');
        }
