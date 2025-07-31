   let user = null;//Global user object
        let token = null;//store Jwt
// Load user and token from localStorage on page load
function initializeSession() {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
        try {
            token = storedToken;
            user = JSON.parse(storedUser);
            updateNavbar();
            updateVerifyIcon();
        } catch (error) {
            console.error('Failed to restore session:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        }
    } else {
        updateNavbar(); // Set navbar to logged-out state
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', initializeSession);
        
function toggleTheme() {
            const html = document.documentElement;
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleIcon(newTheme);
        }

        function updateThemeToggleIcon(theme) {
            const icon = theme === 'light' ?
                `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>` :
                `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>`;
            const themeToggle = document.getElementById('theme-toggle-btn');
            themeToggle.querySelector('svg').innerHTML = icon;
            const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
            mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon}</svg>`;
        }

        function initializeTheme() {
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
            updateThemeToggleIcon(savedTheme);
        }

        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('mobile-theme-toggle-btn').addEventListener('click', toggleTheme);

        const menuBtn = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });

        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }

        function openLoginRegisterModal() {
            document.getElementById('login-register-modal').style.display = 'flex';
            showLogin();
        }

        function openAdvertiseModal() {
            document.getElementById('advertise-modal').style.display = 'flex';
            toggleAdvertiseFields();
        }

        function openShareModal(videoId) {
            document.getElementById('share-modal').style.display = 'flex';
            document.getElementById('share-social-media(1)').href = `https://facebook.com/share/video${videoId}`;
            document.getElementById('share-social-media(2)').href = `https://instagram.com/share/video${videoId}`;
            document.getElementById('share-social-media(3)').href = `https://x.com/share/video${videoId}`;
            document.getElementById('share-social-media(4)').href = `https://tiktok.com/share/video${videoId}`;
            document.getElementById('share-social-media(5)').href = `https://youtube.com/share/video${videoId}`;
            document.getElementById('share-social-media(6)').href = `https://snapchat.com/share/video${videoId}`;
        }

        function copyLink() {
            const link = window.location.href;
            navigator.clipboard.writeText(link).then(() => alert('Link copied!'));
        }

        function openCommentModal(videoId) {
            document.getElementById('comment-modal').style.display = 'flex';
            const commentInput = document.getElementById(`comment-input-${videoId}`);
            document.getElementById('modal-comment-input').dataset.videoId = videoId;
            document.getElementById('modal-comment-list').innerHTML = document.getElementById(`comments-${videoId}`).innerHTML;
        }

        function addModalComment() {
            const videoId = document.getElementById('modal-comment-input').dataset.videoId;
            const comment = document.getElementById('modal-comment-input').value;
            if (comment.trim()) {
                const commentList = document.getElementById(`comments-${videoId}`);
                const modalCommentList = document.getElementById('modal-comment-list');
                const commentDiv = document.createElement('div');
                commentDiv.textContent = comment;
                commentList.appendChild(commentDiv);
                modalCommentList.appendChild(commentDiv.cloneNode(true));
                document.getElementById('modal-comment-input').value = '';
            }
        }

        function showLogin() {
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('register-form').style.display = 'none';
        }

        function showRegister() {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = 'block';
            toggleRegisterFields();
        }

        function toggleInput(type, method) {
       const emailInput = document.getElementById(`${type}-email`).parentElement;
       const phoneInput = document.getElementById(`${type}-phone`).parentElement;
       const countrySelect = document.getElementById(`${type}-country-container`);
       const socialFields = document.getElementById(`${type}-social-fields`);
       const socialButton = document.getElementById(`${type}-social-button`);

       emailInput.classList.add('hidden');
       phoneInput.classList.add('hidden');
       countrySelect.classList.add('hidden');
       socialFields.classList.add('hidden');
       socialButton.classList.add('hidden');

       if (method === 'email') {
           emailInput.classList.remove('hidden');
       } else if (method === 'phone') {
           phoneInput.classList.remove('hidden');
           countrySelect.classList.remove('hidden');
       } else if (method === 'social') {
           socialFields.classList.remove('hidden');
           socialButton.classList.remove('hidden');
       }
   }

        function updatePhonePlaceholder(type) {
            const countryCode = document.getElementById(`${type}-country`).value;
            document.getElementById(`${type}-phone`).placeholder = `${countryCode}912345678`;
        }

        function updateSocialPlaceholder(type) {
            const platform = document.getElementById(`${type}-social-platform`).value;
            const placeholder = platform ? `Enter ${platform} address` : 'Enter social media address';
            document.getElementById(`${type}-social-address`).placeholder = placeholder;
        }

        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        function toggleRegisterFields() {
            const registerAs = document.getElementById('register-as').value;
            const genderField = document.getElementById('gender-field');
            const guardianTypeField = document.getElementById('guardian-type-field');
            const instituteTypeField = document.getElementById('institute-type');

            genderField.classList.add('hidden');
            guardianTypeField.classList.add('hidden');
            instituteTypeField.classList.add('hidden');

            if (registerAs === 'tutor' || registerAs === 'student') {
                genderField.classList.remove('hidden');
            } else if (registerAs === 'guardian') {
                guardianTypeField.classList.remove('hidden');
            } else if (registerAs === 'institute') {
                instituteTypeField.classList.remove('hidden');
            }
        }

        function toggleAdvertiseFields() {
            const advertiseAs = document.getElementById('advertise-as').value;
            const genderField = document.getElementById('advertise-gender-field');
            const instituteTypeField = document.getElementById('advertise-institute-type-field');

            genderField.classList.add('hidden');
            instituteTypeField.classList.add('hidden');

            if (advertiseAs === 'tutor') {
                genderField.classList.remove('hidden');
            } else if (advertiseAs === 'institute') {
                instituteTypeField.classList.remove('hidden');
            }
        }

        function socialLogin(platform) {
            alert(`Logging in with ${platform}`);
        }


// Updated login function with error display
async function login() {
    const loginType = document.querySelector('input[name="login-type"]:checked').value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('login-email-input').value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('login-phone-input').value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('login-social-address').value;
    }
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');

    if (!identifier || !password) {
        errorDiv.textContent = 'Please fill in all fields.';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier,
                password,
                login_type: loginType
            })
        });
        const result = await response.json();
        if (!response.ok) {
            if (result.detail === "This account isn't registered") {
                errorDiv.textContent = result.detail;
                errorDiv.classList.remove('hidden');
            } else {
                alert(`Login failed: ${result.detail}`);
            }
            return;
        }
        user = {
            identifier: result.identifier,
            isVerified: result.is_verified,
            name: result.name,
            profilePic: result.profile_pic,
            role: result.role
        };
        token = result.access_token;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        errorDiv.classList.add('hidden');
        updateNavbar();
        updateVerifyIcon();
        closeModal('login-register-modal');
        alert('Login successful!');
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

