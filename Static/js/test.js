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

        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });

        // Profile dropdown toggle
        function toggleProfileDropdown() {
            const dropdown = document.getElementById('profile-dropdown');
            const mobileDropdown = document.getElementById('mobile-profile-dropdown');
            dropdown.classList.toggle('hidden');
            mobileDropdown.classList.toggle('hidden');
        }

        function toggleInput(formType, method) {
    const prefix = formType === 'login' ? 'login' : 'register';
    
    // Get all relevant elements
    const emailButton = document.getElementById(`${prefix}-email-button`);
    const countryContainer = document.getElementById(`${prefix}-country-container`);
    const emailInput = document.getElementById(`${prefix}-email`);
    const phoneInput = document.getElementById(`${prefix}-phone-container`) || document.getElementById(`${prefix}-phone`);
    const socialFields = document.getElementById(`${prefix}-social-fields`);
    
    // Reset visibility
    emailButton.classList.add('hidden');
    countryContainer.classList.add('hidden');
    emailInput.classList.add('hidden');
    if (phoneInput) phoneInput.classList.add('hidden');
    socialFields.classList.add('hidden');
    
    // Show appropriate fields based on method
    if (method === 'email') {
        emailButton.classList.remove('hidden');
        emailInput.classList.remove('hidden');
    } else if (method === 'phone') {
        countryContainer.classList.remove('hidden');
        if (phoneInput) phoneInput.classList.remove('hidden');
    } else if (method === 'social') {
        socialFields.classList.remove('hidden');
    }
}
        // Update phone placeholder based on country code
        function updatePhonePlaceholder(type) {
            const prefix = type === 'login' ? 'login' : 'register';
            const countrySelect = document.getElementById(`${prefix}-country`);
            const phoneInput = document.getElementById(`${prefix}-phone`);
            const countryCode = countrySelect.value;
            phoneInput.placeholder = `${countryCode}912345678`;
        }

        // Update social media placeholder
        function updateSocialPlaceholder(type) {
            const prefix = type === 'login' ? 'login' : 'register';
            const platformSelect = document.getElementById(`${prefix}-social-platform`);
            const addressInput = document.getElementById(`${prefix}-social-address`);
            const platform = platformSelect.value;
            addressInput.placeholder = platform ? `Enter ${platform} address` : 'Enter social media address';
        }

        // Toggle password visibility
        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        // Social login handler
        function socialLogin(platform) {
            alert(`Logging in with ${platform}`);
            // Implement actual social login logic here
        }

        // Copy link for sharing
        function copyLink() {
            const url = window.location.href;
            navigator.clipboard.write(url).then(() => {
                alert('Link copied to clipboard!');
            });
        }

        // Add comment to modal
        function addModalComment() {
            const input = document.getElementById('modal-comment-input');
            const commentList = document.getElementById('modal-comment-list');
            if (input.value.trim()) {
                const comment = document.createElement('p');
                comment.textContent = input.value;
                commentList.appendChild(comment);
                input.value = '';
            }
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

        // Fetch data from backend
        async function fetchData(endpoint) {
            try {
                const response = await fetch(`http://localhost:5000${endpoint}`);
                if (!response.ok) throw new Error('Failed to fetch data');
                return await response.json();
            } catch (error) {
                console.error(`Error fetching ${endpoint}:`, error);
                return [];
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


        // Hero slideshow with real background images
        async function loadBackgroundImages() {
            const slideshow = document.getElementById('hero-slideshow');
            const images = await fetchData('/api/background_images');
            if (images.length === 0) {
                slideshow.style.backgroundImage = "url('https://picsum.photos/1920/1080')";
                return;
            }
            let currentImage = 0;
            function updateBackground() {
                slideshow.style.backgroundImage = `url(${images[currentImage].image_url})`;
                currentImage = (currentImage + 1) % images.length;
            }
            updateBackground();
            setInterval(updateBackground, 7000); // Change every 7 seconds
        }

        // Ad rotation
        async function loadAds() {
            const adContainer = document.getElementById('ad-container');
            const ads = await fetchData('/api/ads');
            if (ads.length === 0) {
                adContainer.innerHTML = '<p class="no-results">No ads available</p>';
                return;
            }
            adContainer.innerHTML = '';
            ads.forEach((ad, index) => {
                const adCard = document.createElement('div');
                adCard.className = `ad-card ${index !== 0 ? 'hidden' : ''}`;
                adCard.innerHTML = `
                    <img src="${ad.image_url}" alt="${ad.content}">
                    <p>${ad.content}</p>
                `;
                adContainer.appendChild(adCard);
            });
            let currentAd = 0;
            const adCards = adContainer.querySelectorAll('.ad-card');
            function rotateAds() {
                adCards.forEach((card, index) => {
                    card.classList.toggle('hidden', index !== currentAd);
                });
                currentAd = (currentAd + 1) % adCards.length;
            }
            setInterval(rotateAds, 8000); // Rotate every 8 seconds
        }

        // News animation with typing and backspace
        async function loadNews() {
            const newsTitle = document.getElementById('news-title');
            const newsContent = document.getElementById('news-content');
            const news = await fetchData('/api/news');
            if (news.length === 0) {
                newsTitle.textContent = 'No news available';
                return;
            }
            let currentNews = 0;
            async function animateNews() {
                const title = news[currentNews].title;
                const content = news[currentNews].content;
                const textWidth = title.length + 'ch';
                newsTitle.style.setProperty('--text-width', textWidth);

                // Typing animation
                newsTitle.textContent = title;
                newsTitle.style.animation = `newsTyping 2s steps(${title.length}, end) forwards, newsBlinkCaret 0.75s step-end infinite`;
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Show content
                newsContent.textContent = content;
                newsContent.classList.add('visible');
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Backspace animation
                newsTitle.style.animation = `newsBackspace 1s steps(${title.length}, end) forwards`;
                await new Promise(resolve => setTimeout(resolve, 1000));
                newsTitle.textContent = '';
                newsContent.classList.remove('visible');
                newsTitle.style.animation = '';

                currentNews = (currentNews + 1) % news.length;
                setTimeout(animateNews, 1000);
            }
            animateNews();
        }

        // Video rotation for Explore Astegni
        async function loadVideos() {
            const videoCarousel = document.getElementById('video-carousel');
            const videos = await fetchData('/api/videos'); // Assuming videos are fetched from an external DB
            if (videos.length === 0) {
                videoCarousel.innerHTML = '<p class="no-results">No videos available</p>';
                return;
            }
            videoCarousel.innerHTML = '';
            videos.forEach((video, index) => {
                const videoContainer = document.createElement('div');
                videoContainer.className = `video-container ${index === 0 ? 'active' : ''}`;
                videoContainer.innerHTML = `
                    <video src="${video.url}" controls></video>
                    <div class="video-controls">
                        <div class="interaction-buttons">
                            <button onclick="openModal('share-modal')">Share</button>
                            <button onclick="openModal('comment-modal')">Comment</button>
                        </div>
                        <div class="comment-list"></div>
                    </div>
                `;
                videoCarousel.appendChild(videoContainer);
            });
            let currentVideo = 0;
            const videoContainers = videoCarousel.querySelectorAll('.video-container');
            function rotateVideos() {
                videoContainers.forEach((container, index) => {
                    container.classList.toggle('active', index === currentVideo);
                });
                currentVideo = (currentVideo + 1) % videoContainers.length;
            }
            setInterval(rotateVideos, 8000); // Rotate every 8 seconds
        }

        // Partners rotation
        async function loadPartners() {
            const partnersWrapper = document.getElementById('partners-wrapper');
            const partners = await fetchData('/api/partners');
            if (partners.length === 0) {
                partnersWrapper.innerHTML = '<p class="no-results">No partners available</p>';
                return;
            }
            // Duplicate partners for seamless scrolling
            partnersWrapper.innerHTML = '';
            const doubledPartners = [...partners, ...partners];
            doubledPartners.forEach(partner => {
                const partnerCard = document.createElement('div');
                partnerCard.className = 'partner-card';
                partnerCard.innerHTML = `
                    <img src="${partner.logo_url}" alt="${partner.name}">
                    <p>${partner.name}</p>
                `;
                partnersWrapper.appendChild(partnerCard);
            });
        }

        // Login function
        async function login() {
            const loginType = document.querySelector('input[name="login-type"]:checked').value;
            let credentials = {};
            if (loginType === 'email') {
                credentials = {
                    email: document.getElementById('login-email').value,
                    password: document.getElementById('login-password').value
                };
            } else if (loginType === 'phone') {
                credentials = {
                    phone: document.getElementById('login-country').value + document.getElementById('login-phone').value,
                    password: document.getElementById('login-password').value
                };
            } else if (loginType === 'social') {
                credentials = {
                    social_platform: document.getElementById('login-social-platform').value,
                    social_address: document.getElementById('login-social-address').value,
                    password: document.getElementById('login-password').value
                };
            }
            try {
                const response = await fetch('http://localhost:5000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                const data = await response.json();
                if (response.ok) {
                    updateProfileUI(data.user);
                    closeModal('login-modal');
                    alert('Login successful!');
                } else {
                    alert(data.message || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
            }
        }

        // Registration function
        async function submitRegistration() {
            const registerAs = document.getElementById('register-as').value;
            const name = document.getElementById('register-name').value;
            const password = document.getElementById('register-password').value;
            const repeatPassword = document.getElementById('register-repeat-password').value;
            if (password !== repeatPassword) {
                alert('Passwords do not match');
                return;
            }
            const registerType = document.querySelector('input[name="register-type"]:checked').value;
            let userData = { name, role: registerAs, password };
            if (registerType === 'email') {
                userData.email = document.getElementById('register-email').value;
            } else if (registerType === 'phone') {
                userData.phone = document.getElementById('register-country').value + document.getElementById('register-phone').value;
            } else if (registerType === 'social') {
                userData.social_platform = document.getElementById('register-social-platform').value;
                userData.social_address = document.getElementById('register-social-address').value;
            }
            if (['tutor', 'student'].includes(registerAs)) {
                userData.gender = document.getElementById('register-gender').value;
            } else if (registerAs === 'guardian') {
                userData.guardian_type = document.getElementById('register-guardian-type').value;
            } else if (registerAs === 'institute') {
                userData.institute_type = document.getElementById('register-institute-type').value;
            }
            try {
                const response = await fetch('http://localhost:5000/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData)
                });
                const data = await response.json();
                if (response.ok) {
                    updateProfileUI(data.user);
                    closeModal('register-modal');
                    alert('Registration successful!');
                } else {
                    alert(data.message || 'Registration failed');
                }
            } catch (error) {
                console.error('Registration error:', error);
                alert('An error occurred during registration');
            }
        }

        // Update profile UI after login/registration
        function updateProfileUI(user) {
            const profileContainer = document.getElementById('profile-container');
            const mobileProfileContainer = document.getElementById('mobile-profile-container');
            const profileName = document.getElementById('profile-name');
            const mobileProfileName = document.getElementById('mobile-profile-name');
            const viewProfileLink = document.getElementById('view-profile-link');
            const mobileViewProfileLink = document.getElementById('mobile-view-profile-link');
            const loginBtn = document.getElementById('login-btn');
            const mobileLoginBtn = document.getElementById('mobile-login-btn');
            const registerBtn = document.getElementById('register-btn');
            const mobileRegisterBtn = document.getElementById('mobile-register-btn');

            profileContainer.classList.remove('hidden');
            mobileProfileContainer.classList.remove('hidden');
            loginBtn.classList.add('hidden');
            mobileLoginBtn.classList.add('hidden');
            registerBtn.classList.add('hidden');
            mobileRegisterBtn.classList.add('hidden');
            profileName.textContent = user.name;
            mobileProfileName.textContent = user.name;

            const profileLinks = {
                tutor: 'branch/tutor-profile.html',
                student: 'branch/student-profile.html',
                guardian: 'branch/guardian-profile.html',
                institute: 'branch/trainingInstitute-profile.html',
                bookstore: 'branch/bookstore-profile.html',
                advertiser: 'branch/advertiser-profile.html',
                employer: 'branch/employer-profile.html',
                partner: 'branch/partner-profile.html'
            };
            const profileUrl = profileLinks[user.role] || 'javascript:void(0)';
            viewProfileLink.setAttribute('href', profileUrl);
            mobileViewProfileLink.setAttribute('href', profileUrl);

            if (user.role === 'tutor') {
                document.getElementById('tutor-tools').classList.remove('hidden');
                document.getElementById('tutor-quiz').classList.remove('hidden');
                document.getElementById('mobile-tutor-tools').classList.remove('hidden');
                document.getElementById('mobile-tutor-quiz').classList.remove('hidden');
                document.getElementById('find-tutors-link').classList.remove('hidden');
                document.getElementById('mobile-find-tutors-link').classList.remove('hidden');
            } else if (user.role === 'student') {
                document.getElementById('student-tools').classList.remove('hidden');
                document.getElementById('student-become-tutor').classList.remove('hidden');
                document.getElementById('mobile-student-tools').classList.remove('hidden');
                document.getElementById('mobile-student-become-tutor').classList.remove('hidden');
                document.getElementById('find-tutors-link').classList.remove('hidden');
                document.getElementById('mobile-find-tutors-link').classList.remove('hidden');
            }
            document.getElementById('notification-bell').classList.remove('hidden');
            document.getElementById('mobile-notification-bell').classList.remove('hidden');
        }

        // Initialize data on page load
        document.addEventListener('DOMContentLoaded', () => {
            loadBackgroundImages();
            loadAds();
            loadNews();
            loadVideos();
            loadPartners();
        });