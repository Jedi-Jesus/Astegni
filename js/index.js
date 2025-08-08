// Global state
let isLoggedIn = false;
let currentAdIndex = 0;
let currentVideoIndex = 0;

// Theme toggle
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const mobileThemeToggleBtn = document.getElementById('mobile-theme-toggle-btn');
if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);
if (mobileThemeToggleBtn) mobileThemeToggleBtn.addEventListener('click', toggleTheme);

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update theme icons
    const themeIcon = document.getElementById('theme-icon');
    const mobileThemeIcon = document.getElementById('mobile-theme-icon');
    const iconPath = newTheme === 'light' 
        ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
        : 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z';
    
    if (themeIcon) themeIcon.querySelector('path').setAttribute('d', iconPath);
    if (mobileThemeIcon) mobileThemeIcon.querySelector('path').setAttribute('d', iconPath);
}

// Load theme from localStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    // Initialize all animations
    initHeroTyping();
    initNewsTyping();
    initAdRotation();
    initVideoCarousel();
    initCounters();
});

// Mobile menu toggle
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}

// Modal handling
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
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
    if (dropdown) dropdown.classList.toggle('hidden');
    if (mobileDropdown) mobileDropdown.classList.toggle('hidden');
}

// Login function
function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (email && password) {
        isLoggedIn = true;
        
        // Hide login/register buttons
        ['login-btn', 'register-btn', 'mobile-login-btn', 'mobile-register-btn',
         'hero-login-btn', 'hero-register-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
        
        // Show profile and notifications
        ['profile-container', 'mobile-profile-container', 'notification-bell', 'mobile-notification-bell'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('hidden');
        });
        
        // Set profile name
        const profileName = document.getElementById('profile-name');
        const mobileProfileName = document.getElementById('mobile-profile-name');
        if (profileName) profileName.textContent = 'John Doe'; // Set actual user name
        if (mobileProfileName) mobileProfileName.textContent = 'John Doe';
        
        // Update quick links
        const quickLinks = document.getElementById('quick-links');
        if (quickLinks) {
            quickLinks.innerHTML = `
                <li><a class="nav-link hover:underline" href="news.html">News</a></li>
                <li><a class="nav-link hover:underline" href="branch/find-tutors.html">Find Tutors</a></li>
                <li><a class="nav-link hover:underline" href="branch/reels.html">Reels</a></li>
                <li><a class="nav-link hover:underline" href="branch/store.html">Store</a></li>
            `;
        }
        
        closeModal('login-modal');
    }
}

// Handle nav link clicks
function handleNavLinkClick(e, link) {
    if (!isLoggedIn && link !== 'store') {
        e.preventDefault();
        openModal('login-modal');
    }
}

// Hero Text Typing Animation
function initHeroTyping() {
    const heroTexts = [
        'Discover Expert Tutors with Astegni',
        'Are you a tutor?',
        'Join us and connect with millions of students worldwide!',
        'Astegni',
        'Pride of Black Lion',
        'Advertise with us',
        'and',
        'reach highly targeted audiences',
        'Astegni - Ethiopia\'s first social media platform!',
        'Learn with us',
        'Connect with tutors and training centers!',
        'Want to become a tutor?',
        'Join, learn and earn!',
        'Looking for a job?',
        'Same!',
        'Expert tutors?',
        'Just one click away!',
        'Learn Anytime, Anywhere',
        'Top Educators, books and jobs!',
        'Astegni - Your Learning Partner',
        'Empowering Education in Ethiopia'
    ];
    
    let currentIndex = 0;
    const textElement = document.getElementById('hero-text-content');
    
    if (!textElement) return;
    
    function typeText(text, callback) {
        let charIndex = 0;
        textElement.textContent = '';
        
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                textElement.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typeInterval);
                setTimeout(callback, 2000);
            }
        }, 100);
    }
    
    function backspaceText(callback) {
        let text = textElement.textContent;
        
        const backspaceInterval = setInterval(() => {
            if (text.length > 0) {
                text = text.slice(0, -1);
                textElement.textContent = text;
            } else {
                clearInterval(backspaceInterval);
                callback();
            }
        }, 50);
    }
    
    function animateHeroText() {
        const currentText = heroTexts[currentIndex];
        
        typeText(currentText, () => {
            backspaceText(() => {
                currentIndex = (currentIndex + 1) % heroTexts.length;
                animateHeroText();
            });
        });
    }
    
    animateHeroText();
}