// Registration and advertisement functions (unchanged)
async function submitRegistration() {
    const registerAs = document.getElementById('register-as').value;
    const loginType = document.querySelector('input[name="register-type"]:checked').value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('register-email').value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('register-phone').value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('register-social-address').value;
    }
    const password = document.getElementById('register-password').value;
    const repeatPassword = document.getElementById('register-repeat-password').value;
    const gender = document.getElementById('register-gender')?.value || null;
    const guardianType = document.getElementById('register-guardian-type')?.value || null;
    const instituteType = document.getElementById('register-institute-type')?.value || null;

    if (!identifier || !password || password !== repeatPassword) {
        alert('Please fill in all fields correctly.');
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier,
                password,
                register_as: registerAs,
                login_type: loginType,
                gender,
                guardian_type: guardianType,
                institute_type: instituteType
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail);
        user = {
            identifier: result.identifier,
            isVerified: result.is_verified,
            name: result.name,
            profilePic: result.profile_pic,
            role: registerAs
        };
        token = null;
        localStorage.removeItem('token');
        localStorage.setItem('user', JSON.stringify(user));
        updateNavbar();
        updateVerifyIcon();
        closeModal('login-register-modal');
        alert('Registration successful! Please log in.');
    } catch (error) {
        alert(`Registration failed: ${error.message}`);
    }
}

