document.addEventListener('DOMContentLoaded', () => {
    // Initialize sidebar state - CLOSED by default
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const hamburger = document.getElementById('hamburger');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    // Initialize sidebar as CLOSED
    const initializeSidebar = () => {
        sidebar.classList.remove('open');
        mainContent.classList.remove('shifted');
    };

    initializeSidebar();

    // Hamburger menu toggle - opens/closes sidebar
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (window.innerWidth >= 1024) {
            mainContent.classList.toggle('shifted');
        }
        
        // Animate hamburger icon
        if (sidebar.classList.contains('open')) {
            hamburger.classList.add('active');
        } else {
            hamburger.classList.remove('active');
        }
    });

    // Mobile menu toggle
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth < 1024) {
            if (!sidebar.contains(e.target) && !hamburger.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                hamburger.classList.remove('active');
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 1024) {
            if (sidebar.classList.contains('open')) {
                mainContent.classList.add('shifted');
            }
        } else {
            mainContent.classList.remove('shifted');
        }
    });

    // Enhanced Sidebar animation with consistent wave matching
    const footer = document.querySelector('.footer-section');
    const footerWave = document.querySelector('.footer-wave');
    const sidebarWave = document.querySelector('.sidebar-wave-bottom');
    let lastScrollY = window.scrollY;
    let animationFrame = null;
    
    const adjustSidebarHeight = () => {
        if (!sidebar || !footer) return;
        
        // Cancel any pending animation frame
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        
        animationFrame = requestAnimationFrame(() => {
            const footerRect = footer.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const navHeight = 64;
            
            // Calculate the distance from footer
            const distanceFromFooter = footerRect.top;
            
            if (distanceFromFooter < windowHeight) {
                // Footer is visible - smoothly adjust sidebar height
                const overlap = windowHeight - distanceFromFooter;
                const maxSidebarHeight = windowHeight - navHeight;
                const minSidebarHeight = 200;
                
                // Calculate new height with smooth transition
                let newHeight = maxSidebarHeight - overlap;
                newHeight = Math.max(minSidebarHeight, Math.min(maxSidebarHeight, newHeight));
                
                // Apply smooth transition
                sidebar.style.transition = 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                sidebar.style.height = `${newHeight}px`;
                
                // Show and animate wave at bottom
                if (sidebarWave) {
                    const waveOpacity = Math.min(1, overlap / 200);
                    sidebarWave.style.opacity = waveOpacity;
                    sidebarWave.style.transform = `translateY(0) scale(1, ${1 + (waveOpacity * 0.2)})`;
                    sidebarWave.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                }
            } else {
                // Footer is not visible - full height sidebar
                sidebar.style.height = `calc(100vh - ${navHeight}px)`;
                
                // Hide wave
                if (sidebarWave) {
                    sidebarWave.style.opacity = '0';
                    sidebarWave.style.transform = 'translateY(20px) scale(1, 0.8)';
                }
            }
            
            animationFrame = null;
        });
    };

    // Throttle function for performance
    const throttle = (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    };

    // Check sidebar height on scroll and resize
    window.addEventListener('scroll', throttle(adjustSidebarHeight, 50));
    window.addEventListener('resize', throttle(adjustSidebarHeight, 50));
    adjustSidebarHeight();

    // Notification Modal Functionality
    const notificationBtn = document.getElementById('notificationBtn');
    const notificationBtnMobile = document.getElementById('notificationBtnMobile');
    const notificationModal = document.getElementById('notificationModal');
    const closeNotificationModal = document.getElementById('closeNotificationModal');
    const notificationTabs = document.querySelectorAll('.notification-tab');
    const notificationList = document.getElementById('notificationList');

    // Sample notifications data
    const notifications = {
        all: [
            { type: 'personal', title: 'New Message', content: 'John Doe sent you a message', time: '5 min ago', unread: true },
            { type: 'system', title: 'System Update', content: 'Platform maintenance scheduled', time: '1 hour ago', unread: true },
            { type: 'personal', title: 'Course Request', content: 'Your course request was approved', time: '2 hours ago', unread: false },
            { type: 'system', title: 'Welcome!', content: 'Welcome to Astegni platform', time: '1 day ago', unread: false }
        ],
        personal: [
            { type: 'personal', title: 'New Message', content: 'John Doe sent you a message', time: '5 min ago', unread: true },
            { type: 'personal', title: 'Course Request', content: 'Your course request was approved', time: '2 hours ago', unread: false }
        ],
        unread: [
            { type: 'personal', title: 'New Message', content: 'John Doe sent you a message', time: '5 min ago', unread: true },
            { type: 'system', title: 'System Update', content: 'Platform maintenance scheduled', time: '1 hour ago', unread: true }
        ],
        system: [
            { type: 'system', title: 'System Update', content: 'Platform maintenance scheduled', time: '1 hour ago', unread: true },
            { type: 'system', title: 'Welcome!', content: 'Welcome to Astegni platform', time: '1 day ago', unread: false }
        ]
    };

    // Function to render notifications
    const renderNotifications = (tab = 'all') => {
        const items = notifications[tab] || [];
        notificationList.innerHTML = '';
        
        if (items.length === 0) {
            notificationList.innerHTML = `
                <div class="notification-empty">
                    <svg class="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                    <p class="text-gray-500">No notifications</p>
                </div>
            `;
            return;
        }
        
        items.forEach(item => {
            const notificationItem = document.createElement('div');
            notificationItem.className = `notification-item ${item.unread ? 'unread' : ''}`;
            notificationItem.innerHTML = `
                <div class="notification-icon ${item.type}">
                    ${item.type === 'personal' ? '👤' : '🔔'}
                </div>
                <div class="notification-content">
                    <h4 class="notification-item-title">${item.title}</h4>
                    <p class="notification-item-text">${item.content}</p>
                    <span class="notification-time">${item.time}</span>
                </div>
                ${item.unread ? '<span class="unread-dot"></span>' : ''}
            `;
            notificationList.appendChild(notificationItem);
        });
    };

    // Open notification modal
    const openNotificationModal = () => {
        notificationModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        renderNotifications('all');
    };

    // Close notification modal
    const closeNotificationModalFunc = () => {
        notificationModal.classList.add('hidden');
        document.body.style.overflow = '';
    };

    // Notification button click handlers
    if (notificationBtn) {
        notificationBtn.addEventListener('click', openNotificationModal);
    }
    if (notificationBtnMobile) {
        notificationBtnMobile.addEventListener('click', openNotificationModal);
    }
    if (closeNotificationModal) {
        closeNotificationModal.addEventListener('click', closeNotificationModalFunc);
    }

    // Notification tabs
    notificationTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            notificationTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderNotifications(tab.dataset.tab);
        });
    });

    // Close notification modal when clicking outside
    notificationModal?.addEventListener('click', (e) => {
        if (e.target === notificationModal) {
            closeNotificationModalFunc();
        }
    });

    // Theme Toggle with proper icon switching
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    const html = document.documentElement;

    const setTheme = (theme) => {
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
            // Icons will automatically switch via CSS
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
            // Icons will automatically switch via CSS
        }
        localStorage.setItem('theme', theme);
        
        // Add animation to theme toggle button
        const buttons = [themeToggle, themeToggleMobile].filter(Boolean);
        buttons.forEach(btn => {
            btn.classList.add('animate__animated', 'animate__rotateIn');
            setTimeout(() => {
                btn.classList.remove('animate__animated', 'animate__rotateIn');
            }, 500);
        });
    };

    // Desktop theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const newTheme = html.classList.contains('dark') ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    // Mobile theme toggle
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('click', () => {
            const newTheme = html.classList.contains('dark') ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme || (prefersDark ? 'dark' : 'light'));

    // Background Image Rotation
    const backgroundImages = 15;
    let currentBgIndex = 1;
    
    function changeBackground() {
        mainContent.className = mainContent.className.replace(/bg-\d+/g, '');
        mainContent.classList.add(`bg-${currentBgIndex}`);
        currentBgIndex = (currentBgIndex % backgroundImages) + 1;
    }
    
    changeBackground();
    let bgRotationInterval = setInterval(changeBackground, 10000);

    // Course Type and Grade Selection
    const courseTypeSelect = document.getElementById('courseTypeSelect');
    const gradeSelectContainer = document.getElementById('gradeSelectContainer');
    
    courseTypeSelect?.addEventListener('change', () => {
        if (courseTypeSelect.value === 'academics') {
            gradeSelectContainer.classList.remove('hidden');
        } else {
            gradeSelectContainer.classList.add('hidden');
        }
        applyFilters();
    });

    // Enhanced Tutor Data
    const tutors = [
        { 
            name: 'John Doe', 
            courses: ['Math', 'Physics'], 
            grades: ['Grade 9-10', 'Grade 11-12'], 
            courseType: 'academics',
            location: 'New York', 
            teachesAt: 'New York University', 
            gender: 'Male', 
            learningMethod: 'Hybrid', 
            rating: 4.4, 
            price: 50, 
            favorite: false, 
            inSearchHistory: false,
            experience: 5,
            bio: 'Passionate educator with expertise in Math and Physics.',
            quote: 'Learning is a journey, not a destination.',
            isTrainingCenter: false
        },
        { 
            name: 'Bright Minds Learning Center', 
            courses: ['Elementary Math', 'Reading', 'Science'], 
            grades: ['KG', 'Grade 1-4', 'Grade 5-6'], 
            courseType: 'academics',
            location: 'Chicago', 
            teachesAt: 'Bright Minds Learning Center', 
            gender: 'Center', 
            learningMethod: 'In-person', 
            rating: 4.8, 
            price: 35, 
            favorite: false, 
            inSearchHistory: false,
            experience: 10,
            bio: 'Premier training center for young learners with certified teachers.',
            quote: 'Building strong foundations for lifelong learning.',
            isTrainingCenter: true
        },
        { 
            name: 'Sarah Smith', 
            courses: ['English', 'Literature'], 
            grades: ['Grade 7-8', 'Grade 9-10'], 
            courseType: 'academics',
            location: 'Chicago', 
            teachesAt: 'Online Academy', 
            gender: 'Female', 
            learningMethod: 'Online', 
            rating: 4.78, 
            price: 40, 
            favorite: false, 
            inSearchHistory: false,
            experience: 4,
            bio: 'Dedicated English teacher specializing in creative writing.',
            quote: 'Words have the power to change the world.',
            isTrainingCenter: false
        },
        { 
            name: 'TechCert Professional Training', 
            courses: ['AWS Certification', 'Azure', 'Google Cloud'], 
            grades: [], 
            courseType: 'certifications',
            location: 'San Francisco', 
            teachesAt: 'TechCert Professional Training', 
            gender: 'Center', 
            learningMethod: 'Hybrid', 
            rating: 4.9, 
            price: 120, 
            favorite: false, 
            inSearchHistory: false,
            experience: 8,
            bio: 'Industry-leading certification training center with 95% pass rate.',
            quote: 'Your gateway to cloud computing excellence.',
            isTrainingCenter: true
        },
        { 
            name: 'Michael Brown', 
            courses: ['Chemistry', 'Biology'], 
            grades: ['Freshman', 'Sophomore'], 
            courseType: 'academics',
            location: 'Boston', 
            teachesAt: 'Boston College', 
            gender: 'Male', 
            learningMethod: 'In-person', 
            rating: 4.32, 
            price: 60, 
            favorite: false, 
            inSearchHistory: false,
            experience: 6,
            bio: 'Research scientist turned educator.',
            quote: 'Science is a way of thinking.',
            isTrainingCenter: false
        },
        { 
            name: 'Emily Davis', 
            courses: ['History', 'Social Studies'], 
            grades: ['Grade 9-10'], 
            courseType: 'academics',
            location: 'Los Angeles', 
            teachesAt: 'Los Angeles High School', 
            gender: 'Female', 
            learningMethod: 'Hybrid', 
            rating: 3.78, 
            price: 35, 
            favorite: false, 
            inSearchHistory: false,
            experience: 3,
            bio: 'Making history come alive through engaging storytelling.',
            quote: 'History teaches us about our future.',
            isTrainingCenter: false
        }
    ];

    // Generate Tutor Cards
    const tutorCardsContainer = document.getElementById('tutorCards');
    
    function generateTutorCard(tutor, index) {
        const card = document.createElement('div');
        card.className = 'tutor-card animate__animated animate__fadeInUp';
        card.style.animationDelay = `${index * 0.05}s`;
        
        const courseTypeLabel = tutor.courseType === 'certifications' ? 'Certification' : 'Academic';
        const gradeInfo = tutor.grades.length > 0 ? tutor.grades.join(', ') : 'Professional Certification';
        const centerBadge = tutor.isTrainingCenter ? '<span class="inline-block px-2 py-1 text-xs bg-green-500 text-white rounded-full ml-2">Training Center</span>' : '';
        
        // Calculate rating breakdowns
        const ratingBreakdown = {
            engagement: (tutor.rating + (Math.random() * 0.4 - 0.2)).toFixed(1),
            discipline: (tutor.rating + (Math.random() * 0.3 - 0.15)).toFixed(1),
            punctuality: (tutor.rating + (Math.random() * 0.35 - 0.175)).toFixed(1),
            communication: (tutor.rating + (Math.random() * 0.25 - 0.125)).toFixed(1),
            subjectMatter: (tutor.rating + (Math.random() * 0.3 - 0.15)).toFixed(1)
        };
        
        card.innerHTML = `
            <div class="tutor-header">
                <img src="https://via.placeholder.com/60" alt="${tutor.name}" class="tutor-avatar">
                <div class="tutor-info">
                    <div class="tutor-name-wrapper">
                        <a href="view-tutor.html" class="tutor-name">${tutor.name}${centerBadge}</a>
                    </div>
                    <div class="rating-stars-container">
                        <div class="rating-stars">
                            ${'★'.repeat(Math.round(tutor.rating))}${'☆'.repeat(5 - Math.round(tutor.rating))}
                            <span style="font-size: 0.875rem; color: #6b7280; margin-left: 0.25rem;">(${tutor.rating})</span>
                        </div>
                        <div class="rating-breakdown-tooltip">
                            <div class="tooltip-arrow"></div>
                            <div class="tooltip-content">
                                <div class="rating-item">
                                    <span class="rating-label">Engagement:</span>
                                    <div class="rating-bar">
                                        <div class="rating-fill" style="width: ${(ratingBreakdown.engagement / 5) * 100}%"></div>
                                    </div>
                                    <span class="rating-value">${ratingBreakdown.engagement}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Discipline:</span>
                                    <div class="rating-bar">
                                        <div class="rating-fill" style="width: ${(ratingBreakdown.discipline / 5) * 100}%"></div>
                                    </div>
                                    <span class="rating-value">${ratingBreakdown.discipline}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Punctuality:</span>
                                    <div class="rating-bar">
                                        <div class="rating-fill" style="width: ${(ratingBreakdown.punctuality / 5) * 100}%"></div>
                                    </div>
                                    <span class="rating-value">${ratingBreakdown.punctuality}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Communication:</span>
                                    <div class="rating-bar">
                                        <div class="rating-fill" style="width: ${(ratingBreakdown.communication / 5) * 100}%"></div>
                                    </div>
                                    <span class="rating-value">${ratingBreakdown.communication}</span>
                                </div>
                                <div class="rating-item">
                                    <span class="rating-label">Subject Matter:</span>
                                    <div class="rating-bar">
                                        <div class="rating-fill" style="width: ${(ratingBreakdown.subjectMatter / 5) * 100}%"></div>
                                    </div>
                                    <span class="rating-value">${ratingBreakdown.subjectMatter}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="tutor-actions">
                    <button class="action-btn favorite-btn ${tutor.favorite ? 'active' : ''}" data-index="${index}" aria-label="Favorite">
                        <svg class="w-5 h-5" fill="${tutor.favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"></path>
                        </svg>
                    </button>
                    <button class="action-btn save-btn" aria-label="Save">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="tutor-details">
                <div class="detail-item">
                    <span class="detail-label">Type:</span> ${courseTypeLabel}
                </div>
                ${tutor.gender !== 'Center' ? `<div class="detail-item">
                    <span class="detail-label">Gender:</span> ${tutor.gender}
                </div>` : ''}
                <div class="detail-item">
                    <span class="detail-label">Courses:</span> ${tutor.courses.join(', ')}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Grades:</span> ${gradeInfo}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Experience:</span> ${tutor.experience} years
                </div>
                <div class="detail-item">
                    <span class="detail-label">Teaches at:</span> ${tutor.teachesAt}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Location:</span> ${tutor.location}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Method:</span> ${tutor.learningMethod}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Bio:</span> ${tutor.bio}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Quote:</span> <em>"${tutor.quote}"</em>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Price:</span> <strong>${tutor.price}/hr</strong>
                </div>
            </div>
            <a href="view-tutor.html" class="view-tutor-btn">View Full Profile</a>
        `;
        
        return card;
    }

    // Render tutor cards
    function renderTutorCards(filteredTutors = tutors) {
        tutorCardsContainer.innerHTML = '';
        
        filteredTutors.forEach((tutor, index) => {
            tutorCardsContainer.appendChild(generateTutorCard(tutor, index));
        });
        
        attachCardEventListeners();
    }

    // Attach event listeners to card buttons
    function attachCardEventListeners() {
        // Favorite buttons
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const index = btn.dataset.index;
                tutors[index].favorite = !tutors[index].favorite;
                btn.classList.toggle('active');
                const svg = btn.querySelector('svg');
                svg.setAttribute('fill', tutors[index].favorite ? 'currentColor' : 'none');
                
                // Add animation
                btn.classList.add('animate__animated', 'animate__heartBeat');
                setTimeout(() => {
                    btn.classList.remove('animate__animated', 'animate__heartBeat');
                }, 1000);
            });
        });

        // Save buttons
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.classList.toggle('active');
                const svg = btn.querySelector('svg');
                svg.setAttribute('fill', btn.classList.contains('active') ? 'currentColor' : 'none');
                
                // Add animation
                btn.classList.add('animate__animated', 'animate__pulse');
                setTimeout(() => {
                    btn.classList.remove('animate__animated', 'animate__pulse');
                }, 1000);
            });
        });
    }

    renderTutorCards();

    // Ad Rotation
    const mainAdPlaceholder = document.getElementById('adPlaceholder');
    const ads = [
        '🎓 Featured Tutors & Special Offers',
        '📚 Save 20% on Group Sessions!',
        '🌟 Top-Rated Training Centers Available',
        '💡 Get Certified in 30 Days!',
        '🏆 Excellence in Education - Join Today!',
        '🚀 Boost Your Career with Certifications',
        '👶 Special Programs for Young Learners',
        '💼 Professional Development Courses'
    ];
    let adIndex = 0;

    function rotateAds() {
        if (mainAdPlaceholder) {
            const mainAdText = mainAdPlaceholder.querySelector('.ad-text');
            if (mainAdText) {
                mainAdText.style.opacity = '0';
                setTimeout(() => {
                    mainAdText.textContent = ads[adIndex];
                    mainAdText.style.opacity = '1';
                }, 300);
            }
        }
        adIndex = (adIndex + 1) % ads.length;
    }

    rotateAds();
    let adRotationInterval = setInterval(rotateAds, 8000);

    // Typing Animation
    const typedTextElement = document.getElementById('typedText');
    const cursorElement = document.getElementById('cursor');
    const heroTexts = [
        'Find Your Perfect Tutor',
        'Learn at Training Centers',
        'Get Professional Certifications',
        'Discover Expert Educators',
        'Join Top-Rated Centers'
    ];
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        if (!typedTextElement || !cursorElement) return;
        
        const currentText = heroTexts[textIndex];
        
        if (isDeleting) {
            typedTextElement.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
        } else {
            typedTextElement.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
        }
        
        if (!isDeleting && charIndex === currentText.length) {
            isDeleting = true;
            typingSpeed = 50;
            setTimeout(type, 1500);
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % heroTexts.length;
            typingSpeed = 100;
            setTimeout(type, 500);
        } else {
            setTimeout(type, typingSpeed);
        }
    }

    type();

    // Enhanced Search and Filter Functionality
    const searchBar = document.getElementById('searchBar');
    const searchBarMobile = document.getElementById('searchBarMobile');
    const genderCheckboxes = document.querySelectorAll('input[name="gender"]');
    const nearMeCheckbox = document.querySelector('input[name="nearMe"]');
    const trainingCenterCheckbox = document.querySelector('input[name="trainingCenter"]');
    const favoriteCheckbox = document.querySelector('input[name="favorite"]');
    const searchHistoryCheckbox = document.querySelector('input[name="searchHistory"]');
    const minRatingInput = document.querySelector('input[name="minRating"]');
    const maxRatingInput = document.querySelector('input[name="maxRating"]');
    const learningMethodSelect = document.querySelector('select[name="learningMethod"]');
    const gradeSelect = document.getElementById('gradeSelect');
    const minPriceInput = document.querySelector('input[name="minPrice"]');
    const maxPriceInput = document.querySelector('input[name="maxPrice"]');
    const requestCourseBtn = document.getElementById('requestCourse');
    const requestSchoolBtn = document.getElementById('requestSchool');
    const requestCourseNoResults = document.getElementById('requestCourseNoResults');
    const requestSchoolNoResults = document.getElementById('requestSchoolNoResults');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const noResultsDiv = document.getElementById('noResults');

    // Store search history
    let searchHistory = [];

    function applyFilters() {
        const query = searchBar.value.toLowerCase().trim();
        const selectedGenders = Array.from(genderCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const nearMe = nearMeCheckbox.checked;
        const trainingCenter = trainingCenterCheckbox ? trainingCenterCheckbox.checked : false;
        const favorite = favoriteCheckbox.checked;
        const searchHistoryFilter = searchHistoryCheckbox.checked;
        const minRating = parseFloat(minRatingInput.value) || 0;
        const maxRating = parseFloat(maxRatingInput.value) || 5;
        const learningMethod = learningMethodSelect.value;
        const courseType = courseTypeSelect.value;
        const grade = gradeSelect.value;
        const minPrice = parseFloat(minPriceInput.value) || 0;
        const maxPrice = parseFloat(maxPriceInput.value) || Infinity;

        // Add to search history
        if (query && !searchHistory.includes(query)) {
            searchHistory.unshift(query);
            searchHistory = searchHistory.slice(0, 10);
        }

        // Filter tutors
        const filteredTutors = tutors.filter(tutor => {
            let isMatch = true;

            // Search query matching
            if (query) {
                const matchesName = tutor.name.toLowerCase().includes(query);
                const matchesCourse = tutor.courses.some(course => course.toLowerCase().includes(query));
                const matchesGrade = tutor.grades.some(grade => grade.toLowerCase().includes(query));
                const matchesSchool = tutor.teachesAt.toLowerCase().includes(query);
                const matchesBio = tutor.bio.toLowerCase().includes(query);
                
                isMatch = isMatch && (matchesName || matchesCourse || matchesGrade || matchesSchool || matchesBio);
                
                if (isMatch) {
                    tutor.inSearchHistory = true;
                }
            }

            // Gender filter
            if (selectedGenders.length > 0) {
                if (tutor.gender === 'Center') {
                    isMatch = false;
                } else {
                    isMatch = isMatch && selectedGenders.includes(tutor.gender);
                }
            }

            // Location filter
            if (nearMe) {
                isMatch = isMatch && tutor.location === 'New York';
            }

            // Training center filter
            if (trainingCenter) {
                isMatch = isMatch && tutor.isTrainingCenter;
            }

            // Favorite filter
            if (favorite) {
                isMatch = isMatch && tutor.favorite;
            }

            // Search history filter
            if (searchHistoryFilter) {
                isMatch = isMatch && tutor.inSearchHistory;
            }

            // Rating filter
            isMatch = isMatch && tutor.rating >= minRating && tutor.rating <= maxRating;

            // Learning method filter
            if (learningMethod) {
                isMatch = isMatch && tutor.learningMethod === learningMethod;
            }

            // Course type filter
            if (courseType) {
                isMatch = isMatch && tutor.courseType === courseType;
                
                if (courseType === 'academics' && grade) {
                    isMatch = isMatch && tutor.grades.includes(grade);
                }
            }

            // Price filter
            isMatch = isMatch && tutor.price >= minPrice && tutor.price <= maxPrice;

            return isMatch;
        });

        // Show/hide cards and no results message
        if (filteredTutors.length === 0) {
            tutorCardsContainer.style.display = 'none';
            noResultsDiv.classList.remove('hidden');
            
            // Always show request buttons when no results
            if (requestCourseNoResults) {
                requestCourseNoResults.style.display = 'inline-flex';
            }
            if (requestSchoolNoResults) {
                requestSchoolNoResults.style.display = 'inline-flex';
            }
        } else {
            tutorCardsContainer.style.display = 'grid';
            noResultsDiv.classList.add('hidden');
            renderTutorCards(filteredTutors);
        }

        // Show/hide request buttons in header based on search
        if (query && filteredTutors.length === 0) {
            requestCourseBtn.style.display = 'inline-flex';
            requestSchoolBtn.style.display = 'inline-flex';
        } else {
            requestCourseBtn.style.display = 'none';
            requestSchoolBtn.style.display = 'none';
        }
    }

    // Debounce function
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Live search with debouncing
    const debouncedSearch = debounce(applyFilters, 300);

    // Add event listeners for filters
    searchBar?.addEventListener('input', debouncedSearch);
    
    // Sync mobile search bar
    if (searchBarMobile) {
        searchBarMobile.addEventListener('input', () => {
            searchBar.value = searchBarMobile.value;
            debouncedSearch();
        });
        
        searchBar?.addEventListener('input', () => {
            searchBarMobile.value = searchBar.value;
        });
    }

    // Filter event listeners
    genderCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    nearMeCheckbox?.addEventListener('change', applyFilters);
    trainingCenterCheckbox?.addEventListener('change', applyFilters);
    favoriteCheckbox?.addEventListener('change', applyFilters);
    searchHistoryCheckbox?.addEventListener('change', applyFilters);
    minRatingInput?.addEventListener('input', debounce(applyFilters, 500));
    maxRatingInput?.addEventListener('input', debounce(applyFilters, 500));
    learningMethodSelect?.addEventListener('change', applyFilters);
    gradeSelect?.addEventListener('change', applyFilters);
    minPriceInput?.addEventListener('input', debounce(applyFilters, 500));
    maxPriceInput?.addEventListener('input', debounce(applyFilters, 500));

    // Clear filters
    clearFiltersBtn?.addEventListener('click', () => {
        searchBar.value = '';
        searchBarMobile.value = '';
        genderCheckboxes.forEach(cb => cb.checked = false);
        nearMeCheckbox.checked = false;
        trainingCenterCheckbox.checked = false;
        favoriteCheckbox.checked = false;
        searchHistoryCheckbox.checked = false;
        minRatingInput.value = '';
        maxRatingInput.value = '';
        learningMethodSelect.value = '';
        courseTypeSelect.value = '';
        gradeSelect.value = '';
        gradeSelectContainer.classList.add('hidden');
        minPriceInput.value = '';
        maxPriceInput.value = '';
        applyFilters();
    });

    // Request Course Modal
    const requestCourseModal = document.getElementById('requestCourseModal');
    const closeCourseModal = document.getElementById('closeCourseModal');
    const cancelCourseBtn = document.getElementById('cancelCourseBtn');
    const submitCourseBtn = document.getElementById('submitCourseBtn');

    const openCourseModal = () => {
        requestCourseModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    requestCourseBtn?.addEventListener('click', openCourseModal);
    requestCourseNoResults?.addEventListener('click', openCourseModal);

    closeCourseModal?.addEventListener('click', () => {
        requestCourseModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearModalForm('course');
    });

    cancelCourseBtn?.addEventListener('click', () => {
        requestCourseModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearModalForm('course');
    });

    submitCourseBtn?.addEventListener('click', () => {
        const courseName = document.getElementById('courseName').value.trim();
        const courseType = document.getElementById('courseTypeInput').value.trim();
        const courseDescription = document.getElementById('courseDescription').value.trim();
        
        if (courseName && courseType && courseDescription) {
            showNotification('Course request submitted successfully!', 'success');
            requestCourseModal.classList.add('hidden');
            document.body.style.overflow = '';
            clearModalForm('course');
        } else {
            showNotification('Please fill in all fields', 'error');
        }
    });

    // Request School Modal
    const requestSchoolModal = document.getElementById('requestSchoolModal');
    const closeSchoolModal = document.getElementById('closeSchoolModal');
    const cancelSchoolBtn = document.getElementById('cancelSchoolBtn');
    const submitSchoolBtn = document.getElementById('submitSchoolBtn');

    const openSchoolModal = () => {
        requestSchoolModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    requestSchoolBtn?.addEventListener('click', openSchoolModal);
    requestSchoolNoResults?.addEventListener('click', openSchoolModal);

    closeSchoolModal?.addEventListener('click', () => {
        requestSchoolModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearModalForm('school');
    });

    cancelSchoolBtn?.addEventListener('click', () => {
        requestSchoolModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearModalForm('school');
    });

    submitSchoolBtn?.addEventListener('click', () => {
        const schoolName = document.getElementById('schoolName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const location = document.getElementById('location').value.trim();
        
        if (schoolName && phone && email && location) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            showNotification('School request submitted successfully!', 'success');
            requestSchoolModal.classList.add('hidden');
            document.body.style.overflow = '';
            clearModalForm('school');
        } else {
            showNotification('Please fill in all fields', 'error');
        }
    });

    // Close modals when clicking outside
    [requestCourseModal, requestSchoolModal].forEach(modal => {
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
                clearModalForm(modal === requestCourseModal ? 'course' : 'school');
            }
        });
    });

    // Clear modal form
    function clearModalForm(type) {
        if (type === 'course') {
            document.getElementById('courseName').value = '';
            document.getElementById('courseTypeInput').value = '';
            document.getElementById('courseDescription').value = '';
        } else if (type === 'school') {
            document.getElementById('schoolName').value = '';
            document.getElementById('phone').value = '';
            document.getElementById('email').value = '';
            document.getElementById('location').value = '';
        }
    }

    // Enhanced notification with animation
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50 animate__animated animate__slideInRight`;
        
        if (type === 'success') {
            notification.className += ' bg-green-500 text-white';
        } else if (type === 'error') {
            notification.className += ' bg-red-500 text-white';
        } else {
            notification.className += ' bg-blue-500 text-white';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('animate__slideOutRight');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close all modals
            [requestCourseModal, requestSchoolModal, notificationModal].forEach(modal => {
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            });
        }
    });

    // Page visibility API
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearInterval(adRotationInterval);
            clearInterval(bgRotationInterval);
        } else {
            adRotationInterval = setInterval(rotateAds, 8000);
            bgRotationInterval = setInterval(changeBackground, 10000);
        }
    });

    // Footer button functions
    window.openLoginRegisterModal = function() {
        showNotification('Login/Register feature coming soon!', 'info');
    };

    window.openAdvertiseModal = function() {
        showNotification('Advertise with us - Contact info@astegni.et', 'info');
    };

    // Initialize page
    console.log('✨ Astegni Find Tutors - Enhanced and ready!');
});