// Ad Rotation (Slower - every 12 seconds)
function initAdRotation() {
    const ads = document.querySelectorAll('.ad-card');
    if (ads.length === 0) return;
    
    function rotateAds() {
        // Hide current ad
        ads[currentAdIndex].classList.remove('active');
        
        // Move to next ad
        currentAdIndex = (currentAdIndex + 1) % ads.length;
        
        // Show new ad
        ads[currentAdIndex].classList.add('active');
    }
    
    // Rotate ads every 12 seconds (slower duration)
    setInterval(rotateAds, 12000);
}

// News Typing Animation (Slower)
function initNewsTyping() {
    const newsItems = [
        {
            title: 'New Tutor Program Launched!',
            content: 'Join our innovative tutoring program designed to connect students with expert educators across Ethiopia. Register now for exclusive benefits and early access.'
        },
        {
            title: 'Partnership with Local Schools',
            content: 'We\'re proud to announce partnerships with over 50 schools to enhance educational opportunities. This collaboration brings quality education closer to every student.'
        },
        {
            title: 'Upcoming Learning Webinar',
            content: 'Register now for our free webinar on effective online learning strategies and study techniques. Limited seats available for this exclusive event.'
        },
        {
            title: 'New Online Courses Available',
            content: 'Explore 20+ new courses in technology, languages, and creative arts starting this month. Special discounts for early enrollments.'
        }
    ];
    
    let currentNewsIndex = 0;
    const titleElement = document.getElementById('news-title-content');
    const contentElement = document.getElementById('news-content-text');
    
    if (!titleElement || !contentElement) return;
    
    function typeNewsText(element, text, speed, callback) {
        let charIndex = 0;
        element.textContent = '';
        
        const typeInterval = setInterval(() => {
            if (charIndex < text.length) {
                element.textContent += text[charIndex];
                charIndex++;
            } else {
                clearInterval(typeInterval);
                if (callback) callback();
            }
        }, speed);
    }
    
    function backspaceNewsText(element, speed, callback) {
        let text = element.textContent;
        
        const backspaceInterval = setInterval(() => {
            if (text.length > 0) {
                text = text.slice(0, -1);
                element.textContent = text;
            } else {
                clearInterval(backspaceInterval);
                if (callback) callback();
            }
        }, speed);
    }
    
    function animateNews() {
        const currentNews = newsItems[currentNewsIndex];
        
        // Type title slowly
        typeNewsText(titleElement, currentNews.title, 150, () => {
            // Type content slowly
            setTimeout(() => {
                typeNewsText(contentElement, currentNews.content, 100, () => {
                    // Wait, then backspace
                    setTimeout(() => {
                        backspaceNewsText(contentElement, 50, () => {
                            backspaceNewsText(titleElement, 50, () => {
                                currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
                                setTimeout(animateNews, 500);
                            });
                        });
                    }, 3000);
                });
            }, 500);
        });
    }
    
    animateNews();
}

// Video Carousel with Continuous Loop
function initVideoCarousel() {
    const carousel = document.getElementById('video-carousel');
    if (!carousel) return;
    
    // No need to clone - handled in HTML
}