async function submitAdvertisement() {
    const advertiseAs = document.getElementById('advertise-as').value;
    const loginType = document.querySelector('input[name="advertise-type"]:checked').value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('advertise-email').value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('advertise-phone').value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('advertise-social-address').value;
    }
    const password = document.getElementById('advertise-password').value;
    const repeatPassword = document.getElementById('advertise-repeat-password').value;
    const gender = document.getElementById('advertise-gender')?.value || null;
    const instituteType = document.getElementById('advertise-institute-type')?.value || null;

    if (!identifier || !password || password !== repeatPassword) {
        alert('Please fill in all fields correctly.');
        return;
    }

    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
        alert('Please log in first.');
        closeModal('advertise-modal');
        openLoginRegisterModal();
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/advertise', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${storedToken}`
            },
            body: JSON.stringify({
                identifier,
                password,
                advertise_as: advertiseAs,
                login_type: loginType,
                gender,
                institute_type: instituteType
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail);
        user = {
            identifier: result.identifier,
            isVerified: result.is_verified,
            name: result.name,
            profilePic: result.profile_pic,
            role: `advertiser_${advertiseAs}`
        };
        localStorage.setItem('user', JSON.stringify(user));
        updateNavbar();
        updateVerifyIcon();
        closeModal('advertise-modal');
        alert('Advertisement account created!');
    } catch (error) {
        alert(`Advertisement failed: ${error.message}`);
    }
}


        function toggleProfileDropdown() {
       console.log('Toggling profile dropdown'); // Debug log
       const dropdown = document.getElementById('profile-dropdown');
       dropdown.classList.toggle('hidden');
   }

   function toggleVerification() {
       if (user) {
           user.isVerified = !user.isVerified;
           updateVerifyIcon();
           updateNavbar();
           toggleProfileDropdown();
           alert(`Account ${user.isVerified ? 'verified' : 'unverified'}.`);
       } else {
           alert('No user logged in.');
       }
   }

   function updateVerifyIcon() {
       const verifyIcon = document.getElementById('verify-icon');
       if (user && user.isVerified) {
           verifyIcon.innerHTML = `<svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
       } else {
           verifyIcon.innerHTML = `<svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
       }
   }

   function updateNavbar() {
    const loginRegisterBtn = document.getElementById('login-register-btn');
    const mobileLoginRegisterBtn = document.getElementById('mobile-login-register-btn');
    const advertiseBtn = document.getElementById('advertise-btn');
    const mobileAdvertiseBtn = document.getElementById('mobile-advertise-btn');
    const profileContainer = document.getElementById('profile-container');
    const mobileProfileContainer = document.getElementById('mobile-profile-container');
    const profileName = document.getElementById('profile-name');
    const mobileProfileName = document.getElementById('mobile-profile-name');
    const profilePic = document.getElementById('profile-pic');
    const mobileProfilePic = document.getElementById('mobile-profile-pic');
    const findTutorsLink = document.getElementById('find-tutors-link');
    const mobileFindTutorsLink = document.getElementById('mobile-find-tutors-link');
    const reelsLink = document.getElementById('reels-link');
    const mobileReelsLink = document.getElementById('mobile-reels-link');
    const notificationBell = document.getElementById('notification-bell');
    const mobileNotificationBell = document.getElementById('mobile-notification-bell');
    const heroLoginBtn = document.getElementById('hero-login-btn');
    const heroAdvertiseBtn = document.getElementById('hero-advertise-btn');

    // Null checks for robustness
    if (!loginRegisterBtn || !mobileLoginRegisterBtn || !advertiseBtn || !mobileAdvertiseBtn ||
        !profileContainer || !mobileProfileContainer || !profileName || !mobileProfileName ||
        !profilePic || !mobileProfilePic || !findTutorsLink || !mobileFindTutorsLink ||
        !reelsLink || !mobileReelsLink || !notificationBell || !mobileNotificationBell ||
        !heroLoginBtn || !heroAdvertiseBtn) {
        console.error('One or more DOM elements are missing in updateNavbar');
        return;
    }

    if (user) {
        // Hide login/register and hero buttons
        loginRegisterBtn.classList.add('hidden');
        mobileLoginRegisterBtn.classList.add('hidden');
        heroLoginBtn.classList.add('hidden');
        heroAdvertiseBtn.classList.add('hidden');

        // Show profile info
        profileContainer.classList.remove('hidden');
        mobileProfileContainer.classList.remove('hidden');
        profileName.textContent = user.name || 'User';
        mobileProfileName.textContent = user.name || 'User';
        profilePic.src = user.profilePic || 'https://picsum.photos/32';
        mobileProfilePic.src = user.profilePic || 'https://picsum.photos/32';

        // Toggle advertise buttons based on role
        const isAdvertiser = user.role?.startsWith('advertiser_');
        advertiseBtn.classList.toggle('hidden', isAdvertiser);
        mobileAdvertiseBtn.classList.toggle('hidden', isAdvertiser);

        // Toggle verified features
        if (user.isVerified) {
            findTutorsLink.classList.remove('hidden');
            mobileFindTutorsLink.classList.remove('hidden');
            reelsLink.classList.remove('hidden');
            mobileReelsLink.classList.remove('hidden');
            notificationBell.classList.remove('hidden');
            mobileNotificationBell.classList.remove('hidden');
        } else {
            findTutorsLink.classList.add('hidden');
            mobileFindTutorsLink.classList.add('hidden');
            reelsLink.classList.add('hidden');
            mobileReelsLink.classList.add('hidden');
            notificationBell.classList.add('hidden');
            mobileNotificationBell.classList.add('hidden');
        }
    } else {
        // Show login/register and advertise buttons
        loginRegisterBtn.textContent = 'Login/Register';
        loginRegisterBtn.classList.remove('hidden');
        mobileLoginRegisterBtn.classList.remove('hidden');
        advertiseBtn.classList.remove('hidden');
        mobileAdvertiseBtn.classList.remove('hidden');
        heroLoginBtn.classList.remove('hidden');
        heroAdvertiseBtn.classList.remove('hidden');

        // Hide profile and verified features
        profileContainer.classList.add('hidden');
        mobileProfileContainer.classList.add('hidden');
        findTutorsLink.classList.add('hidden');
        mobileFindTutorsLink.classList.add('hidden');
        reelsLink.classList.add('hidden');
        mobileReelsLink.classList.add('hidden');
        notificationBell.classList.add('hidden');
        mobileNotificationBell.classList.add('hidden');
    }
}

   // Close dropdown when clicking outside
   document.addEventListener('click', (e) => {
       const profileContainer = document.getElementById('profile-container');
       if (!profileContainer.contains(e.target)) {
           document.getElementById('profile-dropdown').classList.add('hidden');
       }
   });

        function openNotificationModal() {
            alert('Notifications modal not implemented yet.');
        }

        function likeVideo(videoId) {
            const likes = document.getElementById(`likes-${videoId}`);
            likes.textContent = parseInt(likes.textContent) + 1;
        }

        function dislikeVideo(videoId) {
            const dislikes = document.getElementById(`dislikes-${videoId}`);
            dislikes.textContent = parseInt(dislikes.textContent) + 1;
        }

        function animateCounter(id, start, end, duration) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                document.getElementById(id).textContent = Math.floor(progress * (end - start) + start);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                }
            };
            window.requestAnimationFrame(step);
        }

        function initializeCounters() {
            animateCounter('counter-parents', 0, 1200, 2000);
            animateCounter('counter-students', 0, 3500, 2000);
            animateCounter('counter-tutors', 0, 800, 2000);
            animateCounter('counter-centers', 0, 150, 2000);
        }

        function initializeCarousel() {
            const carousel = document.getElementById('video-carousel');
            const videos = carousel.querySelectorAll('.video-container');
            let currentIndex = 0;

            function showVideos() {
                videos.forEach((video, index) => {
                    video.classList.remove('active');
                    if (index >= currentIndex && index < currentIndex + 3) {
                        video.classList.add('active');
                    }
                });
            }

            function nextVideos() {
                currentIndex = (currentIndex + 3) % videos.length;
                showVideos();
            }

            setInterval(nextVideos, 5000);
            showVideos();
        }

    window.onload = () => {
       initializeTheme();
       initializeCounters();
       initializeCarousel();
       updateNavbar();
       updateVerifyIcon();
   };