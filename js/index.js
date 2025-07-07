let user = null; // Global user object
let token = null; // Store JWT

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
document.addEventListener('DOMContentLoaded', function() {
    initializeSession();
    initializeTheme();
    initializeCarousel();
    initializeCounters();
    initializeModals();
});

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
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.querySelector('svg').innerHTML = icon;
    }
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
    if (mobileThemeToggle) {
        mobileThemeToggle.innerHTML = `Toggle Theme <svg class="w-6 h-6 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${icon}</svg>`;
    }
}

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon(savedTheme);
}

// Theme toggle event listeners are now handled in the main DOMContentLoaded event

const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function openLoginRegisterModal() {
    const modal = document.getElementById('login-register-modal');
    if (modal) {
        modal.style.display = 'flex';
        showLogin();
    }
}

function openAdvertiseModal() {
    const modal = document.getElementById('advertise-modal');
    if (modal) {
        modal.style.display = 'flex';
        toggleAdvertiseFields();
    }
}

function openShareModal(videoId) {
    const modal = document.getElementById('share-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('share-social-media(1)').href = `https://facebook.com/share/video${videoId}`;
        document.getElementById('share-social-media(2)').href = `https://instagram.com/share/video${videoId}`;
        document.getElementById('share-social-media(3)').href = `https://x.com/share/video${videoId}`;
        document.getElementById('share-social-media(4)').href = `https://tiktok.com/share/video${videoId}`;
        document.getElementById('share-social-media(5)').href = `https://youtube.com/share/video${videoId}`;
        document.getElementById('share-social-media(6)').href = `https://snapchat.com/share/video${videoId}`;
    }
}

function copyLink() {
    const link = window.location.href;
    navigator.clipboard.writeText(link).then(() => alert('Link copied!'));
}

function openCommentModal(videoId) {
    const modal = document.getElementById('comment-modal');
    if (modal) {
        modal.style.display = 'flex';
        const commentInput = document.getElementById(`comment-input-${videoId}`);
        document.getElementById('modal-comment-input').dataset.videoId = videoId;
        document.getElementById('modal-comment-list').innerHTML = document.getElementById(`comments-${videoId}`).innerHTML;
    }
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
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    }
}

function showRegister() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    if (loginForm && registerForm) {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        toggleRegisterFields();
    }
}

function toggleInput(type, method) {
    const emailInput = document.getElementById(`${type}-email`)?.parentElement;
    const phoneInput = document.getElementById(`${type}-phone`)?.parentElement;
    const countrySelect = document.getElementById(`${type}-country-container`);
    const socialFields = document.getElementById(`${type}-social-fields`);
    const socialButton = document.getElementById(`${type}-social-button`);

    if (emailInput && phoneInput && countrySelect && socialFields && socialButton) {
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
}

function updatePhonePlaceholder(type) {
    const countrySelect = document.getElementById(`${type}-country`);
    const phoneInput = document.getElementById(`${type}-phone`);
    if (countrySelect && phoneInput) {
        const countryCode = countrySelect.value;
        phoneInput.placeholder = `${countryCode}912345678`;
    }
}

function updateSocialPlaceholder(type) {
    const platformSelect = document.getElementById(`${type}-social-platform`);
    const socialAddressInput = document.getElementById(`${type}-social-address`);
    if (platformSelect && socialAddressInput) {
        const platform = platformSelect.value;
        const placeholder = platform ? `Enter ${platform} address` : 'Enter social media address';
        socialAddressInput.placeholder = placeholder;
    }
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function toggleRegisterFields() {
    const registerAs = document.getElementById('register-as')?.value;
    const genderField = document.getElementById('gender-field');
    const guardianTypeField = document.getElementById('guardian-type-field');
    const instituteTypeField = document.getElementById('institute-type');

    if (genderField && guardianTypeField && instituteTypeField) {
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
}

function toggleAdvertiseFields() {
    const advertiseAs = document.getElementById('advertise-as')?.value;
    const genderField = document.getElementById('advertise-gender-field');
    const instituteTypeField = document.getElementById('advertise-institute-type-field');

    if (genderField && instituteTypeField) {
        genderField.classList.add('hidden');
        instituteTypeField.classList.add('hidden');

        if (advertiseAs === 'tutor') {
            genderField.classList.remove('hidden');
        } else if (advertiseAs === 'institute') {
            instituteTypeField.classList.remove('hidden');
        }
    }
}

function socialLogin(platform) {
    alert(`Logging in with ${platform}`);
}

async function login() {
    const loginType = document.querySelector('input[name="login-type"]:checked')?.value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('login-email')?.value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('login-phone')?.value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('login-social-address')?.value;
    }
    const password = document.getElementById('login-password')?.value;
    const errorDiv = document.getElementById('login-error');

    if (!loginType || !identifier || !password || !errorDiv) {
        if (errorDiv) {
            errorDiv.textContent = 'Please fill in all fields.';
            errorDiv.classList.remove('hidden');
        }
        return;
    }

    try {
        // Placeholder for actual login API call
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ loginType, identifier, password })
        });
        const data = await response.json();
        if (response.ok) {
            token = data.token;
            user = data.user;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            updateNavbar();
            updateVerifyIcon();
            closeModal('login-register-modal');
        } else {
            errorDiv.textContent = data.message || 'Login failed.';
            errorDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
    }
}