// Video Player Functions
let currentPlayingVideo = 0;
const videoData = [
    { title: 'Introduction to Astegni', src: 'video1.mp4', description: 'Learn about our platform and services' },
    { title: 'How to Find Tutors', src: 'video2.mp4', description: 'Step-by-step guide to finding the perfect tutor' },
    { title: 'Success Stories', src: 'video3.mp4', description: 'Hear from our successful students' },
    { title: 'Online Learning Tips', src: 'video4.mp4', description: 'Maximize your online learning experience' },
    { title: 'Become a Tutor', src: 'video5.mp4', description: 'Join our community of expert educators' },
    { title: 'Course Overview', src: 'video6.mp4', description: 'Explore our diverse course offerings' },
    { title: "Parent's Guide", src: 'video7.mp4', description: 'How parents can support their children' },
    { title: 'Study Techniques', src: 'video8.mp4', description: 'Effective study methods for better results' },
    { title: 'Mobile App Tutorial', src: 'video9.mp4', description: 'Using Astegni on your mobile device' },
    { title: 'Community Features', src: 'video10.mp4', description: 'Connect with other learners' }
];

function openVideoPlayer(videoIndex) {
    currentPlayingVideo = videoIndex;
    const modal = document.getElementById('video-player-modal');
    const videoPlayer = document.getElementById('main-video-player');
    const videoTitle = document.getElementById('video-title');
    const videoDescription = document.getElementById('video-description');
    
    if (videoPlayer && videoData[videoIndex]) {
        videoPlayer.src = videoData[videoIndex].src;
        if (videoTitle) videoTitle.textContent = videoData[videoIndex].title;
        if (videoDescription) videoDescription.textContent = videoData[videoIndex].description;
        openModal('video-player-modal');
    }
}

function navigateVideo(direction) {
    if (direction === 'prev') {
        currentPlayingVideo = currentPlayingVideo > 0 ? currentPlayingVideo - 1 : videoData.length - 1;
    } else {
        currentPlayingVideo = (currentPlayingVideo + 1) % videoData.length;
    }
    
    const videoPlayer = document.getElementById('main-video-player');
    const videoTitle = document.getElementById('video-title');
    const videoDescription = document.getElementById('video-description');
    
    if (videoPlayer && videoData[currentPlayingVideo]) {
        videoPlayer.src = videoData[currentPlayingVideo].src;
        if (videoTitle) videoTitle.textContent = videoData[currentPlayingVideo].title;
        if (videoDescription) videoDescription.textContent = videoData[currentPlayingVideo].description;
    }
}

// Navigate carousel videos
function navigateCarousel(direction) {
    const carousel = document.getElementById('video-carousel');
    if (!carousel) return;
    
    // Pause animation
    carousel.style.animationPlayState = 'paused';
    
    // Calculate scroll amount (width of one video container)
    const scrollAmount = 320; // 300px width + 20px margin
    
    if (direction === 'left') {
        carousel.scrollLeft -= scrollAmount;
    } else {
        carousel.scrollLeft += scrollAmount;
    }
    
    // Resume animation after a short delay
    setTimeout(() => {
        carousel.style.animationPlayState = 'running';
    }, 500);
}

function likeVideo() {
    console.log('Video liked!');
    // Implement like functionality
}

function dislikeVideo() {
    console.log('Video disliked!');
    // Implement dislike functionality
}

function shareOn(platform) {
    const url = window.location.href;
    const text = 'Check out this amazing video on Astegni!';
    
    const shareUrls = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
        instagram: `https://www.instagram.com/`,
        tiktok: `https://www.tiktok.com/`,
        snapchat: `https://www.snapchat.com/`,
        twitter: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        telegram: `https://t.me/share/url?url=${url}&text=${text}`
    };
    
    if (shareUrls[platform]) {
        window.open(shareUrls[platform], '_blank');
    }
}

function copyLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        alert('Link copied to clipboard!');
    });
}

// Handle View More Courses button
function handleViewMoreCourses() {
    if (!isLoggedIn) {
        openModal('course-access-modal');
    } else {
        // Navigate to courses page or show more courses
        console.log('Showing more courses...');
    }
}

