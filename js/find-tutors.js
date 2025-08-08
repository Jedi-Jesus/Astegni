// Also sync mobile search bar with main search bar
    const searchBarMobile = document.getElementById('searchBarMobile');
    if (searchBarMobile) {
        searchBarMobile.addEventListener('input', () => {
            searchBar.value = searchBarMobile.value;
            applyFilters();
        });
        
        searchBar.addEventListener('input', () => {
            searchBarMobile.value = searchBar.value;
        });
    }document.addEventListener('DOMContentLoaded', () => {
    // Initialize sidebar state - open by default on desktop
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const hamburger = document.getElementById('hamburger');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    // Initialize sidebar
    const initializeSidebar = () => {
        if (window.innerWidth >= 1024) {
            sidebar.classList.add('open');
            mainContent.classList.add('shifted');
        }
    };

    initializeSidebar();

    // Hamburger menu toggle
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (window.innerWidth >= 1024) {
            mainContent.classList.toggle('shifted');
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

    // Sidebar height adjustment when footer is visible
    const footer = document.querySelector('.footer-container');
    const adjustSidebarHeight = () => {
        if (!sidebar || !footer) return;
        
        const footerRect = footer.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        if (footerRect.top < windowHeight) {
            // Footer is visible
            const availableHeight = footerRect.top - 64; // 64px is nav height
            sidebar.style.height = `${availableHeight}px`;
        } else {
            // Footer is not visible
            sidebar.style.height = 'calc(100vh - 64px)';
        }
    };

    // Check sidebar height on scroll and resize
    window.addEventListener('scroll', adjustSidebarHeight);
    window.addEventListener('resize', adjustSidebarHeight);
    adjustSidebarHeight(); // Initial check

    // Theme Toggle - Fixed for both desktop and mobile
    const themeToggle = document.getElementById('themeToggle');
    const themeToggleMobile = document.getElementById('themeToggleMobile');
    const html = document.documentElement;

    const setTheme = (theme) => {
        if (theme === 'dark') {
            html.classList.add('dark');
            html.setAttribute('data-theme', 'dark');
        } else {
            html.classList.remove('dark');
            html.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('theme', theme);
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
    setInterval(changeBackground, 10000); // Change every 10 seconds

    // Course Type and Grade Selection
    const courseTypeSelect = document.getElementById('courseTypeSelect');
    const gradeSelectContainer = document.getElementById('gradeSelectContainer');
    
    courseTypeSelect.addEventListener('change', () => {
        if (courseTypeSelect.value === 'academics') {
            gradeSelectContainer.classList.remove('hidden');
        } else {
            gradeSelectContainer.classList.add('hidden');
        }
        applyFilters();
    });

    // Enhanced Tutor Data with Training Centers
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
        },
        { 
            name: 'Kids Academy Training Center', 
            courses: ['Math', 'Science', 'English', 'Art'], 
            grades: ['KG', 'Grade 1-4'], 
            courseType: 'academics',
            location: 'Miami', 
            teachesAt: 'Kids Academy Training Center', 
            gender: 'Center', 
            learningMethod: 'In-person', 
            rating: 4.7, 
            price: 30, 
            favorite: false, 
            inSearchHistory: false,
            experience: 12,
            bio: 'Nurturing young minds with personalized attention and care.',
            quote: 'Where every child is a star!',
            isTrainingCenter: true
        },
        { 
            name: 'David Lee', 
            courses: ['Computer Science', 'Programming'], 
            grades: ['Junior', 'Graduate'], 
            courseType: 'academics',
            location: 'San Francisco', 
            teachesAt: 'CodeTech Institute', 
            gender: 'Male', 
            learningMethod: 'Online', 
            rating: 4.86, 
            price: 55, 
            favorite: false, 
            inSearchHistory: false,
            experience: 5,
            bio: 'Full-stack developer teaching modern programming.',
            quote: 'Code is poetry in motion.',
            isTrainingCenter: false
        },
        { 
            name: 'ProCert Business Center', 
            courses: ['PMP Certification', 'Scrum Master', 'Six Sigma'], 
            grades: [], 
            courseType: 'certifications',
            location: 'New York', 
            teachesAt: 'ProCert Business Center', 
            gender: 'Center', 
            learningMethod: 'Hybrid', 
            rating: 4.85, 
            price: 150, 
            favorite: false, 
            inSearchHistory: false,
            experience: 15,
            bio: 'Professional certification center with expert instructors.',
            quote: 'Advance your career with industry-recognized certifications.',
            isTrainingCenter: true
        },
        { 
            name: 'Lisa Johnson', 
            courses: ['Algebra', 'Calculus'], 
            grades: ['Grade 11-12'], 
            courseType: 'academics',
            location: 'Miami', 
            teachesAt: 'Miami University', 
            gender: 'Female', 
            learningMethod: 'Online', 
            rating: 4.2, 
            price: 45, 
            favorite: false, 
            inSearchHistory: false,
            experience: 4,
            bio: 'Making complex math simple and enjoyable.',
            quote: 'Mathematics is the language of the universe.',
            isTrainingCenter: false
        },
        { 
            name: 'James Wilson', 
            courses: ['Economics', 'Finance'], 
            grades: ['Freshman', 'Sophomore'], 
            courseType: 'academics',
            location: 'Seattle', 
            teachesAt: 'University of Washington', 
            gender: 'Male', 
            learningMethod: 'Hybrid', 
            rating: 4.5, 
            price: 50, 
            favorite: false, 
            inSearchHistory: false,
            experience: 7,
            bio: 'Former Wall Street analyst teaching practical finance.',
            quote: 'Financial knowledge is financial freedom.',
            isTrainingCenter: false
        },
        { 
            name: 'Little Scholars Training Hub', 
            courses: ['Reading', 'Writing', 'Basic Math', 'Social Skills'], 
            grades: ['KG', 'Grade 1-4', 'Grade 5-6'], 
            courseType: 'academics',
            location: 'Houston', 
            teachesAt: 'Little Scholars Training Hub', 
            gender: 'Center', 
            learningMethod: 'In-person', 
            rating: 4.6, 
            price: 40, 
            favorite: false, 
            inSearchHistory: false,
            experience: 9,
            bio: 'Comprehensive education center for elementary students.',
            quote: 'Growing minds, building futures.',
            isTrainingCenter: true
        },
        { 
            name: 'Anna Martinez', 
            courses: ['Spanish', 'French'], 
            grades: ['Grade 5-6', 'Grade 7-8'], 
            courseType: 'academics',
            location: 'Houston', 
            teachesAt: 'Houston Language School', 
            gender: 'Female', 
            learningMethod: 'In-person', 
            rating: 4.6, 
            price: 42, 
            favorite: false, 
            inSearchHistory: false,
            experience: 4,
            bio: 'Native speaker bringing languages to life.',
            quote: 'Language opens doors to new worlds.',
            isTrainingCenter: false
        },
        { 
            name: 'Robert Taylor', 
            courses: ['Physics', 'Astronomy'], 
            grades: ['Sophomore', 'Junior'], 
            courseType: 'academics',
            location: 'Austin', 
            teachesAt: 'University of Texas', 
            gender: 'Male', 
            learningMethod: 'Hybrid', 
            rating: 4.3, 
            price: 55, 
            favorite: false, 
            inSearchHistory: false,
            experience: 5,
            bio: 'Astrophysicist sharing the cosmos.',
            quote: 'We are all made of star stuff.',
            isTrainingCenter: false
        },
        { 
            name: 'CertPro Language Center', 
            courses: ['IELTS', 'TOEFL', 'GRE', 'GMAT'], 
            grades: [], 
            courseType: 'certifications',
            location: 'Boston', 
            teachesAt: 'CertPro Language Center', 
            gender: 'Center', 
            learningMethod: 'Hybrid', 
            rating: 4.75, 
            price: 100, 
            favorite: false, 
            inSearchHistory: false,
            experience: 11,
            bio: 'Expert test preparation center with proven results.',
            quote: 'Your success is our mission.',
            isTrainingCenter: true
        },
        { 
            name: 'Emma White', 
            courses: ['IELTS', 'TOEFL'], 
            grades: [], 
            courseType: 'certifications',
            location: 'Denver', 
            teachesAt: 'Language Certification Hub', 
            gender: 'Female', 
            learningMethod: 'Online', 
            rating: 4.7, 
            price: 70, 
            favorite: false, 
            inSearchHistory: false,
            experience: 6,
            bio: 'Helping students achieve their dream scores.',
            quote: 'Success in language opens global opportunities.',
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
        
        card.innerHTML = `
            <div class="tutor-header">
                <img src="https://via.placeholder.com/60" alt="${tutor.name}" class="tutor-avatar">
                <div class="tutor-info">
                    <a href="view-tutor.html" class="tutor-name">${tutor.name}${centerBadge}</a>
                    <div class="rating-stars">
                        ${'★'.repeat(Math.round(tutor.rating))}${'☆'.repeat(5 - Math.round(tutor.rating))}
                        <span style="font-size: 0.875rem; color: #6b7280; margin-left: 0.25rem;">(${tutor.rating})</span>
                        <div class="rating-tooltip">
                            <div>Engagement: ${tutor.rating.toFixed(1)}</div>
                            <div>Discipline: ${(tutor.rating - 0.4).toFixed(1)}</div>
                            <div>Punctuality: ${(tutor.rating + 0.2).toFixed(1)}</div>
                            <div>Communication: ${(tutor.rating - 0.2).toFixed(1)}</div>
                            <div>Subject Matter: ${(tutor.rating + 0.3).toFixed(1)}</div>
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
                    <span class="detail-label">Price:</span> <strong>$${tutor.price}/hr</strong>
                </div>
            </div>
            <a href="view-tutor.html" class="view-tutor-btn">View Full Profile</a>
        `;
        
        return card;
    }

    // Render tutor cards with ad placeholders
    function renderTutorCards() {
        tutorCardsContainer.innerHTML = '';
        const adFrequency = 6; // Show ad after every 6 tutors
        
        tutors.forEach((tutor, index) => {
            tutorCardsContainer.appendChild(generateTutorCard(tutor, index));
            
            // Add ad placeholder after every 6 tutors
            if ((index + 1) % adFrequency === 0 && index < tutors.length - 1) {
                const adPlaceholder = document.createElement('div');
                adPlaceholder.className = 'ad-placeholder ad-container';
                adPlaceholder.innerHTML = `<span class="ad-text text-gray-600 dark:text-gray-300">Ad Placeholder ${Math.floor((index + 1) / adFrequency)}</span>`;
                tutorCardsContainer.appendChild(adPlaceholder);
            }
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
            });
        });

        // Save buttons
        document.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                btn.classList.toggle('active');
                const svg = btn.querySelector('svg');
                svg.setAttribute('fill', btn.classList.contains('active') ? 'currentColor' : 'none');
            });
        });
    }

    renderTutorCards();

    // Ad Rotation for main ad placeholder and inline ads
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
        // Rotate main ad
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
        
        // Rotate inline ads
        const inlineAdPlaceholders = document.querySelectorAll('.ad-placeholder .ad-text');
        inlineAdPlaceholders.forEach((placeholder, index) => {
            if (!placeholder || placeholder === mainAdPlaceholder?.querySelector('.ad-text')) return;
            placeholder.style.opacity = '0';
            setTimeout(() => {
                const adIndexForPlaceholder = (adIndex + index + 1) % ads.length;
                placeholder.textContent = ads[adIndexForPlaceholder];
                placeholder.style.opacity = '1';
                placeholder.parentElement.classList.add('animate__animated', 'animate__pulse');
                setTimeout(() => {
                    placeholder.parentElement.classList.remove('animate__animated', 'animate__pulse');
                }, 1000);
            }, 300);
        });
        
        adIndex = (adIndex + 1) % ads.length;
    }

    rotateAds();
    setInterval(rotateAds, 8000);

    // Typing Animation for Hero Text
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

    // Search and Filter Functionality
    const searchBar = document.getElementById('searchBar');
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
    const clearFiltersBtn = document.getElementById('clearFilters');

    function applyFilters() {
        const query = searchBar.value.toLowerCase().trim();
        const selectedGenders = Array.from(genderCheckboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.value);
        const nearMe = nearMeCheckbox.checked;
        const trainingCenter = trainingCenterCheckbox ? trainingCenterCheckbox.checked : false;
        const favorite = favoriteCheckbox.checked;
        const searchHistory = searchHistoryCheckbox.checked;
        const minRating = parseFloat(minRatingInput.value) || 0;
        const maxRating = parseFloat(maxRatingInput.value) || 5;
        const learningMethod = learningMethodSelect.value;
        const courseType = courseTypeSelect.value;
        const grade = gradeSelect.value;
        const minPrice = parseFloat(minPriceInput.value) || 0;
        const maxPrice = parseFloat(maxPriceInput.value) || Infinity;

        let courseMatch = false;
        let schoolMatch = false;
        let visibleCount = 0;

        const tutorCards = tutorCardsContainer.children;
        
        Array.from(tutorCards).forEach((card, index) => {
            // Skip ad placeholders
            if (card.classList.contains('ad-placeholder')) {
                card.style.display = '';
                return;
            }
            
            // Calculate actual tutor index accounting for ad placeholders
            const adPlaceholders = Array.from(tutorCards).slice(0, index).filter(c => c.classList.contains('ad-placeholder')).length;
            const tutorIndex = index - adPlaceholders;
            const tutor = tutors[tutorIndex];
            
            if (!tutor) return;
            
            let isMatch = true;

            // Search query matching
            if (query) {
                const matchesCourse = tutor.courses.some(course => course.toLowerCase().includes(query));
                const matchesSchool = tutor.teachesAt.toLowerCase().includes(query);
                isMatch = isMatch && (
                    tutor.name.toLowerCase().includes(query) ||
                    matchesCourse ||
                    tutor.grades.some(grade => grade.toLowerCase().includes(query)) ||
                    matchesSchool
                );
                if (matchesCourse) courseMatch = true;
                if (matchesSchool) schoolMatch = true;
            }

            // Gender filter - exclude training centers when gender is selected
            if (selectedGenders.length > 0) {
                if (tutor.gender === 'Center') {
                    // Training centers should be hidden when any gender filter is applied
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
            if (searchHistory) {
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
                
                // If academics is selected and a grade is chosen
                if (courseType === 'academics' && grade) {
                    isMatch = isMatch && tutor.grades.includes(grade);
                }
            }

            // Price filter
            isMatch = isMatch && tutor.price >= minPrice && tutor.price <= maxPrice;

            // Show/hide card
            card.style.display = isMatch ? '' : 'none';
            if (isMatch) visibleCount++;
        });

        // Show/hide request buttons
        requestCourseBtn.classList.toggle('hidden', courseMatch || !query);
        requestSchoolBtn.classList.toggle('hidden', schoolMatch || !query);

        // Show message if no results
        const noResultsMsg = document.getElementById('noResults');
        if (visibleCount === 0 && query) {
            if (!noResultsMsg) {
                const msg = document.createElement('div');
                msg.id = 'noResults';
                msg.className = 'text-center py-8 text-gray-500 dark:text-gray-400';
                msg.innerHTML = `
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="text-lg font-medium">No tutors found</p>
                    <p class="mt-2">Try adjusting your filters or search terms</p>
                `;
                tutorCardsContainer.appendChild(msg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    // Debounce function for performance
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

    // Add event listeners for filters
    searchBar.addEventListener('input', debounce(applyFilters, 300));
    genderCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));
    nearMeCheckbox.addEventListener('change', applyFilters);
    if (trainingCenterCheckbox) {
        trainingCenterCheckbox.addEventListener('change', applyFilters);
    }
    favoriteCheckbox.addEventListener('change', applyFilters);
    searchHistoryCheckbox.addEventListener('change', applyFilters);
    minRatingInput.addEventListener('input', debounce(applyFilters, 500));
    maxRatingInput.addEventListener('input', debounce(applyFilters, 500));
    learningMethodSelect.addEventListener('change', applyFilters);
    gradeSelect.addEventListener('change', applyFilters);
    minPriceInput.addEventListener('input', debounce(applyFilters, 500));
    maxPriceInput.addEventListener('input', debounce(applyFilters, 500));

    // Clear filters button
    clearFiltersBtn.addEventListener('click', () => {
        searchBar.value = '';
        genderCheckboxes.forEach(cb => cb.checked = false);
        nearMeCheckbox.checked = false;
        if (trainingCenterCheckbox) trainingCenterCheckbox.checked = false;
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
    const cancelCourseBtn = document.getElementById('cancelCourseBtn');
    const submitCourseBtn = document.getElementById('submitCourseBtn');

    requestCourseBtn.addEventListener('click', () => {
        requestCourseModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    cancelCourseBtn.addEventListener('click', () => {
        requestCourseModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearModalForm('course');
    });

    submitCourseBtn.addEventListener('click', () => {
        const courseName = document.getElementById('courseName').value.trim();
        const courseType = document.getElementById('courseTypeInput').value.trim();
        const courseDescription = document.getElementById('courseDescription').value.trim();
        
        if (courseName && courseType && courseDescription) {
            console.log('Course Request Submitted:', {
                courseName,
                courseType,
                courseDescription
            });
            
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
    const cancelSchoolBtn = document.getElementById('cancelSchoolBtn');
    const submitSchoolBtn = document.getElementById('submitSchoolBtn');

    requestSchoolBtn.addEventListener('click', () => {
        requestSchoolModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    cancelSchoolBtn.addEventListener('click', () => {
        requestSchoolModal.classList.add('hidden');
        document.body.style.overflow = '';
        clearModalForm('school');
    });

    submitSchoolBtn.addEventListener('click', () => {
        const schoolName = document.getElementById('schoolName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        const location = document.getElementById('location').value.trim();
        
        if (schoolName && phone && email && location) {
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showNotification('Please enter a valid email address', 'error');
                return;
            }
            
            console.log('School Request Submitted:', {
                schoolName,
                phone,
                email,
                location
            });
            
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
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                    clearModalForm(modal === requestCourseModal ? 'course' : 'school');
                }
            });
        }
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

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-20 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 z-50`;
        
        if (type === 'success') {
            notification.className += ' bg-green-500 text-white';
        } else if (type === 'error') {
            notification.className += ' bg-red-500 text-white';
        } else {
            notification.className += ' bg-blue-500 text-white';
        }
        
        notification.textContent = message;
        notification.style.transform = 'translateX(400px)';
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Smooth scroll for anchor links
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

    // Add keyboard navigation for modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (requestCourseModal && !requestCourseModal.classList.contains('hidden')) {
                requestCourseModal.classList.add('hidden');
                document.body.style.overflow = '';
                clearModalForm('course');
            }
            if (requestSchoolModal && !requestSchoolModal.classList.contains('hidden')) {
                requestSchoolModal.classList.add('hidden');
                document.body.style.overflow = '';
                clearModalForm('school');
            }
        }
    });

    // Performance optimization: Lazy load images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('.tutor-avatar').forEach(img => {
            imageObserver.observe(img);
        });
    }

    // Page visibility API to pause animations when tab is not active
    let adRotationInterval = setInterval(rotateAds, 8000);
    let bgRotationInterval = setInterval(changeBackground, 10000);
    
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Pause animations
            clearInterval(adRotationInterval);
            clearInterval(bgRotationInterval);
        } else {
            // Resume animations
            adRotationInterval = setInterval(rotateAds, 8000);
            bgRotationInterval = setInterval(changeBackground, 10000);
        }
    });

    console.log('Find Tutors page initialized successfully');
});