function submitRegistration() {
    const registerAs = document.getElementById('register-as')?.value;
    const loginType = document.querySelector('input[name="register-type"]:checked')?.value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('register-email')?.value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('register-phone')?.value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('register-social-address')?.value;
    }
    const password = document.getElementById('register-password')?.value;
    const repeatPassword = document.getElementById('register-repeat-password')?.value;
    const termsAccepted = document.querySelector('#register-form input[type="checkbox"]')?.checked;

    const userData = { registerAs, loginType, identifier, password };
    if (registerAs === 'tutor' || registerAs === 'student') {
        userData.gender = document.getElementById('register-gender')?.value;
    } else if (registerAs === 'guardian') {
        userData.guardianType = document.getElementById('register-guardian-type')?.value;
    } else if (registerAs === 'institute') {
        userData.instituteType = document.getElementById('register-institute-type')?.value;
    }

    if (!loginType || !identifier || !password || !repeatPassword || !termsAccepted) {
        alert('Please fill in all fields and accept the terms.');
        return;
    }

    if (password !== repeatPassword) {
        alert('Passwords do not match.');
        return;
    }

    // Placeholder for actual registration API call
    fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Registration successful! Please log in.');
            showLogin();
        } else {
            alert(data.message || 'Registration failed.');
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        alert('An error occurred. Please try again.');
    });
}

function submitAdvertisement() {
    const advertiseAs = document.getElementById('advertise-as')?.value;
    const loginType = document.querySelector('input[name="advertise-type"]:checked')?.value;
    let identifier;
    if (loginType === 'email') {
        identifier = document.getElementById('advertise-email')?.value;
    } else if (loginType === 'phone') {
        identifier = document.getElementById('advertise-phone')?.value;
    } else if (loginType === 'social') {
        identifier = document.getElementById('advertise-social-address')?.value;
    }
    const password = document.getElementById('advertise-password')?.value;
    const repeatPassword = document.getElementById('advertise-repeat-password')?.value;
    const termsAccepted = document.querySelector('#advertise-form input[type="checkbox"]')?.checked;

    const userData = { advertiseAs, loginType, identifier, password };
    if (advertiseAs === 'tutor') {
        userData.gender = document.getElementById('advertise-gender')?.value;
    } else if (advertiseAs === 'institute') {
        userData.instituteType = document.getElementById('advertise-institute-type')?.value;
    }

    if (!loginType || !identifier || !password || !repeatPassword || !termsAccepted) {
        alert('Please fill in all fields and accept the terms.');
        return;
    }

    if (password !== repeatPassword) {
        alert('Passwords do not match.');
        return;
    }

    // Placeholder for actual advertisement API call
    fetch('/api/advertise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Advertisement account created successfully!');
            closeModal('advertise-modal');
        } else {
            alert(data.message || 'Advertisement registration failed.');
        }
    })
    .catch(error => {
        console.error('Advertisement error:', error);
        alert('An error occurred. Please try again.');
    });
}