// Handle course click
function handleCourseClick() {
    if (!isLoggedIn) {
        openModal('course-access-modal');
    } else {
        // Navigate to course or show course details
        console.log('Accessing course...');
    }
}

// Counter Animation
function initCounters() {
    animateCounter('counter-parents', 1000);
    animateCounter('counter-students', 5000);
    animateCounter('counter-tutors', 300);
    animateCounter('counter-centers', 50);
    animateCounter('counter-books', 100);
    animateCounter('counter-jobs', 10);
}

function animateCounter(id, end) {
    const element = document.getElementById(id);
    if (!element) return;
    
    let start = 0;
    const duration = 2000;
    const stepTime = Math.abs(Math.floor(duration / end));
    
    const timer = setInterval(() => {
        start++;
        element.textContent = start + '+';
        if (start >= end) clearInterval(timer);
    }, stepTime);
}

// Registration and other form functions
function submitRegistration() {
    const registerAs = document.getElementById('register-as').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const repeatPassword = document.getElementById('register-repeat-password').value;
    
    if (password !== repeatPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    console.log('Registration attempted as:', registerAs);
    closeModal('register-modal');
}

function toggleInput(type, method) {
    const emailInput = document.getElementById(`${type}-email`);
    const phoneInput = document.getElementById(`${type}-phone`);
    const countryContainer = document.getElementById(`${type}-country-container`);
    const socialFields = document.getElementById(`${type}-social-fields`);
    const socialButton = document.getElementById(`${type}-social-button`);
    
    // Hide all inputs first
    [emailInput, phoneInput, countryContainer, socialFields, socialButton].forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    // Show selected input
    if (method === 'email' && emailInput) {
        emailInput.classList.remove('hidden');
    } else if (method === 'phone') {
        if (phoneInput) phoneInput.classList.remove('hidden');
        if (countryContainer) countryContainer.classList.remove('hidden');
    } else if (method === 'social') {
        if (socialFields) socialFields.classList.remove('hidden');
        if (socialButton) socialButton.classList.remove('hidden');
    }
}

function updatePhonePlaceholder(type) {
    const countrySelect = document.getElementById(`${type}-country`);
    const phoneInput = document.getElementById(`${type}-phone`);
    if (countrySelect && phoneInput) {
        phoneInput.placeholder = `${countrySelect.value}912345678`;
    }
}

function updateSocialPlaceholder(type) {
    const platformSelect = document.getElementById(`${type}-social-platform`);
    const addressInput = document.getElementById(`${type}-social-address`);
    if (platformSelect && addressInput) {
        addressInput.placeholder = `Enter ${platformSelect.value} address`;
    }
}

function togglePassword(id) {
    const input = document.getElementById(id);
    if (input) {
        input.type = input.type === 'password' ? 'text' : 'password';
    }
}

function toggleRegisterFields() {
    const registerAs = document.getElementById('register-as').value;
    const genderField = document.getElementById('gender-field');
    const guardianTypeField = document.getElementById('guardian-type-field');
    const instituteTypeField = document.getElementById('institute-type');
    
    // Hide all conditional fields
    [genderField, guardianTypeField, instituteTypeField].forEach(field => {
        if (field) field.classList.add('hidden');
    });
    
    // Show relevant fields
    if (['tutor', 'student'].includes(registerAs) && genderField) {
        genderField.classList.remove('hidden');
    } else if (registerAs === 'guardian' && guardianTypeField) {
        guardianTypeField.classList.remove('hidden');
    } else if (registerAs === 'institute' && instituteTypeField) {
        instituteTypeField.classList.remove('hidden');
    }
}

function socialLogin(platform) {
    console.log(`Logging in with ${platform}`);
    // Implement social login logic
}

function goToProfile() {
    console.log('Navigating to profile');
    // Implement profile navigation
}

function toggleVerification() {
    console.log('Toggling verification');
    // Implement verification toggle
}