function updateNavbar() {
    const loginRegisterBtn = document.getElementById('login-register-btn');
    const mobileLoginRegisterBtn = document.getElementById('mobile-login-register-btn');
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

    if (user && token) {
        if (loginRegisterBtn) loginRegisterBtn.classList.add('hidden');
        if (mobileLoginRegisterBtn) mobileLoginRegisterBtn.classList.add('hidden');
        if (profileContainer) profileContainer.classList.remove('hidden');
        if (mobileProfileContainer) mobileProfileContainer.classList.remove('hidden');
        if (profileName) profileName.textContent = user.name || 'User';
        if (mobileProfileName) mobileProfileName.textContent = user.name || 'User';
        if (profilePic) profilePic.src = user.profilePic || 'https://picsum.photos/32';
        if (mobileProfilePic) mobileProfilePic.src = user.profilePic || 'https://picsum.photos/32';
        if (findTutorsLink) findTutorsLink.classList.remove('hidden');
        if (mobileFindTutorsLink) mobileFindTutorsLink.classList.remove('hidden');
        if (reelsLink) reelsLink.classList.remove('hidden');
        if (mobileReelsLink) mobileReelsLink.classList.remove('hidden');
        if (notificationBell) notificationBell.classList.remove('hidden');
        if (mobileNotificationBell) mobileNotificationBell.classList.remove('hidden');
    } else {
        if (loginRegisterBtn) loginRegisterBtn.classList.remove('hidden');
        if (mobileLoginRegisterBtn) mobileLoginRegisterBtn.classList.remove('hidden');
        if (profileContainer) profileContainer.classList.add('hidden');
        if (mobileProfileContainer) mobileProfileContainer.classList.add('hidden');
        if (findTutorsLink) findTutorsLink.classList.add('hidden');
        if (mobileFindTutorsLink) mobileFindTutorsLink.classList.add('hidden');
        if (reelsLink) reelsLink.classList.add('hidden');
        if (mobileReelsLink) mobileReelsLink.classList.add('hidden');
        if (notificationBell) notificationBell.classList.add('hidden');
        if (mobileNotificationBell) mobileNotificationBell.classList.add('hidden');
    }
}

function toggleProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
}

function toggleVerification() {
    if (user) {
        user.isVerified = !user.isVerified;
        localStorage.setItem('user', JSON.stringify(user));
        updateVerifyIcon();
    }
}

function updateVerifyIcon() {
    const verifyIcon = document.getElementById('verify-icon');
    if (verifyIcon) {
        verifyIcon.innerHTML = user && user.isVerified
            ? `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
            : '';
    }
}

function logout() {
    user = null;
    token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateNavbar();
    closeModal('profile-dropdown');
}

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notification-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            // Placeholder for fetching notifications
            document.getElementById('notification-dropdown-content').innerHTML = '<p>No new notifications</p>';
        }
    }
}

function openNotificationModal() {
    const modal = document.getElementById('notification-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Placeholder for notification content
        document.getElementById('notification-modal-content').innerHTML = '<p>No new notifications</p>';
    }
}

function likeVideo(videoId) {
    const likesElement = document.getElementById(`likes-${videoId}`);
    if (likesElement) {
        let likes = parseInt(likesElement.textContent) || 0;
        likesElement.textContent = likes + 1;
    }
}

function dislikeVideo(videoId) {
    const dislikesElement = document.getElementById(`dislikes-${videoId}`);
    if (dislikesElement) {
        let dislikes = parseInt(dislikesElement.textContent) || 0;
        dislikesElement.textContent = dislikes + 1;
    }
}

function initializeCarousel() {
    const carousel = document.getElementById('video-carousel');
    if (carousel) {
        let videos = carousel.querySelectorAll('.video-container');
        let currentIndex = 0;

        function updateCarousel() {
            videos.forEach((video, index) => {
                video.classList.toggle('active', index >= currentIndex && index < currentIndex + 3);
            });
        }

        document.getElementById('prev-video')?.addEventListener('click', () => {
            if (currentIndex > 0) {
                currentIndex--;
                updateCarousel();
            }
        });

        document.getElementById('next-video')?.addEventListener('click', () => {
            if (currentIndex < videos.length - 3) {
                currentIndex++;
                updateCarousel();
            }
        });

        updateCarousel();
    }
}

function initializeCounters() {
    const counters = [
        { id: 'counter-parents', target: 1000, duration: 2000 },
        { id: 'counter-students', target: 5000, duration: 2500 },
        { id: 'counter-tutors', target: 200, duration: 1800 },
        { id: 'counter-centers', target: 50, duration: 1500 }
    ];

    counters.forEach(counter => {
        const element = document.getElementById(counter.id);
        if (element) {
            let count = 0;
            const increment = counter.target / (counter.duration / 16);
            const updateCounter = () => {
                count += increment;
                if (count >= counter.target) {
                    element.textContent = counter.target;
                } else {
                    element.textContent = Math.floor(count);
                    requestAnimationFrame(updateCounter);
                }
            };
            // Start the counter animation
            requestAnimationFrame(updateCounter);
        }
    });
}

// Function to ensure modals are properly initialized
function initializeModals() {
    // Hide all modals on page load
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Add event listeners for modal close functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add click event listeners to all modal close buttons
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Add click event listeners to modal backgrounds for closing
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Initialize theme toggle event listeners
    const themeToggle = document.getElementById('theme-toggle');
    const mobileThemeToggle = document.getElementById('mobile-theme-toggle-btn');
    
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    if (mobileThemeToggle) {
        mobileThemeToggle.addEventListener('click', toggleTheme);
    }
});